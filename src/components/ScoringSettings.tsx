import { DEFAULT_SCORING, type ScoringConfig } from '../types'
import { formatCurrency } from '../lib/format'

interface ScoringSettingsProps {
  config: ScoringConfig
  priceDiffDollars: number
  onChange: (config: ScoringConfig) => void
}

/**
 * Tune the "meaningful difference" thresholds that drive cell colors and the
 * Specs Score. A gap of one meaningful difference counts as one step behind
 * the best.
 */
export default function ScoringSettings({
  config,
  priceDiffDollars,
  onChange,
}: ScoringSettingsProps) {
  const set = (key: keyof ScoringConfig, value: number) =>
    onChange({ ...config, [key]: value })

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500">
        A value within one meaningful difference of the best still counts as
        great. Increase a threshold to be more forgiving; decrease it to
        reward the leader more.
      </p>

      <Slider
        label="Price"
        min={5}
        max={50}
        step={1}
        value={config.pricePct}
        suffix="%"
        hint={`≈ ${formatCurrency(Math.round(priceDiffDollars))} on the cheapest car`}
        onChange={(v) => set('pricePct', v)}
      />
      <Slider
        label="MPG"
        min={1}
        max={20}
        step={1}
        value={config.mpgDiff}
        suffix=" mpg"
        onChange={(v) => set('mpgDiff', v)}
      />
      <Slider
        label="MPGe"
        min={1}
        max={40}
        step={1}
        value={config.mpgeDiff}
        suffix=" MPGe"
        onChange={(v) => set('mpgeDiff', v)}
      />
      <Slider
        label="Cargo (up)"
        min={1}
        max={20}
        step={0.5}
        value={config.cargoUpDiff}
        suffix=" cu ft"
        onChange={(v) => set('cargoUpDiff', v)}
      />
      <Slider
        label="Cargo (folded)"
        min={1}
        max={40}
        step={0.5}
        value={config.cargoFoldedDiff}
        suffix=" cu ft"
        onChange={(v) => set('cargoFoldedDiff', v)}
      />

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
