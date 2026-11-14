import { mkdir, writeFile } from 'node:fs/promises'
import { DEFAULT_CUBE_RULES } from '../../src/domain/index.ts'
import {
  DEFAULT_ARCHIVE_PATH,
  publishArchive,
} from '../../src/infrastructure/archive/index.ts'
import { publishCube } from '../../src/infrastructure/snapshots/index.ts'
import { prepareCubeSource } from './pipeline.ts'
import { printPreparedCube, printUnresolved, printValidationIssues } from './report.ts'

function optionValue(name: string): string | undefined {
  const index = process.argv.indexOf(name)
  if (index === -1) return undefined
  const value = process.argv[index + 1]
  if (!value || value.startsWith('--')) throw new Error(`${name} requires a value`)
  return value
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

const IDEAS_PATH = 'data/ideas/cards.json'

async function publishIdeas(): Promise<void> {
  await mkdir('data/ideas', { recursive: true })
  await writeFile(
    IDEAS_PATH,
    `${JSON.stringify({ version: 1, cards: result.ideas }, null, 2)}\n`,
    'utf8',
  )
}

const note = optionValue('--note')
const result = await prepareCubeSource({
  refresh: process.argv.includes('--refresh'),
  suggestCorrections: true,
})

console.log('Cube release')
printPreparedCube(result)

if (result.unresolved.length > 0) {
  printUnresolved(result.unresolved)
  process.exitCode = 1
} else if (!result.validation) {
  throw new Error('Cube release did not produce a validation result')
} else if (!result.validation.valid) {
  printValidationIssues(result.validation)
  process.exitCode = 1
} else if (!result.cube) {
  throw new Error('Cube release did not produce a normalized cube')
} else {
  const publication = await publishCube({
    cube: result.cube,
    validation: result.validation,
    metadata: result.metadata,
    rulesRevision: DEFAULT_CUBE_RULES.revision,
    note,
  })

  console.log(`Snapshot:   ${publication.published.snapshot.id}`)
  console.log(`Draft:      ${publication.published.snapshot.draftCards.length}`)
  console.log(`Commanders: ${publication.published.snapshot.commanders.length}`)
  console.log(`History:    ${publication.createdHistory ? 'created' : 'reused'} ${publication.historyPath}`)
  console.log('Current:    data/current/cube.json')
  console.log('Metadata:   data/metadata/cards.json')

  await publishIdeas()
  console.log(`Ideas:      ${result.ideas.length} source entries ${IDEAS_PATH}`)
  if (result.unresolvedIdeas.length > 0) {
    console.warn(`Ideas:      ${result.unresolvedIdeas.length} unresolved — ${result.unresolvedIdeas.join(', ')}`)
  }

  try {
    const archive = await publishArchive(result.archive)
    console.log(`Archive:    ${archive.entries.length} entries ${DEFAULT_ARCHIVE_PATH}`)
  } catch (error) {
    console.warn(`Archive:    warning — ${errorMessage(error)}`)
  }

  console.log('\x1b[32m✓ RELEASE READY — review and commit generated changes\x1b[0m')
}
