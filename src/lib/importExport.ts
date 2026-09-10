import { db } from '../db'
import type {
  AttributeDef,
  BackupFile,
  Car,
  Comparison,
  ProConItem,
  SerializedCar,
} from '../types'

export const BACKUP_VERSION = 2 as const

// --- Blob <-> base64 --------------------------------------------------------

export async function blobToBase64(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer())
  let binary = ''
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
  return btoa(binary)
}

export function base64ToBlob(data: string, mimeType: string): Blob {
  const binary = atob(data)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return new Blob([bytes], { type: mimeType })
}

async function serializeCar(car: Car): Promise<SerializedCar> {
  const { photos, ...rest } = car
  const sc: SerializedCar = rest
  if (photos && photos.length > 0) {
    sc.photos = await Promise.all(
      photos.map(async (p) => ({
        id: p.id,
        data: await blobToBase64(p.blob),
        mimeType: p.mimeType,
        caption: p.caption,
        sortOrder: p.sortOrder,
      })),
    )
  }
  return sc
}

function deserializeCar(sc: SerializedCar): Car {
  const { photos, ...rest } = sc
  const car = rest as Car
  if (photos && photos.length > 0) {
    car.photos = photos.map((p) => ({
      id: p.id,
      blob: base64ToBlob(p.data, p.mimeType),
      mimeType: p.mimeType,
      caption: p.caption,
      sortOrder: p.sortOrder,
    }))
  }
  return car
}

// --- Export -----------------------------------------------------------------

/** Gather the entire database into a backup object (photos as base64). */
export async function serializeBackup(): Promise<BackupFile> {
  const [cars, comparisons, proConItems, attributeDefs] = await Promise.all([
    db.cars.toArray(),
    db.comparisons.toArray(),
    db.proConItems.toArray(),
    db.attributeDefs.toArray(),
  ])
  return {
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    cars: await Promise.all(cars.map(serializeCar)),
    comparisons,
    proConItems,
    attributeDefs,
  }
}

// --- Import -----------------------------------------------------------------

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
  // Accept v1 (no photos) and v2 (photos as base64) backups.
  if (obj.version !== 1 && obj.version !== 2) {
    throw new Error(
      `Unsupported backup version: ${String(obj.version)} (expected 1 or 2).`,
    )
  }
  const cars = requireArray(obj.cars, 'cars')
  const comparisons = requireArray(obj.comparisons, 'comparisons')
  const proConItems = requireArray(obj.proConItems, 'proConItems')
  // attributeDefs is optional (absent in v1 and early-v2 backups).
  const attributeDefs =
    obj.attributeDefs === undefined
      ? []
      : requireArray(obj.attributeDefs, 'attributeDefs')

  // Light structural checks — every record needs an id string.
  requireIds(cars, 'cars')
  requireIds(comparisons, 'comparisons')
  requireIds(proConItems, 'proConItems')
  requireIds(attributeDefs, 'attributeDefs')

  return {
    version: BACKUP_VERSION,
    exportedAt: typeof obj.exportedAt === 'string' ? obj.exportedAt : '',
    cars: cars as SerializedCar[],
    comparisons: comparisons as Comparison[],
    proConItems: proConItems as ProConItem[],
    attributeDefs: attributeDefs as AttributeDef[],
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
  attributeDefs: { added: number; updated: number }
}

/** Count how many records the import would add vs. update (merge by id). */
export async function summarizeImport(
  backup: BackupFile,
): Promise<ImportSummary> {
  const [carIds, compIds, itemIds, attrIds] = await Promise.all([
    existingIds(db.cars),
    existingIds(db.comparisons),
    existingIds(db.proConItems),
    existingIds(db.attributeDefs),
  ])
  return {
    cars: split(backup.cars, carIds),
    comparisons: split(backup.comparisons, compIds),
    proConItems: split(backup.proConItems, itemIds),
    attributeDefs: split(backup.attributeDefs ?? [], attrIds),
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
  const cars = backup.cars.map(deserializeCar)
  await db.transaction(
    'rw',
    db.cars,
    db.comparisons,
    db.proConItems,
    db.attributeDefs,
    async () => {
      await db.cars.bulkPut(cars)
      await db.comparisons.bulkPut(backup.comparisons)
      await db.proConItems.bulkPut(backup.proConItems)
      if (backup.attributeDefs?.length) {
        await db.attributeDefs.bulkPut(backup.attributeDefs)
      }
    },
  )
}
