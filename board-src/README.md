# /board

Password-protected board materials. Source lives in `/board-src/`; encrypted output served at `/board/` lives in the deploy tree.

## Adding a new meeting

1. Copy `board-src/202606/index.html` → `board-src/<yyyymm>/index.html`. Edit content as needed. Keep the `<!-- DETAILED_READS -->` marker before `</body>` if you want a Detailed Reads appendix page (see below).
2. Add a new meeting block in `board-src/index.html` (above the existing one, newest first). Use the `<article class="meeting" data-meeting="<yyyymm>">` shape and include `<!-- DETAILED_READS:<yyyymm> -->` inside it so the expand renders.
3. (Optional) Add `board-src/<yyyymm>/materials.json` — see Detailed Reads below.
4. From the repo root, run:

   ```
   ./board-src/build.sh
   ```

   It first renders `board-src/` → `.board-staged/` (injecting Detailed Reads), then prompts for the board password and encrypts the staged tree into `/board/`. Same password for all pages — change it by deleting `.staticrypt.json` and re-running with a new password.
5. `git add board/ board-src/ .staticrypt.json && git commit && git push`. Cloudflare Pages deploys automatically.

## Detailed Reads

Each meeting can have a `materials.json` listing supporting documents (typically Google Drive links). When present, the build injects:

- a collapsible **Detailed reads** expand on the meeting's card on `/board/`
- a standalone **Detailed Reads** appendix page at the end of that meeting's pack

`board-src/<yyyymm>/materials.json` is an array of entries:

```json
[
  {
    "title": "REC Notting Hill",
    "kind": "Recommendation",
    "url": "https://drive.google.com/file/d/.../view?usp=sharing",
    "related_to": "Notting Hill Gate"
  }
]
```

Fields:

| field | required | notes |
|---|---|---|
| `title` | yes | Display name. |
| `url` | yes | Must be `http(s)`. Google Drive share-link is fine. |
| `kind` | no | e.g. `Recommendation`, `Memo`, `Appendix`. Shown as a tag. |
| `related_to` | no | Section/topic the read backs up — shown as italic context. |

If `materials.json` is absent (or empty), the markers render to nothing — no expand on the card, no appendix page.

**Drive sharing.** Set every linked doc to *anyone with the link · view* so that anyone holding the board password can open them. The board password gates the link list; Drive's sharing setting gates the doc itself.

## Notes

- `.staticrypt.json` holds the salt and must be committed. The salt is not secret — it's published inside the encrypted HTML. It only needs to stay stable so the same password keeps working across rebuilds.
- The `--remember 30` flag in `build.sh` makes the "Remember me" checkbox keep the user unlocked for 30 days. Because all pages share the same salt + password, ticking the box on one unlocks the others.
- `_redirects` blocks `/board-src/*` at the Cloudflare edge so the plaintext source can't be served, even though it's committed in the repo.
- `.board-staged/` is the intermediate render output. It's gitignored — never commit it.
- Dependencies: Node ≥ 18 (`npx` resolves StaticCrypt on demand — nothing installed globally).
