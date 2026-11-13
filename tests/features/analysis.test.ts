import { describe, expect, it } from 'vitest'
import {
  averageManaValue,
  manaCurve,
  sectionDistribution,
  sectionManaCurve,
  typeDistribution,
} from '../../src/features/analysis/analysis'
import type { DraftSection } from '../../src/domain'
import type { BrowserCard } from '../../src/features/browser/types'

function card(
  name: string,
  manaValue: number,
  typeLine: string,
  section: DraftSection,
  isLand = false,
): BrowserCard {
  return {
    oracleId: name,
    name,
    colorIdentity: [],
    isLand,
    draftAllocation: { section },
    sourceIndex: 0,
    manaValue,
    manaCost: '',
    typeLine,
    oracleText: '',
    scryfallUri: '',
  }
}

describe('cube analysis', () => {
  const cards = [
    card('Blue artifact', 3, 'Artifact', 'blue'),
    card('Creature', 2, 'Artifact Creature — Golem', 'colorless'),
    card('Big spell', 9, 'Sorcery', 'red'),
    card('Land', 0, 'Land', 'land', true),
  ]

  it('uses workbook allocation for section distribution', () => {
    expect(sectionDistribution(cards)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: 'blue', count: 1 }),
        expect.objectContaining({ key: 'colorless', count: 1 }),
        expect.objectContaining({ key: 'land', count: 1 }),
      ]),
    )
  })

  it('builds a nonland mana curve with a 7+ bucket', () => {
    const curve = manaCurve(cards)
    expect(curve.find((bucket) => bucket.label === '2')?.count).toBe(1)
    expect(curve.find((bucket) => bucket.label === '3')?.count).toBe(1)
    expect(curve.find((bucket) => bucket.label === '7+')?.count).toBe(1)
  })

  it('breaks the mana curve down by workbook section', () => {
    const curve = sectionManaCurve(cards)
    const mv2 = curve.find((bucket) => bucket.label === '2')
    const mv3 = curve.find((bucket) => bucket.label === '3')
    const sevenPlus = curve.find((bucket) => bucket.label === '7+')

    expect(mv2?.sections.find((section) => section.key === 'colorless')?.count).toBe(1)
    expect(mv3?.sections.find((section) => section.key === 'blue')?.count).toBe(1)
    expect(sevenPlus?.sections.find((section) => section.key === 'red')?.count).toBe(1)
    expect(curve.reduce((sum, bucket) => sum + bucket.total, 0)).toBe(3)
  })

  it('counts each card once by primary type and averages nonlands', () => {
    const types = typeDistribution(cards)
    expect(types.find((bucket) => bucket.label === 'Creature')?.count).toBe(1)
    expect(types.find((bucket) => bucket.label === 'Artifact')?.count).toBe(1)
    expect(averageManaValue(cards)).toBeCloseTo(14 / 3)
  })
})
