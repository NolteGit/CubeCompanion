import { describe, expect, it } from 'vitest'
import { buildAgentDeck, chooseAgentPick, createDraftAgents, AGENT_RULES } from '../../src/domain/draft/agents'
import { checkDraftDeck } from '../../src/domain/draft/deck'
import { pickDraftCard, startDraft } from '../../src/domain/draft/engine'
import type { CubeCard } from '../../src/domain/cube/types'

const card = (id: string, colors: CubeCard['colorIdentity'], isLand = false): CubeCard => ({
  oracleId: id, name: id, colorIdentity: colors, isLand,
})
const mono = [
  card('w1', ['W']), card('w2', ['W']), card('w3', ['W']),
  card('u1', ['U']), card('u2', ['U']), card('b1', ['B']), card('r1', ['R']), card('g1', ['G']),
]
const multi = [card('wu', ['W', 'U']), card('br', ['B', 'R']), card('wg', ['W', 'G']), card('ubg', ['U', 'B', 'G'])]
const commanders = [...mono, ...multi]

describe('draft agents', () => {
  it('assigns seeded, distinct commanders, never using the human offer', () => {
    const excluded = new Set(['w1', 'wu'])
    const first = createDraftAgents(commanders, 4, 321, excluded)
    expect(createDraftAgents(commanders, 4, 321, excluded)).toEqual(first)
    expect(first.map((agent) => agent.seat)).toEqual([1, 2, 3, 4])
    const chosen = first.flatMap((agent) => agent.commanders)
    expect(new Set(chosen.map((entry) => entry.oracleId)).size).toBe(chosen.length)
    expect(chosen.every((entry) => !excluded.has(entry.oracleId))).toBe(true)
    for (const agent of first) {
      expect(
        (agent.commanders.length === 1 && agent.commanders[0].colorIdentity.length >= 2)
        || (agent.commanders.length === 2 && agent.commanders.every((entry) => entry.colorIdentity.length === 1)),
      ).toBe(true)
    }
  })

  it('prefers playable nonlands and respects the drafted-land cap when picking', () => {
    const cmd = [card('commander', ['W', 'U'])]
    const pack = [card('off-color', ['R']), card('good', ['W']), card('land', ['U'], true)]
    expect(chooseAgentPick(pack, [], cmd, 0)).toBe(1)
    expect(chooseAgentPick([pack[0], pack[2]], [], cmd, 0)).toBe(1)
    const drafted = Array.from({ length: 25 }, (_, index) => card(`land-${index}`, ['W'], true))
    expect(chooseAgentPick([pack[0], pack[2]], drafted, cmd, 0)).toBe(0)
  })

  it('builds a 60-card legal deck with no more than 25 lands and a real side pool', () => {
    const cmd = card('commander', ['W', 'U'])
    const nonlands = Array.from({ length: 40 }, (_, index) => card(`spell-${index}`, ['U']))
    const lands = Array.from({ length: 10 }, (_, index) => card(`dual-land-${index}`, ['W', 'U'], true))
    const offColor = Array.from({ length: 5 }, (_, index) => card(`red-${index}`, ['R']))
    const deck = buildAgentDeck([cmd], [...nonlands, ...lands, ...offColor])
    expect(deck.total).toBe(60)
    expect(deck.valid).toBe(true)
    expect(deck.landCount).toBe(AGENT_RULES.targetLands)
    expect(deck.landCount).toBeLessThanOrEqual(AGENT_RULES.maxLands)
    expect(deck.mainDeck).toHaveLength(45)
    expect(deck.sidePool).toHaveLength(10)
    const selected = new Set(deck.mainDeck.map((entry) => entry.oracleId))
    expect(checkDraftDeck([cmd], [...nonlands, ...lands, ...offColor], selected, deck.basics).valid).toBe(true)
    expect(deck.basics.Plains + deck.basics.Island).toBe(14)
  })

  it('handles mono pairs and reports impossible decks without cheating the land cap', () => {
    const spells = Array.from({ length: 33 }, (_, index) => card(`spell-${index}`, ['W']))
    const deck = buildAgentDeck([mono[0], mono[3]], spells)
    expect(deck.total).toBe(60)
    expect(deck.valid).toBe(true)
    expect(deck.landCount).toBe(25)
    const impossible = buildAgentDeck([mono[0]], spells.slice(0, 20))
    expect(impossible.total).toBe(46)
    expect(impossible.valid).toBe(false)
    expect(impossible.landCount).toBe(25)
    expect(impossible.issues.join(' ')).toContain('Not enough drafted nonland')
  })

  it('allows custom picks while keeping passing, uniqueness and seeded replay intact', () => {
    const pool = Array.from({ length: 90 }, (_, index) => card(`pool-${index}`, index % 2 === 0 ? ['W'] : ['R']))
    const play = () => {
      let draft = startDraft(pool, { players: 3, packsPerPlayer: 2, cardsPerPack: 10, seed: 919 })
      while (!draft.complete) {
        draft = pickDraftCard(draft, draft.packs[0][0].oracleId, (pack, _seat, picks, roll) =>
          chooseAgentPick(pack, picks, [mono[0]], roll))
      }
      return draft
    }
    const result = play()
    expect(result).toEqual(play())
    expect(result.selections.map((picks) => picks.length)).toEqual([20, 20, 20])
    expect(new Set(result.selections.flat().map((pick) => pick.oracleId)).size).toBe(60)
  })
})
