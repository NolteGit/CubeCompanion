import { useMemo, useState, type ReactNode } from 'react'
import { cardTint } from '../browser/cardTint'
import { commanderCards, draftCards } from '../browser/data'
import { HoverCard } from '../browser/HoverCard'
import type { BrowserCard } from '../browser/types'
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

function currentCardKey(pool: 'draft' | 'commander', name: string): string {
  return `${pool}:${normalizedName(name)}`
}

function ArchiveRow({
  record,
  card,
}: {
  record: ArchiveRecord
  card?: BrowserCard
}) {
  const className = `archive-row${card ? ` archive-row--${cardTint(card)}` : ''}`
  const content: ReactNode = (
    <>
      <div className="archive-card">
        <strong>{record.name}</strong>
        <small>{record.pool === 'draft' ? 'Cube' : 'Commander'}</small>
      </div>

      <div className="archive-sections">
        {record.sections.map((section) => <span key={section}>{section}</span>)}
      </div>

      <div className="archive-sources">
        {record.active && <span className="active-card">Active</span>}
        {record.sources.map((entrySource) => (
          <span key={entrySource}>
            {entrySource === 'workbook' ? 'Workbook' : 'History'}
          </span>
        ))}
      </div>
    </>
  )

  if (!card) {
    return <article className={className}>{content}</article>
  }

  return (
    <HoverCard card={card} className={className}>
      {content}
    </HoverCard>
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
  const currentCards = useMemo(() => {
    const cards = new Map<string, BrowserCard>()
    for (const card of draftCards) {
      cards.set(currentCardKey('draft', card.name), card)
    }
    for (const card of commanderCards) {
      cards.set(currentCardKey('commander', card.name), card)
    }
    return cards
  }, [])
  const visible = useMemo(
    () => filterArchiveRecords(records, { query, pool, source }),
    [pool, query, records, source],
  )
  const workbookCount = records.filter((record) => record.sources.includes('workbook')).length
  const historyCount = records.filter((record) => record.sources.includes('history')).length
  const activeCount = records.filter((record) => record.active).length
  const hasFilters = Boolean(query || pool !== 'all' || source !== 'all')

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
        <div className="archive-results">
          <header className="archive-results-header" aria-hidden="true">
            <span>Card</span>
            <span>Historical section</span>
            <span>Status / source</span>
          </header>

          {visible.map((record) => (
            <ArchiveRow
              record={record}
              card={currentCards.get(currentCardKey(record.pool, record.name))}
              key={record.key}
            />
          ))}
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
