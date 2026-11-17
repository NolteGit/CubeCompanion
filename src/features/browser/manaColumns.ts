import type { CardTypeFilter } from './types'

export const MANA_VALUE_LABELS = ['0', '1', '2', '3', '4', '5', '6', '7+'] as const

interface ManaCard {
  name: string
  manaValue: number
  typeLine: string
}

export interface ManaColumn<T extends ManaCard> {
  label: (typeof MANA_VALUE_LABELS)[number]
  creatures: T[]
  noncreatures: T[]
}

/** Group a color section by real card type and mana value without dropping cards. */
export function groupColorManaCards<T extends ManaCard>(
  cards: readonly T[],
  activeType: CardTypeFilter = 'all',
): ManaColumn<T>[] {
  const columns: ManaColumn<T>[] = MANA_VALUE_LABELS.map((label) => ({
    label, creatures: [], noncreatures: [],
  }))

  for (const card of cards) {
    const mana = Number.isFinite(card.manaValue)
      ? Math.max(0, Math.min(7, Math.floor(card.manaValue)))
      : 0
    const primaryTypes = card.typeLine.split(/[—–]/, 1)[0]
    const isCreature = /\bCreature\b/i.test(primaryTypes)
    // The Artifact filter is a view of artifacts, so keep all matching artifacts
    // together in Noncreature, even if the artifact is also a creature.
    const row = isCreature && activeType !== 'artifact' ? 'creatures' : 'noncreatures'
    columns[mana][row].push(card)
  }

  const compare = (a: T, b: T) =>
    a.manaValue - b.manaValue || a.name.localeCompare(b.name)
  for (const column of columns) {
    column.creatures.sort(compare)
    column.noncreatures.sort(compare)
  }
  return columns
}

/** Commander view: one ordered mana row, regardless of creature, artifact, or planeswalker type. */
export function groupManaValueCards<T extends Pick<ManaCard, 'name' | 'manaValue'>>(
  cards: readonly T[],
): { label: (typeof MANA_VALUE_LABELS)[number]; cards: T[] }[] {
  const columns = MANA_VALUE_LABELS.map((label) => ({ label, cards: [] as T[] }))
  for (const card of cards) {
    const mana = Number.isFinite(card.manaValue)
      ? Math.max(0, Math.min(7, Math.floor(card.manaValue)))
      : 0
    columns[mana].cards.push(card)
  }
  for (const column of columns) {
    column.cards.sort((a, b) => a.manaValue - b.manaValue || a.name.localeCompare(b.name))
  }
  return columns
}
