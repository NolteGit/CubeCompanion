import { describe, expect, it } from 'vitest'
import { agentCurveCenter, buildAgentDeck, chooseAgentPick, createDraftAgents, fixingLandColors, AGENT_RULES } from '../../src/domain/draft/agents'
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


describe('lightweight playable-pick heuristics', () => {
  const commander3 = { ...card('esper-commander', ['W', 'U', 'B']), manaValue: 5 }
  const commander2 = { ...card('azorius-commander', ['W', 'U']), manaValue: 2 }
  const fixingDual = {
    ...card('dual-land', ['W', 'U'], true),
    typeLine: 'Land',
    oracleText: '{T}: Add {W} or {U}.',
  }
  const fetchedDual = {
    ...card('fetchland', [], true),
    typeLine: 'Land',
    oracleText: '{T}, Pay 1 life, Sacrifice this land: Search your library for a Plains or Island card, put it onto the battlefield, then shuffle.',
  }
  const anyColor = {
    ...card('any-color', [], true),
    typeLine: 'Land',
    oracleText: '{T}: Add one mana of any color.',
  }
  const spell = {
    ...card('castable', ['U']), manaValue: 3, manaCost: '{2}{U}', typeLine: 'Creature — Wizard',
  }

  it('recognizes duals, fetchlands, triomes and any-color lands without external tags', () => {
    expect(fixingLandColors(fixingDual, [commander3])).toEqual(['W', 'U'])
    expect(fixingLandColors(fetchedDual, [commander3])).toEqual(['W', 'U'])
    expect(fixingLandColors(anyColor, [commander3])).toEqual(['W', 'U', 'B'])
    expect(fixingLandColors({
      ...card('triome', ['W', 'U', 'B'], true),
      typeLine: 'Land — Plains Island Swamp',
      oracleText: '({T}: Add {W}, {U}, or {B}.)',
    }, [commander3])).toEqual(['W', 'U', 'B'])
    expect(fixingLandColors({
      ...card('utility', [], true),
      typeLine: 'Land', oracleText: '{T}: Add {C}.',
    }, [commander3])).toEqual([])
    expect(fixingLandColors({
      ...card('basic-cycle', [], true),
      typeLine: 'Land', oracleText: 'Basic landcycling {1}',
    }, [commander2])).toEqual(['W', 'U'])
  })

  it('prioritizes a sixth 3-color fixer, but returns to spells once the soft target is met', () => {
    const pack = [spell, fetchedDual]
    expect(chooseAgentPick(pack, [], [commander3], 0)).toBe(1)
    const fiveFixers = Array.from({ length: 5 }, (_, index) => ({
      ...fixingDual, oracleId: 'fixer-' + index, name: 'fixer-' + index,
    }))
    expect(chooseAgentPick(pack, fiveFixers, [commander3], 0)).toBe(1)
    expect(chooseAgentPick(pack, [...fiveFixers, anyColor], [commander3], 0)).toBe(0)
  })

  it('prefers a low curve for cheap commanders and a higher one for expensive commanders', () => {
    const cheapCommander = { ...card('cheap-commander', ['W']), manaValue: 2 }
    const expensiveCommander = { ...card('expensive-commander', ['W']), manaValue: 6 }
    const cheapCard = {
      ...card('cheap', ['W']), manaValue: 2, manaCost: '{1}{W}', typeLine: 'Creature',
    }
    const expensiveCard = {
      ...card('expensive', ['W']), manaValue: 4, manaCost: '{3}{W}', typeLine: 'Creature',
    }
    expect(agentCurveCenter([cheapCommander])).toBe(2.3)
    expect(agentCurveCenter([expensiveCommander])).toBe(3.7)
    expect(chooseAgentPick([cheapCard, expensiveCard], [], [cheapCommander], 0)).toBe(0)
    expect(chooseAgentPick([cheapCard, expensiveCard], [], [expensiveCommander], 0)).toBe(1)
  })

  it('penalizes demanding colored pips more heavily for three-color commanders', () => {
    const easier = {
      ...card('single-colored', ['W']), manaValue: 3, manaCost: '{2}{W}', typeLine: 'Creature',
    }
    const harder = {
      ...card('triple-colored', ['W']), manaValue: 3, manaCost: '{W}{W}{W}', typeLine: 'Creature',
    }
    const multi = {
      ...card('three-color-pips', ['W', 'U', 'B']), manaValue: 3, manaCost: '{W}{U}{B}', typeLine: 'Creature',
    }
    expect(chooseAgentPick([harder, easier], [], [commander3], 0)).toBe(1)
    expect(chooseAgentPick([multi, easier], [], [commander3], 0)).toBe(1)
    // Demanding mana costs remain preferable to off-color cards.
    expect(chooseAgentPick([multi, card('off-color', ['R'])], [], [commander3], 0)).toBe(0)
  })

  it('nudges the creature share without enforcing an inflexible deck quota', () => {
    const creature = {
      ...card('creature', ['U']), manaValue: 3, manaCost: '{2}{U}', typeLine: 'Creature',
    }
    const noncreature = {
      ...card('spell', ['U']), manaValue: 3, manaCost: '{2}{U}', typeLine: 'Instant',
    }
    const tenNoncreatures = Array.from({ length: 10 }, (_, i) => ({
      ...noncreature, oracleId: 'noncreature-' + i,
    }))
    const tenCreatures = Array.from({ length: 10 }, (_, i) => ({
      ...creature, oracleId: 'creature-' + i,
    }))
    expect(chooseAgentPick([noncreature, creature], tenNoncreatures, [commander2], 0)).toBe(1)
    expect(chooseAgentPick([noncreature, creature], tenCreatures, [commander2], 0)).toBe(0)
  })

  it('retains drafted fixing in the finished deck ahead of incidental utility lands', () => {
    const spells = Array.from({ length: 35 }, (_, index) => ({
      ...spell, oracleId: 'spell-' + index,
    }))
    const utilityLands = Array.from({ length: 25 }, (_, index) => ({
      ...card('utility-' + index, [], true),
      typeLine: 'Land', oracleText: '{T}: Add {C}.',
    }))
    const deck = buildAgentDeck([commander3], [...spells, ...utilityLands, anyColor])
    expect(deck.total).toBe(60)
    expect(deck.landCount).toBe(24)
    expect(deck.mainDeck.map((entry) => entry.oracleId)).toContain(anyColor.oracleId)
    expect(deck.valid).toBe(true)
  })
})
