import { GUILD_KEYS, type DraftAllocation, type DraftSection } from '../../domain'
import type { WorkbookSection } from './types'

export interface ActiveSectionLayout {
  section: WorkbookSection
  labelCell: string
  expectedLabel: string
  cardColumn: string
  startRow: number
  endRow: number
  stopAtBlank: boolean
}

export interface ArchiveSectionLayout {
  section: string
  labelCell: string
  expectedLabel: string
  cardColumn: string
  startRow: number
}

export const WORKBOOK_PATH = 'source/CubeUebersicht.xlsx'
export const CUBE_SHEET = 'Cube'
export const ARCHIVE_SHEET = 'Archive'

export const DRAFT_SECTIONS: ActiveSectionLayout[] = [
  { section: 'white', labelCell: 'A2', expectedLabel: 'White', cardColumn: 'B', startRow: 4, endRow: 76, stopAtBlank: false },
  { section: 'blue', labelCell: 'D2', expectedLabel: 'Blue', cardColumn: 'E', startRow: 4, endRow: 76, stopAtBlank: false },
  { section: 'black', labelCell: 'G2', expectedLabel: 'Black', cardColumn: 'H', startRow: 4, endRow: 76, stopAtBlank: false },
  { section: 'red', labelCell: 'J2', expectedLabel: 'Red', cardColumn: 'K', startRow: 4, endRow: 76, stopAtBlank: false },
  { section: 'green', labelCell: 'M2', expectedLabel: 'Green', cardColumn: 'N', startRow: 4, endRow: 76, stopAtBlank: false },
  { section: 'colorless', labelCell: 'P2', expectedLabel: 'Colorless', cardColumn: 'Q', startRow: 4, endRow: 76, stopAtBlank: false },
  { section: 'multicolor', labelCell: 'S2', expectedLabel: 'Multicolor', cardColumn: 'T', startRow: 4, endRow: 76, stopAtBlank: false },
  { section: 'land', labelCell: 'V2', expectedLabel: 'Land', cardColumn: 'W', startRow: 4, endRow: 76, stopAtBlank: false },
]


const SIMPLE_DRAFT_SECTIONS = new Set<DraftSection>([
  'white',
  'blue',
  'black',
  'red',
  'green',
  'colorless',
])

export function draftAllocationFor(
  section: WorkbookSection,
  row: number,
): DraftAllocation | undefined {
  if (SIMPLE_DRAFT_SECTIONS.has(section as DraftSection)) {
    return { section: section as DraftSection }
  }

  if (section !== 'multicolor' && section !== 'land') return undefined

  const guildIndex = Math.floor((row - 4) / 4)
  const guild = row >= 4 && row <= 43 ? GUILD_KEYS[guildIndex] : undefined
  return guild ? { section, guild } : { section }
}

export const COMMANDER_SECTIONS: ActiveSectionLayout[] = [
  { section: 'white', labelCell: 'A78', expectedLabel: 'White', cardColumn: 'B', startRow: 79, endRow: 150, stopAtBlank: true },
  { section: 'blue', labelCell: 'D78', expectedLabel: 'Blue', cardColumn: 'E', startRow: 79, endRow: 150, stopAtBlank: true },
  { section: 'black', labelCell: 'G78', expectedLabel: 'Black', cardColumn: 'H', startRow: 79, endRow: 150, stopAtBlank: true },
  { section: 'red', labelCell: 'J78', expectedLabel: 'Red', cardColumn: 'K', startRow: 79, endRow: 150, stopAtBlank: true },
  { section: 'green', labelCell: 'M78', expectedLabel: 'Green', cardColumn: 'N', startRow: 79, endRow: 150, stopAtBlank: true },
  { section: 'colorless', labelCell: 'P78', expectedLabel: 'Colorless', cardColumn: 'Q', startRow: 79, endRow: 150, stopAtBlank: true },
  { section: 'dual', labelCell: 'S78', expectedLabel: 'DualColor', cardColumn: 'T', startRow: 79, endRow: 150, stopAtBlank: true },
  { section: 'triple', labelCell: 'V78', expectedLabel: 'Triplecolor', cardColumn: 'W', startRow: 79, endRow: 150, stopAtBlank: true },
]

export const ARCHIVE_DRAFT_SECTIONS: ArchiveSectionLayout[] = [
  { section: 'white', labelCell: 'A2', expectedLabel: 'White', cardColumn: 'A', startRow: 3 },
  { section: 'blue', labelCell: 'B2', expectedLabel: 'Blue', cardColumn: 'B', startRow: 3 },
  { section: 'black', labelCell: 'C2', expectedLabel: 'Black', cardColumn: 'C', startRow: 3 },
  { section: 'red', labelCell: 'D2', expectedLabel: 'Red', cardColumn: 'D', startRow: 3 },
  { section: 'green', labelCell: 'E2', expectedLabel: 'Green', cardColumn: 'E', startRow: 3 },
  { section: 'colorless', labelCell: 'F2', expectedLabel: 'Colorless', cardColumn: 'F', startRow: 3 },
  { section: 'multicolor', labelCell: 'G2', expectedLabel: 'Multicolor', cardColumn: 'G', startRow: 3 },
  { section: 'land', labelCell: 'H2', expectedLabel: 'Lands', cardColumn: 'H', startRow: 3 },
]

export const ARCHIVE_COMMANDER_SECTIONS: ArchiveSectionLayout[] = [
  { section: 'white', labelCell: 'J2', expectedLabel: 'White', cardColumn: 'J', startRow: 3 },
  { section: 'blue', labelCell: 'K2', expectedLabel: 'Blue', cardColumn: 'K', startRow: 3 },
  { section: 'black', labelCell: 'L2', expectedLabel: 'Black', cardColumn: 'L', startRow: 3 },
  { section: 'red', labelCell: 'M2', expectedLabel: 'Red', cardColumn: 'M', startRow: 3 },
  { section: 'green', labelCell: 'N2', expectedLabel: 'Green', cardColumn: 'N', startRow: 3 },
  { section: 'dual', labelCell: 'O2', expectedLabel: 'Dualcolor', cardColumn: 'O', startRow: 3 },
  { section: 'multicolor', labelCell: 'P2', expectedLabel: 'Multicolor', cardColumn: 'P', startRow: 3 },
]
