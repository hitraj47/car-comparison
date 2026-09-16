import { describe, expect, it, vi } from 'vitest'
import { resolveCar } from './cache'
import { kvConfigFromEnv } from './kv'
import type { FetchLike } from './sources'

const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })

const KV = { url: 'https://kv.example.com', token: 'tok' }

const VEHICLE = {
  make: 'Toyota',
  model: 'Corolla',
  year: '2020',
  fuelType1: 'Regular Gasoline',
  city08: '31',
  highway08: '38',
  comb08: '34',
  cylinders: '4',
  displ: '2.0',
  VClass: 'Compact Cars',
  lv4: '13',
}

describe('kvConfigFromEnv', () => {
  it('returns config when both vars are present', () => {
    expect(
      kvConfigFromEnv({ KV_REST_API_URL: 'u', KV_REST_API_TOKEN: 't' }),
    ).toEqual({ url: 'u', token: 't' })
  })

  it('returns null when either var is missing', () => {
    expect(kvConfigFromEnv({ KV_REST_API_URL: 'u' })).toBeNull()
    expect(kvConfigFromEnv({})).toBeNull()
  })
})

describe('resolveCar', () => {
  const baseArgs = {
    vehicleId: '41213',
    year: '2020',
    make: 'Toyota',
    model: 'Corolla',
    variant: 'Auto, 4 cyl, 2.0 L',
  }

  it('returns the KV value on a hit without calling the external APIs', async () => {
    const cachedData = { make: 'Toyota', model: 'Corolla', cachedMarker: true }
    const fetchImpl: FetchLike = vi.fn(async (url: string) => {
      if (url.includes('kv.example.com')) return json({ result: JSON.stringify(cachedData) })
      throw new Error('external API should not be called on a cache hit')
    })
    const { data, cached } = await resolveCar({ ...baseArgs, fetchImpl, kv: KV })
    expect(cached).toBe(true)
    expect((data as { cachedMarker?: boolean }).cachedMarker).toBe(true)
    // GET only — no external fetch.
    expect(fetchImpl).toHaveBeenCalledTimes(1)
  })

  it('fetches and writes back on a miss', async () => {
    const calls: string[] = []
    const fetchImpl: FetchLike = vi.fn(async (url: string, init) => {
      calls.push(`${init?.method ?? 'GET'} ${url}`)
      if (url.includes('kv.example.com')) {
        const body = JSON.parse(String(init?.body ?? '[]')) as string[]
        if (body[0] === 'GET') return json({ result: null }) // miss
        return json({ result: 'OK' }) // SET
      }
      if (url.includes('/vehicle/41213')) return json(VEHICLE)
      if (url.includes('GetModelsForMakeYear')) return json({ Results: [{ Model_Name: 'Corolla' }] })
      return new Response('not found', { status: 404 })
    })

    const { data, cached } = await resolveCar({ ...baseArgs, fetchImpl, kv: KV })
    expect(cached).toBe(false)
    expect(data.model).toBe('Corolla')
    expect(data.mpg).toEqual({ city: 31, highway: 38, combined: 34 })
    // A KV GET (miss) and a KV SET (write-back) both happened.
    expect(calls.some((c) => c.startsWith('POST') && c.includes('kv'))).toBe(true)
    expect(calls.filter((c) => c.includes('kv.example.com')).length).toBe(2)
  })

  it('skips KV entirely when no config is provided', async () => {
    const fetchImpl: FetchLike = vi.fn(async (url: string) => {
      if (url.includes('kv')) throw new Error('KV must not be touched')
      if (url.includes('/vehicle/41213')) return json(VEHICLE)
      if (url.includes('GetModelsForMakeYear')) return json({ Results: [] })
      return new Response('not found', { status: 404 })
    })
    const { data, cached } = await resolveCar({ ...baseArgs, fetchImpl, kv: null })
    expect(cached).toBe(false)
    expect(data.make).toBe('Toyota')
  })
})
