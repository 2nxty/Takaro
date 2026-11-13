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
    app.manage(Shown(std::sync::atomic::AtomicBool::new(false)));
    let window = WebviewWindowBuilder::new(app, MAIN, WebviewUrl::External("https://music.youtube.com/".parse().unwrap()))
        .title("Takaro")
        .inner_size(1280.0, 820.0)
        .min_inner_size(800.0, 560.0)
        .center() // always open centered on the screen
        .decorations(false) // the title bar lives in the page
        .visible(false) // shown by the page once the splash is painted (no white flash)
        // Same as YouTube Music's background: no white flash while the page loads.
        .background_color(Color(3, 3, 3, 255))
        .browser_extensions_enabled(true)
        .initialization_script(inject)
        .build()?;

    // Safety net: show the window even if the page never asks (offline, script error...).
    let late = window.clone();
    std::thread::spawn(move || {
        std::thread::sleep(std::time::Duration::from_secs(4));
        if !late.is_visible().unwrap_or(true) && !late.app_handle().state::<Shown>().0.load(std::sync::atomic::Ordering::SeqCst) {
            show(&late);
        }
    });

    let w = window.clone();
    window.on_window_event(move |event| {
        if let WindowEvent::Resized(_) = event {
            perf::set_low_memory(&w, w.is_minimized().unwrap_or(false));
            send_maximized(&w);
        }
    });
    Ok(())
}

/// Set once the window has been shown at startup (so the safety net doesn't re-show a window
/// the user already sent to the tray).
pub struct Shown(pub std::sync::atomic::AtomicBool);

fn show(window: &WebviewWindow) {
    let shown = &window.app_handle().state::<Shown>().0;
    if shown.swap(true, std::sync::atomic::Ordering::SeqCst) {
        return;
    }
    let _ = window.show();
    let _ = window.set_focus();
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
        "show" => {
            if let Some(w) = ytm(&app) {
                show(&w);
            }
        }
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
