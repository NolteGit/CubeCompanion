import { useMemo, useState, type ChangeEvent } from 'react'
import type { CubeCard } from '../../domain'
import { browserCardFromCubeCard, releaseInfo } from '../browser/data'
import { cardTint } from '../browser/cardTint'
import { HoverCard } from '../browser/HoverCard'
import { historySnapshots } from './data'
import { diffSnapshots, totalChanges, type SnapshotDiff } from './diff'
import './history.css'

function formatDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

function HistoryChangeSide({
  title,
  tone,
  cards,
}: {
  title: 'IN' | 'OUT'
  tone: 'added' | 'removed'
  cards: readonly CubeCard[]
}) {
  return (
    <section className={`history-change-side history-change-side--${tone}`}>
      <header>
        <div>
          <strong>{title}</strong>
          <span>{tone === 'added' ? 'Coming in' : 'Going out'}</span>
        </div>
        <b>{cards.length}</b>
      </header>

      {cards.length === 0 ? (
        <p className="history-change-empty">
          {tone === 'added' ? 'No cards coming in.' : 'No cards going out.'}
        </p>
      ) : (
        <div className="history-change-rows">
          {cards.map((item, index) => {
            const card = browserCardFromCubeCard(item, index)
            return (
              <HoverCard
                card={card}
                className={`history-change-row history-change-row--${tone} history-change-row--${cardTint(card)}`}
                key={item.oracleId}
              >
                <span className="history-change-sign">{tone === 'added' ? '+' : '−'}</span>
                <div>
                  <strong>{item.name}</strong>
                  <small>{card.typeLine || 'Card'}</small>
                </div>
              </HoverCard>
            )
          })}
        </div>
      )}
    </section>
  )
}

function HistoryPoolChanges({
  title,
  added,
  removed,
}: {
  title: string
  added: readonly CubeCard[]
  removed: readonly CubeCard[]
}) {
  return (
    <section className="history-pool">
      <header className="history-pool-heading">
        <div>
          <h3>{title}</h3>
          <p>{added.length + removed.length} changes</p>
        </div>
      </header>

      <div className="history-pool-board">
        <HistoryChangeSide title="IN" tone="added" cards={added} />
        <HistoryChangeSide title="OUT" tone="removed" cards={removed} />
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
        <div className="history-diff-summary">
          <span className="added"><strong>IN</strong> {added}</span>
          <span className="removed"><strong>OUT</strong> {removed}</span>
          <span>Net {added - removed >= 0 ? '+' : ''}{added - removed}</span>
        </div>
      </header>

      <div className="history-pools">
        <HistoryPoolChanges title="Cube" added={diff.addedDraft} removed={diff.removedDraft} />
        <HistoryPoolChanges
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
          <span>Cube</span>
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
