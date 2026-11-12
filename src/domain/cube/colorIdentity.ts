import { COLOR_SYMBOLS, type ColorIdentity, type ColorSymbol } from './types'

const COLOR_INDEX = new Map<ColorSymbol, number>(
  COLOR_SYMBOLS.map((color, index) => [color, index]),
)

export function normalizeColorIdentity(identity: ColorIdentity): ColorSymbol[] {
  return [...new Set(identity)].sort(
    (left, right) => COLOR_INDEX.get(left)! - COLOR_INDEX.get(right)!,
  )
}

export function colorIdentityKey(identity: ColorIdentity): string {
  const normalized = normalizeColorIdentity(identity)
  return normalized.length === 0 ? 'C' : normalized.join('')
}

export function colorIdentitySize(identity: ColorIdentity): number {
  return normalizeColorIdentity(identity).length
}

export function colorIdentityCombinations(size: number): ColorSymbol[][] {
  const combinations: ColorSymbol[][] = []

  function build(start: number, current: ColorSymbol[]): void {
    if (current.length === size) {
      combinations.push([...current])
      return
    }

    for (let index = start; index < COLOR_SYMBOLS.length; index += 1) {
      current.push(COLOR_SYMBOLS[index])
      build(index + 1, current)
      current.pop()
    }
  }

  build(0, [])
  return combinations
}
