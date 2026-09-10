import { useState } from 'react'
import Modal from './Modal'
import { createAttributeDef } from '../db'
import type { AttrDirection, AttributeDef } from '../types'

interface AttributeDefDialogProps {
  onCreated: (def: AttributeDef) => void
  onClose: () => void
}

/** Define a new app-wide custom numeric attribute (e.g. towing capacity). */
export default function AttributeDefDialog({
  onCreated,
  onClose,
}: AttributeDefDialogProps) {
  const [name, setName] = useState('')
  const [unit, setUnit] = useState('')
  const [direction, setDirection] = useState<AttrDirection>('higher')
  const [diff, setDiff] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) {
      setError('Name is required.')
      return
    }
    const meaningfulDiff = Number(diff)
    if (!Number.isFinite(meaningfulDiff) || meaningfulDiff <= 0) {
      setError('Enter a meaningful difference greater than 0.')
      return
    }
    const def = await createAttributeDef({
      name: trimmed,
      unit: unit.trim() || undefined,
      direction,
      meaningfulDiff,
    })
    onCreated(def)
    onClose()
  }

  return (
    <Modal
      title="New attribute"
      onClose={onClose}
      widthClass="max-w-md"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="attr-def-form"
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
          >
            Create attribute
          </button>
        </>
      }
    >
      <form id="attr-def-form" onSubmit={submit} className="space-y-4">
        {error && (
          <div className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {error}
          </div>
        )}
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-600">
            Name *
          </span>
          <input
            type="text"
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Towing capacity"
            className={inputClass}
          />
        </label>
        <div className="grid grid-cols-2 gap-4">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-600">
              Unit
            </span>
            <input
              type="text"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              placeholder="e.g. lb"
              className={inputClass}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-600">
              Better when
            </span>
            <select
              value={direction}
              onChange={(e) => setDirection(e.target.value as AttrDirection)}
              className={inputClass}
            >
              <option value="higher">Higher is better</option>
              <option value="lower">Lower is better</option>
            </select>
          </label>
        </div>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-600">
            Meaningful difference *
          </span>
          <input
            type="number"
            step="any"
            value={diff}
            onChange={(e) => setDiff(e.target.value)}
            placeholder="e.g. 1000"
            className={inputClass}
          />
          <span className="mt-1 block text-xs text-slate-400">
            A gap this size counts as one step behind the best.
          </span>
        </label>
      </form>
    </Modal>
  )
}

const inputClass =
  'w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none'
