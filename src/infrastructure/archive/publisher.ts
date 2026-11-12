import { mkdir, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import type { ExtractedArchiveEntry } from '../excel'
import type { PublishedArchiveEntry, PublishedArchiveFile } from './types'

export const DEFAULT_ARCHIVE_PATH = 'data/archive/cards.json'

function archiveKey(entry: PublishedArchiveEntry): string {
  return `${entry.pool}\0${entry.section.toLocaleLowerCase('en-US')}\0${entry.name.toLocaleLowerCase('en-US')}`
}

function compareEntries(left: PublishedArchiveEntry, right: PublishedArchiveEntry): number {
  const leftKey = archiveKey(left)
  const rightKey = archiveKey(right)
  return leftKey < rightKey ? -1 : leftKey > rightKey ? 1 : 0
}

export function normalizeArchiveEntries(
  entries: readonly ExtractedArchiveEntry[],
): PublishedArchiveEntry[] {
  const unique = new Map<string, PublishedArchiveEntry>()

  for (const entry of entries) {
    const published = {
      name: entry.name,
      pool: entry.pool,
      section: entry.section,
    } satisfies PublishedArchiveEntry
    unique.set(archiveKey(published), published)
  }

  return [...unique.values()].sort(compareEntries)
}

export async function publishArchive(
  entries: readonly ExtractedArchiveEntry[],
  path = DEFAULT_ARCHIVE_PATH,
): Promise<PublishedArchiveFile> {
  const archive: PublishedArchiveFile = {
    version: 1,
    entries: normalizeArchiveEntries(entries),
  }

  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, `${JSON.stringify(archive, null, 2)}\n`, 'utf8')
  return archive
}
