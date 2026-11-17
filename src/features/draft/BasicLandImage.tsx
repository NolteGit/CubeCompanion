import { useState } from 'react'
import type { BasicLand } from '../../domain/draft/deck'
import { BASIC_LAND_IMAGE_URIS } from './basicLandImages'

const GLYPHS: Record<BasicLand, string> = { Plains: '☀', Island: '≈', Swamp: '☠', Mountain: '▲', Forest: '♣', Wastes: '◇' }

export function BasicLandImage({ land, className = '' }: { land: BasicLand; className?: string }) {
  const [failed, setFailed] = useState(false)
  return failed
    ? <div role="img" aria-label={land} className={`${className} draft-basic-fallback draft-sample-basic--${land.toLowerCase()}`}><strong>{land}</strong><span aria-hidden="true">{GLYPHS[land]}</span><small>Basic Land</small></div>
    : <img className={className} src={BASIC_LAND_IMAGE_URIS[land]} alt={land} loading="lazy" onError={() => setFailed(true)} />
}
