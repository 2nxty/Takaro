//! System tray icon: now playing, playback shortcuts, show/hide, settings and quit.
//! Labels arrive already translated from the page (`set_tray_labels`).

use serde::Deserialize;
use std::sync::Mutex;
use tauri::menu::{Menu, MenuItem, PredefinedMenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::{AppHandle, Manager, State, Wry};

use crate::{perf, window};

#[derive(Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct TrayLabels {
    play: String,
    pause: String,
    previous: String,
    next: String,
    show: String,
    settings: String,
    quit: String,
}

impl Default for TrayLabels {
    fn default() -> Self {
        Self {
            play: "Play".into(),
            pause: "Pause".into(),
            previous: "Previous".into(),
            next: "Next".into(),
            show: "Show Takaro".into(),
            settings: "Settings".into(),
            quit: "Quit".into(),
        }
    }
}

pub struct Tray {
    now: MenuItem<Wry>,
    toggle: MenuItem<Wry>,
    previous: MenuItem<Wry>,
    next: MenuItem<Wry>,
    show: MenuItem<Wry>,
    settings: MenuItem<Wry>,
    quit: MenuItem<Wry>,
    state: Mutex<(TrayLabels, bool)>, // labels, is playing
}

impl Tray {
    fn refresh(&self) {
        let (labels, playing) = &*self.state.lock().unwrap();
        let _ = self.toggle.set_text(if *playing { &labels.pause } else { &labels.play });
        let _ = self.previous.set_text(&labels.previous);
        let _ = self.next.set_text(&labels.next);
        let _ = self.show.set_text(&labels.show);
        let _ = self.settings.set_text(&labels.settings);
        let _ = self.quit.set_text(&labels.quit);
    }

    /// Called from the presence commands.
    pub fn set_track(&self, now_playing: Option<String>, playing: bool) {
        let text = now_playing.unwrap_or_else(|| "Takaro".into());
        // Keep the menu narrow: long titles are cut.
        const MAX: usize = 32;
        let text: String = if text.chars().count() > MAX { text.chars().take(MAX - 1).collect::<String>().trim_end().to_string() + "…" } else { text };
        let _ = self.now.set_text(text);
        self.state.lock().unwrap().1 = playing;
        self.refresh();
    }
}

pub fn setup(app: &AppHandle) -> tauri::Result<()> {
    let l = TrayLabels::default();
    let now = MenuItem::with_id(app, "now", "Takaro", false, None::<&str>)?;
    let toggle = MenuItem::with_id(app, "toggle", &l.play, true, None::<&str>)?;
    let previous = MenuItem::with_id(app, "previous", &l.previous, true, None::<&str>)?;
    let next = MenuItem::with_id(app, "next", &l.next, true, None::<&str>)?;
    let show = MenuItem::with_id(app, "show", &l.show, true, None::<&str>)?;
    let settings = MenuItem::with_id(app, "settings", &l.settings, true, None::<&str>)?;
    let quit = MenuItem::with_id(app, "quit", &l.quit, true, None::<&str>)?;
    let menu = Menu::with_items(
        app,
        &[
            &now,
            &PredefinedMenuItem::separator(app)?,
            &toggle,
            &previous,
            &next,
            &PredefinedMenuItem::separator(app)?,
            &show,
            &settings,
            &PredefinedMenuItem::separator(app)?,
            &quit,
        ],
    )?;

    let mut builder = TrayIconBuilder::with_id("takaro")
        .tooltip("Takaro")
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_menu_event(|app, event| match event.id.as_ref() {
            "toggle" => page(app, "Takaro.control?.toggle()"),
            "previous" => page(app, "Takaro.control?.previous()"),
            "next" => page(app, "Takaro.control?.next()"),
            "show" => show_main(app),
            "settings" => {
                show_main(app);
                page(app, "Takaro.openSettings?.()");
            }
            "quit" => app.exit(0),
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click { button: MouseButton::Left, button_state: MouseButtonState::Up, .. } = event {
                toggle_main(tray.app_handle());
            }
        });
    if let Some(icon) = app.default_window_icon() {
        builder = builder.icon(icon.clone());
    }
    builder.build(app)?;

    app.manage(Tray { now, toggle, previous, next, show, settings, quit, state: Mutex::new((l, false)) });
    Ok(())
}

fn page(app: &AppHandle, js: &str) {
    if let Some(page) = window::ytm(app) {
        let _ = page.eval(js);
    }
}

fn show_main(app: &AppHandle) {
    if let Some(w) = window::ytm(app) {
        let _ = w.show();
        let _ = w.unminimize();
        let _ = w.set_focus();
    }
    if let Some(page) = window::ytm(app) {
        perf::set_low_memory(&page, false);
        let _ = page.set_focus();
    }
}

fn toggle_main(app: &AppHandle) {
    let Some(w) = window::ytm(app) else { return };
    let visible = w.is_visible().unwrap_or(false) && !w.is_minimized().unwrap_or(false);
    if visible {
        let _ = w.hide();
        if let Some(page) = window::ytm(app) {
            perf::set_low_memory(&page, true);
        }
    } else {
        show_main(app);
    }
}

#[tauri::command]
pub fn set_tray_labels(labels: TrayLabels, tray: State<Tray>) {
    tray.state.lock().unwrap().0 = labels;
    tray.refresh();
}
