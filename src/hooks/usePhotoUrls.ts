import { useEffect, useState } from 'react'
import type { CarPhoto } from '../types'

/** Build (and revoke) object URLs for the given photos' blobs. */
export function usePhotoUrls(photos: CarPhoto[]): Record<string, string> {
  const [urls, setUrls] = useState<Record<string, string>>({})
  // Depend on the photo ids, not the array reference: callers routinely build a
  // fresh array each render (e.g. `[first]` or `[...photos].sort()`), and using
  // that as the effect dependency would re-run every render — revoking and
  // recreating each object URL in a loop (blank images + a UI-freezing render
  // loop). Keying on the ids re-runs only when the actual set of photos changes.
  const key = photos.map((p) => p.id).join(',')
  useEffect(() => {
    const map: Record<string, string> = {}
    for (const p of photos) map[p.id] = URL.createObjectURL(p.blob)
    setUrls(map)
    return () => {
      for (const u of Object.values(map)) URL.revokeObjectURL(u)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
  return urls
}
