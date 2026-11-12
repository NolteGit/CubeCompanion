import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import type { CardMetadata } from './types'

export const DEFAULT_SCRYFALL_CACHE_PATH = '.cache/scryfall/cards.json'

interface CacheFile {
  version: 1
  cards: Record<string, CardMetadata>
}

export async function readCardCache(path: string): Promise<Record<string, CardMetadata>> {
  try {
    const parsed = JSON.parse(await readFile(path, 'utf8')) as CacheFile
    return parsed.version === 1 ? parsed.cards : {}
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT') return {}
    throw new Error(`Could not read Scryfall cache at ${path}`, { cause: error })
  }
}

export async function writeCardCache(
  path: string,
  cards: Record<string, CardMetadata>,
): Promise<void> {
  await mkdir(dirname(path), { recursive: true })
  const contents: CacheFile = { version: 1, cards }
  await writeFile(path, `${JSON.stringify(contents, null, 2)}\n`, 'utf8')
}
