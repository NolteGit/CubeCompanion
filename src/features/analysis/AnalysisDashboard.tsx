import { useState, type FocusEvent, type PointerEvent } from 'react'
import { draftCards } from '../browser/data'
import {
  averageManaValue,
  sectionDistribution,
  sectionManaCurve,
  typeDistribution,
  type CountBucket,
  type SectionManaBucket,
} from './analysis'
import './analysis.css'

type CurveMode = 'stacked' | 'grouped'

interface ChartTooltipState {
  label: string
  value: string
  x: number
  y: number
}

const SECTION_COLORS: Readonly<Record<string, string>> = {
  white: '#d3cdad',
  blue: '#539ecd',
  black: '#7b6989',
  red: '#ca5658',
  green: '#44a169',
  multicolor: '#d4ae43',
  colorless: '#99a4ae',
  land: '#9b684a',
  other: '#73808a',
}

const TYPE_COLORS: Readonly<Record<string, string>> = {
  creature: '#55a86f',
  instant: '#5d9fc5',
  sorcery: '#c95b63',
  planeswalker: '#8b65a8',
  enchantment: '#d4b34f',
  artifact: '#9099a0',
  land: '#9b7957',
  other: '#73808a',
}

function percent(value: number, total: number): string {
  if (total === 0) return '0%'
  return `${Math.round((value / total) * 100)}%`
}

function pointerTooltip(
  event: PointerEvent<Element>,
  label: string,
  value: string,
): ChartTooltipState {
  return {
    label,
    value,
    x: Math.min(event.clientX + 14, window.innerWidth - 190),
    y: Math.max(14, event.clientY - 18),
  }
}

function focusTooltip(
  event: FocusEvent<Element>,
  label: string,
  value: string,
): ChartTooltipState {
  const rect = event.currentTarget.getBoundingClientRect()
  return {
    label,
    value,
    x: Math.min(rect.right + 10, window.innerWidth - 190),
    y: Math.max(14, rect.top + rect.height / 2),
  }
}

function ChartTooltip({ tooltip }: { tooltip: ChartTooltipState | null }) {
  if (!tooltip) return null

  return (
    <div
      className="chart-tooltip"
      style={{ left: tooltip.x, top: tooltip.y }}
      role="tooltip"
    >
      <strong>{tooltip.label}</strong>
      <span>{tooltip.value}</span>
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

function Legend({
  buckets,
  colors,
}: {
  buckets: readonly CountBucket[]
  colors: Readonly<Record<string, string>>
}) {
  return (
    <div className="chart-legend">
      {buckets.map((bucket) => (
        <span key={bucket.key}>
          <i style={{ background: colors[bucket.key] ?? colors.other }} />
          {bucket.label}
        </span>
      ))}
    </div>
  )
}

function DonutChart({
  buckets,
  colors,
  centerLabel,
}: {
  buckets: readonly CountBucket[]
  colors: Readonly<Record<string, string>>
  centerLabel: string
}) {
  const [tooltip, setTooltip] = useState<ChartTooltipState | null>(null)
  const total = buckets.reduce((sum, bucket) => sum + bucket.count, 0)
  const segments = buckets.reduce<Array<{
    bucket: CountBucket
    offset: number
    share: number
  }>>((currentSegments, bucket) => {
    const previous = currentSegments[currentSegments.length - 1]
    const offset = previous ? previous.offset + previous.share : 0
    const share = total === 0 ? 0 : (bucket.count / total) * 100
    return [...currentSegments, { bucket, offset, share }]
  }, [])

  return (
    <div className="donut-layout">
      <div className="donut-chart">
        <svg viewBox="0 0 100 100" aria-label={`${centerLabel} distribution`}>
          {segments.map(({ bucket, offset: segmentOffset, share }) => {
            const label = bucket.label
            const value = `${bucket.count} cards · ${percent(bucket.count, total)}`
            return (
              <circle
                className="donut-segment"
                key={bucket.key}
                cx="50"
                cy="50"
                r="40"
                pathLength="100"
                stroke={colors[bucket.key] ?? colors.other}
                strokeDasharray={`${share} ${100 - share}`}
                strokeDashoffset={-segmentOffset}
                transform="rotate(-90 50 50)"
                tabIndex={0}
                aria-label={`${label}: ${value}`}
                onPointerEnter={(event) => setTooltip(pointerTooltip(event, label, value))}
                onPointerMove={(event) => setTooltip(pointerTooltip(event, label, value))}
                onPointerLeave={() => setTooltip(null)}
                onFocus={(event) => setTooltip(focusTooltip(event, label, value))}
                onBlur={() => setTooltip(null)}
              />
            )
          })}
        </svg>
        <div className="donut-hole">
          <strong>{buckets.length}</strong>
          <span>{centerLabel}</span>
        </div>
      </div>
      <div className="donut-list">
        {buckets.map((bucket) => (
          <div key={bucket.key}>
            <span>
              <i style={{ background: colors[bucket.key] ?? colors.other }} />
              {bucket.label}
            </span>
            <strong>{bucket.count}</strong>
            <small>{percent(bucket.count, total)}</small>
          </div>
        ))}
      </div>
      <ChartTooltip tooltip={tooltip} />
    </div>
  )
}

function StackedCurve({
  curve,
  maximum,
}: {
  curve: readonly SectionManaBucket[]
  maximum: number
}) {
  const [tooltip, setTooltip] = useState<ChartTooltipState | null>(null)

  return (
    <>
      <div className="section-curve">
        {curve.map((bucket) => (
          <div className="curve-bucket" key={bucket.key}>
            <div
              className="curve-track"
              aria-label={`${bucket.total} cards at mana value ${bucket.label}`}
            >
              <div
                className="stacked-bar"
                style={{ height: `${(bucket.total / maximum) * 100}%` }}
              >
                {bucket.sections.map((section) => {
                  if (section.count === 0) return null
                  const label = `${section.label} · MV ${bucket.label}`
                  const value = `${section.count} card${section.count === 1 ? '' : 's'}`
                  return (
                    <i
                      key={section.key}
                      tabIndex={0}
                      aria-label={`${label}: ${value}`}
                      style={{
                        background: SECTION_COLORS[section.key] ?? SECTION_COLORS.other,
                        flexGrow: section.count,
                      }}
                      onPointerEnter={(event) => setTooltip(pointerTooltip(event, label, value))}
                      onPointerMove={(event) => setTooltip(pointerTooltip(event, label, value))}
                      onPointerLeave={() => setTooltip(null)}
                      onFocus={(event) => setTooltip(focusTooltip(event, label, value))}
                      onBlur={() => setTooltip(null)}
                    />
                  )
                })}
              </div>
            </div>
            <span>{bucket.label}</span>
          </div>
        ))}
      </div>
      <ChartTooltip tooltip={tooltip} />
    </>
  )
}

function GroupedCurve({
  curve,
  maximum,
}: {
  curve: readonly SectionManaBucket[]
  maximum: number
}) {
  const [tooltip, setTooltip] = useState<ChartTooltipState | null>(null)

  return (
    <>
      <div className="section-curve grouped">
        {curve.map((bucket) => (
          <div className="curve-bucket" key={bucket.key}>
            <div
              className="curve-track grouped-track"
              aria-label={`${bucket.total} cards at mana value ${bucket.label}`}
            >
              <div className="grouped-bars">
                {bucket.sections.map((section) => {
                  const label = `${section.label} · MV ${bucket.label}`
                  const value = `${section.count} card${section.count === 1 ? '' : 's'}`
                  return (
                    <i
                      key={section.key}
                      tabIndex={section.count > 0 ? 0 : -1}
                      aria-label={`${label}: ${value}`}
                      style={{
                        background: SECTION_COLORS[section.key] ?? SECTION_COLORS.other,
                        height: `${(section.count / maximum) * 100}%`,
                      }}
                      onPointerEnter={(event) => {
                        if (section.count > 0) setTooltip(pointerTooltip(event, label, value))
                      }}
                      onPointerMove={(event) => {
                        if (section.count > 0) setTooltip(pointerTooltip(event, label, value))
                      }}
                      onPointerLeave={() => setTooltip(null)}
                      onFocus={(event) => {
                        if (section.count > 0) setTooltip(focusTooltip(event, label, value))
                      }}
                      onBlur={() => setTooltip(null)}
                    />
                  )
                })}
              </div>
            </div>
            <span>{bucket.label}</span>
          </div>
        ))}
      </div>
      <ChartTooltip tooltip={tooltip} />
    </>
  )
}

export function AnalysisDashboard() {
  const [curveMode, setCurveMode] = useState<CurveMode>('grouped')
  const sectionCurve = sectionManaCurve(draftCards)
  const sections = sectionDistribution(draftCards)
  const types = typeDistribution(draftCards)
  const nonlandCount = draftCards.filter((card) => !card.isLand).length
  const landCount = draftCards.length - nonlandCount
  const creatureCount = types.find((bucket) => bucket.label === 'Creature')?.count ?? 0
  const averageMv = averageManaValue(draftCards)
  const stackedMaximum = Math.max(...sectionCurve.map((bucket) => bucket.total), 1)
  const groupedMaximum = Math.max(
    ...sectionCurve.flatMap((bucket) => bucket.sections.map((section) => section.count)),
    1,
  )
  const curveLegend = sections.filter((section) => section.key !== 'land')

  return (
    <section className="analysis-view" aria-label="Cube analysis">
      <header className="analysis-heading">
        <div>
          <span className="analysis-eyebrow">Analytics</span>
          <h2>Cube analysis</h2>
          <p>Draft pool · current snapshot</p>
        </div>
      </header>

      <div className="analysis-stats">
        <Metric label="Draft cards" value={draftCards.length} note={`${nonlandCount} nonlands`} />
        <Metric label="Average mana value" value={averageMv.toFixed(2)} note="nonlands only" />
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

      <section className="analysis-panel mana-panel">
        <header className="panel-heading curve-heading">
          <div>
            <h3>Mana curve</h3>
            <p>Nonland cards by mana value and workbook section</p>
          </div>
          <div className="curve-mode" role="group" aria-label="Mana curve display">
            <button
              className={curveMode === 'stacked' ? 'active' : ''}
              onClick={() => setCurveMode('stacked')}
            >
              Stacked
            </button>
            <button
              className={curveMode === 'grouped' ? 'active' : ''}
              onClick={() => setCurveMode('grouped')}
            >
              Grouped
            </button>
          </div>
        </header>

        <Legend buckets={curveLegend} colors={SECTION_COLORS} />

        {curveMode === 'stacked' ? (
          <StackedCurve curve={sectionCurve} maximum={stackedMaximum} />
        ) : (
          <GroupedCurve curve={sectionCurve} maximum={groupedMaximum} />
        )}
      </section>

      <div className="donut-grid">
        <section className="analysis-panel donut-panel">
          <header className="panel-heading">
            <div>
              <h3>Cube sections</h3>
              <p>Workbook allocation</p>
            </div>
          </header>
          <DonutChart buckets={sections} colors={SECTION_COLORS} centerLabel="sections" />
        </section>

        <section className="analysis-panel donut-panel">
          <header className="panel-heading">
            <div>
              <h3>Primary card types</h3>
              <p>Each card counted once</p>
            </div>
          </header>
          <DonutChart buckets={types} colors={TYPE_COLORS} centerLabel="types" />
        </section>
      </div>
    </section>
  )
}
