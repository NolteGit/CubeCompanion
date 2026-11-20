import type { CubeCard } from './types'

/** The ten three-color lands commonly called Triomes (including the Streets of New Capenna cycle). */
const TRIOME_NAMES = new Set([
  'indatha triome',
  "jetmir's garden",
  'ketria triome',
  "raffine's tower",
  'raugrin triome',
  'savai triome',
  "spara's headquarters",
  "xander's lounge",
  'zagoth triome',
  "ziatora's proving ground",
])

/** Exception to the cube's no-three-color-draft-card rule; retain real Commander identity. */
export function isTriomeLand(card: Pick<CubeCard, 'name' | 'isLand' | 'colorIdentity'>): boolean {
  return card.isLand
    && card.colorIdentity.length === 3
    && TRIOME_NAMES.has(card.name.trim().toLocaleLowerCase('en-US'))
}
