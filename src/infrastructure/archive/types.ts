import type { WorkbookPool } from '../excel'

export interface PublishedArchiveEntry {
  name: string
  pool: WorkbookPool
  section: string
}

export interface PublishedArchiveFile {
  version: 1
  entries: readonly PublishedArchiveEntry[]
}
