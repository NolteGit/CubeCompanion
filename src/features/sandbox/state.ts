import type { DraftAllocation } from '../../domain'
import type { BrowserCard } from '../browser/types'
import type { SandboxDiff, SandboxPool, SandboxState, SandboxTarget } from './types'

function cloneCard(card: BrowserCard): BrowserCard {
  return {
    ...card,
    colorIdentity: [...card.colorIdentity],
    draftAllocation: card.draftAllocation ? { ...card.draftAllocation } : undefined,
  }
}

export function createSandboxState(
  baseSnapshotId: string,
  draftCards: readonly BrowserCard[],
  commanders: readonly BrowserCard[],
): SandboxState {
  return {
    baseSnapshotId,
    draftCards: draftCards.map(cloneCard),
    commanders: commanders.map(cloneCard),
  }
}

export function allocationLabel(allocation?: DraftAllocation): string {
  if (!allocation) return 'Unallocated'
  const section = allocation.section[0].toUpperCase() + allocation.section.slice(1)
  return allocation.guild ? `${section} · ${allocation.guild}` : section
}

function allocationKey(card: BrowserCard): string {
  const allocation = card.draftAllocation
  return allocation ? `${allocation.section}:${allocation.guild ?? ''}` : ''
}

function nextSourceIndex(cards: readonly BrowserCard[]): number {
  return cards.reduce((maximum, card) => Math.max(maximum, card.sourceIndex), -1) + 1
}

export function applySandboxCard(
  state: SandboxState,
  card: BrowserCard,
  target: SandboxTarget,
): SandboxState {
  if (target.pool === 'draft') {
    const existingIndex = state.draftCards.findIndex((entry) => entry.oracleId === card.oracleId)
    const nextCard: BrowserCard = {
      ...card,
      draftAllocation: target.draftAllocation,
      sourceIndex:
        existingIndex >= 0
          ? state.draftCards[existingIndex].sourceIndex
          : nextSourceIndex(state.draftCards),
    }
    const draftCards = [...state.draftCards]
    if (existingIndex >= 0) draftCards[existingIndex] = nextCard
    else draftCards.push(nextCard)
    return { ...state, draftCards }
  }

  if (state.commanders.some((entry) => entry.oracleId === card.oracleId)) return state
  return {
    ...state,
    commanders: [
      ...state.commanders,
      { ...card, draftAllocation: undefined, sourceIndex: nextSourceIndex(state.commanders) },
    ],
  }
}

export function removeSandboxCard(
  state: SandboxState,
  pool: SandboxPool,
  oracleId: string,
): SandboxState {
  if (pool === 'draft') {
    return { ...state, draftCards: state.draftCards.filter((card) => card.oracleId !== oracleId) }
  }
  return { ...state, commanders: state.commanders.filter((card) => card.oracleId !== oracleId) }
}

function cardMap(cards: readonly BrowserCard[]): Map<string, BrowserCard> {
  return new Map(cards.map((card) => [card.oracleId, card]))
}

function addedCards(previous: readonly BrowserCard[], current: readonly BrowserCard[]): BrowserCard[] {
  const previousIds = new Set(previous.map((card) => card.oracleId))
  return current.filter((card) => !previousIds.has(card.oracleId))
}

export function sandboxDiff(
  state: SandboxState,
  officialDraft: readonly BrowserCard[],
  officialCommanders: readonly BrowserCard[],
): SandboxDiff {
  const officialDraftMap = cardMap(officialDraft)
  const reallocatedDraft: SandboxDiff['reallocatedDraft'] = []

  for (const card of state.draftCards) {
    const official = officialDraftMap.get(card.oracleId)
    if (official && allocationKey(official) !== allocationKey(card)) {
      reallocatedDraft.push({
        card,
        from: allocationLabel(official.draftAllocation),
        to: allocationLabel(card.draftAllocation),
      })
    }
  }

  return {
    addedDraft: addedCards(officialDraft, state.draftCards),
    removedDraft: addedCards(state.draftCards, officialDraft),
    reallocatedDraft,
    addedCommanders: addedCards(officialCommanders, state.commanders),
    removedCommanders: addedCards(state.commanders, officialCommanders),
  }
}

export function sandboxChangeCount(diff: SandboxDiff): number {
  return (
    diff.addedDraft.length +
    diff.removedDraft.length +
    diff.reallocatedDraft.length +
    diff.addedCommanders.length +
    diff.removedCommanders.length
  )
}
