import { useEffect, useState } from 'react'
import { commanderCards, draftCards, releaseInfo } from '../browser/data'
import type { BrowserCard } from '../browser/types'
import { dealCommanderPack } from '../playtest/deal'
import { DeckOverview } from './DeckOverview'
import { AgentDeckPanel } from './AgentDeckPanel'
import { chooseAgentPick, createDraftAgents, type DraftAgent } from '../../domain/draft/agents'
import { SampleHandDialog } from './SampleHandDialog'
import {
  draftDirection,
  pickDraftCard,
  startDraft,
  type DraftSession,
} from '../../domain/draft/engine'
import {
  BASIC_LANDS,
  canPairCommanders,
  checkDraftDeck,
  emptyBasicLands,
  isCommanderLegal,
  type BasicLand,
  type BasicLandCounts,
} from '../../domain/draft/deck'
import './draft.css'

type Phase = 'setup' | 'commander' | 'draft' | 'build'

const DRAFT_STORAGE_KEY = 'cubecompanion:draft-simulator:v4'
const PREVIOUS_DRAFT_STORAGE_KEY = 'cubecompanion:draft-simulator:v3'
const OLDER_DRAFT_STORAGE_KEY = 'cubecompanion:draft-simulator:v2'
const LEGACY_DRAFT_STORAGE_KEY = 'cubecompanion:draft-simulator:v1'

interface SavedDraft {
  version: 4
  snapshotId: string
  phase: Phase
  players: number
  packsPerPlayer: number
  cardsPerPack: number
  session: DraftSession<BrowserCard> | null
  agents: DraftAgent<BrowserCard>[]
  commanderOffer: BrowserCard[]
  commanderCandidates: BrowserCard[]
  activeCommanderIds: string[]
  selectedIds: string[]
  basics: BasicLandCounts
}

function readSavedDraft(): SavedDraft | null {
  try {
    // All previous session versions remain readable, including mid-draft picks.
    const raw = window.sessionStorage.getItem(DRAFT_STORAGE_KEY)
    const v3 = raw ? null : window.sessionStorage.getItem(PREVIOUS_DRAFT_STORAGE_KEY)
    const v2 = raw || v3 ? null : window.sessionStorage.getItem(OLDER_DRAFT_STORAGE_KEY)
    const v1 = raw || v3 || v2 ? null : window.sessionStorage.getItem(LEGACY_DRAFT_STORAGE_KEY)
    if (!raw && !v3 && !v2 && !v1) return null
    const parsed = JSON.parse(raw ?? v3 ?? v2 ?? v1!) as Omit<SavedDraft, 'version' | 'agents'> & {
      version: number
      agents?: DraftAgent<BrowserCard>[]
      commander?: BrowserCard | null
    }
    if (parsed.snapshotId !== releaseInfo.snapshotId) return null
    if (!['setup', 'commander', 'draft', 'build'].includes(parsed.phase)) return null
    if (!Array.isArray(parsed.selectedIds) || !parsed.basics || !Array.isArray(parsed.commanderOffer)) return null
    if (parsed.phase !== 'setup' && !parsed.session) return null

    let commanderCandidates = parsed.commanderCandidates
    let activeCommanderIds = parsed.activeCommanderIds
    let selectedIds = parsed.selectedIds
    if (v1) {
      if (parsed.version !== 1) return null
      const oldCommander = parsed.commander
      if ((parsed.phase === 'draft' || parsed.phase === 'build') && !oldCommander) return null
      commanderCandidates = oldCommander ? [oldCommander] : []
      activeCommanderIds = oldCommander ? [oldCommander.oracleId] : []
    } else {
      const expectedVersion = raw ? 4 : v3 ? 3 : 2
      if (parsed.version !== expectedVersion || !Array.isArray(commanderCandidates) || !Array.isArray(activeCommanderIds)) return null
    }
    if ((parsed.phase === 'draft' || parsed.phase === 'build') && commanderCandidates.length === 0) return null

    if (v1 || v2) {
      if (parsed.phase === 'draft') {
        selectedIds = parsed.session?.selections[0].map((card) => card.oracleId) ?? []
        if (v2) activeCommanderIds = commanderCandidates.map((card) => card.oracleId)
      }
    }

    const agents = parsed.phase === 'setup' ? [] : (
      raw && Array.isArray(parsed.agents) && parsed.agents.length === parsed.players - 1
        ? parsed.agents
        : createDraftAgents(
          commanderCards,
          parsed.players - 1,
          parsed.session?.options.seed ?? 0,
          new Set(parsed.commanderOffer.map((card) => card.oracleId)),
        )
    )
    return {
      ...parsed,
      version: 4,
      agents,
      commanderCandidates,
      activeCommanderIds,
      selectedIds,
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
  compact = false,
}: {
  card: BrowserCard
  onClick: () => void
  selected?: boolean
  disabled?: boolean
  action: string
  compact?: boolean
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
      {!compact && <small>{card.manaCost || card.typeLine}</small>}
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

/** A compact overlapping side-pool card with a full viewport preview on hover/focus. */
function SidePoolCard({
  card, commander = false, offColor = false, onRestore,
}: {
  card: BrowserCard
  commander?: boolean
  offColor?: boolean
  onRestore: () => void
}) {
  const [preview, setPreview] = useState<{ left: number; top: number } | null>(null)

  function previewAt(element: HTMLButtonElement) {
    const rect = element.getBoundingClientRect()
    const width = 270
    const height = 420
    const left = Math.max(12, rect.left - width - 14)
    const top = Math.min(
      Math.max(76, rect.top - 35),
      Math.max(76, window.innerHeight - height - 12),
    )
    setPreview({ left, top })
  }

  return (
    <div className="draft-aside-card-shell">
      <button
        type="button"
        className={`draft-aside-card${commander ? ' draft-aside-card--commander' : ''}${offColor ? ' draft-aside-card--offcolor' : ''}`}
        onClick={onRestore}
        onMouseEnter={(event) => previewAt(event.currentTarget)}
        onMouseLeave={() => setPreview(null)}
        onFocus={(event) => previewAt(event.currentTarget)}
        onBlur={() => setPreview(null)}
        aria-label={`Restore ${card.name} to your ${commander ? 'commanders' : 'deck'}`}
        title={`Restore ${card.name}`}
      >
        {card.imageUri ? <img src={card.imageUri} alt="" loading="lazy" /> : <span className="draft-aside-placeholder">{card.name}</span>}
        {commander && <span className="draft-aside-card-badge">CMD</span>}
        {offColor && <span className="draft-aside-card-warning">!</span>}
      </button>
      {preview && (
        <aside className="draft-aside-preview" style={preview} aria-hidden="true">
          {card.imageUri ? <img src={card.imageUri} alt="" /> : <div className="draft-aside-placeholder">{card.name}</div>}
          <strong>{card.name}</strong>
          <small>{card.manaCost || card.typeLine}</small>
        </aside>
      )}
    </div>
  )
}

export function DraftSimulator() {
  const [savedDraft] = useState(readSavedDraft)
  const [phase, setPhase] = useState<Phase>(savedDraft?.phase ?? 'setup')
  const [players, setPlayers] = useState(savedDraft?.players ?? 4)
  const [packsPerPlayer, setPacksPerPlayer] = useState(savedDraft?.packsPerPlayer ?? 4)
  const [cardsPerPack, setCardsPerPack] = useState(savedDraft?.cardsPerPack ?? 15)
  const [session, setSession] = useState<DraftSession<BrowserCard> | null>(savedDraft?.session ?? null)
  const [agents, setAgents] = useState<DraftAgent<BrowserCard>[]>(savedDraft?.agents ?? [])
  const [commanderOffer, setCommanderOffer] = useState<BrowserCard[]>(savedDraft?.commanderOffer ?? [])
  const [commanderCandidates, setCommanderCandidates] = useState<BrowserCard[]>(savedDraft?.commanderCandidates ?? [])
  const [activeCommanderIds, setActiveCommanderIds] = useState<string[]>(savedDraft?.activeCommanderIds ?? [])
  const [selected, setSelected] = useState<Set<string>>(() => new Set(savedDraft?.selectedIds ?? []))
  const [basics, setBasics] = useState<BasicLandCounts>(savedDraft?.basics ?? emptyBasicLands())
  const [message, setMessage] = useState('')
  const [deckExpanded, setDeckExpanded] = useState(savedDraft?.phase === 'build')
  const [sampleHandDeck, setSampleHandDeck] = useState<{ cards: readonly BrowserCard[]; basics: BasicLandCounts; label?: string } | null>(null)

  useEffect(() => {
    const saved: SavedDraft = {
      version: 4,
      snapshotId: releaseInfo.snapshotId,
      phase, players, packsPerPlayer, cardsPerPack, session, agents,
      commanderOffer, commanderCandidates, activeCommanderIds, selectedIds: [...selected], basics,
    }
    try {
      window.sessionStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(saved))
    } catch {
      // The draft still works if private browsing disables storage.
    }
  }, [phase, players, packsPerPlayer, cardsPerPack, session, agents, commanderOffer, commanderCandidates, activeCommanderIds, selected, basics])
  const totalNeeded = players * packsPerPlayer * cardsPerPack
  const draftPool = session?.selections[0] ?? []
  const activeCommanders = commanderCandidates.filter((card) => activeCommanderIds.includes(card.oracleId))
  const deck = checkDraftDeck(activeCommanders, draftPool, selected, basics)
  const selectedCards = draftPool.filter((card) => selected.has(card.oracleId))
  const sidePoolCards = draftPool.filter((card) => !selected.has(card.oracleId))
    .sort((left, right) => left.manaValue - right.manaValue || left.name.localeCompare(right.name))
  const sidePoolCommanders = commanderCandidates.filter((card) => !activeCommanderIds.includes(card.oracleId))
  const setAsideCount = sidePoolCards.length + sidePoolCommanders.length
  const offColorCards = activeCommanders.length > 0
    ? selectedCards.filter((card) => !isCommanderLegal(card, activeCommanders))
    : []
  const incompatibleCommanders = activeCommanders.length === 2 && !canPairCommanders(activeCommanders[0], activeCommanders[1])
  const visibleDeckIssues = phase === 'draft'
    ? deck.issues.filter((issue) => !issue.startsWith('The deck needs exactly 60 cards'))
    : deck.issues
  const deckCheckLabel = visibleDeckIssues.length === 0
    ? (phase === 'draft' ? 'Rules OK so far' : '✓ Deck valid')
    : `${visibleDeckIssues.length} ${phase === 'draft' ? 'rule warning' : 'deck check'}${visibleDeckIssues.length === 1 ? '' : 's'}`

  function reset() {
    setPhase('setup')
    setSession(null)
    setAgents([])
    setSampleHandDeck(null)
    setCommanderOffer([])
    setCommanderCandidates([])
    setActiveCommanderIds([])
    setSelected(new Set())
    setBasics(emptyBasicLands())
    setMessage('')
    setDeckExpanded(false)
  }

  function begin() {
    if (totalNeeded > draftCards.length) return
    try {
      const next = startDraft(draftCards, { players, packsPerPlayer, cardsPerPack, seed: Date.now() })
      const offer = dealCommanderPack(commanderCards)
      const nextAgents = createDraftAgents(
        commanderCards,
        players - 1,
        next.options.seed,
        new Set(offer.map((card) => card.oracleId)),
      )
      setSession(next)
      setAgents(nextAgents)
      setSampleHandDeck(null)
      setCommanderOffer(offer)
      setCommanderCandidates([])
      setActiveCommanderIds([])
      setSelected(new Set())
      setBasics(emptyBasicLands())
      setDeckExpanded(false)
      setPhase('commander')
      setMessage('')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not start draft.')
    }
  }

  function chooseCard(oracleId: string) {
    if (!session || session.complete) return
    try {
      const next = pickDraftCard(session, oracleId, (pack, seat, picks, roll) => {
        const agent = agents.find((entry) => entry.seat === seat)
        return agent ? chooseAgentPick(pack, picks, agent.commanders, roll) : Math.floor(roll * pack.length)
      })
      setSession(next)
      // Every drafted card starts in the deck. Set-aside decisions are reversible.
      setSelected((old) => new Set(old).add(oracleId))
      if (next.complete) {
        setDeckExpanded(true)
        setPhase('build')
      }
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

  function setAsideOffColor() {
    if (incompatibleCommanders) return
    const offColorIds = new Set(offColorCards.map((card) => card.oracleId))
    setSelected((old) => new Set([...old].filter((id) => !offColorIds.has(id))))
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
      <header className={`draft-heading${phase === 'draft' || phase === 'build' ? ' draft-heading--compact' : ''}`}>
        <div>
          <span className="draft-eyebrow">Draft simulator</span>
          <h2>Draft & build</h2>
          {(phase === 'setup' || phase === 'commander') && <p>Draft from the published cube against commander-driven opponents, then build a 60-card commander deck.</p>}
        </div>
        {phase !== 'setup' && <button type="button" className="draft-reset" onClick={reset}>New draft</button>}
      </header>

      {phase === 'setup' && (
        <div className="draft-panel draft-setup">
          <h3>New multiplayer draft</h3>
          <p>One human and commander-driven draft agents. Each agent chooses a random commander configuration and prioritizes on-color picks. No card appears in more than one pack.</p>
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
            <button type="button" className="draft-primary" disabled={commanderCandidates.length !== 2} onClick={() => {
              setActiveCommanderIds(commanderCandidates.map((card) => card.oracleId))
              setDeckExpanded(false)
              setPhase('draft')
            }}>
              Start drafting
            </button>
          </div>
        </div>
      )}

      {(phase === 'draft' || phase === 'build') && session && (
        <section className="draft-workspace" aria-label="Your deck and side pool">
          <div className="draft-workspace-bar">
            <div className="draft-workspace-summary">
              <div className="draft-workspace-title">
                <strong>Your deck <span className={phase === 'build' && !deck.valid ? 'draft-workspace-count--invalid' : deck.valid ? 'draft-workspace-count--valid' : ''}>{deck.total} / 60</span></strong>
                <small>{selectedCards.length} picks · {setAsideCount} aside</small>
              </div>
              <details className={`draft-header-checks${visibleDeckIssues.length ? ' draft-header-checks--warning' : ' draft-header-checks--clear'}`}>
                <summary aria-live="polite">{deckCheckLabel}</summary>
                <div className="draft-header-checks-panel">
                  <strong>{phase === 'draft' ? 'During the draft' : 'Final deck checks'}</strong>
                  {phase === 'draft' && <p>The 60-card total is checked after the last pick.</p>}
                  {visibleDeckIssues.length > 0
                    ? <ul>{visibleDeckIssues.map((issue) => <li key={issue}>{issue}</li>)}</ul>
                    : <p>{phase === 'draft' ? 'No commander or color conflicts yet.' : 'Your 60-card deck passes all checks.'}</p>}
                  {incompatibleCommanders && (
                    <div className="draft-header-checks-actions" role="group" aria-label="Choose one commander">
                      {activeCommanders.map((commander) => (
                        <button type="button" key={commander.oracleId} onClick={() => setActiveCommanderIds([commander.oracleId])}>
                          Use {commander.name} only
                        </button>
                      ))}
                    </div>
                  )}
                  {offColorCards.length > 0 && !incompatibleCommanders && (
                    <button type="button" className="draft-header-checks-fix" onClick={setAsideOffColor}>
                      Set aside {offColorCards.length} off-color
                    </button>
                  )}
                </div>
              </details>
              <div className="draft-commander-chips" aria-label="Commander choices">
                {commanderCandidates.map((card) => {
                  const active = activeCommanderIds.includes(card.oracleId)
                  return (
                    <div key={card.oracleId} className={`draft-commander-chip${active ? ' active' : ' aside'}`}>
                      <span className="draft-commander-chip-name" tabIndex={0} aria-label={`Preview ${card.name}${active ? ', in deck' : ', set aside'}`}>
                        <span aria-hidden="true">★</span> {card.name}{!active && <em> · aside</em>}
                      </span>
                      <div className="draft-commander-preview">
                        {card.imageUri ? <img src={card.imageUri} alt="" /> : <strong>{card.name}</strong>}
                        <small>{active ? 'In deck — click its gold-outlined card to set aside' : 'Set aside — click it in the side pool to restore'}</small>
                      </div>
                    </div>
                  )
                })}
                {incompatibleCommanders && <span className="draft-commander-pair-hint">{phase === 'build' ? 'Choose your final commander below' : 'Choose one at the end'}</span>}
              </div>
            </div>
            <div className="draft-workspace-actions">
              <button
                type="button"
                className="draft-sample-trigger"
                disabled={selectedCards.length + BASIC_LANDS.reduce((sum, land) => sum + basics[land], 0) === 0}
                onClick={() => setSampleHandDeck({ cards: selectedCards, basics })}
                title="Deal seven random cards from your current main deck"
              >Sample hand</button>
              <button
                type="button"
                className="draft-workspace-toggle"
                aria-controls="draft-deck-workspace-content"
                aria-expanded={deckExpanded}
                onClick={() => setDeckExpanded((old) => !old)}
              >
                <span className="draft-workspace-toggle-label">{deckExpanded ? 'Hide deck' : 'Show deck'}</span>
                <span className="draft-workspace-chevron" aria-hidden="true">{deckExpanded ? '▲' : '▼'}</span>
              </button>
              {phase === 'build' && <button type="button" className="draft-primary draft-copy-decklist" onClick={() => void copyDecklist()}>Copy decklist</button>}
            </div>
          </div>
          {phase === 'build' && incompatibleCommanders && (
            <div className="draft-final-commander" role="group" aria-label="Final commander choice">
              <strong>Choose your final commander</strong>
              <span>These two cannot be paired. The other stays in your side pool.</span>
              {activeCommanders.map((card) => (
                <button type="button" key={card.oracleId} onClick={() => setActiveCommanderIds([card.oracleId])}>Use {card.name} only</button>
              ))}
            </div>
          )}
          {deckExpanded && (
            <div id="draft-deck-workspace-content" className="draft-workspace-content">
              <DeckOverview
                commanders={activeCommanders}
                selectedCards={selectedCards}
                basics={basics}
                onRemoveCard={toggleDeck}
                onRemoveCommander={(card) => toggleActiveCommander(card.oracleId)}
                onAdjustBasic={adjustBasic}
              />
              <aside className="draft-side-pool" aria-label="Cards set aside">
                <h3>Side pool <span>{setAsideCount}</span></h3>
                {setAsideCount === 0 ? (
                  <p className="draft-side-pool-empty">All picks in deck</p>
                ) : (
                  <div className="draft-side-pool-list">
                    {sidePoolCommanders.map((card) => (
                      <SidePoolCard key={card.oracleId} card={card} commander onRestore={() => toggleActiveCommander(card.oracleId)} />
                    ))}
                    {sidePoolCards.map((card) => (
                      <SidePoolCard
                        key={card.oracleId}
                        card={card}
                        offColor={activeCommanders.length > 0 && !isCommanderLegal(card, activeCommanders)}
                        onRestore={() => toggleDeck(card)}
                      />
                    ))}
                  </div>
                )}
              </aside>
            </div>
          )}
        </section>
      )}

      {phase === 'draft' && session && (
        <section className="draft-panel draft-pack" aria-label="Current draft pack">
          <div className="draft-stage-header">
            <div>
              <h3>Pack {session.round + 1} of {session.options.packsPerPlayer} · Pick {session.pick + 1} of {session.options.cardsPerPack}</h3>
              <p>{draftDirection(session.round) === 'left' ? '←' : '→'} Passing {draftDirection(session.round)} · {session.packs[0].length} remaining</p>
            </div>
          </div>
          <div className="draft-card-grid draft-pack-grid">
            {session.packs[0].map((card) => <DraftCardButton key={card.oracleId} card={card} action="Draft" compact onClick={() => chooseCard(card.oracleId)} />)}
          </div>
        </section>
      )}

      {(phase === 'draft' || phase === 'build') && session && agents.length > 0 && (
        <AgentDeckPanel
          agents={agents}
          session={session}
          phase={phase}
          onSampleHand={(cards, deckBasics, label) => setSampleHandDeck({ cards, basics: deckBasics, label })}
        />
      )}
      {sampleHandDeck && (
        <SampleHandDialog
          selectedCards={sampleHandDeck.cards}
          basics={sampleHandDeck.basics}
          deckLabel={sampleHandDeck.label}
          onClose={() => setSampleHandDeck(null)}
        />
      )}
      {message && <p className="draft-message" role="status">{message}</p>}
    </section>
  )
}
