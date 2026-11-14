import { describe, expect, it } from 'vitest'
import {
  hashForPage,
  pageFromHash,
  pageTitle,
} from '../../src/app/navigation'

describe('app navigation', () => {
  it('maps public hashes to application pages', () => {
    expect(pageFromHash('#cards')).toBe('browse')
    expect(pageFromHash('#analysis')).toBe('analysis')
    expect(pageFromHash('#changes')).toBe('sandbox')
    expect(pageFromHash('#playtest')).toBe('playtest')
    expect(pageFromHash('#history')).toBe('history')
    expect(pageFromHash('#archive')).toBe('archive')
  })

  it('falls back to Cards for empty, legacy, or unknown hashes', () => {
    expect(pageFromHash('')).toBe('browse')
    expect(pageFromHash('#customize')).toBe('browse')
    expect(pageFromHash('#unknown')).toBe('browse')
  })

  it('provides stable hashes and page titles', () => {
    expect(hashForPage('browse')).toBe('#cards')
    expect(hashForPage('history')).toBe('#history')
    expect(pageTitle('browse')).toBe('Cards · Cube Companion')
  })
})
