import { useRef, useState } from 'react'
import { MAX_PHOTOS_PER_CAR, type CarPhoto } from '../types'
import { usePhotoUrls } from '../hooks/usePhotoUrls'

interface PhotoUploaderProps {
  photos: CarPhoto[]
  onChange: (photos: CarPhoto[]) => void
}

/** Re-number sortOrder to match array position. */
function renumber(photos: CarPhoto[]): CarPhoto[] {
  return photos.map((p, i) => ({ ...p, sortOrder: i }))
}

export default function PhotoUploader({ photos, onChange }: PhotoUploaderProps) {
  const fileInput = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)
  const urls = usePhotoUrls(photos)
  const ordered = [...photos].sort((a, b) => a.sortOrder - b.sortOrder)
  const room = MAX_PHOTOS_PER_CAR - photos.length

  function addFiles(files: FileList | null) {
    if (!files) return
    const images = Array.from(files).filter((f) => f.type.startsWith('image/'))
    if (images.length === 0) return
    const next = [...ordered]
    for (const file of images.slice(0, MAX_PHOTOS_PER_CAR - next.length)) {
      next.push({
        id: crypto.randomUUID(),
        blob: file,
        mimeType: file.type,
        sortOrder: next.length,
      })
    }
    onChange(renumber(next))
  }

  function remove(id: string) {
    onChange(renumber(ordered.filter((p) => p.id !== id)))
  }

  function move(index: number, delta: number) {
    const target = index + delta
    if (target < 0 || target >= ordered.length) return
    const next = [...ordered]
    ;[next[index], next[target]] = [next[target], next[index]]
    onChange(renumber(next))
  }

  function setCaption(id: string, caption: string) {
    onChange(
      ordered.map((p) => (p.id === id ? { ...p, caption } : p)),
    )
  }

  return (
    <div>
      <div className="grid grid-cols-5 gap-3">
        {ordered.map((photo, i) => (
          <div
            key={photo.id}
            className="rounded-md border border-slate-200 p-1.5"
          >
            <img
              src={urls[photo.id]}
              alt={photo.caption || 'Car photo'}
              className="h-24 w-full rounded object-cover"
            />
            <input
              type="text"
              value={photo.caption ?? ''}
              onChange={(e) => setCaption(photo.id, e.target.value)}
              placeholder="Caption…"
              className="mt-1 w-full rounded border border-slate-200 px-1.5 py-1 text-xs focus:border-slate-400 focus:outline-none"
            />
            <div className="mt-1 flex items-center justify-between text-slate-400">
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => move(i, -1)}
                  disabled={i === 0}
                  className="px-1 hover:text-slate-700 disabled:opacity-30"
                  aria-label="Move left"
                >
                  ←
                </button>
                <button
                  type="button"
                  onClick={() => move(i, 1)}
                  disabled={i === ordered.length - 1}
                  className="px-1 hover:text-slate-700 disabled:opacity-30"
                  aria-label="Move right"
                >
                  →
                </button>
              </div>
              <button
                type="button"
                onClick={() => remove(photo.id)}
                className="px-1 hover:text-rose-600"
                aria-label="Delete photo"
              >
                ✕
              </button>
            </div>
          </div>
        ))}
      </div>

      {room > 0 ? (
        <div
          onDragOver={(e) => {
            e.preventDefault()
            setDragOver(true)
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDragOver(false)
            addFiles(e.dataTransfer.files)
          }}
          className={`mt-3 cursor-pointer rounded-md border-2 border-dashed px-4 py-4 text-center text-sm ${
            dragOver
              ? 'border-slate-500 bg-slate-50 text-slate-700'
              : 'border-slate-300 text-slate-500'
          }`}
          onClick={() => fileInput.current?.click()}
        >
          Drop images here or click to upload · {room} slot
          {room === 1 ? '' : 's'} left
          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => {
              addFiles(e.target.files)
              e.target.value = ''
            }}
            className="hidden"
          />
        </div>
      ) : (
        <p className="mt-3 text-xs text-slate-400">
          Maximum of {MAX_PHOTOS_PER_CAR} photos reached.
        </p>
      )}
    </div>
  )
}
