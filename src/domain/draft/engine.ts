/** Pure, deterministic pass-draft engine. Seat 0 is the human player. */
export interface DraftableCard {
  oracleId: string
}

export interface DraftOptions {
  players: number
  packsPerPlayer: number
  cardsPerPack: number
  seed?: number
}

export type PassDirection = 'left' | 'right'

export interface DraftSession<T extends DraftableCard> {
  options: Required<DraftOptions>
  round: number // zero-based pack round
  pick: number // zero-based pick within a round
  packs: T[][] // one current pack per seat; seat 0 is human
  futureRounds: T[][][]
  selections: T[][] // picked cards per seat
  rngState: number
  complete: boolean
}

function nextRandom(state: number): [number, number] {
  const next = (Math.imul(state, 1664525) + 1013904223) >>> 0
  return [next / 0x100000000, next]
}

function validateOptions(options: DraftOptions, cardCount: number): void {
  const { players, packsPerPlayer, cardsPerPack, seed } = options
  if (!Number.isInteger(players) || players < 2 || players > 8) {
    throw new Error('A draft requires 2–8 players.')
  }
  if (!Number.isInteger(packsPerPlayer) || packsPerPlayer < 1 || packsPerPlayer > 4) {
    throw new Error('Choose 1–4 packs per player.')
  }
  if (!Number.isInteger(cardsPerPack) || cardsPerPack < 1 || cardsPerPack > 20) {
    throw new Error('Choose 1–20 cards per pack.')
  }
  if (seed !== undefined && (!Number.isSafeInteger(seed) || seed < 0)) {
    throw new Error('The draft seed must be a non-negative safe integer.')
  }
  const needed = players * packsPerPlayer * cardsPerPack
  if (needed > cardCount) {
    throw new Error(`This draft needs ${needed} cards, but the cube has only ${cardCount}.`)
  }
}

export function draftDirection(round: number): PassDirection {
  return round % 2 === 0 ? 'left' : 'right'
}

export function startDraft<T extends DraftableCard>(
  pool: readonly T[],
  options: DraftOptions,
): DraftSession<T> {
  validateOptions(options, pool.length)
  const identities = new Set(pool.map((card) => card.oracleId))
  if (identities.size !== pool.length) {
    throw new Error('Draft pool contains duplicate Oracle IDs.')
  }

  const seed = options.seed ?? (Date.now() >>> 0)
  let rngState = seed >>> 0
  const shuffled = [...pool]
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const [roll, next] = nextRandom(rngState)
    rngState = next
    const swap = Math.floor(roll * (index + 1))
    ;[shuffled[index], shuffled[swap]] = [shuffled[swap], shuffled[index]]
  }
  const rounds: T[][][] = []
  let cursor = 0
  for (let round = 0; round < options.packsPerPlayer; round += 1) {
    const packs: T[][] = []
    for (let seat = 0; seat < options.players; seat += 1) {
      packs.push(shuffled.slice(cursor, cursor + options.cardsPerPack))
      cursor += options.cardsPerPack
    }
    rounds.push(packs)
  }
  return {
    options: { ...options, seed },
    round: 0,
    pick: 0,
    packs: rounds[0],
    futureRounds: rounds.slice(1),
    selections: Array.from({ length: options.players }, () => []),
    rngState,
    complete: false,
  }
}

/** Optional bot policy; absent it, the original random-pick behavior remains. */
export type BotPickStrategy<T extends DraftableCard> = (
  pack: readonly T[],
  seat: number,
  picks: readonly T[],
  roll: number,
) => number

export function pickDraftCard<T extends DraftableCard>(
  session: DraftSession<T>,
  oracleId: string,
  chooseBotPick?: BotPickStrategy<T>,
): DraftSession<T> {
  if (session.complete) throw new Error('The draft is already complete.')
  const humanPick = session.packs[0]?.find((card) => card.oracleId === oracleId)
  if (!humanPick) throw new Error('Select a card from your current pack.')

  let rngState = session.rngState
  const chosen: T[] = [humanPick]
  const remaining = session.packs.map((pack, seat) => {
    if (seat === 0) return pack.filter((card) => card.oracleId !== oracleId)
    const [roll, next] = nextRandom(rngState)
    rngState = next
    const pickIndex = chooseBotPick
      ? chooseBotPick(pack, seat, session.selections[seat], roll)
      : Math.floor(roll * pack.length)
    if (!Number.isInteger(pickIndex) || pickIndex < 0 || pickIndex >= pack.length) {
      throw new Error(`Bot at seat ${seat} made an invalid pick.`)
    }
    chosen.push(pack[pickIndex])
    return pack.filter((_, index) => index !== pickIndex)
  })
  const selections = session.selections.map((cards, seat) => [...cards, chosen[seat]])

  if (session.pick + 1 === session.options.cardsPerPack) {
    if (session.round + 1 === session.options.packsPerPlayer) {
      return {
        ...session,
        packs: remaining,
        selections,
        rngState,
        complete: true,
        pick: session.pick + 1,
      }
    }
    return {
      ...session,
      packs: session.futureRounds[0],
      futureRounds: session.futureRounds.slice(1),
      round: session.round + 1,
      pick: 0,
      selections,
      rngState,
    }
  }

  const players = session.options.players
  const left = draftDirection(session.round) === 'left'
  const passed = Array.from({ length: players }, (_, seat) =>
    remaining[(seat + (left ? players - 1 : 1)) % players],
  )
  return { ...session, packs: passed, pick: session.pick + 1, selections, rngState }
}
