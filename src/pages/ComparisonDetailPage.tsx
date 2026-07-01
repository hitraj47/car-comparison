import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, updateComparison } from '../db'
import CarPicker from '../components/CarPicker'

export default function ComparisonDetailPage() {
  const { id } = useParams<{ id: string }>()
  // Wrap in an object so we can tell "loading" (undefined) apart from
  // "not found" ({ value: undefined }) — Dexie returns undefined for both.
  const result = useLiveQuery(
    async () => ({ value: id ? await db.comparisons.get(id) : undefined }),
    [id],
  )
  const [editingCars, setEditingCars] = useState(false)

  if (result === undefined) {
    return <p className="text-slate-500">Loading…</p>
  }
  const comparison = result.value
  if (!comparison) {
    return (
      <div>
        <p className="text-slate-600">Comparison not found.</p>
        <Link to="/" className="text-sm text-slate-500 hover:underline">
          ← Back to comparisons
        </Link>
      </div>
    )
  }

  const carCount = comparison.carIds.length

  return (
    <div>
      <Link to="/" className="text-sm text-slate-500 hover:underline">
        ← Comparisons
      </Link>

      <div className="mb-6 mt-2 flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-slate-900">
          {comparison.name}
        </h2>
        <button
          type="button"
          onClick={() => setEditingCars((v) => !v)}
          className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
        >
          {editingCars ? 'Done editing' : 'Edit cars'}
        </button>
      </div>

      {editingCars && (
        <div className="mb-6 rounded-lg border border-slate-200 bg-white p-5">
          <CarPicker
            selectedIds={comparison.carIds}
            onChange={(carIds) => updateComparison(comparison.id, { carIds })}
          />
        </div>
      )}

      {carCount < 2 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-12 text-center">
          <p className="text-slate-600">
            Add at least 2 cars to see the comparison.
          </p>
          {!editingCars && (
            <button
              type="button"
              onClick={() => setEditingCars(true)}
              className="mt-4 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
            >
              Edit cars
            </button>
          )}
        </div>
      ) : (
        <div className="rounded-lg border border-slate-200 bg-white p-6 text-slate-400">
          Comparison table coming in the next step.
        </div>
      )}
    </div>
  )
}
