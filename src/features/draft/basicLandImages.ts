import type { BasicLand } from '../../domain/draft/deck'

// Pinned Scryfall CDN images avoid a named-card API redirect for every render.
// Shared by human decks, opponents and sample hands.
export const BASIC_LAND_IMAGE_URIS: Readonly<Record<BasicLand, string>> = {
  Plains: 'https://cards.scryfall.io/normal/front/0/9/09ac862f-0a51-44dd-b86f-9412b8218b13.jpg?1791578423',
  Island: 'https://cards.scryfall.io/normal/front/1/3/1335d293-3dd2-4f13-bd2c-22181f4528ee.jpg?1791578424',
  Swamp: 'https://cards.scryfall.io/normal/front/b/2/b233b117-9369-45c1-80c5-cc857386b6be.jpg?1791578437',
  Mountain: 'https://cards.scryfall.io/normal/front/8/5/85177bd7-6c50-48da-b692-ae5fe7bd357c.jpg?1791578439',
  Forest: 'https://cards.scryfall.io/normal/front/2/e/2e781bfd-f8cb-4d20-b977-4359f3a21311.jpg?1791578317',
  Wastes: 'https://cards.scryfall.io/normal/front/b/a/baf8f4f2-9f25-4cd2-8d78-1041e134aeac.jpg?1783906001',
}
