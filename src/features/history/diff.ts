import type { CubeCard, CubeSnapshot } from '../../domain'

export interface SnapshotDiff {
  addedDraft: readonly CubeCard[]
  removedDraft: readonly CubeCard[]
  addedCommanders: readonly CubeCard[]
  removedCommanders: readonly CubeCard[]
}

function addedCards(previous: readonly CubeCard[], current: readonly CubeCard[]): CubeCard[] {
  const previousIds = new Set(previous.map((card) => card.oracleId))
  return current.filter((card) => !previousIds.has(card.oracleId))
}

export function diffSnapshots(previous: CubeSnapshot, current: CubeSnapshot): SnapshotDiff {
  return {
    addedDraft: addedCards(previous.draftCards, current.draftCards),
    removedDraft: addedCards(current.draftCards, previous.draftCards),
    addedCommanders: addedCards(previous.commanders, current.commanders),
    removedCommanders: addedCards(current.commanders, previous.commanders),
  }
}

export function totalChanges(diff: SnapshotDiff): number {
  return (
    diff.addedDraft.length +
    diff.removedDraft.length +
    diff.addedCommanders.length +
    diff.removedCommanders.length
  )
}
