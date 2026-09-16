// Shared helpers for the car-data serverless endpoints (CAR-13).
//
// These run on Vercel's Node runtime. We keep a minimal local shim for the
// request/response types so the feature needs no @vercel/node dependency; the
// real objects Vercel passes are a superset of what we use here.

export interface ApiRequest {
  query: Record<string, string | string[] | undefined>
  method?: string
}

export interface ApiResponse {
  status(code: number): ApiResponse
  setHeader(name: string, value: string): ApiResponse
  json(body: unknown): void
  send(body: string): void
}

// One day at the edge, with a grace window while a fresh copy is fetched.
export const MENU_CACHE_CONTROL =
  'public, max-age=0, s-maxage=86400, stale-while-revalidate=3600'

// Read a required single-value query param, or null when absent/empty.
export function param(req: ApiRequest, name: string): string | null {
  const raw = req.query[name]
  const value = Array.isArray(raw) ? raw[0] : raw
  return value != null && value !== '' ? value : null
}

export function badRequest(res: ApiResponse, message: string): void {
  res.status(400).json({ error: message })
}

export function serverError(res: ApiResponse, err: unknown): void {
  const message = err instanceof Error ? err.message : 'Upstream request failed'
  res.status(502).json({ error: message })
}
