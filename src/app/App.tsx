import { useEffect, useState, type ReactNode } from 'react'
import { AnalysisDashboard } from '../features/analysis/AnalysisDashboard'
import { ArchiveBrowser } from '../features/archive/ArchiveBrowser'
import { CubeBrowser } from '../features/browser/CubeBrowser'
import { commanderCards, draftCards, releaseInfo } from '../features/browser/data'
import { HistoryBrowser } from '../features/history/HistoryBrowser'
import { PlaytestTable } from '../features/playtest/PlaytestTable'
import { SandboxView } from '../features/sandbox/SandboxView'
import './app.css'
import {
  applyWorkspacePreferences,
  loadWorkspacePreferences,
  saveWorkspacePreferences,
  type WorkspacePreferences,
} from './preferences'

type AppPage = 'browse' | 'analysis' | 'sandbox' | 'customize' | 'playtest' | 'history' | 'archive'
type NavIcon = 'cards' | 'analysis' | 'changes' | 'customize' | 'more'

interface NavItem {
  page: AppPage
  label: string
  icon: NavIcon
}

const PRIMARY_NAV: readonly NavItem[] = [
  { page: 'browse', label: 'Cards', icon: 'cards' },
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
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="6" cy="12" r="1.2" />
      <circle cx="12" cy="12" r="1.2" />
      <circle cx="18" cy="12" r="1.2" />
    </svg>
  )
}

function NavButton({
  item,
  active,
  onClick,
}: {
  item: NavItem
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      className={active ? 'active' : ''}
      aria-current={active ? 'page' : undefined}
      title={item.label}
      onClick={onClick}
    >
      <NavGlyph icon={item.icon} />
      <span>{item.label}</span>
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

function App() {
  const [page, setPage] = useState<AppPage>('browse')
  const [preferences, setPreferences] = useState<WorkspacePreferences>(() =>
    loadWorkspacePreferences(window.localStorage),
  )
  const totalCards = draftCards.length + commanderCards.length
  const secondaryActive = page === 'playtest' || page === 'history' || page === 'archive'

  useEffect(() => {
    saveWorkspacePreferences(preferences, window.localStorage)
    applyWorkspacePreferences(preferences, document.documentElement)
  }, [preferences])

  function renderPage(): ReactNode {
    if (page === 'browse') {
      return (
        <CubeBrowser
          defaultPool={preferences.defaultPool}
          defaultView={preferences.defaultView}
        />
      )
    }
    if (page === 'analysis') return <AnalysisDashboard />
    if (page === 'sandbox') return <SandboxView />
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
          <nav className="primary-nav" aria-label="Cube Companion sections">
            {PRIMARY_NAV.map((item) => (
              <NavButton
                key={item.page}
                item={item}
                active={page === item.page}
                onClick={() => setPage(item.page)}
              />
            ))}
          </nav>

          <details className="sidebar-more">
            <summary className={secondaryActive ? 'active' : ''}>
              <NavGlyph icon="more" />
              <span>More</span>
            </summary>
            <div>
              <button
                className={page === 'playtest' ? 'active' : ''}
                aria-current={page === 'playtest' ? 'page' : undefined}
                title="Playtest"
                onClick={() => setPage('playtest')}
              >
                Playtest
              </button>
              <button
                className={page === 'history' ? 'active' : ''}
                aria-current={page === 'history' ? 'page' : undefined}
                title="History"
                onClick={() => setPage('history')}
              >
                History
              </button>
              <button
                className={page === 'archive' ? 'active' : ''}
                aria-current={page === 'archive' ? 'page' : undefined}
                title="Archive"
                onClick={() => setPage('archive')}
              >
                Archive
              </button>
            </div>
          </details>
        </aside>

        <main className="app-main">{renderPage()}</main>
      </div>
    </div>
  )
}

export default App
