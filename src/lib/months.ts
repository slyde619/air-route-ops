/**
 * Month arithmetic on `YYYY-MM` keys. Kept dependency-free and pure so the
 * data layer, the store and the charts all slice time the same way.
 */

export type MonthKey = string

const SHORT_MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
]

const LONG_MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

export function toMonthKey(year: number, monthIndex: number): MonthKey {
  return `${year}-${String(monthIndex + 1).padStart(2, '0')}`
}

export function parseMonthKey(key: MonthKey): { year: number; monthIndex: number } {
  const [year, month] = key.split('-')
  return { year: Number(year), monthIndex: Number(month) - 1 }
}

export function addMonths(key: MonthKey, delta: number): MonthKey {
  const { year, monthIndex } = parseMonthKey(key)
  const total = year * 12 + monthIndex + delta
  return toMonthKey(Math.floor(total / 12), ((total % 12) + 12) % 12)
}

/** Trailing `count` months ending at (and including) `endKey`. */
export function monthRange(endKey: MonthKey, count: number): MonthKey[] {
  return Array.from({ length: count }, (_, i) => addMonths(endKey, i - (count - 1)))
}

/** 'Aug 2026' — used in tooltips and period captions. */
export function monthLabel(key: MonthKey): string {
  const { year, monthIndex } = parseMonthKey(key)
  return `${LONG_MONTHS[monthIndex]} ${year}`
}

/** "Aug '26" — used on axis ticks, where the year must stay visible. */
export function monthTick(key: MonthKey): string {
  const { year, monthIndex } = parseMonthKey(key)
  return `${SHORT_MONTHS[monthIndex]} '${String(year).slice(2)}`
}

export function monthShort(key: MonthKey): string {
  const { monthIndex } = parseMonthKey(key)
  return SHORT_MONTHS[monthIndex]
}