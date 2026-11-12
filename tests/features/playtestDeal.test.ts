import { describe, expect, it } from 'vitest'
import {
  COMMANDER_PACK_SIZE,
  DRAFT_PACK_COUNT,
  DRAFT_PACK_SIZE,
  dealCommanderPack,
  dealDraftPacks,
  sampleWithoutReplacement,
} from '../../src/features/playtest/deal'

const fixedRandom = () => 0.37

describe('playtest dealing', () => {
  it('deals four 18-card draft packs without repeats across the deal', () => {
    const source = Array.from({ length: 100 }, (_, index) => `card-${index}`)
    const packs = dealDraftPacks(source, fixedRandom)
    const dealt = packs.flat()

    expect(packs).toHaveLength(DRAFT_PACK_COUNT)
    expect(packs.every((pack) => pack.length === DRAFT_PACK_SIZE)).toBe(true)
    expect(new Set(dealt).size).toBe(DRAFT_PACK_COUNT * DRAFT_PACK_SIZE)
    expect(source).toHaveLength(100)
  })

  it('deals five unique commanders', () => {
    const commanders = Array.from({ length: 20 }, (_, index) => `commander-${index}`)
    const pack = dealCommanderPack(commanders, fixedRandom)

    expect(pack).toHaveLength(COMMANDER_PACK_SIZE)
    expect(new Set(pack).size).toBe(COMMANDER_PACK_SIZE)
  })

  it('rejects a deal larger than the available pool', () => {
    expect(() => sampleWithoutReplacement(['one'], 2, fixedRandom)).toThrow(
      'Cannot sample 2 items from a pool of 1.',
    )
  })
})
