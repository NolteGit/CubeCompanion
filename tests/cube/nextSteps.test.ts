import { describe, expect, it, vi } from 'vitest'
import { printNextSteps } from '../../scripts/cube/nextSteps'

describe('cube CLI next-step guidance', () => {
  it('prints the heading, guidance, and commands in order', () => {
    const messages: string[] = []
    const spy = vi.spyOn(console, 'log').mockImplementation((message: string) => {
      messages.push(message)
    })
    try {
      printNextSteps('validate', ['npm run cube:validate', 'npm run verify'], 'Stop if a command fails.')
    } finally {
      spy.mockRestore()
    }
    expect(messages).toEqual([
      '\nNEXT — validate',
      'Stop if a command fails.',
      '  npm run cube:validate',
      '  npm run verify',
    ])
  })
})
