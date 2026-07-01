import { useMemo } from 'react'
import type { Car, ProConItem, ScoringConfig } from '../types'
import { BODY_STYLE_LABELS, DEFAULT_SCORING, FUEL_TYPE_LABELS } from '../types'
import { carTitle, formatPrice, priceValue } from '../lib/format'
import {
  blendScores,
  metricScore,
  priceMeaningfulDiff,
  proximityCellClass,
  proximityTier,
  specsScores,
  type Direction,
} from '../lib/ranking'
import {
  polarityCellClass,
  polarityFor,
  proConScore,
  relevantItemIds,
} from '../lib/proConScoring'

interface ComparisonTableProps {
  cars: Car[]
  catalog: ProConItem[]
  config?: ScoringConfig
}

// A numeric row: extracts one value per car, colors by proximity to the best.
interface NumericRow {
  label: string
  direction: Direction
  meaningfulDiff: number
  value: (car: Car) => number | null | undefined
  display: (car: Car) => string
}

// Meaningful differences for the derived score rows (in points).
const SPECS_SCORE_DIFF = 8
const PROCON_SCORE_DIFF = 5

const dash = '—'

export default function ComparisonTable({
  cars,
  catalog,
  config = DEFAULT_SCORING,
}: ComparisonTableProps) {
  const catalogById = useMemo(() => {
    const m = new Map<string, ProConItem>()
    for (const item of catalog) m.set(item.id, item)
    return m
  }, [catalog])

  const numericRows = useMemo<NumericRow[]>(() => {
    const rows: NumericRow[] = [
      {
        label: 'Price',
        direction: 'lower',
        meaningfulDiff: priceMeaningfulDiff(cars, config),
        value: (c) => priceValue(c.price),
        display: (c) => formatPrice(c.price),
      },
    ]

    const mpgFields = [
      ['MPG — City', 'city'],
      ['MPG — Highway', 'highway'],
      ['MPG — Combined', 'combined'],
    ] as const
    for (const [label, key] of mpgFields) {
      if (cars.some((c) => c.mpg?.[key] != null)) {
        rows.push({
          label,
          direction: 'higher',
          meaningfulDiff: config.mpgDiff,
          value: (c) => c.mpg?.[key],
          display: (c) => numOrDash(c.mpg?.[key]),
        })
      }
    }

    const mpgeFields = [
      ['MPGe — City', 'city'],
      ['MPGe — Highway', 'highway'],
      ['MPGe — Combined', 'combined'],
    ] as const
    for (const [label, key] of mpgeFields) {
      if (cars.some((c) => c.mpge?.[key] != null)) {
        rows.push({
          label,
          direction: 'higher',
          meaningfulDiff: config.mpgeDiff,
          value: (c) => c.mpge?.[key],
          display: (c) => numOrDash(c.mpge?.[key]),
        })
      }
    }

    if (cars.some((c) => c.cargo?.seatsUpCuFt != null)) {
      rows.push({
        label: 'Cargo — seats up (cu ft)',
        direction: 'higher',
        meaningfulDiff: config.cargoUpDiff,
        value: (c) => c.cargo?.seatsUpCuFt,
        display: (c) => numOrDash(c.cargo?.seatsUpCuFt),
      })
    }
    if (cars.some((c) => c.cargo?.seatsFoldedCuFt != null)) {
      rows.push({
        label: 'Cargo — seats folded (cu ft)',
        direction: 'higher',
        meaningfulDiff: config.cargoFoldedDiff,
        value: (c) => c.cargo?.seatsFoldedCuFt,
        display: (c) => numOrDash(c.cargo?.seatsFoldedCuFt),
      })
    }
    return rows
  }, [cars, config])

  const proConItemIds = useMemo(
    () => relevantItemIds(cars, catalogById),
    [cars, catalogById],
  )

  const proConScores = useMemo(
    () => cars.map((c) => proConScore(c, catalogById)),
    [cars, catalogById],
  )

  const specScores = useMemo(() => specsScores(cars, config), [cars, config])
  const hasSpecScore = specScores.some((s) => s != null)

  // Final Score = factual specs blended with normalized (subjective) pro/con.
  const finalScores = useMemo(() => {
    const proCon100 = cars.map((_, i) =>
      metricScore(proConScores, i, 'higher', PROCON_SCORE_DIFF),
    )
    return cars.map((_, i) =>
      blendScores(specScores[i], proCon100[i], config.proConWeight),
    )
  }, [cars, proConScores, specScores, config.proConWeight])
  const showFinalScore = proConItemIds.length > 0 && hasSpecScore

  return (
    <div>
      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="border-collapse text-sm">
          <thead>
            <tr>
              <th className="sticky left-0 z-20 min-w-56 border-b border-slate-200 bg-slate-100 px-4 py-3 text-left font-medium text-slate-500">
                Attribute
              </th>
              {cars.map((car) => (
                <th
                  key={car.id}
                  className="min-w-40 border-b border-l border-slate-200 bg-slate-100 px-4 py-3 text-left font-semibold text-slate-900"
                >
                  {carTitle(car)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* Neutral info rows */}
            <InfoRow
              label="Body style"
              cars={cars}
              render={(c) => BODY_STYLE_LABELS[c.bodyStyle]}
            />
            <InfoRow
              label="Fuel type"
              cars={cars}
              render={(c) => FUEL_TYPE_LABELS[c.fuelType]}
            />

            {/* Numeric colored rows */}
            {numericRows.map((row) => {
              const values = cars.map((c) => row.value(c) ?? null)
              return (
                <tr key={row.label}>
                  <RowHeader label={row.label} />
                  {cars.map((car, i) => {
                    const tier = proximityTier(
                      values,
                      i,
                      row.direction,
                      row.meaningfulDiff,
                    )
                    return (
                      <td
                        key={car.id}
                        className={`border-b border-l border-slate-100 px-4 py-2 ${proximityCellClass(tier)}`}
                      >
                        {row.display(car)}
                      </td>
                    )
                  })}
                </tr>
              )
            })}

            {/* Aggregate specs score */}
            {hasSpecScore && (
              <ScoreRow
                label="Specs Score"
                sublabel="price · MPG · MPGe · cargo, 0–100"
                cars={cars}
                scores={specScores}
                meaningfulDiff={SPECS_SCORE_DIFF}
              />
            )}

            {/* Pro/con item rows */}
            {proConItemIds.length > 0 && (
              <tr>
                <td
                  colSpan={cars.length + 1}
                  className="sticky left-0 border-y border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500"
                >
                  Pros &amp; Cons
                </td>
              </tr>
            )}
            {proConItemIds.map((itemId) => {
              const item = catalogById.get(itemId)!
              return (
                <tr key={itemId}>
                  <th className="sticky left-0 z-10 border-b border-slate-100 bg-white px-4 py-2 text-left font-medium text-slate-700">
                    {item.label}
                    <span className="ml-2 text-xs text-slate-400">
                      ★{item.weight}
                    </span>
                  </th>
                  {cars.map((car) => {
                    const polarity = polarityFor(car, itemId)
                    return (
                      <td
                        key={car.id}
                        className={`border-b border-l border-slate-100 px-4 py-2 ${polarityCellClass(polarity)}`}
                      >
                        {polarity === 'pro'
                          ? '✓ Pro'
                          : polarity === 'con'
                            ? '✗ Con'
                            : dash}
                      </td>
                    )
                  })}
                </tr>
              )
            })}

            {/* Weighted pro/con score */}
            {proConItemIds.length > 0 && (
              <ScoreRow
                label="Pro/Con Score"
                cars={cars}
                scores={proConScores}
                meaningfulDiff={PROCON_SCORE_DIFF}
              />
            )}

            {/* Final Score: specs + pros/cons blended */}
            {showFinalScore && (
              <ScoreRow
                label="Final Score"
                sublabel={`${100 - config.proConWeight}% specs · ${config.proConWeight}% pros/cons`}
                cars={cars}
                scores={finalScores}
                meaningfulDiff={SPECS_SCORE_DIFF}
                emphasis
              />
            )}
          </tbody>
        </table>
      </div>

      <Legend />
    </div>
  )
}

function numOrDash(v: number | null | undefined): string {
  return v == null ? dash : String(v)
}

function RowHeader({
  label,
  sublabel,
}: {
  label: string
  sublabel?: string
}) {
  return (
    <th className="sticky left-0 z-10 border-b border-slate-100 bg-white px-4 py-2 text-left font-medium text-slate-700">
      {label}
      {sublabel && (
        <span className="block text-xs font-normal text-slate-400">
          {sublabel}
        </span>
      )}
    </th>
  )
}

function InfoRow({
  label,
  cars,
  render,
}: {
  label: string
  cars: Car[]
  render: (car: Car) => string
}) {
  return (
    <tr>
      <RowHeader label={label} />
      {cars.map((car) => (
        <td
          key={car.id}
          className="border-b border-l border-slate-100 px-4 py-2 text-slate-600"
        >
          {render(car)}
        </td>
      ))}
    </tr>
  )
}

function ScoreRow({
  label,
  sublabel,
  cars,
  scores,
  meaningfulDiff,
  emphasis = false,
}: {
  label: string
  sublabel?: string
  cars: Car[]
  scores: (number | null)[]
  meaningfulDiff: number
  emphasis?: boolean
}) {
  const topBorder = emphasis ? 'border-t-2 border-t-slate-300' : ''
  const size = emphasis ? 'text-base' : ''
  return (
    <tr>
      <th
        className={`sticky left-0 z-10 border-b border-slate-100 bg-white px-4 py-2 text-left font-semibold text-slate-900 ${topBorder}`}
      >
        {label}
        {sublabel && (
          <span className="block text-xs font-normal text-slate-400">
            {sublabel}
          </span>
        )}
      </th>
      {cars.map((car, i) => {
        const tier = proximityTier(scores, i, 'higher', meaningfulDiff)
        return (
          <td
            key={car.id}
            className={`border-b border-l border-slate-100 px-4 py-2 font-semibold ${size} ${topBorder} ${proximityCellClass(tier)}`}
          >
            {scores[i] ?? dash}
          </td>
        )
      })}
    </tr>
  )
}

function Legend() {
  const items: { tier: Parameters<typeof proximityCellClass>[0]; label: string }[] =
    [
      { tier: 'best', label: 'Best' },
      { tier: 'good', label: 'Close to best' },
      { tier: 'fair', label: 'Noticeably behind' },
      { tier: 'poor', label: 'Well behind' },
      { tier: 'worst', label: 'Far behind' },
    ]
  return (
    <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-slate-500">
      <span>Color = distance from the best, in meaningful differences:</span>
      {items.map((it) => (
        <span key={it.tier} className="flex items-center gap-1.5">
          <span
            className={`inline-block h-3 w-4 rounded-sm ${proximityCellClass(it.tier)}`}
          />
          {it.label}
        </span>
      ))}
    </div>
  )
}
