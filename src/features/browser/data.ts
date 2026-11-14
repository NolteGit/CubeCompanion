import currentCubeJson from '../../../data/current/cube.json'
import ideasJson from '../../../data/ideas/cards.json'
import metadataJson from '../../../data/metadata/cards.json'
import type {
  BrowserCard,
  CurrentCubeData,
  IdeasFile,
  IdeaSourceEntry,
  MetadataFile,
} from './types'

const currentCube = currentCubeJson as unknown as CurrentCubeData
const ideasFile = ideasJson as unknown as IdeasFile
const metadataFile = metadataJson as unknown as MetadataFile
const metadataByOracleId = new Map(
  metadataFile.cards.map((card) => [card.oracleId, card]),
)
const metadataByName = new Map(
  metadataFile.cards.map((card) => [card.name.trim().toLocaleLowerCase('en-US'), card]),
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

export function browserCardFromCubeCard(
  card: CurrentCubeData['snapshot']['draftCards'][number],
  sourceIndex = 0,
): BrowserCard {
  return joinCard(card, sourceIndex)
}

function joinIdea(entry: IdeaSourceEntry, sourceIndex: number): BrowserCard {
  const metadata = entry.oracleId
    ? metadataByOracleId.get(entry.oracleId)
    : metadataByName.get(entry.name.trim().toLocaleLowerCase('en-US'))

  return {
    oracleId: metadata?.oracleId ?? `idea-${entry.pool}-${entry.cell}`,
    name: entry.name,
    colorIdentity: metadata?.colorIdentity ?? [],
    isLand: metadata?.isLand ?? false,
    sourceIndex,
    manaValue: metadata?.manaValue ?? 0,
    manaCost: metadata?.manaCost ?? '',
    typeLine: metadata?.typeLine ?? '',
    oracleText: metadata?.oracleText ?? '',
    imageUri: metadata?.imageUri,
    scryfallUri: metadata?.scryfallUri ?? '',
  }
}

function uniqueIdeas(cards: readonly BrowserCard[]): BrowserCard[] {
  const seen = new Set<string>()
  return cards.filter((card) => {
    const key = card.name.trim().toLocaleLowerCase('en-US')
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

const ideaCards = ideasFile.cards.map(joinIdea)

export const releaseInfo = currentCube.release
export const draftCards = currentCube.snapshot.draftCards.map(joinCard)
export const commanderCards = currentCube.snapshot.commanders.map(joinCard)
export const maybeDraftCards = uniqueIdeas(
  ideaCards.filter((_, index) => ideasFile.cards[index]?.pool === 'draft'),
)
export const maybeCommanderCards = uniqueIdeas(
  ideaCards.filter((_, index) => ideasFile.cards[index]?.pool === 'commander'),
)
