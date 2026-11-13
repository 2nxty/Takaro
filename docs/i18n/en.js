// English — copy this file to add a language, then add a <script> line in index.html.
TakaroI18n.add("en", "English", {
  "meta": {
    "title": "Takaro — YouTube Music for desktop, with Discord Rich Presence",
    "description": "A tiny YouTube Music desktop player for Windows that shows what you're listening to on Discord. No Electron, about 4 MB."
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
    "eyebrow": "YouTube Music · Discord · Windows",
    "title": "Your music on desktop. Your status on Discord.",
    "subtitle": "Takaro wraps the real YouTube Music in a tiny native window and shows what you're playing on your Discord profile, with cover art, a live progress bar and a button for friends to listen too.",
    "download": "Download for Windows",
    "github": "View on GitHub",
    "meta1": "~4 MB portable .exe",
    "meta2": "No Electron",
    "meta3": "Free & open source"
  },
  "demo": {
    "label": "Discord Rich Presence",
    "caption": "This is how your friends see you while Takaro plays.",
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
      "title": "Rich Presence done right",
      "text": "Cover art, artist, album, a live progress bar and buttons for your friends. When you pause, your status stays and shows that you paused, instead of disappearing."
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
      "text": "SponsorBlock, precise volume, playback speed and more. Turn each one on or off in the Takaro panel."
    },
    "open": {
      "title": "Open source",
      "text": "MIT licensed. Read the code, open an issue, add a plugin or a translation."
    },
    "more": "Learn more",
    "code": "See the code"
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
    "volume": "Mouse wheel and arrow keys, 1% steps, a small indicator above the slider, and your volume remembered.",
    "speedName": "Playback speed",
    "speed": "From 0.07× to 16×, right in the player's ⋮ menu.",
    "qualityName": "Quality selector",
    "quality": "Pick the stream quality from a button on the player.",
    "videoName": "Video or cover",
    "video": "Show the music video, only the cover art, or hide the player entirely.",
    "note": "Plugins are ported from pear-desktop (MIT)."
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
    "q2": "Do I need Discord open?",
    "a2": "Only for the Rich Presence. Takaro works as a normal music player without it, and connects automatically when Discord opens.",
    "q3": "Where is my data stored?",
    "a3": "Your YouTube login and settings stay on your computer, in the WebView2 profile under %LOCALAPPDATA%\\com.takaro.player. Takaro has no server and collects nothing.",
    "q4": "Does it work on macOS or Linux?",
    "a4": "Not yet. Takaro is Windows-only for now. Contributions are welcome.",
    "q5": "How do I add a translation?",
    "a5": "Copy one of the translation files, translate the values and open a pull request. The README explains where the files are, for both the app and this site."
  },
  "footer": {
    "tagline": "YouTube Music for desktop, with Discord Rich Presence.",
    "releases": "Releases",
    "issues": "Report an issue",
    "disclaimer": "MIT License. YouTube Music is a trademark of Google LLC and Discord is a trademark of Discord Inc. Takaro is not affiliated with either."
  }
});
