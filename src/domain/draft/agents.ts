import { COLOR_SYMBOLS, type CubeCard, type ColorSymbol } from '../cube/types'
import { checkDraftDeck, emptyBasicLands, isCommanderLegal, type BasicLand, type BasicLandCounts } from './deck'

/** All metadata is already supplied by the published Scryfall snapshot. */
export interface AgentPickCard extends CubeCard {
  manaValue?: number
  manaCost?: string
  typeLine?: string
  oracleText?: string
}

/**
 * Foundation for opponent strategies. Keep decisions here rather than in React
 * or the passing engine so later drafting heuristics can be tuned independently.
 */
export const AGENT_RULES = {
  deckSize: 60,
  targetLands: 24,
  maxLands: 25,
  threeColorFixingTarget: 6, // soft goal: 5–7 useful fixing lands, if drafted
  twoColorFixingTarget: 3,
  creatureShareLow: 0.5,
  creatureShareHigh: 0.7,
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

const BASIC_TYPE_COLORS: Record<string, ColorSymbol> = {
  Plains: 'W', Island: 'U', Swamp: 'B', Mountain: 'R', Forest: 'G',
}

/**
 * Colors a drafted land can actually provide or search for.
 * Land color identity alone is insufficient: fetchlands often have no colored
 * identity, while their rules text can find two or more basic-land types.
 * This deliberately checks only land text/types, never card-specific tags.
 */
export function fixingLandColors(
  card: AgentPickCard,
  commanders: readonly CubeCard[],
): ColorSymbol[] {
  if (!card.isLand) return []
  const allowed = new Set(commanders.flatMap((commander) => commander.colorIdentity))
  const colors = new Set<ColorSymbol>()
  const typeLine = card.typeLine ?? ''
  const oracleText = card.oracleText ?? ''

  for (const match of typeLine.matchAll(/\b(Plains|Island|Swamp|Mountain|Forest)\b/g)) {
    colors.add(BASIC_TYPE_COLORS[match[1]])
  }

  // A land that taps for any color, or searches for any basic land type,
  // provides fixing for every color its commander can play.
  if (
    /\badd (?:\w+ )*?mana of any (?:one )?color\b/i.test(oracleText)
    || /\bbasic landcycling\b/i.test(oracleText)
  ) {
    for (const color of allowed) colors.add(color)
  }

  // Inspect the *Add* clause only, not incidental costs or colored symbols
  // elsewhere in a land's Oracle text.
  for (const match of oracleText.matchAll(/\bAdd [^.\n]*/gi)) {
    for (const pip of match[0].matchAll(/\{([WUBRG])\}/g)) {
      colors.add(pip[1] as ColorSymbol)
    }
  }

  // Fetchlands may search for "a Plains or Island card" without ever
  // mentioning a colored mana symbol.
  for (const match of oracleText.matchAll(/\bsearch your library for [^.\n]*/gi)) {
    if (/\bbasic land cards?\b/i.test(match[0])) {
      for (const color of allowed) colors.add(color)
    }
    for (const type of match[0].matchAll(/\b(Plains|Island|Swamp|Mountain|Forest)\b/g)) {
      colors.add(BASIC_TYPE_COLORS[type[1]])
    }
  }

  return COLOR_SYMBOLS.filter((color) => allowed.has(color) && colors.has(color))
}

function coloredManaPenalty(card: AgentPickCard, colorCount: number): number {
  const cost = (card.manaCost ?? '').split('//', 1)[0]
  let colored = 0
  const counts = new Map<string, number>()
  for (const match of cost.matchAll(/\{([^}]+)\}/g)) {
    const symbol = match[1].toUpperCase()
    if (/^[WUBRG]$/.test(symbol)) {
      colored += 1
      counts.set(symbol, (counts.get(symbol) ?? 0) + 1)
    } else if (/^(?:[WUBRG]\/[WUBRG]|2\/[WUBRG]|[WUBRG]\/P)$/.test(symbol)) {
      // Hybrid/Phyrexian mana is more flexible than a fixed colored pip.
      colored += 0.5
    }
  }
  const repeat = [...counts.values()].reduce((sum, count) => sum + Math.max(0, count - 1), 0)
  const penaltyPerExtraPip = colorCount >= 3 ? 7 : colorCount === 2 ? 4 : 2
  return Math.max(0, colored - 1) * penaltyPerExtraPip
    + repeat * (colorCount >= 3 ? 4 : 2)
}

function isCreature(card: AgentPickCard): boolean {
  return (card.typeLine ?? '').split(/[—–]/, 1)[0].split(/\s+/).includes('Creature')
}

/**
 * A low-cost commander favors a mana curve centered near 2.3, while expensive
 * commanders allow a wider/higher curve near 3.7. This is only a pick nudge.
 */
export function agentCurveCenter(commanders: readonly AgentPickCard[]): number {
  const costs = commanders.map((card) => card.manaValue).filter(
    (value): value is number => value !== undefined && Number.isFinite(value),
  )
  if (costs.length === 0) return 2.8
  const average = costs.reduce((sum, cost) => sum + cost, 0) / costs.length
  return Math.max(2.3, Math.min(3.7, 2.3 + (average - 3) * (1.4 / 3)))
}

/**
 * Soft rules only: stay inside commander identity, value 3-color mana fixing,
 * reward cards near the commander-shaped curve and slightly prefer easier
 * colored costs. A 50–70% creature share is a nudge, never a deck quota.
 * Equal scores use the seeded random roll supplied by the draft engine.
 */
export function chooseAgentPick<T extends AgentPickCard>(
  pack: readonly T[],
  drafted: readonly T[],
  commanders: readonly T[],
  roll: number,
): number {
  if (pack.length === 0) throw new Error('An opponent cannot pick from an empty pack.')

  const commanderColors = new Set(commanders.flatMap((card) => card.colorIdentity))
  const legal = drafted.filter((card) => isCommanderLegal(card, commanders))
  const draftedLands = legal.filter((card) => card.isLand)
  const draftedSpells = legal.filter((card) => !card.isLand)
  const fixingCount = draftedLands.filter(
    (card) => fixingLandColors(card, commanders).length >= 2,
  ).length
  const creatures = draftedSpells.filter(isCreature).length
  const creatureRatio = draftedSpells.length === 0 ? 0.6 : creatures / draftedSpells.length
  const center = agentCurveCenter(commanders)
  const scores = pack.map((card) => {
    if (!isCommanderLegal(card, commanders)) return card.isLand ? -10 : 0

    if (card.isLand) {
      if (draftedLands.length >= AGENT_RULES.maxLands) return -5
      const fixingColors = fixingLandColors(card, commanders).length
      if (fixingColors >= 2 && commanderColors.size >= 3) {
        if (fixingCount < AGENT_RULES.threeColorFixingTarget) {
          return 134 - fixingCount * 2 + (fixingColors >= 3 ? 3 : 0)
        }
        return fixingCount < 7 ? 85 : 55
      }
      if (fixingColors >= 2 && commanderColors.size === 2) {
        return fixingCount < AGENT_RULES.twoColorFixingTarget
          ? 116 - fixingCount * 4
          : 60
      }
      // Basics can be added freely later. Ordinary lands do not need to
      // displace castable spells in the draft.
      return 45
    }

    const cost = card.manaValue
    const manaValue = cost !== undefined && Number.isFinite(cost) ? cost : center
    const distance = (manaValue - center) / 1.45
    const curveBonus = 16 * Math.exp(-0.5 * distance * distance)
    const sameCost = draftedSpells.filter((pick) => pick.manaValue === cost).length
    const saturationPenalty = cost === undefined ? 0 : Math.min(9, sameCost * 1.2)
    const creatureBonus = isCreature(card)
      ? creatureRatio < AGENT_RULES.creatureShareLow ? 5 : 0
      : creatureRatio > AGENT_RULES.creatureShareHigh ? 5 : 0

    return 100 + curveBonus + creatureBonus - saturationPenalty
      - coloredManaPenalty(card, commanderColors.size)
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
export function buildAgentDeck<T extends AgentPickCard>(
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
  // Keep the best fixing available in the deck even if additional lands
  // were taken as fallback picks after the ideal land count was reached.
  const prioritizedLands = [...draftedLands].sort(
    (a, b) => fixingLandColors(b, commanders).length - fixingLandColors(a, commanders).length,
  )
  const mainLands = prioritizedLands.slice(0, landSlots)
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
