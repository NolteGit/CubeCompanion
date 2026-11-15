/** Pure grouping for the draft deck's visual mana-curve overview. */
export const MANA_VALUE_BUCKETS = ['0', '1', '2', '3', '4', '5', '6', '7+'] as const

export interface OverviewCard {
  name: string
  manaValue: number
  typeLine: string
  isLand: boolean
}

export interface OverviewColumn<T extends OverviewCard> {
  label: (typeof MANA_VALUE_BUCKETS)[number]
  creatures: T[]
  noncreatures: T[]
}

export interface DeckOverviewGroups<T extends OverviewCard> {
  columns: OverviewColumn<T>[]
  lands: T[]
  creatureCount: number
  noncreatureCount: number
}

function manaBucket(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.min(7, Math.floor(value)))
}

function isCreature(card: OverviewCard): boolean {
  // Ignore subtypes after the em dash, so only the actual type is considered.
  return card.typeLine.split(/[—–]/, 1)[0].split(/\s+/).includes('Creature')
}

export function groupDraftDeck<T extends OverviewCard>(cards: readonly T[]): DeckOverviewGroups<T> {
  const columns = MANA_VALUE_BUCKETS.map((label): OverviewColumn<T> => ({
    label,
    creatures: [],
    noncreatures: [],
  }))
  const lands: T[] = []
  let creatureCount = 0
  let noncreatureCount = 0

  for (const card of cards) {
    if (card.isLand) {
      lands.push(card)
      continue
    }
    if (isCreature(card)) {
      columns[manaBucket(card.manaValue)].creatures.push(card)
      creatureCount += 1
    } else {
      columns[manaBucket(card.manaValue)].noncreatures.push(card)
      noncreatureCount += 1
    }
  }

  const byManaThenName = (left: T, right: T) =>
    left.manaValue - right.manaValue || left.name.localeCompare(right.name)
  for (const column of columns) {
    column.creatures.sort(byManaThenName)
    column.noncreatures.sort(byManaThenName)
  }
  lands.sort((left, right) => left.name.localeCompare(right.name))
  return { columns, lands, creatureCount, noncreatureCount }
}
