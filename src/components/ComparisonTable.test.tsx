import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import ComparisonTable from './ComparisonTable'
import { FACT_MPG } from '../lib/ranking'
import { DEFAULT_SCORING } from '../types'
import type { AttributeDef, Car, ScoringConfig } from '../types'

const base = {
  year: 2024,
  make: 'M',
  bodyStyle: 'suv',
  fuelType: 'gas',
  createdAt: '',
  updatedAt: '',
} as const

const cars: Car[] = [
  {
    ...base,
    id: 'a',
    model: 'A',
    price: { mode: 'static', amount: 30000 },
    mpg: { combined: 40 },
    customAttrs: { tow: 5000 },
  },
  {
    ...base,
    id: 'b',
    model: 'B',
    price: { mode: 'static', amount: 35000 },
    mpg: { combined: 30 },
    customAttrs: { tow: 4000 },
  },
]

const towing: AttributeDef = {
  id: 'tow',
  name: 'Towing',
  unit: 'lb',
  direction: 'higher',
  meaningfulDiff: 1000,
  createdAt: '',
  updatedAt: '',
}

// The <th> for a given attribute row, walked up from its label text.
function rowHeader(label: string): HTMLElement {
  const th = screen.getByText(label).closest('th')
  if (!th) throw new Error(`no row header for "${label}"`)
  return th as HTMLElement
}

function valueCells(label: string): HTMLElement[] {
  const row = rowHeader(label).closest('tr') as HTMLElement
  return within(row).getAllByRole('cell')
}

describe('ComparisonTable — include/exclude from scoring', () => {
  it('colors an included metric row and does not mark it "not scored"', () => {
    render(
      <ComparisonTable cars={cars} catalog={[]} attributeDefs={[towing]} config={DEFAULT_SCORING} />,
    )
    const header = rowHeader('MPG — Combined')
    expect(header.textContent).not.toContain('not scored')
    // The best MPG cell picks up a proximity color class.
    expect(valueCells('MPG — Combined')[0].className).toContain('bg-emerald')
  })

  it('greys out an excluded built-in metric row and drops its color', () => {
    const config: ScoringConfig = { ...DEFAULT_SCORING, excludedFacts: [FACT_MPG] }
    render(
      <ComparisonTable cars={cars} catalog={[]} attributeDefs={[towing]} config={config} />,
    )
    const header = rowHeader('MPG — Combined')
    expect(header.textContent).toContain('not scored')
    expect(header.className).toContain('text-slate-400') // muted label

    for (const cell of valueCells('MPG — Combined')) {
      expect(cell.className).toContain('text-slate-400') // greyed values
      expect(cell.className).not.toContain('bg-emerald') // no scoring color
    }
  })

  it('applies include/exclude to custom metrics too', () => {
    const config: ScoringConfig = { ...DEFAULT_SCORING, excludedFacts: ['tow'] }
    render(
      <ComparisonTable cars={cars} catalog={[]} attributeDefs={[towing]} config={config} />,
    )
    const header = rowHeader('Towing (lb)')
    expect(header.textContent).toContain('not scored')
    expect(header.className).toContain('text-slate-400')
    for (const cell of valueCells('Towing (lb)')) {
      expect(cell.className).toContain('text-slate-400')
    }
  })
})

// The row switch (walked up from its label) for a given attribute row.
function rowSwitch(label: string): HTMLElement {
  const row = rowHeader(label).closest('tr') as HTMLElement
  return within(row).getByRole('switch')
}

describe('ComparisonTable — per-row scoring toggle', () => {
  it('shows a switch per numeric row that reflects included state', () => {
    render(
      <ComparisonTable
        cars={cars}
        catalog={[]}
        attributeDefs={[towing]}
        config={DEFAULT_SCORING}
        onToggleFact={() => {}}
      />,
    )
    expect(rowSwitch('MPG — Combined')).toHaveAttribute('aria-checked', 'true')
    expect(rowSwitch('Price')).toHaveAttribute('aria-checked', 'true')
  })

  it('reflects an excluded fact as an off switch', () => {
    const config: ScoringConfig = { ...DEFAULT_SCORING, excludedFacts: [FACT_MPG] }
    render(
      <ComparisonTable
        cars={cars}
        catalog={[]}
        attributeDefs={[towing]}
        config={config}
        onToggleFact={() => {}}
      />,
    )
    expect(rowSwitch('MPG — Combined')).toHaveAttribute('aria-checked', 'false')
  })

  it('calls onToggleFact with the row fact key when clicked', () => {
    const onToggleFact = vi.fn()
    render(
      <ComparisonTable
        cars={cars}
        catalog={[]}
        attributeDefs={[towing]}
        config={DEFAULT_SCORING}
        onToggleFact={onToggleFact}
      />,
    )
    fireEvent.click(rowSwitch('MPG — Combined'))
    expect(onToggleFact).toHaveBeenCalledWith(FACT_MPG)
  })

  it('omits switches when no onToggleFact handler is given', () => {
    render(
      <ComparisonTable cars={cars} catalog={[]} attributeDefs={[towing]} config={DEFAULT_SCORING} />,
    )
    expect(screen.queryByRole('switch')).toBeNull()
  })
})
