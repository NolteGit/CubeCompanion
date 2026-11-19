import { useSyncExternalStore } from 'react'

const MOBILE_QUERY = '(max-width: 760px)'

function subscribe(onChange: () => void): () => void {
  const media = window.matchMedia(MOBILE_QUERY)
  media.addEventListener('change', onChange)
  return () => media.removeEventListener('change', onChange)
}

function getSnapshot(): boolean {
  return window.matchMedia(MOBILE_QUERY).matches
}

export function useMobileViewport(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, () => false)
}
