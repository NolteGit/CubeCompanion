import {
  COLOR_SYMBOLS,
  type CubeCard,
  type CubeDefinition,
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

function buildDraftSummary(cards: readonly CubeCard[]): DraftValidationSummary {
  const mono = countByIdentity(cards, 1)
  const dual = countByIdentity(cards, 2)
  let colorless = 0
  let lands = 0

  for (const card of cards) {
    if (colorIdentitySize(card.colorIdentity) !== 0) {
      continue
    }

    if (card.isLand) {
      lands += 1
    } else {
      colorless += 1
    }
  }

  return {
    total: cards.length,
    mono,
    dual,
    colorless,
    lands,
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
      issues.push({
        code: 'draft.mono-count',
        message: `${color} must contain exactly ${rules.draft.monoColorCount} cards; found ${actual}.`,
        expected: rules.draft.monoColorCount,
        actual,
      })
    }
  }

  for (const identity of colorIdentityCombinations(2)) {
    const key = colorIdentityKey(identity)
    const actual = summary.dual[key] ?? 0
    if (actual !== rules.draft.dualColorCount) {
      issues.push({
        code: 'draft.dual-count',
        message: `${key} must contain exactly ${rules.draft.dualColorCount} cards; found ${actual}.`,
        expected: rules.draft.dualColorCount,
        actual,
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
    'Colorless card count',
    draftSummary.colorless,
    rules.draft.colorless,
  )
  addRangeIssue(
    issues,
    'draft.land-range',
    'Colorless land count',
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
