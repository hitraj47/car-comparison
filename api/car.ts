// GET /api/car?id=41213&year=2025&make=Toyota&model=Corolla&variant=Auto...
//
// Compiles a single variant into the subset of a Car we can fill automatically,
// merging FuelEconomy.gov specs with NHTSA vPIC names and computing EV
// horsepower. Results are cached in Vercel KV under a stable key so repeat
// visitors hit Redis in milliseconds; the response header reports the hit/miss.

import { resolveCar } from '../src/lib/carData/cache'
import { kvConfigFromEnv } from '../src/lib/carData/kv'
import {
  badRequest,
  param,
  serverError,
  type ApiRequest,
  type ApiResponse,
} from './_shared'

export default async function handler(
  req: ApiRequest,
  res: ApiResponse,
): Promise<void> {
  const vehicleId = param(req, 'id')
  const year = param(req, 'year')
  const make = param(req, 'make')
  const model = param(req, 'model')
  const variant = param(req, 'variant')
  if (!vehicleId || !year || !make || !model || !variant) {
    return badRequest(res, 'id, year, make, model and variant are required')
  }

  try {
    const { data, cached } = await resolveCar({
      fetchImpl: fetch,
      kv: kvConfigFromEnv(process.env),
      vehicleId,
      year,
      make,
      model,
      variant,
    })
    res
      .setHeader('Cache-Control', 'public, max-age=0, s-maxage=86400')
      .setHeader('X-Cache', cached ? 'HIT' : 'MISS')
      .status(200)
      .json(data)
  } catch (err) {
    serverError(res, err)
  }
}
