import ExcelJS from 'exceljs'
import { describe, expect, it } from 'vitest'
import {
  applyWorkbookDiff,
  parseSandboxDiff,
  planWorkbookDiff,
  type SandboxChangeList,
} from '../../src/infrastructure/excel/applySandboxDiff'
import { COMMANDER_SECTIONS, DRAFT_SECTIONS, IDEA_SECTIONS } from '../../src/infrastructure/excel/layout'
import type { CardMetadata } from '../../src/infrastructure/scryfall/types'

function metadata(name: string, colors: CardMetadata['colorIdentity'], isLand = false): CardMetadata {
  return {
    name, oracleId: name.toLowerCase(), colorIdentity: colors, isLand,
    manaValue: 2, manaCost: '', typeLine: isLand ? 'Land' : 'Creature',
    oracleText: '', scryfallUri: '',
  }
}

function fixture() {
  const workbook = new ExcelJS.Workbook()
  const cube = workbook.addWorksheet('Cube')
  const ideas = workbook.addWorksheet('Cut-Watch-Interest')
  for (const section of [...DRAFT_SECTIONS, ...COMMANDER_SECTIONS]) {
    cube.getCell(section.labelCell).value = section.expectedLabel
  }
  for (const section of IDEA_SECTIONS) ideas.getCell(section.labelCell).value = section.expectedLabel
  cube.getCell('B4').value = 'Old White'
  cube.getCell('T79').value = 'Old Commander'
  ideas.getCell('A2').value = 'New White'
  ideas.getCell('A3').value = 'Hold This Idea'
  ideas.getCell('C2').value = 'New Commander'
  const cards = ['Old White', 'New White'].map((name) => metadata(name, ['W'])).concat([
    metadata('Old Commander', ['U', 'R']), metadata('New Commander', ['U', 'R']),
  ])
  return { workbook, cube, ideas, cards: new Map(cards.map((card) => [card.name.toLowerCase(), card])) }
}

const changes: SandboxChangeList = {
  draftAdded: ['New White'], draftRemoved: ['Old White'],
  commandersAdded: ['New Commander'], commandersRemoved: ['Old Commander'],
}

describe('sandbox diff workbook import', () => {
  it('parses the exact four-section export with empty groups', () => {
    const result = parseSandboxDiff(`Cube Companion sandbox diff\r\n\r\nDRAFT ADDED\r\nNew White\r\nDRAFT REMOVED\r\nOld White\r\nCOMMANDERS ADDED\r\n(none)\r\nCOMMANDERS REMOVED\r\n(none)\r\n`)
    expect(result).toEqual({
      draftAdded: ['New White'], draftRemoved: ['Old White'],
      commandersAdded: [], commandersRemoved: [],
    })
    expect(() => parseSandboxDiff('DRAFT ADDED\nNew White')).toThrow('missing')
    expect(() => parseSandboxDiff('DRAFT REALLOCATED\nOld: White -> Blue')).toThrow()
  })

  it('previews without changing the original, then replaces only selected cells', () => {
    const { workbook, cube, ideas, cards } = fixture()
    const plan = planWorkbookDiff(workbook, changes, cards)
    expect(plan.draftCountAfter).toBe(1)
    expect(plan.commanderCountAfter).toBe(1)
    expect(plan.additions).toContainEqual({ pool: 'draft', name: 'New White', cell: 'B4' })
    expect(plan.additions).toContainEqual({ pool: 'commander', name: 'New Commander', cell: 'T79' })
    expect(cube.getCell('B4').text).toBe('Old White')
    expect(ideas.getCell('A2').text).toBe('New White')
    applyWorkbookDiff(workbook, plan)
    expect(cube.getCell('B4').text).toBe('New White')
    expect(cube.getCell('T79').text).toBe('New Commander')
    expect(ideas.getCell('A2').value).toBeNull()
    expect(ideas.getCell('A3').text).toBe('Hold This Idea')
    expect(ideas.getCell('C2').value).toBeNull()
  })

  it('refuses a missing removal and a duplicate active card', () => {
    const { workbook, cards } = fixture()
    expect(() => planWorkbookDiff(workbook, { ...changes, draftRemoved: ['Not Here'] }, cards)).toThrow('not found')
    expect(() => planWorkbookDiff(workbook, { ...changes, draftAdded: ['Old White'], draftRemoved: [] }, cards)).toThrow('Duplicate')
  })

  it('cannot place a card in an already full guild block', () => {
    const { workbook, cube, cards } = fixture()
    for (let row = 4; row <= 7; row += 1) {
      const name = `Existing WU ${row}`
      cube.getCell(`T${row}`).value = name
      cards.set(name.toLowerCase(), metadata(name, ['W', 'U']))
    }
    const added = metadata('Extra WU', ['W', 'U'])
    cards.set('extra wu', added)
    expect(() => planWorkbookDiff(workbook, {
      draftAdded: ['Extra WU'], draftRemoved: [],
      commandersAdded: [], commandersRemoved: [],
    }, cards)).toThrow('No free multicolor:WU slot')
  })
})

describe('sorted Excel diff placement', () => {
  it('sorts creatures before noncreatures by ascending CMC and keeps worksheet styles', () => {
    const { workbook, cube, cards } = fixture()
    cube.getCell('B4').value = 'Tiny Creature'
    cube.getCell('B5').value = 'Big Creature'
    cube.getCell('B6').value = 'Cheap Spell'
    cube.getCell('B5').font = { bold: true }
    cards.set('tiny creature', { ...metadata('Tiny Creature', ['W']), manaValue: 1, typeLine: 'Creature — Human' })
    cards.set('big creature', { ...metadata('Big Creature', ['W']), manaValue: 5, typeLine: 'Creature — Dragon' })
    cards.set('cheap spell', { ...metadata('Cheap Spell', ['W']), manaValue: 1, typeLine: 'Instant' })
    cards.set('New Creature'.toLowerCase(), { ...metadata('New Creature', ['W']), manaValue: 2, typeLine: 'Artifact Creature — Construct' })
    cards.set('New Spell'.toLowerCase(), { ...metadata('New Spell', ['W']), manaValue: 2, typeLine: 'Sorcery' })

    const plan = planWorkbookDiff(workbook, {
      draftAdded: ['New Creature', 'New Spell'], draftRemoved: ['Big Creature'],
      commandersAdded: [], commandersRemoved: [],
    }, cards)
    expect(plan.additions).toContainEqual({ pool: 'draft', name: 'New Creature', cell: 'B5' })
    expect(plan.additions).toContainEqual({ pool: 'draft', name: 'New Spell', cell: 'B7' })
    // Planning is a dry run and cannot modify even the font of an existing cell.
    expect(cube.getCell('B5').text).toBe('Big Creature')
    applyWorkbookDiff(workbook, plan)
    expect(['B4', 'B5', 'B6', 'B7', 'B8'].map((address) => cube.getCell(address).text)).toEqual([
      'Tiny Creature', 'New Creature', 'Cheap Spell', 'New Spell', '',
    ])
    expect(cube.getCell('B5').font.bold).toBe(true)
    expect(cube.getCell('A2').text).toBe('White')
  })

  it('keeps multicolor guilds separate and preserves four-row land groups', () => {
    const { workbook, cube, cards } = fixture()
    for (const [row, name, cmc] of [
      [4, 'Old WU 1', 1], [5, 'Old WU 3', 3],
      [6, 'Old WU 5', 5], [7, 'Old WU 7', 7],
    ] as const) {
      cube.getCell(`T${row}`).value = name
      cards.set(name.toLowerCase(), { ...metadata(name, ['W', 'U']), manaValue: cmc })
    }
    cube.getCell('T8').value = 'Keep UB'
    cards.set('keep ub', metadata('Keep UB', ['U', 'B']))
    cube.getCell('W4').value = 'Fetchland WU'
    cube.getCell('W5').value = 'Shockland WU'
    cards.set('fetchland wu', metadata('Fetchland WU', [], true))
    cards.set('shockland wu', metadata('Shockland WU', ['W', 'U'], true))
    cards.set('new wu 2', { ...metadata('New WU 2', ['W', 'U']), manaValue: 2 })

    const plan = planWorkbookDiff(workbook, {
      draftAdded: ['New WU 2'], draftRemoved: ['Old WU 5'],
      commandersAdded: [], commandersRemoved: [],
    }, cards)
    expect(plan.additions).toContainEqual({ pool: 'draft', name: 'New WU 2', cell: 'T5' })
    applyWorkbookDiff(workbook, plan)
    expect(['T4', 'T5', 'T6', 'T7', 'T8'].map((address) => cube.getCell(address).text)).toEqual([
      'Old WU 1', 'New WU 2', 'Old WU 3', 'Old WU 7', 'Keep UB',
    ])
    expect(cube.getCell('W4').text).toBe('Fetchland WU')
    expect(cube.getCell('W5').text).toBe('Shockland WU')
  })

  it('sorts commanders within identity groups without mixing guilds', () => {
    const { workbook, cube, cards } = fixture()
    for (const [cell, name, identity, cmc] of [
      ['T79', 'Old WU 4', ['W', 'U'], 4],
      ['T80', 'Existing WU 2', ['W', 'U'], 2],
      ['T81', 'Old UR 5', ['U', 'R'], 5],
      ['T82', 'Existing UR 3', ['U', 'R'], 3],
    ] as const) {
      cube.getCell(cell).value = name
      cards.set(name.toLowerCase(), { ...metadata(name, identity), manaValue: cmc })
    }
    cards.set('new wu 1', { ...metadata('New WU 1', ['W', 'U']), manaValue: 1 })
    const plan = planWorkbookDiff(workbook, {
      draftAdded: [], draftRemoved: [],
      commandersAdded: ['New WU 1'], commandersRemoved: ['Old WU 4'],
    }, cards)
    expect(plan.additions).toContainEqual({ pool: 'commander', name: 'New WU 1', cell: 'T79' })
    applyWorkbookDiff(workbook, plan)
    expect(['T79', 'T80', 'T81', 'T82'].map((address) => cube.getCell(address).text)).toEqual([
      'New WU 1', 'Existing WU 2', 'Existing UR 3', 'Old UR 5',
    ])
  })
})
