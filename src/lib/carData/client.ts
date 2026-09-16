// Browser client for the car-data lookup API (CAR-13).
//
// Thin wrappers over the serverless endpoints under /api. CAR-14 builds the
// drill-down UI on top of these. All responses are JSON; errors throw so the UI
// can show a message and fall back to manual entry.

import type { FetchedCarData, MenuOption, ModelOption } from './types'

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url)
  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    throw new Error(`Lookup failed (${res.status})${detail ? `: ${detail}` : ''}`)
  }
  return res.json() as Promise<T>
}

const q = encodeURIComponent

export function getYears(): Promise<MenuOption[]> {
  return getJson('/api/menu?field=years')
}

export function getMakes(year: string): Promise<MenuOption[]> {
  return getJson(`/api/menu?field=makes&year=${q(year)}`)
}

export function getModels(year: string, make: string): Promise<ModelOption[]> {
  return getJson(`/api/menu?field=models&year=${q(year)}&make=${q(make)}`)
}

export function getVariants(
  year: string,
  make: string,
  model: string,
): Promise<MenuOption[]> {
  return getJson(
    `/api/variants?year=${q(year)}&make=${q(make)}&model=${q(model)}`,
  )
}

// Fetch the compiled specs for a chosen variant. year/make/model/variant are
// passed so the server can build a stable cache key.
export function getCarData(args: {
  vehicleId: string
  year: string
  make: string
  model: string
  variant: string
}): Promise<FetchedCarData> {
  const { vehicleId, year, make, model, variant } = args
  return getJson(
    `/api/car?id=${q(vehicleId)}&year=${q(year)}&make=${q(make)}&model=${q(model)}&variant=${q(variant)}`,
  )
}
