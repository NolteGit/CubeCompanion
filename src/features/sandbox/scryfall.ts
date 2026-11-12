import type { ColorSymbol } from '../../domain'
import type { BrowserCard } from '../browser/types'

interface ScryfallImageUris {
  normal?: string
}

interface ScryfallFace {
  mana_cost?: string
  oracle_text?: string
  image_uris?: ScryfallImageUris
}

interface ScryfallCardResponse {
  oracle_id: string
  name: string
  color_identity: string[]
  cmc: number
  mana_cost?: string
  type_line: string
  oracle_text?: string
  image_uris?: ScryfallImageUris
  card_faces?: ScryfallFace[]
  scryfall_uri: string
  details?: string
}

const COLOR_SYMBOLS = new Set<ColorSymbol>(['W', 'U', 'B', 'R', 'G'])

function colorIdentity(values: readonly string[]): ColorSymbol[] {
  return values.filter((value): value is ColorSymbol => COLOR_SYMBOLS.has(value as ColorSymbol))
}

function joinedFaceField(
  faces: readonly ScryfallFace[] | undefined,
  field: 'mana_cost' | 'oracle_text',
): string {
  return faces?.map((face) => face[field]).filter(Boolean).join(' // ') ?? ''
}

export async function lookupSandboxCard(
  name: string,
  fetchImpl: typeof fetch = fetch,
): Promise<BrowserCard> {
  const query = name.trim()
  if (!query) throw new Error('Enter a card name first.')

  const response = await fetchImpl(
    `https://api.scryfall.com/cards/named?fuzzy=${encodeURIComponent(query)}`,
    { headers: { Accept: 'application/json;q=0.9,*/*;q=0.8' } },
  )
  const data = await response.json() as ScryfallCardResponse

  if (!response.ok) {
    throw new Error(data.details ?? `Scryfall lookup failed with status ${response.status}.`)
  }

  const imageUri =
    data.image_uris?.normal ?? data.card_faces?.find((face) => face.image_uris?.normal)?.image_uris?.normal

  return {
    oracleId: data.oracle_id,
    name: data.name,
    colorIdentity: colorIdentity(data.color_identity),
    manaValue: data.cmc,
    manaCost: data.mana_cost ?? joinedFaceField(data.card_faces, 'mana_cost'),
    typeLine: data.type_line,
    oracleText: data.oracle_text ?? joinedFaceField(data.card_faces, 'oracle_text'),
    isLand: data.type_line.includes('Land'),
    imageUri,
    scryfallUri: data.scryfall_uri,
    sourceIndex: 0,
  }
}
