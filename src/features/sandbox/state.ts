import {
  colorIdentityKey,
  colorIdentitySize,
  type ColorSymbol,
  type DraftAllocation,
  type DraftSection,
  type GuildKey,
} from '../../domain'
import type { BrowserCard } from '../browser/types'
import type { SandboxDiff, SandboxPool, SandboxState } from './types'

const SECTION_BY_COLOR: Record<ColorSymbol, DraftSection> = {
  W: 'white',
  U: 'blue',
  B: 'black',
  R: 'red',
  G: 'green',
}

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

export function inferSandboxDraftAllocation(card: BrowserCard): DraftAllocation {
  const size = colorIdentitySize(card.colorIdentity)

  if (card.isLand) {
    if (size === 2) {
      return {
        section: 'land',
        guild: colorIdentityKey(card.colorIdentity) as GuildKey,
      }
    }
    return { section: 'land' }
  }

  if (size === 0) return { section: 'colorless' }
  if (size === 1) return { section: SECTION_BY_COLOR[card.colorIdentity[0]] }
  if (size === 2) {
    return {
      section: 'multicolor',
      guild: colorIdentityKey(card.colorIdentity) as GuildKey,
    }
  }

  return { section: 'multicolor' }
}

function nextSourceIndex(cards: readonly BrowserCard[]): number {
  return cards.reduce((maximum, card) => Math.max(maximum, card.sourceIndex), -1) + 1
}

export function applySandboxCard(
  state: SandboxState,
  card: BrowserCard,
  pool: SandboxPool,
): SandboxState {
  if (pool === 'draft') {
    if (state.draftCards.some((entry) => entry.oracleId === card.oracleId)) return state
    return {
      ...state,
      draftCards: [
        ...state.draftCards,
        {
          ...card,
          draftAllocation: card.draftAllocation ?? inferSandboxDraftAllocation(card),
          sourceIndex: nextSourceIndex(state.draftCards),
        },
      ],
    }
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

function addedCards(previous: readonly BrowserCard[], current: readonly BrowserCard[]): BrowserCard[] {
  const previousIds = new Set(previous.map((card) => card.oracleId))
  return current.filter((card) => !previousIds.has(card.oracleId))
}

export function sandboxDiff(
  state: SandboxState,
  officialDraft: readonly BrowserCard[],
  officialCommanders: readonly BrowserCard[],
): SandboxDiff {
  return {
    addedDraft: addedCards(officialDraft, state.draftCards),
    removedDraft: addedCards(state.draftCards, officialDraft),
    addedCommanders: addedCards(officialCommanders, state.commanders),
    removedCommanders: addedCards(state.commanders, officialCommanders),
  }
}

export function sandboxChangeCount(diff: SandboxDiff): number {
  return (
    diff.addedDraft.length +
    diff.removedDraft.length +
    diff.addedCommanders.length +
    diff.removedCommanders.length
  )
}
