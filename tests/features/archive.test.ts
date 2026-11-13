import { describe, expect, it } from 'vitest'
import type { ColorCode, CubeCard, CubeSnapshot } from '../../src/domain'
import {
  buildArchiveRecords,
  filterArchiveRecords,
} from '../../src/features/archive/archive'

function card(
  oracleId: string,
  name: string,
  poolSection?: CubeCard['draftAllocation'],
  colorIdentity: readonly ColorCode[] = [],
): CubeCard {
  return {
    oracleId,
    name,
    colorIdentity,
    isLand: false,
    draftAllocation: poolSection,
  }
}

function snapshot(
  draftCards: CubeCard[],
  commanders: CubeCard[] = [],
): CubeSnapshot {
  return {
    id: 'snapshot',
    createdAt: '2026-01-01T00:00:00.000Z',
    rulesRevision: '2',
    draftCards,
    commanders,
  }
}

describe('archive records', () => {
  it('preserves workbook spellings and adds cards recoverable from published history', () => {
    const currentDraft = [card('current', 'Current Card', { section: 'blue' })]
    const history = [
      snapshot([
        card('current', 'Current Card', { section: 'blue' }),
        card('former', 'Former Card', { section: 'red' }),
      ]),
    ]
    const records = buildArchiveRecords(
      [
        { name: 'Typod Card Name', pool: 'draft', section: 'blue' },
        { name: 'Current Card', pool: 'draft', section: 'blue' },
      ],
      history,
      currentDraft,
      [],
    )

    expect(records).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'Typod Card Name',
          sources: ['workbook'],
        }),
        expect.objectContaining({
          name: 'Current Card',
          active: true,
          sources: ['workbook'],
        }),
        expect.objectContaining({
          name: 'Former Card',
          active: false,
          sources: ['history'],
        }),
      ]),
    )
    expect(records.filter((record) => record.name === 'Current Card')).toHaveLength(1)
  })

  it('uses familiar color identity names for commanders recovered from history', () => {
    const records = buildArchiveRecords(
      [],
      [snapshot([], [card('azorius', 'Former Commander', undefined, ['U', 'W'])])],
      [],
      [],
    )

    expect(records).toEqual([
      expect.objectContaining({
        name: 'Former Commander',
        pool: 'commander',
        sections: ['Azorius'],
        sources: ['history'],
      }),
    ])
  })

  it('filters by query, pool, and source', () => {
    const records = buildArchiveRecords(
      [
        { name: 'Draft Relic', pool: 'draft', section: 'colorless' },
        { name: 'Commander Relic', pool: 'commander', section: 'dual' },
      ],
      [],
      [],
      [],
    )

    expect(filterArchiveRecords(records, {
      query: 'relic',
      pool: 'draft',
      source: 'workbook',
    }).map((record) => record.name)).toEqual(['Draft Relic'])

    expect(filterArchiveRecords(records, {
      query: '',
      pool: 'all',
      source: 'history',
    })).toEqual([])
  })
})
