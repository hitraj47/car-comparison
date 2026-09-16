// Maps a compiled lookup result (CAR-13) onto the Add Car form fields (CAR-14).
//
// Pure and string-valued so it drops straight into the form's controlled
// inputs, and so it can be unit-tested without rendering the form. Engine specs
// that have no first-class field on `Car` (horsepower, cylinders, displacement)
// and the list of fields the APIs couldn't determine are folded into a
// human-readable notes summary the user can keep or clear.

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

const SOURCE_LABELS: Record<FetchedCarData['source'], string> = {
  'fueleconomy+nhtsa': 'FuelEconomy.gov + NHTSA',
  fueleconomy: 'FuelEconomy.gov',
}

// A short, readable summary of the engine specs and still-missing fields, meant
// to be appended to the notes textarea. Returns '' when there is nothing worth
// noting so the caller can skip appending.
export function fetchedNotesSummary(data: FetchedCarData): string {
  const lines: string[] = [`Auto-filled from ${SOURCE_LABELS[data.source]}.`]

  const { horsepowerHp, cylinders, displacementL } = data.specs
  const engine: string[] = []
  if (horsepowerHp != null) engine.push(`${horsepowerHp} hp`)
  if (cylinders != null) engine.push(`${cylinders}-cyl`)
  if (displacementL != null) engine.push(`${displacementL}L`)
  if (engine.length > 0) lines.push(`Engine: ${engine.join(', ')}.`)

  if (data.missing.length > 0) {
    lines.push(`Still needed: ${data.missing.join(', ')}.`)
  }

  return lines.join('\n')
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
