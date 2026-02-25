# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Placeholder/coming-soon site for We Are Undo. A single-page static HTML site with no build system, no JavaScript, and no dependencies.

## Running Locally

Open `index.html` directly in a browser, or serve it with any HTTP server:

```bash
python -m http.server 8000
```

The site uses Typekit (Adobe Fonts) for the Futura PT typeface, so an internet connection is needed for fonts to load.

## Architecture

Single file: `index.html` contains all markup and embedded CSS. There is no separate stylesheet, no JavaScript, and no build step.

- Layout: CSS Flexbox, full viewport height (`dvh`), centered content
- Typography: Futura PT via Typekit; fluid sizing with `clamp()`
- Colors: `#f1ebe5` background, `#3c3c3c` text, `#0000ff` CTA
- CTA button links to `mailto:gustav@weareundo.com`
- SVG asset (`WAU26_STOREFRONT SYSTEM_Facades Outline.svg`) is a 1920×1080 architectural line drawing referenced inline

## Deployment

Deploy by uploading `index.html` and the SVG file to any static host (Netlify, Vercel, GitHub Pages, etc.). No environment variables or build process required.
