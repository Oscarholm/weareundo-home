# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Marketing site for We Are Undo. The homepage (`index.html`) is a static "About Us" page. There is no build system and no framework — plain HTML, embedded CSS, and a small amount of vanilla JavaScript.

## Running Locally

Open `index.html` directly in a browser, or serve it with any HTTP server:

```bash
python -m http.server 8000
```

Fonts (Hanken Grotesk + a serif) are self-hosted in `assets/`, so no internet connection is required.

## Architecture

`index.html` contains all markup and embedded CSS. Referenced assets (fonts and images) live in `assets/` as individual files.

- The page was produced by de-bundling a self-contained "standalone" export (a single ~29 MB file that stored every asset as base64 and unpacked them client-side via JS). It was converted to a lean static page: assets extracted to `assets/`, referenced normally, no client-side unpacking.
- The only JavaScript is a small inline scroll-reveal enhancement (IntersectionObserver adds an `.in` class to `.reveal` elements). It is progressive enhancement, not a framework.
- Fonts are self-hosted `.woff2` files in `assets/` via `@font-face`; no external font CDN.
- Photos in `assets/` are sized/compressed for web. The two hero JPEGs were resized to 2560px (longest side) at quality ~82. Keep new imagery similarly sized — avoid committing multi-megapixel originals.
- Colors: `#f3ece4` background, dark ink text.
- Contact CTA links to `mailto:gustav@weareundo.com`.
- The **Press Release** button downloads `undo-naama-press-release-202607.pdf` (root) via a `download` attribute.

### Other pages

`careers.html` and `finance_operations.html` are standalone pages retained from earlier work. The homepage does not link to them, but they are still served if visited directly. `board/` is a separate password-protected section (see `README.md`).

## Deployment

Deploy by uploading the static files to any static host (Netlify, Vercel, GitHub Pages, etc.). Include `index.html`, the `assets/` folder, the press-release PDF, `favicon.svg`, and any other pages you want reachable. `_redirects` holds Netlify redirect rules. No environment variables or build process required.
