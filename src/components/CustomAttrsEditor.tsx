import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, deleteAttributeDef } from '../db'
import AttributeDefDialog from './AttributeDefDialog'

interface CustomAttrsEditorProps {
  // attributeId -> string value (kept as strings for controlled inputs)
  values: Record<string, string>
  onChange: (values: Record<string, string>) => void
}

/** Enter this car's values for the app-wide custom attributes. */
export default function CustomAttrsEditor({
  values,
  onChange,
}: CustomAttrsEditorProps) {
  const defs = useLiveQuery(
    () => db.attributeDefs.orderBy('name').toArray(),
    [],
    [],
  )
  const [defining, setDefining] = useState(false)

  function set(id: string, v: string) {
    onChange({ ...values, [id]: v })
  }

  async function removeDef(id: string, name: string) {
    if (
      window.confirm(
        `Delete the attribute "${name}"? It will be removed from every car and comparison.`,
      )
    ) {
      await deleteAttributeDef(id)
    }
  }

  return (
    <div>
      {defs.length === 0 ? (
        <p className="text-xs text-slate-400">
          No custom attributes yet. Add one like “Towing capacity” or
          “Horsepower”.
        </p>
      ) : (
        <div className="space-y-2">
          {defs.map((def) => (
            <div key={def.id} className="flex items-center gap-3">
              <div className="flex-1">
                <span className="text-sm text-slate-800">{def.name}</span>
                <span className="ml-2 text-xs text-slate-400">
                  {def.unit ? `${def.unit} · ` : ''}
                  {def.direction === 'higher' ? 'higher better' : 'lower better'}
                </span>
              </div>
              <input
                type="number"
                step="any"
                value={values[def.id] ?? ''}
                onChange={(e) => set(def.id, e.target.value)}
                className="w-36 rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => removeDef(def.id, def.name)}
                className="text-slate-400 hover:text-rose-600"
                aria-label={`Delete attribute ${def.name}`}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={() => setDefining(true)}
        className="mt-3 text-sm text-slate-600 underline hover:text-slate-900"
      >
        ＋ Define attribute
      </button>

      {defining && (
        <AttributeDefDialog
          onCreated={() => {}}
          onClose={() => setDefining(false)}
        />
      )}
    </div>
  )
}
