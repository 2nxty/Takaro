//! Resource savings that don't change behavior.
//!
//! While the window is minimized or hidden in the tray, WebView2 is asked to use its *low*
//! memory target: it trims caches and gives memory back to Windows. Playback keeps running;
//! the normal level comes back as soon as the window is shown again.

use std::sync::atomic::{AtomicBool, Ordering};
use tauri::WebviewWindow;
use webview2_com::Microsoft::Web::WebView2::Win32::{
    ICoreWebView2_19, COREWEBVIEW2_MEMORY_USAGE_TARGET_LEVEL_LOW, COREWEBVIEW2_MEMORY_USAGE_TARGET_LEVEL_NORMAL,
};
use windows_core::Interface;

static LOW: AtomicBool = AtomicBool::new(false);

pub fn set_low_memory(webview: &WebviewWindow, low: bool) {
    if LOW.swap(low, Ordering::SeqCst) == low {
        return; // already at that level
    }
    let _ = webview.with_webview(move |wv| unsafe {
        let level = if low { COREWEBVIEW2_MEMORY_USAGE_TARGET_LEVEL_LOW } else { COREWEBVIEW2_MEMORY_USAGE_TARGET_LEVEL_NORMAL };
        if let Ok(core) = wv.controller().CoreWebView2() {
            if let Ok(core19) = core.cast::<ICoreWebView2_19>() {
                let _ = core19.SetMemoryUsageTargetLevel(level);
            }
        }
    });
}
