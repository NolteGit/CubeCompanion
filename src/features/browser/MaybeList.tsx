import { useMemo, useState } from 'react'
import { CardCollection } from './CardCollection'
import { maybeCommanderCards, maybeDraftCards } from './data'
import { groupCards } from './selectors'
import type { BrowserCard, CardGroup } from './types'
import './maybe.css'

type MaybeColumnKey =
  | 'white'
  | 'blue'
  | 'black'
  | 'red'
  | 'green'
  | 'multicolor'
  | 'colorless'
  | 'land'

interface MaybeColumn {
  key: MaybeColumnKey
  label: string
  cards: BrowserCard[]
}

const MAYBE_COLUMNS: readonly { key: MaybeColumnKey; label: string }[] = [
  { key: 'white', label: 'White' },
  { key: 'blue', label: 'Blue' },
  { key: 'black', label: 'Black' },
  { key: 'red', label: 'Red' },
  { key: 'green', label: 'Green' },
  { key: 'multicolor', label: 'Multicolor' },
  { key: 'colorless', label: 'Colorless' },
  { key: 'land', label: 'Lands' },
]

const COMMANDER_GROUP_ORDER = [
  '1-W', '1-U', '1-B', '1-R', '1-G',
  '2-WU', '2-UB', '2-BR', '2-RG', '2-WG',
  '2-WB', '2-UR', '2-BG', '2-WR', '2-UG',
  '3-WUB', '3-UBR', '3-BRG', '3-WRG', '3-WUG',
  '3-WUR', '3-WBR', '3-WBG', '3-UBG', '3-URG',
  '4-WUBR', '4-WUBG', '4-WURG', '4-WBRG', '4-UBRG',
  '5-WUBRG', '0-color',
] as const

const COMMANDER_GROUP_INDEX = new Map<string, number>(
  COMMANDER_GROUP_ORDER.map((key, index) => [key, index]),
)

function filterIdeas(cards: readonly BrowserCard[], query: string): BrowserCard[] {
  const normalized = query.trim().toLocaleLowerCase('en-US')
  if (!normalized) return [...cards]
  return cards.filter((card) => card.name.toLocaleLowerCase('en-US').includes(normalized))
}

function maybeColumnKey(card: BrowserCard): MaybeColumnKey {
  if (card.isLand) return 'land'
  if (card.colorIdentity.length === 0) return 'colorless'
  if (card.colorIdentity.length > 1) return 'multicolor'

  switch (card.colorIdentity[0]) {
    case 'W': return 'white'
    case 'U': return 'blue'
    case 'B': return 'black'
    case 'R': return 'red'
    case 'G': return 'green'
    default: return 'colorless'
  }
}

function sortIdeas(cards: readonly BrowserCard[]): BrowserCard[] {
  return [...cards].sort((left, right) => {
    const leftCreature = left.typeLine.includes('Creature')
    const rightCreature = right.typeLine.includes('Creature')
    if (leftCreature !== rightCreature) return leftCreature ? -1 : 1
    if (left.manaValue !== right.manaValue) return left.manaValue - right.manaValue
    return left.name.localeCompare(right.name)
  })
}

function groupIdeas(cards: readonly BrowserCard[]): MaybeColumn[] {
  return MAYBE_COLUMNS.map(({ key, label }) => ({
    key,
    label,
    cards: sortIdeas(cards.filter((card) => maybeColumnKey(card) === key)),
  }))
}

function commanderGroups(cards: readonly BrowserCard[]): CardGroup[] {
  return groupCards(cards, 'commanders')
    .map((group) => ({ ...group, cards: sortIdeas(group.cards) }))
    .sort((left, right) => {
      const leftIndex = COMMANDER_GROUP_INDEX.get(left.key) ?? Number.MAX_SAFE_INTEGER
      const rightIndex = COMMANDER_GROUP_INDEX.get(right.key) ?? Number.MAX_SAFE_INTEGER
      return leftIndex - rightIndex || left.label.localeCompare(right.label)
    })
}

function MaybeColumnSections({ cards }: { cards: readonly BrowserCard[] }) {
  const creatures = cards.filter((card) => card.typeLine.includes('Creature'))
  const noncreatures = cards.filter((card) => !card.typeLine.includes('Creature'))

  return (
    <div className="column-sections">
      {creatures.length > 0 && (
        <section className="column-section">
          <header>
            <strong>Creature</strong>
            <span>{creatures.length}</span>
          </header>
          <CardCollection cards={creatures} view="list" />
        </section>
      )}
      {noncreatures.length > 0 && (
        <section className="column-section">
          <header>
            <strong>Noncreature</strong>
            <span>{noncreatures.length}</span>
          </header>
          <CardCollection cards={noncreatures} view="list" />
        </section>
      )}
    </div>
  )
}

function MaybeDraftPool({ cards }: { cards: readonly BrowserCard[] }) {
  if (cards.length === 0) return null
  const columns = groupIdeas(cards)

  return (
    <section className="maybe-pool">
      <header className="maybe-pool-heading">
        <strong>Main Cube ideas</strong>
        <span>{cards.length}</span>
      </header>

      <div className="maybe-columns">
        {columns.map((column) => (
          <section
            className={`cube-column cube-column--${column.key} cube-theme cube-theme--${column.key}`}
            key={column.key}
          >
            <header className="column-heading">
              <span className="section-dot" aria-hidden="true" />
              <h2>{column.label}</h2>
              <span>{column.cards.length}</span>
            </header>

            {column.cards.length > 0 ? (
              <MaybeColumnSections cards={column.cards} />
            ) : (
              <div className="maybe-column-empty">—</div>
            )}
          </section>
        ))}
      </div>
    </section>
  )
}

function MaybeCommanderPool({ cards }: { cards: readonly BrowserCard[] }) {
  if (cards.length === 0) return null
  const groups = commanderGroups(cards)

  return (
    <section className="maybe-pool">
      <header className="maybe-pool-heading">
        <strong>Commander ideas</strong>
        <span>{cards.length}</span>
      </header>

      <div className="maybe-commander-columns">
        {groups.map((group) => (
          <section
            className={`cube-column cube-theme cube-theme--${group.key}`}
            key={group.key}
          >
            <header className="column-heading">
              <span className="section-dot" aria-hidden="true" />
              <h2>{group.label}</h2>
              <span>{group.cards.length}</span>
            </header>

            <section className="column-section">
              <header>
                <strong>Commanders</strong>
                <span>{group.cards.length}</span>
              </header>
              <CardCollection cards={group.cards} view="list" />
            </section>
          </section>
        ))}
      </div>
    </section>
  )
}

export function MaybeList() {
  const [query, setQuery] = useState('')
  const draftIdeas = useMemo(() => filterIdeas(maybeDraftCards, query), [query])
  const commanderIdeas = useMemo(() => filterIdeas(maybeCommanderCards, query), [query])
  const visibleCount = draftIdeas.length + commanderIdeas.length
  const totalCount = maybeDraftCards.length + maybeCommanderCards.length

  return (
    <section className="maybe-view" aria-label="Maybe list">
      <header className="maybe-heading">
        <div>
          <span>Source ideas</span>
          <h2>Maybe</h2>
          <p>Read-only inclusion ideas from the source workbook.</p>
        </div>
        <strong>{totalCount} ideas</strong>
      </header>

      <div className="maybe-search-row">
        <label className="browser-search">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="11" cy="11" r="6.5" />
            <path d="m16 16 4 4" />
          </svg>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search inclusion ideas…"
            aria-label="Search Maybe list"
          />
        </label>
        <span><strong>{visibleCount}</strong> of {totalCount}</span>
      </div>

      {visibleCount === 0 ? (
        <div className="empty-state">
          <strong>No ideas found</strong>
          <span>Try a different card name.</span>
          <button type="button" onClick={() => setQuery('')}>Reset search</button>
        </div>
      ) : (
        <div className="maybe-groups">
          <MaybeDraftPool cards={draftIdeas} />
          <MaybeCommanderPool cards={commanderIdeas} />
        </div>
      )}
    </section>
  )
}
