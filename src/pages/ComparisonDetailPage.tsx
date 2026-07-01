import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, updateComparison } from '../db'
import CarPicker from '../components/CarPicker'
import ComparisonTable from '../components/ComparisonTable'
import ScoringSettings from '../components/ScoringSettings'
import { priceMeaningfulDiff } from '../lib/ranking'
import { DEFAULT_SCORING, type Car } from '../types'

export default function ComparisonDetailPage() {
  const { id } = useParams<{ id: string }>()
  const data = useLiveQuery(async () => {
    const comparison = id ? await db.comparisons.get(id) : undefined
    if (!comparison) return { comparison: undefined }
    const fetched = await db.cars.bulkGet(comparison.carIds)
    // Preserve column order; drop ids that no longer resolve to a car.
    const cars = fetched.filter((c): c is Car => c != null)
    const catalog = await db.proConItems.toArray()
    return { comparison, cars, catalog }
  }, [id])

  const [editingCars, setEditingCars] = useState(false)
  const [showScoring, setShowScoring] = useState(false)

  if (data === undefined) {
    return <p className="text-slate-500">Loading…</p>
  }
  const { comparison } = data
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

  const cars = data.cars ?? []
  const catalog = data.catalog ?? []
  const carCount = comparison.carIds.length
  const config = comparison.scoring ?? DEFAULT_SCORING

  return (
    <div>
      <Link to="/" className="text-sm text-slate-500 hover:underline">
        ← Comparisons
      </Link>

      <div className="mb-6 mt-2 flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-slate-900">
          {comparison.name}
        </h2>
        <div className="flex gap-3">
          {carCount >= 2 && (
            <button
              type="button"
              onClick={() => setShowScoring((v) => !v)}
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              Scoring
            </button>
          )}
          <button
            type="button"
            onClick={() => setEditingCars((v) => !v)}
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            {editingCars ? 'Done editing' : 'Edit cars'}
          </button>
        </div>
      </div>

      {editingCars && (
        <div className="mb-6 rounded-lg border border-slate-200 bg-white p-5">
          <CarPicker
            selectedIds={comparison.carIds}
            onChange={(carIds) => updateComparison(comparison.id, { carIds })}
          />
        </div>
      )}

      {showScoring && carCount >= 2 && (
        <div className="mb-6 rounded-lg border border-slate-200 bg-white p-5">
          <h3 className="mb-3 text-sm font-semibold text-slate-700">
            Meaningful differences
          </h3>
          <ScoringSettings
            config={config}
            priceDiffDollars={priceMeaningfulDiff(cars, config)}
            onChange={(scoring) => updateComparison(comparison.id, { scoring })}
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
        <ComparisonTable cars={cars} catalog={catalog} config={config} />
      )}
    </div>
  )
}
