import type { ReactNode } from 'react'
import type { BrowserCard, BrowserView } from './types'

interface CardCollectionProps {
  cards: readonly BrowserCard[]
  view: BrowserView
}

function CardLink({ card, className, children }: { card: BrowserCard; className: string; children: ReactNode }) {
  if (!card.scryfallUri) return <div className={className}>{children}</div>

  return (
    <a className={className} href={card.scryfallUri} target="_blank" rel="noreferrer">
      {children}
    </a>
  )
}

export function CardCollection({ cards, view }: CardCollectionProps) {
  if (view === 'images') {
    return (
      <div className="card-grid">
        {cards.map((card) => (
          <CardLink card={card} className="image-card" key={card.oracleId}>
            {card.imageUri ? (
              <img src={card.imageUri} alt={card.name} loading="lazy" />
            ) : (
              <div className="image-placeholder">No image</div>
            )}
            <span className="image-card-name">{card.name}</span>
          </CardLink>
        ))}
      </div>
    )
  }

  return (
    <div className="card-list" role="list">
      {cards.map((card) => (
        <CardLink card={card} className="card-list-row" key={card.oracleId}>
          <span className="mana-value" aria-label={`Mana value ${card.manaValue}`}>
            {card.manaValue}
          </span>
          <strong>{card.name}</strong>
          <span className="mana-cost">{card.manaCost || '—'}</span>
          <span className="type-line">{card.typeLine}</span>
        </CardLink>
      ))}
    </div>
  )
}
