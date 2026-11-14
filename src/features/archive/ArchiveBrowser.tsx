import { useMemo, useState, type ReactNode } from 'react'
import { cardTint } from '../browser/cardTint'
import { browserCardFromName, commanderCards, draftCards } from '../browser/data'
import { HoverCard } from '../browser/HoverCard'
import { groupCards } from '../browser/selectors'
import type { BrowserCard, CardGroup } from '../browser/types'
import { historySnapshots } from '../history/data'
import {
  buildArchiveRecords,
  filterArchiveRecords,
  type ArchivePoolFilter,
  type ArchiveRecord,
  type ArchiveSourceFilter,
} from './archive'
import { workbookArchiveEntries } from './data'
import './archive.css'
import './archiveColumns.css'

type ArchiveColorKey =
  | 'white'
  | 'blue'
  | 'black'
  | 'red'
  | 'green'
  | 'multicolor'
  | 'colorless'
  | 'land'

interface ArchiveItem {
  record: ArchiveRecord
  card?: BrowserCard
}

interface ArchiveColorColumn {
  key: ArchiveColorKey
  label: string
  items: ArchiveItem[]
}

interface ArchiveCommanderGroup {
  key: string
  label: string
  items: ArchiveItem[]
}

const ARCHIVE_COLOR_COLUMNS: readonly { key: ArchiveColorKey; label: string }[] = [
  { key: 'white', label: 'White' },
  { key: 'blue', label: 'Blue' },
  { key: 'black', label: 'Black' },
  { key: 'red', label: 'Red' },
  { key: 'green', label: 'Green' },
  { key: 'multicolor', label: 'Multicolor' },
  { key: 'colorless', label: 'Colorless' },
  { key: 'land', label: 'Lands' },
]

const COMMANDER_GROUP_ORDER = [
  '1-W', '1-U', '1-B', '1-R', '1-G',
  '2-WU', '2-UB', '2-BR', '2-RG', '2-WG',
  '2-WB', '2-UR', '2-BG', '2-WR', '2-UG',
  '3-WUB', '3-UBR', '3-BRG', '3-WRG', '3-WUG',
  '3-WUR', '3-WBR', '3-WBG', '3-UBG', '3-URG',
  '4-WUBR', '4-WUBG', '4-WURG', '4-WBRG', '4-UBRG',
  '5-WUBRG', '0-color',
] as const

const COMMANDER_GROUP_INDEX = new Map<string, number>(
  COMMANDER_GROUP_ORDER.map((key, index) => [key, index]),
)

const POOL_OPTIONS: readonly { value: ArchivePoolFilter; label: string }[] = [
  { value: 'all', label: 'All pools' },
  { value: 'draft', label: 'Cube' },
  { value: 'commander', label: 'Commanders' },
]

const SOURCE_OPTIONS: readonly { value: ArchiveSourceFilter; label: string }[] = [
  { value: 'all', label: 'All sources' },
  { value: 'workbook', label: 'Workbook' },
  { value: 'history', label: 'History' },
]

function normalizedName(value: string): string {
  return value.trim().toLocaleLowerCase('en-US')
}

function archiveColorKey(item: ArchiveItem): ArchiveColorKey {
  if (item.card) return cardTint(item.card)

  const sections = item.record.sections.map(normalizedName)
  if (sections.includes('land')) return 'land'
  if (sections.includes('white')) return 'white'
  if (sections.includes('blue')) return 'blue'
  if (sections.includes('black')) return 'black'
  if (sections.includes('red')) return 'red'
  if (sections.includes('green')) return 'green'
  if (sections.includes('colorless')) return 'colorless'
  return 'multicolor'
}

function archiveMeta(record: ArchiveRecord): string {
  const sources = record.sources.map((entrySource) =>
    entrySource === 'workbook' ? 'Workbook' : 'History',
  )
  return [...record.sections, ...(record.active ? ['Active'] : []), ...sources].join(' · ')
}

function ArchiveCardRow({ item }: { item: ArchiveItem }) {
  const { record, card } = item
  const meta = archiveMeta(record)
  const content: ReactNode = (
    <>
      <strong title={`${record.name} — ${meta}`}>{record.name}</strong>
      {record.active && (
        <span
          className="archive-active-dot"
          title="Active in the current cube"
          aria-label="Active in the current cube"
        />
      )}
    </>
  )

  if (!card) {
    return <div className="archive-column-card">{content}</div>
  }

  return (
    <HoverCard card={card} className="archive-column-card">
      {content}
    </HoverCard>
  )
}

function archiveColumns(items: readonly ArchiveItem[]): ArchiveColorColumn[] {
  return ARCHIVE_COLOR_COLUMNS.map(({ key, label }) => ({
    key,
    label,
    items: items
      .filter((item) => archiveColorKey(item) === key)
      .sort((left, right) => left.record.name.localeCompare(right.record.name)),
  }))
}

function CubeColumnSections({
  column,
}: {
  column: ArchiveColorColumn
}) {
  const groups = column.key === 'land'
    ? [{ label: 'Land', items: column.items }]
    : [
        {
          label: 'Creature',
          items: column.items.filter((item) => item.card?.typeLine.includes('Creature')),
        },
        {
          label: 'Noncreature',
          items: column.items.filter(
            (item) => item.card && !item.card.typeLine.includes('Creature'),
          ),
        },
        {
          label: 'Other',
          items: column.items.filter((item) => !item.card),
        },
      ]

  return (
    <div className="archive-column-sections">
      {groups.filter((group) => group.items.length > 0).map((group) => (
        <section className="archive-column-section" key={group.label}>
          <header>
            <strong>{group.label}</strong>
            <span>{group.items.length}</span>
          </header>
          <div className="archive-column-cards">
            {group.items.map((item) => (
              <ArchiveCardRow item={item} key={item.record.key} />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}

function ArchiveCubeBoard({ items }: { items: readonly ArchiveItem[] }) {
  if (items.length === 0) return null
  const columns = archiveColumns(items)

  return (
    <section className="archive-pool-board">
      <header className="archive-pool-heading">
        <strong>Cube archive</strong>
        <span>{items.length}</span>
      </header>

      <div className="archive-color-columns">
        {columns.map((column) => (
          <section
            className={`archive-color-column archive-color-column--${column.key}`}
            key={column.key}
          >
            <header>
              <span className="archive-color-dot" aria-hidden="true" />
              <strong>{column.label}</strong>
              <span>{column.items.length}</span>
            </header>

            {column.items.length > 0 ? (
              <CubeColumnSections column={column} />
            ) : (
              <div className="archive-column-empty">—</div>
            )}
          </section>
        ))}
      </div>
    </section>
  )
}

function resolvedCommanderGroup(card: BrowserCard): CardGroup {
  return groupCards([card], 'commanders')[0]
}

function legacyCommanderGroup(record: ArchiveRecord): { key: string; label: string } {
  const section = record.sections[0] ?? 'Other'
  const normalized = normalizedName(section)

  const mono: Readonly<Record<string, { key: string; label: string }>> = {
    white: { key: '1-W', label: 'White' },
    blue: { key: '1-U', label: 'Blue' },
    black: { key: '1-B', label: 'Black' },
    red: { key: '1-R', label: 'Red' },
    green: { key: '1-G', label: 'Green' },
    colorless: { key: '0-color', label: 'Colorless' },
  }
  return mono[normalized] ?? {
    key: `legacy-${normalized}`,
    label: normalized === 'dual' || normalized === 'multicolor'
      ? 'Legacy multicolor'
      : section,
  }
}

function commanderGroups(items: readonly ArchiveItem[]): ArchiveCommanderGroup[] {
  const groups = new Map<string, ArchiveCommanderGroup>()

  for (const item of items) {
    const group = item.card
      ? resolvedCommanderGroup(item.card)
      : legacyCommanderGroup(item.record)
    const current = groups.get(group.key) ?? {
      key: group.key,
      label: group.label,
      items: [],
    }
    current.items.push(item)
    groups.set(group.key, current)
  }

  return [...groups.values()]
    .map((group) => ({
      ...group,
      items: [...group.items].sort((left, right) =>
        left.record.name.localeCompare(right.record.name),
      ),
    }))
    .sort((left, right) => {
      const leftIndex = COMMANDER_GROUP_INDEX.get(left.key) ?? Number.MAX_SAFE_INTEGER
      const rightIndex = COMMANDER_GROUP_INDEX.get(right.key) ?? Number.MAX_SAFE_INTEGER
      return leftIndex - rightIndex || left.label.localeCompare(right.label)
    })
}

function ArchiveCommanderBoard({ items }: { items: readonly ArchiveItem[] }) {
  if (items.length === 0) return null
  const groups = commanderGroups(items)

  return (
    <section className="archive-pool-board">
      <header className="archive-pool-heading">
        <strong>Commander archive</strong>
        <span>{items.length}</span>
      </header>

      <div className="archive-commander-groups">
        {groups.map((group) => (
          <section
            className={`archive-commander-group cube-theme cube-theme--${group.key}`}
            key={group.key}
          >
            <header>
              <span className="archive-color-dot" aria-hidden="true" />
              <strong>{group.label}</strong>
              <span>{group.items.length}</span>
            </header>
            <div className="archive-column-cards">
              {group.items.map((item) => (
                <ArchiveCardRow item={item} key={item.record.key} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </section>
  )
}

export function ArchiveBrowser() {
  const [query, setQuery] = useState('')
  const [pool, setPool] = useState<ArchivePoolFilter>('all')
  const [source, setSource] = useState<ArchiveSourceFilter>('all')
  const records = useMemo(
    () => buildArchiveRecords(
      workbookArchiveEntries,
      historySnapshots,
      draftCards,
      commanderCards,
    ),
    [],
  )
  const visible = useMemo(
    () => filterArchiveRecords(records, { query, pool, source }),
    [pool, query, records, source],
  )
  const visibleItems = useMemo(
    () => visible.map((record, index) => ({
      record,
      card: browserCardFromName(record.name, index),
    })),
    [visible],
  )
  const workbookCount = records.filter((record) => record.sources.includes('workbook')).length
  const historyCount = records.filter((record) => record.sources.includes('history')).length
  const activeCount = records.filter((record) => record.active).length
  const hasFilters = Boolean(query || pool !== 'all' || source !== 'all')
  const visibleDraft = visibleItems.filter((item) => item.record.pool === 'draft')
  const visibleCommanders = visibleItems.filter((item) => item.record.pool === 'commander')

  function clearFilters() {
    setQuery('')
    setPool('all')
    setSource('all')
  }

  return (
    <section className="archive-view" aria-label="Cube archive">
      <header className="archive-heading">
        <div>
          <span className="archive-eyebrow">Historical reference</span>
          <h2>Archive</h2>
          <p>Search cards recorded in the workbook archive and published cube history.</p>
        </div>
      </header>

      <div className="archive-summary-line">
        <div className="archive-summary-stats">
          <span><strong>{records.length}</strong> known</span>
          <span><strong>{workbookCount}</strong> workbook</span>
          <span><strong>{historyCount}</strong> history</span>
          <span className="active"><strong>{activeCount}</strong> active</span>
        </div>
        <p>Workbook names and historical sections are preserved as recorded.</p>
      </div>

      <div className={`archive-filter-dock${hasFilters ? ' active' : ''}`}>
        <label className="archive-search">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="11" cy="11" r="6.5" />
            <path d="m16 16 4 4" />
          </svg>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search card or historical section…"
            aria-label="Search archive"
          />
        </label>

        <div className="archive-filter-group">
          <span>Pool</span>
          <div className="archive-filter-chips" role="group" aria-label="Archive pool">
            {POOL_OPTIONS.map((option) => (
              <button
                type="button"
                className={pool === option.value ? 'active' : ''}
                key={option.value}
                onClick={() => setPool(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="archive-filter-group">
          <span>Source</span>
          <div className="archive-filter-chips" role="group" aria-label="Archive source">
            {SOURCE_OPTIONS.map((option) => (
              <button
                type="button"
                className={source === option.value ? 'active' : ''}
                key={option.value}
                onClick={() => setSource(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="archive-filter-status">
          <span><strong>{visible.length}</strong> of {records.length}</span>
          {hasFilters && <button type="button" onClick={clearFilters}>Reset</button>}
        </div>
      </div>

      {visible.length > 0 ? (
        <div className="archive-pools">
          <ArchiveCubeBoard items={visibleDraft} />
          <ArchiveCommanderBoard items={visibleCommanders} />
        </div>
      ) : (
        <div className="archive-empty">
          <strong>No archive entries found</strong>
          <span>Try changing the search or filters.</span>
          <button type="button" onClick={clearFilters}>Reset filters</button>
        </div>
      )}
    </section>
  )
}
