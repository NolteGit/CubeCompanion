import { mkdtemp, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import type { ExtractedArchiveEntry } from '../../src/infrastructure/excel'
import {
  normalizeArchiveEntries,
  publishArchive,
  type PublishedArchiveFile,
} from '../../src/infrastructure/archive'

function entry(
  name: string,
  pool: ExtractedArchiveEntry['pool'],
  section: string,
  cell: string,
): ExtractedArchiveEntry {
  return { name, pool, section, cell }
}

describe('archive publisher', () => {
  it('publishes deterministic raw archive names without requiring card resolution', async () => {
    const entries = [
      entry('Old Commander', 'commander', 'dual', 'O7'),
      entry('Typod Card Name', 'draft', 'blue', 'B4'),
      entry('Typod Card Name', 'draft', 'blue', 'B9'),
    ]

    expect(normalizeArchiveEntries(entries)).toEqual([
      { name: 'Old Commander', pool: 'commander', section: 'dual' },
      { name: 'Typod Card Name', pool: 'draft', section: 'blue' },
    ])

    const directory = await mkdtemp(join(tmpdir(), 'cube-archive-'))
    const path = join(directory, 'cards.json')
    const published = await publishArchive(entries, path)
    const written = JSON.parse(await readFile(path, 'utf8')) as PublishedArchiveFile

    expect(written).toEqual(published)
    expect(written.version).toBe(1)
  })
})
