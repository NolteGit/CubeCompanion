import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('repository foundation', () => {
  it('keeps the source workbook at its stable repository path', () => {
    const workbookPath = resolve(process.cwd(), 'source/CubeUebersicht.xlsx')

    expect(existsSync(workbookPath)).toBe(true)
  })
})
