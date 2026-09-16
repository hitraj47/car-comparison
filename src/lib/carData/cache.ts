// Cache-through resolution of a compiled car variant (CAR-13).
//
// On a hit the KV value is returned in milliseconds; on a miss we call the
// external APIs, merge, and write the compiled result back under a stable key
// (car:<year>:<make>:<model>:<variant>). KV is optional — when `kv` is null the
// external fetch runs every time, which is the local-dev / no-KV path.

import { fetchCompiledCar, type FetchLike } from './sources'
import { kvGet, kvSet, type KvConfig } from './kv'
import { kvKey } from './transform'
import type { FetchedCarData } from './types'

// Compiled variants change rarely; keep them a week.
export const CAR_TTL_SECONDS = 60 * 60 * 24 * 7

export interface ResolveCarArgs {
  fetchImpl: FetchLike
  kv: KvConfig | null
  vehicleId: string
  year: string
  make: string
  model: string
  variant: string // the variant label, used only to build the cache key
}

export interface ResolveCarResult {
  data: FetchedCarData
  cached: boolean
}

export async function resolveCar({
  fetchImpl,
  kv,
  vehicleId,
  year,
  make,
  model,
  variant,
}: ResolveCarArgs): Promise<ResolveCarResult> {
  const key = kvKey(year, make, model, variant)

  if (kv) {
    const hit = await kvGet(fetchImpl, kv, key)
    if (hit) {
      try {
        return { data: JSON.parse(hit) as FetchedCarData, cached: true }
      } catch {
        // Corrupt cache entry — fall through and recompute.
      }
    }
  }

  const data = await fetchCompiledCar(fetchImpl, vehicleId)

  if (kv) {
    await kvSet(fetchImpl, kv, key, JSON.stringify(data), CAR_TTL_SECONDS)
  }

  return { data, cached: false }
}
