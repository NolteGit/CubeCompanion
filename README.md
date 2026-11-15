# Cube Companion

Personal web companion for the MTG Commander Cube stored in `source/CubeUebersicht.xlsx`.

**Live site:** https://cubecompanion.noltenius.workers.dev/

```bash
npm install
npm run dev
npm run verify
```

## Update, validate, and release the cube

Run these commands from the repository root. **`source/CubeUebersicht.xlsx` is the source of truth.**

**1. Update Excel** using one of these methods:

- **Manually:** edit and save `source/CubeUebersicht.xlsx`.
- **From Cube Companion:** export **Changes** as a text file, close Excel, preview the import, then apply it:

```powershell
npm run cube:apply-diff -- --file "$HOME\Downloads\cube-sandbox-diff.txt"
npm run cube:apply-diff -- --file "$HOME\Downloads\cube-sandbox-diff.txt" --apply
```

The preview is read-only. `--apply` validates a temporary workbook, updates the sorted card lists within their fixed sections, removes newly activated cards from Maybe, and creates a backup in `.cache/cube-backups/`. It leaves the Archive sheet untouched.

**2. Validate → release → verify**, in this order:

```powershell
npm run cube:validate
npm run cube:release -- --note "Describe cube changes"
npm run verify
```

`cube:validate` checks the Excel source and cube rules without publishing a new snapshot. `cube:release` checks again and writes `data/current/`, `data/history/`, card metadata, ideas, and archive publication files. `verify` runs tests, build, and lint against the updated source.

**3. Review → commit → push** only if everything above passed:

```powershell
git status
git diff --stat
git add source/CubeUebersicht.xlsx data
git diff --cached --stat
git commit -m "chore: update cube"
git push
```

Check the workbook visually as needed. Review staged changes before committing. The local release command never commits or pushes automatically, and publishing the website is driven by a successful push to `main` when the Cloudflare Git connection is enabled.

Production is a Cloudflare Worker serving the Vite build from `dist/`. The Worker configuration is committed in [`wrangler.jsonc`](wrangler.jsonc). Git-connected production builds use `main`, `npm run build`, and `npm run deploy:cloudflare`.

Architecture and deployment details live in [`docs/architecture.md`](docs/architecture.md).
