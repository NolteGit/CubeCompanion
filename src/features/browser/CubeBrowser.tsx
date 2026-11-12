import { useMemo, useState } from 'react'
import { commanderCards, draftCards } from './data'
import { CardCollection } from './CardCollection'
import {
  CARD_TYPE_OPTIONS,
  COMMANDER_SECTION_OPTIONS,
  DRAFT_SECTION_OPTIONS,
  filterAndSortCards,
  groupCards,
} from './selectors'
import type {
  BrowserPool,
  BrowserSort,
  BrowserView,
  CardTypeFilter,
} from './types'
import './browser.css'

export function CubeBrowser() {
  const [pool, setPool] = useState<BrowserPool>('draft')
  const [query, setQuery] = useState('')
  const [section, setSection] = useState('all')
  const [type, setType] = useState<CardTypeFilter>('all')
  const [sort, setSort] = useState<BrowserSort>('cube')
  const [view, setView] = useState<BrowserView>('list')

  const sourceCards = pool === 'draft' ? draftCards : commanderCards
  const sectionOptions = pool === 'draft' ? DRAFT_SECTION_OPTIONS : COMMANDER_SECTION_OPTIONS
  const visibleCards = useMemo(
    () => filterAndSortCards(sourceCards, pool, { query, section, type, sort }),
    [pool, query, section, sort, sourceCards, type],
  )
  const groups = useMemo(
    () => (section === 'all' && sort === 'cube' ? groupCards(visibleCards, pool) : []),
    [pool, section, sort, visibleCards],
  )

  function changePool(nextPool: BrowserPool) {
    setPool(nextPool)
    setSection('all')
    setType('all')
    setSort('cube')
  }

  return (
    <section className="cube-browser" aria-label="Cube browser">
      <div className="browser-topline">
        <div className="pool-tabs" role="group" aria-label="Card pool">
          <button className={pool === 'draft' ? 'active' : ''} onClick={() => changePool('draft')}>
            Draft <span>{draftCards.length}</span>
          </button>
          <button
            className={pool === 'commanders' ? 'active' : ''}
            onClick={() => changePool('commanders')}
          >
            Commanders <span>{commanderCards.length}</span>
          </button>
        </div>
        <div className="view-tabs" role="group" aria-label="Card view">
          <button className={view === 'list' ? 'active' : ''} onClick={() => setView('list')}>
            List
          </button>
          <button className={view === 'images' ? 'active' : ''} onClick={() => setView('images')}>
            Images
          </button>
        </div>
      </div>

      <div className="filters">
        <label className="search-field">
          <span>Search</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Name, type, rules text…"
          />
        </label>
        <label>
          <span>Section</span>
          <select value={section} onChange={(event) => setSection(event.target.value)}>
            {sectionOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>
        <label>
          <span>Type</span>
          <select value={type} onChange={(event) => setType(event.target.value as CardTypeFilter)}>
            {CARD_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>
        <label>
          <span>Sort</span>
          <select value={sort} onChange={(event) => setSort(event.target.value as BrowserSort)}>
            <option value="cube">Cube order</option>
            <option value="name">Name</option>
            <option value="mana">Mana value</option>
          </select>
        </label>
      </div>

      <div className="browser-summary">
        <strong>{visibleCards.length}</strong> of {sourceCards.length} cards
        {(query || section !== 'all' || type !== 'all') && (
          <button
            className="clear-filters"
            onClick={() => {
              setQuery('')
              setSection('all')
              setType('all')
            }}
          >
            Clear filters
          </button>
        )}
      </div>

      {visibleCards.length === 0 ? (
        <div className="empty-state">No cards match these filters.</div>
      ) : groups.length > 0 ? (
        <div className="card-groups">
          {groups.map((group) => (
            <section className="card-group" key={group.key}>
              <header>
                <h2>{group.label}</h2>
                <span>{group.cards.length}</span>
              </header>
              <CardCollection cards={group.cards} view={view} />
            </section>
          ))}
        </div>
      ) : (
        <CardCollection cards={visibleCards} view={view} />
      )}
    </section>
  )
}
