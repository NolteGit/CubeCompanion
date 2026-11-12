import type { ExtractedArchiveEntry, ExtractedCard, ExtractedWorkbook } from '../excel'
import { cardLookupKey, resolveCardNames, suggestCardNames } from './client'
import type {
  ResolveWorkbookOptions,
  ResolvedSourceCard,
  ResolvedWorkbook,
  UnresolvedCard,
  UnresolvedLocation,
  WorkbookEntry,
} from './types'

interface LocatedEntry {
  entry: WorkbookEntry
  location: UnresolvedLocation
}

function resolveEntries<TSource extends WorkbookEntry>(
  entries: readonly TSource[],
  cards: Awaited<ReturnType<typeof resolveCardNames>>['cards'],
): ResolvedSourceCard<TSource>[] {
  return entries.flatMap((source) => {
    const card = cards.get(cardLookupKey(source.name))
    return card ? [{ source, card }] : []
  })
}

function unresolvedEntries(
  entries: readonly LocatedEntry[],
  unresolvedNames: readonly string[],
  suggestions: ReadonlyMap<string, string>,
): UnresolvedCard[] {
  const unresolvedKeys = new Set(unresolvedNames.map(cardLookupKey))
  const locations = new Map<string, { name: string; locations: UnresolvedLocation[] }>()

  for (const { entry, location } of entries) {
    const key = cardLookupKey(entry.name)
    if (!unresolvedKeys.has(key)) continue

    const current = locations.get(key) ?? { name: entry.name, locations: [] }
    current.locations.push(location)
    locations.set(key, current)
  }

  return [...locations.entries()]
    .map(([key, { name, locations: entryLocations }]) => ({
      name,
      locations: entryLocations,
      suggestion: suggestions.get(key),
    }))
    .sort((left, right) => left.name.localeCompare(right.name))
}

export async function resolveExtractedWorkbook(
  workbook: ExtractedWorkbook,
  options: ResolveWorkbookOptions = {},
): Promise<ResolvedWorkbook> {
  const locatedEntries: LocatedEntry[] = [
    ...workbook.draftCards.map((entry) => ({
      entry,
      location: { source: 'cube' as const, pool: entry.pool, cell: entry.cell },
    })),
    ...workbook.commanders.map((entry) => ({
      entry,
      location: { source: 'cube' as const, pool: entry.pool, cell: entry.cell },
    })),
    ...workbook.archive.map((entry) => ({
      entry,
      location: { source: 'archive' as const, pool: entry.pool, cell: entry.cell },
    })),
  ]
  const resolution = await resolveCardNames(
    locatedEntries.map(({ entry }) => entry.name),
    options,
  )
  const suggestions = options.suggestCorrections
    ? await suggestCardNames(resolution.unresolvedNames, options)
    : new Map<string, string>()

  return {
    draftCards: resolveEntries<ExtractedCard>(workbook.draftCards, resolution.cards),
    commanders: resolveEntries<ExtractedCard>(workbook.commanders, resolution.cards),
    archive: resolveEntries<ExtractedArchiveEntry>(workbook.archive, resolution.cards),
    unresolved: unresolvedEntries(locatedEntries, resolution.unresolvedNames, suggestions),
    stats: {
      resolvedUniqueCards: resolution.cards.size,
      fetchedCount: resolution.fetchedCount,
      cacheHitCount: resolution.cacheHitCount,
      suggestedCorrections: suggestions.size,
    },
  }
}
