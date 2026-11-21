export interface TargetRange {
  target: number
  tolerance: number
}

export interface CubeRules {
  revision: string
  draft: {
    monoColorCount: number
    dualColorCount: number
    guildLandCount: number
    colorless: TargetRange
    lands: TargetRange
    total: TargetRange
  }
  commanders: {
    symmetricIdentitySizes: readonly number[]
  }
}

export const DEFAULT_CUBE_RULES: CubeRules = {
  revision: '3',
  draft: {
    monoColorCount: 50,
    dualColorCount: 4,
    guildLandCount: 5,
    colorless: { target: 61, tolerance: 10 },
    lands: { target: 70, tolerance: 10 },
    total: { target: 421, tolerance: 20 },
  },
  commanders: {
    symmetricIdentitySizes: [1, 2, 3, 4],
  },
}
