import { groupColorManaCards, groupManaValueCards } from './manaColumns'
import { sortLandCards } from './resultLayouts'
import type { BrowserCard, BrowserPool, CardGroup, CardTypeFilter } from './types'

export interface MobileSection {
  key: string
  label: string
  cards: BrowserCard[]
}

export interface MobileGroup {
  key: string
  label: string
  count: number
  sections: MobileSection[]
}

const GUILDS: Readonly<Record<string, string>> = {
  WU: 'Azorius', UB: 'Dimir', BR: 'Rakdos', RG: 'Gruul', WG: 'Selesnya',
  WB: 'Orzhov', UR: 'Izzet', BG: 'Golgari', WR: 'Boros', UG: 'Simic',
}

function makeSections(
  group: CardGroup,
  pool: BrowserPool,
  section: string,
  type: CardTypeFilter,
  query: string,
): MobileSection[] {
  const filtered = section !== 'all' || type !== 'all' || Boolean(query.trim())

  if (pool === 'commanders') {
    if (!filtered) return [{ key: 'commanders', label: 'Commanders', cards: group.cards }]
    return groupManaValueCards(group.cards)
      .filter(({ cards }) => cards.length > 0)
      .map(({ label, cards }) => ({ key: `mv-${label}`, label: `MV ${label}`, cards }))
  }

  if (type === 'land') {
    return [{ key: 'lands', label: 'Lands', cards: sortLandCards(group.cards) }]
  }

  if (group.key === 'multicolor' || group.key === 'land') {
    const byGuild = new Map<string, BrowserCard[]>()
    for (const card of group.cards) {
      const key = card.draftAllocation?.guild ?? 'other'
      const cards = byGuild.get(key) ?? []
      cards.push(card)
      byGuild.set(key, cards)
    }
    return [...byGuild.entries()].map(([key, cards]) => ({
      key: `guild-${key}`,
      label: GUILDS[key] ?? (key === 'other' ? 'Other' : key),
      cards,
    }))
  }

  if (filtered) {
    return groupColorManaCards(group.cards, type).flatMap(({ label, creatures, noncreatures }) => {
      const sections: MobileSection[] = []
      if (creatures.length) {
        sections.push({ key: `creatures-${label}`, label: `Creature · MV ${label}`, cards: creatures })
      }
      if (noncreatures.length) {
        sections.push({ key: `noncreatures-${label}`, label: `Noncreature · MV ${label}`, cards: noncreatures })
      }
      return sections
    })
  }

  const creatures = group.cards.filter((card) => card.typeLine.includes('Creature'))
  const noncreatures = group.cards.filter((card) => !card.typeLine.includes('Creature'))
  return [
    { key: 'creatures', label: 'Creature', cards: creatures },
    { key: 'noncreatures', label: 'Noncreature', cards: noncreatures },
  ].filter(({ cards }) => cards.length > 0)
}

/** Preserve all matching cards while using stacked sections rather than desktop columns. */
export function buildMobileGroups(
  groups: readonly CardGroup[],
  pool: BrowserPool,
  section: string,
  type: CardTypeFilter,
  query: string,
): MobileGroup[] {
  return groups.filter((group) => group.cards.length > 0).map((group) => ({
    key: group.key,
    label: group.label,
    count: group.cards.length,
    sections: makeSections(group, pool, section, type, query),
  }))
}
