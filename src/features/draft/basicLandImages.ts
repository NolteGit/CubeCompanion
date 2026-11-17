import type { BasicLand } from '../../domain/draft/deck'

// Scryfall's named-card image endpoint displays a real basic-land card.
// One URL per land is shared by the deck builder, opponent decks, and sample hands.
export const BASIC_LAND_IMAGE_URIS: Readonly<Record<BasicLand, string>> = {
  Plains: 'https://api.scryfall.com/cards/named?exact=Plains&format=image&version=normal',
  Island: 'https://api.scryfall.com/cards/named?exact=Island&format=image&version=normal',
  Swamp: 'https://api.scryfall.com/cards/named?exact=Swamp&format=image&version=normal',
  Mountain: 'https://api.scryfall.com/cards/named?exact=Mountain&format=image&version=normal',
  Forest: 'https://api.scryfall.com/cards/named?exact=Forest&format=image&version=normal',
  Wastes: 'https://api.scryfall.com/cards/named?exact=Wastes&format=image&version=normal',
}
