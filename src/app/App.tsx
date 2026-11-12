import { CubeBrowser } from '../features/browser/CubeBrowser'
import { commanderCards, draftCards, releaseInfo } from '../features/browser/data'
import './app.css'

function formatPublishedAt(value: string): string {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(value))
}

function App() {
  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">MTG Commander Cube</p>
          <h1>Cube Companion</h1>
        </div>
        <div className="header-counts" aria-label="Current cube size">
          <span><strong>{draftCards.length}</strong> draft</span>
          <span><strong>{commanderCards.length}</strong> commanders</span>
        </div>
      </header>

      <main>
        <section className="release-strip" aria-label="Published cube version">
          <div>
            <strong>{releaseInfo.note ?? 'Current cube'}</strong>
            <span>Published {formatPublishedAt(releaseInfo.publishedAt)}</span>
          </div>
          <div className="release-meta">
            <span>Rules v{releaseInfo.rulesRevision}</span>
            <span title={releaseInfo.snapshotId}>Snapshot {releaseInfo.snapshotId.slice(0, 8)}</span>
          </div>
        </section>

        <CubeBrowser />
      </main>
    </div>
  )
}

export default App
