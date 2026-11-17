import { describe, expect, it } from 'vitest'
import { groupColorManaCards, groupManaValueCards, MANA_VALUE_LABELS } from '../../src/features/browser/manaColumns'

const cards = [
  { name: 'Steel Seraph', manaValue: 6, typeLine: 'Artifact Creature — Angel' },
  { name: 'Celestial Armor', manaValue: 3, typeLine: 'Artifact — Equipment' },
  { name: 'Esper Sentinel', manaValue: 1, typeLine: 'Artifact Creature — Human Soldier' },
  { name: 'Lion Sash', manaValue: 2, typeLine: 'Artifact Creature — Equipment Cat' },
  { name: 'The Wandering Emperor', manaValue: 4, typeLine: 'Legendary Planeswalker' },
]

describe('cube browser filtered color layout', () => {
  it('uses 0–7+ buckets with creatures first and noncreatures below', () => {
    const columns = groupColorManaCards(cards)
    expect(columns.map((column) => column.label)).toEqual(MANA_VALUE_LABELS)
    expect(columns[1].creatures.map((card) => card.name)).toEqual(['Esper Sentinel'])
    expect(columns[2].creatures.map((card) => card.name)).toEqual(['Lion Sash'])
    expect(columns[6].creatures.map((card) => card.name)).toEqual(['Steel Seraph'])
    expect(columns[3].noncreatures.map((card) => card.name)).toEqual(['Celestial Armor'])
    expect(columns[4].noncreatures.map((card) => card.name)).toEqual(['The Wandering Emperor'])
    expect(cards[0].name).toBe('Steel Seraph')
  })

  it('puts all matching artifacts in Noncreature when Artifact filter is selected', () => {
    const artifacts = cards.filter((card) => card.typeLine.includes('Artifact'))
    const columns = groupColorManaCards(artifacts, 'artifact')
    expect(columns.flatMap((column) => column.creatures)).toEqual([])
    expect(columns.flatMap((column) => column.noncreatures).map((card) => card.name)).toEqual([
      'Esper Sentinel', 'Lion Sash', 'Celestial Armor', 'Steel Seraph',
    ])
  })

  it('groups mana values of 7 or more in the last column', () => {
    const columns = groupColorManaCards([
      { name: 'Big Creature', manaValue: 7, typeLine: 'Creature — Eldrazi' },
      { name: 'Bigger Creature', manaValue: 9, typeLine: 'Creature — Eldrazi' },
      { name: 'Token Maker', manaValue: 0, typeLine: 'Artifact' },
    ])
    expect(columns[7].creatures.map((card) => card.name)).toEqual(['Big Creature', 'Bigger Creature'])
    expect(columns[0].noncreatures.map((card) => card.name)).toEqual(['Token Maker'])
  })

  it('groups commanders by mana value in one row regardless of card type', () => {
    const commanders = [
      { name: 'Five-mana planeswalker', manaValue: 5, typeLine: 'Legendary Planeswalker' },
      { name: 'Three-mana creature', manaValue: 3, typeLine: 'Legendary Creature' },
      { name: 'A three-mana artifact', manaValue: 3, typeLine: 'Legendary Artifact' },
      { name: 'Seven-mana creature', manaValue: 7, typeLine: 'Legendary Creature' },
      { name: 'Eight-mana creature', manaValue: 8, typeLine: 'Legendary Creature' },
    ]
    const columns = groupManaValueCards(commanders)
    expect(columns.map((column) => column.label)).toEqual(MANA_VALUE_LABELS)
    expect(columns[3].cards.map((card) => card.name)).toEqual(['A three-mana artifact', 'Three-mana creature'])
    expect(columns[5].cards.map((card) => card.name)).toEqual(['Five-mana planeswalker'])
    expect(columns[7].cards.map((card) => card.name)).toEqual(['Seven-mana creature', 'Eight-mana creature'])
    expect(columns.reduce((sum, column) => sum + column.cards.length, 0)).toBe(commanders.length)
    expect(commanders[0].name).toBe('Five-mana planeswalker')
  })
})
