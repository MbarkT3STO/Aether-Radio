<div align="center">

<img src="./assets/logo-192.png" alt="Aether Radio" width="112" height="112" />

# Aether Radio — Landing

### A pixel-perfect marketing site. Zero dependencies. Zero build.

<p>
  <img alt="HTML5" src="https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white&labelColor=0b0b10" />
  <img alt="CSS3" src="https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white&labelColor=0b0b10" />
  <img alt="JavaScript" src="https://img.shields.io/badge/Vanilla%20JS-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black&labelColor=0b0b10" />
  <img alt="No deps" src="https://img.shields.io/badge/deps-0-30D158?style=for-the-badge&labelColor=0b0b10" />
  <img alt="License" src="https://img.shields.io/badge/license-MIT-30D158?style=for-the-badge&labelColor=0b0b10" />
</p>

</div>

---

A fully responsive, Apple-inspired landing site for [Aether Radio](https://github.com/MbarkT3STO/Aether-Radio). Pure HTML, CSS and vanilla JavaScript — no bundler, no framework, no package manager. Open `index.html` and you're shipping.

The design system mirrors the Aether Radio apps **one-to-one**: same tokens, same 12 accents, same Apple HIG typography, same spring easings. Change it here, change it everywhere.

## ✨ Highlights

- 🎨 **12 live-switchable accents.** Blue, Indigo, Royal Purple, Purple, Pink, Red, Orange, Green, Mint, Teal, Cyan, Graphite. Persisted to `localStorage`.
- 🌓 **Light & dark theme.** OS preference on first visit; manual toggle stored in `localStorage`.
- ✨ **Motion done right.** Spring easings, float keyframes, scroll-reveal, animated stat counters, hero parallax on pointer devices.
- 🧊 **Apple-style materials.** Vibrancy layers, ultra-thin glass blurs, system separators — implemented with `backdrop-filter` + semantic tokens.
- 📱 **Mobile-first, fully responsive.** Dedicated mobile nav, fluid type scale, touch-friendly FAQ accordions.
- 🚀 **Zero runtime deps.** No npm, no webpack, no Vite. Just static files.
- ⚡ **SEO & social ready.** Open Graph + Twitter Card meta, canonical URL, preload hints for critical assets.

## 🗂️ File tree

```
Landing/
├── index.html                Single-page marketing site (~800 lines)
├── README.md                 you are here
├── assets/
│   ├── favicon.ico
│   ├── icon-192.png
│   ├── apple-touch-icon.png
│   ├── logo.png
│   ├── logo-192.png
│   ├── logo-512.png
│   ├── materials-bg.svg      Decorative vibrancy layers
│   └── og-image.svg          OpenGraph preview card
├── scripts/
│   └── landing.js            Accent picker · theme toggle · reveal · counters · FAQ · parallax · burger
└── styles/
    ├── tokens.css            Design tokens — mirror of the app tokens
    ├── base.css              Reset + element defaults + utilities
    └── landing.css           Page-specific layout and components
```

## 🎨 Design system

Tokens live in [`styles/tokens.css`](./styles/tokens.css) and are a direct mirror of the app's `tokens.css` + `accents.css`. Covers:

- **System colors** — Apple `systemBlue`, `systemIndigo`, `systemRed`, `systemGreen`, etc.
- **Semantic surfaces** — background, grouped-background, secondary-fill, tertiary-fill.
- **Separators** — opaque and translucent variants.
- **Materials** — ultra-thin / thin / regular / thick / chrome glass layers.
- **Gradients** — hero mesh, ambient blobs, card tints.
- **Shadows** — six-level elevation scale.
- **Motion** — spring, ease-out-expo, linear tokens used across all animations.
- **Type scale** — Caption 2 through Large Title, matching iOS/macOS.

Accent swaps happen in a single attribute flip:

```html
<html data-theme="dark" data-accent="royal-purple">
```

Twelve accents ship out of the box. Change the default by editing the `data-accent` attribute on `<html>` in `index.html` or the `VALID_ACCENTS[0]` fallback in `scripts/landing.js`.

## 🧭 Sections

1. **Navbar** — sticky glass bar, nav links, accent picker, theme toggle, download CTA, mobile burger.
2. **Hero** — eyebrow pill, headline, CTA pair, highlights strip, animated 3D phone mockup with now-playing + floating glass badges.
3. **Stats** — animated counters (50,000+ stations · 240+ countries · 12 accents · 4 platforms).
4. **Features** — 7 cards in a responsive bento grid.
5. **Design showcase** — live token swatch grid · mini-player demo · Apple-style materials demo · typography specimen.
6. **Platforms** — download cards for Android, macOS, Windows, Linux (each linked to the GitHub releases).
7. **Values** — free · privacy-first · open source · fast & light.
8. **FAQ** — six accordion items (pricing, stations source, platforms, offline, contributing, privacy).
9. **CTA banner** — final dual-button call to action.
10. **Footer** — brand, product / project / resources columns, legal.

## 🎬 Interactions — `scripts/landing.js`

A single ~600-line file handles every runtime behavior:

- **Accent picker** — dropdown of the 12 accents, sets `data-accent` on `<html>`, persists to `localStorage`, updates the nav swatch.
- **Theme toggle** — switches between light and dark, respects `prefers-color-scheme` on first visit, persists to `localStorage`.
- **Scroll reveal** — an `IntersectionObserver` fades and slides elements in as they enter the viewport. Plays at most once per element.
- **Stat counters** — count up from 0 to target when the stats section scrolls into view. Respects `prefers-reduced-motion`.
- **FAQ accordions** — controlled open/close state, only one item open at a time.
- **Mobile burger** — slide-in nav menu with aria-expanded wiring.
- **Hero parallax** — subtle pointer-driven transform on the phone mockup (pointer devices only).

Zero runtime dependencies — it's all DOM APIs, `IntersectionObserver` and `requestAnimationFrame`.

## 🚀 Preview locally

Any static server works:

```bash
# Python (macOS / Linux / WSL)
python3 -m http.server 8080 --bind 127.0.0.1

# Node
npx serve Landing

# Then open
http://127.0.0.1:8080
```

Or literally double-click `index.html` — there's no build step, no hot reload, no tooling to install.

## 🌍 Deploy

Drop the `Landing/` folder onto any static host:

- **GitHub Pages** — Pages settings → *Deploy from branch* → `/Landing`. Or use a GitHub Actions workflow to publish the folder to `gh-pages`.
- **Netlify** — set base directory to `Landing/`, leave build command empty, publish directory `.`.
- **Vercel** — `Framework preset: Other`, root directory `Landing`, no build.
- **Cloudflare Pages** — build command empty, root `Landing`.
- **Any S3/CDN** — sync the folder.

No env vars, no secrets, no runtime.

## 🛠️ Customization

### Change the default accent

Edit the `data-accent` attribute on the `<html>` tag in `index.html`:

```html
<html lang="en" data-theme="dark" data-accent="purple">
```

Or update the fallback in `scripts/landing.js`:

```js
const VALID_ACCENTS = ['blue', 'indigo', 'royal-purple', …]   // first item = default
```

### Change the release links

Search `index.html` for `MbarkT3STO/Aether-Radio/releases` and update the URLs to point at your fork's releases page.

### Add screenshots

Drop images into `assets/` and reference them from the hero or a new section. Use `.webp` or `.avif` with a `.png` fallback for best performance.

### Change the brand copy

All headlines, feature text and FAQ content is plain HTML in `index.html`. Search for the section headings (`Features`, `Design`, `Platforms`, `FAQ`) and edit in place.

## ♿ Accessibility

- Semantic landmarks (`<header>`, `<main>`, `<nav>`, `<footer>`, `<section>` with `aria-labelledby`).
- All interactive icons have `aria-label`s; all decorative ones are `aria-hidden="true"`.
- FAQ accordions use `aria-expanded` + `aria-controls` so screen readers announce state.
- Keyboard navigation works everywhere; focus rings follow the accent color.
- Text contrast passes WCAG AA in both themes.
- `prefers-reduced-motion` disables counters, reveal and parallax.

Full WCAG certification requires manual testing with assistive technologies — the markup is built to make that testing successful.

## 🔍 SEO & social

- Open Graph + Twitter Card meta for rich link previews.
- Canonical URL set on the root.
- Semantic headings (`h1` → `h2` → `h3`) for proper document outline.
- Descriptive `alt` attributes on meaningful imagery.
- `theme-color` meta tags for dark and light system UIs.
- `rel="preload"` for the logo so it arrives before the nav paints.

## 📜 License

[MIT](../LICENSE) — same as the rest of the Aether Radio project. © 2026 MBVRK.
