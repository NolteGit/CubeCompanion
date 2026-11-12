import { describe, expect, it } from 'vitest'
import {
  COLOR_SYMBOLS,
  GUILD_KEYS,
  colorIdentityCombinations,
  colorIdentityKey,
  validateCube,
  type ColorIdentity,
  type CubeCard,
  type DraftAllocation,
  type DraftSection,
  type GuildKey,
} from '../../src/domain'

let nextId = 1

function card(
  name: string,
  colorIdentity: ColorIdentity,
  isLand = false,
  oracleId = `oracle-${nextId++}`,
  draftAllocation?: DraftAllocation,
): CubeCard {
  return { oracleId, name, colorIdentity, isLand, draftAllocation }
}

function cardsForIdentity(
  prefix: string,
  identity: ColorIdentity,
  count: number,
  isLand = false,
  draftAllocation?: DraftAllocation,
): CubeCard[] {
  return Array.from({ length: count }, (_, index) =>
    card(`${prefix}-${index + 1}`, identity, isLand, undefined, draftAllocation),
  )
}

function buildValidCube() {
  nextId = 1
  const draftCards: CubeCard[] = []

  const sectionByColor: Record<(typeof COLOR_SYMBOLS)[number], DraftSection> = {
    W: 'white',
    U: 'blue',
    B: 'black',
    R: 'red',
    G: 'green',
  }

  for (const color of COLOR_SYMBOLS) {
    draftCards.push(
      ...cardsForIdentity(color, [color], 50, false, { section: sectionByColor[color] }),
    )
  }

  for (const identity of colorIdentityCombinations(2)) {
    const guild = colorIdentityKey(identity) as GuildKey
    draftCards.push(
      ...cardsForIdentity(guild, identity, 4, false, { section: 'multicolor', guild }),
    )
  }

  draftCards.push(...cardsForIdentity('Colorless', [], 61, false, { section: 'colorless' }))
  for (const guild of GUILD_KEYS) {
    draftCards.push(...cardsForIdentity(`Land-${guild}`, [], 4, true, { section: 'land', guild }))
  }
  draftCards.push(...cardsForIdentity('Land-General', [], 20, true, { section: 'land' }))

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

  it('uses workbook allocation instead of Scryfall identity for draft quotas', () => {
    const cube = buildValidCube()
    const blueCard = cube.draftCards.find((entry) => entry.name === 'U-1')!
    blueCard.colorIdentity = []
    const wuLand = cube.draftCards.find((entry) => entry.name === 'Land-WU-1')!
    wuLand.colorIdentity = []

    const result = validateCube(cube)

    expect(result.valid).toBe(true)
    expect(result.summary.draft.mono.U).toBe(50)
    expect(result.summary.draft.dual.WU).toBe(4)
    expect(result.summary.draft.guildLands.WU).toBe(4)
    expect(result.summary.draft.generalLands).toBe(20)
    expect(result.summary.draft.lands).toBe(60)
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
