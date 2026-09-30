/**
 * Chart colour and axis tokens.
 *
 * Recharts takes colours as SVG attribute values, so these are references to
 * the variables declared in the @theme block rather than hex codes repeated in
 * component files. The browser resolves them at paint time, which means the
 * charts follow the palette in index.css and there is exactly one place a
 * colour is ever written down.
 */

export const chartColor = {
  brand: 'var(--color-brand)',
  brandStrong: 'var(--color-brand-strong)',
  brandDeep: 'var(--color-brand-deep)',
  gold: 'var(--color-gold)',
  signal: 'var(--color-signal)',
  grid: 'var(--color-line)',
  muted: 'var(--color-muted)',
  faint: 'var(--color-faint)',
  ink: 'var(--color-ink)',
  surface: 'var(--color-surface)',
  raised: 'var(--color-raised)',
} as const

/** Shared tick styling so both charts label their axes identically. */
export const axisTick = {
  fill: chartColor.muted,
  fontSize: 11,
  fontFamily: 'var(--font-data)',
} as const

/** Recharts grid: horizontal rules only, no vertical noise. */
export const gridProps = {
  stroke: chartColor.grid,
  strokeDasharray: 'none',
  vertical: false,
} as const