import {
  COLOR_SYMBOLS,
  GUILD_KEYS,
  type ColorSymbol,
  type CubeCard,
  type CubeDefinition,
  type DraftAllocation,
  type DraftSection,
  type GuildKey,
} from '../cube/types'
import {
  colorIdentityCombinations,
  colorIdentityKey,
  colorIdentitySize,
} from '../cube/colorIdentity'
import { DEFAULT_CUBE_RULES, type CubeRules, type TargetRange } from '../cube/rules'
import type {
  DraftValidationSummary,
  ValidationIssue,
  ValidationResult,
} from './types'

const SECTION_BY_COLOR: Record<ColorSymbol, DraftSection> = {
  W: 'white',
  U: 'blue',
  B: 'black',
  R: 'red',
  G: 'green',
}

const SECTION_LABELS: Record<DraftSection, string> = {
  white: 'White',
  blue: 'Blue',
  black: 'Black',
  red: 'Red',
  green: 'Green',
  colorless: 'Colorless',
  multicolor: 'Multicolor',
  land: 'Land',
}

function emptyGuildCounts(): Record<GuildKey, number> {
  return Object.fromEntries(GUILD_KEYS.map((guild) => [guild, 0])) as Record<GuildKey, number>
}

function countByIdentity(cards: readonly CubeCard[], size: number): Record<string, number> {
  const counts: Record<string, number> = {}

  for (const identity of colorIdentityCombinations(size)) {
    counts[colorIdentityKey(identity)] = 0
  }

  for (const card of cards) {
    if (colorIdentitySize(card.colorIdentity) === size) {
      const key = colorIdentityKey(card.colorIdentity)
      counts[key] = (counts[key] ?? 0) + 1
    }
  }

  return counts
}

function inferredDraftAllocation(card: CubeCard): DraftAllocation {
  if (card.draftAllocation) return card.draftAllocation
  if (card.isLand) return { section: 'land' }

  const size = colorIdentitySize(card.colorIdentity)
  if (size === 0) return { section: 'colorless' }
  if (size === 1) return { section: SECTION_BY_COLOR[card.colorIdentity[0]] }
  if (size === 2) return { section: 'multicolor', guild: colorIdentityKey(card.colorIdentity) as GuildKey }
  return { section: 'multicolor' }
}

function buildDraftSummary(cards: readonly CubeCard[]): DraftValidationSummary {
  const mono = Object.fromEntries(COLOR_SYMBOLS.map((color) => [color, 0])) as Record<ColorSymbol, number>
  const dual = emptyGuildCounts()
  const guildLands = emptyGuildCounts()
  let multicolor = 0
  let colorless = 0
  let lands = 0
  let generalLands = 0

  for (const card of cards) {
    const allocation = inferredDraftAllocation(card)
    const monoColor = COLOR_SYMBOLS.find((color) => SECTION_BY_COLOR[color] === allocation.section)

    if (monoColor) {
      mono[monoColor] += 1
    } else if (allocation.section === 'multicolor') {
      multicolor += 1
      if (allocation.guild) dual[allocation.guild] += 1
    } else if (allocation.section === 'colorless') {
      colorless += 1
    } else if (allocation.section === 'land') {
      lands += 1
      if (allocation.guild) guildLands[allocation.guild] += 1
      else generalLands += 1
    }
  }

  return {
    total: cards.length,
    mono,
    multicolor,
    dual,
    colorless,
    lands,
    guildLands,
    generalLands,
  }
}

function rangeLabel(range: TargetRange): string {
  return `${range.target - range.tolerance}-${range.target + range.tolerance}`
}

function addRangeIssue(
  issues: ValidationIssue[],
  code: ValidationIssue['code'],
  label: string,
  actual: number,
  range: TargetRange,
): void {
  const minimum = range.target - range.tolerance
  const maximum = range.target + range.tolerance

  if (actual < minimum || actual > maximum) {
    issues.push({
      code,
      message: `${label} must be within ${minimum}-${maximum}; found ${actual}.`,
      expected: rangeLabel(range),
      actual,
    })
  }
}

function duplicateGroups(cards: readonly CubeCard[]): string[][] {
  const groups = new Map<string, string[]>()

  for (const card of cards) {
    const names = groups.get(card.oracleId) ?? []
    names.push(card.name)
    groups.set(card.oracleId, names)
  }

  return [...groups.values()].filter((group) => group.length > 1)
}

function validateDuplicates(
  cards: readonly CubeCard[],
  code: 'draft.duplicate' | 'commander.duplicate',
  label: string,
  issues: ValidationIssue[],
): void {
  for (const group of duplicateGroups(cards)) {
    issues.push({
      code,
      message: `${label} must be singleton; duplicate logical card found: ${group.join(', ')}.`,
      cards: group,
    })
  }
}

function validateDraftCounts(
  summary: DraftValidationSummary,
  rules: CubeRules,
  issues: ValidationIssue[],
): void {
  for (const color of COLOR_SYMBOLS) {
    const actual = summary.mono[color] ?? 0
    if (actual !== rules.draft.monoColorCount) {
      const section = SECTION_BY_COLOR[color]
      issues.push({
        code: 'draft.mono-count',
        message: `${SECTION_LABELS[section]} section must contain exactly ${rules.draft.monoColorCount} cards; found ${actual}.`,
        expected: rules.draft.monoColorCount,
        actual,
      })
    }
  }

  const expectedMulticolor = rules.draft.dualColorCount * GUILD_KEYS.length
  if (summary.multicolor !== expectedMulticolor) {
    issues.push({
      code: 'draft.multicolor-count',
      message: `Multicolor section must contain exactly ${expectedMulticolor} cards; found ${summary.multicolor}.`,
      expected: expectedMulticolor,
      actual: summary.multicolor,
    })
  }

  for (const guild of GUILD_KEYS) {
    const actual = summary.dual[guild] ?? 0
    if (actual !== rules.draft.dualColorCount) {
      issues.push({
        code: 'draft.dual-count',
        message: `${guild} multicolor allocation must contain exactly ${rules.draft.dualColorCount} cards; found ${actual}.`,
        expected: rules.draft.dualColorCount,
        actual,
      })
    }

    const landActual = summary.guildLands[guild] ?? 0
    if (landActual !== rules.draft.guildLandCount) {
      issues.push({
        code: 'draft.guild-land-count',
        message: `${guild} land allocation must contain exactly ${rules.draft.guildLandCount} cards; found ${landActual}.`,
        expected: rules.draft.guildLandCount,
        actual: landActual,
      })
    }
  }
}

function validateDraftColorIdentity(
  cards: readonly CubeCard[],
  issues: ValidationIssue[],
): void {
  const illegalCards = cards
    .filter((card) => colorIdentitySize(card.colorIdentity) >= 3)
    .map((card) => card.name)

  if (illegalCards.length > 0) {
    issues.push({
      code: 'draft.disallowed-color-identity',
      message: 'Draft cards may not have three-, four-, or five-color identity.',
      cards: illegalCards,
      actual: illegalCards.length,
      expected: 0,
    })
  }
}

function validateCommanderOverlap(
  cube: CubeDefinition,
  issues: ValidationIssue[],
): void {
  const draftIds = new Set(cube.draftCards.map((card) => card.oracleId))
  const overlapping = cube.commanders
    .filter((card) => draftIds.has(card.oracleId))
    .map((card) => card.name)

  if (overlapping.length > 0) {
    issues.push({
      code: 'commander.overlap',
      message: 'Cards may not appear in both the draft pool and commander pool.',
      cards: overlapping,
      actual: overlapping.length,
      expected: 0,
    })
  }
}

function validateCommanderSymmetry(
  commanders: readonly CubeCard[],
  rules: CubeRules,
  issues: ValidationIssue[],
): void {
  for (const size of rules.commanders.symmetricIdentitySizes) {
    const counts = countByIdentity(commanders, size)
    const values = Object.values(counts)
    const expected = values[0] ?? 0

    if (values.some((count) => count !== expected)) {
      issues.push({
        code: 'commander.symmetry',
        message: `${size}-color commander identities must have equal counts.`,
        expected: 'equal counts',
        actual: Object.entries(counts)
          .map(([identity, count]) => `${identity}:${count}`)
          .join(', '),
        counts,
      })
    }
  }
}

export function validateCube(
  cube: CubeDefinition,
  rules: CubeRules = DEFAULT_CUBE_RULES,
): ValidationResult {
  const issues: ValidationIssue[] = []
  const draftSummary = buildDraftSummary(cube.draftCards)

  validateDuplicates(cube.draftCards, 'draft.duplicate', 'Draft pool', issues)
  validateDuplicates(cube.commanders, 'commander.duplicate', 'Commander pool', issues)
  validateCommanderOverlap(cube, issues)
  validateDraftCounts(draftSummary, rules, issues)
  validateDraftColorIdentity(cube.draftCards, issues)
  addRangeIssue(
    issues,
    'draft.colorless-range',
    'Colorless section count',
    draftSummary.colorless,
    rules.draft.colorless,
  )
  addRangeIssue(
    issues,
    'draft.land-range',
    'Land section count',
    draftSummary.lands,
    rules.draft.lands,
  )
  addRangeIssue(
    issues,
    'draft.total-range',
    'Draft pool size',
    draftSummary.total,
    rules.draft.total,
  )
  validateCommanderSymmetry(cube.commanders, rules, issues)

  return {
    valid: issues.length === 0,
    issues,
    summary: {
      draft: draftSummary,
      commanders: cube.commanders.length,
    },
  }
}
