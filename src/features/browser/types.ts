import type { ColorIdentity, CubeCard, DraftSection, GuildKey } from '../../domain'

export type BrowserPool = 'draft' | 'commanders'
export type BrowserView = 'list' | 'images'
export type BrowserSort = 'cube' | 'name' | 'mana'
export type CardTypeFilter =
  | 'all'
  | 'creature'
  | 'instant'
  | 'sorcery'
  | 'artifact'
  | 'enchantment'
  | 'planeswalker'
  | 'land'

export interface CardMetadataView {
  oracleId: string
  name: string
  colorIdentity: ColorIdentity
  manaValue: number
  manaCost: string
  typeLine: string
  oracleText: string
  isLand: boolean
  imageUri?: string
  scryfallUri: string
}

export interface BrowserCard extends CubeCard, CardMetadataView {
  sourceIndex: number
}

export interface ReleaseInfo {
  snapshotId: string
  publishedAt: string
  rulesRevision: string
  note?: string
}

export interface CurrentCubeData {
  release: ReleaseInfo
  snapshot: {
    id: string
    createdAt: string
    rulesRevision: string
    draftCards: CubeCard[]
    commanders: CubeCard[]
  }
}

export interface MetadataFile {
  version: 1
  cards: CardMetadataView[]
}

export interface SectionOption {
  value: string
  label: string
}

export interface BrowserFilters {
  query: string
  section: string
  type: CardTypeFilter
  sort: BrowserSort
}

export interface CardGroup {
  key: string
  label: string
  cards: BrowserCard[]
}

export interface DraftAllocationLabel {
  section: DraftSection
  guild?: GuildKey
}
