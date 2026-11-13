export const DRAFT_PACK_COUNT = 4
export const DRAFT_PACK_SIZE = 15
export const COMMANDER_PACK_SIZE = 5

export type RandomSource = () => number

export function sampleWithoutReplacement<T>(
  items: readonly T[],
  count: number,
  random: RandomSource = Math.random,
): T[] {
  if (!Number.isInteger(count) || count < 0) {
    throw new Error(`Sample size must be a non-negative integer; received ${count}.`)
  }
  if (count > items.length) {
    throw new Error(`Cannot sample ${count} items from a pool of ${items.length}.`)
  }

  const shuffled = [...items]
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1))
    const current = shuffled[index]
    shuffled[index] = shuffled[swapIndex]
    shuffled[swapIndex] = current
  }

  return shuffled.slice(0, count)
}

export function dealDraftPacks<T>(
  cards: readonly T[],
  random: RandomSource = Math.random,
): T[][] {
  const totalCards = DRAFT_PACK_COUNT * DRAFT_PACK_SIZE
  const dealt = sampleWithoutReplacement(cards, totalCards, random)

  return Array.from({ length: DRAFT_PACK_COUNT }, (_, packIndex) => {
    const start = packIndex * DRAFT_PACK_SIZE
    return dealt.slice(start, start + DRAFT_PACK_SIZE)
  })
}

export function dealCommanderPack<T>(
  cards: readonly T[],
  random: RandomSource = Math.random,
): T[] {
  return sampleWithoutReplacement(cards, COMMANDER_PACK_SIZE, random)
}
