// GET /api/menu?field=years
// GET /api/menu?field=makes&year=2025
// GET /api/menu?field=models&year=2025&make=Toyota
//
// Cascading drill-down menus for the car lookup. Edge-cached for a day since the
// menus rarely change. `models` combines FuelEconomy.gov with NHTSA vPIC.

import {
  fetchMakes,
  fetchModels,
  fetchYears,
} from '../src/lib/carData/sources'
import {
  badRequest,
  MENU_CACHE_CONTROL,
  param,
  serverError,
  type ApiRequest,
  type ApiResponse,
} from './_shared'

export default async function handler(
  req: ApiRequest,
  res: ApiResponse,
): Promise<void> {
  const field = param(req, 'field')
  try {
    if (field === 'years') {
      const data = await fetchYears(fetch)
      res.setHeader('Cache-Control', MENU_CACHE_CONTROL).status(200).json(data)
      return
    }

    if (field === 'makes') {
      const year = param(req, 'year')
      if (!year) return badRequest(res, 'year is required')
      const data = await fetchMakes(fetch, year)
      res.setHeader('Cache-Control', MENU_CACHE_CONTROL).status(200).json(data)
      return
    }

    if (field === 'models') {
      const year = param(req, 'year')
      const make = param(req, 'make')
      if (!year || !make) return badRequest(res, 'year and make are required')
      const data = await fetchModels(fetch, year, make)
      res.setHeader('Cache-Control', MENU_CACHE_CONTROL).status(200).json(data)
      return
    }

    badRequest(res, 'field must be one of: years, makes, models')
  } catch (err) {
    serverError(res, err)
  }
}
