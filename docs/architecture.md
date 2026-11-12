# Architecture

## Purpose

Cube Companion publishes validated, immutable snapshots of the locally maintained Commander Cube and provides browsing, history, analysis, playtesting, and browser-local experimentation.

`source/CubeUebersicht.xlsx` is the sole source of truth. Application code may read it but must never modify it.

## Data flow

```text
CubeUebersicht.xlsx
  -> workbook adapter
  -> active-card Scryfall resolution
  -> normalized cube
  -> validation
  -> deterministic content hash
  -> current + immutable history + metadata JSON
  -> manual Git commit/push
```

A release never commits or pushes Git changes automatically. Invalid source data writes no publication files.

## State model

The content hash is calculated from sorted draft Oracle IDs together with their workbook allocation, and sorted commander Oracle IDs. Excel row order within an allocation, archive contents, artwork/printing choices, timestamps, Scryfall metadata, and rules-revision changes do not affect the content hash.

`data/history/<hash>.json` stores the first immutable snapshot for a content state. `data/current/cube.json` points at that snapshot and records the current publication timestamp, note, rules revision, and validation result. Releasing unchanged cube content reuses the history snapshot instead of creating another content state.

`data/metadata/cards.json` contains Scryfall metadata for cards in the active cube. It is generated separately so metadata changes cannot alter cube identity.

Archive data remains outside the content hash. Full archive publication is handled separately from the active-cube release path, so historical spelling issues cannot block an otherwise valid cube release.

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
- ExcelJS for the local source adapter
- static Cloudflare deployment planned for v1

No backend, database, authentication, Docker, or cross-device sandbox persistence is required for v1.
