import { useMemo, useState, type ChangeEvent } from 'react'
import { releaseInfo } from '../browser/data'
import { historySnapshots } from './data'
import { diffSnapshots, totalChanges, type SnapshotDiff } from './diff'
import './history.css'

function formatDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

function ChangeColumn({
  title,
  added,
  removed,
}: {
  title: string
  added: readonly { name: string }[]
  removed: readonly { name: string }[]
}) {
  return (
    <section className="history-change-column">
      <header>
        <div>
          <h3>{title}</h3>
          <p>{added.length + removed.length} changes</p>
        </div>
      </header>

      <div className="history-change-block history-change-block--added">
        <div className="history-change-label">
          <span>Added</span>
          <strong>{added.length}</strong>
        </div>
        {added.length > 0 ? (
          added.map((item) => (
            <div className="history-change-row" key={item.name}>
              <span>+</span>
              <strong>{item.name}</strong>
            </div>
          ))
        ) : (
          <p className="history-change-empty">No additions</p>
        )}
      </div>

      <div className="history-change-block history-change-block--removed">
        <div className="history-change-label">
          <span>Removed</span>
          <strong>{removed.length}</strong>
        </div>
        {removed.length > 0 ? (
          removed.map((item) => (
            <div className="history-change-row" key={item.name}>
              <span>−</span>
              <strong>{item.name}</strong>
            </div>
          ))
        ) : (
          <p className="history-change-empty">No removals</p>
        )}
      </div>
    </section>
  )
}

function DiffView({ diff }: { diff: SnapshotDiff }) {
  const added = diff.addedDraft.length + diff.addedCommanders.length
  const removed = diff.removedDraft.length + diff.removedCommanders.length

  return (
    <section className="history-comparison">
      <header className="history-comparison-heading">
        <div>
          <h3>Changes from previous snapshot</h3>
          <p>Only card additions and removals are tracked.</p>
        </div>
        <div className="history-diff-pills">
          <span className="added">+{added} added</span>
          <span className="removed">−{removed} removed</span>
        </div>
      </header>

      <div className="history-diff-grid">
        <ChangeColumn title="Draft" added={diff.addedDraft} removed={diff.removedDraft} />
        <ChangeColumn
          title="Commanders"
          added={diff.addedCommanders}
          removed={diff.removedCommanders}
        />
      </div>
    </section>
  )
}

export function HistoryBrowser() {
  const latest = historySnapshots.at(-1)
  const [selectedId, setSelectedId] = useState(latest?.id ?? '')
  const selectedIndex = historySnapshots.findIndex((snapshot) => snapshot.id === selectedId)
  const selected = selectedIndex >= 0 ? historySnapshots[selectedIndex] : latest
  const previous = selectedIndex > 0 ? historySnapshots[selectedIndex - 1] : undefined
  const diff = useMemo(
    () => (selected && previous ? diffSnapshots(previous, selected) : undefined),
    [previous, selected],
  )

  if (!selected) {
    return <section className="history-empty">No published history snapshots found.</section>
  }

  return (
    <section className="history-view" aria-label="Cube history">
      <header className="history-heading">
        <div>
          <span className="history-eyebrow">Published snapshots</span>
          <h2>Version history</h2>
          <p>Browse immutable cube states and compare each release with the one before it.</p>
        </div>

        <label className="snapshot-picker">
          <span>Snapshot</span>
          <select
            value={selected.id}
            onChange={(event: ChangeEvent<HTMLSelectElement>) => setSelectedId(event.target.value)}
          >
            {historySnapshots.map((snapshot, index) => (
              <option key={snapshot.id} value={snapshot.id}>
                {index + 1}. {new Date(snapshot.createdAt).toLocaleDateString()} · {snapshot.id.slice(0, 8)}
              </option>
            ))}
          </select>
        </label>
      </header>

      <div className="snapshot-summary">
        <div className="snapshot-identity">
          <span>
            {selected.id === releaseInfo.snapshotId ? 'Current snapshot' : 'Published snapshot'}
          </span>
          <strong>{formatDate(selected.createdAt)}</strong>
          <small>{selected.id.slice(0, 12)}</small>
        </div>

        <div className="snapshot-stat">
          <span>Draft</span>
          <strong>{selected.draftCards.length}</strong>
        </div>
        <div className="snapshot-stat">
          <span>Commanders</span>
          <strong>{selected.commanders.length}</strong>
        </div>
        <div className="snapshot-stat">
          <span>Rules</span>
          <strong>v{selected.rulesRevision}</strong>
        </div>
        <div className="snapshot-stat">
          <span>Changes</span>
          <strong>{diff ? totalChanges(diff) : '—'}</strong>
        </div>
      </div>

      {diff ? (
        <DiffView diff={diff} />
      ) : (
        <div className="history-first-state">
          <span>01</span>
          <div>
            <strong>First published state</strong>
            <p>There is no earlier official snapshot to compare with this release.</p>
          </div>
        </div>
      )}
    </section>
  )
}
