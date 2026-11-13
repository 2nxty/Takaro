//! Self-updater for the portable exe.
//!
//! `check_update` asks GitHub for the latest release of `UPDATE_REPO` and compares its tag with
//! this build's version. `install_update` downloads the new `Takaro.exe` next to the running one,
//! swaps the files (a running exe can be renamed on Windows, not overwritten), starts the new
//! version and exits. The leftover `<name>.old.exe` is removed on the next start.

use serde::Serialize;
use std::fs;
use std::os::windows::process::CommandExt;
use std::path::{Path, PathBuf};
use std::process::Command;
use tauri::AppHandle;

/// GitHub repository the updates come from ("owner/name"). Forks: change it.
pub const UPDATE_REPO: &str = "2nxty/Takaro";
const ASSET: &str = "Takaro.exe";
const CREATE_NO_WINDOW: u32 = 0x0800_0000;

#[derive(Serialize)]
pub struct UpdateInfo {
    current: String,
    latest: String,
    url: String,
    notes: String,
}

fn curl(args: &[&str]) -> Result<Vec<u8>, String> {
    let root = std::env::var("SystemRoot").unwrap_or_else(|_| r"C:\Windows".into());
    let out = Command::new(Path::new(&root).join("System32").join("curl.exe"))
        .args(["-fsSL", "--retry", "2", "-A", "Takaro-updater"])
        .args(args)
        .creation_flags(CREATE_NO_WINDOW)
        .output()
        .map_err(|e| format!("curl: {e}"))?;
    if out.status.success() {
        Ok(out.stdout)
    } else {
        Err(String::from_utf8_lossy(&out.stderr).trim().to_string())
    }
}

/// "1.2.3" / "v1.2.3" → (1, 2, 3); anything after a "-" is ignored.
fn parse(v: &str) -> (u64, u64, u64) {
    let v = v.trim().trim_start_matches(['v', 'V']);
    let v = v.split(['-', '+']).next().unwrap_or("");
    let mut n = v.split('.').map(|p| p.parse::<u64>().unwrap_or(0));
    (n.next().unwrap_or(0), n.next().unwrap_or(0), n.next().unwrap_or(0))
}

#[tauri::command]
pub async fn check_update() -> Result<Option<UpdateInfo>, String> {
    if cfg!(debug_assertions) {
        return Ok(None); // dev builds don't update themselves
    }
    tauri::async_runtime::spawn_blocking(|| {
        let url = format!("https://api.github.com/repos/{UPDATE_REPO}/releases/latest");
        let body = curl(&["-H", "Accept: application/vnd.github+json", &url])?;
        let release: serde_json::Value = serde_json::from_slice(&body).map_err(|e| e.to_string())?;
        let latest = release["tag_name"].as_str().unwrap_or_default().trim_start_matches(['v', 'V']).to_string();
        let current = env!("CARGO_PKG_VERSION").to_string();
        if latest.is_empty() || parse(&latest) <= parse(&current) {
            return Ok(None);
        }
        let Some(url) = release["assets"].as_array().and_then(|assets| {
            assets
                .iter()
                .find(|a| a["name"].as_str().is_some_and(|n| n.eq_ignore_ascii_case(ASSET)))
                .and_then(|a| a["browser_download_url"].as_str())
        }) else {
            return Ok(None); // release without the exe (still building, or a draft)
        };
        let notes: String = release["body"].as_str().unwrap_or_default().chars().take(1500).collect();
        Ok(Some(UpdateInfo { current, latest, url: url.to_string(), notes }))
    })
    .await
    .map_err(|e| e.to_string())?
}

fn sibling(exe: &Path, suffix: &str) -> PathBuf {
    let stem = exe.file_stem().map(|s| s.to_string_lossy().to_string()).unwrap_or_else(|| "Takaro".into());
    exe.with_file_name(format!("{stem}{suffix}"))
}

#[tauri::command]
pub async fn install_update(app: AppHandle, url: String) -> Result<(), String> {
    if !url.starts_with(&format!("https://github.com/{UPDATE_REPO}/releases/download/")) {
        return Err("unexpected download address".into());
    }
    let exe = std::env::current_exe().map_err(|e| e.to_string())?;
    let new = sibling(&exe, ".update.exe");
    let old = sibling(&exe, ".old.exe");

    let (exe2, new2, old2) = (exe.clone(), new.clone(), old.clone());
    tauri::async_runtime::spawn_blocking(move || -> Result<(), String> {
        let _ = fs::remove_file(&new2);
        curl(&["-o", &new2.to_string_lossy(), &url])?;
        let bytes = fs::read(&new2).map_err(|e| e.to_string())?;
        if bytes.len() < 1_000_000 || !bytes.starts_with(b"MZ") {
            let _ = fs::remove_file(&new2);
            return Err("the downloaded file isn't a valid Takaro.exe".into());
        }
        let _ = fs::remove_file(&old2);
        fs::rename(&exe2, &old2).map_err(|e| format!("can't replace the app (folder not writable?): {e}"))?;
        if let Err(e) = fs::rename(&new2, &exe2) {
            let _ = fs::rename(&old2, &exe2); // put the current version back
            return Err(e.to_string());
        }
        Ok(())
    })
    .await
    .map_err(|e| e.to_string())??;

    // Start the new version a moment after this one exits (they share the WebView2 profile).
    let cmd = format!("/C ping -n 3 127.0.0.1 >nul & start \"\" \"{}\"", exe.display());
    Command::new("cmd.exe").raw_arg(cmd).creation_flags(CREATE_NO_WINDOW).spawn().map_err(|e| e.to_string())?;
    app.exit(0);
    Ok(())
}

/// Removes the previous version left behind by an update.
pub fn cleanup() {
    if let Ok(exe) = std::env::current_exe() {
        let _ = fs::remove_file(sibling(&exe, ".old.exe"));
        let _ = fs::remove_file(sibling(&exe, ".update.exe"));
    }
}
