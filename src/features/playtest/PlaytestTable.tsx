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

  return (
    <section className="playtest-view" aria-label="Playtest packs">
      <header className="playtest-heading">
        <div>
          <p>Current published snapshot</p>
          <h2>Playtest packs</h2>
        </div>
        <span>Random deals are ephemeral and never change the cube.</span>
      </header>

      <section className="playtest-panel commander-deal">
        <header>
          <div>
            <h3>Commander pack</h3>
            <p>{COMMANDER_PACK_SIZE} random commanders · keep up to 3</p>
          </div>
          <button type="button" onClick={() => setCommanderPack(dealCommanderPack(commanderCards))}>
            New commander pack
          </button>
        </header>
        <CardCollection cards={commanderPack} view="images" />
      </section>

      <section className="playtest-panel draft-deal">
        <header>
          <div>
            <h3>Draft packs</h3>
            <p>
              {DRAFT_PACK_COUNT} packs × {DRAFT_PACK_SIZE} cards · no repeats across this deal
            </p>
          </div>
          <button type="button" onClick={redealDraftPacks}>New 4-pack set</button>
        </header>

        <div className="pack-tabs" role="group" aria-label="Draft pack">
          {draftPacks.map((pack, index) => (
            <button
              type="button"
              className={selectedPack === index ? 'active' : ''}
              key={`pack-${index + 1}`}
              onClick={() => setSelectedPack(index)}
            >
              Pack {index + 1} <span>{pack.length}</span>
            </button>
          ))}
        </div>

        <div className="pack-caption">
          <strong>Pack {selectedPack + 1}</strong>
          <span>{draftPacks[selectedPack]?.length ?? 0} cards</span>
        </div>
        <CardCollection cards={draftPacks[selectedPack] ?? []} view="images" />
      </section>
    </section>
  )
}
