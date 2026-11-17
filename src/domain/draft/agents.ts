import { COLOR_SYMBOLS, type CubeCard, type ColorSymbol } from '../cube/types'
import { checkDraftDeck, emptyBasicLands, isCommanderLegal, type BasicLand, type BasicLandCounts } from './deck'

/**
 * Foundation for opponent strategies. Keep decisions here rather than in React
 * or the passing engine so later drafting heuristics can be tuned independently.
 */
export const AGENT_RULES = {
  deckSize: 60,
  targetLands: 24,
  maxLands: 25,
} as const

export interface DraftAgent<T extends CubeCard> {
  seat: number // Seat 0 belongs to the human player.
  commanders: T[]
}

export interface AgentDeck<T extends CubeCard> {
  commanders: T[]
  mainDeck: T[]
  sidePool: T[]
  basics: BasicLandCounts
  landCount: number
  total: number
  valid: boolean
  issues: string[]
}

function nextRandom(state: number): [number, number] {
  const next = (Math.imul(state, 1664525) + 1013904223) >>> 0
  return [next / 0x100000000, next]
}

/**
 * Give each opponent a distinct random commander configuration: either one
 * multicolor commander or two distinct monocolor commanders. Avoid the human's
 * commander offer and don't assign the same commander to two bots.
 */
export function createDraftAgents<T extends CubeCard>(
  commanders: readonly T[],
  botCount: number,
  seed: number,
  excludedIds: ReadonlySet<string> = new Set(),
): DraftAgent<T>[] {
  let state = seed >>> 0
  let mono = commanders.filter((card) => card.colorIdentity.length === 1 && !excludedIds.has(card.oracleId))
  let multi = commanders.filter((card) => card.colorIdentity.length >= 2 && !excludedIds.has(card.oracleId))

  function roll(): number {
    const [value, next] = nextRandom(state)
    state = next
    return value
  }
  function take(pool: T[]): T {
    return pool.splice(Math.floor(roll() * pool.length), 1)[0]
  }

  const result: DraftAgent<T>[] = []
  for (let seat = 1; seat <= botCount; seat += 1) {
    const canPair = mono.length >= 2
    const canMulti = multi.length > 0
    if (!canPair && !canMulti) throw new Error('Not enough commanders for the opponent seats.')
    const usePair = canPair && (!canMulti || roll() < 0.5)
    if (!usePair) {
      result.push({ seat, commanders: [take(multi)] })
      continue
    }

    const first = take(mono)
    // Prefer different colors when the remaining pool permits it.
    const differentColors = mono.filter((card) => card.colorIdentity[0] !== first.colorIdentity[0])
    const second = differentColors.length > 0 ? take(differentColors) : take(mono)
    mono = mono.filter((card) => card.oracleId !== second.oracleId)
    result.push({ seat, commanders: [first, second] })
  }
  return result
}

/**
 * Initial conservative pick policy: draft legal nonland cards first, then
 * on-color lands while under the hard cap. Off-color picks are a fallback only.
 * A single supplied roll resolves ties, preserving seeded draft replay.
 */
export function chooseAgentPick<T extends CubeCard>(
  pack: readonly T[],
  drafted: readonly T[],
  commanders: readonly T[],
  roll: number,
): number {
  if (pack.length === 0) throw new Error('An opponent cannot pick from an empty pack.')
  const lands = drafted.filter((card) => card.isLand && isCommanderLegal(card, commanders)).length
  const scores = pack.map((card) => {
    const legal = isCommanderLegal(card, commanders)
    if (!legal) return card.isLand ? -10 : 0
    if (!card.isLand) return 100
    return lands < AGENT_RULES.maxLands ? 50 : -5
  })
  const best = Math.max(...scores)
  const tied = scores.flatMap((score, index) => score === best ? [index] : [])
  return tied[Math.min(tied.length - 1, Math.floor(Math.max(0, roll) * tied.length))]
}

const LAND_FOR_COLOR: Record<ColorSymbol, BasicLand> = {
  W: 'Plains', U: 'Island', B: 'Swamp', R: 'Mountain', G: 'Forest',
}

/**
 * Build a legal-color main deck, with no more than 25 lands including external
 * basics. A draft may not yield enough eligible spells for 60 cards, especially
 * with 45 picks. In that case we return an explicitly incomplete deck rather
 * than using off-color cards or exceeding the land cap.
 */
export function buildAgentDeck<T extends CubeCard>(
  commanders: readonly T[],
  picks: readonly T[],
): AgentDeck<T> {
  const eligible = picks.filter((card) => isCommanderLegal(card, commanders))
  const spells = eligible.filter((card) => !card.isLand)
  const draftedLands = eligible.filter((card) => card.isLand)
  const librarySize = AGENT_RULES.deckSize - commanders.length
  const spellSlots = Math.max(0, librarySize - AGENT_RULES.targetLands)
  const mainSpells = spells.slice(0, spellSlots)
  const landSlots = Math.max(0, Math.min(AGENT_RULES.maxLands, librarySize - mainSpells.length))
  const mainLands = draftedLands.slice(0, landSlots)
  const basics = emptyBasicLands()

  const identity = [...new Set(commanders.flatMap((card) => card.colorIdentity))]
  const colors = COLOR_SYMBOLS.filter((color) => identity.includes(color))
  const basicOptions: BasicLand[] = colors.length > 0 ? colors.map((color) => LAND_FOR_COLOR[color]) : ['Wastes']
  for (let index = 0; index < landSlots - mainLands.length; index += 1) {
    basics[basicOptions[index % basicOptions.length]] += 1
  }

  const mainDeck = [...mainSpells, ...mainLands]
  const mainIds = new Set(mainDeck.map((card) => card.oracleId))
  const sidePool = picks.filter((card) => !mainIds.has(card.oracleId))
  const checked = checkDraftDeck(commanders, picks, mainIds, basics)
  const landCount = landSlots
  const issues = [...checked.issues]
  if (checked.total < AGENT_RULES.deckSize && spells.length < spellSlots) {
    issues.push('Not enough drafted nonland cards in the commanders\' colors to complete a 60-card deck with at most 25 lands.')
  }
  return {
    commanders: [...commanders],
    mainDeck,
    sidePool,
    basics,
    landCount,
    total: checked.total,
    valid: issues.length === 0,
    issues,
  }
}
