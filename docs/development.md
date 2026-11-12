# Development

## Normal commands

```bash
npm run dev
npm test
npm run build
npm run lint
```

`npm run cube:release` will be added with the release pipeline. Smaller cube commands may exist for debugging but should not be required for normal use.

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

Changes supplied externally should be checked before application:

```bash
git apply --check <patch>
git apply <patch>
npm install
npm test
npm run build
npm run lint
git diff
```

Run `npm install` when a patch changes dependencies so `package-lock.json` is synchronized before committing.
