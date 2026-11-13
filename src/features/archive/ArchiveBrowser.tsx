import { useMemo, useState } from 'react'
import { commanderCards, draftCards } from '../browser/data'
import { historySnapshots } from '../history/data'
import {
  buildArchiveRecords,
  filterArchiveRecords,
  type ArchivePoolFilter,
  type ArchiveSourceFilter,
} from './archive'
import { workbookArchiveEntries } from './data'
import './archive.css'

const POOL_OPTIONS: readonly { value: ArchivePoolFilter; label: string }[] = [
  { value: 'all', label: 'All pools' },
  { value: 'draft', label: 'Draft' },
  { value: 'commander', label: 'Commanders' },
]

const SOURCE_OPTIONS: readonly { value: ArchiveSourceFilter; label: string }[] = [
  { value: 'all', label: 'All sources' },
  { value: 'workbook', label: 'Workbook' },
  { value: 'history', label: 'Published history' },
]

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
          <p>Look up cards recorded in workbook archives or recovered from published snapshots.</p>
        </div>
      </header>

      <div className="archive-summary-strip">
        <div>
          <span>Known entries</span>
          <strong>{records.length}</strong>
        </div>
        <div>
          <span>Workbook</span>
          <strong>{workbookCount}</strong>
        </div>
        <div>
          <span>Published history</span>
          <strong>{historyCount}</strong>
        </div>
        <div>
          <span>Still active</span>
          <strong>{activeCount}</strong>
        </div>
        <p>
          Workbook names and sections are preserved exactly as recorded.
        </p>
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
            placeholder="Search card name or historical section…"
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
            <span>Source</span>
          </header>

          {visible.map((record) => (
            <article className="archive-row" key={record.key}>
              <div className="archive-card">
                <strong>{record.name}</strong>
                <span className={`archive-pool archive-pool--${record.pool}`}>
                  {record.pool === 'draft' ? 'Draft' : 'Commander'}
                </span>
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
            </article>
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
