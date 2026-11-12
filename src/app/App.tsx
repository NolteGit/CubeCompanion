import { useState } from 'react'
import { AnalysisDashboard } from '../features/analysis/AnalysisDashboard'
import { ArchiveBrowser } from '../features/archive/ArchiveBrowser'
import { CubeBrowser } from '../features/browser/CubeBrowser'
import { commanderCards, draftCards, releaseInfo } from '../features/browser/data'
import { HistoryBrowser } from '../features/history/HistoryBrowser'
import { PlaytestTable } from '../features/playtest/PlaytestTable'
import { SandboxView } from '../features/sandbox/SandboxView'
import './app.css'

type AppPage = 'browse' | 'playtest' | 'sandbox' | 'analysis' | 'history' | 'archive'

function formatPublishedAt(value: string): string {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(value))
}

function App() {
  const [page, setPage] = useState<AppPage>('browse')

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

        <div className="app-navigation-row">
          <nav className="app-nav" aria-label="Cube companion sections">
            <button className={page === 'browse' ? 'active' : ''} onClick={() => setPage('browse')}>
              Browse
            </button>
            <button className={page === 'playtest' ? 'active' : ''} onClick={() => setPage('playtest')}>
              Playtest
            </button>
            <button className={page === 'sandbox' ? 'active' : ''} onClick={() => setPage('sandbox')}>
              Sandbox
            </button>
            <button className={page === 'analysis' ? 'active' : ''} onClick={() => setPage('analysis')}>
              Analysis
            </button>
            <button className={page === 'history' ? 'active' : ''} onClick={() => setPage('history')}>
              History
            </button>
          </nav>
          <button
            className={`archive-nav${page === 'archive' ? ' active' : ''}`}
            onClick={() => setPage('archive')}
          >
            Archive
          </button>
        </div>

        {page === 'browse' && <CubeBrowser />}
        {page === 'playtest' && <PlaytestTable />}
        {page === 'sandbox' && <SandboxView />}
        {page === 'analysis' && <AnalysisDashboard />}
        {page === 'history' && <HistoryBrowser />}
        {page === 'archive' && <ArchiveBrowser />}
      </main>
    </div>
  )
}

export default App
