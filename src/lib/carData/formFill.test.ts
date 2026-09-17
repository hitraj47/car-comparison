import { describe, expect, it } from 'vitest'
import { fetchedToForm } from './formFill'
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
