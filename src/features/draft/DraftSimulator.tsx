import { useEffect, useState } from 'react'
import { commanderCards, draftCards, releaseInfo } from '../browser/data'
import type { BrowserCard } from '../browser/types'
import { dealCommanderPack } from '../playtest/deal'
import { DeckOverview } from './DeckOverview'
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
type PoolFilter = 'all' | 'available' | 'included'

const DRAFT_STORAGE_KEY = 'cubecompanion:draft-simulator:v2'
const LEGACY_DRAFT_STORAGE_KEY = 'cubecompanion:draft-simulator:v1'

interface SavedDraft {
  version: 2
  snapshotId: string
  phase: Phase
  players: number
  packsPerPlayer: number
  cardsPerPack: number
  session: DraftSession<BrowserCard> | null
  commanderOffer: BrowserCard[]
  commanderCandidates: BrowserCard[]
  activeCommanderIds: string[]
  selectedIds: string[]
  basics: BasicLandCounts
}

function readSavedDraft(): SavedDraft | null {
  try {
    // Upgrade prior sessions without losing their drafted cards or deck choices.
    const raw = window.sessionStorage.getItem(DRAFT_STORAGE_KEY)
    const legacyRaw = raw ? null : window.sessionStorage.getItem(LEGACY_DRAFT_STORAGE_KEY)
    if (!raw && !legacyRaw) return null
    const parsed = JSON.parse(raw ?? legacyRaw!) as SavedDraft & { commander?: BrowserCard | null }
    if (parsed.snapshotId !== releaseInfo.snapshotId) return null
    if (!['setup', 'commander', 'draft', 'build'].includes(parsed.phase)) return null
    if (!Array.isArray(parsed.selectedIds) || !parsed.basics || !Array.isArray(parsed.commanderOffer)) return null
    if (parsed.phase !== 'setup' && !parsed.session) return null
    if (raw) {
      if (parsed.version !== 2 || !Array.isArray(parsed.commanderCandidates) || !Array.isArray(parsed.activeCommanderIds)) return null
      if ((parsed.phase === 'draft' || parsed.phase === 'build') && parsed.commanderCandidates.length === 0) return null
      return parsed
    }
    const oldCommander = parsed.commander
    if ((parsed.phase === 'draft' || parsed.phase === 'build') && !oldCommander) return null
    return {
      ...parsed,
      version: 2,
      commanderCandidates: oldCommander ? [oldCommander] : [],
      activeCommanderIds: oldCommander ? [oldCommander.oracleId] : [],
    }
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

function createDecklist(commanders: readonly BrowserCard[], pool: readonly BrowserCard[], selected: ReadonlySet<string>, basics: BasicLandCounts): string {
  const lines = [...commanders.map((commander) => `1 ${commander.name}`), '']
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
  const [commanderCandidates, setCommanderCandidates] = useState<BrowserCard[]>(savedDraft?.commanderCandidates ?? [])
  const [activeCommanderIds, setActiveCommanderIds] = useState<string[]>(savedDraft?.activeCommanderIds ?? [])
  const [selected, setSelected] = useState<Set<string>>(() => new Set(savedDraft?.selectedIds ?? []))
  const [basics, setBasics] = useState<BasicLandCounts>(savedDraft?.basics ?? emptyBasicLands())
  const [message, setMessage] = useState('')
  const [poolQuery, setPoolQuery] = useState('')
  const [poolFilter, setPoolFilter] = useState<PoolFilter>('all')

  useEffect(() => {
    const saved: SavedDraft = {
      version: 2,
      snapshotId: releaseInfo.snapshotId,
      phase, players, packsPerPlayer, cardsPerPack, session,
      commanderOffer, commanderCandidates, activeCommanderIds, selectedIds: [...selected], basics,
    }
    try {
      window.sessionStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(saved))
    } catch {
      // The draft still works if private browsing disables storage.
    }
  }, [phase, players, packsPerPlayer, cardsPerPack, session, commanderOffer, commanderCandidates, activeCommanderIds, selected, basics])
  const totalNeeded = players * packsPerPlayer * cardsPerPack
  const draftPool = session?.selections[0] ?? []
  const activeCommanders = commanderCandidates.filter((card) => activeCommanderIds.includes(card.oracleId))
  const deck = checkDraftDeck(activeCommanders, draftPool, selected, basics)
  const selectedCards = draftPool.filter((card) => selected.has(card.oracleId))
  const visiblePool = draftPool
    .filter((card) => card.name.toLocaleLowerCase('en-US').includes(poolQuery.trim().toLocaleLowerCase('en-US')))
    .filter((card) => poolFilter === 'all' || (selected.has(card.oracleId) === (poolFilter === 'included')))
    .slice()
    .sort((left, right) => left.manaValue - right.manaValue || left.name.localeCompare(right.name))

  function reset() {
    setPhase('setup')
    setSession(null)
    setCommanderOffer([])
    setCommanderCandidates([])
    setActiveCommanderIds([])
    setSelected(new Set())
    setBasics(emptyBasicLands())
    setMessage('')
    setPoolQuery('')
    setPoolFilter('all')
  }

  function begin() {
    if (totalNeeded > draftCards.length) return
    try {
      const next = startDraft(draftCards, { players, packsPerPlayer, cardsPerPack, seed: Date.now() })
      setSession(next)
      setCommanderOffer(dealCommanderPack(commanderCards))
      setCommanderCandidates([])
      setActiveCommanderIds([])
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

  function toggleCommanderCandidate(card: BrowserCard) {
    setCommanderCandidates((old) => old.some((entry) => entry.oracleId === card.oracleId)
      ? old.filter((entry) => entry.oracleId !== card.oracleId)
      : old.length < 2 ? [...old, card] : old)
  }

  function toggleActiveCommander(oracleId: string) {
    setActiveCommanderIds((old) => old.includes(oracleId)
      ? old.filter((id) => id !== oracleId)
      : old.length < 2 ? [...old, oracleId] : old)
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
    if (activeCommanders.length === 0) {
      setMessage('Choose at least one commander before copying your decklist.')
      return
    }
    try {
      await navigator.clipboard.writeText(createDecklist(activeCommanders, draftPool, selected, basics))
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
          <h3>Choose two commander possibilities</h3>
          <p>Pick exactly two of your five options. You can decide whether to play one or both after the draft.</p>
          <div className="draft-card-grid">
            {commanderOffer.map((card) => (
              <DraftCardButton
                key={card.oracleId}
                card={card}
                action="Choose commander possibility"
                selected={commanderCandidates.some((chosen) => chosen.oracleId === card.oracleId)}
                disabled={commanderCandidates.length === 2 && !commanderCandidates.some((chosen) => chosen.oracleId === card.oracleId)}
                onClick={() => toggleCommanderCandidate(card)}
              />
            ))}
          </div>
          <div className="draft-commander-confirm">
            <span>{commanderCandidates.length} / 2 commander possibilities selected</span>
            <button type="button" className="draft-primary" disabled={commanderCandidates.length !== 2} onClick={() => setPhase('draft')}>
              Start drafting
            </button>
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
            <p>Commander options: {commanderCandidates.map((card) => card.name).join(' / ')} · {session.selections[0].length} cards</p>
            <ol className="draft-pick-list">
              {session.selections[0].map((card) => <li key={card.oracleId}>{card.name}</li>)}
            </ol>
          </aside>
        </div>
      )}

      {phase === 'build' && session && (
        <div className="draft-build-view">
          <section className="draft-panel draft-final-commanders" aria-label="Choose final commanders">
            <div className="draft-final-commander-heading">
              <div>
                <h3>Choose your final commander(s)</h3>
                <p>Play either option alone or both together. You can change your choice while building.</p>
              </div>
              <span className="draft-progress">{activeCommanders.length} / 2 active</span>
            </div>
            <div className="draft-final-commander-options">
              {commanderCandidates.map((card) => {
                const active = activeCommanderIds.includes(card.oracleId)
                return (
                  <button
                    type="button"
                    key={card.oracleId}
                    className={`draft-final-commander-option${active ? ' active' : ''}`}
                    aria-pressed={active}
                    onClick={() => toggleActiveCommander(card.oracleId)}
                  >
                    {card.imageUri ? <img src={card.imageUri} alt="" loading="lazy" /> : <span className="draft-final-commander-image-placeholder" />}
                    <span>
                      <strong>{card.name}</strong>
                      <small>{active ? 'In command zone' : 'Available option'}</small>
                    </span>
                    <span className="draft-final-commander-toggle" aria-hidden="true">{active ? '✓' : '+'}</span>
                  </button>
                )
              })}
            </div>
            <p className="draft-final-commander-note">Cube house rule: two commanders share their combined color identity and both count toward 60 cards. Official Partner restrictions are not checked.</p>
          </section>
          <header className="draft-build-heading">
            <div>
              <h3>Build your deck</h3>
              <p>Pick cards from your drafted pool. They appear immediately in the deck overview, and you can remove them directly from the board.</p>
            </div>
            <div className="draft-build-actions">
              <span className={`draft-build-count${deck.valid ? ' draft-build-count--valid' : ''}`}>{deck.total} / 60 cards</span>
              <button type="button" className="draft-primary" onClick={() => void copyDecklist()}>Copy decklist</button>
            </div>
          </header>
          <div className="draft-build-layout">
            <div className="draft-build-board">
              <DeckOverview
                commanders={activeCommanders}
                selectedCards={selectedCards}
                basics={basics}
                onRemoveCard={toggleDeck}
                onAdjustBasic={adjustBasic}
              />
              <div className={`draft-validation${deck.valid ? ' draft-validation--valid' : ''}`} aria-live="polite">
                {deck.valid ? <strong>60-card deck valid</strong> : deck.issues.map((issue) => <p key={issue}>{issue}</p>)}
              </div>
            </div>
            <aside className="draft-panel draft-pool-panel" aria-label="Drafted card pool">
              <div className="draft-pool-header">
                <h3>Drafted pool <span>{selected.size} / {draftPool.length} included</span></h3>
                <p>Click a card to add it to the visual deck, or click again to remove it.</p>
              </div>
              <label className="draft-pool-search">
                <span>Find a card</span>
                <input type="search" value={poolQuery} onChange={(event) => setPoolQuery(event.target.value)} placeholder="Search drafted cards…" />
              </label>
              <div className="draft-pool-filters" role="group" aria-label="Filter drafted cards">
                {(['all', 'available', 'included'] as const).map((filter) => (
                  <button key={filter} type="button" aria-pressed={poolFilter === filter} className={poolFilter === filter ? 'active' : ''} onClick={() => setPoolFilter(filter)}>
                    {filter === 'all' ? 'All' : filter === 'available' ? 'Available' : 'In deck'}
                  </button>
                ))}
              </div>
              <div className="draft-pool-items">
                {visiblePool.map((card) => {
                  const included = selected.has(card.oracleId)
                  const offColor = activeCommanders.length > 0 && !isCommanderLegal(card, activeCommanders)
                  return (
                    <button
                      key={card.oracleId}
                      type="button"
                      className={`draft-pool-card${included ? ' draft-pool-card--included' : ''}${offColor ? ' draft-pool-card--offcolor' : ''}`}
                      aria-pressed={included}
                      title={`${included ? 'Remove' : 'Add'} ${card.name}${offColor ? ' (outside commander colors)' : ''}`}
                      onClick={() => toggleDeck(card)}
                    >
                      {card.imageUri ? <img src={card.imageUri} alt="" loading="lazy" /> : <span className="draft-pool-placeholder" />}
                      <span className="draft-pool-card-content">
                        <strong>{card.name}</strong>
                        <small>{card.manaCost || card.typeLine}</small>
                        {offColor && <em>Off-color</em>}
                      </span>
                      <span className="draft-pool-card-action" aria-hidden="true">{included ? '✓' : '+'}</span>
                    </button>
                  )
                })}
                {visiblePool.length === 0 && <p className="draft-pool-empty">No cards match this filter.</p>}
              </div>
            </aside>
          </div>
        </div>
      )}
      {message && <p className="draft-message" role="status">{message}</p>}
    </section>
  )
}
