import { useEffect, useState } from 'react'
import {
  getCarData,
  getMakes,
  getModels,
  getVariants,
  getYears,
} from '../lib/carData/client'
import type {
  FetchedCarData,
  MenuOption,
  ModelOption,
} from '../lib/carData/types'

interface CarLookupProps {
  // Called with the compiled specs once a variant is looked up, so the parent
  // form can auto-fill its fields. The user can still edit everything after.
  onFill: (data: FetchedCarData) => void
}

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
  const [filledLabel, setFilledLabel] = useState<string | null>(null)

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
    setFilledLabel(null)
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
    setFilledLabel(null)
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
    setFilledLabel(null)
    if (!year || !make || !model) return
    // Models NHTSA knows but FuelEconomy doesn't have no trims/specs to fetch;
    // the UI steers the user to manual entry instead.
    if (models.find((m) => m.value === model)?.hasData === false) return
    let active = true
    setError(null)
    setLoading('menu')
    getVariants(year, make, model)
      .then((data) => active && setVariants(data))
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
    setFilledLabel(null)
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
      onFill(data)
      setFilledLabel(`${data.year} ${data.make} ${data.model}`)
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

      {noSpecs && !loading && (
        <p className="text-xs text-amber-700">
          No spec data is available for this model — please enter its details
          manually below.
        </p>
      )}

      {filledLabel && !error && (
        <p className="text-xs text-emerald-700" role="status">
          Filled in specs for {filledLabel}. Review them below before saving.
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
