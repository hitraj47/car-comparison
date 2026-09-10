import { useEffect, useState } from 'react'
import type { CarPhoto } from '../types'

/** Build (and revoke) object URLs for the given photos' blobs. */
export function usePhotoUrls(photos: CarPhoto[]): Record<string, string> {
  const [urls, setUrls] = useState<Record<string, string>>({})
  useEffect(() => {
    const map: Record<string, string> = {}
    for (const p of photos) map[p.id] = URL.createObjectURL(p.blob)
    setUrls(map)
    return () => {
      for (const u of Object.values(map)) URL.revokeObjectURL(u)
    }
  }, [photos])
  return urls
}
