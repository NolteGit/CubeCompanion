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

Architecture and release/deployment details live in [`docs/architecture.md`](docs/architecture.md).
