# /board

Password-protected board materials. Source lives in `/board-src/`; encrypted output served at `/board/` lives in the deploy tree.

## Adding a new meeting

1. Copy `board-src/202606/index.html` → `board-src/<yyyymm>/index.html`. Edit content as needed.
2. Add a new `<a class="meeting" href="<yyyymm>/">…</a>` block in `board-src/index.html` (above the existing 202606 entry, newest first).
3. From the repo root, run:

   ```
   ./board-src/build.sh
   ```

   It prompts for the board password (same password for all pages — change it by deleting `.staticrypt.json` and re-running with a new password, then anyone with remember-me set will need to re-enter).
4. `git add board/ .staticrypt.json && git commit && git push`. Cloudflare Pages deploys automatically.

## Notes

- `.staticrypt.json` holds the salt and must be committed. The salt is not secret — it's published inside the encrypted HTML. It only needs to stay stable so the same password keeps working across rebuilds.
- The `--remember 30` flag in `build.sh` makes the "Remember me" checkbox keep the user unlocked for 30 days. Because both pages share the same salt + password, ticking the box on one unlocks the other.
- `_redirects` blocks `/board-src/*` at the Cloudflare edge so the plaintext source can't be served, even though it's committed in the repo.
- Dependencies: Node ≥ 14 (`npx` resolves StaticCrypt on demand — nothing installed globally).
