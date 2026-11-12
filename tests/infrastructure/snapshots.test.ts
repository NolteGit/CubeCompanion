import { mkdtemp, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import type { CubeCard, CubeDefinition, ValidationResult } from '../../src/domain'
import {
  cubeContentIdentity,
  hashCubeContent,
  publishCube,
  type SnapshotPaths,
} from '../../src/infrastructure/snapshots'
import type { CardMetadata } from '../../src/infrastructure/scryfall'

function card(oracleId: string, name = oracleId): CubeCard {
  return { oracleId, name, colorIdentity: [], isLand: false }
}

function cube(): CubeDefinition {
  return {
    draftCards: [card('draft-b'), card('draft-a')],
    commanders: [card('commander-a')],
  }
}

const validation: ValidationResult = {
  valid: true,
  issues: [],
  summary: {
    draft: {
      total: 2,
      mono: {},
      multicolor: 0,
      dual: {},
      colorless: 2,
      lands: 0,
      guildLands: {},
      generalLands: 0,
    },
    commanders: 1,
  },
}

function metadata(oracleId: string): CardMetadata {
  return {
    oracleId,
    name: oracleId,
    colorIdentity: [],
    manaValue: 0,
    manaCost: '',
    typeLine: 'Artifact',
    oracleText: '',
    isLand: false,
    scryfallUri: `https://scryfall.com/${oracleId}`,
  }
}

describe('cube content hash', () => {
  it('ignores row order and card display names', () => {
    const original = cube()
    const reordered: CubeDefinition = {
      draftCards: [card('draft-a', 'Renamed display'), card('draft-b')],
      commanders: [...original.commanders],
    }

    expect(cubeContentIdentity(reordered)).toBe(cubeContentIdentity(original))
    expect(hashCubeContent(reordered)).toBe(hashCubeContent(original))
  })

  it('changes when a logical card moves between pools', () => {
    const original = cube()
    const moved: CubeDefinition = {
      draftCards: [card('draft-b')],
      commanders: [card('commander-a'), card('draft-a')],
    }

    expect(hashCubeContent(moved)).not.toBe(hashCubeContent(original))
  })


  it('changes when workbook allocation changes', () => {
    const original = cube()
    original.draftCards[0].draftAllocation = { section: 'blue' }
    const reallocated: CubeDefinition = {
      draftCards: [
        { ...original.draftCards[0], draftAllocation: { section: 'colorless' } },
        original.draftCards[1],
      ],
      commanders: [...original.commanders],
    }

    expect(hashCubeContent(reallocated)).not.toBe(hashCubeContent(original))
  })
})

describe('snapshot publisher', () => {
  it('creates immutable history and reuses it for unchanged content', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'cube-snapshots-'))
    const paths: SnapshotPaths = {
      currentCubePath: join(directory, 'current.json'),
      historyDirectory: join(directory, 'history'),
      metadataPath: join(directory, 'cards.json'),
    }
    const first = await publishCube({
      cube: cube(),
      validation,
      metadata: [metadata('draft-a')],
      rulesRevision: '1',
      note: 'First release',
      now: () => new Date('2026-01-01T00:00:00.000Z'),
      paths,
    })
    const second = await publishCube({
      cube: cube(),
      validation,
      metadata: [metadata('draft-a')],
      rulesRevision: '2',
      note: 'Same cards, new rules',
      now: () => new Date('2026-02-01T00:00:00.000Z'),
      paths,
    })

    expect(first.createdHistory).toBe(true)
    expect(second.createdHistory).toBe(false)
    expect(second.published.snapshot.createdAt).toBe('2026-01-01T00:00:00.000Z')
    expect(second.published.release.publishedAt).toBe('2026-02-01T00:00:00.000Z')
    expect(second.published.release.rulesRevision).toBe('2')

    const history = JSON.parse(await readFile(first.historyPath, 'utf8')) as { note?: string }
    expect(history.note).toBe('First release')
  })

  it('refuses to write an invalid cube', async () => {
    await expect(
      publishCube({
        cube: cube(),
        validation: { ...validation, valid: false },
        metadata: [],
        rulesRevision: '1',
      }),
    ).rejects.toThrow('Refusing to publish an invalid cube')
  })
})
