import { describe, expect, it } from 'vitest'
import { BACKUP_VERSION, base64ToBlob, blobToBase64, parseBackup } from './importExport'

describe('base64 <-> blob', () => {
  it('round-trips bytes and preserves mime type', async () => {
    const bytes = new Uint8Array([0, 1, 2, 100, 200, 254, 255])
    const blob = new Blob([bytes], { type: 'image/png' })
    const b64 = await blobToBase64(blob)
    const back = base64ToBlob(b64, 'image/png')
    expect(back.type).toBe('image/png')
    const roundTripped = new Uint8Array(await back.arrayBuffer())
    expect(Array.from(roundTripped)).toEqual(Array.from(bytes))
  })
})

describe('parseBackup', () => {
  const empty = { exportedAt: '', cars: [], comparisons: [], proConItems: [] }

  it('accepts a v1 backup (no photos) and upgrades the version', () => {
    const parsed = parseBackup(JSON.stringify({ version: 1, ...empty }))
    expect(parsed.version).toBe(BACKUP_VERSION)
  })

  it('accepts a v2 backup', () => {
    const parsed = parseBackup(JSON.stringify({ version: 2, ...empty }))
    expect(parsed.version).toBe(BACKUP_VERSION)
  })

  it('rejects an unsupported version', () => {
    expect(() =>
      parseBackup(JSON.stringify({ version: 9, ...empty })),
    ).toThrow(/version/i)
  })

  it('rejects malformed fields', () => {
    expect(() =>
      parseBackup(JSON.stringify({ version: 2, ...empty, cars: {} })),
    ).toThrow(/array/i)
    expect(() =>
      parseBackup(
        JSON.stringify({ version: 2, ...empty, cars: [{ noId: true }] }),
      ),
    ).toThrow(/id/i)
  })
})
