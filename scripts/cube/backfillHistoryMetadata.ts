import { readFile, writeFile } from 'node:fs/promises'
import { completeHistoricalMetadata } from '../../src/infrastructure/snapshots/historyMetadata.ts'
import { DEFAULT_SNAPSHOT_PATHS, type CardMetadataFile } from '../../src/infrastructure/snapshots/index.ts'

const path = DEFAULT_SNAPSHOT_PATHS.metadataPath
const original = JSON.parse(await readFile(path, 'utf8')) as CardMetadataFile
if (original.version !== 1 || !Array.isArray(original.cards)) {
  throw new Error(`Invalid published metadata file: ${path}`)
}

const result = await completeHistoricalMetadata(original.cards)
console.log(`Historical metadata: ${result.added} cards added (${result.fetched} fetched, ${result.cacheHits} cached)`)

if (result.added > 0) {
  await writeFile(path, `${JSON.stringify({ version: 1, cards: result.cards }, null, 2)}\n`, 'utf8')
  console.log(`Updated: ${path}`)
} else {
  console.log('Metadata already covers every published history snapshot.')
}
