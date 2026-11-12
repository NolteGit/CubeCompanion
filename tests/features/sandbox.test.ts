import { describe, expect, it } from 'vitest'
import type { BrowserCard } from '../../src/features/browser/types'
import { lookupSandboxCard } from '../../src/features/sandbox/scryfall'
import {
  applySandboxCard,
  createSandboxState,
  removeSandboxCard,
  sandboxChangeCount,
  sandboxDiff,
} from '../../src/features/sandbox/state'
import { loadSandboxState, saveSandboxState } from '../../src/features/sandbox/storage'

function card(
  oracleId: string,
  name: string,
  overrides: Partial<BrowserCard> = {},
): BrowserCard {
  return {
    oracleId,
    name,
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

describe('sandbox state', () => {
  const officialDraft = [
    card('white', 'White card', { sourceIndex: 0, draftAllocation: { section: 'white' } }),
    card('blue', 'Blue card', { sourceIndex: 1, draftAllocation: { section: 'blue' } }),
  ]
  const officialCommanders = [card('commander', 'Commander')]

  it('tracks additions, removals, and reallocations from the official snapshot', () => {
    let state = createSandboxState('snapshot', officialDraft, officialCommanders)
    state = applySandboxCard(state, officialDraft[1], {
      pool: 'draft',
      draftAllocation: { section: 'colorless' },
    })
    state = applySandboxCard(state, card('new', 'New card'), {
      pool: 'draft',
      draftAllocation: { section: 'green' },
    })
    state = removeSandboxCard(state, 'commander', 'commander')

    const diff = sandboxDiff(state, officialDraft, officialCommanders)

    expect(diff.addedDraft.map((entry) => entry.name)).toEqual(['New card'])
    expect(diff.reallocatedDraft[0]).toMatchObject({
      card: { name: 'Blue card' },
      from: 'Blue',
      to: 'Colorless',
    })
    expect(diff.removedCommanders.map((entry) => entry.name)).toEqual(['Commander'])
    expect(sandboxChangeCount(diff)).toBe(3)
  })

  it('persists only sandbox states based on the current official snapshot', () => {
    const values = new Map<string, string>()
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
    }
    const state = createSandboxState('current', officialDraft, officialCommanders)
    saveSandboxState(state, storage)

    expect(loadSandboxState('current', [], [], storage).draftCards).toHaveLength(2)
    expect(loadSandboxState('new-snapshot', [], [], storage).draftCards).toHaveLength(0)
  })
})

describe('sandbox Scryfall lookup', () => {
  it('normalizes one fuzzy named-card response for browser use', async () => {
    const fetchImpl = (async () => new Response(JSON.stringify({
      oracle_id: 'bolt-id',
      name: 'Lightning Bolt',
      color_identity: ['R'],
      cmc: 1,
      mana_cost: '{R}',
      type_line: 'Instant',
      oracle_text: 'Lightning Bolt deals 3 damage to any target.',
      image_uris: { normal: 'https://example.test/bolt.jpg' },
      scryfall_uri: 'https://scryfall.com/card/test/bolt',
    }), { status: 200 })) as typeof fetch

    const result = await lookupSandboxCard('lightning bol', fetchImpl)

    expect(result).toMatchObject({
      oracleId: 'bolt-id',
      name: 'Lightning Bolt',
      colorIdentity: ['R'],
      manaValue: 1,
      imageUri: 'https://example.test/bolt.jpg',
    })
  })
})
