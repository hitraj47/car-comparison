import Dexie, { type EntityTable } from 'dexie'
import type {
  Car,
  Comparison,
  ProConItem,
  CarProConAssignment,
} from '../types'

// --- Database definition ---------------------------------------------------

export class CarComparisonDB extends Dexie {
  cars!: EntityTable<Car, 'id'>
  comparisons!: EntityTable<Comparison, 'id'>
  proConItems!: EntityTable<ProConItem, 'id'>

  constructor() {
    super('car-comparison')
    this.version(1).stores({
      // Only indexed fields are listed; other properties are stored as-is.
      cars: 'id, make, model, year, updatedAt',
      comparisons: 'id, name, updatedAt',
      proConItems: 'id, label, updatedAt',
    })
  }
}

export const db = new CarComparisonDB()

// --- Helpers ---------------------------------------------------------------

const now = () => new Date().toISOString()
const newId = () => crypto.randomUUID()

// --- Cars -------------------------------------------------------------------

export type CarInput = Omit<Car, 'id' | 'createdAt' | 'updatedAt'>

export async function createCar(input: CarInput): Promise<Car> {
  const timestamp = now()
  const car: Car = {
    ...input,
    id: newId(),
    createdAt: timestamp,
    updatedAt: timestamp,
  }
  await db.cars.add(car)
  return car
}

export async function updateCar(
  id: string,
  changes: Partial<CarInput>,
): Promise<void> {
  await db.cars.update(id, { ...changes, updatedAt: now() })
}

/**
 * Delete a car and remove it from any comparisons that reference it.
 * Runs in a transaction so the two tables stay consistent.
 */
export async function deleteCar(id: string): Promise<void> {
  await db.transaction('rw', db.cars, db.comparisons, async () => {
    await db.cars.delete(id)
    const affected = await db.comparisons
      .filter((c) => c.carIds.includes(id))
      .toArray()
    await Promise.all(
      affected.map((c) =>
        db.comparisons.update(c.id, {
          carIds: c.carIds.filter((cid) => cid !== id),
          updatedAt: now(),
        }),
      ),
    )
  })
}

export function getCar(id: string): Promise<Car | undefined> {
  return db.cars.get(id)
}

export function getCars(ids: string[]): Promise<(Car | undefined)[]> {
  return db.cars.bulkGet(ids)
}

// --- Comparisons ------------------------------------------------------------

export async function createComparison(
  name: string,
  carIds: string[] = [],
): Promise<Comparison> {
  const timestamp = now()
  const comparison: Comparison = {
    id: newId(),
    name,
    carIds,
    createdAt: timestamp,
    updatedAt: timestamp,
  }
  await db.comparisons.add(comparison)
  return comparison
}

export async function updateComparison(
  id: string,
  changes: Partial<Pick<Comparison, 'name' | 'carIds' | 'scoring'>>,
): Promise<void> {
  await db.comparisons.update(id, { ...changes, updatedAt: now() })
}

export function deleteComparison(id: string): Promise<void> {
  return db.comparisons.delete(id)
}

export function getComparison(id: string): Promise<Comparison | undefined> {
  return db.comparisons.get(id)
}

// --- Pro/Con catalog --------------------------------------------------------

export const DEFAULT_PROCON_WEIGHT = 5

export async function createProConItem(
  label: string,
  weight: number = DEFAULT_PROCON_WEIGHT,
): Promise<ProConItem> {
  const timestamp = now()
  const item: ProConItem = {
    id: newId(),
    label: label.trim(),
    weight,
    createdAt: timestamp,
    updatedAt: timestamp,
  }
  await db.proConItems.add(item)
  return item
}

export async function updateProConItem(
  id: string,
  changes: Partial<Pick<ProConItem, 'label' | 'weight'>>,
): Promise<void> {
  await db.proConItems.update(id, { ...changes, updatedAt: now() })
}

export function deleteProConItem(id: string): Promise<void> {
  return db.proConItems.delete(id)
}

/**
 * Find an existing catalog item by case-insensitive label, or create one.
 * Used by the pro/con typeahead so typing a new label reuses matches.
 */
export async function findOrCreateProConItem(
  label: string,
): Promise<ProConItem> {
  const trimmed = label.trim()
  const existing = await db.proConItems
    .filter((i) => i.label.toLowerCase() === trimmed.toLowerCase())
    .first()
  if (existing) return existing
  return createProConItem(trimmed)
}

// Re-export the assignment type for convenience at call sites.
export type { CarProConAssignment }
