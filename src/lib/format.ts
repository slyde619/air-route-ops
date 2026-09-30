/**
 * Number formatting for the dashboard. Every figure rendered in the UI goes
 * through here so units stay consistent across KPIs, axes and tooltips.
 */

const NAIRA = '\u20A6'

export function formatInt(value: number): string {
  return Math.round(value).toLocaleString('en-NG')
}

/** 1.24bn / 840m / 12.3k — for axis ticks and KPI headlines. */
export function formatCompact(value: number): string {
  const abs = Math.abs(value)
  if (abs >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(2)}bn`
  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}m`
  if (abs >= 10_000) return `${(value / 1_000).toFixed(1)}k`
  if (abs >= 1_000) return `${(value / 1_000).toFixed(2)}k`
  return String(Math.round(value))
}

export function formatNaira(value: number): string {
  return `${NAIRA}${formatInt(value)}`
}

export function formatNairaCompact(value: number): string {
  return `${NAIRA}${formatCompact(value)}`
}

export function formatNairaAxis(value: number): string {
  return `${NAIRA}${formatCompact(value)}`
}

export function formatPercent(value: number, digits = 1): string {
  return `${value.toFixed(digits)}%`
}

/** Signed delta for trend indicators. Uses a real minus sign, not a hyphen. */
export function formatDeltaPercent(value: number, digits = 1): string {
  const sign = value > 0 ? '+' : value < 0 ? '\u2212' : ''
  return `${sign}${Math.abs(value).toFixed(digits)}%`
}

export function formatDeltaPoints(value: number, digits = 1): string {
  const sign = value > 0 ? '+' : value < 0 ? '\u2212' : ''
  return `${sign}${Math.abs(value).toFixed(digits)} pts`
}

export function formatDistance(km: number): string {
  return `${formatInt(km)} km`
}