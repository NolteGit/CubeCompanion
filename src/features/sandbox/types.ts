import type { BrowserCard } from '../browser/types'

export type SandboxPool = 'draft' | 'commander'

export interface SandboxState {
  baseSnapshotId: string
  draftCards: BrowserCard[]
  commanders: BrowserCard[]
}

export interface SandboxDiff {
  addedDraft: BrowserCard[]
  removedDraft: BrowserCard[]
  addedCommanders: BrowserCard[]
  removedCommanders: BrowserCard[]
}
