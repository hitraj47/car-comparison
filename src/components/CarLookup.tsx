import { useEffect, useRef, useState } from 'react'
import {
  getCarData,
  getMakes,
  getModels,
  getVariants,
  getYears,
} from '../lib/carData/client'
import type { MenuOption, ModelOption } from '../lib/carData/types'
import {
  fetchedToForm,
  identityToForm,
  type CarFormPatch,
} from '../lib/carData/formFill'

interface CarLookupProps {
  // Called with a patch of form fields to auto-fill. Usually the full compiled
  // specs from a variant lookup, but when no trim can be resolved it's just the
  // year/make/model the user picked (CAR-22). The user can still edit anything.
  onFill: (patch: Partial<CarFormPatch>) => void
}

// The outcome of the drill-down we surface to the user: full specs from a
// variant, or just the identity fields when no trim was available.
type Fill = { kind: 'specs' | 'identity'; label: string }

// Cascading drill-down (year → make → model → variant) that queries the public
// car APIs (CAR-13) and hands the compiled specs back to the Add Car form.
//
// Drill-down rather than free text: the two government databases use different
// spellings, so picking from their own menus guarantees each step's value is
// one the next query understands.
export default function CarLookup({ onFill }: CarLookupProps) {
  const [years, setYears] = useState<MenuOption[]>([])
  const [makes, setMakes] = useState<MenuOption[]>([])
  const [models, setModels] = useState<ModelOption[]>([])
  const [variants, setVariants] = useState<MenuOption[]>([])

  const [year, setYear] = useState('')
  const [make, setMake] = useState('')
  const [model, setModel] = useState('')
  const [variant, setVariant] = useState('') // vehicle id

  const [loading, setLoading] = useState<null | 'menu' | 'specs'>(null)
  const [error, setError] = useState<string | null>(null)
  const [fill, setFill] = useState<Fill | null>(null)

  // Keep the latest onFill in a ref so the drill-down effect can call it without
  // listing it as a dependency — the effect must react to selection changes
  // only, not to the parent re-rendering with a fresh callback.
  const onFillRef = useRef(onFill)
  onFillRef.current = onFill

  // Load the year menu once on mount.
  useEffect(() => {
    let active = true
    setLoading('menu')
    getYears()
      .then((data) => active && setYears(data))
      .catch((e) => active && setError(message(e)))
      .finally(() => active && setLoading(null))
    return () => {
      active = false
    }
  }, [])

  // Each selection resets everything downstream and loads the next menu. The
  // `active` flag drops results from a superseded selection (fast re-picking).
  useEffect(() => {
    setMake('')
    setMakes([])
    setModel('')
    setModels([])
    setVariant('')
    setVariants([])
    setFill(null)
    if (!year) return
    let active = true
    setError(null)
    setLoading('menu')
    getMakes(year)
      .then((data) => active && setMakes(data))
      .catch((e) => active && setError(message(e)))
      .finally(() => active && setLoading(null))
    return () => {
      active = false
    }
  }, [year])

  useEffect(() => {
    setModel('')
    setModels([])
    setVariant('')
    setVariants([])
    setFill(null)
    if (!year || !make) return
    let active = true
    setError(null)
    setLoading('menu')
    getModels(year, make)
      .then((data) => active && setModels(data))
      .catch((e) => active && setError(message(e)))
      .finally(() => active && setLoading(null))
    return () => {
      active = false
    }
  }, [year, make])

  useEffect(() => {
    setVariant('')
    setVariants([])
    setFill(null)
    if (!year || !make || !model) return
    // Models NHTSA knows but FuelEconomy doesn't have no trims/specs to fetch.
    // We can't enrich them, but we still know the identity — fill that in rather
    // than sending the user to a blank form (CAR-22).
    if (models.find((m) => m.value === model)?.hasData === false) {
      onFillRef.current(identityToForm({ year, make, model }))
      setFill({ kind: 'identity', label: `${year} ${make} ${model}` })
      return
    }
    let active = true
    setError(null)
    setLoading('menu')
    getVariants(year, make, model)
      .then((data) => {
        if (!active) return
        setVariants(data)
        // FuelEconomy knows the model but returned no trims: fall back to filling
        // the identity fields so the lookup still saves the user some typing.
        if (data.length === 0) {
          onFillRef.current(identityToForm({ year, make, model }))
          setFill({ kind: 'identity', label: `${year} ${make} ${model}` })
        }
      })
      .catch((e) => active && setError(message(e)))
      .finally(() => active && setLoading(null))
    return () => {
      active = false
    }
  }, [year, make, model, models])

  const selectedModel = models.find((m) => m.value === model)
  const noSpecs = selectedModel != null && !selectedModel.hasData

  async function handleVariant(vehicleId: string) {
    setVariant(vehicleId)
    setFill(null)
    if (!vehicleId) return
    const label = variants.find((v) => v.value === vehicleId)?.label ?? ''
    setError(null)
    setLoading('specs')
    try {
      const data = await getCarData({
        vehicleId,
        year,
        make,
        model,
        variant: label,
      })
      onFill(fetchedToForm(data))
      setFill({ kind: 'specs', label: `${data.year} ${data.make} ${data.model}` })
    } catch (e) {
      setError(message(e))
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-500">
        Pick a year, make, model and trim to auto-fill the specs below. You can
        edit anything afterward, or skip this and enter details by hand.
      </p>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Select
          label="Year"
          value={year}
          onChange={setYear}
          options={years}
          disabled={loading === 'menu' && years.length === 0}
        />
        <Select
          label="Make"
          value={make}
          onChange={setMake}
          options={makes}
          disabled={!year || makes.length === 0}
        />
        <Select
          label="Model"
          value={model}
          onChange={setModel}
          options={models}
          disabled={!make || models.length === 0}
        />
        <Select
          label="Trim"
          value={variant}
          onChange={handleVariant}
          options={variants}
          disabled={!model || variants.length === 0 || noSpecs}
        />
      </div>

      {loading && (
        <p className="text-xs text-slate-500" role="status">
          {loading === 'specs' ? 'Fetching specs…' : 'Loading…'}
        </p>
      )}

      {fill?.kind === 'identity' && !error && (
        <p className="text-xs text-amber-700" role="status">
          No trims were found for {fill.label}. Filled in the year, make and
          model — add the remaining specs manually below.
        </p>
      )}

      {fill?.kind === 'specs' && !error && (
        <p className="text-xs text-emerald-700" role="status">
          Filled in specs for {fill.label}. Review them below before saving.
        </p>
      )}

      {error && (
        <p className="text-xs text-rose-700" role="alert">
          Lookup failed: {error}. You can still enter details manually below.
        </p>
      )}
    </div>
  )
}

function Select({
  label,
  value,
  onChange,
  options,
  disabled,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string }[]
  disabled?: boolean
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-600">
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
      >
        <option value="">Select…</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  )
}

const message = (e: unknown): string =>
  e instanceof Error ? e.message : 'Unexpected error'
