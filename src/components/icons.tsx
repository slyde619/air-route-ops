import type { SVGProps } from 'react'

/* ---------------------------------------------------------------------------
   The handful of inline glyphs the dashboard needs. Kept local rather than
   pulled from an icon package: there are five of them, and vendoring them
   keeps the demo free of a runtime dependency on an icon CDN.
   All glyphs inherit `currentColor` and size from the parent font.
   --------------------------------------------------------------------------- */

type GlyphProps = SVGProps<SVGSVGElement>

const base = {
  width: '1em',
  height: '1em',
  viewBox: '0 0 16 16',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
  focusable: false,
}

export function TrendUp(props: GlyphProps) {
  return (
    <svg {...base} {...props}>
      <path d="M2.5 11 6.5 6.5l2.5 2L13.5 3" />
      <path d="M10 3h3.5v3.5" />
    </svg>
  )
}

export function TrendDown(props: GlyphProps) {
  return (
    <svg {...base} {...props}>
      <path d="M2.5 5 6.5 9.5l2.5-2L13.5 13" />
      <path d="M10 13h3.5V9.5" />
    </svg>
  )
}

export function TrendFlat(props: GlyphProps) {
  return (
    <svg {...base} {...props}>
      <path d="M2.5 8h11" />
    </svg>
  )
}

export function Plane(props: GlyphProps) {
  return (
    <svg {...base} {...props}>
      <path d="M8 1.6c.9 0 1.5 1 1.5 2.4v1.9l3.8 2.3v1.5l-3.8-1.1v2.2l1.4 1v1.1L8 14l-2.9-1.3v-1.1l1.4-1V8.4L2.7 9.5V8l3.8-2.3V4c0-1.4.6-2.4 1.5-2.4Z" />
    </svg>
  )
}

export function Check(props: GlyphProps) {
  return (
    <svg {...base} {...props}>
      <path d="M3 8.5 6.2 11.5 13 4.5" />
    </svg>
  )
}

export function Alert(props: GlyphProps) {
  return (
    <svg {...base} {...props}>
      <path d="M8 5.5v3.5" />
      <circle cx="8" cy="11.6" r="0.5" fill="currentColor" stroke="none" />
      <path d="M8 2.2 14.2 13H1.8L8 2.2Z" />
    </svg>
  )
}