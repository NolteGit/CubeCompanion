import type { BrowserCard } from '../browser/types'

export interface CountBucket {
  key: string
  label: string
  count: number
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

const PRIMARY_TYPES = [
  'Creature',
  'Instant',
  'Sorcery',
  'Planeswalker',
  'Enchantment',
  'Artifact',
  'Land',
] as const

export function manaCurve(cards: readonly BrowserCard[]): CountBucket[] {
  const counts = Array.from({ length: 8 }, () => 0)

  for (const card of cards) {
    if (card.isLand) continue
    const bucket = Math.min(7, Math.max(0, Math.floor(card.manaValue)))
    counts[bucket] += 1
  }

  return counts.map((count, manaValue) => ({
    key: String(manaValue),
    label: manaValue === 7 ? '7+' : String(manaValue),
    count,
  }))
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
