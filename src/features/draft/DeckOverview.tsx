import type { BrowserCard } from '../browser/types'
import { MANA_VALUE_BUCKETS, groupDraftDeck } from '../../domain/draft/overview'
import { BASIC_LANDS, type BasicLand, type BasicLandCounts } from '../../domain/draft/deck'

interface DeckOverviewProps {
  commander: BrowserCard
  selectedCards: readonly BrowserCard[]
  basics: BasicLandCounts
  onRemoveCard: (card: BrowserCard) => void
  onAdjustBasic: (land: BasicLand, amount: number) => void
}

function DeckCard({ card, onRemove }: { card: BrowserCard; onRemove: () => void }) {
  return (
    <button
      type="button"
      className="draft-board-card"
      title={`Remove ${card.name} from deck`}
      aria-label={`Remove ${card.name} from deck`}
      onClick={onRemove}
    >
      {card.imageUri ? (
        <img src={card.imageUri} alt="" loading="lazy" />
      ) : (
        <span className="draft-board-placeholder">{card.name}</span>
      )}
      <span className="draft-board-remove" aria-hidden="true">×</span>
    </button>
  )
}

function CreatureOrSpellRow({
  title,
  count,
  columns,
  onRemoveCard,
}: {
  title: string
  count: number
  columns: readonly BrowserCard[][]
  onRemoveCard: (card: BrowserCard) => void
}) {
  return (
    <section className="draft-board-row" aria-label={title}>
      <div className="draft-board-row-label">
        <strong>{title}</strong>
        <span>{count} cards</span>
      </div>
      <div className="draft-board-columns">
        {columns.map((cards, index) => (
          <div className="draft-board-column" key={MANA_VALUE_BUCKETS[index]}>
            <div className="draft-board-stack">
              {cards.map((card) => (
                <DeckCard key={card.oracleId} card={card} onRemove={() => onRemoveCard(card)} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

export function DeckOverview({
  commander,
  selectedCards,
  basics,
  onRemoveCard,
  onAdjustBasic,
}: DeckOverviewProps) {
  const grouped = groupDraftDeck(selectedCards)
  const basicCount = BASIC_LANDS.reduce((sum, land) => sum + basics[land], 0)
  const landCount = basicCount + grouped.lands.length

  return (
    <section className="draft-panel draft-board" aria-label="Visual deck overview">
      <header className="draft-board-header">
        <div>
          <h3>Deck overview</h3>
          <p>Mana value increases left to right. Click a card to remove it from your deck.</p>
        </div>
      </header>

      <div className="draft-board-commander">
        {commander.imageUri ? <img src={commander.imageUri} alt="" /> : <div className="draft-board-commander-placeholder" />}
        <div>
          <span>Commander · 1 card</span>
          <strong>{commander.name}</strong>
          <small>{commander.manaCost || commander.typeLine}</small>
        </div>
      </div>

      <div className="draft-board-curve-scroll" role="region" aria-label="Mana curve by type" tabIndex={0}>
        <div className="draft-board-curve">
          <div className="draft-board-column-titles">
            {MANA_VALUE_BUCKETS.map((label) => <span key={label}>{label}</span>)}
          </div>
          <CreatureOrSpellRow
            title="Creatures"
            count={grouped.creatureCount}
            columns={grouped.columns.map((column) => column.creatures)}
            onRemoveCard={onRemoveCard}
          />
          <CreatureOrSpellRow
            title="Noncreatures"
            count={grouped.noncreatureCount}
            columns={grouped.columns.map((column) => column.noncreatures)}
            onRemoveCard={onRemoveCard}
          />
        </div>
      </div>

      <section className="draft-board-lands" aria-label="Deck lands">
        <div className="draft-board-row-label">
          <strong>Lands</strong>
          <span>{landCount} cards · {grouped.lands.length} drafted</span>
        </div>
        {grouped.lands.length > 0 && (
          <div className="draft-board-land-cards">
            {grouped.lands.map((card) => <DeckCard key={card.oracleId} card={card} onRemove={() => onRemoveCard(card)} />)}
          </div>
        )}
        <div className="draft-board-basics">
          {BASIC_LANDS.map((land) => (
            <div key={land} className="draft-board-basic">
              <span className={`draft-basic-symbol draft-basic-symbol--${land.toLowerCase()}`} aria-hidden="true" />
              <span className="draft-board-basic-name">{land}</span>
              <div className="draft-board-basic-controls">
                <button type="button" aria-label={`Remove ${land}`} disabled={basics[land] === 0} onClick={() => onAdjustBasic(land, -1)}>−</button>
                <output aria-label={`${land} count`}>{basics[land]}</output>
                <button type="button" aria-label={`Add ${land}`} onClick={() => onAdjustBasic(land, 1)}>+</button>
              </div>
            </div>
          ))}
        </div>
        <p className="draft-land-note">Basic lands are unlimited and do not come from the cube.</p>
      </section>
    </section>
  )
}
