export const COLOR_SYMBOLS = ['W', 'U', 'B', 'R', 'G'] as const

export type ColorSymbol = (typeof COLOR_SYMBOLS)[number]
export type ColorIdentity = readonly ColorSymbol[]

export interface CubeCard {
  oracleId: string
  name: string
  colorIdentity: ColorIdentity
  isLand: boolean
}

export interface CubeDefinition {
  draftCards: readonly CubeCard[]
  commanders: readonly CubeCard[]
}

export interface ArchiveEntry {
  card: CubeCard
  source: 'workbook' | 'history'
}

export interface CubeSnapshot {
  id: string
  createdAt: string
  note?: string
  rulesRevision: string
  draftCards: readonly CubeCard[]
  commanders: readonly CubeCard[]
}
