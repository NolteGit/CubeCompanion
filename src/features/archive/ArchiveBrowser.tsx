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

  return (
    <section className="archive-view" aria-label="Cube archive">
      <header className="archive-heading">
        <div>
          <p>Historical reference</p>
          <h2>Archive</h2>
        </div>
        <span>{records.length} known historical entries</span>
      </header>

      <div className="archive-note">
        Workbook archive names are preserved exactly as recorded. Published history contributes
        cards that no longer belong to the current pool.
      </div>

      <div className="archive-filters">
        <label className="archive-search">
          <span>Search</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Card name or historical section…"
          />
        </label>
        <label>
          <span>Pool</span>
          <select
            value={pool}
            onChange={(event) => setPool(event.target.value as ArchivePoolFilter)}
          >
            <option value="all">All pools</option>
            <option value="draft">Draft</option>
            <option value="commander">Commanders</option>
          </select>
        </label>
        <label>
          <span>Source</span>
          <select
            value={source}
            onChange={(event) => setSource(event.target.value as ArchiveSourceFilter)}
          >
            <option value="all">All sources</option>
            <option value="workbook">Workbook archive</option>
            <option value="history">Published history</option>
          </select>
        </label>
      </div>

      <div className="archive-summary">
        <strong>{visible.length}</strong> of {records.length} entries
      </div>

      {visible.length > 0 ? (
        <div className="archive-results">
          {visible.map((record) => (
            <article className="archive-row" key={record.key}>
              <div>
                <strong>{record.name}</strong>
                <span>{record.pool === 'draft' ? 'Draft' : 'Commander'}</span>
              </div>
              <div className="archive-sections">
                {record.sections.map((section) => <span key={section}>{section}</span>)}
              </div>
              <div className="archive-sources">
                {record.active && <span className="active-card">Currently active</span>}
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
        <div className="archive-empty">No archive entries match these filters.</div>
      )}
    </section>
  )
}
