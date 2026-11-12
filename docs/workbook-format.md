# Workbook Format

## Source

`source/CubeUebersicht.xlsx` is authoritative and read-only to application code.

## Included sheets

`Cube` provides the active draft pool and commander pool. `Archive` provides historical draft and commander reference data. `Cut-Watch-Interest` stays local to the Excel workflow and is not extracted.

## Active-section convention

Only the Excel adapter owns worksheet coordinates.

Draft sections use bounded active blocks. Mono-color and multicolor blocks match their fixed rule sizes; colorless and land blocks include their full allowed ranges. Blank cells inside a block are skipped, so an unfinished cut does not hide later active rows.

Commander lists start at known cells and end at their first blank separator. This keeps later scratch/planned blocks outside the active pool while allowing commander counts to change. `-` is treated as an empty placeholder, currently used by the colorless commander section.

Current diagnostic baseline is 411 draft cards and 55 commanders.

The adapter verifies section labels before reading. A moved or renamed workbook section therefore fails loudly instead of silently extracting the wrong cells.

## Archive

Archive columns are scanned independently through the used sheet rows because historical lists may contain gaps or grow over time. Archive entries remain reference data and do not affect cube-state identity.

Downstream code must not depend on workbook coordinates or formatting.
