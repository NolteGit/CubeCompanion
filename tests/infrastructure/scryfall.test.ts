import { mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import {
  cardLookupKey,
  resolveCardNames,
  resolveExtractedWorkbook,
  suggestCardNames,
  type CardMetadata,
} from '../../src/infrastructure/scryfall'
import type { ExtractedWorkbook } from '../../src/infrastructure/excel'

function response(cards: object[], notFound: object[] = []): Response {
  return new Response(JSON.stringify({ data: cards, not_found: notFound }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

function scryfallCard(name: string, oracleId = `oracle-${name}`) {
  return {
    oracle_id: oracleId,
    name,
    cmc: 2,
    mana_cost: '{1}{W}',
    type_line: 'Creature — Test',
    oracle_text: 'Test text',
    color_identity: ['W'],
    image_uris: { normal: 'https://example.test/card.jpg' },
    scryfall_uri: 'https://scryfall.com/card/test',
  }
}

describe('Scryfall card resolution', () => {
  it('batches collection lookups and caches resolved cards', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'cube-scryfall-'))
    const cachePath = join(directory, 'cards.json')
    const names = Array.from({ length: 76 }, (_, index) => `Card ${index + 1}`)
    const fetchImpl = vi.fn<typeof fetch>().mockImplementation(async (_input, init) => {
      const body = JSON.parse(String(init?.body)) as { identifiers: Array<{ name: string }> }
      return response(body.identifiers.map(({ name }) => scryfallCard(name)))
    })

    const result = await resolveCardNames(names, { cachePath, fetchImpl, requestDelayMs: 0 })

    expect(fetchImpl).toHaveBeenCalledTimes(2)
    expect(result.fetchedCount).toBe(76)
    expect(result.unresolvedNames).toEqual([])
    expect(JSON.parse(await readFile(cachePath, 'utf8')).cards).toHaveProperty(
      cardLookupKey('Card 1'),
    )

    const cached = await resolveCardNames(names, { cachePath, fetchImpl, requestDelayMs: 0 })
    expect(fetchImpl).toHaveBeenCalledTimes(2)
    expect(cached.cacheHitCount).toBe(76)
  })

  it('resolves a double-faced card by a face name', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'cube-scryfall-'))
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
      response([
        {
          ...scryfallCard('Front // Back'),
          type_line: 'Creature // Land',
          image_uris: undefined,
          card_faces: [
            { name: 'Front', type_line: 'Creature', image_uris: { normal: 'front.jpg' } },
            { name: 'Back', type_line: 'Land', image_uris: { normal: 'back.jpg' } },
          ],
        },
      ]),
    )

    const result = await resolveCardNames(['Front'], {
      cachePath: join(directory, 'cards.json'),
      fetchImpl,
    })
    const card = result.cards.get(cardLookupKey('Front'))

    expect(card?.name).toBe('Front // Back')
    expect(card?.isLand).toBe(true)
    expect(card?.imageUri).toBe('front.jpg')
  })

  it('reports unresolved workbook names with their source locations', async () => {
    const workbook: ExtractedWorkbook = {
      draftCards: [{ name: 'Known', pool: 'draft', section: 'white', cell: 'B4' }],
      commanders: [{ name: 'Missing', pool: 'commander', section: 'white', cell: 'B79' }],
      archive: [{ name: 'Missing', pool: 'draft', section: 'white', cell: 'A3' }],
      ideas: [],
    }
    const directory = await mkdtemp(join(tmpdir(), 'cube-scryfall-'))
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
      response([scryfallCard('Known')], [{ name: 'Missing' }]),
    )

    const result = await resolveExtractedWorkbook(workbook, {
      cachePath: join(directory, 'cards.json'),
      fetchImpl,
    })

    expect(result.draftCards).toHaveLength(1)
    expect(result.commanders).toHaveLength(0)
    expect(result.unresolved).toEqual([
      {
        name: 'Missing',
        locations: [
          { source: 'cube', pool: 'commander', cell: 'B79' },
          { source: 'archive', pool: 'draft', cell: 'A3' },
        ],
        suggestion: undefined,
      },
    ])
  })

  it('uses fuzzy lookup only as a correction suggestion', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify(scryfallCard('Archangel of Thune')), { status: 200 }),
    )

    const suggestions = await suggestCardNames(['Archangel of Thun'], {
      fetchImpl,
      requestDelayMs: 0,
    })

    expect(suggestions.get(cardLookupKey('Archangel of Thun'))).toBe('Archangel of Thune')
    expect(fetchImpl).toHaveBeenCalledWith(
      expect.stringContaining('fuzzy=Archangel%20of%20Thun'),
      expect.objectContaining({ headers: expect.any(Object) }),
    )
  })

  it('can read metadata from a pre-existing cache without network access', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'cube-scryfall-'))
    const cachePath = join(directory, 'cards.json')
    const cachedCard: CardMetadata = {
      oracleId: 'cached-id',
      name: 'Cached Card',
      colorIdentity: [],
      manaValue: 0,
      manaCost: '',
      typeLine: 'Artifact',
      oracleText: '',
      isLand: false,
      scryfallUri: 'https://scryfall.com/card/cached',
    }
    await writeFile(
      cachePath,
      JSON.stringify({ version: 1, cards: { [cardLookupKey('Cached Card')]: cachedCard } }),
    )
    const fetchImpl = vi.fn<typeof fetch>()

    const result = await resolveCardNames(['Cached Card'], { cachePath, fetchImpl })

    expect(result.cacheHitCount).toBe(1)
    expect(result.cards.get(cardLookupKey('Cached Card'))).toEqual(cachedCard)
    expect(fetchImpl).not.toHaveBeenCalled()
  })
})
