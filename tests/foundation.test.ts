import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('repository foundation', () => {
  it('keeps the source workbook at its stable repository path', () => {
    const workbookPath = resolve(process.cwd(), 'source/CubeUebersicht.xlsx')

    expect(existsSync(workbookPath)).toBe(true)
  })

  it('keeps the static deployment runtime and headers in the repository', () => {
    const nodeVersion = readFileSync(resolve(process.cwd(), '.node-version'), 'utf8').trim()
    const headers = readFileSync(resolve(process.cwd(), 'public/_headers'), 'utf8')

    expect(nodeVersion).toBe('24.15.0')
    expect(headers).toContain('https://api.scryfall.com')
    expect(headers).toContain('/assets/*')
  })
})
