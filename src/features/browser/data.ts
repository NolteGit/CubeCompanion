import currentCubeJson from '../../../data/current/cube.json'
import metadataJson from '../../../data/metadata/cards.json'
import type { BrowserCard, CurrentCubeData, MetadataFile } from './types'

const currentCube = currentCubeJson as unknown as CurrentCubeData
const metadataFile = metadataJson as unknown as MetadataFile
const metadataByOracleId = new Map(
  metadataFile.cards.map((card) => [card.oracleId, card]),
)

function joinCard(card: CurrentCubeData['snapshot']['draftCards'][number], sourceIndex: number): BrowserCard {
  const metadata = metadataByOracleId.get(card.oracleId)

  return {
    ...card,
    sourceIndex,
    manaValue: metadata?.manaValue ?? 0,
    manaCost: metadata?.manaCost ?? '',
    typeLine: metadata?.typeLine ?? '',
    oracleText: metadata?.oracleText ?? '',
    imageUri: metadata?.imageUri,
    scryfallUri: metadata?.scryfallUri ?? '',
  }
}

export const releaseInfo = currentCube.release
export const draftCards = currentCube.snapshot.draftCards.map(joinCard)
export const commanderCards = currentCube.snapshot.commanders.map(joinCard)
