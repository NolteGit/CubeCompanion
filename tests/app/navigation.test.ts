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
    expect(pageFromHash('#draft')).toBe('draft')
    expect(pageFromHash('#history')).toBe('history')
    expect(pageFromHash('#archive')).toBe('archive')
  })

  it('falls back to Cards for empty, legacy, or unknown hashes', () => {
    expect(pageFromHash('')).toBe('browse')
    expect(pageFromHash('#customize')).toBe('browse')
    expect(pageFromHash('#unknown')).toBe('browse')
  })

  it('opens Draft from legacy Playtest bookmarks', () => {
    expect(pageFromHash('#playtest')).toBe('draft')
    expect(pageFromHash('#PLAYTEST')).toBe('draft')
  })

  it('provides stable hashes and page titles', () => {
    expect(hashForPage('browse')).toBe('#cards')
    expect(hashForPage('history')).toBe('#history')
    expect(hashForPage('draft')).toBe('#draft')
    expect(pageTitle('draft')).toBe('Draft · Cube Companion')
    expect(pageTitle('browse')).toBe('Cards · Cube Companion')
  })
})
