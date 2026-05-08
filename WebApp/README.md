# Aether Radio — Web

World radio in the browser. Same design and feature set as the desktop app,
deployed as a static Vite build with two Netlify Edge Functions for the
CORS-sensitive parts (live stream playback + Shazam recognition).

## Quick start

```bash
npm install
npm run dev          # Vite dev server on http://localhost:5173
```

Song recognition and ad-free stream playback rely on the Netlify Edge
Functions. To exercise them in development, run `netlify dev` in a second
terminal — Vite forwards `/api/stream` and `/api/shazam` to `localhost:8888`.

```bash
npx netlify dev      # serves the edge functions at :8888
```

Without `netlify dev`, the app still works: streams that already send
permissive CORS headers play fine; the visualizer and recognition do not
activate on streams that don't.

## Production build

```bash
npm run build
npm run preview
```

Outputs to `dist/`.

## Deploying to Netlify

1. Push to a git remote Netlify can read.
2. In Netlify, "Add new site" → "Import from Git" → select the repo.
3. Set the base directory to `WebApp`.
4. Build command and publish directory are already configured in
   `netlify.toml` (`npm run build` → `dist`).
5. Netlify picks up the two Edge Functions in `netlify/edge-functions/`
   automatically.

## Architecture

Identical Clean Architecture layering as the desktop and Android apps:

```
src/
  domain/           Entities, value objects, repository interfaces (pure TS)
  application/      Use cases + DTOs (pure TS)
  infrastructure/
    api/            Radio Browser API client
    repositories/   localStorage-backed repos (Web*Repository)
    di/             Container wiring
  services/
    AudioService            HTMLAudioElement + MediaSession + Wake Lock
    VisualizerService       Web Audio AnalyserNode visualizer
    SongRecognitionService  PCM capture → Shazam WASM → /api/shazam
    BridgeService           Same public API as desktop/Android bridges
  store/            EventBus + PlayerStore + FavoritesStore
  router/           Hash-based router
  components/       Sidebar, PlayerBar, Modals, Toast, SleepTimer, …
  views/            Home, Featured, Explore, Search, Favorites,
                    History, CustomStations, Settings
  styles/           Design tokens + components (identical to desktop)
  utils/            Country flags, station logos, card renderer,
                    streamProxy helper
```

## Browser differences vs. desktop

| Feature | Desktop (Electron) | Web |
|---|---|---|
| Persistence | `electron-store` | `localStorage` |
| Stream CORS | `session.webRequest` header injection | `/api/stream` Edge Function |
| Song recognition | `node-shazam` in main process | `shazamio-core/web` WASM + `/api/shazam` |
| Now playing OS widget | MediaSession + tray | MediaSession (when tab active) |
| Global media keys | `globalShortcut` | OS-level MediaSession handlers while tab is active |
| System tray | Yes | Removed |
| Prevent sleep while playing | `powerSaveBlocker` | `navigator.wakeLock.request('screen')` |
| Window state restore | `electron-store` | Not applicable |
| Favorites export/import | Native dialogs | `<a download>` / `<input type="file">` |
| Open external URL | `shell.openExternal` | `window.open(_, '_blank')` |

## Edge functions

- `netlify/edge-functions/stream-proxy.ts` — streams an upstream radio URL
  through our origin with permissive CORS headers so `<audio crossOrigin>`
  and `AudioContext.createMediaElementSource` work on any Icecast/Shoutcast
  source.
- `netlify/edge-functions/shazam-proxy.ts` — forwards a single signed
  Shazam signature POST to `amp.shazam.com` (browsers can't call it
  directly because of a restrictive CORS policy).

Both are stateless and cheap; no secrets or auth required.
