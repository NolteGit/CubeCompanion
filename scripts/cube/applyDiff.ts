import ExcelJS from 'exceljs'
import { constants } from 'node:fs'
import { copyFile, mkdir, readFile, rename, rm } from 'node:fs/promises'
import { basename, dirname, join, resolve } from 'node:path'
import { parseSandboxDiff, planWorkbookDiff, applyWorkbookDiff } from '../../src/infrastructure/excel/applySandboxDiff.ts'
import { extractWorkbook, WORKBOOK_PATH } from '../../src/infrastructure/excel/index.ts'
import { cardLookupKey, resolveCardNames, type CardMetadata } from '../../src/infrastructure/scryfall/index.ts'
import { prepareCubeSource } from './pipeline.ts'

function valueFor(name: string): string | undefined {
  const index = process.argv.indexOf(name)
  if (index < 0) return undefined
  const value = process.argv[index + 1]
  if (!value || value.startsWith('--')) throw new Error(`${name} needs a path.`)
  return value
}

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

async function loadMetadata(names: readonly string[]): Promise<Map<string, CardMetadata>> {
  const source = JSON.parse(await readFile('data/metadata/cards.json', 'utf8')) as {
    cards: CardMetadata[]
  }
  const metadata = new Map(source.cards.map((card) => [cardLookupKey(card.name), card]))
  const missing = [...new Set(names)].filter((name) => !metadata.has(cardLookupKey(name)))
  if (missing.length) {
    console.log(`Resolving ${missing.length} additional card name(s) with Scryfall…`)
    const resolved = await resolveCardNames(missing)
    if (resolved.unresolvedNames.length) {
      throw new Error(`Unrecognized card names: ${resolved.unresolvedNames.join(', ')}`)
    }
    for (const [name, card] of resolved.cards) metadata.set(name, card)
  }
  return metadata
}

async function main(): Promise<void> {
  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    console.log('Usage: npm run cube:apply-diff -- --file "path/to/cube-sandbox-diff.txt" [--apply] [--workbook "source/CubeUebersicht.xlsx"]')
    console.log('Default is a read-only preview. --apply validates a temporary workbook, backs up the original, and replaces it.')
    return
  }

  const diffPath = valueFor('--file')
  if (!diffPath) throw new Error('Specify a Cube Companion text export with --file. Run --help for usage.')
  const workbookPath = resolve(valueFor('--workbook') ?? WORKBOOK_PATH)
  const applying = process.argv.includes('--apply')
  const changes = parseSandboxDiff(await readFile(resolve(diffPath), 'utf8'))
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.readFile(workbookPath)
  const existing = await extractWorkbook(workbookPath)
  const metadata = await loadMetadata([
    ...existing.draftCards.map((entry) => entry.name),
    ...existing.commanders.map((entry) => entry.name),
    ...changes.draftAdded, ...changes.commandersAdded,
  ])
  const plan = planWorkbookDiff(workbook, changes, metadata)

  console.log('\nCube Companion change-list import')
  console.log(`Source:       ${workbookPath}`)
  console.log(`Change list:  ${resolve(diffPath)}`)
  console.log(`Draft:        ${plan.draftCountBefore} → ${plan.draftCountAfter} (${plan.additions.filter((x) => x.pool === 'draft').length} added, ${plan.removals.filter((x) => x.pool === 'draft').length} removed)`)
  console.log(`Commanders:   ${plan.commanderCountBefore} → ${plan.commanderCountAfter} (${plan.additions.filter((x) => x.pool === 'commander').length} added, ${plan.removals.filter((x) => x.pool === 'commander').length} removed)`)
  console.log(`Maybe cleanup:${plan.ideasRemoved.length ? ` ${plan.ideasRemoved.join(', ')}` : ' none'}`)
  console.log(`Excel cells:  ${plan.updates.length} values to update`)
  console.log('Ordering:     Creatures first, then mana value and name within each section; fixed land/guild blocks preserved')
  const removedNames = new Set(plan.removals.map((entry) => entry.name.toLocaleLowerCase('en-US')))
  const repositioned = plan.updates.filter((update) =>
    update.sheet === 'Cube' && update.previous && update.previous !== '-' &&
    !removedNames.has(update.previous.toLocaleLowerCase('en-US')),
  )
  console.log(`Reordered:    ${repositioned.length} existing cards move to new positions`)
  for (const change of repositioned.slice(0, 10)) {
    console.log(`  ~ ${change.cell.padEnd(5)} ${change.previous} → ${change.next || '(empty)'}`)
  }
  if (repositioned.length > 10) console.log(`  … ${repositioned.length - 10} further changes (in addition to new cards)`)
  for (const entry of plan.additions) {
    console.log(`  + ${entry.pool.padEnd(9)} ${entry.cell.padEnd(5)} ${entry.name}`)
  }

  if (!applying) {
    console.log('\nPREVIEW ONLY — no workbook changes were written.')
    console.log('After reviewing, rerun with --apply to validate and update the Excel file.')
    return
  }

  applyWorkbookDiff(workbook, plan)
  const temporary = join(dirname(workbookPath), `.${basename(workbookPath)}.${process.pid}.${Date.now()}.tmp.xlsx`)
  try {
    await workbook.xlsx.writeFile(temporary)
    console.log('\nRunning the existing cube validation against the proposed workbook…')
    const validation = await prepareCubeSource({ workbookPath: temporary, suggestCorrections: false })
    if (validation.unresolved.length) {
      throw new Error(`Unresolved source cards: ${validation.unresolved.map((x) => x.name).join(', ')}`)
    }
    if (validation.ideaIssues.length) {
      throw new Error(`Maybe list conflicts: ${validation.ideaIssues.join(' | ')}`)
    }
    if (!validation.validation?.valid) {
      const messages = validation.validation?.issues.map((issue) => issue.message).join(' | ') ?? 'No validation result.'
      throw new Error(`Cube rules validation failed: ${messages}`)
    }

    // The previous workbook survives unchanged, even if the replacement fails.
    const backups = resolve('.cache/cube-backups')
    await mkdir(backups, { recursive: true })
    const stamp = new Date().toISOString().replace(/[:.]/g, '-')
    const backup = join(backups, `${basename(workbookPath, '.xlsx')}-${stamp}.xlsx`)
    await copyFile(workbookPath, backup, constants.COPYFILE_EXCL)
    await rename(temporary, workbookPath)
    console.log(`\nBACKUP: ${backup}`)
    console.log(`UPDATED: ${workbookPath}`)
    console.log('✓ Workbook validated and updated. Review the Excel and Git diff, then run cube:release separately.')
  } finally {
    await rm(temporary, { force: true })
  }
}

main().catch((error: unknown) => {
  console.error(`\n✗ ${errorText(error)}`)
  process.exitCode = 1
})
