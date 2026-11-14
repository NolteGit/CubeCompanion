import { useState, type CSSProperties, type MouseEvent, type ReactNode } from 'react'
import type { BrowserCard } from './types'

interface HoverCardProps {
  card: BrowserCard
  className?: string
  children: ReactNode
}

interface PreviewState {
  left: number
  top: number
}

const PREVIEW_WIDTH = 286
const PREVIEW_HEIGHT = 468
const PREVIEW_MARGIN = 14
const APP_HEADER_HEIGHT = 64

function previewPosition(event: MouseEvent<HTMLElement>): PreviewState {
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

export function HoverCard({ card, className, children }: HoverCardProps) {
  const [preview, setPreview] = useState<PreviewState | null>(null)

  const style = preview
    ? ({ left: preview.left, top: preview.top } satisfies CSSProperties)
    : undefined

  return (
    <>
      <div
        className={className}
        onMouseEnter={(event) => setPreview(previewPosition(event))}
        onMouseLeave={() => setPreview(null)}
      >
        {children}
      </div>

      {preview && (
        <aside className="card-hover-preview" style={style} aria-hidden="true">
          {card.imageUri ? (
            <img src={card.imageUri} alt="" />
          ) : (
            <div className="preview-image-placeholder">No image available</div>
          )}
          <div className="preview-details">
            <div className="preview-title-row">
              <strong>{card.name}</strong>
              {card.manaCost && <span className="preview-mana">{card.manaCost}</span>}
            </div>
            <span className="preview-type">{card.typeLine}</span>
          </div>
        </aside>
      )}
    </>
  )
}
