import type { ValidationResult } from '../../src/domain/index.ts'
import type { UnresolvedCard, UnresolvedLocation } from '../../src/infrastructure/scryfall/index.ts'
import type { PreparedCubeSource } from './pipeline.ts'

function formatLocation(location: UnresolvedLocation): string {
  return `Cube!${location.cell}`
}

export function printPreparedCube(result: PreparedCubeSource): void {
  console.log(`Resolved unique: ${result.resolution.resolvedUniqueCards}`)
  console.log(`Fetched:         ${result.resolution.fetchedCount}`)
  console.log(`Cache hits:      ${result.resolution.cacheHitCount}`)
}

export function printUnresolved(entries: readonly UnresolvedCard[]): void {
  console.error(`Unresolved active cards: ${entries.length}`)
  for (const entry of entries) {
    const suggestion = entry.suggestion ? ` -> did you mean "${entry.suggestion}"?` : ''
    console.error(`- ${entry.name} (${entry.locations.map(formatLocation).join(', ')})${suggestion}`)
  }
}

export function printValidationIssues(validation: ValidationResult): void {
  console.error(`Cube validation failed: ${validation.issues.length} issue(s)`)
  for (const issue of validation.issues) {
    const cards = issue.cards?.length ? ` [${issue.cards.join(', ')}]` : ''
    console.error(`- ${issue.message}${cards}`)
  }
}
