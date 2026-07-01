import type { Car, MpgStats } from '../types'

export type RankColor = 'best' | 'mid' | 'worst' | 'neutral'
export type Direction = 'lower' | 'higher'

/**
 * Color a value relative to its peers.
 * - Fewer than 2 present values, or a missing value at `index` → neutral.
 * - All present values equal → neutral (no meaningful ranking).
 * - Ties on the best/worst extreme all share that color.
 */
export function rankColor(
  values: (number | null)[],
  index: number,
  direction: Direction,
): RankColor {
  const present = values.filter((v): v is number => v != null)
  if (present.length < 2 || values[index] == null) return 'neutral'

  const min = Math.min(...present)
  const max = Math.max(...present)
  if (min === max) return 'neutral'

  const v = values[index]!
  const isBest = direction === 'lower' ? v === min : v === max
  const isWorst = direction === 'lower' ? v === max : v === min

  if (isBest) return 'best'
  if (isWorst) return 'worst'
  return 'mid'
}

/** Tailwind classes for each rank color. */
export function rankCellClass(color: RankColor): string {
  switch (color) {
    case 'best':
      return 'bg-emerald-100 text-emerald-900'
    case 'worst':
      return 'bg-rose-100 text-rose-900'
    case 'mid':
      return 'bg-amber-50 text-amber-900'
    case 'neutral':
      return ''
  }
}

/**
 * Effective MPG source for a car: gas uses `mpg`; hybrid/electric prefer
 * `mpge` when present, else fall back to `mpg`. Returned per-row still keeps
 * MPG and MPGe as separate rows in the table so like is compared with like.
 */
export function effectiveMpg(car: Car): MpgStats | undefined {
  if (car.fuelType === 'gas') return car.mpg
  return car.mpge ?? car.mpg
}
