import type { ColorSymbol } from '../../domain'
import { DEFAULT_SCRYFALL_CACHE_PATH, readCardCache, writeCardCache } from './cache'
import type { ScryfallCardResponse, ScryfallCollectionResponse } from './apiTypes'
import type { CardMetadata, CardResolution, ResolveWorkbookOptions } from './types'

const COLLECTION_URL = 'https://api.scryfall.com/cards/collection'
const NAMED_URL = 'https://api.scryfall.com/cards/named'
const COLLECTION_LIMIT = 75
const DEFAULT_REQUEST_DELAY_MS = 125
const DEFAULT_FUZZY_REQUEST_DELAY_MS = 550
const USER_AGENT = 'CubeCompanion/0.1 (https://github.com/NolteGit/CubeCompanion)'
const COLOR_SYMBOLS = new Set<ColorSymbol>(['W', 'U', 'B', 'R', 'G'])

export function cardLookupKey(name: string): string {
  return name.trim().toLocaleLowerCase('en-US')
}

function chunk<T>(items: readonly T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size))
  }
  return chunks
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds))
}

function cardImageUri(card: ScryfallCardResponse): string | undefined {
  return (
    card.image_uris?.normal ??
    card.card_faces?.find((face) => face.image_uris?.normal)?.image_uris?.normal
  )
}

function isLand(card: ScryfallCardResponse): boolean {
  return (
    card.type_line.includes('Land') ||
    card.card_faces?.some((face) => face.type_line?.includes('Land')) === true
  )
}

function toCardMetadata(card: ScryfallCardResponse): CardMetadata {
  return {
    oracleId: card.oracle_id,
    name: card.name,
    colorIdentity: card.color_identity.filter(
      (symbol): symbol is ColorSymbol => COLOR_SYMBOLS.has(symbol as ColorSymbol),
    ),
    manaValue: card.cmc,
    manaCost: card.mana_cost ?? '',
    typeLine: card.type_line,
    oracleText: card.oracle_text ?? '',
    isLand: isLand(card),
    imageUri: cardImageUri(card),
    scryfallUri: card.scryfall_uri,
  }
}

function cardAliases(card: ScryfallCardResponse): string[] {
  return [card.name, ...(card.card_faces?.map((face) => face.name) ?? [])]
}

async function fetchCollection(
  names: readonly string[],
  fetchImpl: typeof fetch,
): Promise<ScryfallCollectionResponse> {
  const response = await fetchImpl(COLLECTION_URL, {
    method: 'POST',
    headers: {
      Accept: 'application/json;q=0.9,*/*;q=0.8',
      'Content-Type': 'application/json',
      'User-Agent': USER_AGENT,
    },
    body: JSON.stringify({ identifiers: names.map((name) => ({ name })) }),
  })

  if (!response.ok) {
    throw new Error(`Scryfall collection request failed: ${response.status} ${response.statusText}`)
  }

  return (await response.json()) as ScryfallCollectionResponse
}

export async function suggestCardNames(
  names: readonly string[],
  options: Pick<ResolveWorkbookOptions, 'fetchImpl' | 'requestDelayMs'> = {},
): Promise<ReadonlyMap<string, string>> {
  const fetchImpl = options.fetchImpl ?? fetch
  const requestDelayMs = options.requestDelayMs ?? DEFAULT_FUZZY_REQUEST_DELAY_MS
  const suggestions = new Map<string, string>()
  const uniqueNames = [...new Map(names.map((name) => [cardLookupKey(name), name.trim()])).values()]

  for (const name of uniqueNames) {
    if (requestDelayMs > 0) await delay(requestDelayMs)

    const response = await fetchImpl(`${NAMED_URL}?fuzzy=${encodeURIComponent(name)}`, {
      headers: {
        Accept: 'application/json;q=0.9,*/*;q=0.8',
        'User-Agent': USER_AGENT,
      },
    })

    if (response.status === 404) continue
    if (!response.ok) {
      throw new Error(`Scryfall fuzzy lookup failed: ${response.status} ${response.statusText}`)
    }

    const card = (await response.json()) as ScryfallCardResponse
    if (cardLookupKey(card.name) !== cardLookupKey(name)) {
      suggestions.set(cardLookupKey(name), card.name)
    }
  }

  return suggestions
}

export async function resolveCardNames(
  names: readonly string[],
  options: ResolveWorkbookOptions = {},
): Promise<CardResolution> {
  const cachePath = options.cachePath ?? DEFAULT_SCRYFALL_CACHE_PATH
  const fetchImpl = options.fetchImpl ?? fetch
  const requestDelayMs = options.requestDelayMs ?? DEFAULT_REQUEST_DELAY_MS
  const uniqueNames = [...new Map(names.map((name) => [cardLookupKey(name), name.trim()])).values()]
  const cache = options.refresh ? {} : await readCardCache(cachePath)
  const resolved = new Map<string, CardMetadata>()
  const missing: string[] = []
  let cacheHitCount = 0

  for (const name of uniqueNames) {
    const key = cardLookupKey(name)
    const cached = cache[key]
    if (cached) {
      resolved.set(key, cached)
      cacheHitCount += 1
    } else {
      missing.push(name)
    }
  }

  let fetchedCount = 0
  const unresolved = new Set<string>()
  const batches = chunk(missing, COLLECTION_LIMIT)

  for (let batchIndex = 0; batchIndex < batches.length; batchIndex += 1) {
    if (batchIndex > 0 && requestDelayMs > 0) await delay(requestDelayMs)

    const batch = batches[batchIndex]
    const response = await fetchCollection(batch, fetchImpl)
    const aliases = new Map<string, CardMetadata>()

    for (const card of response.data) {
      const metadata = toCardMetadata(card)
      for (const alias of cardAliases(card)) aliases.set(cardLookupKey(alias), metadata)
    }

    for (const name of batch) {
      const key = cardLookupKey(name)
      const metadata = aliases.get(key)
      if (!metadata) {
        unresolved.add(name)
        continue
      }

      resolved.set(key, metadata)
      cache[key] = metadata
      fetchedCount += 1
    }

    for (const identifier of response.not_found ?? []) unresolved.add(identifier.name)
  }

  if (fetchedCount > 0) await writeCardCache(cachePath, cache)

  return {
    cards: resolved,
    unresolvedNames: [...unresolved].sort((left, right) => left.localeCompare(right)),
    fetchedCount,
    cacheHitCount,
  }
}
