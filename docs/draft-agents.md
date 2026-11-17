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
`chooseAgentPick` prioritizes cards within commander color identity,
preferring nonlands before lands. A random value from the existing draft engine
breaks ties, so a fixed seed produces reproducible picks. When there are no
legal picks, the agent takes a fallback card and later sets it aside.

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

Possible configurable policies include mana-curve targets, creature counts,
archetype/synergy scoring, fixing/ramp, interaction, and signals from already
drafted cards. Keep such policies in `agents.ts` and add isolated domain
tests rather than changing the pack-passing engine.
