import { describe, expect, it } from 'vitest'
import {
  COLOR_SYMBOLS,
  colorIdentityCombinations,
  colorIdentityKey,
  validateCube,
  type ColorIdentity,
  type CubeCard
} from '../../src/domain'

let nextId = 1

function card(
  name: string,
  colorIdentity: ColorIdentity,
  isLand = false,
  oracleId = `oracle-${nextId++}`,
): CubeCard {
  return { oracleId, name, colorIdentity, isLand }
}

function cardsForIdentity(
  prefix: string,
  identity: ColorIdentity,
  count: number,
  isLand = false,
): CubeCard[] {
  return Array.from({ length: count }, (_, index) =>
    card(`${prefix}-${index + 1}`, identity, isLand),
  )
}

function buildValidCube() {
  nextId = 1
  const draftCards: CubeCard[] = []

  for (const color of COLOR_SYMBOLS) {
    draftCards.push(...cardsForIdentity(color, [color], 50))
  }

  for (const identity of colorIdentityCombinations(2)) {
    draftCards.push(...cardsForIdentity(colorIdentityKey(identity), identity, 4))
  }

  draftCards.push(...cardsForIdentity('Colorless', [], 61))
  draftCards.push(...cardsForIdentity('Land', [], 60, true))

  const commanders: CubeCard[] = []
  for (const size of [1, 2, 3, 4]) {
    for (const identity of colorIdentityCombinations(size)) {
      commanders.push(card(`Commander-${colorIdentityKey(identity)}`, identity))
    }
  }
  commanders.push(card('Colorless Commander', []))
  commanders.push(card('Five Color Commander', ['W', 'U', 'B', 'R', 'G']))

  return { draftCards, commanders }
}

describe('cube validation', () => {
  it('accepts a cube matching all configured rules', () => {
    const result = validateCube(buildValidCube())

    expect(result.valid).toBe(true)
    expect(result.issues).toEqual([])
    expect(result.summary.draft.total).toBe(411)
    expect(result.summary.draft.colorless).toBe(61)
    expect(result.summary.draft.lands).toBe(60)
  })

  it('requires exact mono-color and dual-color counts', () => {
    const cube = buildValidCube()
    cube.draftCards.splice(cube.draftCards.findIndex((entry) => entry.name === 'W-1'), 1)
    cube.draftCards.splice(cube.draftCards.findIndex((entry) => entry.name === 'WU-1'), 1)

    const result = validateCube(cube)

    expect(result.valid).toBe(false)
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'draft.mono-count', actual: 49 }),
        expect.objectContaining({ code: 'draft.dual-count', actual: 3 }),
      ]),
    )
  })

  it('rejects three-or-more-color cards in the draft pool', () => {
    const cube = buildValidCube()
    cube.draftCards[0] = card('Illegal Bant Card', ['W', 'U', 'G'])

    const result = validateCube(cube)

    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'draft.disallowed-color-identity',
          cards: ['Illegal Bant Card'],
        }),
      ]),
    )
  })

  it('distinguishes colorless lands from other colorless cards', () => {
    const cube = buildValidCube()
    const colorlessCard = cube.draftCards.find((entry) => entry.name === 'Colorless-1')!
    colorlessCard.isLand = true

    const result = validateCube(cube)

    expect(result.summary.draft.colorless).toBe(60)
    expect(result.summary.draft.lands).toBe(61)
  })

  it('enforces configured flexible ranges', () => {
    const cube = buildValidCube()
    cube.draftCards = cube.draftCards.filter(
      (entry) => !entry.name.startsWith('Colorless-') || Number(entry.name.split('-')[1]) <= 50,
    )

    const result = validateCube(cube)

    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'draft.colorless-range', actual: 50 }),
      ]),
    )
  })

  it('enforces singleton identity and draft/commander separation', () => {
    const cube = buildValidCube()
    const original = cube.draftCards[0]
    cube.draftCards.push(card('Duplicate printing', ['W'], false, original.oracleId))
    cube.commanders.push(card('Commander overlap', ['W'], false, original.oracleId))

    const result = validateCube(cube)

    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'draft.duplicate' }),
        expect.objectContaining({ code: 'commander.overlap', cards: ['Commander overlap'] }),
      ]),
    )
  })

  it('requires symmetry independently for commander identity sizes', () => {
    const cube = buildValidCube()
    cube.commanders = cube.commanders.filter((entry) => entry.name !== 'Commander-WU')

    const result = validateCube(cube)

    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'commander.symmetry' }),
      ]),
    )
  })

  it('allows unrestricted colorless and five-color commanders', () => {
    const cube = buildValidCube()
    cube.commanders = [
      ...cube.commanders,
      card('Another Colorless Commander', []),
      card('Another Five Color Commander', ['W', 'U', 'B', 'R', 'G']),
    ]

    const result = validateCube(cube)

    expect(result.issues.filter((issue) => issue.code === 'commander.symmetry')).toEqual([])
  })
})

describe('color identity normalization', () => {
  it('normalizes order and duplicate symbols', () => {
    expect(colorIdentityKey(['G', 'W', 'G'])).toBe('WG')
  })
})
