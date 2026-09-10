import { describe, expect, it } from 'vitest'
import {
  countProConUsage,
  polarityFor,
  proConScore,
  relevantItemIds,
} from './proConScoring'
import type { Car, ProConItem } from '../types'

function item(id: string, label: string, weight: number): ProConItem {
  return { id, label, weight, createdAt: '', updatedAt: '' }
}

function car(id: string, proCons: Car['proCons']): Car {
  return {
    id,
    year: 2024,
    make: 'M',
    model: id,
    price: { mode: 'static', amount: 1 },
    bodyStyle: 'sedan',
    fuelType: 'gas',
    proCons,
    createdAt: '',
    updatedAt: '',
  }
}

const catalog = new Map<string, ProConItem>([
  ['a', item('a', 'Wireless CarPlay', 8)],
  ['b', item('b', 'Small third row', 5)],
  ['c', item('c', 'Great warranty', 5)],
])

describe('proConScore', () => {
  it('sums pro weights and subtracts con weights', () => {
    const c = car('c1', [
      { itemId: 'a', polarity: 'pro' }, // +8
      { itemId: 'b', polarity: 'con' }, // -5
    ])
    expect(proConScore(c, catalog)).toBe(3)
  })

  it('returns 0 for a car with no assignments', () => {
    expect(proConScore(car('c2', []), catalog)).toBe(0)
    expect(proConScore(car('c3', undefined), catalog)).toBe(0)
  })

  it('ignores assignments referencing unknown catalog items', () => {
    const c = car('c4', [
      { itemId: 'a', polarity: 'pro' }, // +8
      { itemId: 'zzz', polarity: 'pro' }, // ignored
    ])
    expect(proConScore(c, catalog)).toBe(8)
  })
})

describe('polarityFor', () => {
  const c = car('c5', [{ itemId: 'a', polarity: 'con' }])
  it('returns the polarity when assigned', () => {
    expect(polarityFor(c, 'a')).toBe('con')
  })
  it('returns null when not assigned', () => {
    expect(polarityFor(c, 'b')).toBeNull()
  })
})

describe('relevantItemIds', () => {
  it('collects referenced ids sorted by weight desc then label', () => {
    const cars = [
      car('c6', [
        { itemId: 'b', polarity: 'pro' },
        { itemId: 'c', polarity: 'con' },
      ]),
      car('c7', [{ itemId: 'a', polarity: 'pro' }]),
    ]
    // a=8 first; then b and c both 5 → alphabetical by label
    // "Great warranty" (c) < "Small third row" (b)
    expect(relevantItemIds(cars, catalog)).toEqual(['a', 'c', 'b'])
  })

  it('dedupes across cars and ignores unknown items', () => {
    const cars = [
      car('c8', [
        { itemId: 'a', polarity: 'pro' },
        { itemId: 'zzz', polarity: 'pro' },
      ]),
      car('c9', [{ itemId: 'a', polarity: 'con' }]),
    ]
    expect(relevantItemIds(cars, catalog)).toEqual(['a'])
  })
})

describe('countProConUsage', () => {
  it('counts how many cars reference each item (any polarity)', () => {
    const cars = [
      car('c1', [
        { itemId: 'a', polarity: 'pro' },
        { itemId: 'b', polarity: 'con' },
      ]),
      car('c2', [{ itemId: 'a', polarity: 'con' }]),
      car('c3', []),
    ]
    const counts = countProConUsage(cars)
    expect(counts.get('a')).toBe(2)
    expect(counts.get('b')).toBe(1)
    expect(counts.get('c')).toBeUndefined()
  })

  it('counts each car at most once per item', () => {
    // Defensive: a car should never list the same item twice, but if it does
    // it still counts as one car.
    const cars = [
      car('c1', [
        { itemId: 'a', polarity: 'pro' },
        { itemId: 'a', polarity: 'con' },
      ]),
    ]
    expect(countProConUsage(cars).get('a')).toBe(1)
  })
})
