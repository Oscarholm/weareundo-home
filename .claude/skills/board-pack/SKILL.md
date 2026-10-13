---
name: board-pack
description: Publish a new Euraser Holdings board meeting pack to the password-protected /board section. Use when adding, updating or verifying board materials for a meeting — e.g. "upload this board material to /board", "add the October board pack", "new board meeting deck".
---

# Publishing a board pack

The canonical workflow lives in `board-src/README.md` — read it. This skill
covers what that file does not: the things that only bite once you run it.

## Shape of the job

A meeting is a six-digit `yyyymm` directory. Each pack is a single
self-contained HTML file exported from the artifact the deck was built in —
not a hand-written page. Dropping that export in is the whole job:

1. `cp <export>.html board-src/<yyyymm>/index.html`
2. Add the card to `board-src/index.html` (newest first) and update the
   **Next meeting** note near the top of the page.
3. `node board-src/verify.mjs <yyyymm>` — must print PASS.
4. **Ask the user to run `./board-src/build.sh` in a real terminal.**
5. Commit `board/`, `board-src/` and `.staticrypt.json`; push to `main`.

## Gotchas

**You cannot run `build.sh` yourself.** It prompts for the board password with
`read -s -p`, which needs a TTY. Run through the Bash tool — including with a
`!` prefix — `read` hits EOF, `set -e` aborts, and the script dies silently
after the render step with `board/` untouched. Always hand this step to the
user. Never suggest `STATICRYPT_PASSWORD=<literal> ./board-src/build.sh`: that
puts the board password in the transcript and shell history.

**A PDF cannot go in `/board/`.** StaticCrypt encrypts HTML only. A PDF dropped
under `board/` is served unprotected to anyone with the URL — `_redirects`
only blocks `/board-src/*`. If the user offers a PDF, ask for the HTML export
instead; packs are always artifact exports, so one exists.

**Every pack is re-encrypted on each build.** `build.sh` re-runs StaticCrypt
over all meetings with a fresh IV, so `board/202606/index.html` and friends
show as modified even when untouched. Expected — say so in the commit message
rather than trying to avoid it.

**The salt must stay stable.** `.staticrypt.json` is committed on purpose. If
the salt changes, every existing password and "remember me" session breaks.
After a build, confirm all pages still carry the committed salt:

```
grep -o '"staticryptSaltUniqueVariableName":"[a-f0-9]*"' board/*/index.html board/index.html
```

**Page count on the card follows the deck's own footers, not the file.** Part
dividers and the cover are usually unnumbered, so a 35-slide deck whose
footers read `/ 34` gets `34 pages` on the card. Check the footers rather than
counting slides, and flag inconsistent numbering to the user — it is a bug in
the source artifact and should be fixed there, not patched here.

**`materials.json` is optional.** It drives the "Detailed reads" expand. If the
pack's appendices are inline and nothing links to Drive, leave the file out and
the markers render to nothing. Do not invent entries.

## Verifying

`node board-src/verify.mjs <yyyymm>` encrypts the pack with a throwaway
password, serves it over localhost, unlocks it in headless Chrome and reports
slides, broken images, fonts and CSP violations. It never needs the real board
password.

Two reasons it works this way, both of which cost an afternoon to discover:

- **WebCrypto is unavailable on `file://`** — it is not a secure context, so
  `crypto.subtle` is undefined and the page silently stays locked. Must be
  served over localhost.
- **The `#staticrypt_pwd=` URL fragment expects the *hashed* password**, not the
  plaintext. Driving the real form through the DevTools Protocol is simpler and
  tests what a director actually does.

Artifact exports carry a strict CSP `<meta>` tag that older packs lack, and
StaticCrypt unlocks via `document.write()`, so the CSP does apply to the
decrypted document. It has been compatible so far — `verify.mjs` is what
catches it if a future export is not.
