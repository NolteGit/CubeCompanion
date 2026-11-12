# Architecture

## Purpose

Cube Companion publishes validated, immutable snapshots of the locally maintained Commander Cube and provides browsing, history, analysis, playtesting, and browser-local experimentation.

`source/CubeUebersicht.xlsx` is the sole source of truth. Application code may read it but must never modify it.

## Data flow

```text
CubeUebersicht.xlsx
  -> workbook adapter
  -> normalized cube
  -> Scryfall resolution
  -> validation
  -> content hash + snapshot
  -> generated website data
  -> manual Git commit/push
```

A release never commits or pushes Git changes automatically.

## State model

An official snapshot contains the active draft pool, commander pool, publication timestamp, optional note, rules revision, and validation summary.

The snapshot ID is a deterministic hash of sorted logical draft-card and commander identities. Excel row order, archive contents, artwork/printing choices, timestamps, and Scryfall metadata do not affect cube identity.

Archive data is published as reference data but does not affect the snapshot hash. Website experiments are temporary sandbox states and never become official versions automatically.

## Module boundaries

```text
src/app             application shell and routing
src/domain          cube model, rules, validation, history, sandbox logic
src/features        browser, analytics, history, archive, draft, sandbox UI
src/infrastructure  Excel, Scryfall, snapshots, browser storage
src/shared          small reusable UI/types/utilities
scripts/cube        local release tooling
data                 generated current/history/metadata artifacts
```

Domain code must not depend on React, Excel, Scryfall, or browser storage. Infrastructure adapters isolate external formats and services.

## Technology

- TypeScript + React + Vite
- npm with Volta-pinned Node/npm versions
- Oxlint
- Vitest
- Scryfall for card identity and metadata
- Excel reader introduced with the workbook adapter
- static Cloudflare deployment planned for v1

No backend, database, authentication, Docker, or cross-device sandbox persistence is required for v1.
