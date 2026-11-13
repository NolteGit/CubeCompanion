import type { BrowserPool, BrowserView } from '../features/browser/types'

export type CardDensity = 'compact' | 'comfortable'

export interface WorkspacePreferences {
  defaultPool: BrowserPool
  defaultView: BrowserView
  cardDensity: CardDensity
  hoverPreviews: boolean
}

const STORAGE_KEY = 'cube-companion:workspace-preferences:v1'

export const DEFAULT_WORKSPACE_PREFERENCES: WorkspacePreferences = {
  defaultPool: 'draft',
  defaultView: 'list',
  cardDensity: 'compact',
  hoverPreviews: true,
}

function normalize(value: unknown): WorkspacePreferences {
  if (!value || typeof value !== 'object') return DEFAULT_WORKSPACE_PREFERENCES
  const candidate = value as Partial<WorkspacePreferences>

  return {
    defaultPool:
      candidate.defaultPool === 'commanders' ? 'commanders' : 'draft',
    defaultView:
      candidate.defaultView === 'images' ? 'images' : 'list',
    cardDensity:
      candidate.cardDensity === 'comfortable' ? 'comfortable' : 'compact',
    hoverPreviews:
      candidate.hoverPreviews !== false,
  }
}

export function loadWorkspacePreferences(
  storage: Pick<Storage, 'getItem'>,
): WorkspacePreferences {
  try {
    const raw = storage.getItem(STORAGE_KEY)
    return raw ? normalize(JSON.parse(raw) as unknown) : DEFAULT_WORKSPACE_PREFERENCES
  } catch {
    return DEFAULT_WORKSPACE_PREFERENCES
  }
}

export function saveWorkspacePreferences(
  preferences: WorkspacePreferences,
  storage: Pick<Storage, 'setItem'>,
): void {
  storage.setItem(STORAGE_KEY, JSON.stringify(preferences))
}

export function applyWorkspacePreferences(
  preferences: WorkspacePreferences,
  root: HTMLElement,
): void {
  root.dataset.cardDensity = preferences.cardDensity
  root.dataset.hoverPreviews = preferences.hoverPreviews ? 'on' : 'off'
}
