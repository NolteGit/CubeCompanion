import type { ColorIdentity, CubeCard } from '../cube/types'

export const BASIC_LANDS = ['Plains', 'Island', 'Swamp', 'Mountain', 'Forest', 'Wastes'] as const
export type BasicLand = (typeof BASIC_LANDS)[number]
export type BasicLandCounts = Record<BasicLand, number>

export function emptyBasicLands(): BasicLandCounts {
  return { Plains: 0, Island: 0, Swamp: 0, Mountain: 0, Forest: 0, Wastes: 0 }
}

export function isCommanderLegal(card: Pick<CubeCard, 'colorIdentity'>, commander: Pick<CubeCard, 'colorIdentity'>): boolean {
  const identity = new Set<ColorIdentity[number]>(commander.colorIdentity)
  return card.colorIdentity.every((color) => identity.has(color))
}

export interface DeckCheck {
  total: number
  valid: boolean
  issues: string[]
}

/** 60 cards including exactly one commander and any number of external basics. */
export function checkDraftDeck(
  commander: CubeCard | null,
  draftPool: readonly CubeCard[],
  selectedIds: ReadonlySet<string>,
  basics: BasicLandCounts,
): DeckCheck {
  const selected = draftPool.filter((card) => selectedIds.has(card.oracleId))
  const unknown = [...selectedIds].filter((id) => !draftPool.some((card) => card.oracleId === id))
  const issues: string[] = []
  if (!commander) issues.push('Choose a commander.')
  if (unknown.length > 0) issues.push('The deck contains cards outside your drafted pool.')
  for (const [land, count] of Object.entries(basics)) {
    if (!Number.isInteger(count) || count < 0) issues.push(`Invalid ${land} count.`)
  }
  const landCount = Object.values(basics).reduce((sum, count) => sum + (Number.isInteger(count) && count > 0 ? count : 0), 0)
  const total = (commander ? 1 : 0) + selected.length + landCount
  if (total !== 60) issues.push(`The deck needs exactly 60 cards (currently ${total}).`)
  if (commander) {
    if (selected.some((card) => card.oracleId === commander.oracleId)) {
      issues.push('The commander cannot also occupy a slot in the main deck.')
    }
    const offColor = selected.filter((card) => !isCommanderLegal(card, commander))
    if (offColor.length > 0) issues.push(`Outside commander's color identity: ${offColor.map((card) => card.name).join(', ')}.`)
    const landSymbols: Record<BasicLand, ColorIdentity[number] | null> = {
      Plains: 'W', Island: 'U', Swamp: 'B', Mountain: 'R', Forest: 'G', Wastes: null,
    }
    for (const land of BASIC_LANDS) {
      const symbol = landSymbols[land]
      if (symbol && basics[land] > 0 && !commander.colorIdentity.includes(symbol)) {
        issues.push(`${land} is outside your commander's color identity.`)
      }
    }
  }
  return { total, valid: issues.length === 0, issues }
}
