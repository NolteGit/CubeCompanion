# Roadmap

1. **Foundation** — complete.
2. **Domain model** — complete.
3. **Workbook adapter** — complete; extracts active cube, commanders, and archive and proves the 411/55 baseline.
4. **Card resolution** — complete; Scryfall collection lookup, local cache, metadata normalization, and explicit resolution errors.
5. **Release pipeline** — complete; active-name resolution, validation, deterministic content hash, immutable history, and generated current/metadata data.
6. **Cube browser** — complete; published cube/commander browsing, section and type filters, search, sorting, list/image views, and release metadata.
7. **Analysis/history/archive** — complete; current analysis, immutable version diffs, raw workbook archive publication, and historical lookup.
8. **Playtest/sandbox** — complete; random draft/commander packs plus a session-only sandbox with live validation, Scryfall-resolved additions, removals, reset, and text exports.
9. **Deployment polish** — complete; Cloudflare Pages build settings, pinned Node runtime, static security/cache headers, responsive navigation, and a top-level render fallback.

V1 is feature-complete. Future work should be driven by actual cube use rather than adding infrastructure pre-emptively.
