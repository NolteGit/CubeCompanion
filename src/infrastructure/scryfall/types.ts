import type { ColorIdentity } from '../../domain'
import type {
  ExtractedArchiveEntry,
  ExtractedCard,
  ExtractedWorkbook,
  WorkbookPool,
} from '../excel'

export interface CardMetadata {
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

export interface ResolvedSourceCard<TSource = ExtractedCard> {
  source: TSource
  card: CardMetadata
}

export interface UnresolvedLocation {
  source: 'cube' | 'archive'
  pool: WorkbookPool
  cell: string
}

export interface UnresolvedCard {
  name: string
  locations: readonly UnresolvedLocation[]
  suggestion?: string
}

export interface ResolutionStats {
  resolvedUniqueCards: number
  fetchedCount: number
  cacheHitCount: number
  suggestedCorrections: number
}

export interface ResolvedWorkbook {
  draftCards: readonly ResolvedSourceCard[]
  commanders: readonly ResolvedSourceCard[]
  archive: readonly ResolvedSourceCard<ExtractedArchiveEntry>[]
  unresolved: readonly UnresolvedCard[]
  stats: ResolutionStats
}

export interface CardResolution {
  cards: ReadonlyMap<string, CardMetadata>
  unresolvedNames: readonly string[]
  fetchedCount: number
  cacheHitCount: number
}

export interface ResolveWorkbookOptions {
  cachePath?: string
  fetchImpl?: typeof fetch
  refresh?: boolean
  requestDelayMs?: number
  suggestCorrections?: boolean
}

export type WorkbookEntry =
  | ExtractedWorkbook['draftCards'][number]
  | ExtractedWorkbook['commanders'][number]
  | ExtractedWorkbook['archive'][number]
