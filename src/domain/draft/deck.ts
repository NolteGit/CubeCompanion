import type { ColorIdentity, CubeCard } from '../cube/types'

export const BASIC_LANDS = ['Plains', 'Island', 'Swamp', 'Mountain', 'Forest', 'Wastes'] as const
export type BasicLand = (typeof BASIC_LANDS)[number]
export type BasicLandCounts = Record<BasicLand, number>

export function emptyBasicLands(): BasicLandCounts {
  return { Plains: 0, Island: 0, Swamp: 0, Mountain: 0, Forest: 0, Wastes: 0 }
}

type CommanderIdentity = Pick<CubeCard, 'colorIdentity'>
type CommanderChoice = CubeCard & { oracleText?: string }

/** Cube house rule: a pair needs two monocolor identities, or a compatible Partner ability. */
export function canPairCommanders(first: CommanderChoice, second: CommanderChoice): boolean {
  if (first.colorIdentity.length === 1 && second.colorIdentity.length === 1) return true
  const plainPartner = (card: CommanderChoice) =>
    /(?:^|\n)Partner(?:\s*\([^\n]*\))?(?=\n|$)/i.test(card.oracleText ?? '')
  if (plainPartner(first) && plainPartner(second)) return true

  const partnerWith = (card: CommanderChoice): string | null =>
    card.oracleText?.match(/(?:^|\n)Partner with ([^\n(]+?)(?:\s*\(|\s*$)/i)?.[1]?.trim() ?? null
  return partnerWith(first)?.toLowerCase() === second.name.toLowerCase()
    && partnerWith(second)?.toLowerCase() === first.name.toLowerCase()
}

/** The cube allows either one commander or a pair with a combined color identity. */
export function isCommanderLegal(
  card: CommanderIdentity,
  commanders: CommanderIdentity | readonly CommanderIdentity[],
): boolean {
  const chosen = 'colorIdentity' in commanders ? [commanders] : commanders
  const identity = new Set<ColorIdentity[number]>(chosen.flatMap((entry) => entry.colorIdentity))
  return card.colorIdentity.every((color) => identity.has(color))
}

export interface DeckCheck {
  total: number
  valid: boolean
  issues: string[]
}

/** 60 cards including one or two eligible commanders and any number of external basics. */
export function checkDraftDeck(
  commanders: CommanderChoice | readonly CommanderChoice[] | null,
  draftPool: readonly CubeCard[],
  selectedIds: ReadonlySet<string>,
  basics: BasicLandCounts,
): DeckCheck {
  const chosen = commanders === null ? [] : 'oracleId' in commanders ? [commanders] : commanders
  const selected = draftPool.filter((card) => selectedIds.has(card.oracleId))
  const available = new Set(draftPool.map((card) => card.oracleId))
  const unknown = [...selectedIds].filter((id) => !available.has(id))
  const issues: string[] = []
  if (chosen.length === 0) issues.push('Choose at least one commander for your deck.')
  if (chosen.length > 2) issues.push('A deck can have at most two commanders.')
  if (chosen.length === 2 && !canPairCommanders(chosen[0], chosen[1])) {
    issues.push('Two commanders require both commanders to be monocolored, both to have Partner, or a matching Partner with pair.')
  }
  const commanderIds = new Set(chosen.map((card) => card.oracleId))
  if (commanderIds.size !== chosen.length) issues.push('The same commander cannot be selected twice.')
  if (unknown.length > 0) issues.push('The deck contains cards outside your drafted pool.')
  for (const [land, count] of Object.entries(basics)) {
    if (!Number.isInteger(count) || count < 0) issues.push(`Invalid ${land} count.`)
  }
  const landCount = Object.values(basics).reduce((sum, count) => sum + (Number.isInteger(count) && count > 0 ? count : 0), 0)
  const total = chosen.length + selected.length + landCount
  if (total !== 60) issues.push(`The deck needs exactly 60 cards (currently ${total}).`)
  if (chosen.length > 0) {
    if (selected.some((card) => commanderIds.has(card.oracleId))) {
      issues.push('A commander cannot also occupy a slot in the main deck.')
    }
    const offColor = selected.filter((card) => !isCommanderLegal(card, chosen))
    if (offColor.length > 0) issues.push(`Outside commanders' color identity: ${offColor.map((card) => card.name).join(', ')}.`)
    const landSymbols: Record<BasicLand, ColorIdentity[number] | null> = {
      Plains: 'W', Island: 'U', Swamp: 'B', Mountain: 'R', Forest: 'G', Wastes: null,
    }
    const permitted = new Set(chosen.flatMap((card) => card.colorIdentity))
    for (const land of BASIC_LANDS) {
      const symbol = landSymbols[land]
      if (symbol && basics[land] > 0 && !permitted.has(symbol)) {
        issues.push(`${land} is outside your commanders' color identity.`)
      }
    }
  }
  return { total, valid: issues.length === 0, issues }
}
