import { useState, type CSSProperties, type MouseEvent, type ReactNode } from 'react'
import type { BrowserCard, BrowserView } from './types'

interface CardCollectionProps {
  cards: readonly BrowserCard[]
  view: BrowserView
}

interface PreviewState {
  card: BrowserCard
  left: number
  top: number
}

function CardLink({
  card,
  className,
  children,
  onMouseEnter,
  onMouseLeave,
}: {
  card: BrowserCard
  className: string
  children: ReactNode
  onMouseEnter?: (event: MouseEvent<HTMLElement>) => void
  onMouseLeave?: () => void
}) {
  if (!card.scryfallUri) {
    return (
      <div className={className} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
        {children}
      </div>
    )
  }

  return (
    <a
      className={className}
      href={card.scryfallUri}
      target="_blank"
      rel="noreferrer"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {children}
    </a>
  )
}

function previewPosition(event: MouseEvent<HTMLElement>): { left: number; top: number } {
  const width = 320
  const height = 430
  const margin = 16
  const preferredLeft = event.clientX + 18
  const left = preferredLeft + width > window.innerWidth - margin
    ? Math.max(margin, event.clientX - width - 18)
    : preferredLeft
  const top = Math.min(
    Math.max(margin + 58, event.clientY - 90),
    Math.max(margin + 58, window.innerHeight - height - margin),
  )
  return { left, top }
}

function CardPreview({ preview }: { preview: PreviewState }) {
  const style = {
    left: preview.left,
    top: preview.top,
  } satisfies CSSProperties

  return (
    <aside className="card-hover-preview" style={style} aria-hidden="true">
      {preview.card.imageUri ? (
        <img src={preview.card.imageUri} alt="" />
      ) : (
        <div className="preview-image-placeholder">No image available</div>
      )}
      <div className="preview-details">
        <strong>{preview.card.name}</strong>
        <span>{preview.card.typeLine}</span>
        {preview.card.manaCost && <span className="preview-mana">{preview.card.manaCost}</span>}
      </div>
    </aside>
  )
}

export function CardCollection({ cards, view }: CardCollectionProps) {
  const [preview, setPreview] = useState<PreviewState | null>(null)

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
    <>
      <div className="card-list" role="list">
        {cards.map((card) => (
          <CardLink
            card={card}
            className="card-list-row"
            key={card.oracleId}
            onMouseEnter={(event) => {
              const position = previewPosition(event)
              setPreview({ card, ...position })
            }}
            onMouseLeave={() => setPreview(null)}
          >
            <span>{card.name}</span>
          </CardLink>
        ))}
      </div>
      {preview && <CardPreview preview={preview} />}
    </>
  )
}
