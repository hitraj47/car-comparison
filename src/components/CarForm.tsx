import { useState } from 'react'
import Modal from './Modal'
import ProConEditor from './ProConEditor'
import { createCar, updateCar, type CarInput } from '../db'
import {
  BODY_STYLES,
  BODY_STYLE_LABELS,
  FUEL_TYPES,
  FUEL_TYPE_LABELS,
  type BodyStyle,
  type Car,
  type CarProConAssignment,
  type FuelType,
  type MpgStats,
} from '../types'

interface CarFormProps {
  car?: Car // when present, edit mode
  onClose: () => void
  onSaved?: (id: string) => void
}

// String-based form state so number inputs stay controlled and empty-able.
interface FormState {
  year: string
  make: string
  model: string
  bodyStyle: BodyStyle
  fuelType: FuelType
  priceMode: 'static' | 'range'
  priceAmount: string
  priceMin: string
  priceMax: string
  mpgCity: string
  mpgHighway: string
  mpgCombined: string
  mpgeCity: string
  mpgeHighway: string
  mpgeCombined: string
  cargoUp: string
  cargoFolded: string
  notes: string
}

function initialState(car?: Car): FormState {
  const num = (n?: number) => (n == null ? '' : String(n))
  return {
    year: car ? String(car.year) : '',
    make: car?.make ?? '',
    model: car?.model ?? '',
    bodyStyle: car?.bodyStyle ?? 'sedan',
    fuelType: car?.fuelType ?? 'gas',
    priceMode: car?.price.mode ?? 'static',
    priceAmount: car?.price.mode === 'static' ? num(car.price.amount) : '',
    priceMin: car?.price.mode === 'range' ? num(car.price.min) : '',
    priceMax: car?.price.mode === 'range' ? num(car.price.max) : '',
    mpgCity: num(car?.mpg?.city),
    mpgHighway: num(car?.mpg?.highway),
    mpgCombined: num(car?.mpg?.combined),
    mpgeCity: num(car?.mpge?.city),
    mpgeHighway: num(car?.mpge?.highway),
    mpgeCombined: num(car?.mpge?.combined),
    cargoUp: num(car?.cargo?.seatsUpCuFt),
    cargoFolded: num(car?.cargo?.seatsFoldedCuFt),
    notes: car?.notes ?? '',
  }
}

const parseNum = (s: string): number | undefined => {
  const t = s.trim()
  if (t === '') return undefined
  const n = Number(t)
  return Number.isFinite(n) ? n : undefined
}

function buildMpg(city: string, hw: string, combined: string): MpgStats | undefined {
  const stats: MpgStats = {
    city: parseNum(city),
    highway: parseNum(hw),
    combined: parseNum(combined),
  }
  const hasAny =
    stats.city != null || stats.highway != null || stats.combined != null
  return hasAny ? stats : undefined
}

export default function CarForm({ car, onClose, onSaved }: CarFormProps) {
  const [form, setForm] = useState<FormState>(() => initialState(car))
  const [proCons, setProCons] = useState<CarProConAssignment[]>(
    car?.proCons ?? [],
  )
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }))

  const showMpge = form.fuelType === 'hybrid' || form.fuelType === 'electric'

  function validate(): CarInput | null {
    const year = parseNum(form.year)
    if (!year || year < 1900 || year > 2100) {
      setError('Enter a valid year (1900–2100).')
      return null
    }
    if (!form.make.trim()) {
      setError('Make is required.')
      return null
    }
    if (!form.model.trim()) {
      setError('Model is required.')
      return null
    }

    let price
    if (form.priceMode === 'static') {
      const amount = parseNum(form.priceAmount)
      if (amount == null || amount < 0) {
        setError('Enter a valid price.')
        return null
      }
      price = { mode: 'static' as const, amount }
    } else {
      const min = parseNum(form.priceMin)
      const max = parseNum(form.priceMax)
      if (min == null || max == null || min < 0 || max < 0) {
        setError('Enter valid min and max prices.')
        return null
      }
      if (min > max) {
        setError('Price min cannot exceed max.')
        return null
      }
      price = { mode: 'range' as const, min, max }
    }

    const cargoUp = parseNum(form.cargoUp)
    const cargoFolded = parseNum(form.cargoFolded)
    const cargo =
      cargoUp != null || cargoFolded != null
        ? { seatsUpCuFt: cargoUp, seatsFoldedCuFt: cargoFolded }
        : undefined

    return {
      year,
      make: form.make.trim(),
      model: form.model.trim(),
      bodyStyle: form.bodyStyle,
      fuelType: form.fuelType,
      price,
      mpg: buildMpg(form.mpgCity, form.mpgHighway, form.mpgCombined),
      mpge: showMpge
        ? buildMpg(form.mpgeCity, form.mpgeHighway, form.mpgeCombined)
        : undefined,
      cargo,
      notes: form.notes.trim() || undefined,
      proCons,
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const input = validate()
    if (!input) return
    setSaving(true)
    try {
      if (car) {
        await updateCar(car.id, input)
        onSaved?.(car.id)
      } else {
        const created = await createCar(input)
        onSaved?.(created.id)
      }
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save car.')
      setSaving(false)
    }
  }

  return (
    <Modal
      title={car ? 'Edit Car' : 'Add Car'}
      onClose={onClose}
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
            form="car-form"
            disabled={saving}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save Car'}
          </button>
        </>
      }
    >
      <form id="car-form" onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {error}
          </div>
        )}

        {/* Identity */}
        <div className="grid grid-cols-4 gap-4">
          <Field label="Year *">
            <input
              type="number"
              value={form.year}
              onChange={(e) => set('year', e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="Make *" className="col-span-1">
            <input
              type="text"
              value={form.make}
              onChange={(e) => set('make', e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="Model *" className="col-span-2">
            <input
              type="text"
              value={form.model}
              onChange={(e) => set('model', e.target.value)}
              className={inputClass}
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Body style">
            <select
              value={form.bodyStyle}
              onChange={(e) => set('bodyStyle', e.target.value as BodyStyle)}
              className={inputClass}
            >
              {BODY_STYLES.map((b) => (
                <option key={b} value={b}>
                  {BODY_STYLE_LABELS[b]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Fuel type">
            <select
              value={form.fuelType}
              onChange={(e) => set('fuelType', e.target.value as FuelType)}
              className={inputClass}
            >
              {FUEL_TYPES.map((f) => (
                <option key={f} value={f}>
                  {FUEL_TYPE_LABELS[f]}
                </option>
              ))}
            </select>
          </Field>
        </div>

        {/* Price */}
        <fieldset className="rounded-md border border-slate-200 p-4">
          <legend className="px-1 text-sm font-semibold text-slate-700">
            Price
          </legend>
          <div className="mb-3 flex gap-4 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                checked={form.priceMode === 'static'}
                onChange={() => set('priceMode', 'static')}
              />
              Single price
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                checked={form.priceMode === 'range'}
                onChange={() => set('priceMode', 'range')}
              />
              Range
            </label>
          </div>
          {form.priceMode === 'static' ? (
            <Field label="Amount ($)">
              <input
                type="number"
                value={form.priceAmount}
                onChange={(e) => set('priceAmount', e.target.value)}
                className={inputClass}
              />
            </Field>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <Field label="Min ($)">
                <input
                  type="number"
                  value={form.priceMin}
                  onChange={(e) => set('priceMin', e.target.value)}
                  className={inputClass}
                />
              </Field>
              <Field label="Max ($)">
                <input
                  type="number"
                  value={form.priceMax}
                  onChange={(e) => set('priceMax', e.target.value)}
                  className={inputClass}
                />
              </Field>
            </div>
          )}
        </fieldset>

        {/* Efficiency */}
        <fieldset className="rounded-md border border-slate-200 p-4">
          <legend className="px-1 text-sm font-semibold text-slate-700">
            MPG {showMpge && '& MPGe'}
          </legend>
          <MpgRow
            label="MPG"
            city={form.mpgCity}
            highway={form.mpgHighway}
            combined={form.mpgCombined}
            onChange={(k, v) => set(k, v)}
            keys={['mpgCity', 'mpgHighway', 'mpgCombined']}
          />
          {showMpge && (
            <div className="mt-3">
              <MpgRow
                label="MPGe"
                city={form.mpgeCity}
                highway={form.mpgeHighway}
                combined={form.mpgeCombined}
                onChange={(k, v) => set(k, v)}
                keys={['mpgeCity', 'mpgeHighway', 'mpgeCombined']}
              />
            </div>
          )}
        </fieldset>

        {/* Cargo */}
        <fieldset className="rounded-md border border-slate-200 p-4">
          <legend className="px-1 text-sm font-semibold text-slate-700">
            Cargo (cu ft)
          </legend>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Seats up">
              <input
                type="number"
                step="0.1"
                value={form.cargoUp}
                onChange={(e) => set('cargoUp', e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="Seats folded">
              <input
                type="number"
                step="0.1"
                value={form.cargoFolded}
                onChange={(e) => set('cargoFolded', e.target.value)}
                className={inputClass}
              />
            </Field>
          </div>
        </fieldset>

        {/* Pros & Cons */}
        <fieldset className="rounded-md border border-slate-200 p-4">
          <legend className="px-1 text-sm font-semibold text-slate-700">
            Pros &amp; Cons
          </legend>
          <ProConEditor assignments={proCons} onChange={setProCons} />
        </fieldset>

        {/* Notes */}
        <Field label="Notes">
          <textarea
            value={form.notes}
            onChange={(e) => set('notes', e.target.value)}
            rows={2}
            className={inputClass}
          />
        </Field>
      </form>
    </Modal>
  )
}

const inputClass =
  'w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none'

function Field({
  label,
  children,
  className = '',
}: {
  label: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1 block text-xs font-medium text-slate-600">
        {label}
      </span>
      {children}
    </label>
  )
}

function MpgRow({
  label,
  city,
  highway,
  combined,
  onChange,
  keys,
}: {
  label: string
  city: string
  highway: string
  combined: string
  onChange: (key: keyof FormState, value: string) => void
  keys: [keyof FormState, keyof FormState, keyof FormState]
}) {
  return (
    <div className="grid grid-cols-4 items-end gap-4">
      <span className="pb-2 text-xs font-medium text-slate-500">{label}</span>
      <Field label="City">
        <input
          type="number"
          value={city}
          onChange={(e) => onChange(keys[0], e.target.value)}
          className={inputClass}
        />
      </Field>
      <Field label="Highway">
        <input
          type="number"
          value={highway}
          onChange={(e) => onChange(keys[1], e.target.value)}
          className={inputClass}
        />
      </Field>
      <Field label="Combined">
        <input
          type="number"
          value={combined}
          onChange={(e) => onChange(keys[2], e.target.value)}
          className={inputClass}
        />
      </Field>
    </div>
  )
}
