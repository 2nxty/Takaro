<p align="center">
  <img src="assets/icon.svg" width="96" height="96" alt="Takaro icon">
</p>

<h1 align="center">Takaro</h1>

<p align="center">
  A tiny YouTube Music desktop player for Windows, with Discord Rich Presence.<br>
  No Electron. About 4 MB.
</p>

<p align="center">
  <a href="https://github.com/2nxty/Takaro/releases/latest"><img alt="Latest release" src="https://img.shields.io/github/v/release/2nxty/Takaro?style=flat-square&color=ff3040"></a>
  <a href="https://github.com/2nxty/Takaro/releases"><img alt="Downloads" src="https://img.shields.io/github/downloads/2nxty/Takaro/total?style=flat-square&color=781ec8"></a>
  <a href="LICENSE"><img alt="MIT license" src="https://img.shields.io/badge/license-MIT-262626?style=flat-square"></a>
  <img alt="Windows 10/11" src="https://img.shields.io/badge/platform-Windows%2010%20%7C%2011-262626?style=flat-square">
</p>

<p align="center">
  <a href="https://github.com/2nxty/Takaro/releases/latest/download/Takaro.exe"><b>Download</b></a> ·
  <a href="README.pt-BR.md">Português (Brasil)</a>
</p>

---

## Table of contents

- [What is Takaro?](#what-is-takaro)
- [Features](#features)
- [Download](#download)
- [Discord Rich Presence](#discord-rich-presence)
- [Plugins](#plugins)
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

Takaro opens the official **YouTube Music** web player in a small native window and publishes what you're listening to as a **Discord Rich Presence** card: cover art, title, artist, album, a live progress bar and buttons so your friends can listen too.

It is built with [Tauri 2](https://tauri.app) and uses the **Microsoft Edge WebView2** runtime that already ships with Windows 10/11, so there is no bundled Chromium. The whole app is a single ~4 MB portable `.exe`.

## Features

- **Discord Rich Presence** — "Listening to" activity with cover art, artist, album, live progress bar and two buttons. When you pause, the card stays and shows *Paused* with the current time instead of disappearing.
- **Lightweight** — Tauri + WebView2, no Electron. Portable `.exe`, no installer.
- **Your real YouTube Music** — sign in with your account: playlists, likes, mixes, lyrics, everything works.
- **Built-in plugins** — SponsorBlock, precise volume, playback speed, quality selector and more, configurable from an in-app panel.
- **Built-in title bar** — a frameless window whose title bar (back/forward, settings and the window buttons) blends with the page background, gradients included.
- **Auto-update** — checks GitHub for a new release and, after you confirm, replaces the exe and restarts.
- **Tray icon** — now playing, play/pause, previous/next, show/hide, settings and quit from the notification area. Click the icon to hide the window and keep listening.
- **Light on resources** — event-driven scripts, and WebView2 trims its memory while the window is minimized or hidden.
- **Browser extensions** — install extensions from the Chrome Web Store or Edge Add-ons right inside the app.
- **Multilingual** — English, Português (Brasil) and Español, following the YouTube Music language automatically. New languages are a single JSON file.
- **Private** — no servers, no telemetry. Your login lives in a local WebView2 profile.

## Download

Grab **`Takaro.exe`** from the [latest release](https://github.com/2nxty/Takaro/releases/latest) and run it. That's it.

**Requirements**

- Windows 10 or 11 (x64)
- Microsoft Edge WebView2 Runtime — preinstalled on Windows 11 and on up-to-date Windows 10. If it's missing, get it from [Microsoft](https://developer.microsoft.com/microsoft-edge/webview2/).
- Discord desktop app (only for Rich Presence)

> [!NOTE]
> The `.exe` isn't code-signed yet, so Windows SmartScreen may show a warning the first time. Click **More info → Run anyway**.

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

## Plugins

Open the **Takaro settings** button (sliders icon) in the YouTube Music top bar, or **Settings** in the tray menu. The panel has three tabs: **Plugins**, **Extensions** and **General** (language, version and links). The **General** tab also sets what the window's **X** does: quit, or minimize to the tray. Changes are saved right away; when one needs a reload, a **Reload** bar appears at the bottom.

| Plugin | What it does | Options |
|---|---|---|
| **SponsorBlock** | Skips intros, outros and non-music sections of music videos using the [SponsorBlock](https://sponsor.ajay.app) database. | Categories |
| **Skip disliked songs** | Jumps to the next track when you dislike one. | — |
| **Disable autoplay** | Starts songs paused. | Only for the first song after opening the app (default) |
| **Resume last session** | When the app opens, goes back to the song, playlist or mix you were listening to, at the same point. Playlists, albums, mixes and radios come back with their queue; a queue built by hand with "Add to queue" only brings back the current song. | Resume from where the song stopped, start paused |
| **Precise volume** | Mouse wheel over the player bar, ↑/↓ arrow keys, a small percentage indicator above the volume slider, and volume remembered between sessions. | Step (%), arrow keys |
| **Playback speed** | Speed control from 0.07× to 16× in the player's ⋮ menu. Mouse wheel for 0.01 steps, click the value to reset to 1×. | — |
| **Quality selector** | Button over the player to pick the stream quality. | — |
| **Video or cover** | Choose what the player shows: a Song/Video switch, always the cover art (no video), or nothing (the queue fills the page). | Player shows |

Takaro also fixes the player-bar ⋮ menu so that clicking it again closes it.

## Extensions

Takaro can load browser extensions through WebView2.

1. Open **Takaro settings → Extensions** and click **Chrome Web Store** or **Edge Add-ons**. The store opens in a new window.
2. Open an extension's page. An **Install in Takaro** box appears in the bottom-right corner (the store's own "Add to Chrome" button only works in Chrome/Edge).
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
│  │  ├─ window.rs            # Frameless main window + title bar actions
│  │  ├─ updater.rs           # Checks GitHub releases and replaces the exe
│  │  ├─ tray.rs              # Tray icon and menu
│  │  ├─ perf.rs              # WebView2 low-memory mode while minimized/hidden
│  │  ├─ i18n/                # App translations: <code>.json (bundled at build time)
│  │  └─ inject/              # JavaScript injected into music.youtube.com
│  │     ├─ core.js           # Plugin registry, settings, i18n, DOM helpers, player events
│  │     ├─ plugins/*.js      # One file per plugin
│  │     ├─ ui.js             # Settings panel, modals, ⋮ menu fix
│  │     ├─ presence.js       # Reads the current track and sends it to Rust
│  │     └─ store.js          # "Install in Takaro" box for the store window
│  ├─ capabilities/           # Which remote pages may call which commands (YTM, stores)
│  ├─ build.rs                # Bundles src/i18n/*.json + Tauri build
│  └─ tauri.conf.json
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
| `DISCORD_CLIENT_ID` | *(empty)* | Discord application used for the presence. **Not stored in the code:** it is read from the `DISCORD_CLIENT_ID` environment variable at build time (compiled in) and can also be set when running the app (takes priority). |
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

1. Make sure the repository secret `DISCORD_CLIENT_ID` exists (see [Configuration](#configuration)), then bump the version in `package.json`, `src-tauri/Cargo.toml` and `src-tauri/tauri.conf.json`.
2. Commit, then tag and push:

   ```bash
   git tag v0.1.0
   git push origin v0.1.0
   ```

3. The **Release** workflow builds `Takaro.exe` on Windows and attaches it to a new GitHub Release. The website's download buttons point to `releases/latest/download/Takaro.exe`, so they update automatically.

**Website:** in the repository settings, enable **Pages → Deploy from a branch → `main` / `docs`**. To use a custom domain, put it in `docs/CNAME` and point a `CNAME` DNS record to `<user>.github.io`.

## FAQ & troubleshooting

**The Discord card doesn't show up.**
Make sure the Discord *desktop* app is running (the browser version has no IPC) and that **User Settings → Activity Privacy → Share my activity** is on. Takaro reconnects within 15 seconds after Discord opens.

**Google says the browser may not be secure when signing in.**
Try again after updating WebView2. Signing in works in the WebView2 runtime shipped with current Windows.

**Where are my data and how do I reset everything?**
Close Takaro and delete `%LOCALAPPDATA%\com.takaro.player`. This signs you out and resets all settings.

**Does it block ads?**
Not by itself; during an ad the Discord card keeps the previous song. You can install a content-blocking extension from the stores (see [Extensions](#extensions)).

**macOS / Linux?**
Not yet — the Discord client uses Windows named pipes. Contributions are welcome.

## Credits

- Plugins ported from [pear-desktop](https://github.com/pear-devs/pear-desktop) (MIT) — see [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
- [SponsorBlock](https://sponsor.ajay.app) for the segment database.
- [Tauri](https://tauri.app) for the app framework.

## License

[MIT](LICENSE) © 2026 2nxty

Takaro is an independent project and is not affiliated with, endorsed by or sponsored by Google LLC, YouTube or Discord Inc. YouTube Music is a trademark of Google LLC; Discord is a trademark of Discord Inc.
