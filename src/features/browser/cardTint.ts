import type { BrowserCard } from './types'

export type CardTint =
  | 'white'
  | 'blue'
  | 'black'
  | 'red'
  | 'green'
  | 'multicolor'
  | 'colorless'
  | 'land'

export function cardTint(card: BrowserCard): CardTint {
  if (card.isLand) return 'land'
  if (card.colorIdentity.length === 0) return 'colorless'
  if (card.colorIdentity.length > 1) return 'multicolor'

  switch (card.colorIdentity[0]) {
    case 'W': return 'white'
    case 'U': return 'blue'
    case 'B': return 'black'
    case 'R': return 'red'
    case 'G': return 'green'
    default: return 'colorless'
  }
}
