import { resolve } from 'node:path'
import {
  DEFAULT_CUBE_RULES,
  validateCube,
  type CubeCard,
  type CubeDefinition,
  type ValidationResult,
} from '../../src/domain/index.ts'
import {
  extractWorkbook,
  WORKBOOK_PATH,
  type ExtractedWorkbook,
} from '../../src/infrastructure/excel/index.ts'
import {
  cardLookupKey,
  resolveExtractedWorkbook,
  suggestCardNames,
  type CardMetadata,
  type ResolveWorkbookOptions,
  type UnresolvedCard,
} from '../../src/infrastructure/scryfall/index.ts'

export interface PreparedCubeSource {
  cube?: CubeDefinition
  validation?: ValidationResult
  unresolved: readonly UnresolvedCard[]
  metadata: readonly CardMetadata[]
  resolution: {
    fetchedCount: number
    cacheHitCount: number
    resolvedUniqueCards: number
  }
}

export interface PrepareCubeSourceOptions extends ResolveWorkbookOptions {
  workbookPath?: string
}

function activeOnly(workbook: ExtractedWorkbook): ExtractedWorkbook {
  return { ...workbook, archive: [] }
}

function toCubeCard(card: CardMetadata): CubeCard {
  return {
    oracleId: card.oracleId,
    name: card.name,
    colorIdentity: card.colorIdentity,
    isLand: card.isLand,
  }
}

function uniqueMetadata(cards: readonly CardMetadata[]): CardMetadata[] {
  return [...new Map(cards.map((card) => [card.oracleId, card])).values()]
}

export async function prepareCubeSource(
  options: PrepareCubeSourceOptions = {},
): Promise<PreparedCubeSource> {
  const { workbookPath: configuredPath, ...resolutionOptions } = options
  const workbookPath = configuredPath ?? resolve(process.cwd(), WORKBOOK_PATH)
  const extracted = activeOnly(await extractWorkbook(workbookPath))
  const resolved = await resolveExtractedWorkbook(extracted, {
    ...resolutionOptions,
    suggestCorrections: false,
  })

  let unresolved = [...resolved.unresolved]
  if (unresolved.length > 0 && options.suggestCorrections !== false) {
    const suggestions = await suggestCardNames(
      unresolved.map((entry) => entry.name),
      resolutionOptions,
    )
    unresolved = unresolved.map((entry) => ({
      ...entry,
      suggestion: suggestions.get(cardLookupKey(entry.name)),
    }))
  }

  const metadata = uniqueMetadata([
    ...resolved.draftCards.map(({ card }) => card),
    ...resolved.commanders.map(({ card }) => card),
  ])

  if (unresolved.length > 0) {
    return {
      unresolved,
      metadata,
      resolution: resolved.stats,
    }
  }

  const cube: CubeDefinition = {
    draftCards: resolved.draftCards.map(({ card }) => toCubeCard(card)),
    commanders: resolved.commanders.map(({ card }) => toCubeCard(card)),
  }

  return {
    cube,
    validation: validateCube(cube, DEFAULT_CUBE_RULES),
    unresolved,
    metadata,
    resolution: resolved.stats,
  }
}
