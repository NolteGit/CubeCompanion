# Workbook Format

## Source

`source/CubeUebersicht.xlsx` is authoritative and read-only to application code.

## Included sheets

`Cube` provides the draft and commander working pools. `Archive` provides historical draft and commander reference data. `Cut-Watch-Interest` stays local to the Excel workflow and is not extracted.

## Draft convention

Only the Excel adapter owns worksheet coordinates.

For every draft column, nonblank card cells from rows 4 through 76 are draft candidates. This intentionally includes temporary ideas below the normal filled block, so an unfinished change appears as an excess count or duplicate instead of silently disappearing from validation. Row 77 separates the draft area from the commander area.

The Multicolor and Land sections use the same guild order: WU, UB, BR, RG, WG, WB, UR, BG, WR, UG. Rows 4-43 form ten four-card guild allocations. Land rows 44-76 are the general/colorless land allocation.

Workbook allocation is preserved downstream and is separate from Scryfall color identity. For example, a fetchland can occupy a guild land slot and a mechanically blue colorless artifact can occupy the Blue section.

## Commander convention

Commander headings are on row 78 and card lists begin on row 79. Each commander list ends at its first blank separator, allowing later notes or scratch blocks to remain outside the active commander pool. `-` is treated as an empty placeholder.

The adapter verifies section labels before reading. A moved or renamed workbook section therefore fails loudly instead of silently extracting the wrong cells.

## Archive

Archive columns are scanned independently through the used sheet rows because historical lists may contain gaps or grow over time. Archive entries remain reference data and do not affect cube-state identity.

Downstream code must not depend on workbook coordinates or formatting.
