import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import Modal from './Modal'
import { db, findOrCreateProConItem, updateCar } from '../db'
import { carTitle } from '../lib/format'
import { countProConUsage, polarityCellClass } from '../lib/proConScoring'
import type { Car, CarProConAssignment, ProConPolarity } from '../types'

interface AddProConModalProps {
  car: Car
  onClose: () => void
}

/** Font-size bucket for a word-cloud chip based on how widely it's used. */
function sizeForCount(count: number, maxCount: number): string {
  if (count <= 0 || maxCount <= 0) return 'text-xs'
  const ratio = count / maxCount
  if (ratio <= 0.25) return 'text-sm'
  if (ratio <= 0.5) return 'text-base'
  if (ratio <= 0.75) return 'text-lg'
  return 'text-xl'
}

/** Quick add/remove of pros & cons for a car, from the comparison view. */
export default function AddProConModal({ car, onClose }: AddProConModalProps) {
  const catalog = useLiveQuery(() => db.proConItems.toArray(), [], [])
  const allCars = useLiveQuery(() => db.cars.toArray(), [], [])

  // Local working copy so the live re-render behind the modal never makes it stale.
  const [assignments, setAssignments] = useState<CarProConAssignment[]>(
    car.proCons ?? [],
  )
  const [mode, setMode] = useState<ProConPolarity>('pro')
  const [query, setQuery] = useState('')

  const assignedById = useMemo(() => {
    const m = new Map<string, ProConPolarity>()
    for (const a of assignments) m.set(a.itemId, a.polarity)
    return m
  }, [assignments])

  const usage = useMemo(() => countProConUsage(allCars), [allCars])
  const maxUsage = useMemo(
    () => (usage.size > 0 ? Math.max(...usage.values()) : 0),
    [usage],
  )

  function persist(next: CarProConAssignment[]) {
    setAssignments(next)
    void updateCar(car.id, { proCons: next })
  }

  function toggleItem(itemId: string) {
    if (assignedById.has(itemId)) {
      persist(assignments.filter((a) => a.itemId !== itemId))
    } else {
      persist([...assignments, { itemId, polarity: mode }])
    }
  }

  async function createAndAssign(label: string) {
    const trimmed = label.trim()
    if (!trimmed) return
    const item = await findOrCreateProConItem(trimmed)
    setQuery('')
    if (assignedById.has(item.id)) return
    persist([...assignments, { itemId: item.id, polarity: mode }])
  }

  const q = query.trim().toLowerCase()
  const filtered = useMemo(() => {
    const list = q
      ? catalog.filter((i) => i.label.toLowerCase().includes(q))
      : [...catalog]
    return list.sort((a, b) => a.label.localeCompare(b.label))
  }, [catalog, q])
  const exactMatch = catalog.find((i) => i.label.toLowerCase() === q)
  const canCreate = q.length > 0 && !exactMatch

  return (
    <Modal
      title={`Pros & cons — ${carTitle(car)}`}
      onClose={onClose}
      widthClass="max-w-2xl"
      footer={
        <button
          type="button"
          onClick={onClose}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
        >
          Done
        </button>
      }
    >
      {/* Pro/Con mode toggle */}
      <div className="mb-4 flex items-center gap-3">
        <span className="text-sm text-slate-500">Add as:</span>
        <div className="inline-flex overflow-hidden rounded-md border border-slate-300">
          <button
            type="button"
            onClick={() => setMode('pro')}
            className={`px-4 py-1.5 text-sm font-medium ${
              mode === 'pro'
                ? 'bg-emerald-600 text-white'
                : 'bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            Pro
          </button>
          <button
            type="button"
            onClick={() => setMode('con')}
            className={`border-l border-slate-300 px-4 py-1.5 text-sm font-medium ${
              mode === 'con'
                ? 'bg-rose-600 text-white'
                : 'bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            Con
          </button>
        </div>
      </div>

      {/* Search / create */}
      <input
        type="text"
        autoFocus
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => {
          if (e.key !== 'Enter') return
          e.preventDefault()
          if (exactMatch) {
            toggleItem(exactMatch.id)
            setQuery('')
          } else if (q) {
            void createAndAssign(query)
          }
        }}
        placeholder="Search existing or type a new pro/con…"
        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
      />

      {canCreate && (
        <button
          type="button"
          onClick={() => void createAndAssign(query)}
          className="mt-2 text-sm text-slate-600 underline hover:text-slate-900"
        >
          Create “{query.trim()}” as a {mode} (weight 5)
        </button>
      )}

      {/* Word cloud */}
      <p className="mt-4 mb-2 text-xs text-slate-400">
        Click a word to add it as a {mode}. Click a green (pro) or red (con) word
        to remove it. Larger words are used by more cars.
      </p>
      {filtered.length === 0 ? (
        <p className="py-6 text-center text-sm text-slate-400">
          {catalog.length === 0
            ? 'No pros/cons yet — type above to create your first one.'
            : 'No matches — type to create a new one.'}
        </p>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          {filtered.map((item) => {
            const polarity = assignedById.get(item.id) ?? null
            const count = usage.get(item.id) ?? 0
            const color = polarity
              ? polarityCellClass(polarity)
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => toggleItem(item.id)}
                title={`Used by ${count} car${count === 1 ? '' : 's'} · weight ${item.weight}`}
                className={`rounded-full px-3 py-1 leading-tight transition-colors ${sizeForCount(count, maxUsage)} ${color}`}
              >
                {polarity === 'pro' ? '✓ ' : polarity === 'con' ? '✗ ' : ''}
                {item.label}
              </button>
            )
          })}
        </div>
      )}
    </Modal>
  )
}
