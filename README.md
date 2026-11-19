<p align="center">
  <img src="assets/icon.svg" width="96" height="96" alt="Takaro icon">
</p>

<h1 align="center">Takaro</h1>

<p align="center">
  A tiny, fast YouTube Music desktop player for Windows, macOS and Linux.<br>
  No Electron. About 5 MB.
</p>

<p align="center">
  <a href="https://github.com/2nxty/Takaro/releases/latest"><img alt="Latest release" src="https://img.shields.io/github/v/release/2nxty/Takaro?style=flat-square&color=ff3040"></a>
  <a href="https://github.com/2nxty/Takaro/releases"><img alt="Downloads" src="https://img.shields.io/github/downloads/2nxty/Takaro/total?style=flat-square&color=781ec8"></a>
  <a href="LICENSE"><img alt="MIT license" src="https://img.shields.io/badge/license-MIT-262626?style=flat-square"></a>
  <img alt="Windows, macOS, Linux" src="https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-262626?style=flat-square">
</p>

<p align="center">
  <a href="https://takaro.im/#download"><b>Download</b></a> ·
  <a href="README.pt-BR.md">Português (Brasil)</a>
</p>

---

## Table of contents

- [What is Takaro?](#what-is-takaro)
- [Features](#features)
- [Download](#download)
- [Plugins](#plugins)
- [Synced lyrics](#synced-lyrics)
- [Takaro Jam](#takaro-jam)
- [Takaro links (tak://)](#takaro-links-tak)
- [OBS overlay](#obs-overlay)
- [Discord Rich Presence](#discord-rich-presence)
- [Extensions](#extensions)
- [Languages](#languages)
- [Building from source](#building-from-source)
- [Project structure](#project-structure)
- [How it works](#how-it-works)
- [Writing a plugin](#writing-a-plugin)
- [Adding a translation](#adding-a-translation)
- [Configuration](#configuration)
- [Releasing](#releasing)
- [FAQ & troubleshooting](#faq--troubleshooting)
- [Credits](#credits)
- [License](#license)

## What is Takaro?

Takaro is a desktop player for **YouTube Music**: the official web player in a light native window, polished with a cleaner design, a cover-art backdrop, synced lyrics, built-in plugins, a tray icon and more. It can also share what you're listening to on Discord, in OBS or as a `tak://` link, and with [Takaro Jam](#takaro-jam) you can listen together with friends in a shared room.

It is built with [Tauri 2](https://tauri.app) and uses the web engine your system already has — **WebView2** on Windows, **WebKit** on macOS and Linux — so there is no bundled Chromium. The whole app is about 5 MB.

## Features

- **Lightweight** — Tauri + the system web engine, no Electron. About 5 MB: a portable `.exe` or an installer on Windows, a `.dmg` on macOS, an AppImage or `.deb` on Linux.
- **Ad blocker** — optional, using uBlock Origin's own filter lists, on every system.
- **Your real YouTube Music** — sign in with your account: playlists, likes, mixes, uploads, everything works.
- **Refined player** — frameless window with a built-in title bar, the cover art of the current song as a backdrop behind the player (with an optional frosted-glass blur), a gradient progress bar and cleaner menus.
- **Synced lyrics** — time-synced lyrics from Better Lyrics and LRCLIB in the Lyrics tab; click a line to jump to it.
- **Built-in plugins** — SponsorBlock, precise volume, playback speed, quality selector, resume last session and more, configurable from an in-app panel.
- **Page scaling** — zoom the page from 80% to 120% (the title bar keeps its size).
- **Takaro links** — `tak://` links open a song, playlist or channel straight in Takaro.
- **OBS overlay** — a local "now playing" card for an OBS Browser Source.
- **Discord Rich Presence** — optional "Listening to" card with cover art, progress and buttons.
- **Mini player** — a small always-on-top window with the cover, the song and the playback buttons (the button next to history in the title bar).
- **Sleep timer** — in the player's ⋮ menu: pause after 15 min … 2 h, or at the end of the song, with a fade-out.
- **Takaro Jam** — listen together: shared rooms with a common queue, invites by code or `tak://jam/…` link (see [Takaro Jam](#takaro-jam)).
- **Last.fm** — connect your account in Settings → General to scrobble what you listen to.
- **Tray icon** — now playing, play/pause, previous/next, show/hide, settings and quit from the notification area.
- **Auto-update** — checks GitHub for a new release and, after you confirm, replaces the exe and restarts.
- **Light on resources** — event-driven scripts, optional CPU/memory optimizations, and WebView2 trims its memory while the window is minimized or hidden.
- **Browser extensions** — install extensions from the Chrome Web Store or Edge Add-ons right inside the app.
- **Multilingual** — English, Português (Brasil) and Español, following the YouTube Music language automatically.
- **Private** — no servers, no telemetry. Your login lives in a local WebView2 profile.

## Download

Get it from the [website](https://takaro.im/#download) (it picks your system) or the [latest release](https://github.com/2nxty/Takaro/releases/latest):

| System | File | How to run |
|---|---|---|
| **Windows** 10 / 11 (x64) | [`Takaro.exe`](https://github.com/2nxty/Takaro/releases/latest/download/Takaro.exe) | Portable: just run it. Needs the WebView2 Runtime, preinstalled on Windows 11 and up-to-date Windows 10 ([download](https://developer.microsoft.com/microsoft-edge/webview2/) if missing). |
| **Windows** (installer) | [`Takaro-Setup.exe`](https://github.com/2nxty/Takaro/releases/latest/download/Takaro-Setup.exe) | Installs for your user (no admin), with Start menu shortcut and uninstaller; gets WebView2 if it's missing. Same app, and it updates itself too. |
| **macOS** 11+ (Intel and Apple Silicon) | [`Takaro-macOS.dmg`](https://github.com/2nxty/Takaro/releases/latest/download/Takaro-macOS.dmg) | Open the `.dmg` and drag Takaro to Applications. |
| **Linux** (64-bit) | [`Takaro-Linux.AppImage`](https://github.com/2nxty/Takaro/releases/latest/download/Takaro-Linux.AppImage) | `chmod +x Takaro-Linux.AppImage` and run it. Works on most distributions. |
| **Debian / Ubuntu** | [`Takaro-Linux.deb`](https://github.com/2nxty/Takaro/releases/latest/download/Takaro-Linux.deb) | `sudo apt install ./Takaro-Linux.deb` |

The Discord desktop app is only needed for Rich Presence.

> [!WARNING]
> **macOS and Linux versions are new** (since 0.4.0) and may still have bugs — Takaro was built on Windows first, and those systems use a different web engine (WebKit). If something doesn't work, please [open an issue](https://github.com/2nxty/Takaro/issues) and say which system and version you use.

> [!NOTE]
> The apps aren't code-signed yet. **Windows:** SmartScreen may warn the first time — click **More info → Run anyway**. **macOS:** Gatekeeper blocks the first launch — right-click Takaro → **Open**, or run `xattr -cr /Applications/Takaro.app`.

**Updates:** Takaro checks for new versions and, after asking, updates itself and restarts — the Windows `.exe`, the macOS app and the Linux AppImage. With the `.deb` it opens the download page instead (installing a package needs your password). Your login and settings stay.

**Windows only, for now:** browser extensions (they need WebView2). Everything else — plugins, ad blocker, lyrics, `tak://` links, OBS overlay, Discord — works on all three.

## Plugins

Open the **Takaro settings** button (sliders icon) in the YouTube Music top bar, or **Settings** in the tray menu. The panel has three tabs: **Plugins**, **Extensions** and **General** (language, page scaling, OBS overlay, what the window's **X** does — quit or minimize to the tray —, updates and links). Changes are saved right away; when one needs a reload, a **Reload** bar appears at the bottom.

| Plugin | What it does | Options |
|---|---|---|
| **SponsorBlock** | Skips intros, outros and non-music sections of music videos using the [SponsorBlock](https://sponsor.ajay.app) database. | Categories |
| **Ad blocker** | Removes YouTube Music's ads with uBlock Origin's filter lists (downloaded by the app, updated daily). Off by default. | — |
| **Skip disliked songs** | Jumps to the next track when you dislike one. | — |
| **Disable autoplay** | Starts songs paused. | Only for the first song after opening the app (default) |
| **Resume last session** | When the app opens, goes back to the song, playlist or mix you were listening to, at the same point. Playlists, albums, mixes and radios come back with their queue; a queue built by hand with "Add to queue" only brings back the current song. | Resume from where the song stopped, start paused |
| **Precise volume** | Mouse wheel over the player bar, ↑/↓ arrow keys, a small percentage indicator above the volume slider, and volume remembered between sessions. | Step (%), arrow keys |
| **Quality selector** | Button over the player to pick the stream quality. | — |
| **Video or cover** | Choose what the player shows: a Song/Video switch, always the cover art (no video), or nothing (the queue fills the page). | Player shows |
| **Player background** | The current cover art, blurred, as the backdrop over the whole window while the player is open. | — |
| **Player bar** | Customizations for the bar at the bottom. | Glass bar (see-through, frosted bar and menus), center buttons (playback controls in the middle with the times on each side, song info on the left) |
| **Synced lyrics** | Time-synced lyrics in the Lyrics tab (see below). | Open the Lyrics tab when lyrics are found |
| **Auto-close notifications** | Closes YouTube Music's pop-up notifications ("Saved to liked music"…) after a few seconds. | Seconds |
| **Smooth audio** | Songs fade in and out instead of cutting, and quiet songs are brought up to YouTube's reference loudness (with a limiter). Off by default. | Fade (seconds), normalize volume |
| **Performance fixes** | Lowers YouTube Music's CPU use ([CPU Tamer](https://github.com/cyfung1031/userscript-supports)). Turn off if something misbehaves. | — |

Built in (always on): a **playback speed** control from 0.25× to 2× at the top of the player's ⋮ menu (mouse wheel for 0.01 steps, click the value to reset to 1×), with **Copy Takaro link** right below it. Takaro also fixes the player-bar ⋮ menu so that clicking it again closes it.

Visual settings (player background, player bar) and most options apply instantly; the panel only asks for a reload when a change really needs one.

## Synced lyrics

Open the **Lyrics** tab of the player. Takaro looks the song up on [Better Lyrics](https://better-lyrics.boidu.dev) first and [LRCLIB](https://lrclib.net) next; when synced lyrics exist, the current line is highlighted and followed as the song plays, and clicking a line seeks to it. If only plain text is found it is shown as is, and if nothing is found YouTube Music's own lyrics stay. A small badge shows where the lyrics came from.

## Takaro Jam

Listen together with friends: everyone hears the same song at the same moment, each in their own YouTube Music (their own account, their own volume). Nothing is streamed between people; the room only shares which song is playing, where it is and the room's queue.

- **Create a room:** Takaro settings → **Jam** → type your name → **Create room**. You are the host: your player leads. Share the code (e.g. `A7K92P`) or the invite link `tak://jam/A7K92P`.
- **Join:** open the invite link (Takaro opens the Jam tab with the code filled in), or paste the code or link in **Jam → Join a room**.
- **Shared queue:** **⋮ → Add to Jam** on any song (search results, playlists, albums, the player). The room queue plays before YouTube Music's own; it shows who added each song, the host can play, reorder and remove songs, and guests can remove their own. When it's empty, the host's autoplay goes on and everyone follows.
- **What guests can do** (chosen by the host, can be changed during the Jam):
  1. *Only listen*: the host controls everything.
  2. *Add songs to the queue* (default).
  3. *Add songs, play, pause, seek and skip*.

  When guests can't control playback, their play / previous / next buttons are hidden and the progress bar can't be dragged. Volume always stays theirs.
- **Sync:** positions are stamped with the server clock, and guests correct themselves when they drift more than 1.5 s. Someone watching an ad catches up when it ends.
- **Connection drops** are handled: a participant (the host too) comes back as themselves after a reconnect or a page reload. If the host is gone for more than a minute, the guest who joined first becomes the host. A room nobody is in is deleted after an hour.
- While you're in a Jam, a headphones button in the title bar opens the Jam tab.

The room server is a Cloudflare Worker with one Durable Object per room, in [`jam-server/`](jam-server/README.md). Its address isn't stored in the repository: builds get it from `TAKARO_JAM_URL` (see [Configuration](#configuration)), and it can also be set in **Jam → Server**.

## Takaro links (tak://)

Opening a `tak://` link — from a browser, a chat or **Win + R** — opens it in Takaro; if Takaro is already running, the running window goes there. Registering it needs no admin rights:

- **Windows:** registered for your user every time Takaro starts.
- **macOS:** declared by the app itself.
- **Linux:** a `.desktop` file for your user, made the default `tak://` handler, every time Takaro starts. For the AppImage it's also its app-menu entry, with icon.

The **Listen on Takaro** button on the Discord card goes to `takaro.im/open/?v=<id>`, which opens the song in Takaro when you have it and offers YouTube Music otherwise.

| Link | Opens |
|---|---|
| `tak://watch/<videoId>` | A song |
| `tak://watch/<videoId>/<playlistId>` | A song inside a playlist |
| `tak://playlist/<playlistId>` | A playlist or album |
| `tak://channel/<UC…>` or `tak://channel/@handle` | An artist / channel |
| `tak://music.youtube.com/…` | Any YouTube Music URL with `https://` swapped for `tak://` (YouTube and youtu.be links work too) |
| `tak://jam/<CODE>` | A [Takaro Jam](#takaro-jam) invite (opens the Jam tab to join) |

Use **⋮ → Copy Takaro link** on any song (the player, search results, playlists, albums, the queue) to copy its link. Right-clicking a song row opens the same menu.

## OBS overlay

Turn on **Takaro settings → General → OBS overlay** and copy the address it shows (`http://127.0.0.1:13091/overlay` by default; the port and the progress bar colours can be changed there). In OBS add a **Browser Source** with that URL (about 480×140). It shows the cover, title, artist and progress of the current song, with the Takaro logo in the corner, on a transparent background. Other layouts: `?layout=compact` and `?layout=text`. The server only listens on your own computer, and the current song is also available as JSON at `/now-playing`.

## Discord Rich Presence

While a song plays, your profile shows:

| Field | Content |
|---|---|
| Activity | **Listening to Takaro** (the member list shows the song title) |
| Large image | Album / video cover |
| Line 1 | Song title |
| Line 2 | Artist |
| Line 3 | Album (or `⏸ Paused · 01:23 / 03:41` while paused) |
| Progress | Live bar with elapsed / total time (hidden while paused) |
| Button 1 | **Listen on YouTube Music** → opens the current song |
| Button 2 | **Get Takaro** → the project website (`SITE_URL`) |

Notes:

- Discord computes the progress bar from the clock, so it can't be "frozen". While paused, the bar is replaced by the paused time.
- Discord doesn't show the buttons on your own profile — your friends see them.
- During ads the card keeps showing the previous song.
- If Discord isn't running, Takaro retries every 15 seconds and connects as soon as it opens.
- Updates are rate-limited (at most one every 4 s) to stay within Discord's limits.


## Extensions

On Windows, Takaro can load browser extensions through WebView2. (macOS and Linux use WebKit, which can't run Chrome extensions; the built-in **Ad blocker** plugin covers the most common use.)

1. Open **Takaro settings → Extensions** and click **Chrome Web Store** or **Edge Add-ons**. The store opens in a new window.
2. Open an extension's page. An **Install in Takaro** box appears in the bottom-right corner (if it's already installed, it offers **Update** instead). The store's own "Add to Chrome" / "Get" buttons are hidden, since they only work in Chrome/Edge; back/forward buttons sit in the bottom-left corner.
3. After it installs, click **Reload Takaro** in that box.

Installed extensions are listed in the same section, where you can turn each one on/off or remove it.

Under the hood Takaro downloads the `.crx` with Windows' built-in `curl.exe`, unpacks it with the built-in `tar.exe` into `%LOCALAPPDATA%\com.takaro.player\extensions\<id>` and registers the folder with WebView2 (`AddBrowserExtension`), so the extension stays installed across restarts.

Limitations: extensions that modify pages (content blockers, themes, page tweaks) work best. WebView2 has no browser toolbar, so extension popups and toolbar buttons aren't available, and some Chrome extension APIs aren't supported.

## Languages

The app (settings panel, plugin controls and the Discord card texts) is available in:

| Code | Language |
|---|---|
| `en` | English |
| `pt-BR` | Português (Brasil) |
| `es` | Español |

By default the language follows the **YouTube Music interface language**, then the system language, falling back to English. You can force a language in **Takaro settings → General → Language**. The tray menu follows the same language.

The website (`docs/`) has its own translations in `docs/i18n/`.

## Building from source

> [!IMPORTANT]
> **Building it yourself? You need your own Discord Client ID.** The repository doesn't include one. Create an application in the [Discord Developer Portal](https://discord.com/developers/applications) and set its **Application ID** in the `DISCORD_CLIENT_ID` environment variable before building (see [Configuration](#configuration)). Without it the app works normally, just without Rich Presence.

**Prerequisites**

- [Rust](https://rustup.rs) (stable)
- [Node.js](https://nodejs.org) 18+
- Windows 10/11 with WebView2 and the MSVC build tools ([Tauri prerequisites](https://tauri.app/start/prerequisites/))

```bash
git clone https://github.com/2nxty/Takaro.git
cd Takaro
npm install
```

Run in development (opens a window with a console for logs):

```bash
npm run dev
```

Build the portable `.exe` (output: `src-tauri/target/release/takaro.exe`):

```bash
npm run build:portable
```

Build the NSIS installer instead (output in `src-tauri/target/release/bundle/nsis/`):

```bash
npm run build
```

Tip: to keep build output out of the repository folder, point `CARGO_TARGET_DIR` somewhere else before building, e.g. `$env:CARGO_TARGET_DIR = "D:\takaro-build"` in PowerShell.

### Debugging the page

WebView2 accepts Chromium flags through an environment variable. Start the app with remote debugging enabled and open `http://localhost:9222` (or `edge://inspect`) to get DevTools for the YouTube Music page:

```powershell
$env:WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS = "--remote-debugging-port=9222"
npm run dev
```

The injected API is available as `window.Takaro` in the console.

## Project structure

```
Takaro/
├─ docs/                      # Website (GitHub Pages)
│  ├─ index.html, style.css, app.js
│  └─ i18n/                   # Website translations (<code>.js, one per language)
├─ src-tauri/
│  ├─ src/
│  │  ├─ main.rs              # Window, IPC commands, Rich Presence payload
│  │  ├─ discord.rs           # Minimal Discord IPC client (named pipe, no deps)
│  │  ├─ extensions.rs        # Browser extensions: store download, install, list, remove
│  │  ├─ window.rs            # Frameless main window, title bar actions, page zoom
│  │  ├─ links.rs             # tak:// protocol: registration + link → URL
│  │  ├─ overlay.rs           # Local HTTP server for the OBS overlay (overlay.html)
│  │  ├─ updater.rs           # Checks GitHub releases and replaces the exe
│  │  ├─ tray.rs              # Tray icon and menu
│  │  ├─ mini.rs              # Mini player window (ui/mini.html)
│  │  ├─ lastfm.rs            # Last.fm sign-in and scrobbling
│  │  ├─ perf.rs              # WebView2 low-memory mode while minimized/hidden
│  │  ├─ i18n/                # App translations: <code>.json (bundled at build time)
│  │  └─ inject/              # JavaScript injected into music.youtube.com
│  │     ├─ core.js           # Plugin registry, settings, i18n, DOM helpers, player events
│  │     ├─ plugins/*.js      # One file per plugin
│  │     ├─ vendor/           # Third-party scripts (CPU Tamer)
│  │     ├─ ui.js             # Settings panel, modals, ⋮ menu fix
│     ├─ jam.js            # Takaro Jam: room client, sync, shared queue, Jam tab
│  │     ├─ presence.js       # Reads the current track and sends it to Rust
│  │     └─ store.js          # "Install in Takaro" box for the store window
│  ├─ capabilities/           # Which remote pages may call which commands (YTM, stores)
│  ├─ build.rs                # Bundles src/i18n/*.json + Tauri build
│  └─ tauri.conf.json
├─ jam-server/                # Takaro Jam server (Cloudflare Worker + Durable Objects)
├─ assets/                    # Icon (SVG + 1024 px PNG)
└─ .github/workflows/         # Release build
```

## How it works

1. `main.rs` opens a window pointing at `https://music.youtube.com` and registers one **initialization script**: the locales, `core.js`, every plugin, `ui.js` and `presence.js` concatenated at compile time.
2. The script runs before YouTube Music's own code. Plugins register with `Takaro.register(...)`, and `core.js` calls their hooks once the DOM and the YouTube player (`#movie_player`) are ready.
3. `presence.js` reads `navigator.mediaSession.metadata` and the `<video>` element when a media event fires (play, pause, seek, track change; plus a 15 s safety check) and calls the Rust commands `track_update` / `playback_stopped` only when something changed. The same data feeds the tray menu.
4. `discord.rs` talks to Discord through the `\\.\pipe\discord-ipc-N` named pipe: handshake with the Client ID, then `SET_ACTIVITY`. It coalesces updates, respects the rate limit and reconnects on its own.

YouTube Music enforces **Trusted Types**, so injected code never uses `innerHTML`; UI is built with the `Takaro.h()` DOM helper.

## Writing a plugin

1. Create `src-tauri/src/inject/plugins/my-plugin.js`:

   ```js
   (() => {
     const T = window.Takaro;
     if (!T) return;

     T.register({
       id: 'my-plugin',
       defaults: { enabled: true, loud: false },
       options: [{ key: 'loud', type: 'checkbox' }], // checkbox | number | select | multi

       early(cfg) {},          // runs immediately at document-start (before YTM scripts)
       start(cfg) {},          // runs on DOMContentLoaded
       onPlayer(api, cfg) {    // runs when #movie_player is ready
         document.addEventListener('takaro:dataloaded', (e) => {
           console.log('now playing', e.detail?.videoDetails?.title);
         });
       },
     });
   })();
   ```

2. Add it to the `INJECT` list in `src-tauri/src/main.rs`.
3. Add its texts to every file in `src-tauri/src/i18n/`:

   ```json
   "my-plugin": {
     "name": "My plugin",
     "description": "What it does.",
     "options": { "loud": "Make it loud" },
     "choices": { "someSelectKey": { "value": "Label" } }
   }
   ```

Useful helpers on `window.Takaro`: `t(key, vars)`, `h(tag, props, ...children)`, `icon(svgPath)`, `css(text)`, `$(selector)`, `waitFor(selector)`, `debounce(fn, ms)`, `save(id, patch)`, `choose({title, message, choices})`, `api` (the YouTube player). Events: `takaro:videodatachange`, `takaro:dataloaded`.

## Adding a translation

**App** — copy `src-tauri/src/i18n/en.json` to `src-tauri/src/i18n/<code>.json` (for example `fr.json` or `de-AT.json`), translate the values and set `"_name"` to the language's own name. `build.rs` picks up every JSON file in that folder automatically and fails the build if one is invalid. Missing keys fall back to English.

**Website** — copy `docs/i18n/en.js` to `docs/i18n/<code>.js`, change the language code and name on its first line, translate the JSON object, and add one line to `docs/index.html` next to the others:

```js
// docs/i18n/fr.js
TakaroI18n.add("fr", "Français", { "meta": { "title": "…" } });
```

```html
<script src="i18n/fr.js" defer></script>
```

The translations are JSON objects wrapped in a script so the site also works when `index.html` is opened directly from disk (browsers block reading `.json` files over `file://`).

Pull requests with new languages are very welcome.

## Configuration

Constants at the top of `src-tauri/src/main.rs`:

| Constant | Default | Meaning |
|---|---|---|
| `LASTFM_API_KEY`, `LASTFM_API_SECRET` | *(empty)* | Last.fm API account for scrobbling ([create one](https://www.last.fm/api/account/create)). Same as the Discord ID: read at build time (or when running), never stored in the code. Without them the Last.fm card doesn't show. |
| `DISCORD_CLIENT_ID` | *(empty)* | Discord application used for the presence. **Not stored in the code:** it is read from the `DISCORD_CLIENT_ID` environment variable at build time (compiled in) and can also be set when running the app (takes priority). |
| `TAKARO_JAM_URL` | *(empty)* | Takaro Jam server, `wss://…` ([`jam-server/`](jam-server/README.md)). **Not stored in the code:** read from the environment at build time (compiled in) or when running (takes priority); the release workflows take it from the repository secret or variable `TAKARO_JAM_URL`. Users can also change it in Settings → Jam. |
| `SITE_URL` | the project website | Link of the second card button (“Get Takaro”) |
| `STATUS_DISPLAY_TYPE` | `2` | What follows "Listening to" in the member list: `0` app name, `1` artist, `2` song |
| `SMALL_IMAGE_KEY` | `""` | Optional Art Asset key shown as a small badge over the cover |
| `UPDATE_REPO` (`updater.rs`) | `2nxty/Takaro` | GitHub repository checked for new releases. Forks: change it to yours. |

**Setting up your Discord application:** create an application in the [Discord Developer Portal](https://discord.com/developers/applications), name it as you want the card to read ("Listening to *Name*") and upload an app icon. Then use its **Application ID**:

```powershell
# PowerShell — build with your ID compiled in
$env:DISCORD_CLIENT_ID = "123456789012345678"
npm run build:portable
```

For the GitHub release workflow, add it as a repository secret named `DISCORD_CLIENT_ID` (**Settings → Secrets and variables → Actions → New repository secret**). If you fork Takaro, also change `SITE_URL` in `src-tauri/src/main.rs` and `docs/CNAME` to your own site.

Installed extensions live in `%LOCALAPPDATA%\com.takaro.player\extensions`. User settings (plugins, language) are stored in the page's `localStorage` under `takaro:settings`, inside the WebView2 profile at `%LOCALAPPDATA%\com.takaro.player`.

## Releasing

1. Make sure the repository secrets `DISCORD_CLIENT_ID` and `TAKARO_JAM_URL` exist (see [Configuration](#configuration)), then bump the version in `package.json`, `src-tauri/Cargo.toml` and `src-tauri/tauri.conf.json`. If `jam-server/` changed, deploy it too (see [`jam-server/README.md`](jam-server/README.md)).
2. Commit, then tag and push:

   ```bash
   git tag v0.1.0
   git push origin v0.1.0
   ```

3. The **Release** workflow builds every system on its own runner — `Takaro.exe` and `Takaro-Setup.exe` (Windows), `Takaro-macOS.dmg` (universal: Intel + Apple Silicon), `Takaro-Linux.AppImage` and `Takaro-Linux.deb` — and attaches them to a new GitHub Release. The file names never change, so the website's download buttons (`releases/latest/download/<file>`) and the Windows updater always get the newest one.

**Private test builds:** push to the `tests` branch (or a `test/…` branch, or run **Actions → Test build**). The installers for all three systems go to a *draft* release, visible only to people with write access.

**Website:** in the repository settings, enable **Pages → Deploy from a branch → `main` / `docs`**. To use a custom domain, put it in `docs/CNAME` and point a `CNAME` DNS record to `<user>.github.io`.

## FAQ & troubleshooting

**The Discord card doesn't show up.**
Make sure the Discord *desktop* app is running (the browser version has no IPC) and that **User Settings → Activity Privacy → Share my activity** is on. Takaro reconnects within 15 seconds after Discord opens.

**Google says the browser may not be secure when signing in.**
Try again after updating WebView2. Signing in works in the WebView2 runtime shipped with current Windows.

**Where are my data and how do I reset everything?**
Close Takaro and delete its data folder: `%LOCALAPPDATA%\com.takaro.player` on Windows, `~/Library/WebKit/com.takaro.player` and `~/Library/Application Support/com.takaro.player` on macOS, `~/.local/share/com.takaro.player` on Linux. This signs you out and resets all settings.

**Does it block ads?**
Turn on the **Ad blocker** plugin (off by default). It uses uBlock Origin's filter lists, downloaded by the app and updated daily, and works on every system. With YouTube Premium you don't need it.

**Linux: "this video format isn't supported" / nothing plays.**
WebKit plays media through GStreamer. The AppImage brings its own; with the `.deb` (or if it still fails) install the codecs: `sudo apt install gstreamer1.0-plugins-good gstreamer1.0-plugins-bad gstreamer1.0-libav`.

## Credits

- Plugins ported from [pear-desktop](https://github.com/pear-devs/pear-desktop) (MIT) — see [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
- Player design, lyrics, overlay and `tak://` ideas from [ytmdesktop2](https://github.com/Venipa/ytmdesktop2) (CC0).
- [CPU Tamer](https://github.com/cyfung1031/userscript-supports) by CY Fung (MIT).
- Lyrics from [Better Lyrics](https://better-lyrics.boidu.dev) and [LRCLIB](https://lrclib.net).
- [SponsorBlock](https://sponsor.ajay.app) for the segment database.
- Ad blocker rules from [uBlock Origin](https://github.com/uBlockOrigin/uAssets)'s filter lists, run with [AdGuard Scriptlets](https://github.com/AdguardTeam/Scriptlets) (both GPL-3.0, downloaded at runtime, not bundled).
- [Tauri](https://tauri.app) for the app framework.

## License

[MIT](LICENSE) © 2026 2nxty

Takaro is an independent project and is not affiliated with, endorsed by or sponsored by Google LLC, YouTube or Discord Inc. YouTube Music is a trademark of Google LLC; Discord is a trademark of Discord Inc.
