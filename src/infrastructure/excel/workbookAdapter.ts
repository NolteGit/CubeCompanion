import ExcelJS from 'exceljs'
import {
  ARCHIVE_COMMANDER_SECTIONS,
  ARCHIVE_DRAFT_SECTIONS,
  ARCHIVE_SHEET,
  COMMANDER_SECTIONS,
  CUBE_SHEET,
  DRAFT_SECTIONS,
  draftAllocationFor,
  type ActiveSectionLayout,
  type ArchiveSectionLayout,
} from './layout'
import type {
  ExtractedArchiveEntry,
  ExtractedCard,
  ExtractedWorkbook,
  WorkbookPool,
} from './types'

const IGNORED_VALUES = new Set(['-'])

function cellText(worksheet: ExcelJS.Worksheet, address: string): string {
  return worksheet.getCell(address).text.trim()
}

function requireSheet(workbook: ExcelJS.Workbook, name: string): ExcelJS.Worksheet {
  const worksheet = workbook.getWorksheet(name)
  if (!worksheet) {
    throw new Error(`Workbook sheet "${name}" was not found`)
  }
  return worksheet
}

function assertSectionLabel(
  worksheet: ExcelJS.Worksheet,
  section: { labelCell: string; expectedLabel: string },
): void {
  const actual = cellText(worksheet, section.labelCell)
  if (actual !== section.expectedLabel) {
    throw new Error(
      `Workbook layout changed at ${worksheet.name}!${section.labelCell}: expected "${section.expectedLabel}", found "${actual}"`,
    )
  }
}

function readActiveSection(
  worksheet: ExcelJS.Worksheet,
  layout: ActiveSectionLayout,
  pool: WorkbookPool,
): ExtractedCard[] {
  assertSectionLabel(worksheet, layout)
  const cards: ExtractedCard[] = []

  for (let row = layout.startRow; row <= layout.endRow; row += 1) {
    const cell = `${layout.cardColumn}${row}`
    const name = cellText(worksheet, cell)

    if (!name) {
      if (layout.stopAtBlank) break
      continue
    }
    if (IGNORED_VALUES.has(name)) continue

    cards.push({
      name,
      pool,
      section: layout.section,
      cell,
      draftAllocation: pool === 'draft' ? draftAllocationFor(layout.section, row) : undefined,
    })
  }

  return cards
}

function readArchiveSection(
  worksheet: ExcelJS.Worksheet,
  layout: ArchiveSectionLayout,
  pool: WorkbookPool,
): ExtractedArchiveEntry[] {
  assertSectionLabel(worksheet, layout)
  const entries: ExtractedArchiveEntry[] = []

  for (let row = layout.startRow; row <= worksheet.rowCount; row += 1) {
    const cell = `${layout.cardColumn}${row}`
    const name = cellText(worksheet, cell)
    if (!name || IGNORED_VALUES.has(name)) continue

    entries.push({ name, pool, section: layout.section, cell })
  }

  return entries
}

export async function extractWorkbook(workbookPath: string): Promise<ExtractedWorkbook> {
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.readFile(workbookPath)

  const cubeSheet = requireSheet(workbook, CUBE_SHEET)
  const archiveSheet = requireSheet(workbook, ARCHIVE_SHEET)

  return {
    draftCards: DRAFT_SECTIONS.flatMap((section) =>
      readActiveSection(cubeSheet, section, 'draft'),
    ),
    commanders: COMMANDER_SECTIONS.flatMap((section) =>
      readActiveSection(cubeSheet, section, 'commander'),
    ),
    archive: [
      ...ARCHIVE_DRAFT_SECTIONS.flatMap((section) =>
        readArchiveSection(archiveSheet, section, 'draft'),
      ),
      ...ARCHIVE_COMMANDER_SECTIONS.flatMap((section) =>
        readArchiveSection(archiveSheet, section, 'commander'),
      ),
    ],
  }
}
