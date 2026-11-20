import { printNextSteps } from './nextSteps.ts'

console.log('\x1b[32m✓ GREEN — verification passed\x1b[0m')
printNextSteps(
  'review and (if this was a cube release) commit and push',
  [
    'git status',
    'git diff --stat',
    'git add source/CubeUebersicht.xlsx data',
    'git diff --cached --stat',
    'git commit -m "chore: update cube"',
    'git push',
  ],
  'Review changes first. Only run the add/commit/push commands when publishing a cube release from the intended branch.',
)
