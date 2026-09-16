// Shared types for the external car-data lookup feature (CAR-13).
//
// The flow is a cascading drill-down — year → make → model → variant — that
// ends in a compiled set of specs merged from two free public APIs
// (NHTSA vPIC + FuelEconomy.gov). CAR-14 builds the UI on top of these shapes.

import type { BodyStyle, CargoCapacity, FuelType, MpgStats } from '../../types'

// A single choice in a cascading menu (year / make / variant). `value` is what
// the next query needs; `label` is what the UI shows.
export interface MenuOption {
  value: string
  label: string
}

// A model choice. `hasData` is true when FuelEconomy.gov also knows this model,
// meaning a variant lookup will return real specs rather than an empty shell.
export interface ModelOption {
  value: string // canonical model name used for the next query
  label: string
  hasData: boolean
}

// Engine / powertrain specs that have no first-class field on `Car` yet. The UI
// (CAR-14) decides how to surface these — e.g. as custom attributes or notes.
export interface CarSpecs {
  horsepowerHp?: number // computed for EVs from motor kW; from the record otherwise
  cylinders?: number
  displacementL?: number
}

// The compiled result of a variant lookup: the subset of a `Car` we can fill in
// automatically, plus extra specs and a list of fields the user must supply.
export interface FetchedCarData {
  year: number
  make: string
  model: string
  fuelType: FuelType
  bodyStyle: BodyStyle
  mpg?: MpgStats
  mpge?: MpgStats
  cargo?: CargoCapacity
  specs: CarSpecs
  // Human-readable field names we could not determine and the user should enter.
  missing: string[]
  // Where the data came from, for transparency in the UI.
  source: 'fueleconomy+nhtsa' | 'fueleconomy'
}
