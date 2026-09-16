import { describe, expect, it } from 'vitest'
import {
  detectFuelType,
  kvKey,
  mapVClassToBodyStyle,
  mergeCarData,
  normalizeMenuItems,
  parseEvHorsepower,
  parseNhtsaModels,
  pickCargo,
  slug,
  type FuelEconomyVehicle,
} from './transform'

// A trimmed gas record modelled on the real FuelEconomy.gov payload (id 42890).
const GAS_RECORD: FuelEconomyVehicle = {
  make: 'BMW',
  model: '530i',
  year: '2021',
  atvType: '',
  fuelType1: 'Premium Gasoline',
  city08: '25',
  highway08: '33',
  comb08: '28',
  cylinders: '4',
  displ: '2.0',
  evMotor: '',
  VClass: 'Midsize Cars',
  lv4: '14',
  lv2: '0',
  hlv: '0',
}

// A trimmed EV record modelled on the real Tesla payload (id 45011).
const EV_RECORD: FuelEconomyVehicle = {
  make: 'Tesla',
  model: 'Model 3 Long Range AWD',
  year: '2022',
  atvType: 'EV',
  fuelType1: 'Electricity',
  city08: '134',
  highway08: '126',
  comb08: '131',
  cylinders: '',
  displ: '',
  evMotor: '98 and 195 kW AC 3-Phase',
  VClass: 'Midsize Cars',
  lv4: '15',
  lv2: '0',
  hlv: '0',
  range: '358',
}

describe('normalizeMenuItems', () => {
  it('handles the array shape', () => {
    const raw = { menuItem: [{ text: '2025', value: '2025' }, { text: '2024', value: '2024' }] }
    expect(normalizeMenuItems(raw)).toEqual([
      { value: '2025', label: '2025' },
      { value: '2024', label: '2024' },
    ])
  })

  it('wraps a single-object menuItem into an array', () => {
    const raw = { menuItem: { text: 'Auto (A1)', value: '45011' } }
    expect(normalizeMenuItems(raw)).toEqual([{ value: '45011', label: 'Auto (A1)' }])
  })

  it('returns [] for null / missing / empty', () => {
    expect(normalizeMenuItems(null)).toEqual([])
    expect(normalizeMenuItems({ menuItem: null })).toEqual([])
    expect(normalizeMenuItems({})).toEqual([])
  })

  it('drops entries without a value and coerces numeric values', () => {
    const raw = { menuItem: [{ text: 'x', value: '' }, { text: 'y', value: 2024 }] }
    expect(normalizeMenuItems(raw)).toEqual([{ value: '2024', label: 'y' }])
  })
})

describe('parseNhtsaModels', () => {
  it('extracts trimmed Model_Name strings', () => {
    const raw = {
      Results: [
        { Model_Name: 'Corolla' },
        { Model_Name: ' Prius ' },
        { Model_Name: '' },
        { Foo: 'bar' },
      ],
    }
    expect(parseNhtsaModels(raw)).toEqual(['Corolla', 'Prius'])
  })

  it('returns [] when Results is missing', () => {
    expect(parseNhtsaModels({})).toEqual([])
    expect(parseNhtsaModels(null)).toEqual([])
  })
})

describe('slug & kvKey', () => {
  it('slugifies', () => {
    expect(slug('Corolla Cross')).toBe('corolla-cross')
    expect(slug('Auto (AV-S10), 4 cyl, 2.0 L')).toBe('auto-av-s10-4-cyl-2-0-l')
  })

  it('builds the documented key shape', () => {
    expect(kvKey('2025', 'Toyota', 'Corolla Cross', 'Hybrid')).toBe(
      'car:2025:toyota:corolla-cross:hybrid',
    )
  })
})

describe('parseEvHorsepower', () => {
  it('sums dual-motor kW and converts to hp', () => {
    // (98 + 195) * 1.34102 ≈ 392.9 → 393
    expect(parseEvHorsepower('98 and 195 kW AC 3-Phase')).toBe(393)
  })

  it('handles a single motor and decimals', () => {
    expect(parseEvHorsepower('150 kW')).toBe(201)
    expect(parseEvHorsepower('147.5 kW AC')).toBe(198)
  })

  it('returns undefined when there is no kW figure', () => {
    expect(parseEvHorsepower('')).toBeUndefined()
    expect(parseEvHorsepower('AC 3-Phase')).toBeUndefined()
    expect(parseEvHorsepower(undefined)).toBeUndefined()
  })
})

describe('detectFuelType', () => {
  it('detects electric from atvType and fuelType1', () => {
    expect(detectFuelType({ atvType: 'EV' })).toBe('electric')
    expect(detectFuelType({ atvType: 'FCV' })).toBe('electric')
    expect(detectFuelType({ fuelType1: 'Electricity' })).toBe('electric')
  })

  it('detects hybrid and plug-in hybrid', () => {
    expect(detectFuelType({ atvType: 'Hybrid' })).toBe('hybrid')
    expect(detectFuelType({ atvType: 'Plug-in Hybrid' })).toBe('hybrid')
  })

  it('defaults to gas', () => {
    expect(detectFuelType({ atvType: '', fuelType1: 'Premium Gasoline' })).toBe('gas')
    expect(detectFuelType({})).toBe('gas')
  })
})

describe('mapVClassToBodyStyle', () => {
  it('maps EPA classes', () => {
    expect(mapVClassToBodyStyle('Standard Sport Utility Vehicle 4WD')).toBe('suv')
    expect(mapVClassToBodyStyle('Standard Pickup Trucks')).toBe('truck')
    expect(mapVClassToBodyStyle('Small Station Wagons')).toBe('wagon')
    expect(mapVClassToBodyStyle('Minivan - 2WD')).toBe('van')
    expect(mapVClassToBodyStyle('Two Seaters')).toBe('coupe')
    expect(mapVClassToBodyStyle('Midsize Cars')).toBe('sedan')
    expect(mapVClassToBodyStyle('Special Purpose Vehicle')).toBe('other')
    expect(mapVClassToBodyStyle('')).toBe('other')
  })
})

describe('pickCargo', () => {
  it('prefers lv4, then hlv, then lv2', () => {
    expect(pickCargo({ lv4: '14', hlv: '5', lv2: '3' })).toEqual({ seatsUpCuFt: 14 })
    expect(pickCargo({ lv4: '0', hlv: '5', lv2: '3' })).toEqual({ seatsUpCuFt: 5 })
    expect(pickCargo({ lv4: '0', hlv: '0', lv2: '3' })).toEqual({ seatsUpCuFt: 3 })
  })

  it('returns undefined when no luggage volume is reported', () => {
    expect(pickCargo({ lv4: '0', hlv: '0', lv2: '0' })).toBeUndefined()
    expect(pickCargo({})).toBeUndefined()
  })
})

describe('mergeCarData', () => {
  it('maps a gas record with MPG, cylinders and displacement', () => {
    const data = mergeCarData({ vehicle: GAS_RECORD })
    expect(data.fuelType).toBe('gas')
    expect(data.make).toBe('BMW')
    expect(data.year).toBe(2021)
    expect(data.mpg).toEqual({ city: 25, highway: 33, combined: 28 })
    expect(data.mpge).toBeUndefined()
    expect(data.cargo).toEqual({ seatsUpCuFt: 14 })
    expect(data.specs).toEqual({ cylinders: 4, displacementL: 2.0 })
    expect(data.bodyStyle).toBe('sedan')
    expect(data.missing).toContain('price')
    expect(data.missing).not.toContain('MPG')
    expect(data.source).toBe('fueleconomy')
  })

  it('maps an EV record with MPGe and computed horsepower', () => {
    const data = mergeCarData({ vehicle: EV_RECORD })
    expect(data.fuelType).toBe('electric')
    expect(data.mpg).toBeUndefined()
    expect(data.mpge).toEqual({ city: 134, highway: 126, combined: 131 })
    expect(data.specs.horsepowerHp).toBe(393)
    expect(data.specs.cylinders).toBeUndefined()
    expect(data.missing).not.toContain('MPGe')
  })

  it('flags missing MPG and cargo', () => {
    const bare: FuelEconomyVehicle = { make: 'X', model: 'Y', year: '2020' }
    const data = mergeCarData({ vehicle: bare })
    expect(data.missing).toEqual(expect.arrayContaining(['MPG', 'cargo', 'price']))
  })

  it('prefers NHTSA names and records the combined source', () => {
    const data = mergeCarData({
      vehicle: GAS_RECORD,
      nhtsaMake: 'BMW',
      nhtsaModel: '5 Series',
    })
    expect(data.model).toBe('5 Series')
    expect(data.source).toBe('fueleconomy+nhtsa')
  })
})
