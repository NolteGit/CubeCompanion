import type { BrowserCard } from '../browser/types'
import { allocationLabel } from './state'
import type { SandboxDiff, SandboxState } from './types'

function names(cards: readonly BrowserCard[]): string[] {
  return [...cards].map((card) => card.name).sort((left, right) => left.localeCompare(right))
}

function section(title: string, lines: readonly string[]): string[] {
  return [title, ...(lines.length > 0 ? lines : ['(none)']), '']
}

export function sandboxDiffText(diff: SandboxDiff): string {
  const lines = ['Cube Companion sandbox diff', '']

  lines.push(...section('DRAFT ADDED', names(diff.addedDraft)))
  lines.push(...section('DRAFT REMOVED', names(diff.removedDraft)))
  lines.push(...section('COMMANDERS ADDED', names(diff.addedCommanders)))
  lines.push(...section('COMMANDERS REMOVED', names(diff.removedCommanders)))

  return `${lines.join('\n').trimEnd()}\n`
}

function draftLine(card: BrowserCard): string {
  return `${allocationLabel(card.draftAllocation)} | ${card.name}`
}

export function sandboxFullListText(state: SandboxState): string {
  const draft = [...state.draftCards]
    .sort((left, right) => {
      const allocation = allocationLabel(left.draftAllocation).localeCompare(
        allocationLabel(right.draftAllocation),
      )
      return allocation || left.name.localeCompare(right.name)
    })
    .map(draftLine)
  const commanders = names(state.commanders)

  return [
    'Cube Companion sandbox full list',
    `Base snapshot: ${state.baseSnapshotId}`,
    '',
    `DRAFT (${state.draftCards.length})`,
    ...draft,
    '',
    `COMMANDERS (${state.commanders.length})`,
    ...commanders,
    '',
  ].join('\n')
}
