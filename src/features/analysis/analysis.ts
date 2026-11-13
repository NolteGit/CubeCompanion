import type { BrowserCard } from '../browser/types'

export interface CountBucket {
  key: string
  label: string
  count: number
}

export interface SectionManaBucket {
  key: string
  label: string
  total: number
  sections: CountBucket[]
}

const SECTION_ORDER = [
  ['white', 'White'],
  ['blue', 'Blue'],
  ['black', 'Black'],
  ['red', 'Red'],
  ['green', 'Green'],
  ['multicolor', 'Multicolor'],
  ['colorless', 'Colorless'],
  ['land', 'Lands'],
] as const

const CURVE_SECTION_ORDER = SECTION_ORDER.filter(([key]) => key !== 'land')

const PRIMARY_TYPES = [
  'Creature',
  'Instant',
  'Sorcery',
  'Planeswalker',
  'Enchantment',
  'Artifact',
  'Land',
] as const

function manaBucket(card: BrowserCard): number {
  return Math.min(7, Math.max(0, Math.floor(card.manaValue)))
}

export function manaCurve(cards: readonly BrowserCard[]): CountBucket[] {
  const counts = Array.from({ length: 8 }, () => 0)

  for (const card of cards) {
    if (card.isLand) continue
    counts[manaBucket(card)] += 1
  }

  return counts.map((count, manaValue) => ({
    key: String(manaValue),
    label: manaValue === 7 ? '7+' : String(manaValue),
    count,
  }))
}

export function sectionManaCurve(cards: readonly BrowserCard[]): SectionManaBucket[] {
  const counts = Array.from(
    { length: 8 },
    () => new Map<string, number>(),
  )

  for (const card of cards) {
    if (card.isLand) continue
    const section = card.draftAllocation?.section ?? 'other'
    const bucket = counts[manaBucket(card)]
    bucket.set(section, (bucket.get(section) ?? 0) + 1)
  }

  return counts.map((bucket, manaValue) => {
    const knownSections = CURVE_SECTION_ORDER.map(([key, label]) => ({
      key,
      label,
      count: bucket.get(key) ?? 0,
    }))
    const otherCount = bucket.get('other') ?? 0
    const sections = otherCount > 0
      ? [...knownSections, { key: 'other', label: 'Other', count: otherCount }]
      : knownSections

    return {
      key: String(manaValue),
      label: manaValue === 7 ? '7+' : String(manaValue),
      total: sections.reduce((sum, section) => sum + section.count, 0),
      sections,
    }
  })
}

export function sectionDistribution(cards: readonly BrowserCard[]): CountBucket[] {
  const counts = new Map<string, number>()

  for (const card of cards) {
    const section = card.draftAllocation?.section ?? 'other'
    counts.set(section, (counts.get(section) ?? 0) + 1)
  }

  return SECTION_ORDER.map(([key, label]) => ({
    key,
    label,
    count: counts.get(key) ?? 0,
  })).filter((bucket) => bucket.count > 0)
}

function primaryType(card: BrowserCard): string {
  for (const type of PRIMARY_TYPES) {
    if (card.typeLine.includes(type)) return type
  }
  return 'Other'
}

export function typeDistribution(cards: readonly BrowserCard[]): CountBucket[] {
  const counts = new Map<string, number>()

  for (const card of cards) {
    const type = primaryType(card)
    counts.set(type, (counts.get(type) ?? 0) + 1)
  }

  return [...PRIMARY_TYPES, 'Other']
    .map((type) => ({ key: type.toLowerCase(), label: type, count: counts.get(type) ?? 0 }))
    .filter((bucket) => bucket.count > 0)
}

export function averageManaValue(cards: readonly BrowserCard[]): number {
  const nonlands = cards.filter((card) => !card.isLand)
  if (nonlands.length === 0) return 0
  return nonlands.reduce((sum, card) => sum + card.manaValue, 0) / nonlands.length
}
