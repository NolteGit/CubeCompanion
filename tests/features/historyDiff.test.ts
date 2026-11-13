import { describe, expect, it } from 'vitest'
import type { CubeCard, CubeSnapshot, DraftSection } from '../../src/domain'
import { diffSnapshots, totalChanges } from '../../src/features/history/diff'

function card(
  oracleId: string,
  name: string,
  section?: DraftSection,
): CubeCard {
  return {
    oracleId,
    name,
    colorIdentity: [],
    isLand: false,
    ...(section ? { draftAllocation: { section } } : {}),
  }
}

function snapshot(
  id: string,
  draftCards: CubeCard[],
  commanders: CubeCard[],
): CubeSnapshot {
  return {
    id,
    createdAt: '2026-01-01T00:00:00.000Z',
    rulesRevision: '2',
    draftCards,
    commanders,
  }
}

describe('history diffs', () => {
  it('detects draft and commander additions and removals', () => {
    const previous = snapshot(
      'previous',
      [card('keep', 'Keep', 'blue'), card('remove', 'Remove', 'white')],
      [card('old-commander', 'Old Commander')],
    )
    const current = snapshot(
      'current',
      [card('keep', 'Keep', 'colorless'), card('add', 'Add', 'red')],
      [card('new-commander', 'New Commander')],
    )

    const diff = diffSnapshots(previous, current)

    expect(diff.addedDraft.map((entry) => entry.name)).toEqual(['Add'])
    expect(diff.removedDraft.map((entry) => entry.name)).toEqual(['Remove'])
    expect(diff.addedCommanders.map((entry) => entry.name)).toEqual(['New Commander'])
    expect(diff.removedCommanders.map((entry) => entry.name)).toEqual(['Old Commander'])
    expect(totalChanges(diff)).toBe(4)
  })
})
