export type AppPage =
  | 'browse'
  | 'analysis'
  | 'sandbox'
  | 'customize'
  | 'playtest'
  | 'history'
  | 'archive'

const HASH_BY_PAGE: Readonly<Record<AppPage, string>> = {
  browse: '#cards',
  analysis: '#analysis',
  sandbox: '#changes',
  customize: '#customize',
  playtest: '#playtest',
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
  customize: 'Customize · Cube Companion',
  playtest: 'Playtest · Cube Companion',
  history: 'History · Cube Companion',
  archive: 'Archive · Cube Companion',
}

export function hashForPage(page: AppPage): string {
  return HASH_BY_PAGE[page]
}

export function pageFromHash(hash: string): AppPage {
  return PAGE_BY_HASH.get(hash.toLocaleLowerCase('en-US')) ?? 'browse'
}

export function pageTitle(page: AppPage): string {
  return TITLE_BY_PAGE[page]
}
