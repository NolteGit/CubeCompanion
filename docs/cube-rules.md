# Cube Rules

These rules define whether an extracted source workbook may be released.

## Draft pool

Hard limits:

- 50 cards for each mono-color identity: W, U, B, R, G
- 4 cards for each two-color identity
- no three-, four-, or five-color cards
- singleton by logical card identity
- no card may also occur in the active commander pool

Flexible hard ranges:

- colorless: target 61, allowed 51-71
- lands: target 60, allowed 50-70
- total draft pool: target 411, allowed 391-431

Color categorization follows Commander color identity. A colored land belongs to its color identity. Hybrid symbols contribute all represented colors.

## Commander pool

- singleton by logical card identity
- no overlap with the draft pool
- all five mono-color identities must have equal counts
- all ten dual-color identities must have equal counts
- all ten triple-color identities must have equal counts
- colorless commanders are allowed without a symmetry requirement
- Partner-specific deck rules are intentionally out of scope

## Release behavior

Any hard-rule violation blocks release. Validation reports the violated rule, expected and actual values, and relevant cards where useful. The workbook is corrected manually before retrying.
