import { describe, expect, it } from 'vitest'
import type { BrowserCard } from '../../src/features/browser/types'
import { sandboxDiffText, sandboxFullListText } from '../../src/features/sandbox/export'
import type { SandboxDiff, SandboxState } from '../../src/features/sandbox/types'

function card(name: string, oracleId: string, section = 'white'): BrowserCard {
  return {
    oracleId,
    name,
    colorIdentity: [],
    isLand: false,
    draftAllocation: { section: section as 'white' },
    sourceIndex: 0,
    manaValue: 1,
    manaCost: '{1}',
    typeLine: 'Artifact',
    oracleText: '',
    scryfallUri: '',
  }
}

describe('sandbox text exports', () => {
  it('exports additions, removals, and reallocations as a readable diff', () => {
    const added = card('Added Card', 'added')
    const moved = card('Moved Card', 'moved')
    const diff: SandboxDiff = {
      addedDraft: [added],
      removedDraft: [],
      reallocatedDraft: [{ card: moved, from: 'White', to: 'Blue' }],
      addedCommanders: [],
      removedCommanders: [card('Old Commander', 'old')],
    }

    const text = sandboxDiffText(diff)

    expect(text).toContain('DRAFT ADDED\nAdded Card')
    expect(text).toContain('Moved Card: White -> Blue')
    expect(text).toContain('COMMANDERS REMOVED\nOld Commander')
  })

  it('exports a complete sandbox list with base snapshot and allocations', () => {
    const state: SandboxState = {
      baseSnapshotId: 'snapshot-123',
      draftCards: [card('Draft Card', 'draft')],
      commanders: [card('Commander Card', 'commander')],
    }

    const text = sandboxFullListText(state)

    expect(text).toContain('Base snapshot: snapshot-123')
    expect(text).toContain('DRAFT (1)\nWhite | Draft Card')
    expect(text).toContain('COMMANDERS (1)\nCommander Card')
  })
})
