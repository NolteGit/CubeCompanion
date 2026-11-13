import { useState, type CSSProperties, type MouseEvent, type ReactNode } from 'react'
import type { BrowserCard, BrowserView } from './types'

interface CardCollectionProps {
  cards: readonly BrowserCard[]
  view: BrowserView
  linkCards?: boolean
}

interface PreviewState {
  card: BrowserCard
  left: number
  top: number
}

const PREVIEW_WIDTH = 286
const PREVIEW_HEIGHT = 468
const PREVIEW_MARGIN = 14
const APP_HEADER_HEIGHT = 58

function CardLink({
  card,
  className,
  children,
  linked,
  onMouseEnter,
  onMouseLeave,
}: {
  card: BrowserCard
  className: string
  children: ReactNode
  linked: boolean
  onMouseEnter?: (event: MouseEvent<HTMLElement>) => void
  onMouseLeave?: () => void
}) {
  if (!linked || !card.scryfallUri) {
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
  const anchor = event.currentTarget.getBoundingClientRect()
  const preferredLeft = anchor.right + 12
  const left = preferredLeft + PREVIEW_WIDTH > window.innerWidth - PREVIEW_MARGIN
    ? Math.max(PREVIEW_MARGIN, anchor.left - PREVIEW_WIDTH - 12)
    : preferredLeft
  const minimumTop = APP_HEADER_HEIGHT + PREVIEW_MARGIN
  const maximumTop = Math.max(
    minimumTop,
    window.innerHeight - PREVIEW_HEIGHT - PREVIEW_MARGIN,
  )
  const top = Math.min(
    Math.max(minimumTop, anchor.top - 42),
    maximumTop,
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
        <div className="preview-title-row">
          <strong>{preview.card.name}</strong>
          {preview.card.manaCost && <span className="preview-mana">{preview.card.manaCost}</span>}
        </div>
        <span className="preview-type">{preview.card.typeLine}</span>
      </div>
    </aside>
  )
}

export function CardCollection({ cards, view, linkCards = true }: CardCollectionProps) {
  const [preview, setPreview] = useState<PreviewState | null>(null)

  if (view === 'images') {
    return (
      <div className="card-grid">
        {cards.map((card) => (
          <CardLink
            card={card}
            className="image-card"
            key={card.oracleId}
            linked={linkCards}
          >
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
            linked={linkCards}
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
