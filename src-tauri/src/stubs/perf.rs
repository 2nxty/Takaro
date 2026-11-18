//! The WebView2 memory target only exists on Windows; elsewhere this is a no-op.

use tauri::WebviewWindow;

pub fn set_low_memory(_webview: &WebviewWindow, _low: bool) {}
