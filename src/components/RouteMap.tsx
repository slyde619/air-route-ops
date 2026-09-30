import { useMemo, type Ref } from 'react'
import { airport } from '../lib/mock/network'
import type { Airport, AirportCode } from '../lib/mock/types'
import type { RouteRow } from '../store/viewModel'

/* ---------------------------------------------------------------------------
   Route map.

   A schematic of the network rather than a geographic map: nodes are airports
   at hand-placed positions, edges are active sectors. Stroke weight encodes
   scheduled departures in the current window, so the trunk routes to Lagos
   read heavy and the thinner sectors light.

   All selection state arrives as props from the dashboard view model — this
   component owns no filter state, it only reports intent.
   --------------------------------------------------------------------------- */

/** The coordinate space the airport positions in network.ts are authored in.
 *  Kept tight around the network's bounds so the node labels render at a
 *  legible size when the map is scaled into the narrow rail. */
const VIEWBOX = { x: 12, y: 16, width: 396, height: 318 }

/** Departures-per-window mapped onto stroke weight. */
const MIN_WEIGHT = 1
const MAX_WEIGHT = 6

interface RouteMapProps {
  rows: RouteRow[]
  /** Highlighted sector, whether from pointer hover or keyboard focus. */
  hoveredRouteId: string | null
  onHoverRoute: (routeId: string | null) => void
  /** Reports the sector the user picked, or 'all' for the whole network. */
  onSelectRoute: (routeId: string) => void
  /** Lets the entrance animation target the drawn edges. */
  edgesRef?: Ref<SVGGElement>
  className?: string
}

/**
 * Bounding box for the opaque plate drawn behind an airport label. Three-letter
 * codes are the only labels on the map, so a fixed width is enough; the plate
 * is padded slightly so the text does not sit flush against a passing line.
 */
const LABEL_PLATE = { width: 26, height: 13 }

function nodeLabelPlate(
  cx: number,
  cy: number,
  label: Airport['label'],
): { x: number; y: number; width: number; height: number } {
  const anchorX = cx + label.dx
  const x =
    label.anchor === 'start'
      ? anchorX - 2
      : label.anchor === 'end'
        ? anchorX - LABEL_PLATE.width + 2
        : anchorX - LABEL_PLATE.width / 2
  // The label baseline sits at cy + dy, so the plate is centred a little above it.
  return { x, y: cy + label.dy - 10, width: LABEL_PLATE.width, height: LABEL_PLATE.height }
}

export function RouteMap({
  rows,
  onSelectRoute,
  hoveredRouteId,
  onHoverRoute,
  edgesRef,
  className,
}: RouteMapProps) {
  const { maxFlights, nodes } = useMemo(() => {
    const max = rows.reduce((m, row) => Math.max(m, row.windowFlights), 1)
    const codes = new Set<AirportCode>()
    for (const row of rows) {
      codes.add(row.route.from)
      codes.add(row.route.to)
    }
    return { maxFlights: max, nodes: [...codes].map(airport) }
  }, [rows])

  /** Square-root scaling keeps the thinnest sectors visible next to the trunk. */
  function weightFor(windowFlights: number): number {
    const ratio = Math.sqrt(windowFlights / maxFlights)
    return MIN_WEIGHT + ratio * (MAX_WEIGHT - MIN_WEIGHT)
  }

  function edgeClass(row: RouteRow): string {
    const isFocus = row.isSelected || row.routeId === hoveredRouteId
    if (isFocus) return 'route-edge stroke-brand-strong'
    if (row.isDimmed) return 'route-edge stroke-line'
    return 'route-edge stroke-brand'
  }

  return (
    <svg
      viewBox={`${VIEWBOX.x} ${VIEWBOX.y} ${VIEWBOX.width} ${VIEWBOX.height}`}
      className={className}
      role="group"
      aria-label="Route map. Eight routes between eight airports."
    >
      {/* Clicking empty space returns the dashboard to the whole network. */}
      <rect
        x={VIEWBOX.x}
        y={VIEWBOX.y}
        width={VIEWBOX.width}
        height={VIEWBOX.height}
        fill="transparent"
        onClick={() => onSelectRoute('all')}
        aria-hidden="true"
      />

      {/* Edges. Each sector renders twice: a wide invisible line that carries
          the pointer interaction, and the visible line that carries keyboard
          focus and the label. Splitting them means the hit area can be large
          without thickening the drawn route. */}
      <g ref={edgesRef}>
        {rows.map((row) => {
          const from = airport(row.route.from).map
          const to = airport(row.route.to).map
          const weight = weightFor(row.windowFlights)

          return (
            <line
              key={row.routeId}
              x1={from.x}
              y1={from.y}
              x2={to.x}
              y2={to.y}
              strokeWidth={weight}
              strokeLinecap="round"
              className={edgeClass(row)}
            />
          )
        })}
      </g>

      {/* Nodes. Decorative: pointer events pass through to the edges below.
          Every label gets a plate in the panel colour so a route line passing
          nearby does not run through the text. */}
      <g aria-hidden="true">
        {nodes.map((node) => (
          <g key={node.code}>
            <circle cx={node.map.x} cy={node.map.y} r={4.5} className="fill-canvas" />
            <circle cx={node.map.x} cy={node.map.y} r={3} className="fill-ink" />
            <rect
              x={nodeLabelPlate(node.map.x, node.map.y, node.label).x}
              y={nodeLabelPlate(node.map.x, node.map.y, node.label).y}
              width={nodeLabelPlate(node.map.x, node.map.y, node.label).width}
              height={nodeLabelPlate(node.map.x, node.map.y, node.label).height}
              className="fill-surface"
            />
            <text
              x={node.map.x + node.label.dx}
              y={node.map.y + node.label.dy}
              textAnchor={node.label.anchor}
              className="fill-muted font-data text-micro tracking-loose"
            >
              {node.code}
            </text>
          </g>
        ))}
      </g>

      {/* Interaction layer, above the nodes so a click near a label still
          selects the sector rather than nothing. */}
      {rows.map((row) => {
        const from = airport(row.route.from).map
        const to = airport(row.route.to).map
        const fromCity = airport(row.route.from).city
        const toCity = airport(row.route.to).city
        const label = `${fromCity} to ${toCity}`

        return (
          <g key={`hit-${row.routeId}`}>
            <line
              x1={from.x}
              y1={from.y}
              x2={to.x}
              y2={to.y}
              stroke="transparent"
              strokeWidth={18}
              strokeLinecap="round"
              className="cursor-pointer"
              onClick={() => onSelectRoute(row.routeId)}
              onPointerEnter={() => onHoverRoute(row.routeId)}
              onPointerLeave={() => onHoverRoute(null)}
              aria-hidden="true"
            />
            <g
              role="button"
              tabIndex={0}
              aria-pressed={row.isSelected}
              aria-label={`${label}, ${row.latest.operatedFlights} flights last month`}
              className="cursor-pointer outline-none"
              onClick={() => onSelectRoute(row.routeId)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  onSelectRoute(row.routeId)
                }
              }}
              onFocus={() => onHoverRoute(row.routeId)}
              onBlur={() => onHoverRoute(null)}
            >
              {/* The focusable element is invisible; focus needs a visible
                  marker, so the edge's own stroke is brightened by the parent
                  via hoveredRouteId, and this dot marks the sector midpoint. */}
              <circle
                cx={(from.x + to.x) / 2}
                cy={(from.y + to.y) / 2}
                r={7}
                className={
                  row.routeId === hoveredRouteId || row.isSelected
                    ? 'fill-brand-strong'
                    : 'fill-transparent'
                }
              />
            </g>
          </g>
        )
      })}
    </svg>
  )
}