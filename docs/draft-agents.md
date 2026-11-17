# Draft agents (foundation)

The draft simulator keeps seat 0 as the human player. Seats 1–7 are controlled
by independently assigned agents. The original pack deal and alternating pass
direction are unchanged.

## Commander assignments

At the start of a new draft, each agent receives either:

- One commander with a color identity of at least two colors, or
- Two distinct monocolor commanders. Different colors are preferred.

These configurations are deliberately simpler than all supported human
commander combinations. Agents do not receive colorless commanders or
multicolor Partner combinations yet. Commander assignments use the draft seed,
avoid the human's five-card commander offer, and do not repeat between agents.

## Picks and deck building

`src/domain/draft/agents.ts` owns all current agent policy. `AGENT_RULES`
defines the 60-card deck size, target of 24 lands, and absolute cap of 25.
`chooseAgentPick` applies deliberately lightweight, deterministic scoring
to cards within the commander's color identity. It does **not** rate individual
card power, attempt archetype synergy, or require curated tags. It uses
already-published Scryfall mana value, mana cost, type line and Oracle text.

- **Color identity:** Off-color nonlands and lands remain fallback picks only.
- **Mana fixing:** For three-color (or more) commanders, useful dual/tri-color
  lands are strongly prioritized until the agent has approximately six. This
  is a *soft* target of roughly 5–7 fixing lands, not a guaranteed quota.
  Two-color decks have a smaller three-fixing-land soft target. Basic typed
  duals, fetchlands, basic-landcycling, and any-color-producing lands are
  recognized from generic card text. Lands that only produce colorless mana
  are not counted as fixing.
- **Colored costs:** Each fixed colored mana symbol beyond the first reduces a
  card's score, especially in three-color decks. Repeated symbols of one color
  carry a further penalty. Hybrid/Phyrexian symbols count less than fixed pips.
  Generic mana does not incur a colored-cost penalty.
- **Mana curve:** All agents retain a gentle preference for mana value 2–3
  (centered around 2.5), regardless of commander cost. Higher-cost commanders
  only get a small allowance to take some 4+ mana spells. A mild penalty for
  repeated mana values and already-drafted 5+ mana cards discourages a top-heavy
  pile without forcing a distribution. The curve bonus is intentionally much
  weaker than colored mana constraints or early three-color fixing needs.
- **Creatures:** A soft 50–70% creature preference among drafted nonlands
  nudges future picks if the deck drifts below or above that range. It never
  rejects otherwise legal picks or forces a deck-building quota.

The existing seeded random roll breaks equal-score ties. If no on-color pick
is available, the agent can pick an off-color card for its side pool.
Useful drafted fixing lands are prioritized over less useful drafted lands
when the final 24–25 land slots are assigned.

`buildAgentDeck` selects legal cards from that agent's own picks, adds
basics from outside the cube, and uses the shared `checkDraftDeck` validation.
The commander(s) are included in the 60-card count and omitted from sample
hands. Drafted lands and basics together never exceed 25.

A legal 60-card deck cannot be guaranteed by every pack composition or
commander color identity, particularly in 45-pick drafts. An incomplete deck
is retained and explicitly reported rather than violating commander identity
or the land cap. The underlying picks remain available in the side pool.

## Visibility and storage

During drafting the opponent section is collapsed, and revealing it takes
two deliberate clicks. Collapsing it resets the spoiler confirmation. Once
the last draft pick is made, the opponent decks open without a spoiler gate.
Each opponent has a read-only deck board, side pool, and sample-hand preview.

Browser session storage schema v4 adds agent assignments. v1–v3 sessions
are migrated in place and are assigned seeded agents when necessary.
Earlier bot picks remain intact, and later picks use the new agent policy.
No server state or cube release data is changed.

## Next iteration

The current heuristics aim for justifiable picks and playable mana bases,
not optimal deck composition. Further heuristics should stay optional and
generic. Ramp, removal and commander-specific synergy are intentionally
outside the current strategy. Tune these small scoring weights in
`agents.ts` and cover new behavior with independent domain tests.
