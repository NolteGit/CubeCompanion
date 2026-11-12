# Development

## Normal commands

```bash
npm run dev
npm run verify
```

`verify` runs tests, production build, and linting. A successful run ends with a green confirmation line.

`npm run cube:extract` prints a diagnostic summary of the current workbook. `npm run cube:release` will be added with the release pipeline.

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

If verification is green, commit and push. When a patch changes dependencies, `npm install` also synchronizes `package-lock.json` before commit.
