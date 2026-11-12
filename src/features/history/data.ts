import type { CubeSnapshot } from '../../domain'

const historyModules = import.meta.glob('../../../data/history/*.json', {
  eager: true,
  import: 'default',
}) as Record<string, CubeSnapshot>

export const historySnapshots = Object.values(historyModules)
  .sort((left, right) => left.createdAt.localeCompare(right.createdAt))
