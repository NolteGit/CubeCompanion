import type { BrowserCard, BrowserPool, BrowserView, CardTypeFilter } from './types'

export type BrowserResultLayout =
  | 'images'
  | 'columns'
  | 'guilds'
  | 'lands'
  | 'compact-mana'
  | 'mana'
  | 'commander-mana'
  | 'grouped'

export interface BrowserLayoutContext {
  pool: BrowserPool
  view: BrowserView
  section: string
  type: CardTypeFilter
  query: string
  visibleCount: number
  groupCount: number
}

/**
 * Pick one stable visual treatment for the filtered result set. The filters
 * themselves are unchanged; this only decides how to display their results.
 */
export function selectBrowserLayout({
  pool, view, section, type, query, visibleCount, groupCount,
}: BrowserLayoutContext): BrowserResultLayout {
  if (view !== 'list') return 'images'
  if (pool === 'draft' && type === 'land') return 'lands'
  if (pool === 'draft' && section === 'multicolor' && groupCount === 1) return 'guilds'

  if (pool === 'draft' && section !== 'all' && section !== 'multicolor'
    && section !== 'land' && groupCount === 1) {
    // An eight-column board works for a complete color, but wastes space
    // when only a handful of cards match a type or text search.
    return visibleCount <= 18 ? 'compact-mana' : 'mana'
  }

  if (pool === 'commanders' && (section !== 'all' || query.trim()) && groupCount > 0) {
    return 'commander-mana'
  }
  if (section === 'all' && !query.trim() && groupCount > 0) return 'columns'
  return 'grouped'
}

/** Land results are alphabetical and never mutate the published cube order. */
export function sortLandCards<T extends Pick<BrowserCard, 'name' | 'sourceIndex'>>(
  cards: readonly T[],
): T[] {
  return [...cards].sort((a, b) => a.name.localeCompare(b.name) || a.sourceIndex - b.sourceIndex)
}
