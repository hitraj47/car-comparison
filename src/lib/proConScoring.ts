import type { Car, ProConItem, ProConPolarity } from '../types'

/**
 * Weighted pro/con score for a car: Σ(pro weights) − Σ(con weights).
 * Assignments referencing unknown catalog items are ignored.
 */
export function proConScore(
  car: Car,
  catalogById: Map<string, ProConItem>,
): number {
  let score = 0
  for (const assignment of car.proCons ?? []) {
    const item = catalogById.get(assignment.itemId)
    if (!item) continue
    score += assignment.polarity === 'pro' ? item.weight : -item.weight
  }
  return score
}

/** Polarity of a catalog item for a given car, or null if not assigned. */
export function polarityFor(car: Car, itemId: string): ProConPolarity | null {
  const found = (car.proCons ?? []).find((a) => a.itemId === itemId)
  return found ? found.polarity : null
}

/** Background/label classes for a pro/con cell by polarity. */
export function polarityCellClass(polarity: ProConPolarity | null): string {
  if (polarity === 'pro') return 'bg-emerald-100 text-emerald-900'
  if (polarity === 'con') return 'bg-rose-100 text-rose-900'
  return ''
}

/**
 * How many cars reference each catalog item (as a pro or a con). Each car is
 * counted once per item regardless of how many times it appears.
 */
export function countProConUsage(cars: Car[]): Map<string, number> {
  const counts = new Map<string, number>()
  for (const car of cars) {
    const seen = new Set<string>()
    for (const a of car.proCons ?? []) {
      if (seen.has(a.itemId)) continue
      seen.add(a.itemId)
      counts.set(a.itemId, (counts.get(a.itemId) ?? 0) + 1)
    }
  }
  return counts
}

/**
 * Catalog item ids referenced (as pro or con) by any car in the set,
 * ordered by catalog weight descending then label.
 */
export function relevantItemIds(
  cars: Car[],
  catalogById: Map<string, ProConItem>,
): string[] {
  const ids = new Set<string>()
  for (const car of cars) {
    for (const a of car.proCons ?? []) {
      if (catalogById.has(a.itemId)) ids.add(a.itemId)
    }
  }
  return [...ids].sort((a, b) => {
    const ia = catalogById.get(a)!
    const ib = catalogById.get(b)!
    if (ib.weight !== ia.weight) return ib.weight - ia.weight
    return ia.label.localeCompare(ib.label)
  })
}
