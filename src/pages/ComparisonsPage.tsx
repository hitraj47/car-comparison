import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  createComparison,
  db,
  deleteComparison,
  updateComparison,
} from '../db'
import NameDialog from '../components/NameDialog'
import type { Comparison } from '../types'

export default function ComparisonsPage() {
  const navigate = useNavigate()
  const comparisons = useLiveQuery(
    () => db.comparisons.orderBy('updatedAt').reverse().toArray(),
    [],
    [],
  )
  const [creating, setCreating] = useState(false)
  const [renaming, setRenaming] = useState<Comparison | undefined>(undefined)

  async function handleCreate(name: string) {
    const created = await createComparison(name)
    navigate(`/comparisons/${created.id}`)
  }

  async function handleRename(name: string) {
    if (renaming) await updateComparison(renaming.id, { name })
  }

  async function handleDelete(comparison: Comparison) {
    if (window.confirm(`Delete comparison "${comparison.name}"?`)) {
      await deleteComparison(comparison.id)
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-slate-900">Comparisons</h2>
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
        >
          + New Comparison
        </button>
      </div>

      {comparisons.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-12 text-center">
          <p className="text-slate-600">No comparisons yet.</p>
          <p className="mt-1 text-sm text-slate-400">
            Create a comparison and add cars to see them side by side.
          </p>
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="mt-4 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
          >
            + New Comparison
          </button>
        </div>
      ) : (
        <ul className="grid grid-cols-2 gap-4">
          {comparisons.map((c) => (
            <li
              key={c.id}
              className="rounded-lg border border-slate-200 bg-white p-5 hover:border-slate-300"
            >
              <div className="flex items-start justify-between">
                <button
                  type="button"
                  onClick={() => navigate(`/comparisons/${c.id}`)}
                  className="text-left"
                >
                  <h3 className="text-lg font-semibold text-slate-900 hover:underline">
                    {c.name}
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    {c.carIds.length}{' '}
                    {c.carIds.length === 1 ? 'car' : 'cars'} · updated{' '}
                    {new Date(c.updatedAt).toLocaleDateString()}
                  </p>
                </button>
                <div className="flex gap-3 text-sm">
                  <button
                    type="button"
                    onClick={() => setRenaming(c)}
                    className="text-slate-600 hover:text-slate-900"
                  >
                    Rename
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(c)}
                    className="text-rose-600 hover:text-rose-800"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {creating && (
        <NameDialog
          title="New Comparison"
          label="Comparison name"
          confirmLabel="Create"
          onSubmit={handleCreate}
          onClose={() => setCreating(false)}
        />
      )}
      {renaming && (
        <NameDialog
          title="Rename Comparison"
          label="Comparison name"
          initialValue={renaming.name}
          onSubmit={handleRename}
          onClose={() => setRenaming(undefined)}
        />
      )}
    </div>
  )
}
