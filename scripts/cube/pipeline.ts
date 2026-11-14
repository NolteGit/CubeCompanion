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
  ideaIssues: readonly string[]
  unresolvedIdeas: readonly string[]
  unresolvedArchive: readonly string[]
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

function ideaPoolLabel(pool: PreparedIdea['pool']): string {
  return pool === 'draft' ? 'Cube Maybe' : 'Commander Maybe'
}

export function validateIdeasAgainstActiveCube(
  ideas: readonly PreparedIdea[],
  activeCards: readonly CubeCard[],
): string[] {
  const issues: string[] = []
  const activeIds = new Set(activeCards.map((card) => card.oracleId))
  const groups = new Map<string, PreparedIdea[]>()

  for (const idea of ideas) {
    const logicalKey = idea.oracleId ?? cardLookupKey(idea.name)
    const groupKey = `${idea.pool}:${logicalKey}`
    const group = groups.get(groupKey) ?? []
    group.push(idea)
    groups.set(groupKey, group)

    if (idea.oracleId && activeIds.has(idea.oracleId)) {
      issues.push(
        `${ideaPoolLabel(idea.pool)} card "${idea.name}" at Cube!${idea.cell} is already active in the current cube.`,
      )
    }
  }

  for (const group of groups.values()) {
    if (group.length < 2) continue
    issues.push(
      `${ideaPoolLabel(group[0].pool)} contains duplicate idea "${group[0].name}" at ${group
        .map((idea) => `Cube!${idea.cell}`)
        .join(', ')}.`,
    )
  }

  return issues
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
  const activeCards = [
    ...resolved.draftCards.map(({ card, source }) =>
      toCubeCard(card, source.draftAllocation),
    ),
    ...resolved.commanders.map(({ card }) => toCubeCard(card)),
  ]
  const ideaIssues = validateIdeasAgainstActiveCube(ideas, activeCards)

  const archiveResolution = await resolveCardNames(
    extractedWorkbook.archive.map((entry) => entry.name),
    resolutionOptions,
  )

  const metadata = uniqueMetadata([
    ...resolved.draftCards.map(({ card }) => card),
    ...resolved.commanders.map(({ card }) => card),
    ...ideaResolution.cards.values(),
    ...archiveResolution.cards.values(),
  ])
  const combinedResolution = {
    fetchedCount:
      resolved.stats.fetchedCount +
      ideaResolution.fetchedCount +
      archiveResolution.fetchedCount,
    cacheHitCount:
      resolved.stats.cacheHitCount +
      ideaResolution.cacheHitCount +
      archiveResolution.cacheHitCount,
    resolvedUniqueCards: metadata.length,
  }

  if (unresolved.length > 0) {
    return {
      unresolved,
      metadata,
      archive: extractedWorkbook.archive,
      ideas,
      ideaIssues,
      unresolvedIdeas: ideaResolution.unresolvedNames,
      unresolvedArchive: archiveResolution.unresolvedNames,
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
    ideaIssues,
    unresolvedIdeas: ideaResolution.unresolvedNames,
    unresolvedArchive: archiveResolution.unresolvedNames,
    resolution: combinedResolution,
  }
}
