# Aether Radio — Landing Site

A modern, fully responsive landing page for [Aether Radio](https://github.com/MbarkT3STO/Aether-Radio). Zero dependencies. Pure HTML, CSS, and vanilla JavaScript.

## Design system

The landing mirrors the app's Apple HIG-inspired design system 1:1:

- **Tokens** — `styles/tokens.css` replicates the app's `tokens.css` + `accents.css`: Apple system colors, semantic surfaces, fills, separators, materials, gradients, shadows and motion tokens in both light and dark modes.
- **12 accent themes** — Blue, Indigo, Royal Purple, Purple, Pink, Red, Orange, Green, Mint, Teal, Cyan, Graphite. Live-switchable via the color-dot button in the nav, persisted in `localStorage`.
- **Theme** — Light / Dark toggle with OS preference detection, persisted in `localStorage`.
- **Typography** — SF Pro Display / Text with Inter fallback. Apple type scale from Caption to Large Title.
- **Motion** — Spring-easing, float animations, scroll reveal, animated stat counters, subtle hero parallax on desktop.

## Sections

1. **Nav** — sticky glass bar, links, accent picker, theme toggle, download CTA. Mobile burger menu.
2. **Hero** — headline, CTA pair, highlights strip, 3D phone mockup with animated now-playing + cards, floating glass badges.
3. **Stats** — animated counters (50,000+ stations / 240+ countries / 12 accents / 4 platforms).
4. **Features** — 7 cards in a responsive bento grid: curated world radio, song recognition, favorites & history, sleep timer, custom stations, media controls, themes.
5. **Design showcase** — live token swatch grid, mini-player demo, Apple-style materials demo (vibrancy layers), typography specimen.
6. **Platforms** — download cards for Android, macOS, Windows, Linux, each linked to the GitHub releases.
7. **Values** — free · privacy-first · open source · fast & light.
8. **FAQ** — six accordion items covering pricing, stations source, platforms, offline use, contributing and privacy.
9. **CTA banner** — final call-to-action with dual buttons.
10. **Footer** — brand, product / project / resources columns, legal.

## Preview locally

```bash
# any static server — e.g.
python3 -m http.server 8080 --bind 127.0.0.1
# then open http://127.0.0.1:8080
```

Or just open `index.html` directly in a browser. No build step required.

## Deploy

Drop the whole `landing/` folder anywhere — GitHub Pages, Netlify, Vercel, Cloudflare Pages, or any static host. The site is a plain static bundle:

```
landing/
├── index.html
├── README.md
├── assets/
│   ├── favicon.ico
│   ├── icon-192.png
│   ├── apple-touch-icon.png
│   ├── og-image.svg
│   └── materials-bg.svg
├── scripts/
│   └── landing.js
└── styles/
    ├── tokens.css
    ├── base.css
    └── landing.css
```

### GitHub Pages

Add this to your repo's Pages settings (Source: deploy from branch, folder: `/landing`) or use a small workflow that publishes the folder to `gh-pages`.

## Customization

- **Change the default accent** — edit the `data-accent` attribute on the root `<html>` element in `index.html`, or change the fallback in `scripts/landing.js` (`VALID_ACCENTS[0]`).
- **Change the release links** — search `index.html` for `MbarkT3STO/Aether-Radio/releases` and update the URLs.
- **Add screenshots** — drop images into `assets/` and reference them in the hero or a new section.

## License

MIT — same as the rest of the Aether Radio project.
