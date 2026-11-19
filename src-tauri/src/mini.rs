//! Mini player: a small always-on-top window of its own (ui/mini.html) while the main window is
//! hidden. YouTube Music keeps playing in the hidden main window, untouched (shrinking it instead
//! would push YTM into its mobile layout). The main page sends the song's state here
//! (`mini_state`), which is passed to the mini window; the mini window's buttons come back through
//! `mini_action` and are run in the main page.

use tauri::{AppHandle, Manager, WebviewUrl, WebviewWindowBuilder, Window, WindowEvent};

use crate::window;

pub const MINI: &str = "mini";

/// On: open the mini window and hide the main one. Off: the other way round.
/// (async: on Windows, creating a window from a sync command deadlocks.)
#[tauri::command]
pub async fn set_mini(app: AppHandle, on: bool) -> Result<(), String> {
    let main = window::ytm(&app).ok_or("main window not found")?;
    if on {
        if let Some(w) = app.get_webview_window(MINI) {
            let _ = w.set_focus();
            return Ok(());
        }
        let w = WebviewWindowBuilder::new(&app, MINI, WebviewUrl::App("mini.html".into()))
            .title("Takaro")
            .inner_size(320.0, 400.0)
            .min_inner_size(240.0, 300.0)
            .decorations(false)
            .always_on_top(true)
            .center()
            // Must match the main window's WebView2 setup (it shares the same browser), or WebView2 refuses it.
            .browser_extensions_enabled(true)
            .background_color(tauri::window::Color(11, 11, 11, 255))
            .build()
            .map_err(|e| e.to_string())?;
        // However it's closed (its button, Alt+F4…), the main window comes back.
        let handle = app.clone();
        w.on_window_event(move |event| {
            if let WindowEvent::Destroyed = event {
                show_main(&handle);
            }
        });
        let _ = main.hide();
    } else if let Some(w) = app.get_webview_window(MINI) {
        let _ = w.close(); // Destroyed → show_main
    } else {
        show_main(&app);
    }
    Ok(())
}

fn show_main(app: &AppHandle) {
    if let Some(main) = window::ytm(app) {
        let _ = main.show();
        let _ = main.set_focus();
        let _ = main.eval("window.Takaro?.miniClosed?.()");
    }
}

/// From the main page: what's playing (title, artist, cover, time, playing, labels…), as JSON.
#[tauri::command]
pub fn mini_state(app: AppHandle, state: serde_json::Value) {
    if let Some(w) = app.get_webview_window(MINI) {
        let _ = w.eval(format!("window.update?.({state})"));
    }
}

/// From the mini window's buttons.
#[tauri::command]
pub fn mini_action(app: AppHandle, window: Window, action: String) {
    let run = |js: &str| {
        if let Some(main) = window::ytm(&app) {
            let _ = main.eval(js);
        }
    };
    match action.as_str() {
        "drag" => {
            let _ = window.start_dragging();
        }
        "expand" => {
            let _ = window.close();
        }
        "toggle" => run("window.Takaro?.control?.toggle()"),
        "next" => run("window.Takaro?.control?.next()"),
        "previous" => run("window.Takaro?.control?.previous()"),
        "ready" => run("window.Takaro?.miniPush?.()"), // first state, right away
        _ => {}
    }
}
