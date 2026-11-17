import { describe, expect, it } from 'vitest'
import { BASIC_LANDS, emptyBasicLands } from '../../src/domain/draft/deck'
import { BASIC_LAND_IMAGE_URIS } from '../../src/features/draft/basicLandImages'

describe('basic-land art shared across draft views', () => {
  it('provides pinned CDN images for every supported basic land', () => {
    expect(Object.keys(BASIC_LAND_IMAGE_URIS)).toEqual([...BASIC_LANDS])
    for (const land of BASIC_LANDS) {
      const url = new URL(BASIC_LAND_IMAGE_URIS[land])
      expect(url.origin).toBe('https://cards.scryfall.io')
      expect(url.pathname).toMatch(/^\/normal\/front\/[0-9a-f]\/[0-9a-f]\/[0-9a-f-]+\.jpg$/)
    }
  })

  it('starts human deck basic-land counts at zero', () => {
    expect(BASIC_LANDS.map((land) => emptyBasicLands()[land])).toEqual([0, 0, 0, 0, 0, 0])
  })
})
