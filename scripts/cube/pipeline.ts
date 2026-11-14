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
  type ExtractedArchiveEntry,
  type ExtractedIdeaEntry,
  type ExtractedWorkbook,
} from '../../src/infrastructure/excel/index.ts'
import {
  cardLookupKey,
  resolveCardNames,
  resolveExtractedWorkbook,
  suggestCardNames,
  type CardMetadata,
  type ResolveWorkbookOptions,
  type UnresolvedCard,
} from '../../src/infrastructure/scryfall/index.ts'

export interface PreparedIdea extends ExtractedIdeaEntry {
  oracleId?: string
}

export interface PreparedCubeSource {
  cube?: CubeDefinition
  validation?: ValidationResult
  unresolved: readonly UnresolvedCard[]
  metadata: readonly CardMetadata[]
  archive: readonly ExtractedArchiveEntry[]
  ideas: readonly PreparedIdea[]
  unresolvedIdeas: readonly string[]
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
  return { ...workbook, archive: [], ideas: [] }
}

function toCubeCard(
  card: CardMetadata,
  draftAllocation?: CubeCard['draftAllocation'],
): CubeCard {
  return {
    oracleId: card.oracleId,
    name: card.name,
    colorIdentity: card.colorIdentity,
    isLand: card.isLand,
    draftAllocation,
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
  const extractedWorkbook = await extractWorkbook(workbookPath)
  const extracted = activeOnly(extractedWorkbook)
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

  const ideaResolution = await resolveCardNames(
    extractedWorkbook.ideas.map((entry) => entry.name),
    resolutionOptions,
  )
  const ideas: PreparedIdea[] = extractedWorkbook.ideas.map((entry) => {
    const card = ideaResolution.cards.get(cardLookupKey(entry.name))
    return card ? { ...entry, oracleId: card.oracleId } : entry
  })
  const metadata = uniqueMetadata([
    ...resolved.draftCards.map(({ card }) => card),
    ...resolved.commanders.map(({ card }) => card),
    ...ideaResolution.cards.values(),
  ])
  const combinedResolution = {
    fetchedCount: resolved.stats.fetchedCount + ideaResolution.fetchedCount,
    cacheHitCount: resolved.stats.cacheHitCount + ideaResolution.cacheHitCount,
    resolvedUniqueCards: metadata.length,
  }

  if (unresolved.length > 0) {
    return {
      unresolved,
      metadata,
      archive: extractedWorkbook.archive,
      ideas,
      unresolvedIdeas: ideaResolution.unresolvedNames,
      resolution: combinedResolution,
    }
  }

  const cube: CubeDefinition = {
    draftCards: resolved.draftCards.map(({ card, source }) =>
      toCubeCard(card, source.draftAllocation),
    ),
    commanders: resolved.commanders.map(({ card }) => toCubeCard(card)),
  }

  return {
    cube,
    validation: validateCube(cube, DEFAULT_CUBE_RULES),
    unresolved,
    metadata,
    archive: extractedWorkbook.archive,
    ideas,
    unresolvedIdeas: ideaResolution.unresolvedNames,
    resolution: combinedResolution,
  }
}
