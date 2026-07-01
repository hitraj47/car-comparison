import { db } from '../db'
import type { BackupFile, Car, Comparison, ProConItem } from '../types'

export const BACKUP_VERSION = 1 as const

/** Gather the entire database into a backup object. */
export async function serializeBackup(): Promise<BackupFile> {
  const [cars, comparisons, proConItems] = await Promise.all([
    db.cars.toArray(),
    db.comparisons.toArray(),
    db.proConItems.toArray(),
  ])
  return {
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    cars,
    comparisons,
    proConItems,
  }
}

/** Parse and validate untrusted JSON text into a BackupFile. Throws on error. */
export function parseBackup(text: string): BackupFile {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error('File is not valid JSON.')
  }
  if (typeof data !== 'object' || data === null) {
    throw new Error('Backup must be a JSON object.')
  }
  const obj = data as Record<string, unknown>
  if (obj.version !== BACKUP_VERSION) {
    throw new Error(
      `Unsupported backup version: ${String(obj.version)} (expected ${BACKUP_VERSION}).`,
    )
  }
  const cars = requireArray(obj.cars, 'cars')
  const comparisons = requireArray(obj.comparisons, 'comparisons')
  const proConItems = requireArray(obj.proConItems, 'proConItems')

  // Light structural checks — every record needs an id string.
  requireIds(cars, 'cars')
  requireIds(comparisons, 'comparisons')
  requireIds(proConItems, 'proConItems')

  return {
    version: BACKUP_VERSION,
    exportedAt: typeof obj.exportedAt === 'string' ? obj.exportedAt : '',
    cars: cars as Car[],
    comparisons: comparisons as Comparison[],
    proConItems: proConItems as ProConItem[],
  }
}

function requireArray(value: unknown, field: string): unknown[] {
  if (!Array.isArray(value)) {
    throw new Error(`Backup field "${field}" must be an array.`)
  }
  return value
}

function requireIds(items: unknown[], field: string): void {
  for (const item of items) {
    if (
      typeof item !== 'object' ||
      item === null ||
      typeof (item as Record<string, unknown>).id !== 'string'
    ) {
      throw new Error(`Every record in "${field}" needs a string id.`)
    }
  }
}

export interface ImportSummary {
  cars: { added: number; updated: number }
  comparisons: { added: number; updated: number }
  proConItems: { added: number; updated: number }
}

/** Count how many records the import would add vs. update (merge by id). */
export async function summarizeImport(
  backup: BackupFile,
): Promise<ImportSummary> {
  const [carIds, compIds, itemIds] = await Promise.all([
    existingIds(db.cars),
    existingIds(db.comparisons),
    existingIds(db.proConItems),
  ])
  return {
    cars: split(backup.cars, carIds),
    comparisons: split(backup.comparisons, compIds),
    proConItems: split(backup.proConItems, itemIds),
  }
}

async function existingIds(table: {
  toCollection: () => { primaryKeys: () => Promise<string[]> }
}): Promise<Set<string>> {
  const keys = await table.toCollection().primaryKeys()
  return new Set(keys)
}

function split(
  records: { id: string }[],
  existing: Set<string>,
): { added: number; updated: number } {
  let added = 0
  let updated = 0
  for (const r of records) {
    if (existing.has(r.id)) updated++
    else added++
  }
  return { added, updated }
}

/** Merge the backup into the database by id (update existing, add new). */
export async function applyImport(backup: BackupFile): Promise<void> {
  await db.transaction(
    'rw',
    db.cars,
    db.comparisons,
    db.proConItems,
    async () => {
      await db.cars.bulkPut(backup.cars)
      await db.comparisons.bulkPut(backup.comparisons)
      await db.proConItems.bulkPut(backup.proConItems)
    },
  )
}
