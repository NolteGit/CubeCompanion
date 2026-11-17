import { useState } from 'react'
import { buildAgentDeck, type DraftAgent } from '../../domain/draft/agents'
import type { BasicLandCounts } from '../../domain/draft/deck'
import type { DraftSession } from '../../domain/draft/engine'
import type { BrowserCard } from '../browser/types'
import { DeckOverview } from './DeckOverview'

interface AgentDeckPanelProps {
  agents: readonly DraftAgent<BrowserCard>[]
  session: DraftSession<BrowserCard>
  phase: 'draft' | 'build'
  onSampleHand: (cards: readonly BrowserCard[], basics: BasicLandCounts, label: string) => void
}

export function AgentDeckPanel({ agents, session, phase, onSampleHand }: AgentDeckPanelProps) {
  // Changing from drafting to deck building automatically opens the inspector.
  // An explicit toggle within the current phase still takes precedence.
  const [expansion, setExpansion] = useState({ phase, expanded: phase === 'build' })
  const expanded = expansion.phase === phase ? expansion.expanded : phase === 'build'
  const [revealed, setRevealed] = useState(false)
  const [activeSeat, setActiveSeat] = useState(1)
  const hidden = phase === 'draft' && !revealed

  const agent = agents.find((entry) => entry.seat === activeSeat) ?? agents[0]
  const picked = agent ? session.selections[agent.seat] ?? [] : []
  const deck = agent ? buildAgentDeck(agent.commanders, picked) : null

  return (
    <section className="draft-agents draft-panel" aria-label="Opponent decks">
      <header className="draft-agents-header">
        <div>
          <h3>{phase === 'draft' ? 'Opponents' : 'Opponent decks'} <span>{agents.length} agents</span></h3>
          <p>{phase === 'draft'
            ? 'Deck information is hidden to avoid influencing your picks.'
            : 'Inspect the finished drafts, their deck construction and sample hands.'}</p>
        </div>
        <button
          type="button"
          className="draft-agents-toggle"
          aria-expanded={expanded}
          onClick={() => {
            setExpansion({ phase, expanded: !expanded })
            if (expanded) setRevealed(false)
          }}
        >{expanded ? 'Hide opponents' : 'View opponents'}</button>
      </header>

      {expanded && hidden && (
        <div className="draft-agents-spoiler">
          <strong>Draft spoilers</strong>
          <p>Revealing opponent commanders and drafted cards may affect your decisions.</p>
          <button type="button" onClick={() => setRevealed(true)}>Reveal opponent decks</button>
        </div>
      )}

      {expanded && !hidden && agent && deck && (
        <div className="draft-agents-content">
          <div className="draft-agents-seats" role="group" aria-label="Select an opponent">
            {agents.map((entry) => (
              <button
                type="button"
                key={entry.seat}
                className={entry.seat === agent.seat ? 'active' : ''}
                aria-pressed={entry.seat === agent.seat}
                onClick={() => setActiveSeat(entry.seat)}
              >Agent {entry.seat + 1}</button>
            ))}
          </div>
          <div className="draft-agents-deck-header">
            <div>
              <strong>Agent {agent.seat + 1} <span>{deck.total} / 60</span></strong>
              <p>{picked.length} picks · {deck.landCount} lands · {deck.sidePool.length} aside</p>
              <div className="draft-agents-commanders">
                {agent.commanders.map((card) => (
                  <span key={card.oracleId} title={card.name}>
                    {card.imageUri && <img src={card.imageUri} alt="" loading="lazy" />}
                    {card.name}
                  </span>
                ))}
              </div>
            </div>
            <button
              type="button"
              className="draft-sample-trigger"
              disabled={picked.length === 0}
              onClick={() => onSampleHand(deck.mainDeck, deck.basics, `Agent ${agent.seat + 1}`)}
            >Sample hand</button>
          </div>

          {phase === 'draft' && (
            <p className="draft-agents-provisional">
              Provisional build from picks so far. Added basic lands are planning slots, not drafted cards.
            </p>
          )}
          {phase === 'build' && (
            <div className={deck.valid ? 'draft-agents-valid' : 'draft-agents-warning'} role="status">
              {deck.valid
                ? 'Valid 60-card deck under the agent land cap.'
                : `Incomplete deck: ${deck.issues.join(' ')}`}
            </div>
          )}
          <DeckOverview
            commanders={deck.commanders}
            selectedCards={deck.mainDeck}
            basics={deck.basics}
            readOnly
            onRemoveCard={() => {}}
            onRemoveCommander={() => {}}
            onAdjustBasic={() => {}}
          />
          {deck.sidePool.length > 0 && (
            <details className="draft-agents-side">
              <summary>Set aside · {deck.sidePool.length} picks</summary>
              <div>
                {deck.sidePool.map((card) => (
                  <span key={card.oracleId} title={card.typeLine}>{card.name}</span>
                ))}
              </div>
            </details>
          )}
        </div>
      )}
    </section>
  )
}
