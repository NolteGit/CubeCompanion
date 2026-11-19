import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { CubeCard, CubeSnapshot } from '../../domain'
import {
  cardLookupKey,
  resolveCardNames,
  type CardMetadata,
  type ResolveWorkbookOptions,
} from '../scryfall'
import { DEFAULT_SNAPSHOT_PATHS } from './publisher'
import type { CardMetadataFile } from './types'

export interface HistoryMetadataOptions extends ResolveWorkbookOptions {
  historyDirectory?: string
}

interface HistoryMetadataResult {
  cards: CardMetadata[]
  added: number
  fetched: number
  cacheHits: number
}

function isMissingFile(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT'
}

/** Read the previously published metadata so releases can preserve historic cards. */
export async function readPublishedMetadata(
  path = DEFAULT_SNAPSHOT_PATHS.metadataPath,
): Promise<readonly CardMetadata[]> {
  let contents: string
  try {
    contents = await readFile(path, 'utf8')
  } catch (error) {
    if (isMissingFile(error)) return []
    throw error
  }
  const metadata = JSON.parse(contents) as CardMetadataFile
  if (metadata.version !== 1 || !Array.isArray(metadata.cards)) {
    throw new Error(`Invalid published metadata file: ${path}`)
  }
  return metadata.cards
}

async function historicalCards(directory: string): Promise<CubeCard[]> {
  let names: string[]
  try {
    names = (await readdir(directory)).filter((name) => name.endsWith('.json')).sort()
  } catch (error) {
    if (isMissingFile(error)) return []
    throw error
  }

  const unique = new Map<string, CubeCard>()
  for (const name of names) {
    const snapshot = JSON.parse(await readFile(join(directory, name), 'utf8')) as CubeSnapshot
    if (!Array.isArray(snapshot.draftCards) || !Array.isArray(snapshot.commanders)) {
      throw new Error(`Invalid cube history snapshot: ${name}`)
    }
    for (const card of [...snapshot.draftCards, ...snapshot.commanders]) {
      if (!unique.has(card.oracleId)) unique.set(card.oracleId, card)
    }
  }
  return [...unique.values()]
}

/** Include every card found in immutable history without changing the snapshots themselves. */
export async function completeHistoricalMetadata(
  current: readonly CardMetadata[],
  previous: readonly CardMetadata[] = [],
  options: HistoryMetadataOptions = {},
): Promise<HistoryMetadataResult> {
  const { historyDirectory = DEFAULT_SNAPSHOT_PATHS.historyDirectory, ...resolutionOptions } = options
  const byId = new Map(current.map((card) => [card.oracleId, card]))
  const initialCount = byId.size
  const previousById = new Map(previous.map((card) => [card.oracleId, card]))
  const missing: CubeCard[] = []

  for (const card of await historicalCards(historyDirectory)) {
    if (byId.has(card.oracleId)) continue
    const preserved = previousById.get(card.oracleId)
    if (preserved) byId.set(card.oracleId, preserved)
    else missing.push(card)
  }

  let fetched = 0
  let cacheHits = 0
  if (missing.length > 0) {
    const result = await resolveCardNames(missing.map((card) => card.name), resolutionOptions)
    const mismatches = missing.filter((card) =>
      result.cards.get(cardLookupKey(card.name))?.oracleId !== card.oracleId,
    )
    if (mismatches.length > 0) {
      throw new Error(
        `Cannot resolve historical cards by matching Oracle ID: ${mismatches.map((card) => card.name).join(', ')}`,
      )
    }
    for (const card of missing) {
      const metadata = result.cards.get(cardLookupKey(card.name))
      if (metadata) byId.set(card.oracleId, metadata)
    }
    fetched = result.fetchedCount
    cacheHits = result.cacheHitCount
  }

  return {
    cards: [...byId.values()].sort((left, right) => left.oracleId.localeCompare(right.oracleId)),
    added: byId.size - initialCount,
    fetched,
    cacheHits,
  }
}
