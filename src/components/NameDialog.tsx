import { useState } from 'react'
import Modal from './Modal'

interface NameDialogProps {
  title: string
  label?: string
  initialValue?: string
  confirmLabel?: string
  onSubmit: (value: string) => void
  onClose: () => void
}

/** Small modal that collects a single non-empty text value. */
export default function NameDialog({
  title,
  label = 'Name',
  initialValue = '',
  confirmLabel = 'Save',
  onSubmit,
  onClose,
}: NameDialogProps) {
  const [value, setValue] = useState(initialValue)
  const trimmed = value.trim()

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!trimmed) return
    onSubmit(trimmed)
    onClose()
  }

  return (
    <Modal
      title={title}
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
            form="name-dialog-form"
            disabled={!trimmed}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
          >
            {confirmLabel}
          </button>
        </>
      }
    >
      <form id="name-dialog-form" onSubmit={submit}>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-600">
            {label}
          </span>
          <input
            type="text"
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
          />
        </label>
      </form>
    </Modal>
  )
}
