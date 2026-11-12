export const COLOR_SYMBOLS = ['W', 'U', 'B', 'R', 'G'] as const
export const GUILD_KEYS = ['WU', 'UB', 'BR', 'RG', 'WG', 'WB', 'UR', 'BG', 'WR', 'UG'] as const

export type ColorSymbol = (typeof COLOR_SYMBOLS)[number]
export type ColorIdentity = readonly ColorSymbol[]
export type GuildKey = (typeof GUILD_KEYS)[number]
export type DraftSection =
  | 'white'
  | 'blue'
  | 'black'
  | 'red'
  | 'green'
  | 'colorless'
  | 'multicolor'
  | 'land'

export interface DraftAllocation {
  section: DraftSection
  guild?: GuildKey
}

export interface CubeCard {
  oracleId: string
  name: string
  colorIdentity: ColorIdentity
  isLand: boolean
  draftAllocation?: DraftAllocation
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
