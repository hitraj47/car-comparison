import { describe, expect, it } from 'vitest'
import { effectiveMpg, rankColor } from './ranking'
import type { Car } from '../types'

describe('rankColor', () => {
  it('returns neutral when fewer than 2 values are present', () => {
    expect(rankColor([5, null, null], 0, 'higher')).toBe('neutral')
    expect(rankColor([null, null], 0, 'lower')).toBe('neutral')
  })

  it('returns neutral when the value at index is missing', () => {
    expect(rankColor([10, null, 20], 1, 'higher')).toBe('neutral')
  })

  it('returns neutral when all present values are equal', () => {
    expect(rankColor([7, 7, 7], 0, 'higher')).toBe('neutral')
    expect(rankColor([7, 7, 7], 1, 'lower')).toBe('neutral')
  })

  it('ranks lower-is-better correctly', () => {
    const values = [100, 200, 300]
    expect(rankColor(values, 0, 'lower')).toBe('best')
    expect(rankColor(values, 1, 'lower')).toBe('mid')
    expect(rankColor(values, 2, 'lower')).toBe('worst')
  })

  it('ranks higher-is-better correctly', () => {
    const values = [100, 200, 300]
    expect(rankColor(values, 0, 'higher')).toBe('worst')
    expect(rankColor(values, 1, 'higher')).toBe('mid')
    expect(rankColor(values, 2, 'higher')).toBe('best')
  })

  it('gives all tied best values the best color', () => {
    const values = [40, 40, 32]
    expect(rankColor(values, 0, 'higher')).toBe('best')
    expect(rankColor(values, 1, 'higher')).toBe('best')
    expect(rankColor(values, 2, 'higher')).toBe('worst')
  })

  it('gives all tied worst values the worst color', () => {
    const values = [50, 50, 90]
    expect(rankColor(values, 0, 'higher')).toBe('worst')
    expect(rankColor(values, 1, 'higher')).toBe('worst')
    expect(rankColor(values, 2, 'higher')).toBe('best')
  })

  it('ignores missing values when computing extremes', () => {
    const values = [null, 20, 10, null]
    expect(rankColor(values, 1, 'higher')).toBe('best')
    expect(rankColor(values, 2, 'higher')).toBe('worst')
    expect(rankColor(values, 0, 'higher')).toBe('neutral')
  })
})

describe('effectiveMpg', () => {
  const base = {
    id: 'x',
    year: 2024,
    make: 'M',
    model: 'X',
    price: { mode: 'static', amount: 1 },
    bodyStyle: 'sedan',
    createdAt: '',
    updatedAt: '',
  } as const

  it('uses mpg for gas cars even if mpge is present', () => {
    const car = {
      ...base,
      fuelType: 'gas',
      mpg: { combined: 30 },
      mpge: { combined: 99 },
    } as Car
    expect(effectiveMpg(car)?.combined).toBe(30)
  })

  it('prefers mpge for electric/hybrid when present', () => {
    const car = {
      ...base,
      fuelType: 'electric',
      mpg: { combined: 30 },
      mpge: { combined: 120 },
    } as Car
    expect(effectiveMpg(car)?.combined).toBe(120)
  })

  it('falls back to mpg for hybrid when mpge is absent', () => {
    const car = {
      ...base,
      fuelType: 'hybrid',
      mpg: { combined: 45 },
    } as Car
    expect(effectiveMpg(car)?.combined).toBe(45)
  })
})
