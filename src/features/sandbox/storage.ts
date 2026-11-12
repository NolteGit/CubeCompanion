import type { BrowserCard } from '../browser/types'
import { createSandboxState } from './state'
import type { SandboxState } from './types'

export const SANDBOX_STORAGE_KEY = 'cube-companion:sandbox:v1'

type SandboxStorage = Pick<Storage, 'getItem' | 'setItem'>

function isSandboxState(value: unknown, snapshotId: string): value is SandboxState {
  if (!value || typeof value !== 'object') return false
  const state = value as Partial<SandboxState>
  return (
    state.baseSnapshotId === snapshotId &&
    Array.isArray(state.draftCards) &&
    Array.isArray(state.commanders)
  )
}

export function loadSandboxState(
  snapshotId: string,
  draftCards: readonly BrowserCard[],
  commanders: readonly BrowserCard[],
  storage: SandboxStorage,
): SandboxState {
  try {
    const raw = storage.getItem(SANDBOX_STORAGE_KEY)
    if (!raw) return createSandboxState(snapshotId, draftCards, commanders)
    const parsed: unknown = JSON.parse(raw)
    return isSandboxState(parsed, snapshotId)
      ? parsed
      : createSandboxState(snapshotId, draftCards, commanders)
  } catch {
    return createSandboxState(snapshotId, draftCards, commanders)
  }
}

export function saveSandboxState(state: SandboxState, storage: SandboxStorage): void {
  storage.setItem(SANDBOX_STORAGE_KEY, JSON.stringify(state))
}
