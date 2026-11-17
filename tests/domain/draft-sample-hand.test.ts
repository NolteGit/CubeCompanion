import { describe, expect, it } from 'vitest'
import { emptyBasicLands } from '../../src/domain/draft/deck'
import { sampleDeckCards, shuffleSampleDeck } from '../../src/domain/draft/sampleHand'

const cards = [
  { oracleId: 'one', name: 'First', manaCost: '{W}', typeLine: 'Creature' },
  { oracleId: 'two', name: 'Second', manaCost: '{2}', typeLine: 'Artifact' },
]

describe('sample hand', () => {
  it('uses only selected deck cards and creates an independent entry for every basic land', () => {
    const basics = { ...emptyBasicLands(), Plains: 3, Island: 1 }
    const library = sampleDeckCards(cards, basics)
    expect(library).toHaveLength(6)
    expect(library.map((card) => card.name)).toEqual(['First', 'Second', 'Plains', 'Plains', 'Plains', 'Island'])
    expect(new Set(library.map((card) => card.id)).size).toBe(6)
    expect(library.filter((card) => card.basicLand)).toHaveLength(4)
    expect(cards).toHaveLength(2)
    expect(basics.Plains).toBe(3)
  })

  it('shuffles without replacement or modifying its source', () => {
    const original = sampleDeckCards(cards, { ...emptyBasicLands(), Wastes: 9 })
    const shuffled = shuffleSampleDeck(original, () => 0)
    expect(shuffled).toHaveLength(original.length)
    expect(shuffled.map((card) => card.id)).not.toEqual(original.map((card) => card.id))
    expect(new Set(shuffled.map((card) => card.id))).toEqual(new Set(original.map((card) => card.id)))
    expect(original[0].name).toBe('First')
    expect(shuffled.slice(0, 7)).toHaveLength(7)
    expect(shuffled.slice(0, 8)).toHaveLength(8)
    expect(shuffled.slice(0, 100)).toHaveLength(original.length)
  })

  it('handles an empty main deck', () => {
    expect(sampleDeckCards([], emptyBasicLands())).toEqual([])
    expect(shuffleSampleDeck([])).toEqual([])
  })
})
