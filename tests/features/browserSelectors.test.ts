import { describe, expect, it } from 'vitest'
import type { BrowserCard } from '../../src/features/browser/types'
import { filterAndSortCards, groupCards } from '../../src/features/browser/selectors'

function card(overrides: Partial<BrowserCard> & Pick<BrowserCard, 'name' | 'oracleId'>): BrowserCard {
  return {
    name: overrides.name,
    oracleId: overrides.oracleId,
    colorIdentity: [],
    isLand: false,
    sourceIndex: 0,
    manaValue: 0,
    manaCost: '',
    typeLine: 'Artifact',
    oracleText: '',
    scryfallUri: '',
    ...overrides,
  }
}

describe('cube browser selectors', () => {
  it('filters draft cards by workbook allocation rather than color identity', () => {
    const shackles = card({
      oracleId: 'shackles',
      name: 'Vedalken Shackles',
      colorIdentity: [],
      draftAllocation: { section: 'blue' },
    })
    const result = filterAndSortCards([shackles], 'draft', {
      query: '',
      section: 'blue',
      type: 'all',
      sort: 'cube',
    })

    expect(result).toEqual([shackles])
  })

  it('searches name, type, and rules text and sorts by mana value', () => {
    const cards = [
      card({ oracleId: 'b', name: 'Second', manaValue: 4, oracleText: 'draw a card' }),
      card({ oracleId: 'a', name: 'First', manaValue: 2, typeLine: 'Creature — Wizard' }),
    ]

    expect(filterAndSortCards(cards, 'draft', {
      query: 'wizard', section: 'all', type: 'all', sort: 'mana',
    }).map((entry) => entry.name)).toEqual(['First'])
    expect(filterAndSortCards(cards, 'draft', {
      query: '', section: 'all', type: 'all', sort: 'mana',
    }).map((entry) => entry.name)).toEqual(['First', 'Second'])
  })

  it('groups commanders by exact color identity', () => {
    const groups = groupCards([
      card({ oracleId: 'w', name: 'White', colorIdentity: ['W'] }),
      card({ oracleId: 'wu', name: 'Azorius', colorIdentity: ['U', 'W'] }),
    ], 'commanders')

    expect(groups.map((group) => group.label)).toEqual(['W', 'WU'])
  })
})
