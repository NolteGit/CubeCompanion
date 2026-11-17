import type { BrowserCard } from '../browser/types'
import { MANA_VALUE_BUCKETS, groupDraftDeck } from '../../domain/draft/overview'
import { BASIC_LANDS, type BasicLand, type BasicLandCounts } from '../../domain/draft/deck'
import { BASIC_LAND_IMAGE_URIS } from './basicLandImages'

interface DeckOverviewProps {
  commanders: readonly BrowserCard[]
  selectedCards: readonly BrowserCard[]
  basics: BasicLandCounts
  onRemoveCard: (card: BrowserCard) => void
  onRemoveCommander: (card: BrowserCard) => void
  onAdjustBasic: (land: BasicLand, amount: number) => void
  readOnly?: boolean
}

function DeckCard({ card, onRemove, isCommander = false, offColor = false, readOnly = false }: { card: BrowserCard; onRemove: () => void; isCommander?: boolean; offColor?: boolean; readOnly?: boolean }) {
  const classes = `draft-board-card${isCommander ? ' draft-board-card--commander' : ''}${offColor ? ' draft-board-card--offcolor' : ''}`
  const artwork = (
    <>
      {card.imageUri ? <img src={card.imageUri} alt="" loading="lazy" /> : <span className="draft-board-placeholder">{card.name}</span>}
      {isCommander && <span className="draft-board-commander-mark" aria-hidden="true">CMD</span>}
      {offColor && <span className="draft-board-offcolor-mark" aria-hidden="true">!</span>}
    </>
  )
  if (readOnly) {
    return <div className={`${classes} draft-board-card--readonly`} title={card.name}>{artwork}</div>
  }
  return (
    <button
      type="button"
      className={classes}
      title={`Move ${card.name} to the side pool${offColor ? ' — outside commander colors' : ''}`}
      aria-label={`Move ${card.name} to the side pool${offColor ? ', outside commander colors' : ''}`}
      onClick={onRemove}
    >{artwork}</button>
  )
}

function CreatureOrSpellRow({
  title,
  count,
  columns,
  onRemoveCard,
  onRemoveCommander,
  commanderIds,
  offColor,
  readOnly,
}: {
  title: string
  count: number
  columns: readonly BrowserCard[][]
  onRemoveCard: (card: BrowserCard) => void
  onRemoveCommander: (card: BrowserCard) => void
  commanderIds: ReadonlySet<string>
  offColor: (card: BrowserCard) => boolean
  readOnly: boolean
}) {
  return (
    <section className="draft-board-row" aria-label={title}>
      <div className="draft-board-row-label">
        <strong>{title}</strong>
        <span>{count} cards</span>
      </div>
      <div className="draft-board-columns">
        {columns.map((cards, index) => (
          <div className={`draft-board-column${cards.length === 0 ? ' draft-board-column--empty' : ''}`} key={MANA_VALUE_BUCKETS[index]}>
            <div className="draft-board-stack">
              {cards.map((card) => (
                <DeckCard key={card.oracleId} card={card} isCommander={commanderIds.has(card.oracleId)} offColor={offColor(card)} readOnly={readOnly} onRemove={() => commanderIds.has(card.oracleId) ? onRemoveCommander(card) : onRemoveCard(card)} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

export function DeckOverview({
  commanders,
  selectedCards,
  basics,
  onRemoveCard,
  onRemoveCommander,
  onAdjustBasic,
  readOnly = false,
}: DeckOverviewProps) {
  const grouped = groupDraftDeck([...commanders, ...selectedCards])
  const commanderIds = new Set(commanders.map((card) => card.oracleId))
  const identity = new Set(commanders.flatMap((card) => card.colorIdentity))
  const offColor = (card: BrowserCard) => commanders.length > 0 && !commanderIds.has(card.oracleId) && card.colorIdentity.some((color) => !identity.has(color))
  const basicCount = BASIC_LANDS.reduce((sum, land) => sum + basics[land], 0)
  const landCount = basicCount + grouped.lands.length

  return (
    <section className="draft-panel draft-board" aria-label="Visual deck overview">
      <div className="draft-board-legend" aria-label="Deck card legend">
        <span><i className="draft-legend-commander" /> Commander</span>
        <span><i className="draft-legend-offcolor" /> Off-color</span>
        {!readOnly && <span>Click a card to set aside</span>}
      </div>

      <div className="draft-board-curve-scroll" role="region" aria-label="Mana curve by type" tabIndex={0}>
        <div className="draft-board-curve">
          <div className="draft-board-column-titles">
            {MANA_VALUE_BUCKETS.map((label) => <span key={label}>{label}</span>)}
          </div>
          {grouped.creatureCount > 0 && <CreatureOrSpellRow
            title="Creatures"
            count={grouped.creatureCount}
            columns={grouped.columns.map((column) => column.creatures)}
            onRemoveCard={onRemoveCard}
            onRemoveCommander={onRemoveCommander}
            commanderIds={commanderIds}
            offColor={offColor}
            readOnly={readOnly}
          />}
          {grouped.noncreatureCount > 0 && <CreatureOrSpellRow
            title="Noncreatures"
            count={grouped.noncreatureCount}
            columns={grouped.columns.map((column) => column.noncreatures)}
            onRemoveCard={onRemoveCard}
            onRemoveCommander={onRemoveCommander}
            commanderIds={commanderIds}
            offColor={offColor}
            readOnly={readOnly}
          />}
        </div>
      </div>

      <section className="draft-board-lands" aria-label="Deck lands">
        <div className="draft-board-row-label">
          <strong>Lands</strong>
          <span>{landCount} cards · {grouped.lands.length} drafted</span>
        </div>
        {grouped.lands.length > 0 && (
          <div className="draft-board-land-cards">
            {grouped.lands.map((card) => <DeckCard key={card.oracleId} card={card} isCommander={commanderIds.has(card.oracleId)} offColor={offColor(card)} readOnly={readOnly} onRemove={() => commanderIds.has(card.oracleId) ? onRemoveCommander(card) : onRemoveCard(card)} />)}
          </div>
        )}
        <div className="draft-board-basics draft-board-basics--cards" aria-label="Basic lands">
          {BASIC_LANDS.map((land) => (
            <div key={land} className={`draft-board-basic-tile${basics[land] === 0 ? ' draft-board-basic-tile--empty' : ''}`} title={land}>
              <img className="draft-board-basic-image" src={BASIC_LAND_IMAGE_URIS[land]} alt="" loading="lazy" />
              <span className="draft-board-basic-tile-name">{land}</span>
              {readOnly ? (
                <output className="draft-agent-basic-count" aria-label={`${land} count`}>{basics[land]}</output>
              ) : (
                <div className="draft-board-basic-card-controls">
                  <button type="button" aria-label={`Remove ${land}`} disabled={basics[land] === 0} onClick={() => onAdjustBasic(land, -1)}>−</button>
                  <output aria-label={`${land} count`}>{basics[land]}</output>
                  <button type="button" aria-label={`Add ${land}`} onClick={() => onAdjustBasic(land, 1)}>+</button>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
    </section>
  )
}
