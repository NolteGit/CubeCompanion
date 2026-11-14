import { useState, type CSSProperties, type MouseEvent, type ReactNode } from 'react'
import type { BrowserCard, BrowserView } from './types'

interface CardRowAction {
  symbol: string
  activeSymbol: string
  tone: 'remove'
  isActive: (card: BrowserCard) => boolean
  title: (card: BrowserCard, active: boolean) => string
  onClick: (card: BrowserCard) => void
}

interface CardCollectionProps {
  cards: readonly BrowserCard[]
  view: BrowserView
  linkCards?: boolean
  rowAction?: CardRowAction
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

function CardActionButton({
  card,
  action,
}: {
  card: BrowserCard
  action: CardRowAction
}) {
  const active = action.isActive(card)

  return (
    <button
      type="button"
      className={`card-row-action card-row-action--${action.tone}${active ? ' active' : ''}`}
      aria-label={action.title(card, active)}
      title={action.title(card, active)}
      disabled={active}
      onClick={(event) => {
        event.preventDefault()
        event.stopPropagation()
        action.onClick(card)
      }}
    >
      {active ? action.activeSymbol : action.symbol}
    </button>
  )
}

export function CardCollection({
  cards,
  view,
  linkCards = true,
  rowAction,
}: CardCollectionProps) {
  const [preview, setPreview] = useState<PreviewState | null>(null)

  if (view === 'images') {
    return (
      <div className="card-grid">
        {cards.map((card) => {
          const active = rowAction?.isActive(card) ?? false
          const image = (
            <CardLink
              card={card}
              className="image-card"
              linked={linkCards}
            >
              {card.imageUri ? (
                <img src={card.imageUri} alt={card.name} loading="lazy" />
              ) : (
                <div className="image-placeholder">No image</div>
              )}
              <span className="image-card-name">{card.name}</span>
            </CardLink>
          )

          if (!rowAction) return <div key={card.oracleId}>{image}</div>

          return (
            <div
              className={`image-card-shell${active ? ' image-card-shell--queued' : ''}`}
              key={card.oracleId}
            >
              {image}
              <CardActionButton card={card} action={rowAction} />
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <>
      <div className="card-list" role="list">
        {cards.map((card) => {
          const showPreview = (event: MouseEvent<HTMLElement>) => {
            const position = previewPosition(event)
            setPreview({ card, ...position })
          }

          if (!rowAction) {
            return (
              <CardLink
                card={card}
                className="card-list-row"
                key={card.oracleId}
                linked={linkCards}
                onMouseEnter={showPreview}
                onMouseLeave={() => setPreview(null)}
              >
                <span>{card.name}</span>
              </CardLink>
            )
          }

          const active = rowAction.isActive(card)
          return (
            <div
              className={`card-list-row card-list-row--actionable${active ? ' card-list-row--queued-removal' : ''}`}
              key={card.oracleId}
              role="listitem"
              onMouseEnter={showPreview}
              onMouseLeave={() => setPreview(null)}
            >
              {linkCards && card.scryfallUri ? (
                <a
                  className="card-row-name"
                  href={card.scryfallUri}
                  target="_blank"
                  rel="noreferrer"
                >
                  {card.name}
                </a>
              ) : (
                <span className="card-row-name">{card.name}</span>
              )}
              <CardActionButton card={card} action={rowAction} />
            </div>
          )
        })}
      </div>
      {preview && <CardPreview preview={preview} />}
    </>
  )
}
