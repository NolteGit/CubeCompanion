import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  draftAllocationFor,
  extractWorkbook,
  WORKBOOK_PATH,
} from '../../src/infrastructure/excel'
import { GUILD_KEYS } from '../../src/domain'

function rowNumber(cell: string): number {
  return Number(cell.replace(/^[A-Z]+/, ''))
}

describe('CubeUebersicht workbook adapter', () => {
  it('keeps draft and commander extraction on opposite sides of row 77', async () => {
    const extracted = await extractWorkbook(resolve(process.cwd(), WORKBOOK_PATH))

    expect(extracted.draftCards.length).toBeGreaterThan(0)
    expect(extracted.draftCards.every((card) => rowNumber(card.cell) >= 4)).toBe(true)
    expect(extracted.draftCards.every((card) => rowNumber(card.cell) <= 76)).toBe(true)
    expect(extracted.commanders.every((card) => rowNumber(card.cell) >= 79)).toBe(true)
    expect(extracted.commanders.every((card) => rowNumber(card.cell) <= 150)).toBe(true)
  })

  it('maps four-row spell blocks and five-row land blocks without consulting card identity', () => {
    GUILD_KEYS.forEach((guild, index) => {
      const firstRow = 4 + index * 4
      const firstLandRow = 4 + index * 5
      const lastLandRow = firstLandRow + 4

      expect(draftAllocationFor('multicolor', firstRow)).toEqual({
        section: 'multicolor',
        guild,
      })
      expect(draftAllocationFor('multicolor', firstRow + 3)).toEqual({ section: 'multicolor', guild })
      expect(draftAllocationFor('land', firstLandRow)).toEqual({ section: 'land', guild })
      expect(draftAllocationFor('land', lastLandRow)).toEqual({ section: 'land', guild })
    })

    expect(draftAllocationFor('multicolor', 44)).toEqual({ section: 'multicolor' })
    expect(draftAllocationFor('land', 54)).toEqual({ section: 'land' })
    expect(draftAllocationFor('land', 76)).toEqual({ section: 'land' })
  })

  it('keeps commander placeholders and archive data out of the draft pool', async () => {
    const extracted = await extractWorkbook(resolve(process.cwd(), WORKBOOK_PATH))

    expect(extracted.commanders.every((card) => card.pool === 'commander')).toBe(true)
    expect(extracted.commanders.some((card) => card.name === '-')).toBe(false)
    expect(extracted.archive.every((entry) => entry.pool === 'draft' || entry.pool === 'commander')).toBe(true)
    expect(extracted.archive.length).toBeGreaterThan(0)
  })

  it('extracts only the two inclusion-idea columns from Cut-Watch-Interest', async () => {
    const extracted = await extractWorkbook(resolve(process.cwd(), WORKBOOK_PATH))
    const draftIdeas = extracted.ideas.filter((entry) => entry.pool === 'draft')
    const commanderIdeas = extracted.ideas.filter((entry) => entry.pool === 'commander')
    const activeNames = new Set(
      [...extracted.draftCards, ...extracted.commanders]
        .map((card) => card.name.trim().toLocaleLowerCase('en-US')),
    )

    expect(draftIdeas.length).toBeGreaterThan(0)
    expect(commanderIdeas.length).toBeGreaterThan(0)
    expect(draftIdeas.every((entry) => entry.cell.startsWith('A') && rowNumber(entry.cell) >= 2)).toBe(true)
    expect(commanderIdeas.every((entry) => entry.cell.startsWith('C') && rowNumber(entry.cell) >= 2)).toBe(true)
    expect(extracted.ideas.every((entry) => !activeNames.has(entry.name.trim().toLocaleLowerCase('en-US')))).toBe(true)
  })
})
