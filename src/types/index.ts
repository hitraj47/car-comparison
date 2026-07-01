// Domain types for the Car Comparison app.
// See plan.md "Data Model" for the source of truth.

export type FuelType = 'gas' | 'hybrid' | 'electric'

export type BodyStyle =
  | 'sedan'
  | 'suv'
  | 'crossover' // displayed as "Crossover / CUV"
  | 'truck'
  | 'coupe'
  | 'hatchback'
  | 'wagon'
  | 'van'
  | 'other'

export type CargoCapacity = {
  seatsUpCuFt?: number // cargo volume with rear seats up
  seatsFoldedCuFt?: number // cargo volume with rear seats folded
}

export type Price =
  | { mode: 'static'; amount: number }
  | { mode: 'range'; min: number; max: number }

export type MpgStats = {
  city?: number
  highway?: number
  combined?: number
}

export type ProConPolarity = 'pro' | 'con'

export interface CarProConAssignment {
  itemId: string // references ProConItem.id
  polarity: ProConPolarity
}

export interface Car {
  id: string
  year: number
  make: string
  model: string
  price: Price
  mpg?: MpgStats // gas / hybrid
  mpge?: MpgStats // optional; shown when fuelType is hybrid or electric
  cargo?: CargoCapacity
  bodyStyle: BodyStyle
  fuelType: FuelType
  notes?: string
  proCons?: CarProConAssignment[]
  createdAt: string
  updatedAt: string
}

// Reusable pro/con labels — created on first use, shared across all cars.
export interface ProConItem {
  id: string
  label: string // e.g. "Wireless CarPlay", "Small third row"
  weight: number // 1–10 importance; lives on the catalog item globally
  createdAt: string
  updatedAt: string
}

export interface Comparison {
  id: string
  name: string
  carIds: string[] // ordered columns in the table
  createdAt: string
  updatedAt: string
}

// Human-readable labels for enums, used across forms and tables.
export const FUEL_TYPE_LABELS: Record<FuelType, string> = {
  gas: 'Gas',
  hybrid: 'Hybrid',
  electric: 'Electric',
}

export const BODY_STYLE_LABELS: Record<BodyStyle, string> = {
  sedan: 'Sedan',
  suv: 'SUV',
  crossover: 'Crossover / CUV',
  truck: 'Truck',
  coupe: 'Coupe',
  hatchback: 'Hatchback',
  wagon: 'Wagon',
  van: 'Van',
  other: 'Other',
}

export const FUEL_TYPES = Object.keys(FUEL_TYPE_LABELS) as FuelType[]
export const BODY_STYLES = Object.keys(BODY_STYLE_LABELS) as BodyStyle[]

// Shape of a full backup used by import/export.
export interface BackupFile {
  version: 1
  exportedAt: string
  cars: Car[]
  comparisons: Comparison[]
  proConItems: ProConItem[]
}
