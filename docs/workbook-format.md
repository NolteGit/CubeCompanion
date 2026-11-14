# Workbook Format

## Source

`source/CubeUebersicht.xlsx` is authoritative and read-only to application code.

## Included sheets

`Cube` provides the draft and commander working pools. `Archive` provides historical draft and commander reference data. `Cut-Watch-Interest` provides the read-only Maybe list from `Interesting Main Cube` (column A) and `Interesting Commander` (column C). Watchlist and Cutlist columns remain outside the website.

## Draft convention

Only the Excel adapter owns worksheet coordinates.

For every draft column, nonblank card cells from rows 4 through 76 are draft candidates. This intentionally includes temporary ideas below the normal filled block, so an unfinished change appears as an excess count or duplicate instead of silently disappearing from validation. Row 77 separates the draft area from the commander area.

The Multicolor and Land sections use the same guild order: WU, UB, BR, RG, WG, WB, UR, BG, WR, UG. Rows 4-43 form ten four-card guild allocations. Land rows 44-76 are the general/colorless land allocation.

Workbook allocation is preserved downstream and is separate from Scryfall color identity. For example, a fetchland can occupy a guild land slot and a mechanically blue colorless artifact can occupy the Blue section.

## Commander convention

Commander headings are on row 78 and card lists begin on row 79. Each commander list ends at its first blank separator, allowing later notes or scratch blocks to remain outside the active commander pool. `-` is treated as an empty placeholder.

The adapter verifies section labels before reading. A moved or renamed workbook section therefore fails loudly instead of silently extracting the wrong cells.

## Maybe ideas

The Maybe list reads nonblank entries below `A1 = Interesting Main Cube` and `C1 = Interesting Commander`. These entries are resolved through Scryfall for display metadata but never participate in cube validation, snapshot identity, or history. Source rows are preserved in generated data. Duplicate names within the same pool are shown once in the UI.

Columns E (`Watchlist`) and G (`Cutlist`) are intentionally not published.

## Archive

Archive columns are scanned independently through the used sheet rows because historical lists may contain gaps or grow over time. Archive entries remain reference data and do not affect cube-state identity.

Archive publication preserves the workbook name, pool, and section without requiring Scryfall resolution. Historical spelling mistakes therefore remain searchable as recorded and never become active-card validation failures. The website supplements these entries with former cards found in committed official snapshots.

Downstream code must not depend on workbook coordinates or formatting.
