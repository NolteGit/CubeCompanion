import { colorIdentityKey, colorIdentitySize } from '../../domain'
import type {
  BrowserCard,
  BrowserFilters,
  BrowserPool,
  CardGroup,
  CardTypeFilter,
  SectionOption,
} from './types'

export const DRAFT_SECTION_OPTIONS: readonly SectionOption[] = [
  { value: 'all', label: 'All sections' },
  { value: 'white', label: 'White' },
  { value: 'blue', label: 'Blue' },
  { value: 'black', label: 'Black' },
  { value: 'red', label: 'Red' },
  { value: 'green', label: 'Green' },
  { value: 'multicolor', label: 'Multicolor' },
  { value: 'colorless', label: 'Colorless' },
  { value: 'land', label: 'Lands' },
]

export const COMMANDER_SECTION_OPTIONS: readonly SectionOption[] = [
  { value: 'all', label: 'All commanders' },
  { value: 'mono', label: 'Mono-color' },
  { value: 'dual', label: 'Two-color' },
  { value: 'triple', label: 'Three-color' },
  { value: 'colorless', label: 'Colorless' },
  { value: 'four-plus', label: 'Four / five-color' },
]

export const CARD_TYPE_OPTIONS: readonly { value: CardTypeFilter; label: string }[] = [
  { value: 'all', label: 'All card types' },
  { value: 'creature', label: 'Creature' },
  { value: 'instant', label: 'Instant' },
  { value: 'sorcery', label: 'Sorcery' },
  { value: 'artifact', label: 'Artifact' },
  { value: 'enchantment', label: 'Enchantment' },
  { value: 'planeswalker', label: 'Planeswalker' },
  { value: 'land', label: 'Land' },
]

function matchesSection(card: BrowserCard, pool: BrowserPool, section: string): boolean {
  if (section === 'all') return true

  if (pool === 'draft') {
    return card.draftAllocation?.section === section
  }

  const size = colorIdentitySize(card.colorIdentity)
  if (section === 'colorless') return size === 0
  if (section === 'mono') return size === 1
  if (section === 'dual') return size === 2
  if (section === 'triple') return size === 3
  return section === 'four-plus' && size >= 4
}

function matchesType(card: BrowserCard, type: CardTypeFilter): boolean {
  return type === 'all' || card.typeLine.toLocaleLowerCase('en-US').includes(type)
}

function matchesQuery(card: BrowserCard, query: string): boolean {
  const normalized = query.trim().toLocaleLowerCase('en-US')
  if (!normalized) return true

  return `${card.name}\n${card.typeLine}\n${card.oracleText}`
    .toLocaleLowerCase('en-US')
    .includes(normalized)
}

export function filterAndSortCards(
  cards: readonly BrowserCard[],
  pool: BrowserPool,
  filters: BrowserFilters,
): BrowserCard[] {
  const result = cards.filter(
    (card) =>
      matchesSection(card, pool, filters.section) &&
      matchesType(card, filters.type) &&
      matchesQuery(card, filters.query),
  )

  if (filters.sort === 'name') {
    return result.sort((left, right) => left.name.localeCompare(right.name))
  }
  if (filters.sort === 'mana') {
    return result.sort(
      (left, right) => left.manaValue - right.manaValue || left.name.localeCompare(right.name),
    )
  }
  return result.sort((left, right) => left.sourceIndex - right.sourceIndex)
}

function draftGroup(card: BrowserCard): { key: string; label: string } {
  const section = card.draftAllocation?.section ?? 'other'
  const labels: Record<string, string> = {
    white: 'White',
    blue: 'Blue',
    black: 'Black',
    red: 'Red',
    green: 'Green',
    multicolor: 'Multicolor',
    colorless: 'Colorless',
    land: 'Lands',
    other: 'Other',
  }
  return { key: section, label: labels[section] ?? section }
}

function commanderGroup(card: BrowserCard): { key: string; label: string } {
  const size = colorIdentitySize(card.colorIdentity)
  if (size === 0) return { key: '0-color', label: 'Colorless' }
  if (size === 1) return { key: `1-${colorIdentityKey(card.colorIdentity)}`, label: colorIdentityKey(card.colorIdentity) }
  if (size === 2) return { key: `2-${colorIdentityKey(card.colorIdentity)}`, label: colorIdentityKey(card.colorIdentity) }
  if (size === 3) return { key: `3-${colorIdentityKey(card.colorIdentity)}`, label: colorIdentityKey(card.colorIdentity) }
  return { key: `${size}-${colorIdentityKey(card.colorIdentity)}`, label: colorIdentityKey(card.colorIdentity) }
}

export function groupCards(cards: readonly BrowserCard[], pool: BrowserPool): CardGroup[] {
  const groups = new Map<string, CardGroup>()

  for (const card of cards) {
    const group = pool === 'draft' ? draftGroup(card) : commanderGroup(card)
    const current = groups.get(group.key) ?? { ...group, cards: [] }
    current.cards.push(card)
    groups.set(group.key, current)
  }

  return [...groups.values()]
}
