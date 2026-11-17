import { BASIC_LANDS, type BasicLandCounts } from './deck'

/** A preview-only card. This data never changes the draft or the deck. */
export interface SampleHandCard {
  id: string
  name: string
  manaCost?: string
  typeLine: string
  imageUri?: string
  basicLand?: boolean
}

export interface SampleHandSourceCard {
  oracleId: string
  name: string
  manaCost?: string
  typeLine: string
  imageUri?: string
}

/** Include only the main-deck cards and each explicitly added basic land. */
export function sampleDeckCards(
  selectedCards: readonly SampleHandSourceCard[],
  basics: BasicLandCounts,
): SampleHandCard[] {
  return [
    ...selectedCards.map((card) => ({
      id: card.oracleId,
      name: card.name,
      manaCost: card.manaCost,
      typeLine: card.typeLine,
      imageUri: card.imageUri,
    })),
    ...BASIC_LANDS.flatMap((name) => Array.from(
      { length: Math.max(0, Math.trunc(basics[name])) },
      (_, index): SampleHandCard => ({
        id: `basic:${name}:${index}`,
        name,
        typeLine: `Basic Land — ${name}`,
        basicLand: true,
      }),
    )),
  ]
}

/** Fisher–Yates shuffle; preserves individual copies and leaves the source untouched. */
export function shuffleSampleDeck<T>(cards: readonly T[], random: () => number = Math.random): T[] {
  const shuffled = [...cards]
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1))
    ;[shuffled[index], shuffled[swap]] = [shuffled[swap], shuffled[index]]
  }
  return shuffled
}
