import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { validateCube } from '../../domain'
import { commanderCards, draftCards, releaseInfo } from '../browser/data'
import type { BrowserCard } from '../browser/types'
import { sandboxDiffText, sandboxFullListText } from './export'
import { lookupSandboxCard } from './scryfall'
import {
  allocationLabel,
  applySandboxCard,
  createSandboxState,
  removeSandboxCard,
  sandboxChangeCount,
  sandboxDiff,
} from './state'
import { loadSandboxState, saveSandboxState } from './storage'
import type { SandboxPool, SandboxState } from './types'
import './sandbox.css'

function downloadText(filename: string, content: string): void {
  const url = URL.createObjectURL(new Blob([content], { type: 'text/plain;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

function initialState(): SandboxState {
  return loadSandboxState(
    releaseInfo.snapshotId,
    draftCards,
    commanderCards,
    window.sessionStorage,
  )
}

function ChangeNames({ title, cards }: { title: string; cards: readonly BrowserCard[] }) {
  if (cards.length === 0) return null
  return (
    <div className="sandbox-change-group">
      <strong>{title}</strong>
      <span>{cards.map((card) => card.name).join(', ')}</span>
    </div>
  )
}

export function SandboxView() {
  const [state, setState] = useState<SandboxState>(initialState)
  const [addName, setAddName] = useState('')
  const [addPool, setAddPool] = useState<SandboxPool>('draft')
  const [addStatus, setAddStatus] = useState('')
  const [adding, setAdding] = useState(false)
  const [search, setSearch] = useState('')

  useEffect(() => {
    saveSandboxState(state, window.sessionStorage)
  }, [state])

  const validation = useMemo(
    () => validateCube({ draftCards: state.draftCards, commanders: state.commanders }),
    [state],
  )
  const diff = useMemo(
    () => sandboxDiff(state, draftCards, commanderCards),
    [state],
  )
  const changeCount = sandboxChangeCount(diff)
  const searchResults = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('en-US')
    if (!query) return []
    return [
      ...state.draftCards.map((card) => ({ card, pool: 'draft' as const })),
      ...state.commanders.map((card) => ({ card, pool: 'commander' as const })),
    ]
      .filter(({ card }) => card.name.toLocaleLowerCase('en-US').includes(query))
      .slice(0, 30)
  }, [search, state])

  async function addCard(event: FormEvent) {
    event.preventDefault()
    setAdding(true)
    setAddStatus('')
    try {
      const resolved = await lookupSandboxCard(addName)
      const official =
        addPool === 'draft'
          ? draftCards.find((card) => card.oracleId === resolved.oracleId)
          : commanderCards.find((card) => card.oracleId === resolved.oracleId)
      const card = official ?? resolved
      setState((current) => applySandboxCard(current, card, addPool))
      setAddName('')
      setAddStatus(`Added ${card.name}. Cube rules are validated below.`)
    } catch (error) {
      setAddStatus(error instanceof Error ? error.message : String(error))
    } finally {
      setAdding(false)
    }
  }

  function resetSandbox() {
    if (!window.confirm('Reset the sandbox to the current official snapshot?')) return
    setState(createSandboxState(releaseInfo.snapshotId, draftCards, commanderCards))
    setSearch('')
    setAddStatus('Sandbox reset to the official cube.')
  }

  return (
    <section className="sandbox-view" aria-label="Cube sandbox">
      <header className="sandbox-heading">
        <div>
          <p>Session-only experiment</p>
          <h2>Sandbox</h2>
        </div>
        <span>Changes survive refreshes, not a closed browser session.</span>
      </header>

      <div className="sandbox-overview">
        <div><span>Changes</span><strong>{changeCount}</strong></div>
        <div><span>Draft</span><strong>{state.draftCards.length}</strong></div>
        <div><span>Commanders</span><strong>{state.commanders.length}</strong></div>
        <div className={validation.valid ? 'sandbox-valid' : 'sandbox-invalid'}>
          <span>Validation</span><strong>{validation.valid ? 'Valid' : `${validation.issues.length} issues`}</strong>
        </div>
      </div>

      <div className="sandbox-actions">
        <button type="button" onClick={() => downloadText('cube-sandbox-diff.txt', sandboxDiffText(diff))}>
          Export diff.txt
        </button>
        <button type="button" onClick={() => downloadText('cube-sandbox-full.txt', sandboxFullListText(state))}>
          Export full list
        </button>
        <button type="button" className="sandbox-reset" onClick={resetSandbox}>Reset to official</button>
      </div>

      {!validation.valid && (
        <section className="sandbox-panel validation-panel">
          <header><h3>Live validation</h3><span>{validation.issues.length} issues</span></header>
          <ul>
            {validation.issues.map((issue, index) => (
              <li key={`${issue.code}-${index}`}>{issue.message}</li>
            ))}
          </ul>
        </section>
      )}

      <section className="sandbox-panel">
        <header>
          <div><h3>Changes from official</h3><p>Only additions and removals are tracked.</p></div>
          <span>{changeCount}</span>
        </header>
        {changeCount === 0 ? (
          <p className="sandbox-empty">No sandbox changes yet.</p>
        ) : (
          <div className="sandbox-change-list">
            <ChangeNames title="Draft added" cards={diff.addedDraft} />
            <ChangeNames title="Draft removed" cards={diff.removedDraft} />
            <ChangeNames title="Commanders added" cards={diff.addedCommanders} />
            <ChangeNames title="Commanders removed" cards={diff.removedCommanders} />
          </div>
        )}
      </section>

      <section className="sandbox-panel">
        <header>
          <div>
            <h3>Add a card</h3>
            <p>Scryfall resolves the card; cube rules validate the resulting pool.</p>
          </div>
        </header>
        <form className="sandbox-add-form" onSubmit={addCard}>
          <label className="sandbox-name-field">
            <span>Card name</span>
            <input value={addName} onChange={(event) => setAddName(event.target.value)} placeholder="e.g. Lightning Bolt" />
          </label>
          <label>
            <span>Pool</span>
            <select value={addPool} onChange={(event) => setAddPool(event.target.value as SandboxPool)}>
              <option value="draft">Draft</option>
              <option value="commander">Commander</option>
            </select>
          </label>
          <button type="submit" disabled={adding}>{adding ? 'Looking up…' : 'Add card'}</button>
        </form>
        {addStatus && <p className="sandbox-status">{addStatus}</p>}
      </section>

      <section className="sandbox-panel">
        <header>
          <div>
            <h3>Manage current cards</h3>
            <p>Search and remove cards; cube rules revalidate immediately.</p>
          </div>
        </header>
        <label className="sandbox-manage-search">
          <span>Search current sandbox</span>
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Start typing a card name…" />
        </label>
        {!search.trim() ? (
          <p className="sandbox-empty">Search for a current draft card or commander to remove it.</p>
        ) : searchResults.length === 0 ? (
          <p className="sandbox-empty">No current sandbox cards match that name.</p>
        ) : (
          <div className="sandbox-card-results">
            {searchResults.map(({ card, pool }) => (
              <div className="sandbox-card-row" key={`${pool}-${card.oracleId}`}>
                <div>
                  <strong>{card.name}</strong>
                  <span>{pool === 'draft' ? allocationLabel(card.draftAllocation) : 'Commander'}</span>
                </div>
                <button type="button" onClick={() => setState((current) => removeSandboxCard(current, pool, card.oracleId))}>
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </section>
  )
}
