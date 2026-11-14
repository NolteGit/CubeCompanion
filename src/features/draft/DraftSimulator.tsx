import { useEffect, useState } from 'react'
import { commanderCards, draftCards, releaseInfo } from '../browser/data'
import type { BrowserCard } from '../browser/types'
import { dealCommanderPack } from '../playtest/deal'
import {
  draftDirection,
  pickDraftCard,
  startDraft,
  type DraftSession,
} from '../../domain/draft/engine'
import {
  BASIC_LANDS,
  checkDraftDeck,
  emptyBasicLands,
  isCommanderLegal,
  type BasicLand,
  type BasicLandCounts,
} from '../../domain/draft/deck'
import './draft.css'

type Phase = 'setup' | 'commander' | 'draft' | 'build'

const DRAFT_STORAGE_KEY = 'cubecompanion:draft-simulator:v1'

interface SavedDraft {
  version: 1
  snapshotId: string
  phase: Phase
  players: number
  packsPerPlayer: number
  cardsPerPack: number
  session: DraftSession<BrowserCard> | null
  commanderOffer: BrowserCard[]
  commander: BrowserCard | null
  selectedIds: string[]
  basics: BasicLandCounts
}

function readSavedDraft(): SavedDraft | null {
  try {
    const raw = window.sessionStorage.getItem(DRAFT_STORAGE_KEY)
    if (!raw) return null
    const saved = JSON.parse(raw) as SavedDraft
    if (saved.version !== 1 || saved.snapshotId !== releaseInfo.snapshotId) return null
    if (!['setup', 'commander', 'draft', 'build'].includes(saved.phase)) return null
    if (!Array.isArray(saved.selectedIds) || !saved.basics || !Array.isArray(saved.commanderOffer)) return null
    if (saved.phase !== 'setup' && !saved.session) return null
    if ((saved.phase === 'draft' || saved.phase === 'build') && !saved.commander) return null
    return saved
  } catch {
    return null
  }
}

function DraftCardButton({
  card,
  onClick,
  selected = false,
  disabled = false,
  action,
}: {
  card: BrowserCard
  onClick: () => void
  selected?: boolean
  disabled?: boolean
  action: string
}) {
  return (
    <button
      type="button"
      className={`draft-card${selected ? ' draft-card--selected' : ''}`}
      onClick={onClick}
      disabled={disabled}
      aria-pressed={selected}
      title={`${action}: ${card.name}`}
    >
      {card.imageUri ? <img src={card.imageUri} alt="" loading="lazy" /> : <span className="draft-card-placeholder">No image</span>}
      <span className="draft-card-name">{card.name}</span>
      <small>{card.manaCost || card.typeLine}</small>
    </button>
  )
}

function createDecklist(commander: BrowserCard, pool: readonly BrowserCard[], selected: ReadonlySet<string>, basics: BasicLandCounts): string {
  const lines = [`1 ${commander.name}`, '']
  for (const card of pool.filter((entry) => selected.has(entry.oracleId)).sort((a, b) => a.manaValue - b.manaValue || a.name.localeCompare(b.name))) {
    lines.push(`1 ${card.name}`)
  }
  for (const land of BASIC_LANDS) {
    if (basics[land] > 0) lines.push(`${basics[land]} ${land}`)
  }
  return lines.join('\n')
}

export function DraftSimulator() {
  const [savedDraft] = useState(readSavedDraft)
  const [phase, setPhase] = useState<Phase>(savedDraft?.phase ?? 'setup')
  const [players, setPlayers] = useState(savedDraft?.players ?? 4)
  const [packsPerPlayer, setPacksPerPlayer] = useState(savedDraft?.packsPerPlayer ?? 4)
  const [cardsPerPack, setCardsPerPack] = useState(savedDraft?.cardsPerPack ?? 15)
  const [session, setSession] = useState<DraftSession<BrowserCard> | null>(savedDraft?.session ?? null)
  const [commanderOffer, setCommanderOffer] = useState<BrowserCard[]>(savedDraft?.commanderOffer ?? [])
  const [commander, setCommander] = useState<BrowserCard | null>(savedDraft?.commander ?? null)
  const [selected, setSelected] = useState<Set<string>>(() => new Set(savedDraft?.selectedIds ?? []))
  const [basics, setBasics] = useState<BasicLandCounts>(savedDraft?.basics ?? emptyBasicLands())
  const [message, setMessage] = useState('')

  useEffect(() => {
    const saved: SavedDraft = {
      version: 1,
      snapshotId: releaseInfo.snapshotId,
      phase, players, packsPerPlayer, cardsPerPack, session,
      commanderOffer, commander, selectedIds: [...selected], basics,
    }
    try {
      window.sessionStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(saved))
    } catch {
      // The draft still works if private browsing disables storage.
    }
  }, [phase, players, packsPerPlayer, cardsPerPack, session, commanderOffer, commander, selected, basics])
  const totalNeeded = players * packsPerPlayer * cardsPerPack
  const draftPool = session?.selections[0] ?? []
  const deck = checkDraftDeck(commander, draftPool, selected, basics)

  function reset() {
    setPhase('setup')
    setSession(null)
    setCommanderOffer([])
    setCommander(null)
    setSelected(new Set())
    setBasics(emptyBasicLands())
    setMessage('')
  }

  function begin() {
    if (totalNeeded > draftCards.length) return
    try {
      const next = startDraft(draftCards, { players, packsPerPlayer, cardsPerPack, seed: Date.now() })
      setSession(next)
      setCommanderOffer(dealCommanderPack(commanderCards))
      setPhase('commander')
      setMessage('')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not start draft.')
    }
  }

  function chooseCard(oracleId: string) {
    if (!session || session.complete) return
    try {
      const next = pickDraftCard(session, oracleId)
      setSession(next)
      if (next.complete) setPhase('build')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not make pick.')
    }
  }

  function toggleDeck(card: BrowserCard) {
    setSelected((old) => {
      const next = new Set(old)
      if (next.has(card.oracleId)) next.delete(card.oracleId)
      else next.add(card.oracleId)
      return next
    })
  }

  function adjustBasic(land: BasicLand, amount: number) {
    setBasics((old) => ({ ...old, [land]: Math.max(0, Math.min(60, old[land] + amount)) }))
  }

  async function copyDecklist() {
    if (!commander) return
    try {
      await navigator.clipboard.writeText(createDecklist(commander, draftPool, selected, basics))
      setMessage('Decklist copied to clipboard.')
    } catch {
      setMessage('Clipboard access was blocked. Try copying from a secure browser context.')
    }
  }

  return (
    <section className="draft-view" aria-label="Multiplayer draft simulator">
      <header className="draft-heading">
        <div>
          <span className="draft-eyebrow">Draft simulator</span>
          <h2>Draft & build</h2>
          <p>Draft from the published cube against random-pick opponents, then build a 60-card commander deck.</p>
        </div>
        {phase !== 'setup' && <button type="button" className="draft-reset" onClick={reset}>New draft</button>}
      </header>

      {phase === 'setup' && (
        <div className="draft-panel draft-setup">
          <h3>New multiplayer draft</h3>
          <p>One human, the remaining seats controlled by random bots. No card appears in more than one pack.</p>
          <div className="draft-settings">
            <label>Players (including you)
              <select value={players} onChange={(event) => setPlayers(Number(event.target.value))}>
                {[2, 3, 4, 5, 6, 7, 8].map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </label>
            <label>Packs per player
              <select value={packsPerPlayer} onChange={(event) => setPacksPerPlayer(Number(event.target.value))}>
                {[3, 4].map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </label>
            <label>Cards per pack
              <select value={cardsPerPack} onChange={(event) => setCardsPerPack(Number(event.target.value))}>
                {[15, 18].map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </label>
          </div>
          <div className="draft-config-footer">
            <div>
              <strong>{totalNeeded} / {draftCards.length} unique cube cards</strong>
              <span>{players - 1} bots · {packsPerPlayer * cardsPerPack} draft picks for you · Left / right alternating</span>
              {totalNeeded > draftCards.length && <em>Reduce player count or pack size to fit this cube.</em>}
            </div>
            <button type="button" className="draft-primary" disabled={totalNeeded > draftCards.length} onClick={begin}>Deal commander options</button>
          </div>
        </div>
      )}

      {phase === 'commander' && (
        <div className="draft-panel">
          <h3>Choose your commander</h3>
          <p>Select one of the five random commander options. Your commander is separate from the draft packs and counts toward your 60-card deck.</p>
          <div className="draft-card-grid">
            {commanderOffer.map((card) => (
              <DraftCardButton key={card.oracleId} card={card} action="Select commander" onClick={() => { setCommander(card); setPhase('draft') }} />
            ))}
          </div>
        </div>
      )}

      {phase === 'draft' && session && (
        <div className="draft-layout">
          <div className="draft-panel">
            <div className="draft-stage-header">
              <div>
                <h3>Pack {session.round + 1} of {session.options.packsPerPlayer} · Pick {session.pick + 1} of {session.options.cardsPerPack}</h3>
                <p>Passing {draftDirection(session.round)} · {session.packs[0].length} cards to choose from</p>
              </div>
              <span className="draft-progress">{session.selections[0].length} picked</span>
            </div>
            <div className="draft-card-grid">
              {session.packs[0].map((card) => <DraftCardButton key={card.oracleId} card={card} action="Draft" onClick={() => chooseCard(card.oracleId)} />)}
            </div>
          </div>
          <aside className="draft-panel draft-side">
            <h3>My picks</h3>
            <p>{commander?.name} · {session.selections[0].length} cards</p>
            <ol className="draft-pick-list">
              {session.selections[0].map((card) => <li key={card.oracleId}>{card.name}</li>)}
            </ol>
          </aside>
        </div>
      )}

      {phase === 'build' && session && commander && (
        <div className="draft-layout">
          <div className="draft-panel">
            <div className="draft-stage-header">
              <div>
                <h3>Drafted pool</h3>
                <p>Choose which drafted cards to include. Cards outside your commander's colors are flagged.</p>
              </div>
              <span className="draft-progress">{selected.size} selected</span>
            </div>
            <div className="draft-card-grid">
              {draftPool.map((card) => (
                <div key={card.oracleId} className={!isCommanderLegal(card, commander) ? 'draft-offcolor' : undefined}>
                  <DraftCardButton card={card} action="Add or remove from deck" selected={selected.has(card.oracleId)} onClick={() => toggleDeck(card)} />
                  {!isCommanderLegal(card, commander) && <small className="draft-color-warning">Off-color</small>}
                </div>
              ))}
            </div>
          </div>
          <aside className="draft-panel draft-side draft-deckbuilder">
            <h3>My deck <span>{deck.total} / 60</span></h3>
            <p><strong>Commander:</strong> {commander.name}</p>
            <div className="draft-basic-list">
              <h4>Basic lands · unlimited external supply</h4>
              {BASIC_LANDS.map((land) => (
                <div key={land} className="draft-basic-row">
                  <span>{land}</span>
                  <div>
                    <button type="button" aria-label={`Remove ${land}`} disabled={basics[land] === 0} onClick={() => adjustBasic(land, -1)}>−</button>
                    <output>{basics[land]}</output>
                    <button type="button" aria-label={`Add ${land}`} onClick={() => adjustBasic(land, 1)}>+</button>
                  </div>
                </div>
              ))}
            </div>
            <h4>Included drafted cards ({selected.size})</h4>
            <ul className="draft-deck-cards">
              {draftPool.filter((card) => selected.has(card.oracleId)).map((card) => (
                <li key={card.oracleId}>
                  <span>{card.name}</span>
                  <button type="button" aria-label={`Remove ${card.name}`} onClick={() => toggleDeck(card)}>×</button>
                </li>
              ))}
            </ul>
            <div className={`draft-validation${deck.valid ? ' draft-validation--valid' : ''}`} aria-live="polite">
              {deck.valid ? <strong>60-card deck valid</strong> : deck.issues.map((issue) => <p key={issue}>{issue}</p>)}
            </div>
            <button type="button" className="draft-primary" onClick={() => void copyDecklist()}>Copy decklist</button>
          </aside>
        </div>
      )}
      {message && <p className="draft-message" role="status">{message}</p>}
    </section>
  )
}
