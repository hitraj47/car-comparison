// Maps a compiled lookup result (CAR-13) onto the Add Car form fields (CAR-14).
//
// Pure and string-valued so it drops straight into the form's controlled
// inputs, and so it can be unit-tested without rendering the form. Data with no
// first-class field on `Car` (engine specs) and fields the APIs couldn't
// determine are simply dropped — the notes field is left for the user alone.

import type { FetchedCarData } from './types'
import type { BodyStyle, FuelType } from '../../types'

// The subset of the Add Car form we can auto-fill. Keys mirror the form's
// FormState so the patch merges in directly; values are strings for the
// controlled number/select inputs.
export interface CarFormPatch {
  year: string
  make: string
  model: string
  bodyStyle: BodyStyle
  fuelType: FuelType
  mpgCity: string
  mpgHighway: string
  mpgCombined: string
  mpgeCity: string
  mpgeHighway: string
  mpgeCombined: string
  cargoUp: string
  cargoFolded: string
}

const str = (n?: number): string => (n == null ? '' : String(n))

// A drill-down where no trim/specs could be fetched (a model FuelEconomy doesn't
// know, or a model whose variant list came back empty) still tells us the
// identity the user picked. Filling just those fields beats sending them back to
// a blank form (CAR-22).
export function identityToForm(identity: {
  year: string
  make: string
  model: string
}): Pick<CarFormPatch, 'year' | 'make' | 'model'> {
  return {
    year: identity.year,
    make: identity.make,
    model: identity.model,
  }
}

export function fetchedToForm(data: FetchedCarData): CarFormPatch {
  return {
    year: str(data.year),
    make: data.make,
    model: data.model,
    bodyStyle: data.bodyStyle,
    fuelType: data.fuelType,
    mpgCity: str(data.mpg?.city),
    mpgHighway: str(data.mpg?.highway),
    mpgCombined: str(data.mpg?.combined),
    mpgeCity: str(data.mpge?.city),
    mpgeHighway: str(data.mpge?.highway),
    mpgeCombined: str(data.mpge?.combined),
    cargoUp: str(data.cargo?.seatsUpCuFt),
    cargoFolded: str(data.cargo?.seatsFoldedCuFt),
  }
}
