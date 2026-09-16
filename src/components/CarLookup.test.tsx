import { describe, expect, it, vi, beforeEach } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import CarLookup from './CarLookup'
import type { FetchedCarData } from '../lib/carData/types'

// Mock the API client so the drill-down runs without a server.
vi.mock('../lib/carData/client', () => ({
  getYears: vi.fn(),
  getMakes: vi.fn(),
  getModels: vi.fn(),
  getVariants: vi.fn(),
  getCarData: vi.fn(),
}))

import * as client from '../lib/carData/client'

const fetched: FetchedCarData = {
  year: 2025,
  make: 'Toyota',
  model: 'Corolla',
  fuelType: 'gas',
  bodyStyle: 'sedan',
  mpg: { combined: 35 },
  specs: {},
  missing: ['price'],
  source: 'fueleconomy+nhtsa',
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(client.getYears).mockResolvedValue([{ value: '2025', label: '2025' }])
  vi.mocked(client.getMakes).mockResolvedValue([
    { value: 'Toyota', label: 'Toyota' },
  ])
  vi.mocked(client.getModels).mockResolvedValue([
    { value: 'Corolla', label: 'Corolla', hasData: true },
  ])
  vi.mocked(client.getVariants).mockResolvedValue([
    { value: '41213', label: 'Auto (variable gear ratios)' },
  ])
  vi.mocked(client.getCarData).mockResolvedValue(fetched)
})

// The <select> following a given label.
function selectFor(label: string): HTMLSelectElement {
  return screen.getByText(label).closest('label')!.querySelector('select')!
}

describe('CarLookup', () => {
  it('drills down and calls onFill with the compiled specs', async () => {
    const onFill = vi.fn()
    render(<CarLookup onFill={onFill} />)

    await screen.findByRole('option', { name: '2025' })
    fireEvent.change(selectFor('Year'), { target: { value: '2025' } })

    await screen.findByRole('option', { name: 'Toyota' })
    fireEvent.change(selectFor('Make'), { target: { value: 'Toyota' } })

    await screen.findByRole('option', { name: 'Corolla' })
    fireEvent.change(selectFor('Model'), { target: { value: 'Corolla' } })

    await screen.findByRole('option', { name: 'Auto (variable gear ratios)' })
    fireEvent.change(selectFor('Trim'), { target: { value: '41213' } })

    await waitFor(() => expect(onFill).toHaveBeenCalledWith(fetched))
    expect(client.getCarData).toHaveBeenCalledWith({
      vehicleId: '41213',
      year: '2025',
      make: 'Toyota',
      model: 'Corolla',
      variant: 'Auto (variable gear ratios)',
    })
    await screen.findByText(/Filled in specs for 2025 Toyota Corolla/)
  })

  it('disables the trim menu and warns when a model has no spec data', async () => {
    vi.mocked(client.getModels).mockResolvedValue([
      { value: 'Mirai', label: 'Mirai', hasData: false },
    ])
    render(<CarLookup onFill={vi.fn()} />)

    await screen.findByRole('option', { name: '2025' })
    fireEvent.change(selectFor('Year'), { target: { value: '2025' } })
    await screen.findByRole('option', { name: 'Toyota' })
    fireEvent.change(selectFor('Make'), { target: { value: 'Toyota' } })
    await screen.findByRole('option', { name: 'Mirai' })
    fireEvent.change(selectFor('Model'), { target: { value: 'Mirai' } })

    await screen.findByText(/No spec data is available/)
    expect(selectFor('Trim')).toBeDisabled()
    expect(client.getVariants).not.toHaveBeenCalled()
  })

  it('shows an error and does not fill when the specs lookup fails', async () => {
    vi.mocked(client.getCarData).mockRejectedValue(new Error('Lookup failed (500)'))
    const onFill = vi.fn()
    render(<CarLookup onFill={onFill} />)

    await screen.findByRole('option', { name: '2025' })
    fireEvent.change(selectFor('Year'), { target: { value: '2025' } })
    await screen.findByRole('option', { name: 'Toyota' })
    fireEvent.change(selectFor('Make'), { target: { value: 'Toyota' } })
    await screen.findByRole('option', { name: 'Corolla' })
    fireEvent.change(selectFor('Model'), { target: { value: 'Corolla' } })
    await screen.findByRole('option', { name: 'Auto (variable gear ratios)' })
    fireEvent.change(selectFor('Trim'), { target: { value: '41213' } })

    await screen.findByRole('alert')
    expect(screen.getByRole('alert')).toHaveTextContent('Lookup failed (500)')
    expect(onFill).not.toHaveBeenCalled()
  })
})
