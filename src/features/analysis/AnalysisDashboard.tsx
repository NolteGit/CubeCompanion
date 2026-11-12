import { draftCards } from '../browser/data'
import {
  averageManaValue,
  manaCurve,
  sectionDistribution,
  typeDistribution,
  type CountBucket,
} from './analysis'
import './analysis.css'

function BarList({ buckets }: { buckets: readonly CountBucket[] }) {
  const maximum = Math.max(...buckets.map((bucket) => bucket.count), 1)

  return (
    <div className="bar-list">
      {buckets.map((bucket) => (
        <div className="bar-row" key={bucket.key}>
          <span>{bucket.label}</span>
          <div className="bar-track" aria-hidden="true">
            <i style={{ width: `${(bucket.count / maximum) * 100}%` }} />
          </div>
          <strong>{bucket.count}</strong>
        </div>
      ))}
    </div>
  )
}

export function AnalysisDashboard() {
  const curve = manaCurve(draftCards)
  const sections = sectionDistribution(draftCards)
  const types = typeDistribution(draftCards)
  const nonlandCount = draftCards.filter((card) => !card.isLand).length
  const creatureCount = types.find((bucket) => bucket.label === 'Creature')?.count ?? 0

  return (
    <section className="analysis-view" aria-label="Cube analysis">
      <header className="feature-heading">
        <div>
          <p>Current snapshot</p>
          <h2>Cube analysis</h2>
        </div>
        <span>Workbook allocation drives section counts</span>
      </header>

      <div className="analysis-stats">
        <div><span>Draft cards</span><strong>{draftCards.length}</strong></div>
        <div><span>Nonlands</span><strong>{nonlandCount}</strong></div>
        <div><span>Creatures</span><strong>{creatureCount}</strong></div>
        <div><span>Average MV</span><strong>{averageManaValue(draftCards).toFixed(2)}</strong></div>
      </div>

      <div className="analysis-grid">
        <section className="analysis-panel mana-panel">
          <header>
            <div>
              <h3>Mana curve</h3>
              <p>Nonland cards by mana value</p>
            </div>
          </header>
          <div className="mana-curve">
            {curve.map((bucket) => {
              const maximum = Math.max(...curve.map((entry) => entry.count), 1)
              return (
                <div className="mana-column" key={bucket.key}>
                  <strong>{bucket.count}</strong>
                  <div className="mana-track" aria-hidden="true">
                    <i style={{ height: `${(bucket.count / maximum) * 100}%` }} />
                  </div>
                  <span>{bucket.label}</span>
                </div>
              )
            })}
          </div>
        </section>

        <section className="analysis-panel">
          <header>
            <div>
              <h3>Cube sections</h3>
              <p>Your workbook allocation, not Scryfall color identity</p>
            </div>
          </header>
          <BarList buckets={sections} />
        </section>

        <section className="analysis-panel">
          <header>
            <div>
              <h3>Primary card types</h3>
              <p>Each card counted once by its primary displayed type</p>
            </div>
          </header>
          <BarList buckets={types} />
        </section>
      </div>
    </section>
  )
}
