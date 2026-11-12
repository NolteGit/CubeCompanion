import type { DraftAllocation } from '../../domain'
import type { BrowserCard } from '../browser/types'

export type SandboxPool = 'draft' | 'commander'

export interface SandboxState {
  baseSnapshotId: string
  draftCards: BrowserCard[]
  commanders: BrowserCard[]
}

export interface SandboxTarget {
  pool: SandboxPool
  draftAllocation?: DraftAllocation
}

export interface SandboxAllocationChange {
  card: BrowserCard
  from: string
  to: string
}

export interface SandboxDiff {
  addedDraft: BrowserCard[]
  removedDraft: BrowserCard[]
  reallocatedDraft: SandboxAllocationChange[]
  addedCommanders: BrowserCard[]
  removedCommanders: BrowserCard[]
}
