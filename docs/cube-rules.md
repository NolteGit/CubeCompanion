# Cube Rules

These rules define whether an extracted source workbook may be released.

## Draft pool

Workbook allocation, not Scryfall color identity, defines cube quota membership. Scryfall identity remains card metadata.

Hard limits:

- 50 cards in each mono-color workbook section: White, Blue, Black, Red, Green
- 4 multicolor cards in each guild allocation
- 5 land cards in each guild land allocation
- no three-, four-, or five-color draft cards
- singleton by logical card identity
- no card may also occur in the active commander pool

The guild order used by both the Multicolor and Land blocks is WU, UB, BR, RG, WG, WB, UR, BG, WR, UG. Each guild owns four consecutive multicolor rows and five consecutive land rows. This intentionally lets cards such as fetchlands count toward the guild they support even when Scryfall assigns them a different or colorless identity.

Flexible hard ranges:

- Colorless workbook section: target 61, allowed 51-71
- entire Land workbook section: target 70, allowed 60-80
- total draft pool: target 421, allowed 401-441

Land rows after the ten five-card guild groups are the general/colorless land allocation. At the 70-card land target this is 50 guild lands plus 20 general/colorless lands. The workbook's existing row limit (76) also constrains physical capacity.

## Commander pool

- singleton by logical card identity
- no overlap with the draft pool
- identity counts are symmetrical independently for mono-, dual-, triple-, and four-color commanders
- colorless commanders are unrestricted
- five-color commanders are allowed; only one five-color identity exists, so no symmetry check is needed
- Partner-specific deck rules are intentionally out of scope

## Release behavior

Any hard-rule violation blocks release. Validation reports the violated rule, expected and actual values, and relevant cards where useful. The workbook is corrected manually before retrying.
