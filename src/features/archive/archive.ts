import {
  colorIdentityKey,
  type CubeCard,
  type CubeSnapshot,
} from '../../domain'
import type { WorkbookArchiveEntry } from './data'

export type ArchivePoolFilter = 'all' | 'draft' | 'commander'
export type ArchiveSource = 'workbook' | 'history'
export type ArchiveSourceFilter = 'all' | ArchiveSource

export interface ArchiveRecord {
  key: string
  name: string
  pool: 'draft' | 'commander'
  sections: readonly string[]
  sources: readonly ArchiveSource[]
  active: boolean
}

export interface ArchiveFilters {
  query: string
  pool: ArchivePoolFilter
  source: ArchiveSourceFilter
}

interface MutableArchiveRecord {
  key: string
  name: string
  pool: 'draft' | 'commander'
  sections: Set<string>
  sources: Set<ArchiveSource>
  active: boolean
}

function normalizedName(value: string): string {
  return value.trim().toLocaleLowerCase('en-US')
}

function recordKey(name: string, pool: 'draft' | 'commander'): string {
  return `${pool}:${normalizedName(name)}`
}

function draftSection(card: CubeCard): string {
  const allocation = card.draftAllocation
  if (!allocation) return 'Published draft'
  const section = allocation.section[0].toUpperCase() + allocation.section.slice(1)
  return allocation.guild ? `${section} · ${allocation.guild}` : section
}

const COMMANDER_IDENTITY_LABELS: Readonly<Record<string, string>> = {
  W: 'White',
  U: 'Blue',
  B: 'Black',
  R: 'Red',
  G: 'Green',
  WU: 'Azorius',
  UB: 'Dimir',
  BR: 'Rakdos',
  RG: 'Gruul',
  WG: 'Selesnya',
  WB: 'Orzhov',
  UR: 'Izzet',
  BG: 'Golgari',
  WR: 'Boros',
  UG: 'Simic',
  WUB: 'Esper',
  WUR: 'Jeskai',
  WUG: 'Bant',
  WBR: 'Mardu',
  WBG: 'Abzan',
  WRG: 'Naya',
  UBR: 'Grixis',
  UBG: 'Sultai',
  URG: 'Temur',
  BRG: 'Jund',
  WUBR: 'Four-color · no Green',
  WUBG: 'Four-color · no Red',
  WURG: 'Four-color · no Black',
  WBRG: 'Four-color · no Blue',
  UBRG: 'Four-color · no White',
  WUBRG: 'Five-color',
}

function commanderSection(card: CubeCard): string {
  const key = colorIdentityKey(card.colorIdentity)
  return key ? COMMANDER_IDENTITY_LABELS[key] ?? key : 'Colorless'
}

function addRecord(
  records: Map<string, MutableArchiveRecord>,
  name: string,
  pool: 'draft' | 'commander',
  section: string,
  source: ArchiveSource,
  active: boolean,
): void {
  const key = recordKey(name, pool)
  const current = records.get(key) ?? {
    key,
    name,
    pool,
    sections: new Set<string>(),
    sources: new Set<ArchiveSource>(),
    active: false,
  }

  current.sections.add(section)
  current.sources.add(source)
  current.active ||= active
  records.set(key, current)
}

export function buildArchiveRecords(
  workbookEntries: readonly WorkbookArchiveEntry[],
  snapshots: readonly CubeSnapshot[],
  currentDraft: readonly CubeCard[],
  currentCommanders: readonly CubeCard[],
): ArchiveRecord[] {
  const records = new Map<string, MutableArchiveRecord>()
  const currentDraftIds = new Set(currentDraft.map((card) => card.oracleId))
  const currentCommanderIds = new Set(currentCommanders.map((card) => card.oracleId))
  const currentDraftNames = new Set(currentDraft.map((card) => normalizedName(card.name)))
  const currentCommanderNames = new Set(currentCommanders.map((card) => normalizedName(card.name)))

  for (const entry of workbookEntries) {
    const activeNames = entry.pool === 'draft' ? currentDraftNames : currentCommanderNames
    addRecord(
      records,
      entry.name,
      entry.pool,
      entry.section,
      'workbook',
      activeNames.has(normalizedName(entry.name)),
    )
  }

  for (const snapshot of snapshots) {
    for (const card of snapshot.draftCards) {
      if (currentDraftIds.has(card.oracleId)) continue
      addRecord(records, card.name, 'draft', draftSection(card), 'history', false)
    }
    for (const card of snapshot.commanders) {
      if (currentCommanderIds.has(card.oracleId)) continue
      addRecord(records, card.name, 'commander', commanderSection(card), 'history', false)
    }
  }

  return [...records.values()]
    .map((record) => ({
      ...record,
      sections: [...record.sections].sort(),
      sources: [...record.sources].sort(),
    }))
    .sort((left, right) => left.name.localeCompare(right.name) || left.pool.localeCompare(right.pool))
}

export function filterArchiveRecords(
  records: readonly ArchiveRecord[],
  filters: ArchiveFilters,
): ArchiveRecord[] {
  const query = normalizedName(filters.query)

  return records.filter((record) => {
    if (filters.pool !== 'all' && record.pool !== filters.pool) return false
    if (filters.source !== 'all' && !record.sources.includes(filters.source)) return false
    if (!query) return true

    return `${record.name}\n${record.sections.join('\n')}`
      .toLocaleLowerCase('en-US')
      .includes(query)
  })
}
