//! Ad blocker: uBlock Origin's own filter lists, applied to YouTube Music on every system.
//!
//! YouTube's ads come from the same servers as the music, so blocking requests doesn't help;
//! uBlock removes them with *scriptlets* (`##+js(...)` rules) that strip the ad data from the
//! player's responses. Takaro does the same:
//!
//! 1. downloads uBlock's lists (uBlock filters + quick fixes + unbreak, with their `!#include`s,
//!    `!#if` blocks resolved for this engine) and AdGuard's scriptlet library, which implements
//!    the scriptlets uBlock's rules name;
//! 2. keeps only the rules that apply to music.youtube.com (exceptions applied), so it stays tiny;
//! 3. turns them into one script, injected before YouTube Music's own scripts on every page load.
//!
//! The lists and the scriptlets are GPL-3.0: they are downloaded by the app (refreshed once a
//! day), never bundled with it. Off by default (Takaro settings → Plugins → Ad blocker).

use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::BTreeMap;
use std::fs;
use std::path::PathBuf;
#[cfg(windows)]
use std::process::Command;
use std::time::{Duration, SystemTime, UNIX_EPOCH};
use tauri::{AppHandle, Manager};

const HOST: &str = "music.youtube.com";
const LISTS_BASE: &str = "https://ublockorigin.github.io/uAssets/filters/";
const LISTS: [&str; 3] = ["filters.txt", "quick-fixes.txt", "unbreak.txt"];
const SCRIPTLETS_URL: &str = "https://cdn.jsdelivr.net/npm/@adguard/scriptlets/dist/scriptlets.corelibs.json";
/// Lists are refreshed once a day, like uBlock does by default.
const MAX_AGE: Duration = Duration::from_secs(24 * 60 * 60);

#[derive(Serialize, Deserialize, Default)]
struct Cache {
    /// When the lists were downloaded (ms since the epoch).
    updated: u64,
    /// Rules that apply to YouTube Music (scriptlets + hidden elements).
    rules: usize,
    /// The script injected at document start.
    script: String,
}

#[derive(Serialize)]
pub struct Status {
    enabled: bool,
    updated: u64,
    rules: usize,
}

fn now_ms() -> u64 {
    SystemTime::now().duration_since(UNIX_EPOCH).map(|d| d.as_millis() as u64).unwrap_or(0)
}

fn dir(app: &AppHandle) -> Option<PathBuf> {
    app.path().app_local_data_dir().ok().map(|d| d.join("adblock"))
}

fn enabled(app: &AppHandle) -> bool {
    dir(app).is_some_and(|d| d.join("enabled").exists())
}

fn load(app: &AppHandle) -> Option<Cache> {
    let text = fs::read_to_string(dir(app)?.join("cache.json")).ok()?;
    serde_json::from_str(&text).ok()
}

fn stale(cache: &Option<Cache>) -> bool {
    cache.as_ref().map_or(true, |c| now_ms().saturating_sub(c.updated) > MAX_AGE.as_millis() as u64)
}

// ── Download ─────────────────────────────────────────────────────────

/// Downloads a text file. Windows: its built-in curl.exe. macOS / Linux: ureq (curl isn't always
/// installed there — Ubuntu doesn't ship it).
pub(crate) fn fetch(url: &str) -> Result<String, String> {
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        let root = std::env::var("SystemRoot").unwrap_or_else(|_| r"C:\Windows".into());
        let out = Command::new(std::path::Path::new(&root).join("System32").join("curl.exe"))
            .creation_flags(0x0800_0000) // CREATE_NO_WINDOW
            .args(["-fsSL", "--retry", "2", "--max-time", "60", "-A", "Takaro", url])
            .output()
            .map_err(|e| format!("curl: {e}"))?;
        if !out.status.success() {
            return Err(format!("{url}: {}", String::from_utf8_lossy(&out.stderr).trim()));
        }
        Ok(String::from_utf8_lossy(&out.stdout).into_owned())
    }
    #[cfg(not(windows))]
    {
        fetch_http(url)
    }
}

#[cfg(any(not(windows), test))]
fn fetch_http(url: &str) -> Result<String, String> {
    let agent: ureq::Agent = ureq::Agent::config_builder()
        .timeout_global(Some(Duration::from_secs(60)))
        .user_agent("Takaro")
        .build()
        .into();
    let mut last = String::new();
    for _ in 0..3 {
        match agent.get(url).call() {
            Ok(mut resp) => {
                return resp
                    .body_mut()
                    .with_config()
                    .limit(32 * 1024 * 1024)
                    .read_to_string()
                    .map_err(|e| format!("{url}: {e}"));
            }
            Err(e) => last = format!("{url}: {e}"),
        }
    }
    Err(last)
}

// ── Lists: !#if / !#include ──────────────────────────────────────────

/// uBlock's preprocessor tokens, as they apply to Takaro's web engine.
fn env_token(token: &str) -> bool {
    match token {
        "ext_ublock" | "cap_user_stylesheet" => true,
        "env_chromium" | "env_edge" => cfg!(windows), // WebView2
        "env_safari" => !cfg!(windows),                // WebKit (macOS / Linux)
        _ => false, // env_firefox, env_mobile, cap_html_filtering, ext_ubol, false, adguard…
    }
}

/// `a && !b || c` (uBlock's `!#if` expressions; no parentheses in practice).
fn eval(expr: &str) -> bool {
    expr.split("||").any(|any| {
        any.split("&&").all(|t| {
            let t = t.trim();
            match t.strip_prefix('!') {
                Some(rest) => !env_token(rest.trim()),
                None => env_token(t),
            }
        })
    })
}

/// The list's lines with `!#if` blocks resolved and `!#include`s expanded (one level, like uBlock).
fn expand(text: &str, base: &str, depth: u8, out: &mut Vec<String>) {
    let mut stack: Vec<bool> = Vec::new(); // is each open block active?
    let active = |s: &Vec<bool>| s.iter().all(|&a| a);
    for line in text.lines() {
        let line = line.trim();
        if let Some(expr) = line.strip_prefix("!#if ") {
            stack.push(eval(expr));
        } else if line == "!#else" {
            if let Some(last) = stack.last_mut() {
                *last = !*last;
            }
        } else if line == "!#endif" {
            stack.pop();
        } else if !active(&stack) {
            continue;
        } else if let Some(file) = line.strip_prefix("!#include ") {
            if depth == 0 {
                if let Ok(sub) = fetch(&format!("{base}{}", file.trim())) {
                    expand(&sub, base, depth + 1, out);
                }
            }
        } else if !line.is_empty() && !line.starts_with('!') && !line.starts_with('[') {
            out.push(line.to_string());
        }
    }
}

// ── Rules for music.youtube.com ──────────────────────────────────────

/// Does a rule's domain list (`a.com,~b.a.com,c.*`) apply to `HOST`? Empty = generic: skipped,
/// only rules written for YouTube are used.
fn applies(domains: &str) -> bool {
    let matches = |d: &str| {
        if let Some(entity) = d.strip_suffix(".*") {
            // "youtube.*": youtube.<any public suffix>
            let labels: Vec<&str> = HOST.split('.').collect();
            let name: Vec<&str> = entity.split('.').collect();
            (0..labels.len()).any(|i| {
                labels.len() >= i + name.len() + 1
                    && labels[i..i + name.len()] == name[..]
                    && labels.len() - (i + name.len()) <= 2
            })
        } else {
            HOST == d || HOST.ends_with(&format!(".{d}"))
        }
    };
    let mut positive = false;
    for d in domains.split(',').map(str::trim).filter(|d| !d.is_empty()) {
        if let Some(neg) = d.strip_prefix('~') {
            if matches(neg) {
                return false;
            }
        } else if matches(d) {
            positive = true;
        }
    }
    positive
}

/// `+js(name, a, b\, c)` → ["name", "a", "b, c"].
fn scriptlet_args(inner: &str) -> Vec<String> {
    let mut parts = Vec::new();
    let mut cur = String::new();
    let mut chars = inner.chars().peekable();
    while let Some(c) = chars.next() {
        match c {
            '\\' if chars.peek() == Some(&',') => {
                cur.push(',');
                chars.next();
            }
            ',' => parts.push(std::mem::take(&mut cur)),
            _ => cur.push(c),
        }
    }
    parts.push(cur);
    let mut parts: Vec<String> = parts.into_iter().map(|p| p.trim().to_string()).collect();
    // Quoted arguments: 'x' / "x" → x
    for p in parts.iter_mut() {
        let q = p.starts_with('\'') && p.ends_with('\'') || p.starts_with('"') && p.ends_with('"');
        if q && p.len() >= 2 {
            *p = p[1..p.len() - 1].to_string();
        }
    }
    parts
}

/// Cosmetic filters the browser can't apply by itself (uBlock's procedural ones) are skipped.
fn plain_selector(sel: &str) -> bool {
    const PROCEDURAL: [&str; 14] = [
        ":has-text(", ":upward(", ":style(", ":remove(", ":matches-", ":xpath(", ":watch-attr(", ":min-text-length(",
        ":others(", ":remove-attr(", ":remove-class(", ":-abp-", ":if(", ":matches-path(",
    ];
    !sel.is_empty() && !sel.starts_with('^') && !sel.starts_with('+') && !PROCEDURAL.iter().any(|p| sel.contains(p))
}

struct Rules {
    scriptlets: Vec<Vec<String>>, // [name, args…]
    hide: Vec<String>,
}

fn select(lines: &[String]) -> Rules {
    let mut scriptlets: Vec<Vec<String>> = Vec::new();
    let mut hide: Vec<String> = Vec::new();
    let mut no_scriptlets = false;
    let mut except_scriptlets: Vec<Vec<String>> = Vec::new();
    let mut except_hide: Vec<String> = Vec::new();

    for line in lines {
        let (marker, exception) = if let Some(i) = line.find("#@#") {
            (i, true)
        } else if let Some(i) = line.find("##") {
            (i, false)
        } else {
            continue; // network rules aren't used here
        };
        let domains = &line[..marker];
        let body = &line[marker + if exception { 3 } else { 2 }..];
        if domains.is_empty() || !applies(domains) {
            continue;
        }
        if let Some(inner) = body.strip_prefix("+js(").and_then(|b| b.strip_suffix(')')) {
            let args = scriptlet_args(inner);
            if exception {
                if args.len() == 1 && args[0].is_empty() {
                    no_scriptlets = true; // "#@#+js()": no scriptlets on this site
                } else {
                    except_scriptlets.push(args);
                }
            } else if !args[0].is_empty() {
                scriptlets.push(args);
            }
        } else if exception {
            except_hide.push(body.to_string());
        } else if plain_selector(body) {
            hide.push(body.to_string());
        }
    }
    if no_scriptlets {
        scriptlets.clear();
    }
    let canon = |s: &str| s.trim_end_matches(".js").to_string();
    scriptlets.retain(|s| {
        !except_scriptlets.iter().any(|e| canon(&e[0]) == canon(&s[0]) && e[1..] == s[1..])
    });
    scriptlets.dedup();
    hide.retain(|h| !except_hide.contains(h));
    hide.sort();
    hide.dedup();
    Rules { scriptlets, hide }
}

// ── Script ───────────────────────────────────────────────────────────

/// uBlock arguments → AdGuard's, where they differ. uBlock passes options as trailing key/value
/// pairs ("propsToMatch", "url:…"); AdGuard takes them as positional arguments.
fn adguard_args(name: &str, args: &[String]) -> Vec<String> {
    let opts = |from: usize| -> BTreeMap<String, String> {
        args[from.min(args.len())..].chunks(2).filter(|c| c.len() == 2).map(|c| (c[0].clone(), c[1].clone())).collect()
    };
    match name {
        // (props to remove, required props, props to match the request)
        "json-prune-fetch-response" | "json-prune-xhr-response" => {
            let o = opts(2);
            vec![
                args.first().cloned().unwrap_or_default(),
                args.get(1).cloned().unwrap_or_default(),
                o.get("propsToMatch").cloned().unwrap_or_default(),
            ]
        }
        // (property, value) — uBlock's extra options don't exist there
        "set-constant" => args.iter().take(2).cloned().collect(),
        _ => args.to_vec(),
    }
}

fn build(lines: &[String], library: &Value) -> Result<(String, usize), String> {
    // AdGuard's library: every scriptlet with its names (uBlock's names among its aliases).
    let mut by_name: BTreeMap<String, (String, String)> = BTreeMap::new(); // alias → (name, code)
    for s in library["scriptlets"].as_array().ok_or("unexpected scriptlet library format")? {
        let (Some(names), Some(code)) = (s["names"].as_array(), s["scriptlet"].as_str()) else { continue };
        let main = names.first().and_then(Value::as_str).unwrap_or_default().to_string();
        for n in names.iter().filter_map(Value::as_str) {
            by_name.insert(n.to_string(), (main.clone(), code.to_string()));
        }
    }
    let find = |ubo: &str| {
        let bare = ubo.trim_end_matches(".js");
        [ubo.to_string(), bare.to_string(), format!("ubo-{bare}"), format!("ubo-{bare}.js"), format!("{bare}.js")]
            .iter()
            .find_map(|k| by_name.get(k).cloned())
    };

    let rules = select(lines);
    let mut code: BTreeMap<String, String> = BTreeMap::new();
    let mut calls: Vec<(String, Vec<String>)> = Vec::new();
    for s in &rules.scriptlets {
        // Scriptlets AdGuard doesn't have (only used on www.youtube.com so far) are skipped.
        if let Some((name, src)) = find(&s[0]) {
            calls.push((name.clone(), adguard_args(&name, &s[1..])));
            code.insert(name, src);
        }
    }
    let lib: String = code.iter().map(|(n, c)| format!("{}:{c}", serde_json::to_string(n).unwrap())).collect::<Vec<_>>().join(",\n");
    let calls_json = serde_json::to_string(&calls).map_err(|e| e.to_string())?;
    let hide_json = serde_json::to_string(&rules.hide).map_err(|e| e.to_string())?;
    let count = calls.len() + rules.hide.len();
    let script = format!(
        r#"// Takaro ad blocker: uBlock Origin's rules for YouTube Music, run with AdGuard's scriptlets.
(function () {{
  if (location.hostname !== {host:?}) return;
  var lib = {{
{lib}
  }};
  var calls = {calls_json};
  for (var i = 0; i < calls.length; i++) {{
    var name = calls[i][0], args = calls[i][1];
    try {{ lib[name]({{ name: name, args: args, engine: "corelibs", version: "", verbose: false, uniqueId: "takaro" }}, args); }}
    catch (e) {{ console.warn("[Takaro adblock]", name, e); }}
  }}
  var hide = {hide_json};
  if (hide.length) {{
    var css = hide.map(function (s) {{ return s + "{{display:none!important}}"; }}).join("\n");
    (function add() {{
      var root = document.documentElement;
      if (!root) return setTimeout(add, 0);
      var st = document.createElement("style");
      st.id = "takaro-adblock";
      st.textContent = css;
      root.appendChild(st);
    }})();
  }}
}})();
"#,
        host = HOST
    );
    Ok((script, count))
}

/// Downloads everything and rebuilds the cache. Runs on a background thread.
fn update(app: &AppHandle) -> Result<Cache, String> {
    let mut lines = Vec::new();
    for list in LISTS {
        let text = fetch(&format!("{LISTS_BASE}{list}"))?;
        expand(&text, LISTS_BASE, 0, &mut lines);
    }
    let library: Value = serde_json::from_str(&fetch(SCRIPTLETS_URL)?).map_err(|e| e.to_string())?;
    let (script, rules) = build(&lines, &library)?;
    let cache = Cache { updated: now_ms(), rules, script };
    let d = dir(app).ok_or("no data folder")?;
    fs::create_dir_all(&d).map_err(|e| e.to_string())?;
    fs::write(d.join("cache.json"), serde_json::to_vec(&cache).map_err(|e| e.to_string())?).map_err(|e| e.to_string())?;
    Ok(cache)
}

// ── Public ───────────────────────────────────────────────────────────

/// The cached script, run only when the plugin is on (read from Takaro's settings in the page's
/// storage at that very moment, so turning it on/off only needs a page reload).
fn guarded(script: &str) -> String {
    format!(
        // On unless turned off (it's on by default, so "never touched" = on).
        "if ((function () {{ try {{ var s = JSON.parse(localStorage.getItem(\"takaro:settings\") || \"{{}}\"); \
         return !(s.adblock && s.adblock.enabled === false); }} catch (e) {{ return true; }} }})() && !window.__TAKARO_ADBLOCK__) \
         {{\nwindow.__TAKARO_ADBLOCK__ = true;\n{script}}}\n"
    )
}

/// What goes in front of the page's initialization script: the blocker, if its lists have been
/// downloaded (it checks the plugin's setting itself). Refreshes day-old lists in the background.
pub fn init_script(app: &AppHandle) -> String {
    let cache = load(app);
    if enabled(app) && stale(&cache) {
        let app = app.clone();
        std::thread::spawn(move || {
            if let Err(e) = update(&app) {
                eprintln!("[adblock] update failed: {e}");
            }
        });
    }
    cache.map(|c| guarded(&c.script)).unwrap_or_default()
}

/// Called by the plugin on every page load: on = lists downloaded (if missing or a day old) and,
/// if this page started without the blocker (first time, lists just downloaded), it's injected
/// now; off = no more downloads.
#[tauri::command]
pub async fn set_adblock(app: AppHandle, enabled: bool) -> Result<Status, String> {
    let d = dir(&app).ok_or("no data folder")?;
    fs::create_dir_all(&d).map_err(|e| e.to_string())?;
    let flag = d.join("enabled");
    if !enabled {
        let _ = fs::remove_file(&flag);
        let c = load(&app).unwrap_or_default();
        return Ok(Status { enabled, updated: c.updated, rules: c.rules });
    }
    fs::write(&flag, b"1").map_err(|e| e.to_string())?;
    let mut cache = load(&app);
    if stale(&cache) {
        let a = app.clone();
        match tauri::async_runtime::spawn_blocking(move || update(&a)).await.map_err(|e| e.to_string())? {
            Ok(c) => cache = Some(c),
            Err(e) if cache.is_none() => return Err(e),
            Err(e) => eprintln!("[adblock] update failed, keeping the old lists: {e}"),
        }
    }
    let c = cache.unwrap_or_default();
    if !c.script.is_empty() {
        if let Some(page) = crate::window::ytm(&app) {
            let _ = page.eval(guarded(&c.script)); // no-op if the page already has it
        }
    }
    Ok(Status { enabled, updated: c.updated, rules: c.rules })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    #[ignore] // network
    fn http_download() {
        let text = fetch_http("https://ublockorigin.github.io/uAssets/filters/quick-fixes.txt").unwrap();
        assert!(text.contains("youtube"));
        assert!(fetch_http("https://api.github.com/repos/2nxty/Takaro/releases/latest").unwrap().contains("tag_name"));
    }

    #[test]
    fn domains() {
        assert!(applies("m.youtube.com,music.youtube.com"));
        assert!(applies("youtube.com"));
        assert!(applies("youtube.*"));
        assert!(!applies("www.youtube.com"));
        assert!(!applies("youtube.com,~music.youtube.com"));
        assert!(!applies("youtubekids.com"));
    }

    #[test]
    fn preprocessor() {
        let mut out = Vec::new();
        let list = "a##x\n!#if env_firefox\nb##y\n!#else\nc##z\n!#endif\n!#if !env_mobile && ext_ublock\nd##w\n!#endif";
        expand(list, "", 1, &mut out);
        assert_eq!(out, vec!["a##x", "c##z", "d##w"]);
    }

    #[test]
    fn rules() {
        let lines: Vec<String> = [
            "music.youtube.com##+js(set, ytInitialPlayerResponse.playerAds, undefined)",
            "youtube.com##+js(json-prune, a b, , x)",
            "www.youtube.com##+js(set, other, undefined)",
            "music.youtube.com##.ad-banner",
            "music.youtube.com##.x:has-text(Ad)",
            "youtube.com##.gone",
            "youtube.com#@#.gone",
            "music.youtube.com#@#+js(json-prune, a b, , x)",
        ]
        .iter()
        .map(|s| s.to_string())
        .collect();
        let r = select(&lines);
        assert_eq!(r.scriptlets, vec![vec!["set".to_string(), "ytInitialPlayerResponse.playerAds".into(), "undefined".into()]]);
        assert_eq!(r.hide, vec![".ad-banner".to_string()]);
        assert_eq!(scriptlet_args("trusted-x, 'a\\, b', c"), vec!["trusted-x", "a, b", "c"]);
    }
}

#[cfg(test)]
mod live_check {
    use super::*;
    #[test]
    #[ignore]
    fn real_lists() {
        let mut lines = Vec::new();
        for list in LISTS {
            expand(&fetch(&format!("{LISTS_BASE}{list}")).unwrap(), LISTS_BASE, 0, &mut lines);
        }
        let r = select(&lines);
        println!("lines={} scriptlets={:?} hide={:?}", lines.len(), r.scriptlets, r.hide);
        let library: Value = serde_json::from_str(&fetch(SCRIPTLETS_URL).unwrap()).unwrap();
        let (script, n) = build(&lines, &library).unwrap();
        std::fs::write(std::env::temp_dir().join("takaro-adblock.js"), &script).unwrap();
        println!("rules={n} script={} bytes", script.len());
    }
}
