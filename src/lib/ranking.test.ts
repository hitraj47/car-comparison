import { describe, expect, it } from 'vitest'
import {
  metricScore,
  priceMeaningfulDiff,
  proximityTier,
  specsScores,
  stepsBehindBest,
} from './ranking'
import { DEFAULT_SCORING, type Car } from '../types'

// MPG example from the design discussion: Prius 57, Civic 50, RAV4 40, CR-V 28.
const MPG = [57, 50, 40, 28]
const D = 7 // meaningful MPG difference

describe('stepsBehindBest', () => {
  it('returns null when not comparative or value missing', () => {
    expect(stepsBehindBest([50, null, null], 0, 'higher', D)).toBeNull()
    expect(stepsBehindBest([50, 50], 0, 'higher', D)).toBeNull() // no variance
    expect(stepsBehindBest([50, null, 40], 1, 'higher', D)).toBeNull()
  })

  it('measures gap from best in meaningful-difference units', () => {
    expect(stepsBehindBest(MPG, 0, 'higher', D)).toBe(0) // Prius, best
    expect(stepsBehindBest(MPG, 1, 'higher', D)).toBeCloseTo(1) // Civic, ~1 step
    expect(stepsBehindBest(MPG, 3, 'higher', D)).toBeCloseTo(29 / 7) // CR-V
  })

  it('measures from the min for lower-is-better', () => {
    expect(stepsBehindBest([100, 130], 1, 'lower', 30)).toBeCloseTo(1)
  })
})

describe('proximityTier', () => {
  it('keeps a near-best value out of the "bad" tiers', () => {
    // The Civic (50) is only ~1 step behind → good, not amber/mid.
    expect(proximityTier(MPG, 1, 'higher', D)).toBe('good')
  })

  it('grades the full spread of the MPG example', () => {
    expect(proximityTier(MPG, 0, 'higher', D)).toBe('best') // 57
    expect(proximityTier(MPG, 1, 'higher', D)).toBe('good') // 50
    expect(proximityTier(MPG, 2, 'higher', D)).toBe('fair') // 40 (~2.4 steps)
    expect(proximityTier(MPG, 3, 'higher', D)).toBe('worst') // 28 (~4.1 steps)
  })

  it('returns neutral for missing / non-comparative values', () => {
    expect(proximityTier([50, null], 1, 'higher', D)).toBe('neutral')
    expect(proximityTier([50, 50], 0, 'higher', D)).toBe('neutral')
  })

  it('treats values within half a meaningful difference as best (ties)', () => {
    expect(proximityTier([57, 54], 1, 'higher', D)).toBe('best') // 3 mpg < 3.5
  })
})

describe('metricScore', () => {
  it('scores 100 at the best and drops 20 points per meaningful step', () => {
    expect(metricScore(MPG, 0, 'higher', D)).toBe(100) // best
    expect(metricScore(MPG, 1, 'higher', D)).toBeCloseTo(80) // ~1 step
  })

  it('floors at 0 for values far behind', () => {
    expect(metricScore([100, 0], 1, 'higher', 10)).toBe(0) // 10 steps behind
  })

  it('returns null when not comparable', () => {
    expect(metricScore([50, null], 1, 'higher', D)).toBeNull()
  })
})

describe('priceMeaningfulDiff', () => {
  it('is a percentage of the cheapest car', () => {
    const cars = [
      { price: { mode: 'static', amount: 30000 } },
      { price: { mode: 'static', amount: 40000 } },
    ] as Car[]
    expect(priceMeaningfulDiff(cars, { ...DEFAULT_SCORING, pricePct: 20 })).toBe(
      6000,
    )
  })
})

describe('specsScores', () => {
  const base = {
    year: 2024,
    make: 'M',
    bodyStyle: 'sedan',
    fuelType: 'gas',
    createdAt: '',
    updatedAt: '',
  } as const

  it('averages comparative categories and rewards near-best cars', () => {
    const cars: Car[] = [
      { ...base, id: 'a', model: 'A', price: { mode: 'static', amount: 30000 }, mpg: { combined: 57 } },
      { ...base, id: 'b', model: 'B', price: { mode: 'static', amount: 30000 }, mpg: { combined: 50 } },
    ]
    const [a, b] = specsScores(cars, DEFAULT_SCORING)
    // Price is equal (non-comparative → excluded); only MPG counts.
    // A is best (100); B is ~1 step behind (~80).
    expect(a).toBe(100)
    expect(b).toBe(80)
  })

  it('does not penalize a car for a category it has no data in', () => {
    const cars: Car[] = [
      { ...base, id: 'a', model: 'A', price: { mode: 'static', amount: 20000 }, mpg: { combined: 40 } },
      { ...base, id: 'b', model: 'B', price: { mode: 'static', amount: 30000 } }, // no mpg
    ]
    const scores = specsScores(cars, DEFAULT_SCORING)
    // Both scored on price (a best). b only has price, so its score reflects
    // price alone rather than a 0 for missing MPG.
    expect(scores[0]).toBe(100)
    expect(scores[1]).toBeGreaterThan(0)
  })

  it('returns null when nothing is comparable', () => {
    const cars: Car[] = [
      { ...base, id: 'a', model: 'A', price: { mode: 'static', amount: 20000 } },
      { ...base, id: 'b', model: 'B', price: { mode: 'static', amount: 20000 } },
    ]
    expect(specsScores(cars, DEFAULT_SCORING)).toEqual([null, null])
  })

  it('uses separate cargo thresholds for seats up vs folded', () => {
    // A 15 cu ft folded gap is one full step (folded diff 15) → 80,
    // while the same 15 cu ft up gap is ~1.9 steps (up diff 8) → ~62.5.
    const price = { mode: 'static', amount: 30000 } as const
    const foldedOnly: Car[] = [
      { ...base, id: 'a', model: 'A', price, cargo: { seatsFoldedCuFt: 70 } },
      { ...base, id: 'b', model: 'B', price, cargo: { seatsFoldedCuFt: 55 } },
    ]
    const upOnly: Car[] = [
      { ...base, id: 'a', model: 'A', price, cargo: { seatsUpCuFt: 70 } },
      { ...base, id: 'b', model: 'B', price, cargo: { seatsUpCuFt: 55 } },
    ]
    // Price is equal → excluded; cargo is the only category.
    expect(specsScores(foldedOnly, DEFAULT_SCORING)[1]).toBe(80)
    expect(specsScores(upOnly, DEFAULT_SCORING)[1]).toBeLessThan(80)
  })
})
