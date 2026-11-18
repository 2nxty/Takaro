//! Updates on macOS and Linux. The app is installed there as an app bundle / package, so it doesn't
//! replace itself like the portable Windows exe: `check_update` finds a newer release that has a
//! download for this system, and the page offers to open it (the user installs it over the old one).

use serde::Serialize;
use tauri::AppHandle;

const REPO: &str = "2nxty/Takaro";

#[derive(Serialize)]
pub struct UpdateInfo {
    current: String,
    latest: String,
    /// The release page (opened in the browser).
    url: String,
    notes: String,
}

/// "1.2.3" / "v1.2.3" → (1, 2, 3); anything after a "-" is ignored.
fn parse(v: &str) -> (u64, u64, u64) {
    let v = v.trim().trim_start_matches(['v', 'V']);
    let v = v.split(['-', '+']).next().unwrap_or("");
    let mut n = v.split('.').map(|p| p.parse::<u64>().unwrap_or(0));
    (n.next().unwrap_or(0), n.next().unwrap_or(0), n.next().unwrap_or(0))
}

/// Does the release have a download for this system?
fn has_asset(release: &serde_json::Value) -> bool {
    let wanted: &[&str] = if cfg!(target_os = "macos") { &[".dmg"] } else { &[".appimage", ".deb"] };
    release["assets"].as_array().is_some_and(|assets| {
        assets.iter().filter_map(|a| a["name"].as_str()).any(|n| wanted.iter().any(|w| n.to_lowercase().ends_with(w)))
    })
}

#[tauri::command]
pub async fn check_update() -> Result<Option<UpdateInfo>, String> {
    if cfg!(debug_assertions) {
        return Ok(None);
    }
    tauri::async_runtime::spawn_blocking(|| {
        let body = crate::adblock::fetch(&format!("https://api.github.com/repos/{REPO}/releases/latest"))?;
        let release: serde_json::Value = serde_json::from_str(&body).map_err(|e| e.to_string())?;
        let latest = release["tag_name"].as_str().unwrap_or_default().trim_start_matches(['v', 'V']).to_string();
        let current = env!("CARGO_PKG_VERSION").to_string();
        if latest.is_empty() || parse(&latest) <= parse(&current) || !has_asset(&release) {
            return Ok(None);
        }
        let url = release["html_url"].as_str().unwrap_or_default().to_string();
        if !url.starts_with(&format!("https://github.com/{REPO}/")) {
            return Ok(None);
        }
        let notes: String = release["body"].as_str().unwrap_or_default().chars().take(1500).collect();
        Ok(Some(UpdateInfo { current, latest, url, notes }))
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn install_update(_app: AppHandle, _url: String) -> Result<(), String> {
    Err("on this system the new version is downloaded from the release page".into())
}

pub fn cleanup() {}
