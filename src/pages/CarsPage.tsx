import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, deleteCar } from '../db'
import { carTitle, formatPrice } from '../lib/format'
import { BODY_STYLE_LABELS, FUEL_TYPE_LABELS, type Car } from '../types'
import CarForm from '../components/CarForm'

export default function CarsPage() {
  const cars = useLiveQuery(
    () => db.cars.orderBy('updatedAt').reverse().toArray(),
    [],
    [],
  )
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Car | undefined>(undefined)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return cars
    return cars.filter((c) => carTitle(c).toLowerCase().includes(q))
  }, [cars, search])

  function openAdd() {
    setEditing(undefined)
    setShowForm(true)
  }

  function openEdit(car: Car) {
    setEditing(car)
    setShowForm(true)
  }

  async function handleDelete(car: Car) {
    const ok = window.confirm(
      `Delete "${carTitle(car)}"? It will be removed from any comparisons that include it.`,
    )
    if (ok) await deleteCar(car.id)
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-slate-900">Cars</h2>
        <button
          type="button"
          onClick={openAdd}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
        >
          + Add Car
        </button>
      </div>

      {cars.length > 0 && (
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search year, make, model…"
          className="mb-4 w-80 rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
        />
      )}

      {cars.length === 0 ? (
        <EmptyState onAdd={openAdd} />
      ) : (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Car</th>
                <th className="px-4 py-3 font-medium">Body</th>
                <th className="px-4 py-3 font-medium">Fuel</th>
                <th className="px-4 py-3 font-medium">Price</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((car) => (
                <tr key={car.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">
                    {carTitle(car)}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {BODY_STYLE_LABELS[car.bodyStyle]}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {FUEL_TYPE_LABELS[car.fuelType]}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {formatPrice(car.price)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => openEdit(car)}
                      className="mr-3 text-slate-600 hover:text-slate-900"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(car)}
                      className="text-rose-600 hover:text-rose-800"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                    No cars match “{search}”.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <CarForm car={editing} onClose={() => setShowForm(false)} />
      )}
    </div>
  )
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-white p-12 text-center">
      <p className="text-slate-600">No cars yet.</p>
      <p className="mt-1 text-sm text-slate-400">
        Add your first car to start building comparisons.
      </p>
      <button
        type="button"
        onClick={onAdd}
        className="mt-4 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
      >
        + Add Car
      </button>
    </div>
  )
}
