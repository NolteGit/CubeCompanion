# Roadmap

1. **Foundation** — structure, documentation, test tooling, minimal app shell.
2. **Domain model** — cube types, rules configuration, validation and tests.
3. **Workbook adapter** — extract active cube, commanders, and archive; prove the 411/55 baseline.
4. **Card resolution** — Scryfall identity/metadata with local caching and explicit resolution errors.
5. **Release pipeline** — extract, resolve, validate, hash, generate current/history data.
6. **Cube browser** — current cube, commanders, filtering, sorting, card presentation.
7. **Analysis/history/archive** — curves, distributions, version diffs, archive lookup.
8. **Playtest/sandbox** — packs, commander packs, session sandbox, text exports.
9. **Deployment polish** — Cloudflare deployment, responsive/error-state cleanup.

Split any step further when that keeps patches easier to review and test.
