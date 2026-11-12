export interface WorkbookArchiveEntry {
  name: string
  pool: 'draft' | 'commander'
  section: string
}

interface PublishedArchiveData {
  version: 1
  entries: WorkbookArchiveEntry[]
}

const archiveModules = import.meta.glob('../../../data/archive/*.json', {
  eager: true,
  import: 'default',
}) as Record<string, PublishedArchiveData>

export const workbookArchiveEntries = Object.values(archiveModules)
  .flatMap((archive) => archive.entries)
