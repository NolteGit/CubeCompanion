import { useEffect, useState, type ReactNode } from 'react'
import { AnalysisDashboard } from '../features/analysis/AnalysisDashboard'
import { ArchiveBrowser } from '../features/archive/ArchiveBrowser'
import { CubeBrowser, type BrowserList } from '../features/browser/CubeBrowser'
import { commanderCards, draftCards, releaseInfo } from '../features/browser/data'
import { HistoryBrowser } from '../features/history/HistoryBrowser'
import { PlaytestTable } from '../features/playtest/PlaytestTable'
import { SandboxView } from '../features/sandbox/SandboxView'
import { loadSandboxState } from '../features/sandbox/storage'
import { sandboxChangeCount, sandboxDiff } from '../features/sandbox/state'
import './app.css'
import {
  hashForPage,
  pageFromHash,
  pageTitle,
  type AppPage,
} from './navigation'
import {
  applyWorkspacePreferences,
  loadWorkspacePreferences,
  saveWorkspacePreferences,
  type WorkspacePreferences,
} from './preferences'

type NavIcon =
  | 'cards'
  | 'commanders'
  | 'list'
  | 'analysis'
  | 'changes'
  | 'customize'
  | 'playtest'
  | 'history'
  | 'archive'

interface NavItem {
  page: AppPage
  label: string
  icon: NavIcon
}

const WORKSPACE_NAV: readonly NavItem[] = [
  { page: 'analysis', label: 'Analysis', icon: 'analysis' },
  { page: 'sandbox', label: 'Changes', icon: 'changes' },
  { page: 'customize', label: 'Customize', icon: 'customize' },
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
  if (icon === 'customize') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 7h7M15 7h5M4 17h5M13 17h7M4 12h12M20 12h0" />
        <circle cx="13" cy="7" r="2" />
        <circle cx="11" cy="17" r="2" />
        <circle cx="18" cy="12" r="2" />
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

function ChoiceGroup<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T
  options: readonly { value: T; label: string }[]
  onChange: (value: T) => void
}) {
  return (
    <div className="preference-options" role="group">
      {options.map((option) => (
        <button
          type="button"
          className={value === option.value ? 'active' : ''}
          key={option.value}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

function CustomizeView({
  preferences,
  onChange,
}: {
  preferences: WorkspacePreferences
  onChange: (preferences: WorkspacePreferences) => void
}) {
  return (
    <section className="customize-view" aria-label="Customize Cube Companion">
      <header className="customize-heading">
        <span>Preferences</span>
        <h2>Customize</h2>
        <p>Workspace preferences are stored locally in this browser.</p>
      </header>

      <div className="preferences-panel">
        <header>
          <h3>Cards</h3>
          <p>Choose how the card browser opens and how densely it is displayed.</p>
        </header>

        <div className="preference-row">
          <div>
            <strong>Default pool</strong>
            <span>Which pool opens when you return to Cards.</span>
          </div>
          <ChoiceGroup
            value={preferences.defaultPool}
            options={[
              { value: 'draft', label: 'Draft' },
              { value: 'commanders', label: 'Commanders' },
            ]}
            onChange={(defaultPool) => onChange({ ...preferences, defaultPool })}
          />
        </div>

        <div className="preference-row">
          <div>
            <strong>Default view</strong>
            <span>Open Cards as dense columns or card images.</span>
          </div>
          <ChoiceGroup
            value={preferences.defaultView}
            options={[
              { value: 'list', label: 'Columns' },
              { value: 'images', label: 'Images' },
            ]}
            onChange={(defaultView) => onChange({ ...preferences, defaultView })}
          />
        </div>

        <div className="preference-row">
          <div>
            <strong>Row density</strong>
            <span>Compact matches the current CubeCobra-style overview.</span>
          </div>
          <ChoiceGroup
            value={preferences.cardDensity}
            options={[
              { value: 'compact', label: 'Compact' },
              { value: 'comfortable', label: 'Comfortable' },
            ]}
            onChange={(cardDensity) => onChange({ ...preferences, cardDensity })}
          />
        </div>
      </div>

      <div className="preferences-panel">
        <header>
          <h3>Interaction</h3>
          <p>Control card inspection behavior across the workspace.</p>
        </header>

        <div className="preference-row">
          <div>
            <strong>Hover previews</strong>
            <span>Show card artwork and metadata when hovering card rows.</span>
          </div>
          <ChoiceGroup
            value={preferences.hoverPreviews ? 'on' : 'off'}
            options={[
              { value: 'on', label: 'On' },
              { value: 'off', label: 'Off' },
            ]}
            onChange={(value) => onChange({ ...preferences, hoverPreviews: value === 'on' })}
          />
        </div>
      </div>

      <div className="customize-note">
        <span>Theme</span>
        <strong>Dark workspace</strong>
        <p>Cube Companion currently uses one purpose-built dark theme.</p>
      </div>
    </section>
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
  const [preferences, setPreferences] = useState<WorkspacePreferences>(() =>
    loadWorkspacePreferences(window.localStorage),
  )
  const [cardList, setCardList] = useState<BrowserList>(() => preferences.defaultPool)
  const [pendingChangeCount, setPendingChangeCount] = useState(initialPendingChangeCount)
  const totalCards = draftCards.length + commanderCards.length

  useEffect(() => {
    saveWorkspacePreferences(preferences, window.localStorage)
    applyWorkspacePreferences(preferences, document.documentElement)
  }, [preferences])

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

  function openCardList(nextList: BrowserList) {
    setCardList(nextList)
    if (page !== 'browse') {
      window.history.pushState(null, '', hashForPage('browse'))
      setPage('browse')
    }
  }

  function renderPage(): ReactNode {
    if (page === 'browse') {
      return (
        <CubeBrowser
          list={cardList}
          defaultView={preferences.defaultView}
          onOpenChanges={() => navigate('sandbox')}
        />
      )
    }
    if (page === 'analysis') return <AnalysisDashboard />
    if (page === 'sandbox') {
      return <SandboxView onChangeCount={setPendingChangeCount} />
    }
    if (page === 'customize') {
      return <CustomizeView preferences={preferences} onChange={setPreferences} />
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
