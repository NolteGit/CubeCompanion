export type AppPage =
  | 'browse'
  | 'analysis'
  | 'sandbox'
  | 'draft'
  | 'history'
  | 'archive'

const HASH_BY_PAGE: Readonly<Record<AppPage, string>> = {
  browse: '#cards',
  analysis: '#analysis',
  sandbox: '#changes',
  draft: '#draft',
  history: '#history',
  archive: '#archive',
}

const PAGE_BY_HASH = new Map(
  Object.entries(HASH_BY_PAGE).map(([page, hash]) => [hash, page as AppPage]),
)

const TITLE_BY_PAGE: Readonly<Record<AppPage, string>> = {
  browse: 'Cards · Cube Companion',
  analysis: 'Analysis · Cube Companion',
  sandbox: 'Changes · Cube Companion',
  draft: 'Draft · Cube Companion',
  history: 'History · Cube Companion',
  archive: 'Archive · Cube Companion',
}

export function hashForPage(page: AppPage): string {
  return HASH_BY_PAGE[page]
}

export function pageFromHash(hash: string): AppPage {
  const normalized = hash.toLocaleLowerCase('en-US')
  // Old Playtest bookmarks now open the full Draft simulator.
  if (normalized === '#playtest') return 'draft'
  return PAGE_BY_HASH.get(normalized) ?? 'browse'
}

export function pageTitle(page: AppPage): string {
  return TITLE_BY_PAGE[page]
}
