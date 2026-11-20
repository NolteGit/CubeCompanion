/** Print follow-up commands only after the current workflow step succeeded. */
export function printNextSteps(title: string, commands: readonly string[], note?: string): void {
  console.log(`\nNEXT — ${title}`)
  if (note) console.log(note)
  for (const command of commands) console.log(`  ${command}`)
}

export const RELEASE_NOTE_COMMAND = 'npm run cube:release -- --note "Describe cube changes"'
