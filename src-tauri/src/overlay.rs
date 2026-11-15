//! OBS overlay: a tiny local HTTP server (127.0.0.1 only, no dependencies) with a now-playing
//! page for an OBS Browser Source.
//!   GET /overlay          — the overlay page (?layout=card|compact|text)
//!   GET /now-playing      — JSON with the current track (position extrapolated while playing)
//! Off by default; turned on from Takaro settings (General → OBS overlay), where the port and the
//! progress bar gradient can be changed too.

use serde::Serialize;
use serde_json::json;
use std::io::{BufRead, BufReader, Write};
use std::net::{TcpListener, TcpStream};
use std::sync::atomic::{AtomicBool, AtomicU16, AtomicU32, Ordering};
use std::sync::Mutex;
use std::time::{Duration, SystemTime, UNIX_EPOCH};

pub const DEFAULT_PORT: u16 = 13091;
const PAGE: &str = include_str!("overlay.html");

static ENABLED: AtomicBool = AtomicBool::new(false);
/// Port the server listens on (0 = not started) and a generation number: when the port changes a
/// new listener starts and the old one stops at its next connection.
static BOUND: AtomicU16 = AtomicU16::new(0);
static GENERATION: AtomicU32 = AtomicU32::new(0);
static NOW: Mutex<Option<NowPlaying>> = Mutex::new(None);
static COLORS: Mutex<(String, String)> = Mutex::new((String::new(), String::new()));

#[derive(Clone, Serialize)]
pub struct NowPlaying {
    pub title: String,
    pub artist: String,
    pub album: Option<String>,
    pub artwork: Option<String>,
    pub position: f64,
    pub duration: f64,
    pub paused: bool,
    #[serde(skip)]
    pub at_ms: u128,
}

fn now_ms() -> u128 {
    SystemTime::now().duration_since(UNIX_EPOCH).map(|d| d.as_millis()).unwrap_or(0)
}

/// Called by the presence commands.
pub fn set(track: Option<NowPlaying>) {
    *NOW.lock().unwrap() = track.map(|mut t| {
        t.at_ms = now_ms();
        t
    });
}

fn snapshot() -> serde_json::Value {
    let (from, to) = COLORS.lock().unwrap().clone();
    let style = json!({ "from": if from.is_empty() { "#ff3040" } else { &from }, "to": if to.is_empty() { "#781ec8" } else { &to } });
    match NOW.lock().unwrap().clone() {
        None => json!({ "playing": false, "style": style }),
        Some(mut t) => {
            if !t.paused {
                t.position = (t.position + (now_ms() - t.at_ms) as f64 / 1000.0).min(if t.duration > 0.0 { t.duration } else { f64::MAX });
            }
            json!({ "playing": true, "track": t, "style": style })
        }
    }
}

/// `#rrggbb` only (the value ends up in the page's CSS).
fn color(c: Option<String>) -> String {
    c.filter(|c| c.len() == 7 && c.starts_with('#') && c[1..].chars().all(|x| x.is_ascii_hexdigit())).unwrap_or_default()
}

fn respond(mut stream: TcpStream, status: &str, kind: &str, body: &[u8]) {
    let head = format!(
        "HTTP/1.1 {status}\r\nContent-Type: {kind}\r\nContent-Length: {}\r\nCache-Control: no-store\r\nAccess-Control-Allow-Origin: *\r\nConnection: close\r\n\r\n",
        body.len()
    );
    let _ = stream.write_all(head.as_bytes());
    let _ = stream.write_all(body);
}

fn handle(stream: TcpStream) {
    let _ = stream.set_read_timeout(Some(Duration::from_secs(3)));
    let mut line = String::new();
    if BufReader::new(&stream).read_line(&mut line).is_err() {
        return;
    }
    let path = line.split_whitespace().nth(1).unwrap_or("/");
    let route = path.split('?').next().unwrap_or("/");
    if !line.starts_with("GET ") || !ENABLED.load(Ordering::SeqCst) {
        return respond(stream, "404 Not Found", "text/plain", b"not found");
    }
    match route {
        "/overlay" | "/" => respond(stream, "200 OK", "text/html; charset=utf-8", PAGE.as_bytes()),
        "/now-playing" => respond(stream, "200 OK", "application/json", snapshot().to_string().as_bytes()),
        _ => respond(stream, "404 Not Found", "text/plain", b"not found"),
    }
}

/// Turns the overlay on/off and applies its settings. The listener starts the first time it's
/// enabled, and moves when the port changes.
#[tauri::command]
pub fn set_overlay(enabled: bool, port: Option<u16>, from: Option<String>, to: Option<String>) -> Result<String, String> {
    let port = port.filter(|p| *p >= 1024).unwrap_or(DEFAULT_PORT);
    *COLORS.lock().unwrap() = (color(from), color(to));
    ENABLED.store(enabled, Ordering::SeqCst);
    let old = BOUND.load(Ordering::SeqCst);
    if enabled && old != port {
        let listener = TcpListener::bind(("127.0.0.1", port)).map_err(|e| format!("port {port} unavailable: {e}"))?;
        let generation = GENERATION.fetch_add(1, Ordering::SeqCst) + 1;
        BOUND.store(port, Ordering::SeqCst);
        if old != 0 {
            let _ = TcpStream::connect(("127.0.0.1", old)); // wake the old listener so it stops
        }
        std::thread::spawn(move || {
            for stream in listener.incoming().flatten() {
                if GENERATION.load(Ordering::SeqCst) != generation {
                    break; // replaced by a listener on another port
                }
                std::thread::spawn(move || handle(stream));
            }
        });
    }
    Ok(format!("http://127.0.0.1:{port}/overlay"))
}
