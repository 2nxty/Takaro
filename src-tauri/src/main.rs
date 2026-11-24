#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod adblock;
mod clock;
mod discord;
// Windows-only features (WebView2 extensions and memory target, the portable exe's self-updater);
// on macOS and Linux the same commands exist as stubs.
#[cfg_attr(not(windows), path = "stubs/extensions.rs")]
mod extensions;
mod lastfm;
mod links;
mod mini;
mod overlay;
#[cfg(windows)]
mod taskbar;
#[cfg_attr(not(windows), path = "stubs/perf.rs")]
mod perf;
mod tray;
#[cfg_attr(not(windows), path = "stubs/updater.rs")]
mod updater;
mod window;
// The macOS / Linux updater is otherwise only built there: compiled in Windows test builds too, so
// mistakes show up on the development machine (no Mac/Linux toolchain here).
#[cfg(all(test, windows))]
#[path = "stubs/updater.rs"]
#[allow(dead_code)]
mod updater_unix_check;

use serde::Deserialize;
use serde_json::{json, Map, Value};
use std::sync::mpsc::{channel, Sender};
use std::sync::Mutex;
use tauri::{Manager, State};

// ───────────── Configuration ─────────────
/// Discord application ID (Developer Portal → your app → "Application ID").
///
/// ⚠️ It is NOT stored in the repository: every build needs its own. Set the
/// `DISCORD_CLIENT_ID` environment variable when building (it gets compiled in), or when
/// running the app (overrides the compiled one). Without it, Rich Presence stays off and
/// the rest of the app works normally. The release workflow reads it from the repository
/// secret `DISCORD_CLIENT_ID`.
const DISCORD_CLIENT_ID: &str = match option_env!("DISCORD_CLIENT_ID") {
    Some(id) => id,
    None => "",
};
/// Takaro Jam server (jam-server/, a Cloudflare Worker), e.g. `wss://jam.example.com`.
///
/// ⚠️ It is NOT stored in the repository: set the `TAKARO_JAM_URL` environment variable when
/// building (it gets compiled in), or when running the app (overrides the compiled one). The
/// release workflows read it from the repository secret / variable `TAKARO_JAM_URL`. Without it,
/// Jam asks for a server in Settings → Jam (where users can also change it).
const JAM_URL: &str = match option_env!("TAKARO_JAM_URL") {
    Some(url) => url,
    None => "",
};

/// Link do segundo botão do card. Os textos do card vêm traduzidos do app
/// (src/i18n/*.json → "presence"); estes são só o fallback em inglês.
const SITE_URL: &str = "https://takaro.im";
const DEFAULT_LISTEN: &str = "Listen on Takaro";
const DEFAULT_PAUSED: &str = "Paused";
const DEFAULT_SITE: &str = "Get Takaro";
/// O que aparece depois de "Ouvindo" na lista de membros:
/// 0 = nome do app, 1 = state (artista), 2 = details (música).
const STATUS_DISPLAY_TYPE: u8 = 2;
/// Chave de um Art Asset enviado no portal (Rich Presence → Art Assets),
/// exibido como ícone pequeno sobre a capa. Deixe "" para não usar.
const SMALL_IMAGE_KEY: &str = "";
const SMALL_IMAGE_TEXT: &str = "YouTube Music";
// ────────────────────────────────────────

/// Scripts injetados no music.youtube.com, concatenados em ordem:
/// core → plugins (registram-se no core) → UI de configurações → Jam → Discord presence.
const INJECT: &str = concat!(
    "window.__TAKARO_VERSION__ = \"", env!("CARGO_PKG_VERSION"), "\";\n",
    include_str!(concat!(env!("OUT_DIR"), "/locales.js")), "\n", // gerado de src/i18n/*.json
    include_str!("inject/core.js"), "\n",
    include_str!("inject/vendor/cpu-tamer.js"), "\n",
    include_str!("inject/plugins/sponsorblock.js"), "\n",
    include_str!("inject/plugins/adblock.js"), "\n",
    include_str!("inject/plugins/skip-disliked-songs.js"), "\n",
    include_str!("inject/plugins/disable-autoplay.js"), "\n",
    include_str!("inject/plugins/resume-session.js"), "\n",
    include_str!("inject/plugins/precise-volume.js"), "\n",
    include_str!("inject/plugins/playback-speed.js"), "\n",
    include_str!("inject/plugins/quality-changer.js"), "\n",
    include_str!("inject/plugins/video-toggle.js"), "\n",
    include_str!("inject/plugins/player-background.js"), "\n",
    include_str!("inject/plugins/player-bar.js"), "\n",
    include_str!("inject/plugins/lyrics.js"), "\n",
    include_str!("inject/plugins/share-links.js"), "\n",
    include_str!("inject/plugins/sleep-timer.js"), "\n",
    include_str!("inject/plugins/smooth-audio.js"), "\n",
    include_str!("inject/plugins/lastfm.js"), "\n",
    include_str!("inject/plugins/toast-autoclose.js"), "\n",
    include_str!("inject/plugins/performance.js"), "\n",
    include_str!("inject/ui.js"), "\n",
    include_str!("inject/jam.js"), "\n", // Takaro Jam (built in, not a plugin)
    include_str!("inject/presence.js"),
);

struct Presence(Sender<discord::Cmd>);

/// A tak://jam/<CODE> invite waiting for the page (taken by inject/jam.js).
#[derive(Default)]
struct JamInvite(Mutex<Option<String>>);

/// The Jam room code from the last tak://jam link, once.
#[tauri::command]
fn jam_take_invite(invite: State<JamInvite>) -> Option<String> {
    invite.0.lock().ok()?.take()
}

/// A Jam invite while Takaro runs: keep it and tell the page (it opens Settings → Jam).
fn open_jam(app: &tauri::AppHandle, code: String) {
    if let Ok(mut slot) = app.state::<JamInvite>().0.lock() {
        *slot = Some(code);
    }
    if let Some(page) = window::ytm(app) {
        let _ = page.eval("window.Takaro?.jamInvite?.()");
    }
}

/// The name of the computer's user (Jam's default display name): `USERNAME` on Windows, `USER` on
/// macOS / Linux, without a domain part, at most 32 characters.
fn system_user_name() -> String {
    let raw = std::env::var("USERNAME").or_else(|_| std::env::var("USER")).unwrap_or_default();
    let name = raw.rsplit('\\').next().unwrap_or_default().trim();
    name.chars().filter(|c| !c.is_control()).take(32).collect()
}

/// The Jam server address given to the page (ws:// or wss:// only).
fn jam_url() -> String {
    let url = std::env::var("TAKARO_JAM_URL").ok().filter(|u| !u.trim().is_empty()).unwrap_or_else(|| JAM_URL.to_string());
    let url = url.trim().trim_end_matches('/').to_string();
    if url.starts_with("wss://") || url.starts_with("ws://") {
        url
    } else {
        String::new()
    }
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct Track {
    video_id: String,
    title: String,
    artist: String,
    album: Option<String>,
    artwork: Option<String>,
    position: f64,
    duration: f64,
    #[serde(default)]
    paused: bool,
    #[serde(default)]
    labels: Labels,
}

/// Textos do card, já no idioma do app.
#[derive(Deserialize, Default)]
#[serde(rename_all = "camelCase")]
struct Labels {
    listen: Option<String>,
    paused: Option<String>,
    get_takaro: Option<String>,
}

fn label<'a>(value: &'a Option<String>, default: &'a str) -> &'a str {
    value.as_deref().map(str::trim).filter(|s| !s.is_empty()).unwrap_or(default)
}

/// Botões do Discord: rótulo de até 32 caracteres.
fn button_label(s: &str) -> String {
    s.chars().take(32).collect()
}

fn clock(secs: f64) -> String {
    let s = secs.max(0.0) as u64;
    if s >= 3600 {
        format!("{}:{:02}:{:02}", s / 3600, s / 60 % 60, s % 60)
    } else {
        format!("{:02}:{:02}", s / 60, s % 60)
    }
}

/// O Discord exige 2..=128 bytes nos campos de texto.
fn field(s: &str) -> String {
    let mut out = String::new();
    for ch in s.trim().chars() {
        if out.len() + ch.len_utf8() > 128 {
            break;
        }
        out.push(ch);
    }
    while out.chars().count() < 2 {
        out.push('\u{200B}');
    }
    out
}

/// The card's "Listen" link: Takaro's open page for valid YouTube ids, YouTube Music otherwise.
fn open_link(video_id: &str) -> String {
    let id_ok = !video_id.is_empty() && video_id.len() <= 64 && video_id.chars().all(|c| c.is_ascii_alphanumeric() || c == '-' || c == '_');
    if id_ok {
        format!("{SITE_URL}/open/?v={video_id}")
    } else {
        "https://music.youtube.com/".to_string()
    }
}

fn build_activity(t: &Track) -> Value {
    // Real time, not just this computer's clock: Discord shows other people the elapsed time from
    // their own clocks (see clock.rs).
    let now = clock::now_ms();
    let start = now - (t.position * 1000.0) as i64;

    // O Discord calcula a barra a partir do relógio, então não dá para "congelá-la":
    // pausado, a barra sai e o tempo parado aparece como texto na 3ª linha.
    let mut timestamps = Map::new();
    if !t.paused {
        timestamps.insert("start".into(), json!(start));
        if t.duration > 0.0 {
            timestamps.insert("end".into(), json!(start + (t.duration * 1000.0) as i64));
        }
    }

    let mut assets = Map::new();
    if let Some(url) = t.artwork.as_deref() {
        if url.starts_with("https://") && url.len() <= 256 {
            assets.insert("large_image".into(), json!(url));
        }
    }
    let album = t.album.as_deref().map(str::trim).filter(|a| !a.is_empty());
    if t.paused {
        let mut text = format!("⏸ {} · {}", label(&t.labels.paused, DEFAULT_PAUSED), clock(t.position));
        if t.duration > 0.0 {
            text += &format!(" / {}", clock(t.duration));
        }
        assets.insert("large_text".into(), json!(field(&text)));
    } else if let Some(album) = album {
        assets.insert("large_text".into(), json!(field(album)));
    }
    if !SMALL_IMAGE_KEY.is_empty() {
        assets.insert("small_image".into(), json!(SMALL_IMAGE_KEY));
        assets.insert("small_text".into(), json!(SMALL_IMAGE_TEXT));
    }

    let mut activity = json!({
        "type": 2, // Listening
        "status_display_type": STATUS_DISPLAY_TYPE,
        "details": field(&t.title),
        "state": field(&t.artist),
        "timestamps": timestamps,
        "assets": assets,
    });
    let mut buttons = Vec::new();
    if !t.video_id.is_empty() {
        buttons.push(json!({
            "label": button_label(label(&t.labels.listen, DEFAULT_LISTEN)),
            // takaro.im/open: opens the song in Takaro (tak://) if the viewer has it, else offers
            // YouTube Music — like Spotify's open.spotify.com links.
            "url": open_link(&t.video_id),
        }));
    }
    buttons.push(json!({ "label": button_label(label(&t.labels.get_takaro, DEFAULT_SITE)), "url": SITE_URL }));
    activity["buttons"] = json!(buttons);
    activity
}

#[tauri::command]
fn track_update(track: Track, presence: State<Presence>, tray: State<tray::Tray>) {
    let now = if track.artist.trim().is_empty() {
        track.title.trim().to_string()
    } else {
        format!("{} — {}", track.title.trim(), track.artist.trim())
    };
    tray.set_track(Some(now), !track.paused);
    overlay::set(Some(overlay::NowPlaying {
        title: track.title.clone(),
        artist: track.artist.clone(),
        album: track.album.clone(),
        artwork: track.artwork.clone(),
        position: track.position,
        duration: track.duration,
        paused: track.paused,
        at_ms: 0,
    }));
    let _ = presence.0.send(discord::Cmd::Set(build_activity(&track)));
}

#[tauri::command]
fn playback_stopped(presence: State<Presence>, tray: State<tray::Tray>) {
    tray.set_track(None, false);
    overlay::set(None);
    let _ = presence.0.send(discord::Cmd::Clear);
}

/// Opens one of Takaro's own links in the default browser.
#[tauri::command]
fn open_external(url: String) -> Result<(), String> {
    const ALLOWED: [&str; 2] = ["https://takaro.im", "https://github.com/2nxty/Takaro"];
    if !ALLOWED.iter().any(|a| url == *a || url.starts_with(&format!("{a}/"))) {
        return Err("link not allowed".into());
    }
    window::open_in_browser(&url).map_err(|e| e.to_string())
}

/// Tooltips of the Windows taskbar buttons, in the app's language (nothing to do elsewhere).
#[tauri::command]
#[allow(unused_variables)]
fn set_taskbar_labels(app: tauri::AppHandle, previous: String, play_pause: String, next: String) {
    #[cfg(windows)]
    taskbar::set_labels(&app, previous, play_pause, next);
}

fn main() {
    let client_id = std::env::var("DISCORD_CLIENT_ID")
        .unwrap_or_else(|_| DISCORD_CLIENT_ID.to_string());
    let (tx, rx) = channel();
    clock::start();
    std::thread::spawn(move || discord::run(client_id, rx));

    tauri::Builder::default()
        // Opening Takaro again just brings the running window to the front.
        .plugin(tauri_plugin_single_instance::init(|app, args, _cwd| {
            // A tak:// link opened while Takaro runs (Windows / Linux pass it as an argument).
            if let Some(code) = links::jam_from_args(args.iter().cloned()) {
                open_jam(app, code);
            } else if let Some(url) = links::from_args(args) {
                go_to(app, &url);
            }
            tray::show_main(app);
        }))
        .manage(Presence(tx))
        .manage(JamInvite::default())
        .invoke_handler(tauri::generate_handler![
            track_update,
            playback_stopped,
            open_external,
            tray::set_tray_labels,
            window::titlebar_action,
            window::set_zoom,
            mini::set_mini,
            mini::mini_state,
            mini::mini_action,
            lastfm::lastfm_status,
            lastfm::lastfm_connect,
            lastfm::lastfm_disconnect,
            lastfm::lastfm_track,
            jam_take_invite,
            overlay::set_overlay,
            overlay::player_state,
            set_taskbar_labels,
            updater::check_update,
            updater::install_update,
            extensions::list_extensions,
            extensions::set_extension_enabled,
            extensions::remove_extension,
            extensions::install_extension,
            extensions::extension_installed,
            extensions::open_store,
            extensions::open_extension_options,
            extensions::reload_main,
            adblock::set_adblock,
        ])
        .setup(|app| {
            updater::cleanup();
            tray::setup(app.handle())?;
            links::register();
            // The ad blocker (when on) runs before everything else, so it sees YouTube Music's first
            // player response too.
            // Started by a tak://jam/<CODE> link: the page asks for it once it's loaded.
            if let Some(code) = links::jam_from_args(std::env::args()) {
                *app.state::<JamInvite>().0.lock().unwrap() = Some(code);
            }
            let inject = format!(
                "window.__TAKARO_JAM_URL__ = {:?};\nwindow.__TAKARO_USER__ = {:?};\n{}{INJECT}",
                jam_url(),
                system_user_name(),
                adblock::init_script(app.handle())
            );
            window::create(app, &inject, links::from_args(std::env::args()))?;
            overlay::init(app.handle().clone());
            // Previous / play-pause / next under the window's preview, and the progress on its button.
            #[cfg(windows)]
            taskbar::init(app.handle());
            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("erro ao iniciar o Takaro")
        .run(|app, event| {
            // macOS delivers tak:// links as an "open URLs" event (not as arguments), whether
            // Takaro was running or was just started by the link.
            #[cfg(target_os = "macos")]
            if let tauri::RunEvent::Opened { urls } = &event {
                for link in urls {
                    if let Some(code) = links::jam_code(link.as_str()) {
                        open_jam(app, code);
                        tray::show_main(app);
                    } else if let Some(url) = links::to_url(link.as_str()) {
                        go_to(app, &url);
                        tray::show_main(app);
                    }
                }
            }
            let _ = (app, event);
        });
}

/// Opens a music.youtube.com address (from a tak:// link) in the main window.
fn go_to(app: &tauri::AppHandle, url: &str) {
    if let (Some(page), Ok(url)) = (window::ytm(app), url.parse()) {
        let _ = page.navigate(url);
    }
}
