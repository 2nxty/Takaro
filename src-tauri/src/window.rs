//! Main window: frameless, one webview (music.youtube.com). The title bar is drawn by the
//! injected page script (ui.js) inside the page, so it shares the page background (gradients
//! included). Its buttons call `titlebar_action` for the window operations.

use tauri::window::Color;
use tauri::{App, AppHandle, Manager, WebviewUrl, WebviewWindow, WebviewWindowBuilder, Window, WindowEvent};

use crate::perf;

pub const MAIN: &str = "main";

/// The main window, which is also the YouTube Music webview.
pub fn ytm(app: &AppHandle) -> Option<WebviewWindow> {
    app.get_webview_window(MAIN)
}

pub fn create(app: &mut App, inject: &str) -> tauri::Result<()> {
    let window = WebviewWindowBuilder::new(app, MAIN, WebviewUrl::External("https://music.youtube.com/".parse().unwrap()))
        .title("Takaro")
        .inner_size(1280.0, 820.0)
        .min_inner_size(800.0, 560.0)
        .decorations(false) // the title bar lives in the page
        // Same as YouTube Music's background: no white flash while the page loads.
        .background_color(Color(3, 3, 3, 255))
        .browser_extensions_enabled(true)
        .initialization_script(inject)
        .build()?;

    let w = window.clone();
    window.on_window_event(move |event| {
        if let WindowEvent::Resized(_) = event {
            perf::set_low_memory(&w, w.is_minimized().unwrap_or(false));
            send_maximized(&w);
        }
    });
    Ok(())
}

fn send_maximized(window: &WebviewWindow) {
    let maximized = window.is_maximized().unwrap_or(false);
    let _ = window.eval(format!("window.Takaro?.bar?.setMaximized({maximized})"));
}

/// Window buttons and dragging for the in-page title bar.
#[tauri::command]
pub fn titlebar_action(app: AppHandle, window: Window, action: String) {
    match action.as_str() {
        "drag" => {
            let _ = window.start_dragging();
        }
        "minimize" => {
            let _ = window.minimize();
        }
        "toggle-maximize" => {
            let _ = if window.is_maximized().unwrap_or(false) { window.unmaximize() } else { window.maximize() };
        }
        "close" => app.exit(0),
        "hide" => {
            let _ = window.hide();
            if let Some(w) = ytm(&app) {
                perf::set_low_memory(&w, true);
            }
        }
        "sync" => {
            if let Some(w) = ytm(&app) {
                send_maximized(&w);
            }
        }
        _ => {}
    }
}
