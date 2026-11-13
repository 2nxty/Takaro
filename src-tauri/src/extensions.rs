//! Browser extensions (WebView2 `AddBrowserExtension`) installed from the
//! Chrome Web Store or Edge Add-ons.
//!
//! Flow: the store window shows an "Install in Takaro" button → `install_extension`
//! downloads the CRX with the built-in `curl.exe`, strips the CRX header, unzips it with
//! the built-in `tar.exe` into `%LOCALAPPDATA%\com.takaro.player\extensions\<id>` and
//! registers the folder in the WebView2 profile (persisted across restarts).

use serde::Serialize;
use std::collections::HashMap;
use std::fs;
use std::os::windows::process::CommandExt;
use std::path::{Path, PathBuf};
use std::process::Command;
use std::sync::mpsc;
use std::time::Duration;
use tauri::{AppHandle, Manager, WebviewUrl, WebviewWindowBuilder};
use webview2_com::Microsoft::Web::WebView2::Win32::{
    ICoreWebView2BrowserExtension, ICoreWebView2Profile7, ICoreWebView2_13,
};
use webview2_com::{
    take_pwstr, BrowserExtensionEnableCompletedHandler, BrowserExtensionRemoveCompletedHandler,
    ProfileAddBrowserExtensionCompletedHandler, ProfileGetBrowserExtensionsCompletedHandler,
};
use windows_core::{Interface, BOOL, HSTRING, PWSTR};

const CREATE_NO_WINDOW: u32 = 0x0800_0000;
const STORE_LABEL: &str = "store";
const OPTIONS_LABEL: &str = "extension-options";

/// Injected into the store window: locales + language + store.js.
const STORE_JS: &str = include_str!("inject/store.js");
const LOCALES_JS: &str = include_str!(concat!(env!("OUT_DIR"), "/locales.js"));

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ExtInfo {
    id: String,
    name: String,
    enabled: bool,
    /// The extension declares an options page (manifest `options_ui` / `options_page`).
    has_options: bool,
}

type Res<T> = Result<T, String>;

fn err<E: std::fmt::Display>(e: E) -> String {
    e.to_string()
}

// ── WebView2 profile access (runs on the main thread) ───────────────

/// Runs `f` with the WebView2 profile of the main window and waits for its async result.
async fn with_profile<T, F>(app: &AppHandle, f: F) -> Res<T>
where
    T: Send + 'static,
    F: FnOnce(ICoreWebView2Profile7, mpsc::Sender<Res<T>>) -> Res<()> + Send + 'static,
{
    let webview = crate::window::ytm(app).ok_or("YouTube Music webview not found")?;
    let (tx, rx) = mpsc::channel::<Res<T>>();
    let tx2 = tx.clone();
    webview
        .with_webview(move |wv| {
            let run = || -> Res<()> {
                let profile = unsafe {
                    wv.controller()
                        .CoreWebView2()
                        .map_err(err)?
                        .cast::<ICoreWebView2_13>()
                        .map_err(err)?
                        .Profile()
                        .map_err(err)?
                        .cast::<ICoreWebView2Profile7>()
                        .map_err(|_| "this WebView2 runtime doesn't support extensions".to_string())?
                };
                f(profile, tx2)
            };
            if let Err(e) = run() {
                let _ = tx.send(Err(e));
            }
        })
        .map_err(err)?;

    tauri::async_runtime::spawn_blocking(move || {
        rx.recv_timeout(Duration::from_secs(30))
            .unwrap_or_else(|_| Err("timed out waiting for WebView2".into()))
    })
    .await
    .map_err(err)?
}

fn ext_info(ext: &ICoreWebView2BrowserExtension) -> Res<ExtInfo> {
    unsafe {
        let mut id = PWSTR::null();
        ext.Id(&mut id).map_err(err)?;
        let mut name = PWSTR::null();
        ext.Name(&mut name).map_err(err)?;
        let mut enabled = BOOL::default();
        ext.IsEnabled(&mut enabled).map_err(err)?;
        Ok(ExtInfo { id: take_pwstr(id), name: take_pwstr(name), enabled: enabled.as_bool(), has_options: false })
    }
}

/// Calls `f` with the profile extension whose WebView2 id is `id`.
fn with_extension(
    profile: ICoreWebView2Profile7,
    id: String,
    f: impl FnOnce(Option<ICoreWebView2BrowserExtension>) -> Res<()> + 'static,
) -> Res<()> {
    let handler = ProfileGetBrowserExtensionsCompletedHandler::create(Box::new(move |hr, list| {
        let found = (|| -> Res<Option<ICoreWebView2BrowserExtension>> {
            hr.map_err(err)?;
            let Some(list) = list else { return Ok(None) };
            let mut count = 0u32;
            unsafe { list.Count(&mut count).map_err(err)? };
            for i in 0..count {
                let ext = unsafe { list.GetValueAtIndex(i).map_err(err)? };
                if ext_info(&ext)?.id == id {
                    return Ok(Some(ext));
                }
            }
            Ok(None)
        })();
        let _ = match found {
            Ok(ext) => f(ext),
            Err(e) => f(None).and(Err(e)),
        };
        Ok(())
    }));
    unsafe { profile.GetBrowserExtensions(&handler).map_err(err) }
}

// ── Local files ──────────────────────────────────────────────────────

fn ext_root(app: &AppHandle) -> Res<PathBuf> {
    let dir = app.path().app_local_data_dir().map_err(err)?.join("extensions");
    fs::create_dir_all(&dir).map_err(err)?;
    Ok(dir)
}

/// WebView2 extension id → store id (folder name).
fn load_registry(root: &Path) -> HashMap<String, String> {
    fs::read(root.join("registry.json"))
        .ok()
        .and_then(|b| serde_json::from_slice(&b).ok())
        .unwrap_or_default()
}

fn save_registry(root: &Path, reg: &HashMap<String, String>) {
    if let Ok(json) = serde_json::to_vec_pretty(reg) {
        let _ = fs::write(root.join("registry.json"), json);
    }
}

/// Options page declared in the extension's manifest, relative to its folder.
fn options_page(dir: &Path) -> Option<String> {
    let text = fs::read_to_string(dir.join("manifest.json")).ok()?;
    let manifest: serde_json::Value = serde_json::from_str(text.trim_start_matches('\u{feff}')).ok()?;
    let page = manifest["options_ui"]["page"].as_str().or_else(|| manifest["options_page"].as_str())?;
    let page = page.trim_start_matches('/');
    (!page.is_empty() && !page.contains("..")).then(|| page.to_string())
}

fn system_tool(name: &str) -> PathBuf {
    let root = std::env::var("SystemRoot").unwrap_or_else(|_| r"C:\Windows".into());
    Path::new(&root).join("System32").join(name)
}

fn run(tool: &str, args: &[&str]) -> Res<()> {
    let out = Command::new(system_tool(tool))
        .args(args)
        .creation_flags(CREATE_NO_WINDOW)
        .output()
        .map_err(|e| format!("{tool}: {e}"))?;
    if out.status.success() {
        Ok(())
    } else {
        Err(format!("{tool} failed: {}", String::from_utf8_lossy(&out.stderr).trim()))
    }
}

/// Offset of the ZIP payload inside a CRX2/CRX3 file.
fn crx_zip_offset(b: &[u8]) -> Res<usize> {
    let u32_at = |i: usize| -> Res<usize> {
        b.get(i..i + 4)
            .map(|s| u32::from_le_bytes(s.try_into().unwrap()) as usize)
            .ok_or_else(|| "truncated CRX".to_string())
    };
    if b.starts_with(b"PK") {
        return Ok(0);
    }
    if !b.starts_with(b"Cr24") {
        return Err("the store didn't return an extension package".into());
    }
    match u32_at(4)? {
        3 => Ok(12 + u32_at(8)?),
        2 => Ok(16 + u32_at(8)? + u32_at(12)?),
        v => Err(format!("unsupported CRX version {v}")),
    }
}

fn valid_store_id(id: &str) -> bool {
    id.len() == 32 && id.bytes().all(|c| (b'a'..=b'p').contains(&c))
}

// ── Commands ─────────────────────────────────────────────────────────

#[tauri::command]
pub async fn list_extensions(app: AppHandle) -> Res<Vec<ExtInfo>> {
    // Only the ones installed through Takaro (WebView2 also lists built-in Microsoft components).
    let installed = load_registry(&ext_root(&app)?);
    let all: Vec<ExtInfo> = with_profile(&app, |profile, tx| {
        let handler = ProfileGetBrowserExtensionsCompletedHandler::create(Box::new(move |hr, list| {
            let result = (|| -> Res<Vec<ExtInfo>> {
                hr.map_err(err)?;
                let mut out = Vec::new();
                if let Some(list) = list {
                    let mut count = 0u32;
                    unsafe { list.Count(&mut count).map_err(err)? };
                    for i in 0..count {
                        out.push(ext_info(&unsafe { list.GetValueAtIndex(i).map_err(err)? })?);
                    }
                }
                Ok(out)
            })();
            let _ = tx.send(result);
            Ok(())
        }));
        unsafe { profile.GetBrowserExtensions(&handler).map_err(err) }
    })
    .await?;
    let root = ext_root(&app)?;
    Ok(all
        .into_iter()
        .filter_map(|mut e| {
            let folder = installed.get(&e.id)?;
            e.has_options = options_page(&root.join(folder)).is_some();
            Some(e)
        })
        .collect())
}

#[tauri::command]
pub async fn set_extension_enabled(app: AppHandle, id: String, enabled: bool) -> Res<()> {
    with_profile(&app, move |profile, tx| {
        with_extension(profile, id, move |ext| {
            let Some(ext) = ext else {
                let _ = tx.send(Err("extension not found".into()));
                return Ok(());
            };
            let tx2 = tx.clone();
            let handler = BrowserExtensionEnableCompletedHandler::create(Box::new(move |hr| {
                let _ = tx2.send(hr.map_err(err));
                Ok(())
            }));
            if let Err(e) = unsafe { ext.Enable(enabled, &handler) } {
                let _ = tx.send(Err(err(e)));
            }
            Ok(())
        })
    })
    .await
}

#[tauri::command]
pub async fn remove_extension(app: AppHandle, id: String) -> Res<()> {
    remove_from_profile(&app, id.clone()).await?;
    let root = ext_root(&app)?;
    let mut reg = load_registry(&root);
    if let Some(folder) = reg.remove(&id) {
        let _ = fs::remove_dir_all(root.join(folder));
        save_registry(&root, &reg);
    }
    Ok(())
}

async fn remove_from_profile(app: &AppHandle, id: String) -> Res<()> {
    with_profile(app, move |profile, tx| {
        with_extension(profile, id, move |ext| {
            let Some(ext) = ext else {
                let _ = tx.send(Ok(())); // already gone
                return Ok(());
            };
            let tx2 = tx.clone();
            let handler = BrowserExtensionRemoveCompletedHandler::create(Box::new(move |hr| {
                let _ = tx2.send(hr.map_err(err));
                Ok(())
            }));
            if let Err(e) = unsafe { ext.Remove(&handler) } {
                let _ = tx.send(Err(err(e)));
            }
            Ok(())
        })
    })
    .await
}

#[tauri::command]
pub async fn install_extension(app: AppHandle, store: String, id: String) -> Res<ExtInfo> {
    if !valid_store_id(&id) {
        return Err("invalid extension id".into());
    }
    let root = ext_root(&app)?;
    let url = if store == "edge" {
        format!("https://edge.microsoft.com/extensionwebstorebase/v1/crx?response=redirect&x=id%3D{id}%26installsource%3Dondemand%26uc")
    } else {
        let ver = tauri::webview_version().unwrap_or_else(|_| "130.0.0.0".into());
        format!("https://clients2.google.com/service/update2/crx?response=redirect&prodversion={ver}&acceptformat=crx2,crx3&x=id%3D{id}%26uc")
    };

    let dest = root.join(&id);
    let crx = root.join(format!("{id}.crx"));
    let zip = root.join(format!("{id}.zip"));
    let (crx_s, zip_s, dest_s) = (crx.to_string_lossy().to_string(), zip.to_string_lossy().to_string(), dest.to_string_lossy().to_string());

    let extracted = tauri::async_runtime::spawn_blocking(move || -> Res<()> {
        run("curl.exe", &["-fsSL", "--retry", "2", "-o", &crx_s, &url])?;
        let bytes = fs::read(&crx_s).map_err(err)?;
        let start = crx_zip_offset(&bytes)?;
        fs::write(&zip_s, &bytes[start..]).map_err(err)?;
        let _ = fs::remove_file(&crx_s);
        let _ = fs::remove_dir_all(&dest_s);
        fs::create_dir_all(&dest_s).map_err(err)?;
        let result = run("tar.exe", &["-xf", &zip_s, "-C", &dest_s]);
        let _ = fs::remove_file(&zip_s);
        result?;
        // Folders starting with "_" (store signatures) are rejected for unpacked extensions.
        let _ = fs::remove_dir_all(Path::new(&dest_s).join("_metadata"));
        if !Path::new(&dest_s).join("manifest.json").exists() {
            return Err("manifest.json not found in the package".into());
        }
        Ok(())
    })
    .await
    .map_err(err)?;
    extracted?;

    // Reinstall: drop the previous registration of this store id.
    let mut reg = load_registry(&root);
    let old: Vec<String> = reg.iter().filter(|(_, v)| **v == id).map(|(k, _)| k.clone()).collect();
    for wv2_id in old {
        let _ = remove_from_profile(&app, wv2_id.clone()).await;
        reg.remove(&wv2_id);
    }

    let path = HSTRING::from(dest.as_path());
    let info = with_profile(&app, move |profile, tx| {
        let tx2 = tx.clone();
        let handler = ProfileAddBrowserExtensionCompletedHandler::create(Box::new(move |hr, ext| {
            let result = hr.map_err(err).and_then(|_| match ext {
                Some(ext) => ext_info(&ext),
                None => Err("WebView2 didn't return the extension".into()),
            });
            let _ = tx2.send(result);
            Ok(())
        }));
        unsafe { profile.AddBrowserExtension(&path, &handler).map_err(err) }
    })
    .await
    .map_err(|e| format!("WebView2 rejected the extension: {e}"))?;

    reg.insert(info.id.clone(), id);
    save_registry(&root, &reg);
    Ok(info)
}

/// Whether the store extension `id` is installed in Takaro (used by the store window).
#[tauri::command]
pub fn extension_installed(app: AppHandle, id: String) -> Res<bool> {
    if !valid_store_id(&id) {
        return Ok(false);
    }
    let root = ext_root(&app)?;
    Ok(load_registry(&root).values().any(|v| *v == id) && root.join(&id).join("manifest.json").exists())
}

/// Opens the extension's options page (chrome-extension://<id>/<page>) in its own window.
#[tauri::command]
pub async fn open_extension_options(app: AppHandle, id: String, title: String) -> Res<()> {
    let root = ext_root(&app)?;
    let folder = load_registry(&root).get(&id).cloned().ok_or("extension not found")?;
    let page = options_page(&root.join(folder)).ok_or("this extension has no options page")?;
    let url: tauri::Url = format!("chrome-extension://{id}/{page}").parse().map_err(err)?;
    let window_title = format!("{title} — Takaro");

    if let Some(w) = app.get_webview_window(OPTIONS_LABEL) {
        w.navigate(url).map_err(err)?;
        let _ = w.set_title(&window_title);
        let _ = w.unminimize();
        w.set_focus().map_err(err)?;
        return Ok(());
    }
    WebviewWindowBuilder::new(&app, OPTIONS_LABEL, WebviewUrl::External(url))
        .title(window_title)
        .inner_size(900.0, 720.0)
        .browser_extensions_enabled(true)
        .build()
        .map_err(err)?;
    Ok(())
}

/// Opens (or focuses) the store window.
#[tauri::command]
pub async fn open_store(app: AppHandle, store: String, lang: String) -> Res<()> {
    let url = if store == "edge" {
        "https://microsoftedge.microsoft.com/addons/Microsoft-Edge-Extensions-Home"
    } else {
        "https://chromewebstore.google.com/"
    };
    let url: tauri::Url = url.parse().map_err(err)?;

    if let Some(w) = app.get_webview_window(STORE_LABEL) {
        w.navigate(url).map_err(err)?;
        let _ = w.unminimize();
        w.set_focus().map_err(err)?;
        return Ok(());
    }

    let lang_js = serde_json::to_string(&lang).map_err(err)?;
    let script = format!("{LOCALES_JS}\nwindow.__TAKARO_LANG__ = {lang_js};\n{STORE_JS}");
    WebviewWindowBuilder::new(&app, STORE_LABEL, WebviewUrl::External(url))
        .title("Takaro — Extensions")
        .inner_size(1180.0, 820.0)
        .browser_extensions_enabled(true)
        .initialization_script(&script)
        .build()
        .map_err(err)?;
    Ok(())
}

/// Reloads YouTube Music so newly installed extensions take effect.
#[tauri::command]
pub fn reload_main(app: AppHandle) -> Res<()> {
    let page = crate::window::ytm(&app).ok_or("YouTube Music webview not found")?;
    page.eval("window.Takaro?.reload ? Takaro.reload() : location.reload()").map_err(err)?;
    let _ = page.set_focus();
    Ok(())
}
