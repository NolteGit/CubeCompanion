import { draftCards } from '../browser/data'
import {
  averageManaValue,
  manaCurve,
  sectionDistribution,
  typeDistribution,
  type CountBucket,
} from './analysis'
import './analysis.css'

function percent(value: number, total: number): string {
  if (total === 0) return '0%'
  return `${Math.round((value / total) * 100)}%`
}

function BarList({
  buckets,
  tone = 'neutral',
}: {
  buckets: readonly CountBucket[]
  tone?: 'neutral' | 'section'
}) {
  const maximum = Math.max(...buckets.map((bucket) => bucket.count), 1)

  return (
    <div className="bar-list">
      {buckets.map((bucket) => (
        <div
          className={`bar-row${tone === 'section' ? ` section-bar section-bar--${bucket.key}` : ''}`}
          key={bucket.key}
        >
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

function Metric({
  label,
  value,
  note,
}: {
  label: string
  value: string | number
  note: string
}) {
  return (
    <div className="analysis-metric">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{note}</small>
    </div>
  )
}

function ProfileRow({
  label,
  count,
  total,
}: {
  label: string
  count: number
  total: number
}) {
  return (
    <div className="profile-row">
      <div>
        <span>{label}</span>
        <strong>{count}</strong>
      </div>
      <div className="profile-track" aria-hidden="true">
        <i style={{ width: `${total === 0 ? 0 : (count / total) * 100}%` }} />
      </div>
      <small>{percent(count, total)}</small>
    </div>
  )
}

export function AnalysisDashboard() {
  const curve = manaCurve(draftCards)
  const sections = sectionDistribution(draftCards)
  const types = typeDistribution(draftCards)
  const nonlandCount = draftCards.filter((card) => !card.isLand).length
  const landCount = draftCards.length - nonlandCount
  const creatureCount = types.find((bucket) => bucket.label === 'Creature')?.count ?? 0
  const noncreatureCount = Math.max(0, nonlandCount - creatureCount)
  const averageMv = averageManaValue(draftCards)
  const curveMaximum = Math.max(...curve.map((entry) => entry.count), 1)
  const peak = curve.reduce((highest, bucket) => bucket.count > highest.count ? bucket : highest, curve[0])
  const earlyCurve = curve.slice(0, 3).reduce((sum, bucket) => sum + bucket.count, 0)
  const midCurve = curve.slice(3, 5).reduce((sum, bucket) => sum + bucket.count, 0)
  const topCurve = curve.slice(5).reduce((sum, bucket) => sum + bucket.count, 0)

  return (
    <section className="analysis-view" aria-label="Cube analysis">
      <header className="analysis-heading">
        <div>
          <span className="analysis-eyebrow">Analytics</span>
          <h2>Cube analysis</h2>
          <p>Draft pool · current snapshot</p>
        </div>
        <div className="analysis-snapshot">
          <span>Draft pool</span>
          <strong>{draftCards.length} cards</strong>
        </div>
      </header>

      <div className="analysis-stats">
        <Metric
          label="Draft cards"
          value={draftCards.length}
          note={`${nonlandCount} nonlands`}
        />
        <Metric
          label="Average mana value"
          value={averageMv.toFixed(2)}
          note="nonlands only"
        />
        <Metric
          label="Creatures"
          value={creatureCount}
          note={`${percent(creatureCount, draftCards.length)} of cube`}
        />
        <Metric
          label="Lands"
          value={landCount}
          note={`${percent(landCount, draftCards.length)} of cube`}
        />
      </div>

      <div className="analysis-grid">
        <section className="analysis-panel mana-panel">
          <header className="panel-heading">
            <div>
              <h3>Mana curve</h3>
              <p>Nonland cards by mana value</p>
            </div>
            <div className="panel-callout">
              <span>Peak</span>
              <strong>MV {peak.label} · {peak.count}</strong>
            </div>
          </header>

          <div className="mana-curve">
            {curve.map((bucket) => (
              <div
                className={`mana-column${bucket.key === peak.key ? ' peak' : ''}`}
                key={bucket.key}
                title={`${bucket.count} cards at mana value ${bucket.label}`}
              >
                <strong>{bucket.count}</strong>
                <div className="mana-track" aria-hidden="true">
                  <i style={{ height: `${(bucket.count / curveMaximum) * 100}%` }} />
                </div>
                <span>{bucket.label}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="analysis-panel profile-panel">
          <header className="panel-heading">
            <div>
              <h3>Curve profile</h3>
              <p>Where your nonland cards sit</p>
            </div>
          </header>
          <div className="profile-list">
            <ProfileRow label="Early · MV 0–2" count={earlyCurve} total={nonlandCount} />
            <ProfileRow label="Mid · MV 3–4" count={midCurve} total={nonlandCount} />
            <ProfileRow label="Top · MV 5+" count={topCurve} total={nonlandCount} />
          </div>
          <div className="profile-divider" />
          <div className="profile-list compact">
            <ProfileRow label="Creatures" count={creatureCount} total={nonlandCount} />
            <ProfileRow label="Other nonlands" count={noncreatureCount} total={nonlandCount} />
          </div>
        </section>

        <section className="analysis-panel sections-panel">
          <header className="panel-heading">
            <div>
              <h3>Cube sections</h3>
              <p>Workbook allocation</p>
            </div>
            <span className="panel-note">not color identity</span>
          </header>
          <BarList buckets={sections} tone="section" />
        </section>

        <section className="analysis-panel types-panel">
          <header className="panel-heading">
            <div>
              <h3>Primary card types</h3>
              <p>Each card counted once</p>
            </div>
          </header>
          <BarList buckets={types} />
        </section>
      </div>
    </section>
  )
}
