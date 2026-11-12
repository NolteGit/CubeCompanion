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

  it('maps the ten four-row guild blocks without consulting card identity', () => {
    GUILD_KEYS.forEach((guild, index) => {
      const firstRow = 4 + index * 4
      const lastRow = firstRow + 3

      expect(draftAllocationFor('multicolor', firstRow)).toEqual({
        section: 'multicolor',
        guild,
      })
      expect(draftAllocationFor('land', lastRow)).toEqual({ section: 'land', guild })
    })

    expect(draftAllocationFor('land', 44)).toEqual({ section: 'land' })
    expect(draftAllocationFor('land', 76)).toEqual({ section: 'land' })
  })

  it('keeps commander placeholders and archive data out of the draft pool', async () => {
    const extracted = await extractWorkbook(resolve(process.cwd(), WORKBOOK_PATH))

    expect(extracted.commanders.every((card) => card.pool === 'commander')).toBe(true)
    expect(extracted.commanders.some((card) => card.name === '-')).toBe(false)
    expect(extracted.archive.every((entry) => entry.pool === 'draft' || entry.pool === 'commander')).toBe(true)
    expect(extracted.archive.length).toBeGreaterThan(0)
  })
})
