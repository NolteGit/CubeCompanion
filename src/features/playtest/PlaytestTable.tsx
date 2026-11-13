import { useState } from 'react'
import { CardCollection } from '../browser/CardCollection'
import { commanderCards, draftCards } from '../browser/data'
import type { BrowserCard } from '../browser/types'
import {
  COMMANDER_PACK_SIZE,
  DRAFT_PACK_COUNT,
  DRAFT_PACK_SIZE,
  dealCommanderPack,
  dealDraftPacks,
} from './deal'
import './playtest.css'

export function PlaytestTable() {
  const [draftPacks, setDraftPacks] = useState<BrowserCard[][]>(() =>
    dealDraftPacks(draftCards),
  )
  const [commanderPack, setCommanderPack] = useState<BrowserCard[]>(() =>
    dealCommanderPack(commanderCards),
  )
  const [selectedPack, setSelectedPack] = useState(0)

  function redealDraftPacks() {
    setDraftPacks(dealDraftPacks(draftCards))
    setSelectedPack(0)
  }

  function redealAll() {
    setCommanderPack(dealCommanderPack(commanderCards))
    setDraftPacks(dealDraftPacks(draftCards))
    setSelectedPack(0)
  }

  return (
    <section className="playtest-view" aria-label="Playtest packs">
      <header className="playtest-heading">
        <div>
          <span className="playtest-eyebrow">Playtest</span>
          <h2>Test draft</h2>
          <p>Generate disposable packs from the current published snapshot.</p>
        </div>
        <button type="button" className="new-deal-button" onClick={redealAll}>
          New deal
        </button>
      </header>

      <div className="playtest-meta">
        <span><strong>{COMMANDER_PACK_SIZE}</strong> commanders</span>
        <span><strong>{DRAFT_PACK_COUNT}</strong> draft packs</span>
        <span><strong>{DRAFT_PACK_SIZE}</strong> cards per pack</span>
        <span className="playtest-meta-note">No repeats across draft packs · session only</span>
      </div>

      <section className="playtest-panel commander-deal">
        <header className="playtest-panel-heading">
          <div>
            <h3>Commander pack</h3>
            <p>Random commander options · keep up to 3</p>
          </div>
          <button
            type="button"
            onClick={() => setCommanderPack(dealCommanderPack(commanderCards))}
          >
            Redeal commanders
          </button>
        </header>

        <div className="commander-pack">
          <CardCollection cards={commanderPack} view="images" linkCards={false} />
        </div>
      </section>

      <section className="playtest-panel draft-deal">
        <header className="playtest-panel-heading">
          <div>
            <h3>Draft packs</h3>
            <p>{DRAFT_PACK_COUNT * DRAFT_PACK_SIZE} unique cards in the current deal</p>
          </div>
          <button type="button" onClick={redealDraftPacks}>Redeal draft packs</button>
        </header>

        <div className="pack-tabs" role="group" aria-label="Draft pack">
          {draftPacks.map((pack, index) => (
            <button
              type="button"
              className={selectedPack === index ? 'active' : ''}
              key={`pack-${index + 1}`}
              onClick={() => setSelectedPack(index)}
            >
              <span>Pack {index + 1}</span>
              <small>{pack.length}</small>
            </button>
          ))}
        </div>

        <div className="pack-caption">
          <div>
            <span>Viewing</span>
            <strong>Pack {selectedPack + 1}</strong>
          </div>
          <span>{draftPacks[selectedPack]?.length ?? 0} cards</span>
        </div>

        <div className="draft-pack-grid">
          <CardCollection cards={draftPacks[selectedPack] ?? []} view="images" linkCards={false} />
        </div>
      </section>
    </section>
  )
}
