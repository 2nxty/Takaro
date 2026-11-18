//! Browser extensions use the WebView2 extensions API, which only exists on Windows. On macOS and
//! Linux the commands are still there (the page calls them) but report that it isn't available.

use serde::Serialize;
use tauri::AppHandle;

#[allow(dead_code)] // built only on Windows
#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ExtInfo {
    id: String,
    name: String,
    enabled: bool,
    has_options: bool,
}

type Res<T> = Result<T, String>;
const UNSUPPORTED: &str = "browser extensions are only available on Windows";

#[tauri::command]
pub async fn list_extensions(_app: AppHandle) -> Res<Vec<ExtInfo>> {
    Ok(Vec::new())
}

#[tauri::command]
pub async fn set_extension_enabled(_app: AppHandle, _id: String, _enabled: bool) -> Res<()> {
    Err(UNSUPPORTED.into())
}

#[tauri::command]
pub async fn remove_extension(_app: AppHandle, _id: String) -> Res<()> {
    Err(UNSUPPORTED.into())
}

#[tauri::command]
pub async fn install_extension(_app: AppHandle, _store: String, _id: String) -> Res<ExtInfo> {
    Err(UNSUPPORTED.into())
}

#[tauri::command]
pub fn extension_installed(_app: AppHandle, _id: String) -> Res<bool> {
    Ok(false)
}

#[tauri::command]
pub async fn open_extension_options(_app: AppHandle, _id: String, _title: String) -> Res<()> {
    Err(UNSUPPORTED.into())
}

#[tauri::command]
pub async fn open_store(_app: AppHandle, _store: String, _lang: String) -> Res<()> {
    Err(UNSUPPORTED.into())
}

#[tauri::command]
pub fn reload_main(app: AppHandle) -> Res<()> {
    let page = crate::window::ytm(&app).ok_or("YouTube Music webview not found")?;
    page.eval("window.Takaro?.reload ? Takaro.reload() : location.reload()").map_err(|e| e.to_string())
}
