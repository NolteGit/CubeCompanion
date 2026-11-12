# Workbook Format

## Source

The authoritative workbook is committed at:

`source/CubeUebersicht.xlsx`

The application and release tooling treat this file as read-only.

## Relevant sheets

### `Cube`

Contains the active draft pool and active commander pool. It also contains working/planned areas that are not part of the active cube. The workbook adapter is responsible for distinguishing these regions.

Known current active baseline:

- 411 draft cards
- 55 commanders

### `Archive`

Contains historical draft cards and commanders. Archive content is published for reference/search but does not affect official cube-state identity.

### `Cut-Watch-Interest`

Private working space for ideas, watch items, future additions, and cuts. It is not imported into the website.

## Extraction rule

Only the Excel infrastructure adapter may know worksheet coordinates, formatting conventions, or section boundaries. Downstream code receives normalized cube data only.
