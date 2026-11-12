# Development

## Normal commands

```bash
npm run dev
npm run verify
npm run cube:release
```

`verify` is offline and checks tests, the production build, and linting. A successful run ends with a green confirmation line.

`cube:release` is the normal publication command. It reads the workbook, resolves active card names through Scryfall, blocks on unresolved names or cube-rule violations, and only then writes generated current/history/metadata/archive files. It never commits or pushes Git changes.

Diagnostic commands are available when needed: `cube:extract` prints workbook counts, `cube:resolve` checks the full workbook including archive names, `cube:validate` runs the active-cube release checks without writing publication files, and `cube:archive` refreshes only the raw archive data.

## Publishing a cube update

```bash
npm run cube:release -- --note "Short release note"
npm run verify
git add -A
git commit -m "data: publish cube update"
git push
```

Review the generated diff before committing. A push never changes the Excel workbook and the release tooling never performs Git operations itself.

## Cloudflare Pages

The site is a static Vite build and needs no server-side runtime.

- production branch: `main`
- framework preset: React (Vite)
- build command: `npm run build`
- build output directory: `dist`
- root directory: repository root

`.node-version` pins the Pages build to the same Node version as Volta. `public/_headers` is copied into the Vite build and provides static security headers plus long-lived caching for fingerprinted `/assets/*` files. No Pages Functions, database, secrets, or deployment-time environment variables are required.

Once the GitHub repository is connected to Cloudflare Pages, pushes to `main` trigger production deployments automatically. Pull requests can use Pages preview deployments.

## Engineering conventions

- keep source files below 400 lines by default
- prefer focused modules over broad utility files
- keep domain logic independent of UI and infrastructure
- add dependencies only when they reduce meaningful complexity
- generated files are not manually edited
- `source/CubeUebersicht.xlsx` is read-only to application code
- README stays minimal; detailed information belongs in `docs/`
- avoid duplicate documentation
- patches contain one coherent concern and avoid unrelated refactors

## Patch workflow

```bash
git apply --check <patch>
git apply <patch>
npm install      # only when dependencies changed
npm run verify
```

If verification is green, run any patch-specific cube command, then commit and push. When a patch changes dependencies, `npm install` also synchronizes `package-lock.json` before commit.
