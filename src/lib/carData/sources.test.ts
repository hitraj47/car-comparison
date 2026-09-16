import { describe, expect, it, vi } from 'vitest'
import {
  fetchCompiledCar,
  fetchModels,
  fetchVariants,
  fetchYears,
  type FetchLike,
} from './sources'

const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })

// Build a fetch that routes by substring match; unmatched URLs 404.
function router(routes: Array<[string, () => Response]>): FetchLike {
  return vi.fn(async (url: string) => {
    for (const [needle, make] of routes) {
      if (url.includes(needle)) return make()
    }
    return new Response('not found', { status: 404 })
  })
}

describe('fetchYears', () => {
  it('normalizes the menu payload', async () => {
    const fetchImpl = router([
      ['/menu/year', () => json({ menuItem: [{ text: '2025', value: '2025' }] })],
    ])
    expect(await fetchYears(fetchImpl)).toEqual([{ value: '2025', label: '2025' }])
  })

  it('throws on a non-ok response', async () => {
    const fetchImpl = router([['/menu/year', () => json({}, 500)]])
    await expect(fetchYears(fetchImpl)).rejects.toThrow(/failed \(500\)/)
  })
})

describe('fetchModels', () => {
  it('merges FuelEconomy and NHTSA models, flagging data availability', async () => {
    const fetchImpl = router([
      [
        '/menu/model',
        () => json({ menuItem: [{ text: 'Corolla', value: 'Corolla' }] }),
      ],
      [
        'GetModelsForMakeYear',
        () =>
          json({
            Results: [{ Model_Name: 'Corolla' }, { Model_Name: 'Prius Prime' }],
          }),
      ],
    ])
    const models = await fetchModels(fetchImpl, '2020', 'Toyota')
    expect(models).toEqual([
      { value: 'Corolla', label: 'Corolla', hasData: true },
      { value: 'Prius Prime', label: 'Prius Prime', hasData: false },
    ])
  })

  it('degrades to FuelEconomy-only when NHTSA fails', async () => {
    const fetchImpl = router([
      [
        '/menu/model',
        () => json({ menuItem: [{ text: 'Corolla', value: 'Corolla' }] }),
      ],
      ['GetModelsForMakeYear', () => json({}, 500)],
    ])
    const models = await fetchModels(fetchImpl, '2020', 'Toyota')
    expect(models).toEqual([{ value: 'Corolla', label: 'Corolla', hasData: true }])
  })
})

describe('fetchVariants', () => {
  it('normalizes a single-variant response', async () => {
    const fetchImpl = router([
      ['/menu/options', () => json({ menuItem: { text: 'Auto (A1)', value: '45011' } })],
    ])
    expect(await fetchVariants(fetchImpl, '2022', 'Tesla', 'Model 3 RWD')).toEqual([
      { value: '45011', label: 'Auto (A1)' },
    ])
  })
})

describe('fetchCompiledCar', () => {
  it('adopts the NHTSA canonical name when the FE model starts with it', async () => {
    // FuelEconomy appends drivetrain/trim detail; NHTSA keeps the clean name.
    const fetchImpl = router([
      [
        '/vehicle/41213',
        () =>
          json({
            make: 'Toyota',
            model: 'Corolla AWD LE/SE',
            year: '2020',
            atvType: '',
            fuelType1: 'Regular Gasoline',
            city08: '31',
            highway08: '38',
            comb08: '34',
            cylinders: '4',
            displ: '2.0',
            VClass: 'Compact Cars',
            lv4: '13',
          }),
      ],
      [
        'GetModelsForMakeYear',
        () => json({ Results: [{ Model_Name: 'Corolla' }, { Model_Name: 'Prius' }] }),
      ],
    ])
    const data = await fetchCompiledCar(fetchImpl, '41213')
    expect(data.make).toBe('Toyota')
    expect(data.model).toBe('Corolla')
    expect(data.source).toBe('fueleconomy+nhtsa')
  })

  it('keeps the FE name when NHTSA has no matching model', async () => {
    const fetchImpl = router([
      [
        '/vehicle/42890',
        () =>
          json({ make: 'BMW', model: '530i', year: '2021', VClass: 'Midsize Cars' }),
      ],
      ['GetModelsForMakeYear', () => json({ Results: [{ Model_Name: '5 Series' }] })],
    ])
    const data = await fetchCompiledCar(fetchImpl, '42890')
    expect(data.model).toBe('530i')
    expect(data.source).toBe('fueleconomy')
  })
})
