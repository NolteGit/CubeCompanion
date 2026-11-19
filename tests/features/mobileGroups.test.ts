import { describe, expect, it } from 'vitest'
import { buildMobileGroups } from '../../src/features/browser/mobileGroups'
import type { BrowserCard, CardGroup } from '../../src/features/browser/types'

function card(name: string, manaValue: number, typeLine: string, guild?: string): BrowserCard {
  return {
    name, manaValue, typeLine,
    oracleId: name,
    ...(guild ? { draftAllocation: { guild } } : {}),
  } as BrowserCard
}

function group(key: string, cards: BrowserCard[]): CardGroup {
  return { key, label: key, cards }
}

function allCards(groups: ReturnType<typeof buildMobileGroups>): string[] {
  return groups.flatMap((g) => g.sections.flatMap((s) => s.cards.map((c) => c.name)))
}

describe('mobile cube list grouping', () => {
  it('keeps all cards in creature/noncreature sections with no filters', () => {
    const input = [
      card('Esper Sentinel', 1, 'Artifact Creature — Human'),
      card('Celestial Armor', 3, 'Artifact — Equipment'),
    ]
    const result = buildMobileGroups([group('white', input)], 'draft', 'all', 'all', '')
    expect(result[0].sections.map((s) => s.label)).toEqual(['Creature', 'Noncreature'])
    expect(allCards(result)).toHaveLength(input.length)
  })

  it('uses mana values without losing artifact creatures under the artifact filter', () => {
    const input = [
      card('Esper Sentinel', 1, 'Artifact Creature — Human'),
      card('Celestial Armor', 3, 'Artifact — Equipment'),
      card('Steel Seraph', 6, 'Artifact Creature — Angel'),
    ]
    const result = buildMobileGroups([group('white', input)], 'draft', 'white', 'artifact', '')
    expect(result[0].sections.map((s) => s.label)).toEqual([
      'Noncreature · MV 1', 'Noncreature · MV 3', 'Noncreature · MV 6',
    ])
    expect(allCards(result)).toHaveLength(input.length)
  })

  it('groups commanders by mana value when filtered and keeps the default compact', () => {
    const cards = [card('Commander A', 3, 'Legendary Creature'), card('Commander B', 5, 'Legendary Creature')]
    expect(buildMobileGroups([group('1-W', cards)], 'commanders', 'all', 'all', '')[0].sections).toHaveLength(1)
    expect(buildMobileGroups([group('1-W', cards)], 'commanders', '1-W', 'all', '')[0].sections.map((s) => s.label))
      .toEqual(['MV 3', 'MV 5'])
  })

  it('preserves multicolor guild groupings and sorts land-only results alphabetically', () => {
    const guildCards = [
      card('Guild A', 2, 'Creature', 'WU'),
      card('Guild B', 3, 'Creature', 'UB'),
    ]
    const guilds = buildMobileGroups([group('multicolor', guildCards)], 'draft', 'all', 'all', '')
    expect(guilds[0].sections.map((s) => s.label)).toEqual(['Azorius', 'Dimir'])
    expect(allCards(guilds)).toHaveLength(2)

    const lands = [card('Z Land', 0, 'Land'), card('A Land', 0, 'Land')]
    const landGroups = buildMobileGroups([group('land', lands)], 'draft', 'all', 'land', '')
    expect(allCards(landGroups)).toEqual(['A Land', 'Z Land'])
  })
})
