interface ScryfallImageUris {
  normal?: string
}

interface ScryfallCardFace {
  name: string
  type_line?: string
  image_uris?: ScryfallImageUris
}

export interface ScryfallCardResponse {
  oracle_id: string
  name: string
  cmc: number
  mana_cost?: string
  type_line: string
  oracle_text?: string
  color_identity: string[]
  image_uris?: ScryfallImageUris
  card_faces?: ScryfallCardFace[]
  scryfall_uri: string
}

export interface ScryfallIdentifier {
  name: string
}

export interface ScryfallCollectionResponse {
  data: ScryfallCardResponse[]
  not_found?: ScryfallIdentifier[]
  warnings?: string[]
}
