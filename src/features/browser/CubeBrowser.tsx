import { useMemo, useState } from 'react'
import { loadSandboxState } from '../sandbox/storage'
import { sandboxChangeCount, sandboxDiff } from '../sandbox/state'
import { commanderCards, draftCards, releaseInfo } from './data'
import { CardCollection } from './CardCollection'
import {
  CARD_TYPE_OPTIONS,
  COMMANDER_SECTION_OPTIONS,
  DRAFT_SECTION_OPTIONS,
  filterAndSortCards,
  groupCards,
} from './selectors'
import type {
  BrowserCard,
  BrowserPool,
  BrowserSort,
  BrowserView,
  CardGroup,
  CardTypeFilter,
} from './types'
import './browser.css'

interface CubeBrowserProps {
  defaultPool?: BrowserPool
  defaultView?: BrowserView
}

interface ColumnSection {
  key: string
  label: string
  cards: BrowserCard[]
}

type LocalList = BrowserPool | 'changes'

const GUILD_LABELS: Readonly<Record<string, string>> = {
  WU: 'Azorius',
  UB: 'Dimir',
  BR: 'Rakdos',
  RG: 'Gruul',
  WG: 'Selesnya',
  WB: 'Orzhov',
  UR: 'Izzet',
  BG: 'Golgari',
  WR: 'Boros',
  UG: 'Simic',
}

function primaryType(card: BrowserCard): string {
  const order = ['Creature', 'Planeswalker', 'Instant', 'Sorcery', 'Artifact', 'Enchantment', 'Land']
  return order.find((type) => card.typeLine.includes(type)) ?? 'Other'
}

function filteredSubgroups(
  cards: readonly BrowserCard[],
  activeType: CardTypeFilter,
): ColumnSection[] {
  if (activeType === 'all') {
    const order = ['Creature', 'Planeswalker', 'Instant', 'Sorcery', 'Artifact', 'Enchantment', 'Land', 'Other']
    const groups = new Map<string, BrowserCard[]>()

    for (const card of cards) {
      const key = primaryType(card)
      const group = groups.get(key) ?? []
      group.push(card)
      groups.set(key, group)
    }

    return order
      .filter((key) => groups.has(key))
      .map((key) => ({ key: `type-${key}`, label: key, cards: groups.get(key) ?? [] }))
  }

  const groups = new Map<string, BrowserCard[]>()
  for (const card of cards) {
    const key = card.manaValue >= 7 ? '7+' : String(card.manaValue)
    const group = groups.get(key) ?? []
    group.push(card)
    groups.set(key, group)
  }

  return [...groups.entries()]
    .sort(([left], [right]) => {
      if (left === '7+') return 1
      if (right === '7+') return -1
      return Number(left) - Number(right)
    })
    .map(([key, group]) => ({ key: `mv-${key}`, label: `MV ${key}`, cards: group }))
}

function splitColumn(group: CardGroup, pool: BrowserPool): ColumnSection[] {
  if (pool === 'commanders') {
    return [{ key: 'commanders', label: 'Commanders', cards: group.cards }]
  }

  if (group.key === 'multicolor' || group.key === 'land') {
    const byGuild = new Map<string, BrowserCard[]>()
    for (const card of group.cards) {
      const guild = card.draftAllocation?.guild ?? 'other'
      const cards = byGuild.get(guild) ?? []
      cards.push(card)
      byGuild.set(guild, cards)
    }
    return [...byGuild.entries()].map(([key, cards]) => ({
      key,
      label: GUILD_LABELS[key] ?? (key === 'other' ? 'Other' : key),
      cards,
    }))
  }

  if (group.key === 'colorless') {
    const byType = new Map<string, BrowserCard[]>()
    for (const card of group.cards) {
      const type = primaryType(card)
      const cards = byType.get(type) ?? []
      cards.push(card)
      byType.set(type, cards)
    }
    return [...byType.entries()].map(([key, cards]) => ({ key, label: key, cards }))
  }

  const creatures = group.cards.filter((card) => card.typeLine.includes('Creature'))
  const noncreatures = group.cards.filter((card) => !card.typeLine.includes('Creature'))
  return [
    { key: 'creature', label: 'Creature', cards: creatures },
    { key: 'noncreature', label: 'Noncreature', cards: noncreatures },
  ].filter((columnSection) => columnSection.cards.length > 0)
}

function ToolGlyph({ name }: { name: 'list' | 'images' }) {
  if (name === 'images') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="3.5" y="4" width="17" height="16" rx="2" />
        <circle cx="9" cy="9" r="1.4" />
        <path d="m5.5 17 4.5-4 3 2.5 2.5-2 3 3.5" />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3.5" y="4" width="17" height="16" rx="2" />
      <path d="M9 4v16M3.5 10h17" />
    </svg>
  )
}


function ChangeListSection({
  title,
  cards,
  tone,
}: {
  title: string
  cards: readonly BrowserCard[]
  tone: 'added' | 'removed'
}) {
  if (cards.length === 0) return null

  return (
    <section className={`browser-change-section browser-change-section--${tone}`}>
      <header>
        <span>{title}</span>
        <strong>{cards.length}</strong>
      </header>
      <CardCollection cards={cards} view="list" />
    </section>
  )
}

export function CubeBrowser({
  defaultPool = 'draft',
  defaultView = 'list',
}: CubeBrowserProps) {
  const [localList, setLocalList] = useState<LocalList>(defaultPool)
  const [pool, setPool] = useState<BrowserPool>(defaultPool)
  const [sandboxState] = useState(() =>
    loadSandboxState(
      releaseInfo.snapshotId,
      draftCards,
      commanderCards,
      window.sessionStorage,
    ),
  )
  const [query, setQuery] = useState('')
  const [section, setSection] = useState('all')
  const [type, setType] = useState<CardTypeFilter>('all')
  const [sort, setSort] = useState<BrowserSort>('cube')
  const [view, setView] = useState<BrowserView>(defaultView)

  const pendingDiff = useMemo(
    () => sandboxDiff(sandboxState, draftCards, commanderCards),
    [sandboxState],
  )
  const pendingChangeCount = sandboxChangeCount(pendingDiff)
  const sourceCards = pool === 'draft' ? draftCards : commanderCards
  const sectionOptions = pool === 'draft' ? DRAFT_SECTION_OPTIONS : COMMANDER_SECTION_OPTIONS
  const visibleCards = useMemo(
    () => filterAndSortCards(sourceCards, pool, { query, section, type, sort }),
    [pool, query, section, sort, sourceCards, type],
  )
  const groups = useMemo(
    () => groupCards(visibleCards, pool),
    [pool, visibleCards],
  )
  const hasFilters = Boolean(query || section !== 'all' || type !== 'all' || sort !== 'cube')
  const denseColumns = view === 'list' && !hasFilters && sort === 'cube' && groups.length > 0
  const groupedFilteredResults = view === 'list' && hasFilters && sort === 'cube' && groups.length > 0

  function changeList(nextList: LocalList) {
    setLocalList(nextList)
    if (nextList !== 'changes') setPool(nextList)
    setQuery('')
    setSection('all')
    setType('all')
    setSort('cube')
  }

  function clearFilters() {
    setQuery('')
    setSection('all')
    setType('all')
    setSort('cube')
  }

  return (
    <section className="cards-workspace" aria-label="Cards">
      <aside className="cards-list-rail" aria-label="Card lists">
        <header>
          <span className="cards-list-icon" aria-hidden="true">☷</span>
          <strong>Lists</strong>
        </header>
        <nav>
          <button
            type="button"
            className={localList === 'draft' ? 'active' : ''}
            aria-current={localList === 'draft' ? 'page' : undefined}
            onClick={() => changeList('draft')}
          >
            <span>Cube</span>
            <small>{draftCards.length}</small>
          </button>
          <button
            type="button"
            className={localList === 'commanders' ? 'active' : ''}
            aria-current={localList === 'commanders' ? 'page' : undefined}
            onClick={() => changeList('commanders')}
          >
            <span>Commanders</span>
            <small>{commanderCards.length}</small>
          </button>
          <button
            type="button"
            className={localList === 'changes' ? 'active' : ''}
            aria-current={localList === 'changes' ? 'page' : undefined}
            onClick={() => changeList('changes')}
          >
            <span>Changes</span>
            <small className={pendingChangeCount > 0 ? 'pending' : ''}>{pendingChangeCount}</small>
          </button>
        </nav>
      </aside>

      <div className="cube-browser">
        {localList === 'changes' ? (
          <section className="browser-changes" aria-label="Pending card changes">
            <header className="browser-changes-heading">
              <div>
                <span>Working list</span>
                <h2>Changes</h2>
                <p>Read-only view of the current session diff. Edit cards in the Changes workspace.</p>
              </div>
              <strong>{pendingChangeCount} pending</strong>
            </header>

            {pendingChangeCount === 0 ? (
              <div className="browser-changes-empty">
                <span>±</span>
                <strong>No pending changes</strong>
                <p>Add or remove cards in the Changes workspace and they will appear here.</p>
              </div>
            ) : (
              <div className="browser-change-groups">
                <ChangeListSection title="Cube · Added" cards={pendingDiff.addedDraft} tone="added" />
                <ChangeListSection title="Cube · Removed" cards={pendingDiff.removedDraft} tone="removed" />
                <ChangeListSection title="Commanders · Added" cards={pendingDiff.addedCommanders} tone="added" />
                <ChangeListSection title="Commanders · Removed" cards={pendingDiff.removedCommanders} tone="removed" />
              </div>
            )}
          </section>
        ) : (
          <>
            <div className="browser-toolbar">
        <div className="view-toggle" role="group" aria-label="Card view">
          <button
            title="Column view"
            className={view === 'list' ? 'active' : ''}
            onClick={() => setView('list')}
          >
            <ToolGlyph name="list" />
          </button>
          <button
            title="Image view"
            className={view === 'images' ? 'active' : ''}
            onClick={() => setView('images')}
          >
            <ToolGlyph name="images" />
          </button>
        </div>

        <label className="browser-search">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="11" cy="11" r="6.5" />
            <path d="m16 16 4 4" />
          </svg>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search cards…"
            aria-label="Search cards"
          />
        </label>
      </div>

      <div className={`filter-dock${hasFilters ? ' active' : ''}`}>
        <div className="filter-row">
          <span className="filter-row-label">{pool === 'draft' ? 'Section' : 'Color'}</span>
          <div
            className="filter-chips section-chips"
            role="group"
            aria-label={pool === 'draft' ? 'Draft section' : 'Commander color'}
          >
            {sectionOptions.map((option) => (
              <button
                type="button"
                className={`filter-chip${section === option.value ? ' active' : ''}${option.value === 'all' ? '' : ` cube-theme cube-theme--${option.value}`}`}
                key={option.value}
                onClick={() => setSection(option.value)}
              >
                {option.value !== 'all' && <span className="filter-chip-dot" aria-hidden="true" />}
                {option.label}
              </button>
            ))}
          </div>

          <div className="filter-status">
            <span><strong>{visibleCards.length}</strong> of {sourceCards.length} cards</span>
            {hasFilters && <button className="clear-filters" onClick={clearFilters}>Reset</button>}
          </div>
        </div>

        <div className="filter-row filter-row-secondary">
          <span className="filter-row-label">Type</span>
          <div className="filter-chips type-chips" role="group" aria-label="Card type">
            {CARD_TYPE_OPTIONS.map((option) => (
              <button
                type="button"
                className={`filter-chip${type === option.value ? ' active' : ''}`}
                key={option.value}
                onClick={() => setType(option.value)}
              >
                {option.label.replace('All card types', 'All')}
              </button>
            ))}
          </div>

          <div className="sort-control" role="group" aria-label="Sort cards">
            <span>Sort</span>
            {([
              ['cube', 'Cube'],
              ['name', 'Name'],
              ['mana', 'Mana'],
            ] as const).map(([value, label]) => (
              <button
                type="button"
                className={sort === value ? 'active' : ''}
                key={value}
                onClick={() => setSort(value)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {visibleCards.length === 0 ? (
        <div className="empty-state">
          <strong>No cards found</strong>
          <span>Try changing the search or filters.</span>
          <button type="button" onClick={clearFilters}>Reset filters</button>
        </div>
      ) : denseColumns ? (
        <div className="cube-columns">
          {groups.map((group) => (
            <section
              className={`cube-column cube-column--${group.key} cube-theme cube-theme--${group.key}`}
              key={group.key}
            >
              <header className="column-heading">
                <span className="section-dot" aria-hidden="true" />
                <h2>{group.label}</h2>
                <span>{group.cards.length}</span>
              </header>
              <div className="column-sections">
                {splitColumn(group, pool).map((columnSection) => (
                  <section className="column-section" key={columnSection.key}>
                    <header>
                      <strong>{columnSection.label}</strong>
                      <span>{columnSection.cards.length}</span>
                    </header>
                    <CardCollection cards={columnSection.cards} view="list" />
                  </section>
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : groupedFilteredResults ? (
        <div className="filtered-results">
          <div className="filtered-results-heading">
            <div>
              <strong>{visibleCards.length}</strong>
              <span>matching cards</span>
            </div>
            <span>
              Grouped by {pool === 'draft' ? 'section' : 'color identity'} · then {type === 'all' ? 'type' : 'mana value'}
            </span>
          </div>

          <div className="filtered-groups">
            {groups.map((group) => (
              <section
                className={`filtered-group cube-theme cube-theme--${group.key}`}
                key={group.key}
              >
                <header>
                  <span className="section-dot" aria-hidden="true" />
                  <h2>{group.label}</h2>
                  <span>{group.cards.length}</span>
                </header>
                <div className="filtered-subgroups">
                  {filteredSubgroups(group.cards, type).map((subgroup) => (
                    <section className="filtered-subgroup" key={subgroup.key}>
                      <header>
                        <strong>{subgroup.label}</strong>
                        <span>{subgroup.cards.length}</span>
                      </header>
                      <CardCollection cards={subgroup.cards} view="list" />
                    </section>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>
      ) : (
        <div className="filtered-results">
          <div className="filtered-results-heading">
            <div>
              <strong>{visibleCards.length}</strong>
              <span>matching cards</span>
            </div>
            <span>{sort === 'name' ? 'Sorted by name' : sort === 'mana' ? 'Sorted by mana value' : 'Image view'}</span>
          </div>
          <CardCollection cards={visibleCards} view={view} />
        </div>
      )}
          </>
        )}
      </div>
    </section>
  )
}
