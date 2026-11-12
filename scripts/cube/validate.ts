import { prepareCubeSource } from './pipeline.ts'
import { printPreparedCube, printUnresolved, printValidationIssues } from './report.ts'

const result = await prepareCubeSource({
  refresh: process.argv.includes('--refresh'),
  suggestCorrections: true,
})

console.log('Cube source validation')
printPreparedCube(result)

if (result.unresolved.length > 0) {
  printUnresolved(result.unresolved)
  process.exitCode = 1
} else if (!result.validation) {
  throw new Error('Cube validation did not produce a result')
} else if (!result.validation.valid) {
  printValidationIssues(result.validation)
  process.exitCode = 1
} else if (!result.cube) {
  throw new Error('Cube validation did not produce a normalized cube')
} else {
  console.log(`Draft:      ${result.cube.draftCards.length}`)
  console.log(`Commanders: ${result.cube.commanders.length}`)
  console.log('\x1b[32m✓ VALID — cube source passed release checks\x1b[0m')
}
