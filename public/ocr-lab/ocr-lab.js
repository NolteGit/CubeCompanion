'use strict'

const byId = (id) => document.getElementById(id)
const statusEl = byId('status')
const analyzeButton = byId('analyze')
const state = { file: null, imageUrl: null, catalog: null, scan: null, running: false }
let ocrScriptPromise = null

function normalized(text) {
  return text.normalize('NFKD').toLowerCase()
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ').trim()
}

function distance(left, right) {
  const prev = Array.from({ length: right.length + 1 }, (_, index) => index)
  const curr = new Array(right.length + 1)
  for (let i = 1; i <= left.length; i += 1) {
    curr[0] = i
    for (let j = 1; j <= right.length; j += 1) {
      curr[j] = Math.min(
        curr[j - 1] + 1,
        prev[j] + 1,
        prev[j - 1] + (left[i - 1] === right[j - 1] ? 0 : 1),
      )
    }
    for (let j = 0; j < prev.length; j += 1) prev[j] = curr[j]
  }
  return prev[right.length]
}

function matchesFromText(text, cards) {
  const lines = text.split(/\r?\n/).map(normalized).filter(Boolean).slice(0, 250)
  const entries = cards.map((card) => ({
    card,
    label: normalized(card.name),
    wordCount: normalized(card.name).split(' ').length,
  }))
  const found = new Map()

  for (const line of lines) {
    const padded = ' ' + line + ' '
    let exactFound = false
    for (const entry of entries) {
      if (entry.label.length < 3) continue
      if (padded.includes(' ' + entry.label + ' ')) {
        found.set(entry.card.id, { card: entry.card, score: 1, line })
        exactFound = true
      }
    }
    if (exactFound) continue

    // OCR occasionally adds stray numbers or joins neighboring card names.
    // Guess only the single strongest fuzzy match per OCR line.
    const words = line.split(' ').slice(0, 20)
    let best = null
    for (let start = 0; start < words.length; start += 1) {
      for (let size = 1; size <= 9 && start + size <= words.length; size += 1) {
        const snippet = words.slice(start, start + size).join(' ')
        if (snippet.length < 6) continue
        for (const entry of entries) {
          if (Math.abs(entry.wordCount - size) > 1) continue
          if (Math.abs(entry.label.length - snippet.length) > Math.max(3, Math.ceil(entry.label.length * 0.16))) continue
          const edits = distance(entry.label, snippet)
          const score = 1 - edits / Math.max(entry.label.length, snippet.length)
          if (score >= 0.87 && edits <= 4 && (!best || score > best.score)) {
            best = { card: entry.card, score, line }
          }
        }
      }
    }
    if (best && (!found.has(best.card.id) || found.get(best.card.id).score < best.score)) {
      found.set(best.card.id, best)
    }
  }

  return [...found.values()].sort((a, b) =>
    (a.card.pool === 'commander' ? -1 : 1) - (b.card.pool === 'commander' ? -1 : 1)
    || b.score - a.score
    || a.card.name.localeCompare(b.card.name))
}

function setStatus(message) {
  statusEl.textContent = message
}

function onSelected(file) {
  if (!file || !file.type.startsWith('image/')) {
    setStatus('Select an image file to continue.')
    return
  }
  if (state.imageUrl) URL.revokeObjectURL(state.imageUrl)
  state.file = file
  state.scan = null
  state.imageUrl = URL.createObjectURL(file)
  byId('preview').src = state.imageUrl
  byId('preview').hidden = false
  byId('results').hidden = true
  byId('photo-info').textContent = file.name + ' · ' + (file.size / 1024 / 1024).toFixed(1) + ' MB'
  analyzeButton.disabled = false
  setStatus('Photo ready. Tap Analyze photo to test OCR.')
}

function loadOcrScript() {
  if (window.Tesseract) return Promise.resolve(window.Tesseract)
  if (!ocrScriptPromise) {
    ocrScriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script')
      script.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@6.0.1/dist/tesseract.min.js'
      script.onload = () => window.Tesseract ? resolve(window.Tesseract) : reject(new Error('OCR library did not initialize.'))
      script.onerror = () => reject(new Error('Could not download OCR library. Check network access.'))
      document.head.appendChild(script)
    }).catch((error) => {
      ocrScriptPromise = null
      throw error
    })
  }
  return ocrScriptPromise
}

async function imageCanvas(file, limit) {
  const url = URL.createObjectURL(file)
  const img = new Image()
  try {
    await new Promise((resolve, reject) => {
      img.onload = resolve
      img.onerror = () => reject(new Error('Unable to decode this image.'))
      img.src = url
    })
    const ratio = Math.min(1, limit / Math.max(img.naturalWidth, img.naturalHeight))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(img.naturalWidth * ratio))
    canvas.height = Math.max(1, Math.round(img.naturalHeight * ratio))
    const ctx = canvas.getContext('2d', { alpha: false })
    if (!ctx) throw new Error('Canvas is unavailable on this browser.')
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    return canvas
  } finally {
    URL.revokeObjectURL(url)
  }
}

function renderResults(scan) {
  byId('results').hidden = false
  byId('metrics').textContent = 'Image: ' + scan.width + ' × ' + scan.height
    + ' px · OCR: ' + (scan.ocrMs / 1000).toFixed(1) + ' s'
    + ' · Startup: ' + (scan.loadMs / 1000).toFixed(1) + ' s'
    + ' · Total: ' + (scan.totalMs / 1000).toFixed(1) + ' s'
    + (scan.heapMB === null ? '' : ' · JS heap after: ~' + scan.heapMB + ' MB (approx.)')
  byId('count').textContent = scan.matches.length + ' possible cube cards found (unverified).'
  byId('raw-text').textContent = scan.rawText || '(No text detected)'
  const list = byId('matches')
  list.replaceChildren()
  for (const match of scan.matches) {
    const row = document.createElement('div')
    row.className = 'match'
    const title = document.createElement('span')
    title.textContent = match.card.name
    const meta = document.createElement('small')
    meta.textContent = (match.card.pool === 'commander' ? 'Commander · ' : '') + Math.round(match.score * 100) + '% match'
    row.append(title, meta)
    list.appendChild(row)
  }
  byId('results').scrollIntoView({ behavior: 'smooth', block: 'start' })
}

async function analyze() {
  if (state.running || !state.file) return
  state.running = true
  analyzeButton.disabled = true
  byId('results').hidden = true
  const start = performance.now()
  let worker = null
  let canvas = null
  try {
    setStatus('Preparing image...')
    canvas = await imageCanvas(state.file, Number(byId('size').value))
    setStatus('Loading local OCR engine (first run downloads language data)...')
    const library = await loadOcrScript()
    if (!state.catalog) {
      const response = await fetch('./catalog.json', { cache: 'no-store' })
      if (!response.ok) throw new Error('Unable to load cube card catalog.')
      state.catalog = await response.json()
    }
    worker = await library.createWorker('eng', 1, {
      logger: (progress) => {
        if (progress && progress.status) {
          const percent = typeof progress.progress === 'number' ? ' ' + Math.round(progress.progress * 100) + '%' : ''
          setStatus(progress.status + percent)
        }
      },
    })
    const ocrStart = performance.now()
    setStatus('Reading text from deck photograph...')
    const result = await worker.recognize(canvas)
    const ocrMs = performance.now() - ocrStart
    const rawText = result.data.text || ''
    setStatus('Matching OCR text against cube catalog...')
    const matches = matchesFromText(rawText, state.catalog.cards)
    const heap = performance.memory && performance.memory.usedJSHeapSize
    state.scan = {
      snapshotId: state.catalog.snapshotId,
      scannedAt: new Date().toISOString(),
      width: canvas.width,
      height: canvas.height,
      loadMs: ocrStart - start,
      ocrMs,
      totalMs: performance.now() - start,
      heapMB: heap ? Math.round(heap / 1024 / 1024) : null,
      matches,
      rawText,
    }
    renderResults(state.scan)
    setStatus('Finished. Compare guesses with the cards in the photograph.')
  } catch (error) {
    setStatus('OCR failed: ' + (error instanceof Error ? error.message : String(error)))
  } finally {
    if (worker) await worker.terminate().catch(() => {})
    if (canvas) {
      canvas.width = 0
      canvas.height = 0
    }
    state.running = false
    analyzeButton.disabled = !state.file
  }
}

function exportResults() {
  if (!state.scan) return
  const scan = state.scan
  const payload = {
    schemaVersion: 0,
    unverified: true,
    cubeSnapshotId: scan.snapshotId,
    scannedAt: scan.scannedAt,
    commanderIds: scan.matches.filter((m) => m.card.pool === 'commander').map((m) => m.card.id),
    cardIds: scan.matches.filter((m) => m.card.pool === 'draft').map((m) => m.card.id),
    metrics: {
      width: scan.width,
      height: scan.height,
      ocrMs: Math.round(scan.ocrMs),
      startupMs: Math.round(scan.loadMs),
      totalMs: Math.round(scan.totalMs),
      approximateHeapMB: scan.heapMB,
    },
  }
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = 'cube-ocr-test.json'
  anchor.click()
  setTimeout(() => URL.revokeObjectURL(url), 3000)
}

byId('camera').addEventListener('change', (event) => {
  onSelected(event.target.files && event.target.files[0])
})
byId('gallery').addEventListener('change', (event) => {
  onSelected(event.target.files && event.target.files[0])
})
analyzeButton.addEventListener('click', analyze)
byId('export').addEventListener('click', exportResults)
