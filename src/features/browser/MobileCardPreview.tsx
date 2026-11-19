import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import type { BrowserCard } from './types'
import './mobileCardPreview.css'

interface MobileCardPreviewProps {
  card: BrowserCard
  onClose: () => void
}

export function MobileCardPreview({ card, onClose }: MobileCardPreviewProps) {
  const dialogRef = useRef<HTMLElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null
    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeRef.current?.focus()

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopPropagation()
        onClose()
        return
      }
      if (event.key !== 'Tab') return

      const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), a[href]',
      )
      if (!focusable?.length) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown, true)
    return () => {
      document.removeEventListener('keydown', onKeyDown, true)
      document.body.style.overflow = originalOverflow
      previousFocus?.focus()
    }
  }, [onClose])

  return createPortal(
    <div
      className="mobile-card-preview-backdrop"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <section
        ref={dialogRef}
        className="mobile-card-preview-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={`Preview ${card.name}`}
      >
        <div className="mobile-card-preview-heading">
          <strong>{card.name}</strong>
          <button
            ref={closeRef}
            type="button"
            className="mobile-card-preview-close"
            onClick={onClose}
            aria-label="Close card preview"
          >
            ×
          </button>
        </div>
        {card.imageUri ? (
          <img className="mobile-card-preview-art" src={card.imageUri} alt={card.name} />
        ) : (
          <div className="mobile-card-preview-placeholder">No card image available</div>
        )}
        <div className="mobile-card-preview-info">
          <span>{card.typeLine}</span>
          {card.manaCost && <span>{card.manaCost}</span>}
        </div>
        {card.scryfallUri && (
          <a
            className="mobile-card-preview-scryfall"
            href={card.scryfallUri}
            target="_blank"
            rel="noopener noreferrer"
          >
            View on Scryfall ↗
          </a>
        )}
      </section>
    </div>,
    document.body,
  )
}
