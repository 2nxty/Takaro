//! The self-updater replaces the portable Windows exe. macOS and Linux builds are installed as
//! an app bundle / package, so they don't update themselves (yet): no update is ever reported.

use serde::Serialize;
use tauri::AppHandle;

#[allow(dead_code)] // built only on Windows
#[derive(Serialize)]
pub struct UpdateInfo {
    current: String,
    latest: String,
    url: String,
    notes: String,
}

#[tauri::command]
pub async fn check_update() -> Result<Option<UpdateInfo>, String> {
    Ok(None)
}

#[tauri::command]
pub async fn install_update(_app: AppHandle, _url: String) -> Result<(), String> {
    Err("updates are installed manually on this system".into())
}

pub fn cleanup() {}
