import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  extractWorkbook,
  WORKBOOK_PATH,
  type ExtractedCard,
} from '../../src/infrastructure/excel'

function sectionCount(cards: ExtractedCard[], section: ExtractedCard['section']): number {
  return cards.filter((card) => card.section === section).length
}

describe('CubeUebersicht workbook adapter', () => {
  it('extracts the active draft blocks and ignores later scratch rows', async () => {
    const extracted = await extractWorkbook(resolve(process.cwd(), WORKBOOK_PATH))
    const names = new Set(extracted.draftCards.map((card) => card.name))

    expect(sectionCount(extracted.draftCards, 'white')).toBe(50)
    expect(sectionCount(extracted.draftCards, 'blue')).toBe(50)
    expect(sectionCount(extracted.draftCards, 'black')).toBe(50)
    expect(sectionCount(extracted.draftCards, 'red')).toBe(50)
    expect(sectionCount(extracted.draftCards, 'green')).toBe(50)
    expect(sectionCount(extracted.draftCards, 'multicolor')).toBe(40)
    expect(sectionCount(extracted.draftCards, 'colorless')).toBeGreaterThanOrEqual(51)
    expect(sectionCount(extracted.draftCards, 'colorless')).toBeLessThanOrEqual(71)
    expect(sectionCount(extracted.draftCards, 'land')).toBeGreaterThanOrEqual(50)
    expect(sectionCount(extracted.draftCards, 'land')).toBeLessThanOrEqual(70)
    expect(extracted.draftCards.length).toBeGreaterThanOrEqual(391)
    expect(extracted.draftCards.length).toBeLessThanOrEqual(431)

    expect(names.has('Ocelot Pride')).toBe(false)
    expect(names.has('Pollywog Prodigy')).toBe(false)
    expect(names.has('Razorkin Needlehead')).toBe(false)
  })

  it('extracts commander lists until their first blank separator', async () => {
    const extracted = await extractWorkbook(resolve(process.cwd(), WORKBOOK_PATH))
    const names = new Set(extracted.commanders.map((card) => card.name))
    const monoCounts = ['white', 'blue', 'black', 'red', 'green'].map((section) =>
      sectionCount(extracted.commanders, section as ExtractedCard['section']),
    )

    expect(new Set(monoCounts).size).toBe(1)
    expect(sectionCount(extracted.commanders, 'dual') % 10).toBe(0)
    expect(sectionCount(extracted.commanders, 'triple') % 10).toBe(0)
    expect(sectionCount(extracted.commanders, 'colorless')).toBe(0)

    expect(names.has('Alela, Artful Provocateur')).toBe(false)
    expect(names.has('Ms. Bumbleflower')).toBe(false)
  })

  it('extracts draft and commander archive reference data across gaps', async () => {
    const extracted = await extractWorkbook(resolve(process.cwd(), WORKBOOK_PATH))
    const draftArchive = extracted.archive.filter((entry) => entry.pool === 'draft')
    const commanderArchive = extracted.archive.filter((entry) => entry.pool === 'commander')

    expect(draftArchive.length).toBeGreaterThan(0)
    expect(commanderArchive.length).toBeGreaterThan(0)
    expect(draftArchive.some((entry) => entry.name === 'Fractured Identity')).toBe(true)
    expect(commanderArchive.some((entry) => entry.name === 'Akroma, Vision of Ixidor')).toBe(true)
  })
})
