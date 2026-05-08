<div align="center">

<img src="../Icons/web/icon-192.png" alt="Aether Radio" width="112" height="112" />

# Aether Radio — Web

### World radio in the browser. No install, full feature parity.

<p>
  <img alt="Vite" src="https://img.shields.io/badge/Vite-5-B73BFE?style=for-the-badge&logo=vite&logoColor=FFD62E&labelColor=0b0b10" />
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5.4-3178C6?style=for-the-badge&logo=typescript&logoColor=white&labelColor=0b0b10" />
  <img alt="Netlify" src="https://img.shields.io/badge/Netlify-Edge-00C7B7?style=for-the-badge&logo=netlify&logoColor=white&labelColor=0b0b10" />
  <img alt="License" src="https://img.shields.io/badge/license-MIT-30D158?style=for-the-badge&labelColor=0b0b10" />
</p>

</div>

---

A static Vite-bundled build of Aether Radio that runs anywhere a modern browser does, plus two tiny Netlify Edge Functions that paper over the two CORS cliffs browsers can't cross: audio stream proxying and Shazam signature forwarding.

Same design system, same Clean Architecture, same feature set as Desktop and Android — just delivered as a `dist/` folder.

## ✨ Highlights

- 🌐 **Zero install.** Open a URL, listen. PWA-capable, offline shell-cacheable.
- 🏎️ **Latency-raced mirrors.** On first API call we race the 3 Radio Browser mirrors and pin every subsequent request to the fastest. Cached per session.
- 🎞️ **Route-level code splitting.** Only Home, Sidebar and PlayerBar ship in the initial bundle — every other view is a lazy `import()`.
- 🗜️ **Lean first paint.** 540 KB `flag-icons` CSS is loaded via `requestIdleCallback` *after* shell paint.
- 🔒 **Edge-proxied audio streams.** `/api/stream` runs as a Netlify Edge Function streaming bytes through our origin with permissive CORS — works with any Icecast/Shoutcast source.
- 🎙️ **WASM song recognition.** `shazamio-core/web` builds the signature client-side; `/api/shazam` forwards it to Shazam's internal API (which rejects direct browser CORS).
- 💤 **Wake Lock while playing.** `navigator.wakeLock.request('screen')` keeps the tab alive during playback.
- 🔊 **MediaSession integration.** OS now-playing widgets, notification center controls, hardware media keys when the tab is active.
- 💾 **localStorage-only state.** Favorites, history, custom stations and settings — no backend, no cookies.

## 🚀 Quick start

```bash
# Install
npm install

# Start Vite dev server → http://localhost:5173
npm run dev
```

The Vite dev server ships with a bundled `devApiProxy` plugin that implements `/api/stream` and `/api/shazam` natively — so `npm run dev` alone is enough. No need to run `netlify dev` in a second terminal.

### Optional — `netlify dev`

If you want to exercise the real Edge Functions locally (for debugging the proxy logic):

```bash
npx netlify dev    # serves the edge functions on :8888
```

The Vite dev server auto-forwards `/api/*` to `localhost:8888` when `netlify dev` is running.

## 📦 Production build

```bash
npm run build      # tsc --noEmit + Vite build → dist/
npm run preview    # serve the build locally
```

Output is pure static HTML/CSS/JS plus WASM — deployable to any static host. For full feature parity (including audio on strict-CORS sources), you'll want Netlify (or any platform that can run the two Edge Functions).

## 🌍 Deploy to Netlify

1. Push this repo (or just the `WebApp/` folder) to a git remote Netlify can read.
2. In Netlify, **Add new site → Import from Git** and pick the repo.
3. Set the base directory to `WebApp`.
4. Build command and publish dir are already in [`netlify.toml`](./netlify.toml): `npm run build` → `dist`.
5. Netlify auto-detects the two Edge Functions in `netlify/edge-functions/`.

Asset caching is pre-configured: hashed assets under `/assets/`, `.woff2`, `.wasm`, `.svg` → `max-age=31536000, immutable`; `index.html` → `no-cache`.

## 🧱 Architecture

```
WebApp/
├── index.html                    Shell · preconnects · bundled CSS
├── src/
│   ├── index.ts                  App bootstrap · mirror race · lazy routes
│   │
│   ├── domain/                 ← Pure entities · value objects · repo interfaces
│   ├── application/            ← Use cases · DTOs · Result<T>
│   ├── infrastructure/
│   │   ├── api/
│   │   │   ├── RadioBrowserApiClient.ts
│   │   │   ├── RadioBrowserEndpoints.ts
│   │   │   ├── RadioBrowserMapper.ts
│   │   │   └── mirrorRace.ts            Latency-rank the 3 mirrors
│   │   ├── di/Container.ts              Wires localStorage repos + use cases
│   │   └── repositories/
│   │       ├── MultiSourceStationRepository.ts
│   │       ├── WebFavoritesRepository.ts
│   │       ├── WebHistoryRepository.ts
│   │       ├── WebSettingsRepository.ts
│   │       └── WebCustomStationsRepository.ts
│   │
│   ├── services/
│   │   ├── AudioService.ts              HTMLAudioElement + MediaSession + Wake Lock
│   │   ├── VisualizerService.ts         Web Audio AnalyserNode visualizer
│   │   ├── SongRecognitionService.ts    PCM → WASM signature → /api/shazam
│   │   └── BridgeService.ts             Same public API as Desktop/Android bridges
│   │
│   ├── router/Router.ts                 Hash-based router
│   ├── store/                           EventBus · PlayerStore · FavoritesStore
│   ├── views/                           Home · Featured · Explore · Search · Favorites · History · Custom · Settings
│   ├── components/                      Sidebar · PlayerBar · StationCard · TopBar · Modals · Toast
│   ├── utils/
│   │   └── streamProxy.ts               Rewrite stream URLs to /api/stream?url=…
│   └── styles/                          tokens · accents · layout · components + web-perf tweaks
│
├── netlify/
│   └── edge-functions/
│       ├── stream-proxy.ts              /api/stream  — live audio relay with CORS
│       └── shazam-proxy.ts              /api/shazam  — Shazam signature forwarder
│
├── public/                              favicon · robots · OG image
├── vite.config.ts                       dev proxy plugin + prod config
├── vite-dev-proxy.ts                    Implements /api/* in the dev server
├── netlify.toml                         Build · redirects · edge functions · cache headers
└── README.md                            you are here
```

### Domain → Application → Infrastructure

Same Clean Architecture layering as Desktop and Android. Only the infrastructure adapters swap:

| Layer | Desktop | Android | **Web** |
|---|---|---|---|
| Persistence | `electron-store` | Capacitor Preferences | **`localStorage`** |
| Stream CORS | `session.webRequest` header injection | `allowMixedContent` + WebView | **`/api/stream` Edge Function** |
| Recognition | `node-shazam` in main | WASM + `NativeHttp` plugin | **WASM + `/api/shazam` Edge Function** |
| Now-playing | `MediaSession` + tray | Foreground service + MediaSession | **`MediaSession` (when tab active)** |
| Media keys | `globalShortcut` | Lock screen / headset | **MediaSession handlers while tab active** |
| Favorites import/export | Native dialogs | Share sheet | **`<a download>` / `<input type="file">`** |
| Prevent sleep | `powerSaveBlocker` | Foreground service | **`navigator.wakeLock.request('screen')`** |
| Open external URL | `shell.openExternal` | `@capacitor/browser` | **`window.open(_, '_blank')`** |

## 🛰️ Edge Functions

Two stateless Deno edge functions live in `netlify/edge-functions/`. Both are cheap and require no secrets.

### `stream-proxy.ts` — `/api/stream`

Relays a live radio stream through the Netlify edge so browsers can consume it in a CORS-clean way (needed for `<audio crossOrigin>` + `AudioContext.createMediaElementSource` on the visualizer + recognition pipeline).

- Forwards `Range` headers so seekable streams / HLS continue to work.
- Strips Icy metadata (`Icy-MetaData: 0`).
- Exposes `Content-Length` / `Content-Range` / `Accept-Ranges` via `access-control-expose-headers`.
- Never buffers — streams straight from upstream response to client.

### `shazam-proxy.ts` — `/api/shazam`

Forwards a single signed Shazam signature POST to `amp.shazam.com`. Browsers can't call that endpoint directly due to a restrictive CORS policy; the edge function does it server-side with Shazam's expected `User-Agent`, `X-Shazam-Platform` and `X-Shazam-AppVersion` headers.

- Handles preflight (`OPTIONS`) itself.
- Generates random UUIDs for the tag + session path segments.
- Returns the raw Shazam JSON response unchanged for the client to parse.

## 🏎️ Performance playbook

- **Preconnect** to the 3 Radio Browser mirrors in `index.html` so TLS/TCP is warm before the first API call.
- **Route-level lazy loading** — each view is a separate chunk via `import()`; initial JS is just the shell.
- **`flag-icons` deferred** — loaded async via `requestIdleCallback` / `setTimeout(0)` *after* first paint so the heavy CSS doesn't block rendering.
- **`shazamio-core` excluded** from `optimizeDeps` so WASM isn't pre-bundled at dev-startup.
- **`will-change` cleanup** — once the shell is composited, the `perf-ready` class removes `will-change` hints so Safari/iOS don't keep the promotion layers alive forever.
- **Mirror latency race** — fire-and-forget on boot, result cached in `sessionStorage` for 10 minutes to avoid repeating it on every route change.
- **Cache headers** — all hashed assets are `immutable, max-age=1y`; `index.html` is `no-cache`.

## 🎨 Design system

Identical tokens to the Desktop and Android builds:

- `styles/tokens.css` — Apple HIG colors, materials, typography scale, motion.
- `styles/accents.css` — 12 accent palettes switchable via `data-accent` on `<html>`.
- `styles/layout.css` — sidebar + main-content + player-bar grid.
- `styles/web-perf.css` — browser-only optimizations (contain, content-visibility, promotion).
- `styles/landing-shell.css` — prevents FOUC during lazy imports.
- `styles/components/*.css` — one file per UI element.

Light/dark is decided by `data-theme` on `<html>`, hydrated from settings on boot. Theme transitions are instant.

## 🔐 Privacy

- **No accounts, no analytics, no cookies.**
- `localStorage` is the only persistence mechanism.
- The only outbound traffic:
  - Radio Browser mirrors for metadata (your fastest of the 3).
  - Upstream audio hosts (via `/api/stream`).
  - `/api/shazam` → Shazam's public API when you tap "Recognize".

Nothing is ever sent to a server owned by the project.

## 🌐 Browser support

- **Chromium** (Chrome, Edge, Brave, Arc, Opera) — full feature set.
- **Firefox** — full feature set except Wake Lock (graceful fallback, audio still plays fine).
- **Safari** (macOS 14+, iOS 17+) — full feature set; MediaSession works, Wake Lock works on iOS 16.4+.
- **Samsung Internet** — full feature set.

ES2022 is the compile target; nothing newer is required.

## 🧪 Scripts reference

| Script | What it does |
|---|---|
| `npm run dev` | Vite dev server on `:5173` with the built-in dev API proxy. |
| `npm run build` | `tsc --noEmit` + Vite production build → `dist/`. |
| `npm run preview` | Serve the build locally. |
| `npm run typecheck` | TypeScript strict check (no emit). |

## 🤝 Contributing

1. Fork & branch.
2. `npm install` then `npm run dev`.
3. Keep `src/domain/` and `src/application/` platform-agnostic — if it needs `window` or `localStorage`, it belongs in `src/infrastructure/` or `src/services/`.
4. Run `npm run typecheck` and `npm run build` before pushing.

## 📜 License

[MIT](../LICENSE) — © 2026 MBVRK.
