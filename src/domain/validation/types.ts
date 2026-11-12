export type ValidationIssueCode =
  | 'draft.mono-count'
  | 'draft.multicolor-count'
  | 'draft.dual-count'
  | 'draft.guild-land-count'
  | 'draft.disallowed-color-identity'
  | 'draft.colorless-range'
  | 'draft.land-range'
  | 'draft.total-range'
  | 'draft.duplicate'
  | 'commander.duplicate'
  | 'commander.overlap'
  | 'commander.symmetry'

export interface ValidationIssue {
  code: ValidationIssueCode
  message: string
  expected?: string | number
  actual?: string | number
  cards?: readonly string[]
  counts?: Readonly<Record<string, number>>
}

export interface DraftValidationSummary {
  total: number
  mono: Readonly<Record<string, number>>
  multicolor: number
  dual: Readonly<Record<string, number>>
  colorless: number
  lands: number
  guildLands: Readonly<Record<string, number>>
  generalLands: number
}

export interface ValidationResult {
  valid: boolean
  issues: readonly ValidationIssue[]
  summary: {
    draft: DraftValidationSummary
    commanders: number
  }
}
