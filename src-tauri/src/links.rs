//! Shared links: the `tak://` protocol opens YouTube Music content in Takaro.
//!
//!   tak://watch/<videoId>[/<playlistId>]     tak://playlist/<id>      tak://channel/<UC…|@handle>
//!   tak://music.youtube.com/<path>            (swap https:// for tak:// on a music.youtube.com URL)
//!   tak://www.youtube.com/watch?v=…  tak://youtu.be/<id>   (opened as YouTube Music)
//!
//! The protocol is registered for the current user (HKCU) on every start, pointing at this exe,
//! so it keeps working if the portable exe is moved.

use std::os::windows::process::CommandExt;
use std::process::Command;

const CREATE_NO_WINDOW: u32 = 0x0800_0000;
const BASE: &str = "https://music.youtube.com";

/// Registers tak:// for the current user (runs in the background, no admin needed).
pub fn register() {
    let Ok(exe) = std::env::current_exe() else { return };
    let exe = exe.display().to_string();
    std::thread::spawn(move || {
        let key = r"HKCU\Software\Classes\tak";
        let reg = |args: &[&str]| {
            let _ = Command::new("reg.exe").args(args).creation_flags(CREATE_NO_WINDOW).output();
        };
        reg(&["add", key, "/ve", "/d", "URL:Takaro link", "/f"]);
        reg(&["add", key, "/v", "URL Protocol", "/d", "", "/f"]);
        reg(&["add", &format!(r"{key}\DefaultIcon"), "/ve", "/d", &format!("\"{exe}\",0"), "/f"]);
        reg(&["add", &format!(r"{key}\shell\open\command"), "/ve", "/d", &format!("\"{exe}\" \"%1\""), "/f"]);
    });
}

fn is_id(s: &str) -> bool {
    !s.is_empty() && s.len() <= 64 && s.chars().all(|c| c.is_ascii_alphanumeric() || c == '-' || c == '_')
}

fn is_handle(s: &str) -> bool {
    s.starts_with('@') && s.len() > 1 && s[1..].chars().all(|c| c.is_ascii_alphanumeric() || "-_.".contains(c))
}

/// Radio/mix ids (RD…) make YTM show "Radio is starting…" instead of playing the track.
fn keep_list(list: &str) -> bool {
    is_id(list) && !list.starts_with("RD")
}

fn watch(video: &str, list: Option<&str>) -> Option<String> {
    if !is_id(video) {
        return None;
    }
    Some(match list.filter(|l| keep_list(l)) {
        Some(l) => format!("{BASE}/watch?v={video}&list={l}"),
        None => format!("{BASE}/watch?v={video}"),
    })
}

fn query<'a>(q: &'a str, key: &str) -> Option<&'a str> {
    q.split('&').find_map(|kv| kv.strip_prefix(key).and_then(|v| v.strip_prefix('=')))
}

/// Turns a tak:// link into a safe https://music.youtube.com URL (or None if it isn't valid).
pub fn to_url(link: &str) -> Option<String> {
    let rest = link.trim().strip_prefix("tak://")?.trim_end_matches('/');
    let (path, q) = rest.split_once('?').unwrap_or((rest, ""));
    let parts: Vec<&str> = path.split('/').filter(|p| !p.is_empty()).collect();
    match parts.as_slice() {
        // compact forms
        ["watch", v] => watch(v, None),
        ["watch", v, l] => watch(v, Some(l)),
        ["playlist", l] | ["playlist", l, "play"] if is_id(l) => Some(format!("{BASE}/playlist?list={l}")),
        ["channel", c] if is_id(c) => Some(format!("{BASE}/channel/{c}")),
        ["channel", h] if is_handle(h) => Some(format!("{BASE}/{h}")),
        // full URLs with https:// swapped for tak://
        [host, rest @ ..] => {
            let host = host.to_ascii_lowercase();
            let yt = ["music.youtube.com", "www.youtube.com", "youtube.com", "m.youtube.com"].contains(&host.as_str());
            match (yt, host.as_str(), rest) {
                (_, "youtu.be", [v]) => watch(v, query(q, "list")),
                (true, _, ["watch"]) => watch(query(q, "v")?, query(q, "list")),
                (true, _, ["shorts" | "embed", v]) => watch(v, None),
                (true, _, ["playlist"]) => query(q, "list").filter(|l| is_id(l)).map(|l| format!("{BASE}/playlist?list={l}")),
                (true, _, ["channel", c]) if is_id(c) => Some(format!("{BASE}/channel/{c}")),
                (true, _, [h]) if is_handle(h) => Some(format!("{BASE}/{h}")),
                (true, _, ["browse", b]) if is_id(b) => Some(format!("{BASE}/browse/{b}")),
                _ => None,
            }
        }
        _ => None,
    }
}

/// The first tak:// link among command-line arguments, as a music.youtube.com URL.
pub fn from_args<I: IntoIterator<Item = String>>(args: I) -> Option<String> {
    args.into_iter().find(|a| a.starts_with("tak://")).and_then(|a| to_url(&a))
}

#[cfg(test)]
mod tests {
    use super::to_url;

    #[test]
    fn parses_links() {
        assert_eq!(to_url("tak://watch/dQw4w9WgXcQ").as_deref(), Some("https://music.youtube.com/watch?v=dQw4w9WgXcQ"));
        assert_eq!(to_url("tak://watch/abc/PL123").as_deref(), Some("https://music.youtube.com/watch?v=abc&list=PL123"));
        assert_eq!(to_url("tak://watch/abc/RDAMVMabc").as_deref(), Some("https://music.youtube.com/watch?v=abc"));
        assert_eq!(to_url("tak://music.youtube.com/watch?v=abc&list=PLx").as_deref(), Some("https://music.youtube.com/watch?v=abc&list=PLx"));
        assert_eq!(to_url("tak://youtu.be/abc").as_deref(), Some("https://music.youtube.com/watch?v=abc"));
        assert_eq!(to_url("tak://www.youtube.com/@Artist").as_deref(), Some("https://music.youtube.com/@Artist"));
        assert_eq!(to_url("tak://playlist/PLx/play").as_deref(), Some("https://music.youtube.com/playlist?list=PLx"));
        assert_eq!(to_url("tak://evil.com/watch?v=abc"), None);
        assert_eq!(to_url("tak://watch/a\"b"), None);
    }
}
