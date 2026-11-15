import ExcelJS from 'exceljs'
import { colorIdentityKey } from '../../domain/cube/colorIdentity'
import type { DraftSection, GuildKey } from '../../domain/cube/types'
import type { CardMetadata } from '../scryfall/types'
import {
  COMMANDER_SECTIONS,
  CUBE_SHEET,
  DRAFT_SECTIONS,
  IDEAS_SHEET,
  IDEA_SECTIONS,
  draftAllocationFor,
  type ActiveSectionLayout,
} from './layout'

export interface SandboxChangeList {
  draftAdded: string[]
  draftRemoved: string[]
  commandersAdded: string[]
  commandersRemoved: string[]
}

export interface CellUpdate {
  sheet: string
  cell: string
  previous: string
  next: string
}

export interface ChangePlan {
  updates: CellUpdate[]
  removals: Array<{ pool: 'draft' | 'commander'; name: string; cell: string }>
  additions: Array<{ pool: 'draft' | 'commander'; name: string; cell: string }>
  ideasRemoved: string[]
  draftCountBefore: number
  draftCountAfter: number
  commanderCountBefore: number
  commanderCountAfter: number
}

const HEADER_TO_FIELD = {
  'DRAFT ADDED': 'draftAdded',
  'DRAFT REMOVED': 'draftRemoved',
  'COMMANDERS ADDED': 'commandersAdded',
  'COMMANDERS REMOVED': 'commandersRemoved',
} as const

type Header = keyof typeof HEADER_TO_FIELD
type ChangeField = (typeof HEADER_TO_FIELD)[Header]
type Pool = 'draft' | 'commander'

function key(name: string): string {
  return name.trim().toLocaleLowerCase('en-US')
}

export function parseSandboxDiff(text: string): SandboxChangeList {
  const result: SandboxChangeList = {
    draftAdded: [], draftRemoved: [], commandersAdded: [], commandersRemoved: [],
  }
  const found = new Set<Header>()
  let field: ChangeField | null = null
  let started = false

  for (const [index, originalLine] of text.replace(/^\uFEFF/, '').split(/\r?\n/).entries()) {
    const line = originalLine.trim()
    if (!line) continue
    if (!started && line === 'Cube Companion sandbox diff') {
      started = true
      continue
    }
    started = true
    if (Object.hasOwn(HEADER_TO_FIELD, line)) {
      const header = line as Header
      if (found.has(header)) throw new Error(`Duplicate section ${header} on line ${index + 1}.`)
      found.add(header)
      field = HEADER_TO_FIELD[header]
      continue
    }
    if (line === '(none)') {
      if (!field) throw new Error(`Unexpected (none) on line ${index + 1}.`)
      continue
    }
    if (!field || /^(DRAFT|COMMANDERS?)\s+[A-Z ]+$/.test(line)) {
      throw new Error(`Unsupported or misplaced line ${index + 1}: ${line}`)
    }
    result[field].push(line)
  }

  const missing = (Object.keys(HEADER_TO_FIELD) as Header[]).filter((header) => !found.has(header))
  if (missing.length) throw new Error(`Change list is missing ${missing.join(', ')}.`)

  for (const fieldName of Object.values(HEADER_TO_FIELD)) {
    const seen = new Set<string>()
    for (const name of result[fieldName]) {
      if (seen.has(key(name))) throw new Error(`Duplicate ${fieldName} entry: ${name}.`)
      seen.add(key(name))
    }
  }
  for (const [added, removed] of [
    ['draftAdded', 'draftRemoved'],
    ['commandersAdded', 'commandersRemoved'],
  ] as const) {
    const removedNames = new Set(result[removed].map(key))
    for (const name of result[added]) {
      if (removedNames.has(key(name))) {
        throw new Error(`${name} is both added and removed in the same pool.`)
      }
    }
  }
  return result
}

function worksheet(workbook: ExcelJS.Workbook, sheetName: string): ExcelJS.Worksheet {
  const sheet = workbook.getWorksheet(sheetName)
  if (!sheet) throw new Error(`Missing worksheet ${sheetName}.`)
  return sheet
}

function validateLabel(sheet: ExcelJS.Worksheet, labelCell: string, expected: string): void {
  const found = sheet.getCell(labelCell).text.trim()
  if (found !== expected) {
    throw new Error(`Unexpected layout at ${sheet.name}!${labelCell}: expected ${expected}, found ${found || '(blank)'}.`)
  }
}

function literalText(cell: ExcelJS.Cell): string {
  const value = cell.value
  if (value !== null && value !== undefined && typeof value !== 'string') {
    throw new Error(`Expected a plain card name at ${cell.address}, found a different Excel value type.`)
  }
  return cell.text.trim()
}

interface SourceEntry {
  pool: Pool
  name: string
  cell: string
  layout: ActiveSectionLayout
}

function entriesFor(sheet: ExcelJS.Worksheet, layouts: readonly ActiveSectionLayout[], pool: Pool): SourceEntry[] {
  const found: SourceEntry[] = []
  for (const layout of layouts) {
    validateLabel(sheet, layout.labelCell, layout.expectedLabel)
    for (let row = layout.startRow; row <= layout.endRow; row += 1) {
      const address = `${layout.cardColumn}${row}`
      const name = literalText(sheet.getCell(address))
      if (!name && layout.stopAtBlank) break
      if (!name || name === '-') continue
      found.push({ pool, name, cell: address, layout })
    }
  }
  return found
}

function guildForIdentity(card: CardMetadata): GuildKey {
  const guild = colorIdentityKey(card.colorIdentity)
  if (card.colorIdentity.length !== 2) throw new Error(`Expected a two-color card: ${card.name}.`)
  return guild as GuildKey
}

function draftBucket(layout: ActiveSectionLayout, row: number): string {
  const allocation = draftAllocationFor(layout.section, row)
  return `${layout.section}:${allocation?.guild ?? 'general'}`
}

function additionBucket(card: CardMetadata): string {
  if (card.isLand) {
    // A land with a colorless Scryfall identity is placed among general lands.
    // Existing guild allocations are positional and remain unchanged.
    return `land:${card.colorIdentity.length === 2 ? guildForIdentity(card) : 'general'}`
  }
  if (card.colorIdentity.length === 0) return 'colorless:general'
  if (card.colorIdentity.length === 1) {
    const section: Record<string, DraftSection> = {
      W: 'white', U: 'blue', B: 'black', R: 'red', G: 'green',
    }
    return `${section[card.colorIdentity[0]]}:general`
  }
  if (card.colorIdentity.length === 2) return `multicolor:${guildForIdentity(card)}`
  throw new Error(`${card.name} has more than two colors and cannot join the draft pool.`)
}

function commanderSection(card: CardMetadata): string {
  const count = card.colorIdentity.length
  if (count === 0) return 'colorless'
  if (count === 1) return ({ W: 'white', U: 'blue', B: 'black', R: 'red', G: 'green' })[card.colorIdentity[0]]
  if (count === 2) return 'dual'
  return 'triple'
}

function requireUnique(entries: readonly SourceEntry[], pool: Pool): Map<string, SourceEntry> {
  const result = new Map<string, SourceEntry>()
  for (const entry of entries) {
    const normalized = key(entry.name)
    if (result.has(normalized)) throw new Error(`Duplicate active ${pool} card ${entry.name}.`)
    result.set(normalized, entry)
  }
  return result
}

function metadataFor(name: string, metadata: ReadonlyMap<string, CardMetadata>): CardMetadata {
  const card = metadata.get(key(name))
  if (!card) throw new Error(`Missing Scryfall metadata for ${name}; verify its spelling.`)
  return card
}

/** Creatures first, then mana value ascending, then name. Stable on ties. */
export function sortCardNames(
  names: readonly string[],
  metadata: ReadonlyMap<string, CardMetadata>,
): string[] {
  return [...names].sort((left, right) => {
    const a = metadataFor(left, metadata)
    const b = metadataFor(right, metadata)
    const aNonCreature = !/\bCreature\b/i.test(a.typeLine)
    const bNonCreature = !/\bCreature\b/i.test(b.typeLine)
    if (aNonCreature !== bNonCreature) return Number(aNonCreature) - Number(bNonCreature)
    if (!Number.isFinite(a.manaValue) || !Number.isFinite(b.manaValue)) {
      throw new Error(`Missing mana value for ${left} or ${right}.`)
    }
    return a.manaValue - b.manaValue || a.name.localeCompare(b.name, 'en-US', { sensitivity: 'base' })
  })
}

export function planWorkbookDiff(
  workbook: ExcelJS.Workbook,
  changes: SandboxChangeList,
  metadata: ReadonlyMap<string, CardMetadata>,
): ChangePlan {
  const sheet = worksheet(workbook, CUBE_SHEET)
  const ideasSheet = worksheet(workbook, IDEAS_SHEET)
  const draft = entriesFor(sheet, DRAFT_SECTIONS, 'draft')
  const commanders = entriesFor(sheet, COMMANDER_SECTIONS, 'commander')
  const draftByName = requireUnique(draft, 'draft')
  const commandersByName = requireUnique(commanders, 'commander')
  const modifications = new Map<string, string>()
  const removals: ChangePlan['removals'] = []
  const additions: ChangePlan['additions'] = []

  function expectRemoved(pool: Pool, names: readonly string[], active: Map<string, SourceEntry>) {
    for (const name of names) {
      const old = active.get(key(name))
      if (!old) throw new Error(`Cannot remove ${name}: not found in the active ${pool} workbook section.`)
      removals.push({ pool, name: old.name, cell: old.cell })
    }
  }
  expectRemoved('draft', changes.draftRemoved, draftByName)
  expectRemoved('commander', changes.commandersRemoved, commandersByName)

  const draftRemoved = new Set(changes.draftRemoved.map(key))
  const commanderRemoved = new Set(changes.commandersRemoved.map(key))
  const finalDraft = draft.filter((entry) => !draftRemoved.has(key(entry.name))).map((entry) => entry.name).concat(changes.draftAdded)
  const finalCommanders = commanders.filter((entry) => !commanderRemoved.has(key(entry.name))).map((entry) => entry.name).concat(changes.commandersAdded)
  const finalNames = new Set<string>()
  const finalOracleIds = new Set<string>()
  for (const name of [...finalDraft, ...finalCommanders]) {
    const normalized = key(name)
    if (finalNames.has(normalized)) throw new Error(`Duplicate or cross-pool overlap after changes: ${name}.`)
    finalNames.add(normalized)
    const oracleId = metadataFor(name, metadata).oracleId
    if (finalOracleIds.has(oracleId)) throw new Error(`Duplicate Scryfall card identity after changes: ${name}.`)
    finalOracleIds.add(oracleId)
  }

  // Sort only *inside* workbook allocations. The four-cell guild blocks are
  // fixed by row, so sorting must never move a card to a different guild.
  const draftSlots = new Map<string, string[]>()
  for (const layout of DRAFT_SECTIONS) {
    for (let row = layout.startRow; row <= layout.endRow; row += 1) {
      const bucket = draftBucket(layout, row)
      const slots = draftSlots.get(bucket) ?? []
      slots.push(`${layout.cardColumn}${row}`)
      draftSlots.set(bucket, slots)
    }
  }

  const additionsByBucket = new Map<string, string[]>()
  for (const name of changes.draftAdded) {
    if (draftByName.has(key(name))) throw new Error(`Draft addition ${name} is already active.`)
    const bucket = additionBucket(metadataFor(name, metadata))
    if (!draftSlots.has(bucket)) throw new Error(`No worksheet slots exist for ${name} (${bucket}).`)
    const names = additionsByBucket.get(bucket) ?? []
    names.push(name)
    additionsByBucket.set(bucket, names)
  }

  for (const [bucket, slots] of draftSlots) {
    const existing = draft.filter((entry) => draftBucket(entry.layout, Number(entry.cell.match(/\d+$/)?.[0])) === bucket)
    const kept = existing.filter((entry) => !draftRemoved.has(key(entry.name))).map((entry) => entry.name)
    const added = additionsByBucket.get(bucket) ?? []
    if (kept.length + added.length > slots.length) {
      throw new Error(`No free ${bucket} slot for ${added.join(', ') || 'the remaining cards'}; section capacity is ${slots.length}.`)
    }
    // Preserve the deliberate fetch/shock/manland/dual land ordering. Other
    // sections are creature-first, then ascending mana value and card name.
    const ordered = bucket.startsWith('land:') ? [...kept, ...added] : sortCardNames([...kept, ...added], metadata)
    for (const [index, cell] of slots.entries()) {
      const old = literalText(sheet.getCell(cell))
      const next = ordered[index] ?? ''
      if (old !== next && (next || (old && old !== '-'))) {
        modifications.set(`${CUBE_SHEET}!${cell}`, next)
      }
    }
    for (const name of added) {
      const index = ordered.findIndex((candidate) => key(candidate) === key(name))
      additions.push({ pool: 'draft', name, cell: slots[index] })
    }
  }

  // Commanders have larger worksheet sections, but the dual/triple sections
  // contain several contiguous color-identity groups. Keep those groups in
  // their existing order and sort by creature / CMC *within* each group.
  for (const layout of COMMANDER_SECTIONS) {
    const current = commanders.filter((entry) => entry.layout.section === layout.section)
    const kept = current.filter((entry) => !commanderRemoved.has(key(entry.name))).map((entry) => entry.name)
    const added = changes.commandersAdded.filter((name) =>
      commanderSection(metadataFor(name, metadata)) === layout.section,
    )
    for (const name of added) {
      if (commandersByName.has(key(name))) throw new Error(`Commander addition ${name} is already active.`)
    }
    const total = kept.length + added.length
    const capacity = layout.endRow - layout.startRow + 1
    if (total > capacity) throw new Error(`Commander section ${layout.section} exceeds ${capacity} slots.`)

    const groupOrder: string[] = []
    for (const name of [...current.map((entry) => entry.name), ...added]) {
      const identity = colorIdentityKey(metadataFor(name, metadata).colorIdentity)
      if (!groupOrder.includes(identity)) groupOrder.push(identity)
    }
    const ordered = groupOrder.flatMap((identity) => sortCardNames(
      [...kept, ...added].filter((name) => colorIdentityKey(metadataFor(name, metadata).colorIdentity) === identity),
      metadata,
    ))
    for (let row = layout.startRow; row <= layout.endRow; row += 1) {
      const cell = `${layout.cardColumn}${row}`
      const old = literalText(sheet.getCell(cell))
      const next = ordered[row - layout.startRow] ?? ''
      if (old !== next && (next || (old && old !== '-'))) {
        modifications.set(`${CUBE_SHEET}!${cell}`, next)
      }
    }
    for (const name of added) {
      const index = ordered.findIndex((candidate) => key(candidate) === key(name))
      additions.push({ pool: 'commander', name, cell: `${layout.cardColumn}${layout.startRow + index}` })
    }
  }

  // Newly activated cards cannot remain in Cut-Watch-Interest, because the
  // release pipeline rejects active cards that also appear in Maybe.
  const ideasRemoved: string[] = []
  const newlyActivated = new Set([...changes.draftAdded, ...changes.commandersAdded].map(key))
  for (const layout of IDEA_SECTIONS) {
    validateLabel(ideasSheet, layout.labelCell, layout.expectedLabel)
    for (let row = layout.startRow; row <= ideasSheet.rowCount; row += 1) {
      const cell = `${layout.cardColumn}${row}`
      const name = literalText(ideasSheet.getCell(cell))
      if (!name || name === '-' || !newlyActivated.has(key(name))) continue
      ideasRemoved.push(name)
      modifications.set(`${IDEAS_SHEET}!${cell}`, '')
    }
  }

  const updates: CellUpdate[] = [...modifications.entries()].map(([address, next]) => {
    const separator = address.lastIndexOf('!')
    const sheetName = address.slice(0, separator)
    const cell = address.slice(separator + 1)
    const previous = literalText(worksheet(workbook, sheetName).getCell(cell))
    return { sheet: sheetName, cell, previous, next }
  }).filter((change) => change.previous !== change.next)

  return {
    updates, removals, additions, ideasRemoved,
    draftCountBefore: draft.length,
    draftCountAfter: finalDraft.length,
    commanderCountBefore: commanders.length,
    commanderCountAfter: finalCommanders.length,
  }
}

export function applyWorkbookDiff(workbook: ExcelJS.Workbook, plan: ChangePlan): void {
  for (const update of plan.updates) {
    const cell = worksheet(workbook, update.sheet).getCell(update.cell)
    if (literalText(cell) !== update.previous) {
      throw new Error(`Source changed at ${update.sheet}!${update.cell} after preview. Refusing to apply.`)
    }
    cell.value = update.next || null
  }
}
