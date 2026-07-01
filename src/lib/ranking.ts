import type { Car, ScoringConfig } from '../types'
import { priceValue } from './format'

export type Direction = 'lower' | 'higher'

// Coloring is anchored to absolute "meaningful differences", not to the spread
// of the current comparison. A value's tier depends on how many meaningful
// differences it sits behind the best value.
export type ProximityTier = 'best' | 'good' | 'fair' | 'poor' | 'worst' | 'neutral'

// Upper bounds (in meaningful-difference "steps" behind best) for each tier.
const TIER_BREAKS: { max: number; tier: ProximityTier }[] = [
  { max: 0.5, tier: 'best' },
  { max: 1.5, tier: 'good' },
  { max: 2.5, tier: 'fair' },
  { max: 3.5, tier: 'poor' },
]

/** Steps at/beyond which a metric scores 0. */
const MAX_STEPS = 5

/**
 * Number of meaningful-difference steps a value sits behind the best, or null
 * when the metric isn't comparative (fewer than 2 present values, all equal)
 * or the value at `index` is missing.
 */
export function stepsBehindBest(
  values: (number | null)[],
  index: number,
  direction: Direction,
  meaningfulDiff: number,
): number | null {
  const present = values.filter((v): v is number => v != null)
  if (present.length < 2 || values[index] == null) return null

  const min = Math.min(...present)
  const max = Math.max(...present)
  if (min === max) return null

  const best = direction === 'lower' ? min : max
  const step = meaningfulDiff > 0 ? meaningfulDiff : Number.EPSILON
  return Math.abs(values[index]! - best) / step
}

/** Color tier for a value relative to the best, using a meaningful difference. */
export function proximityTier(
  values: (number | null)[],
  index: number,
  direction: Direction,
  meaningfulDiff: number,
): ProximityTier {
  const steps = stepsBehindBest(values, index, direction, meaningfulDiff)
  if (steps == null) return 'neutral'
  for (const { max, tier } of TIER_BREAKS) {
    if (steps <= max) return tier
  }
  return 'worst'
}

/** Tailwind classes for each proximity tier (green → amber → orange → red). */
export function proximityCellClass(tier: ProximityTier): string {
  switch (tier) {
    case 'best':
      return 'bg-emerald-200 text-emerald-950'
    case 'good':
      return 'bg-emerald-100 text-emerald-900'
    case 'fair':
      return 'bg-amber-100 text-amber-900'
    case 'poor':
      return 'bg-orange-100 text-orange-900'
    case 'worst':
      return 'bg-rose-100 text-rose-900'
    case 'neutral':
      return ''
  }
}

/**
 * 0–100 score for one metric: 100 at the best, losing 100/MAX_STEPS points per
 * meaningful difference behind, floored at 0. Returns null when the metric
 * isn't comparative or the value is missing (so it's excluded from averages).
 */
export function metricScore(
  values: (number | null)[],
  index: number,
  direction: Direction,
  meaningfulDiff: number,
): number | null {
  const steps = stepsBehindBest(values, index, direction, meaningfulDiff)
  if (steps == null) return null
  return Math.max(0, Math.min(100, 100 * (1 - steps / MAX_STEPS)))
}

// --- Specs Score ------------------------------------------------------------

// Representative fuel-economy / cargo figures used for the aggregate score.
// The table still shows city/highway/combined separately for coloring.
function avgDefined(...vals: (number | undefined)[]): number | undefined {
  const present = vals.filter((v): v is number => v != null)
  if (present.length === 0) return undefined
  return present.reduce((a, b) => a + b, 0) / present.length
}

const mpgHeadline = (c: Car) => c.mpg?.combined ?? avgDefined(c.mpg?.city, c.mpg?.highway)
const mpgeHeadline = (c: Car) =>
  c.mpge?.combined ?? avgDefined(c.mpge?.city, c.mpge?.highway)

/** Meaningful price gap in dollars: `pricePct`% of the cheapest car. */
export function priceMeaningfulDiff(
  cars: Car[],
  config: ScoringConfig,
): number {
  const prices = cars.map((c) => priceValue(c.price))
  const min = Math.min(...prices)
  return Math.max(1, (config.pricePct / 100) * min)
}

/**
 * Equal-weighted 0–100 Specs Score per car, averaging price, MPG, MPGe, and
 * cargo. Seats-up and seats-folded cargo use separate meaningful differences
 * but are averaged into a single cargo category so cargo isn't double-weighted.
 * Each car is scored only on the comparative categories it has a value for —
 * missing data never penalizes. Returns null when nothing is comparable.
 */
export function specsScores(
  cars: Car[],
  config: ScoringConfig,
): (number | null)[] {
  const priceValues = cars.map((c) => priceValue(c.price))
  const mpgValues = cars.map((c) => mpgHeadline(c) ?? null)
  const mpgeValues = cars.map((c) => mpgeHeadline(c) ?? null)
  const cargoUpValues = cars.map((c) => c.cargo?.seatsUpCuFt ?? null)
  const cargoFoldedValues = cars.map((c) => c.cargo?.seatsFoldedCuFt ?? null)
  const priceDiff = priceMeaningfulDiff(cars, config)

  const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length

  return cars.map((_, i) => {
    const categories: number[] = []
    const add = (s: number | null) => {
      if (s != null) categories.push(s)
    }

    add(metricScore(priceValues, i, 'lower', priceDiff))
    add(metricScore(mpgValues, i, 'higher', config.mpgDiff))
    add(metricScore(mpgeValues, i, 'higher', config.mpgeDiff))

    // Cargo: one category, averaged from the up/folded sub-scores present.
    const cargoSubs: number[] = []
    const up = metricScore(cargoUpValues, i, 'higher', config.cargoUpDiff)
    const folded = metricScore(
      cargoFoldedValues,
      i,
      'higher',
      config.cargoFoldedDiff,
    )
    if (up != null) cargoSubs.push(up)
    if (folded != null) cargoSubs.push(folded)
    if (cargoSubs.length > 0) categories.push(mean(cargoSubs))

    if (categories.length === 0) return null
    return Math.round(mean(categories))
  })
}
