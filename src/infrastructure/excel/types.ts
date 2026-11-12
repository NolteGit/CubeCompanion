export type WorkbookPool = 'draft' | 'commander'

export type WorkbookSection =
  | 'white'
  | 'blue'
  | 'black'
  | 'red'
  | 'green'
  | 'colorless'
  | 'multicolor'
  | 'land'
  | 'dual'
  | 'triple'

export interface ExtractedCard {
  name: string
  pool: WorkbookPool
  section: WorkbookSection
  cell: string
}

export interface ExtractedArchiveEntry {
  name: string
  pool: WorkbookPool
  section: string
  cell: string
}

export interface ExtractedWorkbook {
  draftCards: ExtractedCard[]
  commanders: ExtractedCard[]
  archive: ExtractedArchiveEntry[]
}
