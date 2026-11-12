import type { CubeDefinition, CubeSnapshot, ValidationResult } from '../../domain'
import type { CardMetadata } from '../scryfall'

export interface CubeRelease {
  snapshotId: string
  publishedAt: string
  rulesRevision: string
  note?: string
}

export interface PublishedCube {
  release: CubeRelease
  snapshot: CubeSnapshot
  validation: ValidationResult
}

export interface CardMetadataFile {
  version: 1
  cards: readonly CardMetadata[]
}

export interface SnapshotPaths {
  currentCubePath: string
  historyDirectory: string
  metadataPath: string
}

export interface PublishCubeInput {
  cube: CubeDefinition
  validation: ValidationResult
  metadata: readonly CardMetadata[]
  rulesRevision: string
  note?: string
  now?: () => Date
  paths?: Partial<SnapshotPaths>
}

export interface PublishCubeResult {
  published: PublishedCube
  historyPath: string
  createdHistory: boolean
}
