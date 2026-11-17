import { useEffect, useMemo, useRef, useState } from 'react'
import { type BasicLandCounts } from '../../domain/draft/deck'
import { sampleDeckCards, shuffleSampleDeck, type SampleHandCard, type SampleHandSourceCard } from '../../domain/draft/sampleHand'

interface SampleHandDialogProps {
  selectedCards: readonly SampleHandSourceCard[]
  basics: BasicLandCounts
  deckLabel?: string
  onClose: () => void
}

const LAND_GLYPHS: Readonly<Record<string, string>> = {
  Plains: '☀', Island: '≈', Swamp: '☠', Mountain: '▲', Forest: '♣', Wastes: '◇',
}

function SampleCard({ card, position }: { card: SampleHandCard; position: number }) {
  return (
    <div className="draft-sample-card" title={card.name}>
      {card.imageUri ? (
        <img src={card.imageUri} alt={card.name} loading="eager" />
      ) : (
        <div className={`draft-sample-placeholder${card.basicLand ? ` draft-sample-basic--${card.name.toLowerCase()}` : ''}`}>
          <strong>{card.name}</strong>
          <span aria-hidden="true">{card.basicLand ? LAND_GLYPHS[card.name] : '✦'}</span>
          <small>{card.typeLine}</small>
        </div>
      )}
      <div className="draft-sample-card-caption">
        <span>{position}. {card.name}</span>
        {card.manaCost && <small>{card.manaCost}</small>}
      </div>
    </div>
  )
}

export function SampleHandDialog({ selectedCards, basics, deckLabel, onClose }: SampleHandDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const cardsRef = useRef<HTMLDivElement>(null)
  const deck = useMemo(() => sampleDeckCards(selectedCards, basics), [selectedCards, basics])
  const [order, setOrder] = useState(() => shuffleSampleDeck(deck))
  const [shownCount, setShownCount] = useState(() => Math.min(7, deck.length))
  const cards = order.slice(0, shownCount)

  useEffect(() => {
    const dialog = dialogRef.current
    // React Strict Mode replays effects during development. Closing in cleanup
    // queues a native close event that can dismiss the newly reopened dialog.
    // React removes the dialog from the DOM when this component unmounts.
    if (dialog && !dialog.open) dialog.showModal()
  }, [])

  useEffect(() => {
    if (shownCount > 7) {
      cardsRef.current?.scrollTo({ left: cardsRef.current.scrollWidth, behavior: 'smooth' })
    }
  }, [shownCount])

  function newHand() {
    setOrder((current) => {
      const next = shuffleSampleDeck(deck)
      // Avoid dealing the exact same visible order on a repeat click when possible.
      if (next.length > 1 && next.slice(0, 7).every((card, index) => card.id === current[index]?.id)) {
        next.push(next.shift()!)
      }
      return next
    })
    setShownCount(Math.min(7, deck.length))
    cardsRef.current?.scrollTo({ left: 0 })
  }

  return (
    <dialog
      ref={dialogRef}
      className="draft-sample-dialog"
      aria-label="Sample hand preview"
      onClose={onClose}
      onClick={(event) => { if (event.target === event.currentTarget) event.currentTarget.close() }}
    >
      <div className="draft-sample-surface">
        <header className="draft-sample-header">
          <div>
            <h3>Sample hand <span>{shownCount} / {deck.length}</span></h3>
            <p>Shuffled from {deckLabel ? `Agent deck: ${deckLabel}` : 'your current main deck'}. Commanders stay in the command zone.</p>
          </div>
          <div className="draft-sample-actions">
            <button type="button" onClick={newHand} disabled={deck.length === 0}>New hand</button>
            <button type="button" className="draft-sample-draw" onClick={() => setShownCount((count) => Math.min(deck.length, count + 1))} disabled={shownCount >= deck.length}>Draw +1</button>
            <button type="button" className="draft-sample-close" onClick={() => dialogRef.current?.close()} aria-label="Close sample hand">×</button>
          </div>
        </header>
        <div className="draft-sample-cards" ref={cardsRef} role="region" aria-label="Drawn cards" tabIndex={0}>
          {cards.map((card, index) => <SampleCard key={card.id} card={card} position={index + 1} />)}
        </div>
        <footer className="draft-sample-footer">
          <span>{deck.length - shownCount} cards left in library</span>
          {deck.length < 7 && <span>Your deck currently has fewer than seven main-deck cards.</span>}
          <span>Preview only — drawing does not change your deck</span>
        </footer>
      </div>
    </dialog>
  )
}
