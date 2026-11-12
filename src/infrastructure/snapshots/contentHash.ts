import { createHash } from 'node:crypto'
import type { CubeDefinition } from '../../domain'

function sortedDraftIdentity(cards: CubeDefinition['draftCards']) {
  return cards
    .map((card) => ({
      oracleId: card.oracleId,
      allocation: card.draftAllocation
        ? {
            section: card.draftAllocation.section,
            guild: card.draftAllocation.guild ?? null,
          }
        : null,
    }))
    .sort((left, right) => {
      const idOrder = left.oracleId.localeCompare(right.oracleId)
      if (idOrder !== 0) return idOrder
      return JSON.stringify(left.allocation).localeCompare(JSON.stringify(right.allocation))
    })
}

function sortedOracleIds(cards: CubeDefinition['commanders']): string[] {
  return cards.map((card) => card.oracleId).sort()
}

export function cubeContentIdentity(cube: CubeDefinition): string {
  return JSON.stringify({
    draft: sortedDraftIdentity(cube.draftCards),
    commanders: sortedOracleIds(cube.commanders),
  })
}

export function hashCubeContent(cube: CubeDefinition): string {
  return createHash('sha256').update(cubeContentIdentity(cube)).digest('hex')
}
