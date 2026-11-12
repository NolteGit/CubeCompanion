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

function ChangeList({
  title,
  items,
}: {
  title: string
  items: readonly { name: string }[]
}) {
  return (
    <section className="change-list">
      <header><h3>{title}</h3><span>{items.length}</span></header>
      {items.length > 0 ? (
        <ul>{items.map((item) => <li key={item.name}>{item.name}</li>)}</ul>
      ) : (
        <p>None</p>
      )}
    </section>
  )
}

function DiffView({ diff }: { diff: SnapshotDiff }) {
  return (
    <>
      <div className="history-change-summary">
        <span><strong>{diff.addedDraft.length}</strong> draft added</span>
        <span><strong>{diff.removedDraft.length}</strong> draft removed</span>
        <span><strong>{diff.reallocatedDraft.length}</strong> reallocated</span>
        <span><strong>{diff.addedCommanders.length + diff.removedCommanders.length}</strong> commander changes</span>
      </div>

      <div className="history-diff-grid">
        <ChangeList title="Draft added" items={diff.addedDraft} />
        <ChangeList title="Draft removed" items={diff.removedDraft} />
        <section className="change-list">
          <header><h3>Reallocated</h3><span>{diff.reallocatedDraft.length}</span></header>
          {diff.reallocatedDraft.length > 0 ? (
            <ul>
              {diff.reallocatedDraft.map((change) => (
                <li key={change.card.oracleId}>
                  <strong>{change.card.name}</strong>
                  <small>{change.from} → {change.to}</small>
                </li>
              ))}
            </ul>
          ) : (
            <p>None</p>
          )}
        </section>
        <ChangeList
          title="Commanders added"
          items={diff.addedCommanders}
        />
        <ChangeList
          title="Commanders removed"
          items={diff.removedCommanders}
        />
      </div>
    </>
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
          <p>Immutable published states</p>
          <h2>Version history</h2>
        </div>
        <label>
          <span>Snapshot</span>
          <select value={selected.id} onChange={(event: ChangeEvent<HTMLSelectElement>) => setSelectedId(event.target.value)}>
            {historySnapshots.map((snapshot, index) => (
              <option key={snapshot.id} value={snapshot.id}>
                {index + 1}. {new Date(snapshot.createdAt).toLocaleDateString()} · {snapshot.id.slice(0, 8)}
              </option>
            ))}
          </select>
        </label>
      </header>

      <section className="snapshot-card">
        <div>
          <span className="snapshot-kicker">
            Snapshot {selected.id.slice(0, 8)}
            {selected.id === releaseInfo.snapshotId && <em>Current</em>}
          </span>
          <strong>{formatDate(selected.createdAt)}</strong>
        </div>
        <dl>
          <div><dt>Draft</dt><dd>{selected.draftCards.length}</dd></div>
          <div><dt>Commanders</dt><dd>{selected.commanders.length}</dd></div>
          <div><dt>Rules</dt><dd>v{selected.rulesRevision}</dd></div>
          <div><dt>Changes</dt><dd>{diff ? totalChanges(diff) : '—'}</dd></div>
        </dl>
      </section>

      {diff ? (
        <DiffView diff={diff} />
      ) : (
        <div className="history-first-state">
          <strong>First published state</strong>
          <p>There is no earlier official snapshot to compare against yet. Future releases appear here automatically once their generated history files are committed.</p>
        </div>
      )}
    </section>
  )
}
