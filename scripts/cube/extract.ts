import { resolve } from 'node:path'
import { extractWorkbook, WORKBOOK_PATH } from '../../src/infrastructure/excel/index.ts'

const extracted = await extractWorkbook(resolve(process.cwd(), WORKBOOK_PATH))

const countBySection = (entries: Array<{ section: string }>) =>
  Object.fromEntries(
    [...new Set(entries.map((entry) => entry.section))].map((section) => [
      section,
      entries.filter((entry) => entry.section === section).length,
    ]),
  )

console.log('Cube workbook extraction')
console.log(`Draft:      ${extracted.draftCards.length}`, countBySection(extracted.draftCards))
console.log(`Commanders: ${extracted.commanders.length}`, countBySection(extracted.commanders))
console.log(`Archive:    ${extracted.archive.length}`)
console.log(`Ideas:      ${extracted.ideas.length}`)
