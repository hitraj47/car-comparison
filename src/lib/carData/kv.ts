// Minimal Vercel KV (Upstash-compatible) REST client for the car-data cache.
//
// We talk to the KV REST API directly with `fetch` instead of pulling in
// `@vercel/kv`: no extra dependency, and every function takes its config and
// fetch impl explicitly so it stays testable and never touches process.env from
// browser-bundled code. The serverless handlers read the env and build the
// config; when the env is absent, they pass `null` and caching is skipped.

import type { FetchLike } from './sources'

export interface KvConfig {
  url: string // KV_REST_API_URL
  token: string // KV_REST_API_TOKEN
}

// Build a KvConfig from a record of env vars, or null when KV is not configured
// (local dev, tests, or a deployment without KV). Callers treat null as "no
// cache" and degrade gracefully.
export function kvConfigFromEnv(
  env: Record<string, string | undefined>,
): KvConfig | null {
  const url = env.KV_REST_API_URL
  const token = env.KV_REST_API_TOKEN
  if (!url || !token) return null
  return { url, token }
}

// Run a single Redis command via the Upstash REST protocol (command as a JSON
// array in the POST body). Returns the raw `result` field.
async function command(
  fetchImpl: FetchLike,
  config: KvConfig,
  args: (string | number)[],
): Promise<unknown> {
  const res = await fetchImpl(config.url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(args),
  })
  if (!res.ok) throw new Error(`KV command failed (${res.status})`)
  const json = (await res.json()) as { result?: unknown }
  return json.result
}

// Fetch a string value, or null when the key is absent or on any error — the
// cache must never break a lookup.
export async function kvGet(
  fetchImpl: FetchLike,
  config: KvConfig,
  key: string,
): Promise<string | null> {
  try {
    const result = await command(fetchImpl, config, ['GET', key])
    return typeof result === 'string' ? result : null
  } catch {
    return null
  }
}

// Store a string value with a TTL (seconds). Errors are swallowed so a failed
// write never fails the request.
export async function kvSet(
  fetchImpl: FetchLike,
  config: KvConfig,
  key: string,
  value: string,
  ttlSeconds: number,
): Promise<void> {
  try {
    await command(fetchImpl, config, ['SET', key, value, 'EX', ttlSeconds])
  } catch {
    // ignore — caching is best-effort
  }
}
