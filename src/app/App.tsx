import { useEffect, useState, type ReactNode } from 'react'
import { AnalysisDashboard } from '../features/analysis/AnalysisDashboard'
import { ArchiveBrowser } from '../features/archive/ArchiveBrowser'
import { CubeBrowser, type BrowserList } from '../features/browser/CubeBrowser'
import {
  commanderCards,
  draftCards,
  maybeCommanderCards,
  maybeDraftCards,
  releaseInfo,
} from '../features/browser/data'
import { MaybeList } from '../features/browser/MaybeList'
import { HistoryBrowser } from '../features/history/HistoryBrowser'
import { PlaytestTable } from '../features/playtest/PlaytestTable'
import { SandboxView } from '../features/sandbox/SandboxView'
import { loadSandboxState, saveSandboxState } from '../features/sandbox/storage'
import { applySandboxCard, sandboxChangeCount, sandboxDiff } from '../features/sandbox/state'
import type { SandboxPool } from '../features/sandbox/types'
import type { BrowserCard } from '../features/browser/types'
import './app.css'
import {
  hashForPage,
  pageFromHash,
  pageTitle,
  type AppPage,
} from './navigation'

type NavIcon =
  | 'cards'
  | 'commanders'
  | 'maybe'
  | 'list'
  | 'analysis'
  | 'changes'
  | 'playtest'
  | 'history'
  | 'archive'

type LibraryList = BrowserList | 'maybe'

interface NavItem {
  page: AppPage
  label: string
  icon: NavIcon
}

const WORKSPACE_NAV: readonly NavItem[] = [
  { page: 'analysis', label: 'Analysis', icon: 'analysis' },
  { page: 'sandbox', label: 'Changes', icon: 'changes' },
]

function CubeMark() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <path d="M16 2.5 28 9.2v13.6L16 29.5 4 22.8V9.2L16 2.5Z" />
      <path d="m4.8 9.6 11.2 6.2 11.2-6.2M16 15.8v12.7" />
    </svg>
  )
}

function NavGlyph({ icon }: { icon: NavIcon }) {
  if (icon === 'cards') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="4" y="3.5" width="13" height="17" rx="2" />
        <path d="M8 7h5M8 10h5M19 6.5v11" />
      </svg>
    )
  }
  if (icon === 'commanders') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="m5 9 3 2 4-6 4 6 3-2-1.5 9h-11L5 9Z" />
        <path d="M7 15h10" />
      </svg>
    )
  }
  if (icon === 'maybe') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="m12 3 1.6 4.2L18 9l-4.4 1.8L12 15l-1.6-4.2L6 9l4.4-1.8L12 3Z" />
        <path d="m18.5 14.5.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8.8-2.2Z" />
      </svg>
    )
  }
  if (icon === 'list') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="5" cy="7" r="1" />
        <circle cx="5" cy="12" r="1" />
        <circle cx="5" cy="17" r="1" />
        <path d="M9 7h10M9 12h10M9 17h10" />
      </svg>
    )
  }
  if (icon === 'analysis') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M5 19V11M10 19V7M15 19V4M20 19v-6" />
      </svg>
    )
  }
  if (icon === 'changes') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M5 7h12l-3-3M19 17H7l3 3M17 7l-3 3M7 17l3-3" />
      </svg>
    )
  }
  if (icon === 'playtest') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="m9 7 8 5-8 5V7Z" />
        <rect x="4" y="4" width="16" height="16" rx="2.5" />
      </svg>
    )
  }
  if (icon === 'history') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M5 8V4M5 4h4M5 4l2.5 2.5A7.5 7.5 0 1 1 5.3 12" />
        <path d="M12 8v4l3 2" />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 8h14v11H5zM4 5h16v3H4z" />
      <path d="M10 12h4" />
    </svg>
  )
}

function SidebarNavButton({
  label,
  icon,
  active,
  onClick,
  count,
}: {
  label: string
  icon: NavIcon
  active: boolean
  onClick: () => void
  count?: number
}) {
  return (
    <button
      type="button"
      className={`sidebar-nav-button${active ? ' active' : ''}`}
      aria-current={active ? 'page' : undefined}
      title={count === undefined ? label : `${label} · ${count}`}
      onClick={onClick}
    >
      <NavGlyph icon={icon} />
      <span>{label}</span>
      {count !== undefined && (
        <small className={label === 'Changes list' && count > 0 ? 'pending' : ''}>{count}</small>
      )}
    </button>
  )
}

function initialPendingChangeCount(): number {
  const state = loadSandboxState(
    releaseInfo.snapshotId,
    draftCards,
    commanderCards,
    window.sessionStorage,
  )
  return sandboxChangeCount(sandboxDiff(state, draftCards, commanderCards))
}

function App() {
  const [page, setPage] = useState<AppPage>(() => pageFromHash(window.location.hash))
  const [cardList, setCardList] = useState<LibraryList>('draft')
  const [pendingChangeCount, setPendingChangeCount] = useState(initialPendingChangeCount)
  const totalCards = draftCards.length + commanderCards.length

  useEffect(() => {
    function syncPageFromUrl() {
      setPage(pageFromHash(window.location.hash))
    }

    window.addEventListener('popstate', syncPageFromUrl)
    window.addEventListener('hashchange', syncPageFromUrl)
    return () => {
      window.removeEventListener('popstate', syncPageFromUrl)
      window.removeEventListener('hashchange', syncPageFromUrl)
    }
  }, [])

  useEffect(() => {
    document.title = pageTitle(page)
  }, [page])

  function navigate(nextPage: AppPage) {
    if (nextPage === page) return
    window.history.pushState(null, '', hashForPage(nextPage))
    setPage(nextPage)
  }

  function openCardList(nextList: LibraryList) {
    setCardList(nextList)
    if (page !== 'browse') {
      window.history.pushState(null, '', hashForPage('browse'))
      setPage('browse')
    }
  }

  function addMaybeToChanges(card: BrowserCard, pool: SandboxPool): 'added' | 'unchanged' {
    const current = loadSandboxState(
      releaseInfo.snapshotId,
      draftCards,
      commanderCards,
      window.sessionStorage,
    )
    const next = applySandboxCard(current, card, pool)
    if (next === current) return 'unchanged'

    saveSandboxState(next, window.sessionStorage)
    setPendingChangeCount(
      sandboxChangeCount(sandboxDiff(next, draftCards, commanderCards)),
    )
    return 'added'
  }

  function renderPage(): ReactNode {
    if (page === 'browse') {
      if (cardList === 'maybe') {
        return <MaybeList onAddToChanges={addMaybeToChanges} />
      }
      return (
        <CubeBrowser
          list={cardList}
          onOpenChanges={() => navigate('sandbox')}
        />
      )
    }
    if (page === 'analysis') return <AnalysisDashboard />
    if (page === 'sandbox') {
      return <SandboxView onChangeCount={setPendingChangeCount} />
    }
    if (page === 'playtest') return <PlaytestTable />
    if (page === 'history') return <HistoryBrowser />
    return <ArchiveBrowser />
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand">
          <span className="brand-mark"><CubeMark /></span>
          <strong>Cube Companion</strong>
        </div>
        <div className="cube-title">
          <strong>MTG Commander Cube</strong>
          <span>{totalCards} cards</span>
          <span className="current-chip" title={`Snapshot ${releaseInfo.snapshotId}`}>Current</span>
        </div>
      </header>

      <div className="app-body">
        <aside className="app-sidebar">
          <div className="sidebar-nav-stack">
            <nav className="sidebar-nav-section" aria-label="Library">
              <span className="sidebar-section-label">Library</span>
              <SidebarNavButton
                label="Cube"
                icon="cards"
                count={draftCards.length}
                active={page === 'browse' && cardList === 'draft'}
                onClick={() => openCardList('draft')}
              />
              <SidebarNavButton
                label="Commanders"
                icon="commanders"
                count={commanderCards.length}
                active={page === 'browse' && cardList === 'commanders'}
                onClick={() => openCardList('commanders')}
              />
              <SidebarNavButton
                label="Maybe"
                icon="maybe"
                count={maybeDraftCards.length + maybeCommanderCards.length}
                active={page === 'browse' && cardList === 'maybe'}
                onClick={() => openCardList('maybe')}
              />
              <SidebarNavButton
                label="Changes list"
                icon="list"
                count={pendingChangeCount}
                active={page === 'browse' && cardList === 'changes'}
                onClick={() => openCardList('changes')}
              />
            </nav>

            <nav className="sidebar-nav-section" aria-label="Workspace">
              <span className="sidebar-section-label">Workspace</span>
              {WORKSPACE_NAV.map((item) => (
                <SidebarNavButton
                  key={item.page}
                  label={item.label}
                  icon={item.icon}
                  active={page === item.page}
                  onClick={() => navigate(item.page)}
                />
              ))}
            </nav>
          </div>

          <nav className="sidebar-nav-section sidebar-tools" aria-label="Tools">
            <span className="sidebar-section-label">Tools</span>
            <SidebarNavButton
              label="Playtest"
              icon="playtest"
              active={page === 'playtest'}
              onClick={() => navigate('playtest')}
            />
            <SidebarNavButton
              label="History"
              icon="history"
              active={page === 'history'}
              onClick={() => navigate('history')}
            />
            <SidebarNavButton
              label="Archive"
              icon="archive"
              active={page === 'archive'}
              onClick={() => navigate('archive')}
            />
          </nav>
        </aside>

        <main className="app-main">{renderPage()}</main>
      </div>
    </div>
  )
}

export default App
