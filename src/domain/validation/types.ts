export type ValidationIssueCode =
  | 'draft.mono-count'
  | 'draft.dual-count'
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
  dual: Readonly<Record<string, number>>
  colorless: number
  lands: number
}

export interface ValidationResult {
  valid: boolean
  issues: readonly ValidationIssue[]
  summary: {
    draft: DraftValidationSummary
    commanders: number
  }
}
