# Development

## Normal commands

```bash
npm run dev
npm run verify
npm run cube:release
```

`verify` is offline and checks tests, the production build, and linting. A successful run ends with a green confirmation line.

`cube:release` is the normal publication command. It reads the workbook, resolves active card names through Scryfall, blocks on unresolved names or cube-rule violations, and only then writes generated current/history/metadata files. It never commits or pushes Git changes.

Diagnostic commands are available when needed: `cube:extract` prints workbook counts, `cube:resolve` checks the full workbook including archive names, and `cube:validate` runs the active-cube release checks without writing publication files.

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
