import { renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { usePhotoUrls } from './usePhotoUrls'
import type { CarPhoto } from '../types'

const makePhoto = (id: string): CarPhoto => ({
  id,
  blob: new Blob(['x'], { type: 'image/png' }),
  mimeType: 'image/png',
  sortOrder: 0,
})

let counter = 0
const createSpy = vi.fn(() => `blob:mock/${counter++}`)
const revokeSpy = vi.fn()
const origCreate = URL.createObjectURL
const origRevoke = URL.revokeObjectURL

beforeEach(() => {
  counter = 0
  createSpy.mockClear()
  revokeSpy.mockClear()
  URL.createObjectURL = createSpy as typeof URL.createObjectURL
  URL.revokeObjectURL = revokeSpy as typeof URL.revokeObjectURL
})

afterEach(() => {
  URL.createObjectURL = origCreate
  URL.revokeObjectURL = origRevoke
})

describe('usePhotoUrls', () => {
  it('returns an object URL for each photo', () => {
    const { result } = renderHook(() => usePhotoUrls([makePhoto('a')]))
    expect(result.current['a']).toBeDefined()
    expect(createSpy).toHaveBeenCalledTimes(1)
  })

  it('does not rebuild URLs when re-rendered with a fresh array of the same photos', () => {
    // Callers routinely build a new array each render (e.g. `[first]` or
    // `[...photos].sort()`); that must not re-run the effect, or the hook would
    // revoke/recreate URLs in a render loop (the photo-freeze bug).
    const photo = makePhoto('a')
    const { rerender } = renderHook(
      ({ photos }) => usePhotoUrls(photos),
      { initialProps: { photos: [photo] } },
    )
    const callsAfterMount = createSpy.mock.calls.length

    rerender({ photos: [photo] })
    rerender({ photos: [photo] })

    expect(createSpy.mock.calls.length).toBe(callsAfterMount)
    expect(revokeSpy).not.toHaveBeenCalled()
  })

  it('rebuilds and revokes URLs when the set of photos changes', () => {
    const { result, rerender } = renderHook(
      ({ photos }) => usePhotoUrls(photos),
      { initialProps: { photos: [makePhoto('a')] } },
    )
    expect(createSpy).toHaveBeenCalledTimes(1)

    rerender({ photos: [makePhoto('b')] })

    expect(createSpy).toHaveBeenCalledTimes(2)
    expect(revokeSpy).toHaveBeenCalledTimes(1)
    expect(result.current['b']).toBeDefined()
  })
})
