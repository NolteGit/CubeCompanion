import { describe, expect, it } from 'vitest'
import { selectBrowserLayout, sortLandCards, type BrowserLayoutContext } from '../../src/features/browser/resultLayouts'

const base: BrowserLayoutContext = {
  pool: 'draft', view: 'list', section: 'all', type: 'all',
  query: '', visibleCount: 408, groupCount: 8,
}

function layout(overrides: Partial<BrowserLayoutContext> = {}) {
  return selectBrowserLayout({ ...base, ...overrides })
}

describe('browser result layouts', () => {
  it('preserves full color columns for the cube and nonland type-only filters', () => {
    expect(layout()).toBe('columns')
    expect(layout({ type: 'enchantment', visibleCount: 21, groupCount: 7 })).toBe('columns')
    expect(layout({ type: 'artifact', visibleCount: 81, groupCount: 7 })).toBe('columns')
  })

  it('uses compact mana groups only for sparse single-color results', () => {
    expect(layout({ section: 'black', type: 'instant', visibleCount: 3, groupCount: 1 })).toBe('compact-mana')
    expect(layout({ section: 'blue', type: 'instant', visibleCount: 16, groupCount: 1 })).toBe('compact-mana')
    expect(layout({ section: 'white', visibleCount: 50, groupCount: 1 })).toBe('mana')
    expect(layout({ section: 'green', visibleCount: 50, groupCount: 1 })).toBe('mana')
  })

  it('uses guilds for multicolor selections and a simple list for lands', () => {
    expect(layout({ section: 'multicolor', visibleCount: 40, groupCount: 1 })).toBe('guilds')
    expect(layout({ section: 'multicolor', type: 'creature', visibleCount: 23, groupCount: 1 })).toBe('guilds')
    expect(layout({ type: 'land', visibleCount: 60, groupCount: 1 })).toBe('lands')
  })

  it('keeps commander mana layouts and image view unchanged', () => {
    expect(layout({ pool: 'commanders', section: 'blue', visibleCount: 3, groupCount: 1 })).toBe('commander-mana')
    expect(layout({ view: 'images', section: 'black', type: 'instant', visibleCount: 3, groupCount: 1 })).toBe('images')
    expect(layout({ query: 'sword', visibleCount: 6, groupCount: 3 })).toBe('grouped')
  })

  it('sorts lands alphabetically without changing the original order', () => {
    const cards = [
      { name: 'Tundra', sourceIndex: 2 },
      { name: 'Ancient Tomb', sourceIndex: 0 },
      { name: 'Misty Rainforest', sourceIndex: 1 },
    ]
    expect(sortLandCards(cards).map((card) => card.name)).toEqual([
      'Ancient Tomb', 'Misty Rainforest', 'Tundra',
    ])
    expect(cards[0].name).toBe('Tundra')
  })
})
