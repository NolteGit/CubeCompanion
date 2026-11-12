import type { CubeCard, CubeSnapshot } from '../../domain'

export interface AllocationChange {
  card: CubeCard
  from: string
  to: string
}

export interface SnapshotDiff {
  addedDraft: readonly CubeCard[]
  removedDraft: readonly CubeCard[]
  reallocatedDraft: readonly AllocationChange[]
  addedCommanders: readonly CubeCard[]
  removedCommanders: readonly CubeCard[]
}

function cardMap(cards: readonly CubeCard[]): Map<string, CubeCard> {
  return new Map(cards.map((card) => [card.oracleId, card]))
}

function allocationLabel(card: CubeCard): string {
  const allocation = card.draftAllocation
  if (!allocation) return 'Unallocated'
  const section = allocation.section[0].toUpperCase() + allocation.section.slice(1)
  return allocation.guild ? `${section} · ${allocation.guild}` : section
}

function addedCards(previous: readonly CubeCard[], current: readonly CubeCard[]): CubeCard[] {
  const previousIds = new Set(previous.map((card) => card.oracleId))
  return current.filter((card) => !previousIds.has(card.oracleId))
}

export function diffSnapshots(previous: CubeSnapshot, current: CubeSnapshot): SnapshotDiff {
  const previousDraft = cardMap(previous.draftCards)
  const currentDraft = cardMap(current.draftCards)
  const reallocatedDraft: AllocationChange[] = []

  for (const [oracleId, card] of currentDraft) {
    const before = previousDraft.get(oracleId)
    if (!before) continue
    const from = allocationLabel(before)
    const to = allocationLabel(card)
    if (from !== to) reallocatedDraft.push({ card, from, to })
  }

  return {
    addedDraft: addedCards(previous.draftCards, current.draftCards),
    removedDraft: addedCards(current.draftCards, previous.draftCards),
    reallocatedDraft,
    addedCommanders: addedCards(previous.commanders, current.commanders),
    removedCommanders: addedCards(current.commanders, previous.commanders),
  }
}

export function totalChanges(diff: SnapshotDiff): number {
  return (
    diff.addedDraft.length +
    diff.removedDraft.length +
    diff.reallocatedDraft.length +
    diff.addedCommanders.length +
    diff.removedCommanders.length
  )
}
