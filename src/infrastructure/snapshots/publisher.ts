import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import type { CubeSnapshot } from '../../domain'
import type { CardMetadata } from '../scryfall'
import { hashCubeContent } from './contentHash'
import type {
  CardMetadataFile,
  PublishCubeInput,
  PublishCubeResult,
  SnapshotPaths,
} from './types'

export const DEFAULT_SNAPSHOT_PATHS: SnapshotPaths = {
  currentCubePath: 'data/current/cube.json',
  historyDirectory: 'data/history',
  metadataPath: 'data/metadata/cards.json',
}

async function readSnapshot(path: string): Promise<CubeSnapshot | undefined> {
  try {
    return JSON.parse(await readFile(path, 'utf8')) as CubeSnapshot
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT') {
      return undefined
    }
    throw error
  }
}

async function writeJson(path: string, value: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
}

function uniqueMetadata(cards: readonly CardMetadata[]): CardMetadata[] {
  const byOracleId = new Map(cards.map((card) => [card.oracleId, card]))
  return [...byOracleId.values()].sort((left, right) =>
    left.oracleId < right.oracleId ? -1 : left.oracleId > right.oracleId ? 1 : 0,
  )
}

export async function publishCube(input: PublishCubeInput): Promise<PublishCubeResult> {
  if (!input.validation.valid) {
    throw new Error('Refusing to publish an invalid cube')
  }

  const paths = { ...DEFAULT_SNAPSHOT_PATHS, ...input.paths }
  const snapshotId = hashCubeContent(input.cube)
  const historyPath = join(paths.historyDirectory, `${snapshotId}.json`)
  const publishedAt = (input.now ?? (() => new Date()))().toISOString()
  const existingSnapshot = await readSnapshot(historyPath)

  if (existingSnapshot && existingSnapshot.id !== snapshotId) {
    throw new Error(`History snapshot at ${historyPath} has unexpected id ${existingSnapshot.id}`)
  }

  const snapshot: CubeSnapshot =
    existingSnapshot ?? {
      id: snapshotId,
      createdAt: publishedAt,
      note: input.note,
      rulesRevision: input.rulesRevision,
      draftCards: [...input.cube.draftCards],
      commanders: [...input.cube.commanders],
    }

  if (!existingSnapshot) await writeJson(historyPath, snapshot)

  const published = {
    release: {
      snapshotId,
      publishedAt,
      rulesRevision: input.rulesRevision,
      ...(input.note ? { note: input.note } : {}),
    },
    snapshot,
    validation: input.validation,
  }

  const metadataFile: CardMetadataFile = {
    version: 1,
    cards: uniqueMetadata(input.metadata),
  }

  await writeJson(paths.currentCubePath, published)
  await writeJson(paths.metadataPath, metadataFile)

  return {
    published,
    historyPath,
    createdHistory: existingSnapshot === undefined,
  }
}
