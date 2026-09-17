// Pure transforms for the external car-data feature (CAR-13).
//
// Everything here is deterministic and free of I/O so it can be unit-tested in
// isolation. The fetch layer (sources.ts) and the serverless handlers wire
// these together with the real APIs and the KV cache.

import type { BodyStyle, CargoCapacity, FuelType, MpgStats } from '../../types/index.js'
import type { CarSpecs, FetchedCarData, MenuOption } from './types.js'

// FuelEconomy.gov returns every field as a string; "", "-1" and (for metrics)
// "0" all stand in for "no data". We only read the string fields we need.
export type FuelEconomyVehicle = Record<string, unknown>

// The menu endpoints return { menuItem: [...] }, or a single { menuItem: {...} }
// when there is exactly one result, or { menuItem: undefined } / null when none.
interface RawMenuItem {
  text?: string
  value?: string | number
}

const KW_TO_HP = 1.34102

// --- Menu parsing ----------------------------------------------------------

// Normalize the FuelEconomy menu shape (array | single object | missing) into a
// clean MenuOption[]. Blank entries are dropped.
export function normalizeMenuItems(raw: unknown): MenuOption[] {
  const container = (raw as { menuItem?: unknown } | null)?.menuItem
  if (container == null) return []
  const items: RawMenuItem[] = Array.isArray(container)
    ? (container as RawMenuItem[])
    : [container as RawMenuItem]
  const out: MenuOption[] = []
  for (const item of items) {
    const value = item?.value == null ? '' : String(item.value)
    const label = item?.text == null ? value : String(item.text)
    if (value === '') continue
    out.push({ value, label })
  }
  return out
}

// Parse NHTSA vPIC's GetModelsForMakeYear payload into plain model-name strings.
export function parseNhtsaModels(raw: unknown): string[] {
  const results = (raw as { Results?: unknown } | null)?.Results
  if (!Array.isArray(results)) return []
  const names: string[] = []
  for (const r of results) {
    const name = (r as { Model_Name?: unknown })?.Model_Name
    if (typeof name === 'string' && name.trim() !== '') names.push(name.trim())
  }
  return names
}

// --- Slugs & cache keys ----------------------------------------------------

// Lowercase, collapse non-alphanumerics to single dashes, trim dashes.
export function slug(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

// KV cache key for a compiled variant, e.g. car:2025:toyota:corolla-cross:hybrid
export function kvKey(
  year: number | string,
  make: string,
  model: string,
  variant: string,
): string {
  return ['car', String(year), slug(make), slug(model), slug(variant)].join(':')
}

// --- Numeric coercion ------------------------------------------------------

// Parse a FuelEconomy string field to a positive number, treating "", "-1" and
// "0" as "no data" (real MPG/displacement/cylinder counts are never 0).
function posNum(value: unknown): number | undefined {
  if (value == null) return undefined
  const n = Number(String(value).trim())
  if (!Number.isFinite(n) || n <= 0) return undefined
  return n
}

// --- EV horsepower ---------------------------------------------------------

// FuelEconomy's `evMotor` describes motor power like "98 and 195 kW AC 3-Phase"
// (dual-motor) or "150 kW". We sum the kW figures and convert to horsepower —
// the "mathematical" EV horsepower the ticket calls for. Returns undefined when
// no kW figure is present.
export function parseEvHorsepower(evMotor: unknown): number | undefined {
  if (typeof evMotor !== 'string') return undefined
  // Match a group of one or more numbers joined by "and" / "&" / "," / "/"
  // ahead of a single "kW" unit — dual-motor cars share one label, e.g.
  // "98 and 195 kW". Sum every number in every such group.
  const groups = evMotor.matchAll(
    /([\d.]+(?:\s*(?:and|&|,|\/)\s*[\d.]+)*)\s*kW/gi,
  )
  let totalKw = 0
  for (const [, group] of groups) {
    for (const n of group.split(/\s*(?:and|&|,|\/)\s*/i)) {
      const value = parseFloat(n)
      if (Number.isFinite(value)) totalKw += value
    }
  }
  if (totalKw <= 0) return undefined
  return Math.round(totalKw * KW_TO_HP)
}

// --- Field mapping ---------------------------------------------------------

export function detectFuelType(v: FuelEconomyVehicle): FuelType {
  const atv = String(v.atvType ?? '').toLowerCase()
  const fuel1 = String(v.fuelType1 ?? '').toLowerCase()
  if (atv === 'ev' || atv === 'fcv' || fuel1 === 'electricity') return 'electric'
  if (atv.includes('hybrid')) return 'hybrid'
  return 'gas'
}

// Best-effort mapping from FuelEconomy's EPA VClass to our BodyStyle enum.
export function mapVClassToBodyStyle(vclass: unknown): BodyStyle {
  const c = String(vclass ?? '').toLowerCase()
  if (c.includes('sport utility')) return 'suv'
  if (c.includes('pickup')) return 'truck'
  if (c.includes('station wagon') || c.includes('wagon')) return 'wagon'
  if (c.includes('minivan') || c.includes('van')) return 'van'
  if (c.includes('two seater')) return 'coupe'
  if (c.includes('car')) return 'sedan'
  return 'other'
}

// Rear cargo room comes from FuelEconomy's luggage-volume fields (cu ft):
// lv4 (4-door), hlv (hatchback), lv2 (2-door). We take the first that is
// present. FuelEconomy has no seats-folded figure, so that stays for the user.
export function pickCargo(v: FuelEconomyVehicle): CargoCapacity | undefined {
  const up = posNum(v.lv4) ?? posNum(v.hlv) ?? posNum(v.lv2)
  if (up == null) return undefined
  return { seatsUpCuFt: up }
}

function buildStats(
  city: unknown,
  highway: unknown,
  combined: unknown,
): MpgStats | undefined {
  const stats: MpgStats = {
    city: posNum(city),
    highway: posNum(highway),
    combined: posNum(combined),
  }
  if (stats.city == null && stats.highway == null && stats.combined == null) {
    return undefined
  }
  return stats
}

// --- The merge -------------------------------------------------------------

interface MergeInput {
  vehicle: FuelEconomyVehicle
  // NHTSA-confirmed canonical make/model, when available.
  nhtsaMake?: string
  nhtsaModel?: string
}

// Combine a FuelEconomy vehicle record (and optional NHTSA name enrichment) into
// the subset of a Car we can fill automatically, flagging what is still missing.
export function mergeCarData({
  vehicle,
  nhtsaMake,
  nhtsaModel,
}: MergeInput): FetchedCarData {
  const fuelType = detectFuelType(vehicle)
  const year = posNum(vehicle.year) ?? 0
  const make = nhtsaMake?.trim() || String(vehicle.make ?? '').trim()
  const model = nhtsaModel?.trim() || String(vehicle.model ?? '').trim()

  // For EVs, city08/highway08/comb08 already hold MPGe. For gas/hybrid they hold
  // MPG. Plug-in hybrids expose their electric side via the phev* fields.
  let mpg: MpgStats | undefined
  let mpge: MpgStats | undefined
  if (fuelType === 'electric') {
    mpge = buildStats(vehicle.city08, vehicle.highway08, vehicle.comb08)
  } else {
    mpg = buildStats(vehicle.city08, vehicle.highway08, vehicle.comb08)
    if (fuelType === 'hybrid') {
      mpge = buildStats(vehicle.phevCity, vehicle.phevHwy, vehicle.phevComb)
    }
  }

  const cargo = pickCargo(vehicle)

  const specs: CarSpecs = {}
  const cylinders = posNum(vehicle.cylinders)
  if (cylinders != null) specs.cylinders = cylinders
  const displ = posNum(vehicle.displ)
  if (displ != null) specs.displacementL = displ
  if (fuelType === 'electric') {
    const hp = parseEvHorsepower(vehicle.evMotor)
    if (hp != null) specs.horsepowerHp = hp
  }

  const missing: string[] = []
  if (!mpg && fuelType !== 'electric') missing.push('MPG')
  if (fuelType === 'electric' && !mpge) missing.push('MPGe')
  if (!cargo) missing.push('cargo')
  // Price is never provided by these APIs.
  missing.push('price')

  return {
    year,
    make,
    model,
    fuelType,
    bodyStyle: mapVClassToBodyStyle(vehicle.VClass),
    mpg,
    mpge,
    cargo,
    specs,
    missing,
    source: nhtsaMake || nhtsaModel ? 'fueleconomy+nhtsa' : 'fueleconomy',
  }
}
