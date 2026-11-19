import { mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import type { CubeCard, CubeSnapshot } from '../../src/domain'
import type { CardMetadata } from '../../src/infrastructure/scryfall'
import {
  completeHistoricalMetadata,
  readPublishedMetadata,
} from '../../src/infrastructure/snapshots/historyMetadata'

function card(oracleId: string, name: string): CubeCard {
  return { oracleId, name, colorIdentity: [], isLand: false }
}

function metadata(oracleId: string, name: string): CardMetadata {
  return {
    oracleId, name, colorIdentity: [], manaValue: 2, manaCost: '{2}',
    typeLine: 'Artifact', oracleText: '', isLand: false,
    imageUri: 'https://example.test/card.jpg',
    scryfallUri: 'https://scryfall.com/card/example',
  }
}

async function historyFixture(cards: CubeCard[]) {
  const root = await mkdtemp(join(tmpdir(), 'cube-history-metadata-'))
  const historyDirectory = join(root, 'history')
  await mkdir(historyDirectory)
  const snapshot: CubeSnapshot = {
    id: 'first', createdAt: '2026-01-01T00:00:00Z', rulesRevision: '2',
    draftCards: cards, commanders: [],
  }
  const snapshotPath = join(historyDirectory, 'first.json')
  const contents = `${JSON.stringify(snapshot)}\n`
  await writeFile(snapshotPath, contents)
  return { root, historyDirectory, snapshotPath, contents }
}

function scryfallCard(oracleId: string, name: string) {
  return {
    oracle_id: oracleId, name, cmc: 2, mana_cost: '{2}', type_line: 'Artifact',
    oracle_text: '', color_identity: [],
    image_uris: { normal: 'https://example.test/card.jpg' },
    scryfall_uri: 'https://scryfall.com/card/example',
  }
}

describe('historical card metadata', () => {
  it('backfills missing images without altering immutable history', async () => {
    const fixture = await historyFixture([card('old-id', 'Former Card')])
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ data: [scryfallCard('old-id', 'Former Card')], not_found: [] }), { status: 200 }),
    )

    const result = await completeHistoricalMetadata(
      [metadata('current-id', 'Current Card')], [],
      { historyDirectory: fixture.historyDirectory, cachePath: join(fixture.root, 'cache.json'), fetchImpl, requestDelayMs: 0 },
    )

    expect(result.added).toBe(1)
    expect(result.cards.map((entry) => entry.oracleId)).toEqual(['current-id', 'old-id'])
    expect(result.cards.find((entry) => entry.oracleId === 'old-id')?.imageUri).toBe('https://example.test/card.jpg')
    expect(await readFile(fixture.snapshotPath, 'utf8')).toBe(fixture.contents)
    expect(fetchImpl).toHaveBeenCalledOnce()
  })

  it('preserves existing metadata for old cards without another network request', async () => {
    const fixture = await historyFixture([card('old-id', 'Former Card')])
    const fetchImpl = vi.fn<typeof fetch>()
    const result = await completeHistoricalMetadata(
      [metadata('current-id', 'Current Card')], [metadata('old-id', 'Former Card')],
      { historyDirectory: fixture.historyDirectory, fetchImpl },
    )
    expect(result.added).toBe(1)
    expect(result.fetched).toBe(0)
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it('refuses Scryfall matches with a different Oracle ID', async () => {
    const fixture = await historyFixture([card('old-id', 'Former Card')])
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ data: [scryfallCard('wrong-id', 'Former Card')] }), { status: 200 }),
    )
    await expect(completeHistoricalMetadata([], [], {
      historyDirectory: fixture.historyDirectory,
      cachePath: join(fixture.root, 'cache.json'), fetchImpl,
    })).rejects.toThrow('Former Card')
  })

  it('handles a first release without history or old metadata', async () => {
    const fixture = await mkdtemp(join(tmpdir(), 'cube-history-empty-'))
    const fetchImpl = vi.fn<typeof fetch>()
    const result = await completeHistoricalMetadata([metadata('current', 'Current')], [], {
      historyDirectory: join(fixture, 'not-yet-created'), fetchImpl,
    })
    expect(result.added).toBe(0)
    expect(result.cards).toHaveLength(1)
    expect(fetchImpl).not.toHaveBeenCalled()
    expect(await readPublishedMetadata(join(fixture, 'missing.json'))).toEqual([])
  })
})
