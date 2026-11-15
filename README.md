# Cube Companion

Personal web companion for the MTG Commander Cube stored in `source/CubeUebersicht.xlsx`.

**Live site:** https://cubecompanion.noltenius.workers.dev/

```bash
npm install
npm run dev
npm run verify
npm run cube:release
npm run deploy:cloudflare
```

Production is a Cloudflare Worker serving the Vite build from `dist/`. The Worker configuration is committed in [`wrangler.jsonc`](wrangler.jsonc). Git-connected production builds use `main`, `npm run build`, and `npm run deploy:cloudflare`.

## Apply a Cube Companion Changes export to Excel

Close the workbook in Excel and export the **Changes** text file from Cube Companion. From the project root, first preview the modifications (the default never writes the workbook):

```bash
npm run cube:apply-diff -- --file "path/to/cube-sandbox-diff.txt"
```

If the preview matches your intent, apply it:

```bash
npm run cube:apply-diff -- --file "path/to/cube-sandbox-diff.txt" --apply
npm run cube:extract
npm run verify
npm run cube:release -- --note "Update cube from Changes export"
```

The importer checks all additions/removals, sorts creatures before noncreatures by ascending mana value (then name) inside each draft section, preserves existing land ordering and fixed guild blocks, and groups commanders by their existing color identities, and clears newly activated cards from the Maybe sheet. It validates a temporary copy against the existing cube rules **before** replacing the source workbook. Backups are written to `.cache/cube-backups/` and are not tracked by Git. The workbook's Archive sheet is left untouched. Review the workbook and Git changes before committing/pushing. If the rules fail, the original workbook is not replaced.

Architecture and release/deployment details live in [`docs/architecture.md`](docs/architecture.md).
