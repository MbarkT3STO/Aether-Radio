<div align="center">

<img src="Icons/macos/AppIcon256.png" alt="Aether Radio" width="128" height="128" />

# Aether Radio

### Tune into the world. Beautifully.

A free, open-source, world-radio streaming experience delivered as a single codebase across **Android**, **macOS**, **Windows**, **Linux** and the **Web** — plus a pixel-perfect marketing site to match.

<p>
  <a href="https://github.com/MbarkT3STO/Aether-Radio/releases"><img alt="GitHub release" src="https://img.shields.io/github/v/release/MbarkT3STO/Aether-Radio?style=for-the-badge&color=0A84FF&labelColor=0b0b10" /></a>
  <img alt="License" src="https://img.shields.io/badge/license-MIT-30D158?style=for-the-badge&labelColor=0b0b10" />
  <img alt="Platforms" src="https://img.shields.io/badge/platforms-Android%20%C2%B7%20macOS%20%C2%B7%20Windows%20%C2%B7%20Linux%20%C2%B7%20Web-5E5CE6?style=for-the-badge&labelColor=0b0b10" />
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5.4-3178C6?style=for-the-badge&logo=typescript&logoColor=white&labelColor=0b0b10" />
</p>

<p>
  <a href="#-projects">Projects</a> ·
  <a href="#-features">Features</a> ·
  <a href="#-architecture">Architecture</a> ·
  <a href="#-quick-start">Quick start</a> ·
  <a href="#-download">Download</a> ·
  <a href="#-contributing">Contributing</a>
</p>

</div>

---

## ✨ What is Aether Radio

Aether Radio is a modern, privacy-first internet-radio client that streams **50,000+ stations from 240+ countries** via the [Radio Browser](https://www.radio-browser.info/) community index. One design system, one feature set, five surfaces — and zero compromise on each.

Built on Clean Architecture in pure TypeScript. No frameworks. No analytics. No account. No ads. Every platform ships with song recognition, favorites, history, custom stations, a sleep timer, a real-time audio visualizer and twelve Apple-inspired accent themes.

## 📦 Projects

The repository is a monorepo of five independent projects that share the same domain, use cases and design tokens.

| Project | Folder | Stack | Purpose |
|---|---|---|---|
| 🖥️ **Desktop App** | [`DesktopApp/`](./DesktopApp) | Electron · electron-vite · TypeScript | Native macOS, Windows and Linux app with tray, global media keys, `node-shazam`-powered recognition and window-state restore. |
| 🤖 **Android App** | [`AndroidApp/`](./AndroidApp) | Capacitor 6 · Android SDK 34 · Kotlin plugin · TypeScript | Native Android app with a custom foreground service, MediaSession notification, background audio and WASM song recognition. |
| 🌐 **Web App** | [`WebApp/`](./WebApp) | Vite · TypeScript · Netlify Edge Functions | Browser-native build deployed as a static Vite bundle plus two Edge Functions for CORS-heavy paths. |
| 💎 **Landing Site** | [`Landing/`](./Landing) | Pure HTML · CSS · vanilla JS | Zero-dependency marketing site mirroring the app's design system 1:1. |
| 🎨 **Icons** | [`Icons/`](./Icons) | PNG · SVG · ICNS | Platform-ready app icons for Android, iOS, macOS and the Web. |

Each folder has a standalone `README.md` with deep architectural notes, build instructions and deployment recipes.

## 🌟 Features

Every platform ships the following feature set, bit-for-bit identical.

<table>
<tr>
<td width="50%" valign="top">

### 📻 Stream 50,000+ stations
The full Radio Browser catalogue with a latency-raced multi-mirror client and a transparent failover layer.

### ⭐ Favorites & History
One-tap favorites with JSON export/import. A rolling history of what you played, when.

### 🎙️ Song recognition
Shazam-powered "what's playing?" on every platform. PCM is captured from the live stream, hashed locally and matched against the Shazam catalogue.

### ⏲️ Sleep timer
Pick a duration or fade-out curve and the player gracefully stops the stream when the timer hits zero.

</td>
<td width="50%" valign="top">

### ➕ Custom stations
Add your own Icecast, Shoutcast or HLS URL. Stored locally, merged seamlessly with the Radio Browser catalogue.

### 📊 Real-time visualizer
A Web Audio `AnalyserNode` visualizer synced to playback. Pauses itself in background to spare battery and CPU.

### 🎨 12 accent themes · Light / Dark
The full Apple Human Interface palette — Blue, Indigo, Royal Purple, Purple, Pink, Red, Orange, Green, Mint, Teal, Cyan, Graphite — plus OS-aware theme detection.

### 🎛️ Media controls everywhere
Lock screen, notification shade, tray, global media keys, MediaSession, Bluetooth headset buttons. You pick the surface, Aether picks up.

</td>
</tr>
</table>

## 🧱 Architecture

All three app projects follow the same **Clean Architecture** layering. Only the infrastructure adapters change between platforms.

```
┌──────────────────────────────────────────────────────────────────┐
│  Presentation                                                    │
│  • Sidebar / BottomNav · PlayerBar / MiniPlayer · Views · Router │
└────────────────────────┬─────────────────────────────────────────┘
                         │ EventBus + Stores (Singletons)
┌────────────────────────▼─────────────────────────────────────────┐
│  Application                                                     │
│  • Use cases (Search, GetTop, AddFavorite, RecognizeSong, …)     │
│  • DTOs · Result<T> type                                         │
└────────────────────────┬─────────────────────────────────────────┘
                         │ Repository interfaces
┌────────────────────────▼─────────────────────────────────────────┐
│  Domain                                                          │
│  • Entities · Value objects · Repository contracts               │
│  • Pure TypeScript — zero runtime dependencies                   │
└────────────────────────┬─────────────────────────────────────────┘
                         │
┌────────────────────────▼─────────────────────────────────────────┐
│  Infrastructure (platform-specific adapters)                     │
│  ┌──────────────┬──────────────┬──────────────┐                  │
│  │ Electron     │ Capacitor    │ Web          │                  │
│  │ electron-    │ Preferences  │ localStorage │                  │
│  │ store + IPC  │ plugin       │              │                  │
│  └──────────────┴──────────────┴──────────────┘                  │
│  RadioBrowserApiClient · MultiSourceStationRepository            │
└──────────────────────────────────────────────────────────────────┘
```

### Key design decisions

- **Domain-first.** `src/domain` has zero dependencies on anything else. Entities (`RadioStation`, `Favorite`, `PlayHistory`, `AppSettings`, `CustomStation`), value objects (`Country`, `Genre`, `BitrateRange`) and repository interfaces live there.
- **Use cases for every action.** `SearchStationsUseCase`, `AddFavoriteUseCase`, `RecognizeSongUseCase`, … Thin, testable, swappable.
- **Result\<T\> over thrown exceptions.** Errors travel through typed `Result<T>` envelopes end-to-end — the presentation layer handles both branches deterministically.
- **Latency-raced Radio Browser mirrors.** The German, Dutch and Austrian mirrors are raced on first API call; the fastest wins, with automatic failover per request.
- **Single design system, three shells.** Tokens, typography, animations, component styles and twelve accents are copy-pasted across all three apps — one source of truth, one pull request to restyle everything.

## 🚀 Quick start

> **Prerequisites**: Node.js 20+, npm, and the platform-specific SDKs described in each project's README.

```bash
# Clone
git clone https://github.com/MbarkT3STO/Aether-Radio.git
cd Aether-Radio

# Desktop (Electron)
cd DesktopApp && npm install && npm run dev

# Web (Vite)
cd ../WebApp && npm install && npm run dev

# Android (Capacitor)
cd ../AndroidApp && npm install && npm run build && npm run cap:sync && npm run cap:open

# Landing (static — no build)
cd ../Landing && python3 -m http.server 8080
```

## 📥 Download

Prebuilt binaries and installers are published on the [GitHub Releases](https://github.com/MbarkT3STO/Aether-Radio/releases) page.

| Platform | Format | Architectures |
|---|---|---|
| **Android** | `.apk` (direct install) | universal |
| **macOS** | `.dmg` · `.zip` | Intel (x64) · Apple Silicon (arm64) |
| **Windows** | NSIS installer · portable `.exe` | x64 |
| **Linux** | `.AppImage` · `.deb` | x64 |
| **Web** | PWA-capable static build | any modern browser |

## 🧰 Tech stack at a glance

| Layer | Technology |
|---|---|
| **Language** | TypeScript 5.4 (strict, isolated modules) |
| **Bundler** | Vite 5 (Web · Android · Electron renderer) · electron-vite (Electron main + preload) |
| **Desktop runtime** | Electron 31 · electron-builder 25 · electron-store 8 |
| **Mobile runtime** | Capacitor 6 · AndroidX Media · Gradle 8 · Kotlin plugins |
| **Web runtime** | HTMLAudioElement · Web Audio API · MediaSession · Wake Lock · Netlify Edge Functions (Deno) |
| **Radio catalogue** | [Radio Browser Community API](https://de1.api.radio-browser.info) (3 mirrors, latency-raced) |
| **Song recognition** | `node-shazam` (desktop) · `shazamio-core` WASM + Shazam signature proxy (Web + Android) |
| **Styling** | Hand-rolled CSS design tokens · 12 accent palettes · Apple HIG typography · `flag-icons` |
| **Icons** | Inline SVGs · platform icon sets in `/Icons` |

## 🔐 Privacy

- No accounts, no analytics, no telemetry.
- Favorites, history, custom stations and settings live on-device (electron-store / Capacitor Preferences / localStorage).
- The only outbound traffic is to the Radio Browser mirrors (for station metadata) and to upstream stream hosts (for audio).
- Song recognition is opt-in per tap; audio samples never leave the device except as a short, hashed signature sent to Shazam's public API.

## 🗂️ Repository layout

```
Aether-Radio/
├── AndroidApp/          ← Capacitor-based Android app
├── DesktopApp/          ← Electron app (macOS · Windows · Linux)
├── WebApp/              ← Browser app + Netlify Edge Functions
├── Landing/             ← Marketing site (static, no build)
├── Icons/               ← Platform icons (Android · iOS · macOS · Web)
├── .github/
│   ├── workflows/       ← CI for Android debug + signed release
│   └── ANDROID_SETUP.md ← Keystore + secrets instructions
├── .gitignore
└── README.md            ← you are here
```

## 🤝 Contributing

Contributions, bug reports and feature requests are welcome. A good starting point:

1. Fork the repo and create a feature branch.
2. Read the `README.md` of the project you want to touch — each has setup notes.
3. Keep the domain and use-case layers platform-agnostic.
4. Match the existing design tokens rather than introducing new colors.
5. Run `npm run typecheck` in the affected project before opening a PR.

## 📜 License

[MIT](./LICENSE) — do what you want, just keep the copyright notice. Built with ♥ by **MBVRK**.

## 🙏 Acknowledgements

- [Radio Browser](https://www.radio-browser.info/) — the community-run station index that powers the catalogue.
- [Shazam](https://www.shazam.com/) — for the public song-recognition API surface.
- [`shazamio-core`](https://github.com/shazamio/shazamio-core) — WASM signature generation used by the Web and Android builds.
- [`node-shazam`](https://www.npmjs.com/package/node-shazam) — used by the desktop build.
- [`flag-icons`](https://github.com/lipis/flag-icons) — the country flag set.
- Apple — for the HIG-derived palette and materials that inspired the design language.

---

<div align="center">

<sub>Made with care. Listen to the world, beautifully.</sub>

</div>
