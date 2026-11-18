//! Updates on macOS and Linux.
//!
//! - **Linux AppImage** (`$APPIMAGE` is set): the new `Takaro-Linux.AppImage` is downloaded next to
//!   the running one, put in its place (a running AppImage can be replaced: the old file stays
//!   alive until the app closes), and Takaro restarts.
//! - **macOS**: `Takaro-macOS.dmg` is downloaded, mounted, and its `Takaro.app` replaces the
//!   running one, then Takaro restarts. Downloaded by the app itself (not a browser), it isn't
//!   quarantined, so Gatekeeper doesn't ask again.
//! - **Linux .deb / anything else**: installing needs root, so the release page is opened instead
//!   (`auto: false`).

use serde::Serialize;
use std::path::{Path, PathBuf};
use std::process::Command;
use tauri::AppHandle;

const REPO: &str = "2nxty/Takaro";
const MAC_ASSET: &str = "Takaro-macOS.dmg";
const APPIMAGE_ASSET: &str = "Takaro-Linux.AppImage";

#[derive(Serialize)]
pub struct UpdateInfo {
    current: String,
    latest: String,
    /// The file to install (auto) or the release page (manual).
    url: String,
    notes: String,
    /// true: Takaro installs it itself; false: the page opens and the user installs it.
    auto: bool,
}

/// "1.2.3" / "v1.2.3" → (1, 2, 3); anything after a "-" is ignored.
fn parse(v: &str) -> (u64, u64, u64) {
    let v = v.trim().trim_start_matches(['v', 'V']);
    let v = v.split(['-', '+']).next().unwrap_or("");
    let mut n = v.split('.').map(|p| p.parse::<u64>().unwrap_or(0));
    (n.next().unwrap_or(0), n.next().unwrap_or(0), n.next().unwrap_or(0))
}

/// The running AppImage, if Takaro runs as one.
fn appimage() -> Option<PathBuf> {
    std::env::var_os("APPIMAGE").map(PathBuf::from).filter(|p| p.is_file())
}

/// The running .app bundle (…/Takaro.app), on macOS.
fn app_bundle() -> Option<PathBuf> {
    let exe = std::env::current_exe().ok()?;
    exe.ancestors().find(|p| p.extension().is_some_and(|e| e == "app")).map(Path::to_path_buf)
}

/// What this installation can update itself from: the asset name, or None (manual).
fn auto_asset() -> Option<&'static str> {
    if cfg!(target_os = "macos") {
        app_bundle().map(|_| MAC_ASSET)
    } else {
        appimage().map(|_| APPIMAGE_ASSET)
    }
}

fn asset_url(release: &serde_json::Value, name: &str) -> Option<String> {
    release["assets"].as_array()?.iter().find_map(|a| {
        (a["name"].as_str()? == name).then(|| a["browser_download_url"].as_str().map(str::to_string)).flatten()
    })
}

/// Any download for this system at all (the manual route needs one too).
fn has_asset_for_system(release: &serde_json::Value) -> bool {
    let wanted: &[&str] = if cfg!(target_os = "macos") { &[".dmg"] } else { &[".appimage", ".deb"] };
    release["assets"].as_array().is_some_and(|assets| {
        assets.iter().filter_map(|a| a["name"].as_str()).any(|n| wanted.iter().any(|w| n.to_lowercase().ends_with(w)))
    })
}

#[cfg_attr(not(all(test, windows)), tauri::command)] // (plain functions in the Windows compile check)
pub async fn check_update() -> Result<Option<UpdateInfo>, String> {
    if cfg!(debug_assertions) {
        return Ok(None);
    }
    tauri::async_runtime::spawn_blocking(|| {
        let body = crate::adblock::fetch(&format!("https://api.github.com/repos/{REPO}/releases/latest"))?;
        let release: serde_json::Value = serde_json::from_str(&body).map_err(|e| e.to_string())?;
        let latest = release["tag_name"].as_str().unwrap_or_default().trim_start_matches(['v', 'V']).to_string();
        let current = env!("CARGO_PKG_VERSION").to_string();
        if latest.is_empty() || parse(&latest) <= parse(&current) || !has_asset_for_system(&release) {
            return Ok(None);
        }
        let notes: String = release["body"].as_str().unwrap_or_default().chars().take(1500).collect();
        if let Some(url) = auto_asset().and_then(|name| asset_url(&release, name)) {
            return Ok(Some(UpdateInfo { current, latest, url, notes, auto: true }));
        }
        let url = release["html_url"].as_str().unwrap_or_default().to_string();
        if !url.starts_with(&format!("https://github.com/{REPO}/")) {
            return Ok(None);
        }
        Ok(Some(UpdateInfo { current, latest, url, notes, auto: false }))
    })
    .await
    .map_err(|e| e.to_string())?
}

// ── Download ─────────────────────────────────────────────────────────

fn download(url: &str, to: &Path) -> Result<(), String> {
    let agent: ureq::Agent = ureq::Agent::config_builder()
        .timeout_global(Some(std::time::Duration::from_secs(600)))
        .user_agent("Takaro-updater")
        .build()
        .into();
    let mut resp = agent.get(url).call().map_err(|e| format!("{url}: {e}"))?;
    let bytes = resp.body_mut().with_config().limit(400 * 1024 * 1024).read_to_vec().map_err(|e| e.to_string())?;
    if bytes.len() < 1_000_000 {
        return Err("the downloaded file is too small to be Takaro".into());
    }
    std::fs::write(to, bytes).map_err(|e| e.to_string())
}

fn sibling(path: &Path, suffix: &str) -> PathBuf {
    let mut name = path.file_name().map(|n| n.to_os_string()).unwrap_or_default();
    name.push(suffix);
    path.with_file_name(name)
}

/// Runs `cmd` and fails with its error output.
fn run(cmd: &mut Command) -> Result<(), String> {
    let out = cmd.output().map_err(|e| e.to_string())?;
    if out.status.success() {
        Ok(())
    } else {
        Err(String::from_utf8_lossy(&out.stderr).trim().to_string())
    }
}

// ── Linux: AppImage ──────────────────────────────────────────────────

fn install_appimage(url: &str, current: &Path) -> Result<(), String> {
    let new = sibling(current, ".update");
    let _ = std::fs::remove_file(&new);
    download(url, &new)?;
    let ok = std::fs::read(&new).map(|b| b.starts_with(b"\x7fELF")).unwrap_or(false);
    if !ok {
        let _ = std::fs::remove_file(&new);
        return Err("the downloaded file isn't a valid AppImage".into());
    }
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        std::fs::set_permissions(&new, std::fs::Permissions::from_mode(0o755)).map_err(|e| e.to_string())?;
    }
    std::fs::rename(&new, current).map_err(|e| format!("can't replace the AppImage (folder not writable?): {e}"))
}

// ── macOS: .dmg ──────────────────────────────────────────────────────

fn install_dmg(url: &str, bundle: &Path) -> Result<(), String> {
    let tmp = std::env::temp_dir().join(format!("takaro-update-{}", std::process::id()));
    let _ = std::fs::remove_dir_all(&tmp);
    std::fs::create_dir_all(&tmp).map_err(|e| e.to_string())?;
    let dmg = tmp.join(MAC_ASSET);
    let mount = tmp.join("mnt");
    download(url, &dmg)?;
    run(Command::new("hdiutil").arg("attach").arg("-nobrowse").arg("-readonly").arg("-noautoopen").arg("-mountpoint").arg(&mount).arg(&dmg))
        .map_err(|e| format!("can't open the update: {e}"))?;

    let result = (|| -> Result<(), String> {
        let app = std::fs::read_dir(&mount)
            .map_err(|e| e.to_string())?
            .filter_map(Result::ok)
            .map(|e| e.path())
            .find(|p| p.extension().is_some_and(|e| e == "app"))
            .ok_or("no app in the update")?;
        let staged = sibling(bundle, ".new");
        let old = sibling(bundle, ".old");
        let _ = std::fs::remove_dir_all(&staged);
        let _ = std::fs::remove_dir_all(&old);
        // ditto keeps the bundle intact (symlinks, attributes, code signature).
        run(Command::new("ditto").arg(&app).arg(&staged)).map_err(|e| format!("can't copy the new version (Applications not writable?): {e}"))?;
        std::fs::rename(bundle, &old).map_err(|e| format!("can't replace the app: {e}"))?;
        if let Err(e) = std::fs::rename(&staged, bundle) {
            let _ = std::fs::rename(&old, bundle); // put the current version back
            return Err(e.to_string());
        }
        let _ = std::fs::remove_dir_all(&old);
        let _ = Command::new("xattr").arg("-dr").arg("com.apple.quarantine").arg(bundle).output();
        Ok(())
    })();

    let _ = Command::new("hdiutil").arg("detach").arg(&mount).arg("-force").output();
    let _ = std::fs::remove_dir_all(&tmp);
    result
}

// ── Install + restart ────────────────────────────────────────────────

/// Starts `target` a moment after this process exits (single instance: the new one must not find
/// the old one still running). `$0` carries the path, so no quoting issues.
fn relaunch(script: &str, target: &Path) -> Result<(), String> {
    Command::new("sh").arg("-c").arg(script).arg(target).spawn().map(|_| ()).map_err(|e| e.to_string())
}

#[cfg_attr(not(all(test, windows)), tauri::command)] // (plain functions in the Windows compile check)
pub async fn install_update(app: AppHandle, url: String) -> Result<(), String> {
    if !url.starts_with(&format!("https://github.com/{REPO}/releases/download/")) {
        return Err("unexpected download address".into());
    }
    if cfg!(target_os = "macos") {
        let bundle = app_bundle().ok_or("Takaro isn't running from an app bundle")?;
        let b = bundle.clone();
        tauri::async_runtime::spawn_blocking(move || install_dmg(&url, &b)).await.map_err(|e| e.to_string())??;
        relaunch("sleep 1; open \"$0\"", &bundle)?;
    } else {
        let current = appimage().ok_or("Takaro isn't running as an AppImage")?;
        let c = current.clone();
        tauri::async_runtime::spawn_blocking(move || install_appimage(&url, &c)).await.map_err(|e| e.to_string())??;
        relaunch("sleep 1; exec \"$0\"", &current)?;
    }
    app.exit(0);
    Ok(())
}

pub fn cleanup() {
    if let Some(p) = appimage() {
        let _ = std::fs::remove_file(sibling(&p, ".update"));
    }
    if let Some(b) = app_bundle() {
        let _ = std::fs::remove_dir_all(sibling(&b, ".new"));
        let _ = std::fs::remove_dir_all(sibling(&b, ".old"));
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn versions_and_assets() {
        assert!(parse("0.3.2") > parse("v0.3.1"));
        assert_eq!(parse("0.3.1-test.4"), (0, 3, 1));
        let release = serde_json::json!({ "assets": [
            { "name": "Takaro.exe", "browser_download_url": "https://github.com/2nxty/Takaro/releases/download/v1/Takaro.exe" },
            { "name": "Takaro-macOS.dmg", "browser_download_url": "https://github.com/2nxty/Takaro/releases/download/v1/Takaro-macOS.dmg" },
        ]});
        assert_eq!(asset_url(&release, MAC_ASSET).as_deref(), Some("https://github.com/2nxty/Takaro/releases/download/v1/Takaro-macOS.dmg"));
        assert_eq!(asset_url(&release, APPIMAGE_ASSET), None);
        assert_eq!(sibling(Path::new("/x/Takaro.app"), ".new"), PathBuf::from("/x/Takaro.app.new"));
    }
}
