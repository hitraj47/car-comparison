// GET /api/variants?year=2025&make=Toyota&model=Corolla
//
// The final drill-down step: engine/transmission variants for a model, from
// FuelEconomy.gov. Each option's `value` is the FuelEconomy vehicle id, passed
// on to /api/car. Edge-cached for a day.

import { fetchVariants } from '../src/lib/carData/sources.js'
import {
  badRequest,
  MENU_CACHE_CONTROL,
  param,
  serverError,
  type ApiRequest,
  type ApiResponse,
} from './_shared.js'

export default async function handler(
  req: ApiRequest,
  res: ApiResponse,
): Promise<void> {
  const year = param(req, 'year')
  const make = param(req, 'make')
  const model = param(req, 'model')
  if (!year || !make || !model) {
    return badRequest(res, 'year, make and model are required')
  }
  try {
    const data = await fetchVariants(fetch, year, make, model)
    res.setHeader('Cache-Control', MENU_CACHE_CONTROL).status(200).json(data)
  } catch (err) {
    serverError(res, err)
  }
}
