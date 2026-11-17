import { describe, expect, it } from 'vitest'
import { groupDraftDeck, MANA_VALUE_BUCKETS } from '../../src/domain/draft/overview'

interface TestCard {
  name: string
  manaValue: number
  typeLine: string
  isLand: boolean
}

function card(name: string, manaValue: number, typeLine: string, isLand = false): TestCard {
  return { name, manaValue, typeLine, isLand }
}

describe('draft deck visual overview', () => {
  it('sorts creatures above noncreatures by mana value from left to right', () => {
    const cards = [
      card('Seven-mana creature', 7, 'Creature — Dragon'),
      card('Arcane signet', 2, 'Artifact'),
      card('Three-mana creature', 3, 'Artifact Creature — Construct'),
      card('One-mana creature', 1, 'Legendary Creature — Soldier'),
      card('Eight-mana sorcery', 8, 'Sorcery'),
    ]
    const groups = groupDraftDeck(cards)
    expect(groups.columns.map((c) => c.label)).toEqual(MANA_VALUE_BUCKETS)
    expect(groups.columns[1].creatures.map((c) => c.name)).toEqual(['One-mana creature'])
    expect(groups.columns[3].creatures.map((c) => c.name)).toEqual(['Three-mana creature'])
    expect(groups.columns[2].noncreatures.map((c) => c.name)).toEqual(['Arcane signet'])
    expect(groups.columns[6].creatures.map((c) => c.name)).toEqual(['Seven-mana creature'])
    expect(groups.columns[6].noncreatures.map((c) => c.name)).toEqual(['Eight-mana sorcery'])
    expect(groups.creatureCount).toBe(3)
    expect(groups.noncreatureCount).toBe(2)
  })

  it('separates lands and preserves the source list', () => {
    const cards = [
      card('Breeding Pool', 0, 'Land — Forest Island', true),
      card('Walking land', 2, 'Land Creature — Elemental', true),
      card('Alpha', 2, 'Creature — Human'),
      card('Zero-cost', 0, 'Artifact'),
      card('Beta', 2, 'Creature — Human'),
    ]
    const originals = [...cards]
    const groups = groupDraftDeck(cards)
    expect(groups.lands.map((c) => c.name)).toEqual(['Breeding Pool', 'Walking land'])
    expect(groups.columns[2].creatures.map((c) => c.name)).toEqual(['Alpha', 'Beta'])
    expect(groups.columns[0].noncreatures.map((c) => c.name)).toEqual(['Zero-cost'])
    expect(cards).toEqual(originals)
  })

  it('sorts 6+ by actual mana value, and handles high and fractional values safely', () => {
    const groups = groupDraftDeck([
      card('Z 9', 9, 'Instant'), card('B 7', 7, 'Sorcery'),
      card('A 7', 7, 'Sorcery'), card('Minus', -1, 'Artifact'),
    ])
    expect(groups.columns[6].noncreatures.map((c) => c.name)).toEqual(['A 7', 'B 7', 'Z 9'])
    expect(groups.columns[0].noncreatures.map((c) => c.name)).toEqual(['Minus'])
  })
})
