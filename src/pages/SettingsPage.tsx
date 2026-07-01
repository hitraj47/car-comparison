import { useRef, useState } from 'react'
import Modal from '../components/Modal'
import {
  applyImport,
  parseBackup,
  serializeBackup,
  summarizeImport,
  type ImportSummary,
} from '../lib/importExport'
import type { BackupFile } from '../types'

export default function SettingsPage() {
  const fileInput = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState<{
    backup: BackupFile
    summary: ImportSummary
  } | null>(null)
  const [applying, setApplying] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  async function handleExport() {
    const backup = await serializeBackup()
    const blob = new Blob([JSON.stringify(backup, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'car-comparison-backup.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    setError(null)
    setMessage(null)
    const file = e.target.files?.[0]
    // Reset so choosing the same file again re-triggers change.
    e.target.value = ''
    if (!file) return
    try {
      const text = await file.text()
      const backup = parseBackup(text)
      const summary = await summarizeImport(backup)
      setPending({ backup, summary })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to read file.')
    }
  }

  async function confirmImport() {
    if (!pending) return
    setApplying(true)
    try {
      await applyImport(pending.backup)
      const { summary } = pending
      const total =
        summary.cars.added +
        summary.cars.updated +
        summary.comparisons.added +
        summary.comparisons.updated +
        summary.proConItems.added +
        summary.proConItems.updated
      setMessage(`Import complete — ${total} records merged.`)
      setPending(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed.')
    } finally {
      setApplying(false)
    }
  }

  return (
    <div>
      <h2 className="mb-6 text-2xl font-semibold text-slate-900">
        Import / Export
      </h2>

      {message && (
        <div className="mb-4 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {message}
        </div>
      )}
      {error && (
        <div className="mb-4 rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-6">
        <section className="rounded-lg border border-slate-200 bg-white p-6">
          <h3 className="text-lg font-semibold text-slate-900">Export</h3>
          <p className="mt-1 text-sm text-slate-500">
            Download all cars, comparisons, and the pro/con catalog as a JSON
            backup.
          </p>
          <button
            type="button"
            onClick={handleExport}
            className="mt-4 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
          >
            Export backup
          </button>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-6">
          <h3 className="text-lg font-semibold text-slate-900">Import</h3>
          <p className="mt-1 text-sm text-slate-500">
            Load a backup file. Records merge by id — existing entries are
            updated, new ones are added.
          </p>
          <input
            ref={fileInput}
            type="file"
            accept="application/json,.json"
            onChange={handleFile}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            className="mt-4 rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            Choose backup file…
          </button>
        </section>
      </div>

      {pending && (
        <Modal
          title="Confirm import"
          onClose={() => setPending(null)}
          widthClass="max-w-md"
          footer={
            <>
              <button
                type="button"
                onClick={() => setPending(null)}
                className="rounded-md px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmImport}
                disabled={applying}
                className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
              >
                {applying ? 'Importing…' : 'Apply import'}
              </button>
            </>
          }
        >
          <p className="mb-3 text-sm text-slate-600">
            This backup will merge the following into your data:
          </p>
          <ul className="space-y-1 text-sm text-slate-700">
            <SummaryLine label="Cars" stat={pending.summary.cars} />
            <SummaryLine
              label="Comparisons"
              stat={pending.summary.comparisons}
            />
            <SummaryLine
              label="Pro/con items"
              stat={pending.summary.proConItems}
            />
          </ul>
        </Modal>
      )}
    </div>
  )
}

function SummaryLine({
  label,
  stat,
}: {
  label: string
  stat: { added: number; updated: number }
}) {
  return (
    <li className="flex justify-between">
      <span className="text-slate-500">{label}</span>
      <span>
        <span className="font-medium text-emerald-700">{stat.added} new</span>
        {', '}
        <span className="font-medium text-slate-700">
          {stat.updated} updated
        </span>
      </span>
    </li>
  )
}
