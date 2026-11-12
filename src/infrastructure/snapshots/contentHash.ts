import { createHash } from 'node:crypto'
import type { CubeDefinition } from '../../domain'

function sortedOracleIds(cards: CubeDefinition['draftCards']): string[] {
  return cards.map((card) => card.oracleId).sort()
}

export function cubeContentIdentity(cube: CubeDefinition): string {
  return JSON.stringify({
    draft: sortedOracleIds(cube.draftCards),
    commanders: sortedOracleIds(cube.commanders),
  })
}

export function hashCubeContent(cube: CubeDefinition): string {
  return createHash('sha256').update(cubeContentIdentity(cube)).digest('hex')
}
