import { resolve } from 'node:path'
import {
  extractWorkbook,
  WORKBOOK_PATH,
} from '../../src/infrastructure/excel/index.ts'
import {
  DEFAULT_ARCHIVE_PATH,
  publishArchive,
} from '../../src/infrastructure/archive/index.ts'

const workbook = await extractWorkbook(resolve(process.cwd(), WORKBOOK_PATH))
const archive = await publishArchive(workbook.archive)

console.log('Cube archive publication')
console.log(`Entries: ${archive.entries.length}`)
console.log(`Output:  ${DEFAULT_ARCHIVE_PATH}`)
console.log('\x1b[32m✓ ARCHIVE READY — review and commit generated changes\x1b[0m')
