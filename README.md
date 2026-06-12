# weareundo-home

The static site behind **weareundo.com**. Coming-soon landing page plus a handful of standalone pages — careers, finance operations and a password-protected board section.

## Why it's built this way

- **No build system, no JS framework, no dependencies.** Each page is a single self-contained `.html` file with CSS in a `<style>` block. Open the file, you can read the page. The exception is the `/board/` section, which adds one optional Node-based step (StaticCrypt) to encrypt the protected pages — sources are still plain HTML.
- **Cloudflare Pages auto-deploys from `main`.** Every push to `main` ships. There's no staging branch, no preview ritual — preview locally, push when ready.
- **Design language is consistent across pages but split into two systems.** Public-facing pages (`index.html`, `careers.html`) use Futura PT (Typekit) on a paper background with the blue `#0000ff` CTA. Internal documents (`finance_operations.html`, `/board/`) use Archivo Black + Montserrat + EB Garamond on cream `#FBEFD2` paper with the same blue `#2020FF` accent. Re-use existing CSS variables and class names rather than inventing new ones.

## Local preview

```
python -m http.server 8000
```

Then open `http://localhost:8000/`. An internet connection is needed for Typekit (public pages) and Google Fonts (board / finance ops).

## Repo layout

```
index.html                       # Coming-soon landing page
careers.html                     # Open roles
finance_operations.html          # Finance ops domain map
favicon.svg                      # Site favicon
logo.png / logo.svg              # Brand assets
WAU26_STOREFRONT SYSTEM...svg    # Hero illustration on the landing page

/board/                          # Encrypted board materials (output — see /board-src/)
/board-src/                      # Plain source for the board section + build script
  README.md                      # Board workflow: adding meetings, rebuilding

_redirects                       # Cloudflare Pages: 404s for /board-src/* so the
                                 # plaintext board source can't be served at the edge
.staticrypt.json                 # Salt for StaticCrypt — committed on purpose,
                                 # not secret. Created by /board-src/build.sh.
```

## How to update each page

### Landing page (`index.html`)

Single page, single file. Edit text, swap the SVG, or change colours directly in the `<style>` block. Layout uses Flexbox and `dvh`; the storefront SVG is the centrepiece. Keep the nav links in sync if you add or rename top-level pages.

### Careers (`careers.html`)

Job postings are plain HTML blocks at the bottom of the file — a `.job-item` row in the left list plus a matching `.job-panel` on the right, linked by `data-index`. To add a role: copy an existing pair, increment `data-index`, edit the title, meta line, body copy and `Apply on LinkedIn` URL. The small inline `<script>` at the foot of the file handles list-to-detail toggling and the mobile back button — no changes needed there.

### Finance operations (`finance_operations.html`)

Domain cards are generated from the `data` array near the bottom of the file. To edit: change titles, starting points, destinations or process lists in that array. The systems map below it is hand-written HTML — edit directly if Stripe / NetSuite / Personio shift around.

### Board (`/board/` and `/board-src/`)

Plain source HTML lives in `/board-src/`. StaticCrypt encrypts it into `/board/` for deployment. **Full workflow — adding a meeting, rebuilding, troubleshooting — is in `board-src/README.md`.** The short version:

```
./board-src/build.sh        # prompts for the board password
git add board/ board-src/ .staticrypt.json
git commit && git push
```

## Deploy

Push to `main`. Cloudflare Pages picks it up. No build command, no environment variables, no secrets stored at the host. The board password is never committed — it's known by whoever runs `build.sh`.
