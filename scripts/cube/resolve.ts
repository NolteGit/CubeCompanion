import { resolve } from 'node:path'
import { extractWorkbook, WORKBOOK_PATH } from '../../src/infrastructure/excel/index.ts'
import { DEFAULT_SCRYFALL_CACHE_PATH, resolveExtractedWorkbook } from '../../src/infrastructure/scryfall/index.ts'
import type { UnresolvedCard, UnresolvedLocation } from '../../src/infrastructure/scryfall/types.ts'

const extracted = await extractWorkbook(resolve(process.cwd(), WORKBOOK_PATH))
const resolved = await resolveExtractedWorkbook(extracted, { suggestCorrections: true })

console.log('Scryfall card resolution')
console.log(`Draft:      ${resolved.draftCards.length}/${extracted.draftCards.length}`)
console.log(`Commanders: ${resolved.commanders.length}/${extracted.commanders.length}`)
console.log(`Archive:    ${resolved.archive.length}/${extracted.archive.length}`)
console.log(`Unique:     ${resolved.stats.resolvedUniqueCards}`)
console.log(`Fetched:    ${resolved.stats.fetchedCount}`)
console.log(`Cache hits: ${resolved.stats.cacheHitCount}`)
console.log(`Suggestions: ${resolved.stats.suggestedCorrections}`)
console.log(`Cache:      ${DEFAULT_SCRYFALL_CACHE_PATH}`)

function formatLocation(location: UnresolvedLocation): string {
  const sheet = location.source === 'cube' ? 'Cube' : 'Archive'
  return `${sheet}!${location.cell}`
}

function printUnresolved(title: string, entries: readonly UnresolvedCard[]): void {
  if (entries.length === 0) return
  console.error(`${title}: ${entries.length}`)
  for (const entry of entries) {
    const suggestion = entry.suggestion ? ` -> did you mean "${entry.suggestion}"?` : ''
    console.error(`- ${entry.name} (${entry.locations.map(formatLocation).join(', ')})${suggestion}`)
  }
}

const activeUnresolved = resolved.unresolved.filter((entry) =>
  entry.locations.some((location) => location.source === 'cube'),
)
const archiveOnlyUnresolved = resolved.unresolved.filter((entry) =>
  entry.locations.every((location) => location.source === 'archive'),
)

if (resolved.unresolved.length > 0) {
  printUnresolved('Active cube unresolved', activeUnresolved)
  printUnresolved('Archive-only unresolved', archiveOnlyUnresolved)
  process.exitCode = activeUnresolved.length > 0 ? 1 : 0
} else {
  console.log('Unresolved: 0')
}
