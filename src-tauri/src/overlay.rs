//! OBS overlay: a tiny local HTTP server (127.0.0.1 only, no dependencies) with a now-playing
//! page for an OBS Browser Source.
//!   GET /overlay          — the overlay page (?layout=card|compact|text)
//!   GET /now-playing      — JSON with the current track (position extrapolated while playing)
//!   POST /control         — external control (mods, scripts): {"action": "next"} …
//! Off by default; turned on from Takaro settings (General → OBS overlay, where the port and the
//! progress bar gradient can be changed too, and General → External control, a separate switch:
//! someone using the overlay in OBS doesn't get a control port without knowing).
//!
//! The control route only takes requests a web page can't send: a custom `X-Takaro-Control: 1`
//! header (a browser would have to ask first with a CORS preflight, which this server never
//! allows) and a `Host` that is this machine (blocks DNS rebinding). Actions come from a fixed list.

use serde::Serialize;
use serde_json::json;
use std::io::{BufRead, BufReader, Write};
use std::net::{TcpListener, TcpStream};
use std::sync::atomic::{AtomicBool, AtomicU16, AtomicU32, Ordering};
use std::sync::{Mutex, OnceLock};
use std::time::{Duration, SystemTime, UNIX_EPOCH};
use tauri::AppHandle;

pub const DEFAULT_PORT: u16 = 13091;
const PAGE: &str = include_str!("overlay.html");

static ENABLED: AtomicBool = AtomicBool::new(false);
/// External control on (POST /control, and /now-playing lists the actions).
static CONTROL: AtomicBool = AtomicBool::new(false);
static APP: OnceLock<AppHandle> = OnceLock::new();
/// The player's toggles (repeat, volume, muted), sent by the page while control is on.
static STATE: Mutex<Option<serde_json::Value>> = Mutex::new(None);
/// Same list as `T.CONTROL_ACTIONS` in core.js.
pub const ACTIONS: [&str; 7] = ["toggle", "next", "previous", "seek", "shuffle", "repeat", "volume"];
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

/// Called once at startup: the control route runs actions in the main window.
pub fn init(app: AppHandle) {
    let _ = APP.set(app);
}

/// Something is playing (not paused), for the taskbar's play/pause button.
#[cfg_attr(not(windows), allow(dead_code))]
pub fn is_playing() -> bool {
    NOW.lock().ok().and_then(|t| t.as_ref().map(|t| !t.paused)).unwrap_or(false)
}

/// From the page while control is on.
#[tauri::command]
pub fn player_state(state: serde_json::Value) {
    *STATE.lock().unwrap() = Some(state);
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
    let mut out = match NOW.lock().unwrap().clone() {
        None => json!({ "playing": false, "style": style }),
        Some(mut t) => {
            if !t.paused {
                t.position = (t.position + (now_ms() - t.at_ms) as f64 / 1000.0).min(if t.duration > 0.0 { t.duration } else { f64::MAX });
            }
            json!({ "playing": true, "track": t, "style": style })
        }
    };
    if CONTROL.load(Ordering::SeqCst) {
        out["controls"] = json!(ACTIONS);
        if let Some(state) = STATE.lock().unwrap().clone() {
            out["state"] = state;
        }
    }
    out
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

/// The request: method, path, headers (names lowercased) and body (small bodies only).
struct Request {
    method: String,
    path: String,
    headers: Vec<(String, String)>,
    body: Vec<u8>,
}

impl Request {
    fn header(&self, name: &str) -> Option<&str> {
        self.headers.iter().find(|(k, _)| k == name).map(|(_, v)| v.as_str())
    }
}

fn read_request(stream: &TcpStream) -> Option<Request> {
    use std::io::Read;
    let mut reader = BufReader::new(stream);
    let mut line = String::new();
    reader.read_line(&mut line).ok()?;
    let mut parts = line.split_whitespace();
    let method = parts.next()?.to_string();
    let path = parts.next().unwrap_or("/").to_string();
    let mut headers = Vec::new();
    for _ in 0..64 {
        let mut h = String::new();
        if reader.read_line(&mut h).ok()? == 0 || h.trim().is_empty() {
            break;
        }
        if let Some((k, v)) = h.split_once(':') {
            headers.push((k.trim().to_ascii_lowercase(), v.trim().to_string()));
        }
    }
    let len: usize = headers.iter().find(|(k, _)| k == "content-length").and_then(|(_, v)| v.parse().ok()).unwrap_or(0);
    if len > 4096 {
        return None;
    }
    let mut body = vec![0; len];
    reader.read_exact(&mut body).ok()?;
    Some(Request { method, path, headers, body })
}

/// POST /control: runs one action from the fixed list in the main window.
fn control(stream: TcpStream, req: &Request) {
    let port = BOUND.load(Ordering::SeqCst);
    let host_ok = req.header("host").is_some_and(|h| h == format!("127.0.0.1:{port}") || h == format!("localhost:{port}"));
    if req.header("x-takaro-control") != Some("1") || !host_ok {
        return respond(stream, "403 Forbidden", "text/plain", b"forbidden");
    }
    let cmd: serde_json::Value = serde_json::from_slice(&req.body).unwrap_or_default();
    let action = cmd["action"].as_str().unwrap_or("");
    if !ACTIONS.contains(&action) {
        return respond(stream, "400 Bad Request", "text/plain", b"unknown action");
    }
    // Only numbers go through as values (seek seconds, volume 0-100).
    let value = cmd["value"].as_f64().map(|v| json!(v)).unwrap_or(serde_json::Value::Null);
    let js = format!("window.Takaro?.control?.run({})", json!({ "action": action, "value": value }));
    match APP.get().and_then(crate::window::ytm) {
        Some(page) if page.eval(js).is_ok() => respond(stream, "200 OK", "application/json", b"{\"ok\":true}"),
        _ => respond(stream, "503 Service Unavailable", "text/plain", b"player not ready"),
    }
}

fn handle(stream: TcpStream) {
    let _ = stream.set_read_timeout(Some(Duration::from_secs(3)));
    let Some(req) = read_request(&stream) else { return };
    let route = req.path.split('?').next().unwrap_or("/").to_string();
    let overlay = ENABLED.load(Ordering::SeqCst);
    let control_on = CONTROL.load(Ordering::SeqCst);
    match (req.method.as_str(), route.as_str()) {
        ("GET", "/overlay" | "/") if overlay => respond(stream, "200 OK", "text/html; charset=utf-8", PAGE.as_bytes()),
        ("GET", "/now-playing") if overlay || control_on => {
            respond(stream, "200 OK", "application/json", snapshot().to_string().as_bytes())
        }
        ("POST", "/control") if control_on => control(stream, &req),
        _ => respond(stream, "404 Not Found", "text/plain", b"not found"),
    }
}

/// Turns the overlay and the external control on/off and applies their settings. The listener
/// starts the first time either is enabled, and moves when the port changes.
#[tauri::command]
pub fn set_overlay(
    enabled: bool,
    port: Option<u16>,
    from: Option<String>,
    to: Option<String>,
    control: Option<bool>,
) -> Result<String, String> {
    let port = port.filter(|p| *p >= 1024).unwrap_or(DEFAULT_PORT);
    *COLORS.lock().unwrap() = (color(from), color(to));
    ENABLED.store(enabled, Ordering::SeqCst);
    let control = control.unwrap_or(false);
    CONTROL.store(control, Ordering::SeqCst);
    if !control {
        *STATE.lock().unwrap() = None;
    }
    let old = BOUND.load(Ordering::SeqCst);
    if (enabled || control) && old != port {
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
