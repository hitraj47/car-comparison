import { useState } from 'react'
import Modal from './Modal'
import { usePhotoUrls } from '../hooks/usePhotoUrls'
import { carTitle } from '../lib/format'
import type { Car } from '../types'

interface PhotoLightboxProps {
  car: Car
  onClose: () => void
}

/** Full-size photo viewer with captions and prev/next navigation. */
export default function PhotoLightbox({ car, onClose }: PhotoLightboxProps) {
  const photos = [...(car.photos ?? [])].sort((a, b) => a.sortOrder - b.sortOrder)
  const urls = usePhotoUrls(photos)
  const [idx, setIdx] = useState(0)

  if (photos.length === 0) return null
  const safeIdx = Math.min(idx, photos.length - 1)
  const current = photos[safeIdx]
  const go = (delta: number) =>
    setIdx((i) => (i + delta + photos.length) % photos.length)

  return (
    <Modal
      title={carTitle(car)}
      onClose={onClose}
      widthClass="max-w-3xl"
    >
      <div className="flex items-center gap-3">
        {photos.length > 1 && (
          <button
            type="button"
            onClick={() => go(-1)}
            className="rounded-full px-3 py-2 text-lg text-slate-500 hover:bg-slate-100"
            aria-label="Previous photo"
          >
            ‹
          </button>
        )}
        <div className="flex-1">
          <img
            src={urls[current.id]}
            alt={current.caption || carTitle(car)}
            className="max-h-[60vh] w-full rounded-md object-contain"
          />
          <div className="mt-2 flex items-center justify-between text-sm text-slate-500">
            <span>{current.caption}</span>
            {photos.length > 1 && (
              <span className="shrink-0">
                {safeIdx + 1} / {photos.length}
              </span>
            )}
          </div>
        </div>
        {photos.length > 1 && (
          <button
            type="button"
            onClick={() => go(1)}
            className="rounded-full px-3 py-2 text-lg text-slate-500 hover:bg-slate-100"
            aria-label="Next photo"
          >
            ›
          </button>
        )}
      </div>
    </Modal>
  )
}
