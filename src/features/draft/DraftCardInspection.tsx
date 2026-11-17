import { useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import type { BrowserCard } from '../browser/types'

/** Keep inspection separate from the single-click pick action, including on touch. */
export function DraftCardInspection({ card, children }: { card: BrowserCard; children: ReactNode }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const [position, setPosition] = useState<{ left: number; top: number } | null>(null)
  const [failedImage, setFailedImage] = useState(false)
  function preview(element: HTMLElement) {
    const rect = element.getBoundingClientRect()
    const width = 290
    setPosition({
      left: Math.max(8, Math.min(window.innerWidth - width - 8, rect.right + width + 20 < window.innerWidth ? rect.right + 12 : rect.left - width - 12)),
      top: Math.max(8, Math.min(rect.top, window.innerHeight - 490)),
    })
  }
  const artwork = card.imageUri && !failedImage
    ? <img src={card.imageUri} alt={card.name} onError={() => setFailedImage(true)} />
    : <p>{card.oracleText || 'Card image unavailable.'}</p>
  return (
    <div className="draft-inspect-card"
      onMouseEnter={(event) => { if (window.matchMedia('(hover: hover)').matches) preview(event.currentTarget) }}
      onMouseLeave={() => setPosition(null)}
      onFocus={(event) => preview(event.currentTarget)}
      onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setPosition(null) }}>
      {children}
      <button type="button" className="draft-inspect-trigger" aria-label={`Inspect ${card.name}`} onClick={() => { setPosition(null); dialog.current?.showModal() }}>Inspect</button>
      {position && createPortal(<aside className="draft-inspect-hover" style={position} aria-hidden="true">{artwork}<strong>{card.name}</strong></aside>, document.body)}
      <dialog ref={dialog} className="draft-inspect-dialog" aria-label={`Inspect ${card.name}`} onClick={(event) => { if (event.target === event.currentTarget) dialog.current?.close() }}>
        <div className="draft-inspect-surface">
          <header><strong>{card.name}</strong><button type="button" aria-label="Close card inspection" onClick={() => dialog.current?.close()}>×</button></header>
          {artwork}
          <p>{card.manaCost} · {card.typeLine}</p>
          {card.imageUri && !failedImage && <p>{card.oracleText}</p>}
        </div>
      </dialog>
    </div>
  )
}
