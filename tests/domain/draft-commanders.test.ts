import { describe, expect, it } from 'vitest'
import { checkDraftDeck, emptyBasicLands, isCommanderLegal } from '../../src/domain/draft/deck'
import type { CubeCard } from '../../src/domain/cube/types'

const white: CubeCard = { oracleId: 'w', name: 'White commander', colorIdentity: ['W'], isLand: false }
const blue: CubeCard = { oracleId: 'u', name: 'Blue commander', colorIdentity: ['U'], isLand: false }
const red: CubeCard = { oracleId: 'r', name: 'Red commander', colorIdentity: ['R'], isLand: false }
const bluePick: CubeCard = { oracleId: 'pick-u', name: 'Blue spell', colorIdentity: ['U'], isLand: false }
const azoriusPick: CubeCard = { oracleId: 'pick-wu', name: 'Azorius spell', colorIdentity: ['W', 'U'], isLand: false }
const redPick: CubeCard = { oracleId: 'pick-r', name: 'Red spell', colorIdentity: ['R'], isLand: false }
const pool = [bluePick, azoriusPick, redPick]

function plains(count: number) {
  return { ...emptyBasicLands(), Plains: count }
}

describe('draft commander options', () => {
  it('permits either candidate independently and applies that commander color identity', () => {
    expect(isCommanderLegal(bluePick, [white])).toBe(false)
    expect(isCommanderLegal(bluePick, [blue])).toBe(true)
    expect(isCommanderLegal(azoriusPick, [white])).toBe(false)
    const result = checkDraftDeck([white], pool, new Set(['pick-u']), plains(58))
    expect(result.total).toBe(60)
    expect(result.valid).toBe(false)
    expect(result.issues.join(' ')).toContain('Blue spell')
  })

  it('permits two commanders using their union and counts both toward 60', () => {
    expect(isCommanderLegal(azoriusPick, [white, blue])).toBe(true)
    expect(isCommanderLegal(redPick, [white, blue])).toBe(false)
    const result = checkDraftDeck([white, blue], pool, new Set(['pick-wu']), plains(57))
    expect(result).toEqual({ total: 60, valid: true, issues: [] })
  })

  it('switches back to one commander without counting the unused option', () => {
    expect(checkDraftDeck([white, blue], pool, new Set(), plains(58)).valid).toBe(true)
    const onlyWhite = checkDraftDeck([white], pool, new Set(), plains(58))
    expect(onlyWhite.total).toBe(59)
    expect(onlyWhite.valid).toBe(false)
    expect(checkDraftDeck([white], pool, new Set(), plains(59)).valid).toBe(true)
  })

  it('validates basics against combined identity and flags unselected colors', () => {
    const result = checkDraftDeck([white, blue], pool, new Set(['pick-r']), { ...plains(56), Mountain: 1 })
    expect(result.issues.join(' ')).toContain('Red spell')
    expect(result.issues.join(' ')).toContain('Mountain')
  })

  it('requires one or two distinct commanders', () => {
    expect(checkDraftDeck([], pool, new Set(), plains(60)).valid).toBe(false)
    expect(checkDraftDeck([white, white], pool, new Set(), plains(58)).issues.join(' ')).toContain('same commander')
    expect(checkDraftDeck([white, blue, red], pool, new Set(), plains(57)).issues.join(' ')).toContain('at most two')
  })
})
