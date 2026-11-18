//! Real time for Discord's timestamps.
//!
//! Discord shows other people the elapsed time from *their* clock: when this computer's clock is
//! off (common in virtual machines), the start timestamp lands in the future or the past for
//! everyone else, and friends see 0:00 or a wrong position — while your own Discord, on the same
//! wrong clock, looks right. So the offset to real time is measured from a Google server's `Date`
//! header (1 s precision, enough here) at startup and then every hour, and applied to the
//! timestamps sent to Discord.

use std::sync::atomic::{AtomicI64, Ordering};
use std::time::{Duration, SystemTime, UNIX_EPOCH};

static OFFSET_MS: AtomicI64 = AtomicI64::new(0);
const URL: &str = "https://www.google.com/generate_204";

fn system_ms() -> i64 {
    SystemTime::now().duration_since(UNIX_EPOCH).map(|d| d.as_millis() as i64).unwrap_or(0)
}

/// Now, in ms since the epoch, corrected to real time when the clock is off.
pub fn now_ms() -> i64 {
    system_ms() + OFFSET_MS.load(Ordering::Relaxed)
}

/// Measures the clock offset now and every hour, in the background.
pub fn start() {
    std::thread::spawn(|| loop {
        if let Some(offset) = measure() {
            // Within ~1.5 s the clock is fine (and the Date header only has 1 s precision).
            OFFSET_MS.store(if offset.abs() > 1500 { offset } else { 0 }, Ordering::Relaxed);
        }
        std::thread::sleep(Duration::from_secs(60 * 60));
    });
}

fn measure() -> Option<i64> {
    let before = system_ms();
    let date = fetch_date()?;
    let after = system_ms();
    // The header's second started somewhere in the request: take its middle (±0.5 s).
    let server = parse_http_date(&date)? * 1000 + 500;
    Some(server - (before + after) / 2)
}

#[cfg(windows)]
fn fetch_date() -> Option<String> {
    use std::os::windows::process::CommandExt;
    let root = std::env::var("SystemRoot").unwrap_or_else(|_| r"C:\Windows".into());
    let out = std::process::Command::new(std::path::Path::new(&root).join("System32").join("curl.exe"))
        .creation_flags(0x0800_0000) // CREATE_NO_WINDOW
        .args(["-sI", "--max-time", "10", URL])
        .output()
        .ok()?;
    let headers = String::from_utf8_lossy(&out.stdout);
    headers.lines().find_map(|l| {
        let (k, v) = l.split_once(':')?;
        k.trim().eq_ignore_ascii_case("date").then(|| v.trim().to_string())
    })
}

#[cfg(not(windows))]
fn fetch_date() -> Option<String> {
    fetch_date_http()
}

#[cfg(any(not(windows), test))]
fn fetch_date_http() -> Option<String> {
    let agent: ureq::Agent = ureq::Agent::config_builder()
        .timeout_global(Some(Duration::from_secs(10)))
        .user_agent("Takaro")
        .http_status_as_error(false)
        .build()
        .into();
    let resp = agent.head(URL).call().ok()?;
    resp.headers().get("date")?.to_str().ok().map(str::to_string)
}

/// "Wed, 18 Nov 2026 15:04:05 GMT" → seconds since the epoch.
fn parse_http_date(s: &str) -> Option<i64> {
    let parts: Vec<&str> = s.split_whitespace().collect();
    let [_, day, month, year, time, ..] = parts.as_slice() else { return None };
    const MONTHS: [&str; 12] = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    let m = MONTHS.iter().position(|x| x.eq_ignore_ascii_case(month))? as i64 + 1;
    let d: i64 = day.parse().ok()?;
    let y: i64 = year.parse().ok()?;
    let mut hms = time.split(':').map(|p| p.parse::<i64>());
    let (h, mi, se) = (hms.next()?.ok()?, hms.next()?.ok()?, hms.next()?.ok()?);
    // Days since 1970-01-01 (Howard Hinnant's days_from_civil).
    let (y2, m2) = if m <= 2 { (y - 1, m + 9) } else { (y, m - 3) };
    let era = y2.div_euclid(400);
    let yoe = y2 - era * 400;
    let doy = (153 * m2 + 2) / 5 + d - 1;
    let doe = yoe * 365 + yoe / 4 - yoe / 100 + doy;
    let days = era * 146_097 + doe - 719_468;
    Some(days * 86_400 + h * 3600 + mi * 60 + se)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn http_date() {
        assert_eq!(parse_http_date("Thu, 01 Jan 1970 00:00:00 GMT"), Some(0));
        assert_eq!(parse_http_date("Wed, 18 Nov 2026 15:04:05 GMT"), Some(1_795_014_245));
        assert_eq!(parse_http_date("Tue, 29 Feb 2028 12:00:00 GMT"), Some(1_835_438_400));
        assert_eq!(parse_http_date("garbage"), None);
    }

    #[test]
    #[ignore] // network
    fn offset_is_measured() {
        // (Plausible, not necessarily small: this machine's clock may be off — that's the point.)
        let o = measure().expect("no Date header");
        println!("clock offset: {o} ms");
        assert!(o.abs() < 86_400_000, "offset {o} ms");
        assert!(fetch_date_http().is_some_and(|d| parse_http_date(&d).is_some())); // macOS / Linux path
    }
}
