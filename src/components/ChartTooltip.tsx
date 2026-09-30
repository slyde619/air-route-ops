import type { ReactNode } from 'react'
import { chartColor } from '../lib/chartTokens'

/* ---------------------------------------------------------------------------
   Tooltip shell shared by both charts. Recharts renders tooltips in an
   absolutely positioned div, so the styling here is ordinary CSS rather than
   SVG presentation attributes.
   --------------------------------------------------------------------------- */

export function TooltipFrame({ title, children }: { title: ReactNode; children: ReactNode }) {
  return (
    <div className="border border-line-bright bg-raised px-3 py-2 shadow-none">
      <p className="text-micro font-medium text-ink">{title}</p>
      <dl className="mt-1.5 flex flex-col gap-1">{children}</dl>
    </div>
  )
}

export function TooltipRow({
  label,
  value,
  tone = 'default',
}: {
  label: string
  value: string
  tone?: 'default' | 'brand' | 'muted'
}) {
  const valueClass =
    tone === 'brand' ? 'text-brand-strong' : tone === 'muted' ? 'text-faint' : 'text-ink'
  return (
    <div className="flex items-baseline justify-between gap-6">
      <dt className="text-micro text-muted">{label}</dt>
      <dd className={`font-data text-label tabular-nums ${valueClass}`}>{value}</dd>
    </div>
  )
}

/** Marks the hovered column behind a tooltip without a heavy fill. */
export const tooltipCursor = {
  stroke: chartColor.faint,
  strokeWidth: 1,
} as const