//! Last.fm scrobbling.
//!
//! Like the Discord ID, the Last.fm API key and secret are NOT in the repository: set
//! `LASTFM_API_KEY` and `LASTFM_API_SECRET` when building (compiled in) or when running (they win).
//! Without them the feature doesn't show up. Get them at https://www.last.fm/api/account/create.
//!
//! Connecting (desktop auth): a token from `auth.getToken` → the user approves it on last.fm in the
//! browser → `auth.getSession` returns a session key, kept in the app's data folder. The page sends
//! "now playing" and the scrobble (after half the song or 4 minutes, Last.fm's rule).

use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::BTreeMap;
use std::path::PathBuf;
use std::time::Duration;
use tauri::{AppHandle, Manager};

const API: &str = "https://ws.audioscrobbler.com/2.0/";

fn keys() -> Option<(String, String)> {
    let get = |name: &str, built: Option<&'static str>| {
        std::env::var(name).ok().filter(|v| !v.trim().is_empty()).or_else(|| built.filter(|v| !v.is_empty()).map(str::to_string))
    };
    Some((get("LASTFM_API_KEY", option_env!("LASTFM_API_KEY"))?, get("LASTFM_API_SECRET", option_env!("LASTFM_API_SECRET"))?))
}

#[derive(Serialize, Deserialize, Default)]
struct Session {
    key: String,
    user: String,
}

#[derive(Serialize)]
pub struct Status {
    /// The build has an API key (otherwise the feature is hidden).
    available: bool,
    /// The connected Last.fm user.
    user: Option<String>,
}

fn session_file(app: &AppHandle) -> Option<PathBuf> {
    app.path().app_local_data_dir().ok().map(|d| d.join("lastfm.json"))
}

fn load(app: &AppHandle) -> Option<Session> {
    serde_json::from_str(&std::fs::read_to_string(session_file(app)?).ok()?).ok()
}

/// api_sig: md5 of every parameter (sorted, name+value, without `format`) followed by the secret.
fn sign(params: &BTreeMap<String, String>, secret: &str) -> String {
    let mut s = String::new();
    for (k, v) in params {
        if k != "format" && k != "callback" {
            s.push_str(k);
            s.push_str(v);
        }
    }
    s.push_str(secret);
    format!("{:x}", md5::compute(s.as_bytes()))
}

/// A signed POST to the API; the parsed JSON, or Last.fm's error message.
fn call(method: &str, mut params: BTreeMap<String, String>, session: Option<&str>) -> Result<Value, String> {
    let (key, secret) = keys().ok_or("Last.fm isn't set up in this build")?;
    params.insert("method".into(), method.into());
    params.insert("api_key".into(), key);
    if let Some(sk) = session {
        params.insert("sk".into(), sk.into());
    }
    let sig = sign(&params, &secret);
    params.insert("api_sig".into(), sig);
    params.insert("format".into(), "json".into());
    let body = post(&params)?;
    let json: Value = serde_json::from_str(&body).map_err(|e| e.to_string())?;
    if let Some(code) = json["error"].as_i64() {
        return Err(format!("Last.fm error {code}: {}", json["message"].as_str().unwrap_or("")));
    }
    Ok(json)
}

#[cfg(windows)]
fn post(params: &BTreeMap<String, String>) -> Result<String, String> {
    use std::os::windows::process::CommandExt;
    let root = std::env::var("SystemRoot").unwrap_or_else(|_| r"C:\Windows".into());
    let mut cmd = std::process::Command::new(std::path::Path::new(&root).join("System32").join("curl.exe"));
    cmd.creation_flags(0x0800_0000).args(["-sS", "--max-time", "20", "-A", "Takaro"]);
    for (k, v) in params {
        cmd.arg("--data-urlencode").arg(format!("{k}={v}"));
    }
    let out = cmd.arg(API).output().map_err(|e| format!("curl: {e}"))?;
    if !out.status.success() {
        return Err(String::from_utf8_lossy(&out.stderr).trim().to_string());
    }
    Ok(String::from_utf8_lossy(&out.stdout).into_owned())
}

#[cfg(not(windows))]
fn post(params: &BTreeMap<String, String>) -> Result<String, String> {
    post_http(params)
}

#[cfg(any(not(windows), test))]
fn post_http(params: &BTreeMap<String, String>) -> Result<String, String> {
    let agent: ureq::Agent = ureq::Agent::config_builder()
        .timeout_global(Some(Duration::from_secs(20)))
        .user_agent("Takaro")
        .http_status_as_error(false) // Last.fm's errors come as JSON
        .build()
        .into();
    let fields: Vec<(&str, &str)> = params.iter().map(|(k, v)| (k.as_str(), v.as_str())).collect();
    let mut resp = agent.post(API).send_form(fields).map_err(|e| e.to_string())?;
    resp.body_mut().read_to_string().map_err(|e| e.to_string())
}

// ── Commands ─────────────────────────────────────────────────────────

#[tauri::command]
pub fn lastfm_status(app: AppHandle) -> Status {
    Status { available: keys().is_some(), user: load(&app).map(|s| s.user) }
}

/// Opens Last.fm's approval page and waits (up to 3 minutes) for the user to allow Takaro.
#[tauri::command]
pub async fn lastfm_connect(app: AppHandle) -> Result<String, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let token = call("auth.getToken", BTreeMap::new(), None)?["token"].as_str().ok_or("no token")?.to_string();
        let (key, _) = keys().ok_or("Last.fm isn't set up in this build")?;
        crate::window::open_in_browser(&format!("https://www.last.fm/api/auth/?api_key={key}&token={token}")).map_err(|e| e.to_string())?;
        for _ in 0..60 {
            std::thread::sleep(Duration::from_secs(3));
            let params = BTreeMap::from([("token".to_string(), token.clone())]);
            match call("auth.getSession", params, None) {
                Ok(json) => {
                    let s = &json["session"];
                    let session = Session { key: s["key"].as_str().unwrap_or("").into(), user: s["name"].as_str().unwrap_or("").into() };
                    if session.key.is_empty() {
                        return Err("no session".into());
                    }
                    let file = session_file(&app).ok_or("no data folder")?;
                    if let Some(dir) = file.parent() {
                        std::fs::create_dir_all(dir).map_err(|e| e.to_string())?;
                    }
                    std::fs::write(&file, serde_json::to_vec(&session).map_err(|e| e.to_string())?).map_err(|e| e.to_string())?;
                    return Ok(session.user);
                }
                // 14 = not authorized yet: keep waiting.
                Err(e) if e.contains("error 14") => continue,
                Err(e) => return Err(e),
            }
        }
        Err("timed out waiting for the approval on Last.fm".into())
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub fn lastfm_disconnect(app: AppHandle) {
    if let Some(f) = session_file(&app) {
        let _ = std::fs::remove_file(f);
    }
}

#[derive(Deserialize)]
pub struct Scrobble {
    artist: String,
    track: String,
    album: Option<String>,
    duration: Option<f64>,
    /// When the song started (seconds since the epoch); only for scrobbles.
    timestamp: Option<i64>,
}

/// "now playing" (no timestamp) or a scrobble.
#[tauri::command]
pub async fn lastfm_track(app: AppHandle, track: Scrobble) -> Result<(), String> {
    let Some(session) = load(&app) else { return Ok(()) };
    if track.artist.trim().is_empty() || track.track.trim().is_empty() {
        return Ok(());
    }
    tauri::async_runtime::spawn_blocking(move || {
        let mut p = BTreeMap::from([("artist".to_string(), track.artist), ("track".to_string(), track.track)]);
        if let Some(album) = track.album.filter(|a| !a.trim().is_empty()) {
            p.insert("album".into(), album);
        }
        if let Some(d) = track.duration.filter(|d| *d > 0.0) {
            p.insert("duration".into(), (d.round() as i64).to_string());
        }
        let method = match track.timestamp {
            Some(ts) => {
                p.insert("timestamp".into(), ts.to_string());
                "track.scrobble"
            }
            None => "track.updateNowPlaying",
        };
        call(method, p, Some(&session.key)).map(|_| ())
    })
    .await
    .map_err(|e| e.to_string())?
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn signature() {
        // Last.fm's documented recipe: md5("api_key" + key + "method" + m + "token" + t + secret).
        let p = BTreeMap::from([
            ("method".to_string(), "auth.getSession".to_string()),
            ("api_key".to_string(), "abc".to_string()),
            ("token".to_string(), "tok".to_string()),
            ("format".to_string(), "json".to_string()),
        ]);
        let expected = format!("{:x}", md5::compute("api_keyabcmethodauth.getSessiontokentoksecret"));
        assert_eq!(sign(&p, "secret"), expected);
    }

    #[test]
    #[ignore] // network
    fn http_post_path() {
        // The macOS / Linux path; an unsigned call gets a JSON error back, which is the point.
        let body = post_http(&BTreeMap::from([("method".to_string(), "auth.getToken".to_string()), ("format".to_string(), "json".to_string())])).unwrap();
        assert!(body.contains("error"));
    }
}
