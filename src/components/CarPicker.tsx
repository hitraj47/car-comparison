import { useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import { carTitle, formatPrice } from '../lib/format'
import { FUEL_TYPE_LABELS, type Car } from '../types'

interface CarPickerProps {
  selectedIds: string[]
  onChange: (ids: string[]) => void
}

/** Select cars for a comparison and order them (columns left→right). */
export default function CarPicker({ selectedIds, onChange }: CarPickerProps) {
  const cars = useLiveQuery(() => db.cars.toArray(), [], [])
  const byId = useMemo(() => {
    const m = new Map<string, Car>()
    for (const c of cars) m.set(c.id, c)
    return m
  }, [cars])

  const selected = selectedIds
    .map((id) => byId.get(id))
    .filter((c): c is Car => c != null)

  const available = cars
    .filter((c) => !selectedIds.includes(c.id))
    .sort((a, b) => carTitle(a).localeCompare(carTitle(b)))

  function add(id: string) {
    onChange([...selectedIds, id])
  }
  function remove(id: string) {
    onChange(selectedIds.filter((x) => x !== id))
  }
  function move(index: number, delta: number) {
    const next = [...selectedIds]
    const target = index + delta
    if (target < 0 || target >= next.length) return
    ;[next[index], next[target]] = [next[target], next[index]]
    onChange(next)
  }

  return (
    <div className="grid grid-cols-2 gap-6">
      <div>
        <h4 className="mb-2 text-sm font-semibold text-slate-700">
          Selected ({selected.length})
        </h4>
        {selected.length === 0 ? (
          <p className="text-xs text-slate-400">
            Add at least 2 cars to build a comparison.
          </p>
        ) : (
          <ol className="space-y-2">
            {selected.map((car, i) => (
              <li
                key={car.id}
                className="flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2"
              >
                <span className="w-5 text-xs text-slate-400">{i + 1}.</span>
                <span className="flex-1 truncate text-sm text-slate-800">
                  {carTitle(car)}
                </span>
                <button
                  type="button"
                  onClick={() => move(i, -1)}
                  disabled={i === 0}
                  className="px-1 text-slate-400 hover:text-slate-700 disabled:opacity-30"
                  aria-label="Move up"
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => move(i, 1)}
                  disabled={i === selected.length - 1}
                  className="px-1 text-slate-400 hover:text-slate-700 disabled:opacity-30"
                  aria-label="Move down"
                >
                  ↓
                </button>
                <button
                  type="button"
                  onClick={() => remove(car.id)}
                  className="px-1 text-slate-400 hover:text-rose-600"
                  aria-label="Remove"
                >
                  ✕
                </button>
              </li>
            ))}
          </ol>
        )}
      </div>

      <div>
        <h4 className="mb-2 text-sm font-semibold text-slate-700">
          Available cars
        </h4>
        {available.length === 0 ? (
          <p className="text-xs text-slate-400">
            {cars.length === 0
              ? 'No cars in your library yet.'
              : 'All cars are already selected.'}
          </p>
        ) : (
          <ul className="space-y-2">
            {available.map((car) => (
              <li
                key={car.id}
                className="flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2"
              >
                <div className="flex-1 truncate">
                  <span className="text-sm text-slate-800">
                    {carTitle(car)}
                  </span>
                  <span className="ml-2 text-xs text-slate-400">
                    {FUEL_TYPE_LABELS[car.fuelType]} · {formatPrice(car.price)}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => add(car.id)}
                  className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-200"
                >
                  Add
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
