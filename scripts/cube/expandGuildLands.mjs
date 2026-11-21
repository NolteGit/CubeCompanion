// One-time migration from the four-land guild layout with the ten Triomes.
// Run from the repository root. The default is a read-only preview.
import ExcelJS from 'exceljs'
import { constants } from 'node:fs'
import { copyFile, mkdir, rename, rm } from 'node:fs/promises'
import { basename, dirname, join, resolve } from 'node:path'

const guilds = ['WU', 'UB', 'BR', 'RG', 'WG', 'WB', 'UR', 'BG', 'WR', 'UG']
const triomes = new Set([
  'indatha triome', "jetmir's garden", 'ketria triome', "raffine's tower",
  'raugrin triome', 'savai triome', "spara's headquarters", "xander's lounge",
  'zagoth triome', "ziatora's proving ground",
])
const key = (name) => name.trim().toLocaleLowerCase('en-US')
const firstRow = 4
const lastRow = 76
const oldGeneralStart = 44
const newGeneralStart = 54

function readName(sheet, row) {
  const cell = sheet.getCell(`W${row}`)
  if (cell.value != null && typeof cell.value !== 'string') {
    throw new Error(`Expected a plain card name at ${cell.address}.`)
  }
  if (cell.isMerged) throw new Error(`Unexpected merged card cell at ${cell.address}.`)
  const name = cell.text.trim()
  return name === '-' ? '' : name
}

async function main() {
  const args = process.argv.slice(2)
  if (args.some((arg) => arg !== '--apply')) throw new Error('Usage: node scripts/cube/expandGuildLands.mjs [--apply]')
  const path = resolve('source/CubeUebersicht.xlsx')
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.readFile(path)
  const sheet = workbook.getWorksheet('Cube')
  if (!sheet || sheet.getCell('V2').text.trim() !== 'Land' || sheet.getCell('V78').text.trim() !== 'Triplecolor') {
    throw new Error('Unexpected Cube worksheet layout. No changes written.')
  }
  const before = Array.from({ length: lastRow - firstRow + 1 }, (_, i) => readName(sheet, firstRow + i))
  const oldGuildLands = before.slice(0, oldGeneralStart - firstRow)
  const general = before.slice(oldGeneralStart - firstRow).filter(Boolean)
  const cuts = general.filter((name) => triomes.has(key(name)))
  const retained = general.filter((name) => !triomes.has(key(name)))
  if (oldGuildLands.some((name) => !name || triomes.has(key(name))) || cuts.length !== 10 || new Set(cuts.map(key)).size !== 10) {
    throw new Error('Expected 40 existing guild lands and all ten Triomes in the old general block. This is a one-time migration; do not cut the Triomes manually first or run it twice.')
  }
  if (retained.length > lastRow - newGeneralStart + 1) throw new Error('Too many general lands for the new layout.')
  if (new Set(before.filter(Boolean).map(key)).size !== before.filter(Boolean).length) throw new Error('Duplicate land names in the source workbook.')

  const after = guilds.flatMap((_, index) => [...oldGuildLands.slice(index * 4, index * 4 + 4), ''])
  after.push(...retained)
  while (after.length < before.length) after.push('')
  console.log('Cutting the following ten Triomes:')
  for (const name of cuts) console.log(`  - ${name}`)
  console.log('\nNew fifth-land slots (existing guild allocation is preserved):')
  for (const [index, guild] of guilds.entries()) {
    console.log(`  ${guild}: W${firstRow + index * 5}-W${firstRow + index * 5 + 4}; add new land at W${firstRow + index * 5 + 4}`)
  }
  console.log(`General lands: ${retained.length} retained, beginning at W${newGeneralStart}.`)
  console.log(`Land count: ${before.filter(Boolean).length} -> ${after.filter(Boolean).length} (before adding the new duals).`)
  if (!args.includes('--apply')) {
    console.log('\nPREVIEW ONLY. Run again with --apply to migrate the workbook.')
    return
  }

  // Change only the draft land card-name cells, not physical worksheet rows.
  // Formatting and any auxiliary labels stay in place for manual review.
  for (const [index, name] of after.entries()) {
    if (name !== before[index]) sheet.getCell(`W${firstRow + index}`).value = name || null
  }
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  const backupDir = resolve('.cache/cube-backups')
  const backup = join(backupDir, `${basename(path, '.xlsx')}-before-five-guild-lands-${stamp}.xlsx`)
  const temporary = join(dirname(path), `.${basename(path)}.${process.pid}.${Date.now()}.tmp.xlsx`)
  try {
    await workbook.xlsx.writeFile(temporary)
    const check = new ExcelJS.Workbook()
    await check.xlsx.readFile(temporary)
    const checkSheet = check.getWorksheet('Cube')
    if (!checkSheet || after.some((name, index) => readName(checkSheet, firstRow + index) !== name)) {
      throw new Error('Round-trip verification of the migrated land cells failed.')
    }
    await mkdir(backupDir, { recursive: true })
    await copyFile(path, backup, constants.COPYFILE_EXCL)
    await rename(temporary, path)
    console.log(`\nBACKUP: ${backup}`)
    console.log('UPDATED: draft land names migrated. No commanders, spells, archive or Maybe cells changed.')
    console.log('Add one new dual to each fifth slot before cube:validate or cube:release. Review any visual land labels in Excel.')
  } finally {
    await rm(temporary, { force: true })
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
