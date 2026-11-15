// English — copy this file to add a language, then add a <script> line in index.html.
TakaroI18n.add("en", "English", {
  "meta": {
    "title": "Takaro — a tiny YouTube Music player for Windows",
    "description": "A fast, lightweight YouTube Music player for Windows. No Electron, about 5 MB."
  },
  "announce": {
    "text": "Takaro is open source under the MIT license.",
    "link": "Star it on GitHub"
  },
  "nav": {
    "skip": "Skip to content",
    "features": "Features",
    "plugins": "Plugins",
    "faq": "FAQ",
    "extensions": "Extensions",
    "language": "Language",
    "cta": "Download"
  },
  "hero": {
    "title": "YouTube Music on your desktop.",
    "subtitle": "A fast, lightweight player for the real YouTube Music. Simple, clean and made for your desktop.",
    "download": "Download for Windows",
    "github": "View on GitHub",
    "meta1": "~5 MB portable .exe",
    "meta2": "No Electron",
    "meta3": "Free & open source"
  },
  "shot": {
    "label": "The player",
    "caption": "The cover art behind everything, a clean player bar and your queue at hand.",
    "alt": "Takaro playing a song: the cover art fills the window, with the queue on the right and the player bar at the bottom"
  },
  "demo": {
    "label": "Discord Rich Presence",
    "caption": "Optional: show what you’re playing on your Discord profile. This is how your friends see it.",
    "listening": "Listening to",
    "paused": "Paused",
    "listenButton": "Listen on YouTube Music",
    "memberStatus": "Listening to",
    "tabPlaying": "Playing",
    "tabPaused": "Paused"
  },
  "features": {
    "title": "Small app, everything you need",
    "subtitle": "The full YouTube Music you already use, without a heavy browser runtime on top.",
    "presence": {
      "title": "Discord Rich Presence",
      "text": "Cover art, a live progress bar and buttons for your friends. When you pause, your status stays and shows it."
    },
    "light": {
      "title": "Actually lightweight",
      "text": "Built with Tauri and the WebView2 already in Windows. No bundled Chromium, no Electron."
    },
    "account": {
      "title": "Your account, your library",
      "text": "It's the official YouTube Music web player: sign in and get your playlists, likes, mixes and lyrics."
    },
    "plugins": {
      "title": "Plugins built in",
      "text": "SponsorBlock, precise volume, playback speed, page scaling and more. Turn each one on or off in the Takaro panel."
    },
    "open": {
      "title": "Open source",
      "text": "MIT licensed. Read the code, open an issue, add a plugin or a translation."
    },
    "more": "Learn more",
    "code": "See the code",
    "player": {
      "title": "A player that feels native",
      "text": "The cover art of the current song fills the window behind the player, with an optional frosted-glass blur, a gradient progress bar, cleaner menus and a frameless window with its own title bar."
    },
    "lyrics": {
      "title": "Synced lyrics",
      "text": "Time-synced lyrics from Better Lyrics and LRCLIB, following the song line by line. Click a line to jump to it."
    },
    "share": {
      "title": "Share it anywhere",
      "text": "tak:// links open a song straight in Takaro, and a local OBS overlay shows what’s playing on stream."
    }
  },
  "plugins": {
    "title": "Plugins",
    "subtitle": "Open the Takaro panel from the top bar of YouTube Music to configure them.",
    "sponsorblock": "Skips intros, outros and non-music parts of music videos using the SponsorBlock database.",
    "dislikedName": "Skip disliked songs",
    "disliked": "Jumps to the next track when you dislike one.",
    "autoplayName": "Disable autoplay",
    "autoplay": "Opens the app without blasting music. Starts the first song paused.",
    "resumeName": "Resume last session",
    "resume": "Reopens the song, playlist or mix you were listening to, right where it stopped.",
    "volumeName": "Precise volume",
    "volume": "Mouse wheel over the player bar and arrow keys, 1% steps, a small indicator above the slider, and your volume remembered.",
    "speedName": "Playback speed",
    "speed": "From 0.25× to 2×, right in the player's ⋮ menu.",
    "qualityName": "Quality selector",
    "quality": "Pick the stream quality from a button on the player.",
    "videoName": "Video or cover",
    "video": "Show the music video, only the cover art, or hide the player entirely.",
    "note": "Plugins are ported from pear-desktop (MIT); player design ideas from ytmdesktop2 (CC0).",
    "backgroundName": "Player background",
    "background": "The current cover art, blurred, as the backdrop behind the player.",
    "lyricsName": "Synced lyrics",
    "lyrics": "Line-by-line lyrics in the Lyrics tab from Better Lyrics and LRCLIB.",
    "toastName": "Auto-close notifications",
    "toast": "Closes YouTube Music’s pop-up notifications after a few seconds.",
    "perfName": "Performance fixes",
    "perf": "Lower CPU use with CPU Tamer."
  },
  "extensions": {
    "title": "Browser extensions",
    "subtitle": "Install extensions from the Chrome Web Store or Edge Add-ons right inside Takaro.",
    "step1Title": "Open a store",
    "step1": "In Takaro settings, open the Extensions tab and pick Chrome Web Store or Edge Add-ons.",
    "step2Title": "Install in Takaro",
    "step2": "On any extension page, use the \"Install in Takaro\" box in the corner.",
    "step3Title": "Reload and manage",
    "step3": "Reload Takaro to use it. Turn extensions on or off, open their options or remove them in the same tab.",
    "note": "Extensions that change pages (blockers, themes, tweaks) work best. Toolbar popups aren't available, and some Chrome APIs aren't supported."
  },
  "download": {
    "title": "Get Takaro",
    "text": "One portable .exe. No installer, no account besides your own YouTube one.",
    "button": "Download for Windows",
    "meta": "Windows 10 or 11 · x64 · requires Microsoft Edge WebView2 (already included in Windows)",
    "smartscreen": "The .exe isn't code-signed yet, so Windows SmartScreen may warn you. Click \"More info\" → \"Run anyway\"."
  },
  "faq": {
    "title": "Questions",
    "q1": "Is Takaro an official YouTube or Discord app?",
    "a1": "No. Takaro is an independent open-source project and is not affiliated with Google, YouTube or Discord.",
    "q2": "Do I need Discord?",
    "a2": "No. Takaro is a music player first; Discord is only needed for the Rich Presence card, which connects automatically when Discord opens.",
    "q3": "Where is my data stored?",
    "a3": "Your YouTube login and settings stay on your computer, in the WebView2 profile under %LOCALAPPDATA%\\com.takaro.player. Takaro has no server and collects nothing.",
    "q4": "Does it work on macOS or Linux?",
    "a4": "Not yet. Takaro is Windows-only for now. Contributions are welcome.",
    "q5": "How do I add a translation?",
    "a5": "Copy one of the translation files, translate the values and open a pull request. The README explains where the files are, for both the app and this site."
  },
  "footer": {
    "tagline": "A tiny YouTube Music player for Windows.",
    "releases": "Releases",
    "issues": "Report an issue",
    "disclaimer": "MIT License. YouTube Music is a trademark of Google LLC and Discord is a trademark of Discord Inc. Takaro is not affiliated with either."
  }
});
