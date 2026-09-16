import { describe, expect, it } from 'vitest'
import { fetchedNotesSummary, fetchedToForm } from './formFill'
import type { FetchedCarData } from './types'

const base: FetchedCarData = {
  year: 2025,
  make: 'Toyota',
  model: 'Corolla',
  fuelType: 'gas',
  bodyStyle: 'sedan',
  specs: {},
  missing: [],
  source: 'fueleconomy+nhtsa',
}

describe('fetchedToForm', () => {
  it('maps known fields to strings and leaves missing numbers empty', () => {
    const patch = fetchedToForm({
      ...base,
      mpg: { city: 31, highway: 40, combined: 35 },
      cargo: { seatsUpCuFt: 13.1 },
    })
    expect(patch).toMatchObject({
      year: '2025',
      make: 'Toyota',
      model: 'Corolla',
      bodyStyle: 'sedan',
      fuelType: 'gas',
      mpgCity: '31',
      mpgHighway: '40',
      mpgCombined: '35',
      cargoUp: '13.1',
      cargoFolded: '',
      mpgeCity: '',
    })
  })

  it('maps MPGe for electric vehicles', () => {
    const patch = fetchedToForm({
      ...base,
      fuelType: 'electric',
      mpge: { city: 150, highway: 130, combined: 140 },
    })
    expect(patch.fuelType).toBe('electric')
    expect(patch.mpgeCombined).toBe('140')
  })
})

describe('fetchedNotesSummary', () => {
  it('summarizes engine specs and missing fields', () => {
    const summary = fetchedNotesSummary({
      ...base,
      specs: { horsepowerHp: 169, cylinders: 4, displacementL: 2 },
      missing: ['price', 'cargo (seats folded)'],
    })
    expect(summary).toContain('FuelEconomy.gov + NHTSA')
    expect(summary).toContain('169 hp, 4-cyl, 2L')
    expect(summary).toContain('Still needed: price, cargo (seats folded)')
  })

  it('omits the engine and missing lines when there is nothing to report', () => {
    const summary = fetchedNotesSummary({ ...base, source: 'fueleconomy' })
    expect(summary).toBe('Auto-filled from FuelEconomy.gov.')
  })
})
