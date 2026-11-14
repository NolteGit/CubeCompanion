import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { validateCube } from '../../domain'
import { commanderCards, draftCards, releaseInfo } from '../browser/data'
import { cardTint } from '../browser/cardTint'
import { HoverCard } from '../browser/HoverCard'
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
import './unifiedChanges.css'

type EditorNoticeTone = 'success' | 'warning' | 'error' | 'info'

interface EditorNotice {
  tone: EditorNoticeTone
  message: string
}

interface UndoEntry {
  state: SandboxState
  label: string
}

function validationMessage(valid: boolean, issueCount: number): string {
  if (valid) return 'Cube is valid.'
  return `${issueCount} validation issue${issueCount === 1 ? '' : 's'}.`
}

function poolLabel(pool: SandboxPool): string {
  return pool === 'draft' ? 'Cube' : 'Commanders'
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

interface DiffEntry {
  card: BrowserCard
  pool: SandboxPool
}

function DiffSection({
  title,
  entries,
  tone,
  onRevert,
}: {
  title: string
  entries: readonly DiffEntry[]
  tone: 'added' | 'removed'
  onRevert: (entry: DiffEntry, tone: 'added' | 'removed') => void
}) {
  const groups = [
    { label: 'Cube', entries: entries.filter((entry) => entry.pool === 'draft') },
    { label: 'Commanders', entries: entries.filter((entry) => entry.pool === 'commander') },
  ].filter((group) => group.entries.length > 0)

  return (
    <section className={`diff-section diff-section--${tone}`}>
      <header>
        <span>{title}</span>
        <strong>{entries.length}</strong>
      </header>

      {entries.length === 0 ? (
        <p className="diff-section-empty">
          {tone === 'added' ? 'No cards coming in.' : 'No cards going out.'}
        </p>
      ) : (
        <div className="diff-pool-groups">
          {groups.map((group) => (
            <section className="diff-pool-group" key={group.label}>
              <header>
                <span>{group.label}</span>
                <strong>{group.entries.length}</strong>
              </header>
              <div className="change-card-list">
                {group.entries.map((entry) => (
                  <HoverCard
                    card={entry.card}
                    className={`change-card change-card--${cardTint(entry.card)}`}
                    key={`${entry.pool}-${entry.card.oracleId}`}
                  >
                    <span className="diff-sign" aria-hidden="true">{tone === 'added' ? '+' : '−'}</span>
                    <div className="change-card-copy">
                      <strong>{entry.card.name}</strong>
                      <small>
                        {entry.pool === 'draft'
                          ? `Cube · ${allocationLabel(entry.card.draftAllocation)}`
                          : 'Commanders'}
                      </small>
                    </div>
                    <button
                      type="button"
                      className="change-revert"
                      onClick={() => onRevert(entry, tone)}
                      title={`Revert ${entry.card.name}`}
                    >
                      Revert
                    </button>
                  </HoverCard>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </section>
  )
}

interface SandboxViewProps {
  onChangeCount?: (count: number) => void
}

export function SandboxView({ onChangeCount }: SandboxViewProps = {}) {
  const [state, setState] = useState<SandboxState>(initialState)
  const [addName, setAddName] = useState('')
  const [addPool, setAddPool] = useState<SandboxPool>('draft')
  const [editorNotice, setEditorNotice] = useState<EditorNotice | null>(null)
  const [undoEntry, setUndoEntry] = useState<UndoEntry | null>(null)
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
      setUndoEntry({ state, label: `Add ${card.name}` })
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
    setUndoEntry({ state, label: `Remove ${card.name}` })
    setState(nextState)
    setEditorNotice({
      tone: 'success',
      message: `Removed ${card.name} from ${poolLabel(pool)}. ${validationMessage(
        nextValidation.valid,
        nextValidation.issues.length,
      )}`,
    })
  }

  function undoLastChange() {
    if (!undoEntry) return
    setState(undoEntry.state)
    setUndoEntry(null)
    setSearch('')
    setEditorNotice({
      tone: 'info',
      message: `Undid: ${undoEntry.label}.`,
    })
  }

  function revertChange(entry: DiffEntry, tone: 'added' | 'removed') {
    const nextState = tone === 'added'
      ? removeSandboxCard(state, entry.pool, entry.card.oracleId)
      : applySandboxCard(state, entry.card, entry.pool)

    setUndoEntry({
      state,
      label: `Revert ${tone === 'added' ? 'addition of' : 'removal of'} ${entry.card.name}`,
    })
    setState(nextState)
    setEditorNotice({
      tone: 'info',
      message: `Reverted ${entry.card.name}.`,
    })
  }

  function resetSandbox() {
    if (!window.confirm('Reset all pending changes to the current official snapshot?')) return
    setState(createSandboxState(releaseInfo.snapshotId, draftCards, commanderCards))
    setUndoEntry(null)
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
          <span className="changes-eyebrow">Working list</span>
          <h2>Changes</h2>
          <p>Add, remove, review and validate the current session diff.</p>
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
          <button
            type="button"
            className="sandbox-undo"
            disabled={!undoEntry}
            title={undoEntry ? `Undo ${undoEntry.label}` : 'Nothing to undo'}
            onClick={undoLastChange}
          >
            Undo
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
        <span className="meta-pill added"><b>IN</b> {addedCount}</span>
        <span className="meta-pill removed"><b>OUT</b> {removedCount}</span>
        <span className="meta-divider" aria-hidden="true" />
        <span className="meta-text">Cube {state.draftCards.length}</span>
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
              <p>Add a card or search the current cube to queue a removal.</p>
            </div>
          ) : (
            <div className="diff-board">
              <DiffSection
                title="IN"
                entries={[
                  ...diff.addedDraft.map((card) => ({ card, pool: 'draft' as const })),
                  ...diff.addedCommanders.map((card) => ({ card, pool: 'commander' as const })),
                ]}
                tone="added"
                onRevert={revertChange}
              />
              <DiffSection
                title="OUT"
                entries={[
                  ...diff.removedDraft.map((card) => ({ card, pool: 'draft' as const })),
                  ...diff.removedCommanders.map((card) => ({ card, pool: 'commander' as const })),
                ]}
                tone="removed"
                onRevert={revertChange}
              />
            </div>
          )}
        </section>

        <aside className="edit-cube">
          <header className="workspace-panel-heading edit-heading">
            <div>
              <h3>Quick edit</h3>
              <p>Add and remove without switching modes</p>
            </div>
          </header>

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

          <section className="quick-edit-section">
            <header>
              <span>+</span>
              <div>
                <strong>Add card</strong>
                <small>Resolve a card through Scryfall</small>
              </div>
            </header>

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
                <span>Library</span>
                <select
                  value={addPool}
                  onChange={(event) => {
                    setAddPool(event.target.value as SandboxPool)
                    setEditorNotice(null)
                  }}
                >
                  <option value="draft">Cube</option>
                  <option value="commander">Commanders</option>
                </select>
              </label>
              <button className="primary-action" type="submit" disabled={adding || !addName.trim()}>
                {adding ? 'Looking up…' : 'Add card'}
              </button>
            </form>
          </section>

          <section className="quick-edit-section quick-edit-remove">
            <header>
              <span>−</span>
              <div>
                <strong>Remove card</strong>
                <small>Search the current working cube</small>
              </div>
            </header>

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
              <p className="sandbox-empty">Type a card name to find it.</p>
            ) : searchResults.length === 0 ? (
              <p className="sandbox-empty">No cards match that search.</p>
            ) : (
              <div className="sandbox-card-results">
                {searchResults.map(({ card, pool }) => (
                  <HoverCard
                    card={card}
                    className={`sandbox-card-row sandbox-card-row--${cardTint(card)}`}
                    key={`${pool}-${card.oracleId}`}
                  >
                    <div>
                      <strong>{card.name}</strong>
                      <span>
                        {pool === 'draft'
                          ? `Cube · ${allocationLabel(card.draftAllocation)}`
                          : 'Commanders'}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeCard(card, pool)}
                    >
                      Remove
                    </button>
                  </HoverCard>
                ))}
              </div>
            )}
          </section>

          <footer className="editor-footnote">
            Changes are session-only until exported or applied to the source workbook.
          </footer>
        </aside>
      </div>
    </section>
  )
}
