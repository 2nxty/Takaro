#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod discord;
mod extensions;
mod perf;
mod tray;
mod updater;
mod window;

use serde::Deserialize;
use serde_json::{json, Map, Value};
use std::sync::mpsc::{channel, Sender};
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::State;

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
/// Link do segundo botão do card. Os textos do card vêm traduzidos do app
/// (src/i18n/*.json → "presence"); estes são só o fallback em inglês.
const SITE_URL: &str = "https://takaro.nxty.cc";
const DEFAULT_LISTEN: &str = "Listen on YouTube Music";
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
/// core → plugins (registram-se no core) → UI de configurações → Discord presence.
const INJECT: &str = concat!(
    "window.__TAKARO_VERSION__ = \"", env!("CARGO_PKG_VERSION"), "\";\n",
    include_str!(concat!(env!("OUT_DIR"), "/locales.js")), "\n", // gerado de src/i18n/*.json
    include_str!("inject/core.js"), "\n",
    include_str!("inject/plugins/sponsorblock.js"), "\n",
    include_str!("inject/plugins/skip-disliked-songs.js"), "\n",
    include_str!("inject/plugins/disable-autoplay.js"), "\n",
    include_str!("inject/plugins/resume-session.js"), "\n",
    include_str!("inject/plugins/precise-volume.js"), "\n",
    include_str!("inject/plugins/playback-speed.js"), "\n",
    include_str!("inject/plugins/quality-changer.js"), "\n",
    include_str!("inject/plugins/video-toggle.js"), "\n",
    include_str!("inject/ui.js"), "\n",
    include_str!("inject/presence.js"),
);

struct Presence(Sender<discord::Cmd>);

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

fn build_activity(t: &Track) -> Value {
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis() as i64)
        .unwrap_or(0);
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
            "url": format!("https://music.youtube.com/watch?v={}", t.video_id),
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
    let _ = presence.0.send(discord::Cmd::Set(build_activity(&track)));
}

#[tauri::command]
fn playback_stopped(presence: State<Presence>, tray: State<tray::Tray>) {
    tray.set_track(None, false);
    let _ = presence.0.send(discord::Cmd::Clear);
}

/// Opens one of Takaro's own links in the default browser.
#[tauri::command]
fn open_external(url: String) -> Result<(), String> {
    const ALLOWED: [&str; 2] = ["https://takaro.nxty.cc", "https://github.com/2nxty/Takaro"];
    if !ALLOWED.iter().any(|a| url == *a || url.starts_with(&format!("{a}/"))) {
        return Err("link not allowed".into());
    }
    use std::os::windows::process::CommandExt;
    std::process::Command::new("rundll32.exe")
        .args(["url.dll,FileProtocolHandler", &url])
        .creation_flags(0x0800_0000) // CREATE_NO_WINDOW
        .spawn()
        .map(|_| ())
        .map_err(|e| e.to_string())
}

fn main() {
    let client_id = std::env::var("DISCORD_CLIENT_ID")
        .unwrap_or_else(|_| DISCORD_CLIENT_ID.to_string());
    let (tx, rx) = channel();
    std::thread::spawn(move || discord::run(client_id, rx));

    tauri::Builder::default()
        // Opening Takaro again just brings the running window to the front.
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| tray::show_main(app)))
        .manage(Presence(tx))
        .invoke_handler(tauri::generate_handler![
            track_update,
            playback_stopped,
            open_external,
            tray::set_tray_labels,
            window::titlebar_action,
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
        ])
        .setup(|app| {
            updater::cleanup();
            tray::setup(app.handle())?;
            window::create(app, INJECT)?;
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("erro ao iniciar o Takaro");
}
