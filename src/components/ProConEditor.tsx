import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  db,
  findOrCreateProConItem,
  updateProConItem,
} from '../db'
import type { CarProConAssignment, ProConItem, ProConPolarity } from '../types'

interface ProConEditorProps {
  assignments: CarProConAssignment[]
  onChange: (assignments: CarProConAssignment[]) => void
}

export default function ProConEditor({
  assignments,
  onChange,
}: ProConEditorProps) {
  const catalog = useLiveQuery(() => db.proConItems.toArray(), [], [])
  const catalogById = useMemo(() => {
    const map = new Map<string, ProConItem>()
    for (const item of catalog) map.set(item.id, item)
    return map
  }, [catalog])

  const assignedIds = useMemo(
    () => new Set(assignments.map((a) => a.itemId)),
    [assignments],
  )

  async function addByLabel(label: string, polarity: ProConPolarity) {
    const trimmed = label.trim()
    if (!trimmed) return
    const item = await findOrCreateProConItem(trimmed)
    if (assignedIds.has(item.id)) return
    onChange([...assignments, { itemId: item.id, polarity }])
  }

  function addExisting(itemId: string, polarity: ProConPolarity) {
    if (assignedIds.has(itemId)) return
    onChange([...assignments, { itemId, polarity }])
  }

  function remove(itemId: string) {
    onChange(assignments.filter((a) => a.itemId !== itemId))
  }

  return (
    <div className="grid grid-cols-2 gap-6">
      <ProConColumn
        polarity="pro"
        title="Pros"
        assignments={assignments}
        catalog={catalog}
        catalogById={catalogById}
        assignedIds={assignedIds}
        onAddLabel={addByLabel}
        onAddExisting={addExisting}
        onRemove={remove}
      />
      <ProConColumn
        polarity="con"
        title="Cons"
        assignments={assignments}
        catalog={catalog}
        catalogById={catalogById}
        assignedIds={assignedIds}
        onAddLabel={addByLabel}
        onAddExisting={addExisting}
        onRemove={remove}
      />
    </div>
  )
}

interface ColumnProps {
  polarity: ProConPolarity
  title: string
  assignments: CarProConAssignment[]
  catalog: ProConItem[]
  catalogById: Map<string, ProConItem>
  assignedIds: Set<string>
  onAddLabel: (label: string, polarity: ProConPolarity) => void
  onAddExisting: (itemId: string, polarity: ProConPolarity) => void
  onRemove: (itemId: string) => void
}

function ProConColumn({
  polarity,
  title,
  assignments,
  catalog,
  catalogById,
  assignedIds,
  onAddLabel,
  onAddExisting,
  onRemove,
}: ColumnProps) {
  const [query, setQuery] = useState('')
  const rows = assignments.filter((a) => a.polarity === polarity)

  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase()
    return catalog
      .filter((item) => !assignedIds.has(item.id))
      .filter((item) => (q ? item.label.toLowerCase().includes(q) : true))
      .sort((a, b) => a.label.localeCompare(b.label))
      .slice(0, 6)
  }, [catalog, assignedIds, query])

  const exactMatch = catalog.some(
    (item) => item.label.toLowerCase() === query.trim().toLowerCase(),
  )
  const canCreate = query.trim().length > 0 && !exactMatch

  const accent =
    polarity === 'pro'
      ? 'text-emerald-700'
      : 'text-rose-700'

  return (
    <div>
      <h4 className={`mb-2 text-sm font-semibold ${accent}`}>{title}</h4>

      <div className="space-y-2">
        {rows.length === 0 && (
          <p className="text-xs text-slate-400">None yet.</p>
        )}
        {rows.map((a) => {
          const item = catalogById.get(a.itemId)
          if (!item) return null
          return (
            <div
              key={a.itemId}
              className="flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2"
            >
              <span className="flex-1 truncate text-sm text-slate-800">
                {item.label}
              </span>
              <WeightSlider item={item} />
              <button
                type="button"
                onClick={() => onRemove(a.itemId)}
                className="text-slate-400 hover:text-rose-600"
                aria-label={`Remove ${item.label}`}
              >
                ✕
              </button>
            </div>
          )
        })}
      </div>

      <div className="relative mt-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              if (canCreate || query.trim()) {
                onAddLabel(query, polarity)
                setQuery('')
              }
            }
          }}
          placeholder={`Add a ${polarity}…`}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
        />

        {query.trim() && (
          <div className="absolute z-10 mt-1 w-full rounded-md border border-slate-200 bg-white shadow-lg">
            {suggestions.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onAddExisting(item.id, polarity)
                  setQuery('')
                }}
                className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-slate-100"
              >
                <span className="truncate">{item.label}</span>
                <span className="ml-2 shrink-0 text-xs text-slate-400">
                  weight {item.weight}
                </span>
              </button>
            ))}
            {canCreate && (
              <button
                type="button"
                onClick={() => {
                  onAddLabel(query, polarity)
                  setQuery('')
                }}
                className="flex w-full items-center px-3 py-2 text-left text-sm text-slate-600 hover:bg-slate-100"
              >
                Create “{query.trim()}” (weight 5)
              </button>
            )}
            {suggestions.length === 0 && !canCreate && (
              <div className="px-3 py-2 text-sm text-slate-400">
                Already added.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

/** Inline weight slider (1–10). Persists to the global catalog item. */
function WeightSlider({ item }: { item: ProConItem }) {
  return (
    <label className="flex items-center gap-1 text-xs text-slate-500">
      <input
        type="range"
        min={1}
        max={10}
        value={item.weight}
        onChange={(e) => updateProConItem(item.id, { weight: Number(e.target.value) })}
        className="w-20 accent-slate-700"
        title={`Weight ${item.weight}`}
      />
      <span className="w-4 text-right font-medium text-slate-700">
        {item.weight}
      </span>
    </label>
  )
}
