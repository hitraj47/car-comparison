// External API access for the car-data feature (CAR-13).
//
// Two free, keyless public APIs are combined:
//   - FuelEconomy.gov  — year/make/model/variant menus + full spec records
//   - NHTSA vPIC       — canonical model names, merged into the model menu
//
// `fetch` is injected so the serverless handlers and unit tests can supply their
// own implementation. Network/parse failures from the enrichment source are
// swallowed so a lookup degrades to FuelEconomy-only rather than failing.

import type { FetchedCarData, MenuOption, ModelOption } from './types.js'
import {
  mergeCarData,
  normalizeMenuItems,
  parseNhtsaModels,
  type FuelEconomyVehicle,
} from './transform.js'

export type FetchLike = (url: string, init?: RequestInit) => Promise<Response>

const FE = 'https://www.fueleconomy.gov/ws/rest/vehicle'
const NHTSA = 'https://vpic.nhtsa.dot.gov/api/vehicles'

// FuelEconomy.gov returns XML unless JSON is explicitly requested; NHTSA ignores
// the header, so sending it everywhere is safe.
async function getJson(fetchImpl: FetchLike, url: string): Promise<unknown> {
  const res = await fetchImpl(url, { headers: { Accept: 'application/json' } })
  if (!res.ok) {
    throw new Error(`Request failed (${res.status}) for ${url}`)
  }
  return res.json()
}

// --- Menus -----------------------------------------------------------------

export async function fetchYears(fetchImpl: FetchLike): Promise<MenuOption[]> {
  const raw = await getJson(fetchImpl, `${FE}/menu/year`)
  return normalizeMenuItems(raw)
}

export async function fetchMakes(
  fetchImpl: FetchLike,
  year: string,
): Promise<MenuOption[]> {
  const raw = await getJson(
    fetchImpl,
    `${FE}/menu/make?year=${encodeURIComponent(year)}`,
  )
  return normalizeMenuItems(raw)
}

// The model menu combines both APIs: FuelEconomy models (which have real spec
// data) merged with NHTSA's canonical list (which may include models FE lacks,
// flagged hasData:false so the UI can send the user straight to manual entry).
export async function fetchModels(
  fetchImpl: FetchLike,
  year: string,
  make: string,
): Promise<ModelOption[]> {
  const feRaw = await getJson(
    fetchImpl,
    `${FE}/menu/model?year=${encodeURIComponent(year)}&make=${encodeURIComponent(make)}`,
  )
  const feModels = normalizeMenuItems(feRaw)

  let nhtsaModels: string[] = []
  try {
    const nhtsaRaw = await getJson(
      fetchImpl,
      `${NHTSA}/GetModelsForMakeYear/make/${encodeURIComponent(make)}/modelyear/${encodeURIComponent(year)}?format=json`,
    )
    nhtsaModels = parseNhtsaModels(nhtsaRaw)
  } catch {
    // Enrichment is best-effort; fall back to FuelEconomy-only models.
  }

  const byKey = new Map<string, ModelOption>()
  for (const m of feModels) {
    byKey.set(m.value.toLowerCase(), {
      value: m.value,
      label: m.label,
      hasData: true,
    })
  }
  for (const name of nhtsaModels) {
    const key = name.toLowerCase()
    if (!byKey.has(key)) {
      byKey.set(key, { value: name, label: name, hasData: false })
    }
  }
  return [...byKey.values()].sort((a, b) => a.label.localeCompare(b.label))
}

// The final drill-down step: engine/transmission variants for a model. Each
// option's value is the FuelEconomy vehicle id used to fetch the full record.
export async function fetchVariants(
  fetchImpl: FetchLike,
  year: string,
  make: string,
  model: string,
): Promise<MenuOption[]> {
  const raw = await getJson(
    fetchImpl,
    `${FE}/menu/options?year=${encodeURIComponent(year)}&make=${encodeURIComponent(make)}&model=${encodeURIComponent(model)}`,
  )
  return normalizeMenuItems(raw)
}

// --- Compiled variant ------------------------------------------------------

// Fetch a FuelEconomy vehicle record by id and merge it into a FetchedCarData,
// enriching make/model names from NHTSA when a match is found.
export async function fetchCompiledCar(
  fetchImpl: FetchLike,
  vehicleId: string,
): Promise<FetchedCarData> {
  const vehicle = (await getJson(
    fetchImpl,
    `${FE}/${encodeURIComponent(vehicleId)}`,
  )) as FuelEconomyVehicle

  const year = String(vehicle.year ?? '')
  const make = String(vehicle.make ?? '')
  const model = String(vehicle.model ?? '')

  let nhtsaMake: string | undefined
  let nhtsaModel: string | undefined
  try {
    const raw = await getJson(
      fetchImpl,
      `${NHTSA}/GetModelsForMakeYear/make/${encodeURIComponent(make)}/modelyear/${encodeURIComponent(year)}?format=json`,
    )
    const models = parseNhtsaModels(raw)
    // Use NHTSA's canonical spelling when the FE model starts with one of its
    // names (FE appends trim/drivetrain detail, e.g. "Corolla AWD LE/SE").
    const match = models.find((m) =>
      model.toLowerCase().startsWith(m.toLowerCase()),
    )
    if (match) {
      nhtsaModel = match
      nhtsaMake = make // FE and NHTSA agree on make; keep FE's casing
    }
  } catch {
    // Best-effort; fall back to FuelEconomy names.
  }

  return mergeCarData({ vehicle, nhtsaMake, nhtsaModel })
}
