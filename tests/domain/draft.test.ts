import { describe, expect, it } from 'vitest'
import { draftDirection, pickDraftCard, startDraft } from '../../src/domain/draft/engine'
import { checkDraftDeck, emptyBasicLands, isCommanderLegal } from '../../src/domain/draft/deck'
import type { CubeCard } from '../../src/domain'

const cards = Array.from({ length: 411 }, (_, index) => ({ oracleId: `card-${index}`, name: `Card ${index}`, colorIdentity: [], isLand: false }))

function completeDraft(players: number, packsPerPlayer: number, cardsPerPack: number) {
  let state = startDraft(cards, { players, packsPerPlayer, cardsPerPack, seed: 12345 })
  while (!state.complete) {
    state = pickDraftCard(state, state.packs[0][0].oracleId)
  }
  return state
}

describe('multiplayer draft engine', () => {
  it('deals unique packs and picks without repeating cards, including bots', () => {
    const draft = completeDraft(4, 4, 15)
    const all = draft.selections.flat()
    expect(draft.complete).toBe(true)
    expect(draft.selections.map((picks) => picks.length)).toEqual([60, 60, 60, 60])
    expect(new Set(all.map((card) => card.oracleId)).size).toBe(240)
  })

  it('reverses passing after each round', () => {
    let state = startDraft(cards, { players: 3, packsPerPlayer: 2, cardsPerPack: 3, seed: 9 })
    expect(draftDirection(state.round)).toBe('left')
    const sourceLeft = new Set(state.packs[2].map((card) => card.oracleId))
    state = pickDraftCard(state, state.packs[0][0].oracleId)
    expect(state.packs[0].every((card) => sourceLeft.has(card.oracleId))).toBe(true)
    for (let i = 0; i < 2; i += 1) state = pickDraftCard(state, state.packs[0][0].oracleId)
    expect(state.round).toBe(1)
    expect(draftDirection(state.round)).toBe('right')
    const sourceRight = new Set(state.packs[1].map((card) => card.oracleId))
    state = pickDraftCard(state, state.packs[0][0].oracleId)
    expect(state.packs[0].every((card) => sourceRight.has(card.oracleId))).toBe(true)
  })

  it('is reproducible by seed and does not mutate the previous state', () => {
    const initial = startDraft(cards, { players: 3, packsPerPlayer: 2, cardsPerPack: 3, seed: 67 })
    expect(startDraft(cards, { players: 3, packsPerPlayer: 2, cardsPerPack: 3, seed: 67 }).packs).toEqual(initial.packs)
    const before = initial.packs.map((pack) => [...pack])
    const next = pickDraftCard(initial, initial.packs[0][0].oracleId)
    expect(initial.packs).toEqual(before)
    expect(next.selections[0]).toHaveLength(1)
    expect(initial.selections[0]).toHaveLength(0)
    expect(() => pickDraftCard(initial, 'nonexistent')).toThrow()
  })

  it('rejects configurations exceeding the cube or invalid settings', () => {
    expect(() => startDraft(cards, { players: 8, packsPerPlayer: 4, cardsPerPack: 15 })).toThrow('needs 480')
    expect(() => startDraft(cards, { players: 1, packsPerPlayer: 4, cardsPerPack: 15 })).toThrow('2–8')
    expect(() => startDraft([...cards, cards[0]], { players: 2, packsPerPlayer: 3, cardsPerPack: 15 })).toThrow('duplicate')
    const complete = completeDraft(2, 1, 2)
    expect(() => pickDraftCard(complete, cards[0].oracleId)).toThrow('already complete')
  })
})

describe('60-card commander draft deck', () => {
  const commander: CubeCard = { oracleId: 'commander', name: 'Commander', colorIdentity: ['W', 'U'], isLand: false }
  const pool: CubeCard[] = [
    { oracleId: 'legal', name: 'Legal', colorIdentity: ['U'], isLand: false },
    { oracleId: 'illegal', name: 'Illegal', colorIdentity: ['R'], isLand: false },
  ]

  it('accepts 1 commander + 1 pick + 58 external basics', () => {
    const basics = emptyBasicLands()
    basics.Plains = 29
    basics.Island = 29
    expect(checkDraftDeck(commander, pool, new Set(['legal']), basics)).toEqual({ valid: true, total: 60, issues: [] })
  })

  it('flags off-color cards, off-color basics, unknown cards, and wrong counts', () => {
    const basics = emptyBasicLands()
    basics.Mountain = 58
    const result = checkDraftDeck(commander, pool, new Set(['illegal', 'not-drafted']), basics)
    expect(result.valid).toBe(false)
    expect(result.issues.join(' ')).toContain('outside your drafted pool')
    expect(result.issues.join(' ')).toContain('Illegal')
    expect(result.issues.join(' ')).toContain('Mountain')
    expect(isCommanderLegal(pool[0], commander)).toBe(true)
    expect(isCommanderLegal(pool[1], commander)).toBe(false)
  })
})
