import { DEFAULT_SCORING, type ScoringConfig } from '../types'
import { formatCurrency } from '../lib/format'
import {
  customDiff,
  FACT_CARGO_FOLDED,
  FACT_CARGO_UP,
  FACT_MPG,
  FACT_MPGE,
  FACT_PRICE,
  type FactMeta,
} from '../lib/ranking'

interface ScoringSettingsProps {
  config: ScoringConfig
  facts: FactMeta[]
  priceDiffDollars: number
  onChange: (config: ScoringConfig) => void
}

/**
 * Per-comparison scoring controls: which facts count, each fact's meaningful
 * difference, and the Final Score blend.
 */
export default function ScoringSettings({
  config,
  facts,
  priceDiffDollars,
  onChange,
}: ScoringSettingsProps) {
  const excluded = new Set(config.excludedFacts ?? [])
  const set = (key: keyof ScoringConfig, value: number) =>
    onChange({ ...config, [key]: value })

  function toggleFact(key: string) {
    const next = new Set(excluded)
    if (next.has(key)) next.delete(key)
    else next.add(key)
    onChange({ ...config, excludedFacts: [...next] })
  }

  function setCustomDiff(id: string, value: number) {
    onChange({
      ...config,
      customDiffs: { ...config.customDiffs, [id]: value },
    })
  }

  const included = facts.filter((f) => !excluded.has(f.key))

  return (
    <div className="space-y-5">
      {/* Which facts count */}
      <section>
        <h4 className="mb-1 text-sm font-semibold text-slate-700">
          Facts included
        </h4>
        <p className="mb-2 text-sm text-slate-500">
          Unchecked facts stay in the table but are greyed out and don’t count
          toward the Specs Score. Applies to custom metrics too.
        </p>
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          {facts.map((f) => (
            <label key={f.key} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={!excluded.has(f.key)}
                onChange={() => toggleFact(f.key)}
                className="accent-slate-700"
              />
              {f.label}
            </label>
          ))}
        </div>
      </section>

      {/* Meaningful differences (only for included facts) */}
      <section className="border-t border-slate-200 pt-4">
        <h4 className="mb-1 text-sm font-semibold text-slate-700">
          Meaningful differences
        </h4>
        <p className="mb-3 text-sm text-slate-500">
          A value within one meaningful difference of the best still counts as
          great. Larger = more forgiving.
        </p>
        <div className="space-y-3">
          {included.map((f) => {
            if (f.def) {
              return (
                <NumberField
                  key={f.key}
                  label={f.def.name}
                  suffix={f.def.unit ?? ''}
                  value={customDiff(f.def, config)}
                  onChange={(v) => setCustomDiff(f.key, v)}
                />
              )
            }
            switch (f.key) {
              case FACT_PRICE:
                return (
                  <Slider
                    key={f.key}
                    label="Price"
                    min={5}
                    max={50}
                    step={1}
                    value={config.pricePct}
                    suffix="%"
                    hint={`≈ ${formatCurrency(Math.round(priceDiffDollars))} on the cheapest car`}
                    onChange={(v) => set('pricePct', v)}
                  />
                )
              case FACT_MPG:
                return (
                  <Slider
                    key={f.key}
                    label="MPG"
                    min={1}
                    max={20}
                    step={1}
                    value={config.mpgDiff}
                    suffix=" mpg"
                    onChange={(v) => set('mpgDiff', v)}
                  />
                )
              case FACT_MPGE:
                return (
                  <Slider
                    key={f.key}
                    label="MPGe"
                    min={1}
                    max={40}
                    step={1}
                    value={config.mpgeDiff}
                    suffix=" MPGe"
                    onChange={(v) => set('mpgeDiff', v)}
                  />
                )
              case FACT_CARGO_UP:
                return (
                  <Slider
                    key={f.key}
                    label="Cargo (up)"
                    min={1}
                    max={20}
                    step={0.5}
                    value={config.cargoUpDiff}
                    suffix=" cu ft"
                    onChange={(v) => set('cargoUpDiff', v)}
                  />
                )
              case FACT_CARGO_FOLDED:
                return (
                  <Slider
                    key={f.key}
                    label="Cargo (folded)"
                    min={1}
                    max={40}
                    step={0.5}
                    value={config.cargoFoldedDiff}
                    suffix=" cu ft"
                    onChange={(v) => set('cargoFoldedDiff', v)}
                  />
                )
              default:
                return null
            }
          })}
        </div>
      </section>

      {/* Final Score blend */}
      <section className="border-t border-slate-200 pt-4">
        <h4 className="mb-1 text-sm font-semibold text-slate-700">
          Final Score blend
        </h4>
        <p className="mb-3 text-sm text-slate-500">
          How much the subjective pros &amp; cons count toward the Final Score.
          Specs make up the rest.
        </p>
        <Slider
          label="Pros & cons"
          min={0}
          max={100}
          step={5}
          value={config.proConWeight}
          suffix="%"
          hint={`specs ${100 - config.proConWeight}%`}
          onChange={(v) => set('proConWeight', v)}
        />
      </section>

      <button
        type="button"
        onClick={() => onChange({ ...DEFAULT_SCORING })}
        className="text-sm text-slate-500 underline hover:text-slate-700"
      >
        Reset to defaults
      </button>
    </div>
  )
}

function Slider({
  label,
  min,
  max,
  step,
  value,
  suffix,
  hint,
  onChange,
}: {
  label: string
  min: number
  max: number
  step: number
  value: number
  suffix: string
  hint?: string
  onChange: (value: number) => void
}) {
  return (
    <label className="grid grid-cols-[7rem_1fr_auto] items-center gap-3">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="accent-slate-700"
      />
      <span className="whitespace-nowrap text-sm text-slate-600">
        {value}
        {suffix}
        {hint && <span className="ml-2 text-xs text-slate-400">{hint}</span>}
      </span>
    </label>
  )
}

function NumberField({
  label,
  suffix,
  value,
  onChange,
}: {
  label: string
  suffix: string
  value: number
  onChange: (value: number) => void
}) {
  return (
    <label className="grid grid-cols-[7rem_1fr_auto] items-center gap-3">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <input
        type="number"
        step="any"
        min={0}
        value={value}
        onChange={(e) => {
          const n = Number(e.target.value)
          if (Number.isFinite(n) && n > 0) onChange(n)
        }}
        className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm focus:border-slate-500 focus:outline-none"
      />
      <span className="whitespace-nowrap text-sm text-slate-400">{suffix}</span>
    </label>
  )
}
