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

type EditorMode = 'add' | 'remove'
type EditorNoticeTone = 'success' | 'warning' | 'error' | 'info'

interface EditorNotice {
  tone: EditorNoticeTone
  message: string
}

function validationMessage(valid: boolean, issueCount: number): string {
  if (valid) return 'Cube is valid.'
  return `${issueCount} validation issue${issueCount === 1 ? '' : 's'}.`
}

function poolLabel(pool: SandboxPool): string {
  return pool === 'draft' ? 'Draft' : 'Commanders'
}

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

function DiffSection({
  title,
  cards,
  tone,
  pool,
}: {
  title: string
  cards: readonly BrowserCard[]
  tone: 'added' | 'removed'
  pool: string
}) {
  if (cards.length === 0) return null

  return (
    <section className={`diff-section diff-section--${tone}`}>
      <header>
        <span>{title}</span>
        <strong>{cards.length}</strong>
      </header>
      {cards.map((card) => (
        <div className="diff-row" key={card.oracleId}>
          <span className="diff-sign" aria-hidden="true">{tone === 'added' ? '+' : '−'}</span>
          <strong>{card.name}</strong>
          <small>{pool === 'Draft' ? allocationLabel(card.draftAllocation) : pool}</small>
        </div>
      ))}
    </section>
  )
}

interface SandboxViewProps {
  onChangeCount?: (count: number) => void
}

export function SandboxView({ onChangeCount }: SandboxViewProps = {}) {
  const [state, setState] = useState<SandboxState>(initialState)
  const [editorMode, setEditorMode] = useState<EditorMode>('add')
  const [addName, setAddName] = useState('')
  const [addPool, setAddPool] = useState<SandboxPool>('draft')
  const [editorNotice, setEditorNotice] = useState<EditorNotice | null>(null)
  const [adding, setAdding] = useState(false)
  const [search, setSearch] = useState('')

  useEffect(() => {
    saveSandboxState(state, window.sessionStorage)
    const currentDiff = sandboxDiff(state, draftCards, commanderCards)
    onChangeCount?.(sandboxChangeCount(currentDiff))
  }, [onChangeCount, state])

  const validation = useMemo(
    () => validateCube({ draftCards: state.draftCards, commanders: state.commanders }),
    [state],
  )
  const diff = useMemo(
    () => sandboxDiff(state, draftCards, commanderCards),
    [state],
  )
  const changeCount = sandboxChangeCount(diff)
  const addedCount = diff.addedDraft.length + diff.addedCommanders.length
  const removedCount = diff.removedDraft.length + diff.removedCommanders.length
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
    setEditorNotice(null)
    try {
      const resolved = await lookupSandboxCard(addName)
      const official =
        addPool === 'draft'
          ? draftCards.find((card) => card.oracleId === resolved.oracleId)
          : commanderCards.find((card) => card.oracleId === resolved.oracleId)
      const card = official ?? resolved
      const nextState = applySandboxCard(state, card, addPool)

      if (nextState === state) {
        setEditorNotice({
          tone: 'warning',
          message: `${card.name} is already in ${poolLabel(addPool)}. No change made.`,
        })
        return
      }

      const nextValidation = validateCube({
        draftCards: nextState.draftCards,
        commanders: nextState.commanders,
      })
      setState(nextState)
      setAddName('')
      setEditorNotice({
        tone: 'success',
        message: `Added ${card.name} to ${poolLabel(addPool)}. ${validationMessage(
          nextValidation.valid,
          nextValidation.issues.length,
        )}`,
      })
    } catch (error) {
      setEditorNotice({
        tone: 'error',
        message: error instanceof Error ? error.message : String(error),
      })
    } finally {
      setAdding(false)
    }
  }

  function removeCard(card: BrowserCard, pool: SandboxPool) {
    const nextState = removeSandboxCard(state, pool, card.oracleId)
    const nextValidation = validateCube({
      draftCards: nextState.draftCards,
      commanders: nextState.commanders,
    })
    setState(nextState)
    setEditorNotice({
      tone: 'success',
      message: `Removed ${card.name} from ${poolLabel(pool)}. ${validationMessage(
        nextValidation.valid,
        nextValidation.issues.length,
      )}`,
    })
  }

  function changeEditorMode(mode: EditorMode) {
    setEditorMode(mode)
    setEditorNotice(null)
  }

  function resetSandbox() {
    if (!window.confirm('Reset all pending changes to the current official snapshot?')) return
    setState(createSandboxState(releaseInfo.snapshotId, draftCards, commanderCards))
    setSearch('')
    setAddName('')
    setEditorNotice({
      tone: 'info',
      message: 'Pending changes reset to the current snapshot.',
    })
  }

  return (
    <section className="sandbox-view" aria-label="Cube changes">
      <header className="changes-heading">
        <div>
          <span className="changes-eyebrow">Workspace</span>
          <h2>Changes</h2>
          <p>Build and validate a working diff against the current cube.</p>
        </div>

        <div className="changes-header-actions">
          <button
            type="button"
            onClick={() => downloadText('cube-sandbox-diff.txt', sandboxDiffText(diff))}
          >
            Export diff
          </button>
          <button
            type="button"
            onClick={() => downloadText('cube-sandbox-full.txt', sandboxFullListText(state))}
          >
            Export list
          </button>
          <button type="button" className="sandbox-reset" onClick={resetSandbox}>
            Reset
          </button>
        </div>
      </header>

      <div className="changes-meta">
        <span className="meta-pill strong">
          <b>{changeCount}</b> pending
        </span>
        <span className="meta-pill added">+{addedCount} added</span>
        <span className="meta-pill removed">−{removedCount} removed</span>
        <span className="meta-divider" aria-hidden="true" />
        <span className="meta-text">Draft {state.draftCards.length}</span>
        <span className="meta-text">Commanders {state.commanders.length}</span>
        <span className={`validation-pill ${validation.valid ? 'valid' : 'invalid'}`}>
          {validation.valid ? '✓ Valid' : `! ${validation.issues.length} issues`}
        </span>
        <span className="session-note">Session only</span>
      </div>

      <div className="changes-layout">
        <section className="working-diff">
          <header className="workspace-panel-heading">
            <div>
              <h3>Working diff</h3>
              <p>Compared with the current official snapshot</p>
            </div>
          </header>

          {!validation.valid && (
            <div className="inline-validation">
              <header>
                <strong>Validation</strong>
                <span>{validation.issues.length} issue{validation.issues.length === 1 ? '' : 's'}</span>
              </header>
              <div>
                {validation.issues.map((issue, index) => (
                  <p key={`${issue.code}-${index}`}>{issue.message}</p>
                ))}
              </div>
            </div>
          )}

          {changeCount === 0 ? (
            <div className="diff-empty">
              <span>±</span>
              <strong>No pending changes</strong>
              <p>Use the editor to add or remove cards.</p>
            </div>
          ) : (
            <div className="diff-list">
              <DiffSection title="Draft · Added" cards={diff.addedDraft} tone="added" pool="Draft" />
              <DiffSection title="Draft · Removed" cards={diff.removedDraft} tone="removed" pool="Draft" />
              <DiffSection title="Commanders · Added" cards={diff.addedCommanders} tone="added" pool="Commander" />
              <DiffSection title="Commanders · Removed" cards={diff.removedCommanders} tone="removed" pool="Commander" />
            </div>
          )}
        </section>

        <aside className="edit-cube">
          <header className="workspace-panel-heading edit-heading">
            <div>
              <h3>Edit cube</h3>
              <p>Changes validate immediately</p>
            </div>
          </header>

          <div className="editor-tabs" role="group" aria-label="Edit cube mode">
            <button
              type="button"
              className={editorMode === 'add' ? 'active' : ''}
              onClick={() => changeEditorMode('add')}
            >
              Add
            </button>
            <button
              type="button"
              className={editorMode === 'remove' ? 'active' : ''}
              onClick={() => changeEditorMode('remove')}
            >
              Remove
            </button>
          </div>

          {editorNotice && (
            <div
              className={`editor-notice editor-notice--${editorNotice.tone}`}
              role={editorNotice.tone === 'error' ? 'alert' : 'status'}
            >
              <span aria-hidden="true">
                {editorNotice.tone === 'success'
                  ? '✓'
                  : editorNotice.tone === 'warning'
                    ? '!'
                    : editorNotice.tone === 'error'
                      ? '×'
                      : 'i'}
              </span>
              <p>{editorNotice.message}</p>
            </div>
          )}

          {editorMode === 'add' ? (
            <div className="editor-content">
              <form className="sandbox-add-form" onSubmit={addCard}>
                <label className="sandbox-name-field">
                  <span>Card name</span>
                  <input
                    value={addName}
                    onChange={(event) => {
                      setAddName(event.target.value)
                      setEditorNotice(null)
                    }}
                    placeholder="Search Scryfall by name…"
                  />
                </label>
                <label>
                  <span>Pool</span>
                  <select
                    value={addPool}
                    onChange={(event) => {
                      setAddPool(event.target.value as SandboxPool)
                      setEditorNotice(null)
                    }}
                  >
                    <option value="draft">Draft</option>
                    <option value="commander">Commander</option>
                  </select>
                </label>
                <button className="primary-action" type="submit" disabled={adding || !addName.trim()}>
                  {adding ? 'Looking up…' : 'Add card'}
                </button>
              </form>
            </div>
          ) : (
            <div className="editor-content">
              <label className="sandbox-manage-search">
                <span>Current cards</span>
                <input
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value)
                    setEditorNotice(null)
                  }}
                  placeholder="Search by card name…"
                />
              </label>

              {!search.trim() ? (
                <p className="sandbox-empty">Search the working cube to remove a card.</p>
              ) : searchResults.length === 0 ? (
                <p className="sandbox-empty">No cards match that search.</p>
              ) : (
                <div className="sandbox-card-results">
                  {searchResults.map(({ card, pool }) => (
                    <div className="sandbox-card-row" key={`${pool}-${card.oracleId}`}>
                      <div>
                        <strong>{card.name}</strong>
                        <span>{pool === 'draft' ? allocationLabel(card.draftAllocation) : 'Commander'}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeCard(card, pool)}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <footer className="editor-footnote">
            Scryfall resolves additions. Existing cards in the selected pool are left unchanged.
          </footer>
        </aside>
      </div>
    </section>
  )
}
