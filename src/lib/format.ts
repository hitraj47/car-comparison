import type { Car, Price } from '../types'

const currency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
})

export function formatCurrency(amount: number): string {
  return currency.format(amount)
}

export function formatPrice(price: Price): string {
  if (price.mode === 'static') return formatCurrency(price.amount)
  return `${formatCurrency(price.min)} – ${formatCurrency(price.max)}`
}

/** Value used for ranking: static amount, or the midpoint of a range. */
export function priceValue(price: Price): number {
  return price.mode === 'static' ? price.amount : (price.min + price.max) / 2
}

export function carTitle(car: Pick<Car, 'year' | 'make' | 'model'>): string {
  return `${car.year} ${car.make} ${car.model}`.trim()
}

/** Show a number or an em-dash placeholder for missing values. */
export function orDash(value: number | null | undefined, suffix = ''): string {
  if (value == null || Number.isNaN(value)) return '—'
  return `${value}${suffix}`
}
