import { formatPercent } from '../lib/format'
import { routeLabel } from '../lib/mock/network'
import { hasFlights, NO_FLIGHTS_TEXT, type RouteFilter } from '../lib/analytics'
import type { DashboardViewModel, RouteRow } from '../store/viewModel'
import { RouteMap } from './RouteMap'
import { PanelLoading } from './States'
import { panel, panelHeader, panelMeta, panelTitle, routeRow } from './ui'

/* ---------------------------------------------------------------------------
   Left rail: the route network diagram, the selected sector's detail, and the
   full route table. On narrow viewports the map is hidden and the route list
   carries the whole selection affordance.
   --------------------------------------------------------------------------- */

interface RailProps {
  vm: DashboardViewModel
  isPending: boolean
  hoveredRouteId: string | null
  onHoverRoute: (routeId: string | null) => void
  /** Reports a sector id, or 'all' to clear the selection. */
  onSelectRoute: (route: RouteFilter) => void
  mapEdgesRef: React.Ref<SVGGElement>
}

export function RouteRail({
  vm,
  isPending,
  hoveredRouteId,
  onHoverRoute,
  onSelectRoute,
  mapEdgesRef,
}: RailProps) {
  const { routeFilter, activeRouteRows, routeRows } = vm
  const select = (routeId: string) => onSelectRoute(routeId === routeFilter ? 'all' : routeId)

  return (
    <div className="flex flex-col gap-px bg-line">
      <section className={panel}>
        <header className={panelHeader}>
          <h2 className={panelTitle}>Network</h2>
          <p className={panelMeta}>
            {vm.activeRouteCount} of {routeRows.length} routes
            {routeFilter !== 'all' ? ' selected' : ''}
          </p>
        </header>

        {isPending ? (
          <PanelLoading label="Loading the route network." rows={3} minHeightClass="min-h-map" />
        ) : (
          <>
            {/* Map on wide screens. Line weight is scheduled departures in the
                reporting window; the selected sector is drawn bright. */}
            <RouteMap
              rows={routeRows}
              onSelectRoute={select}
              hoveredRouteId={hoveredRouteId}
              onHoverRoute={onHoverRoute}
              edgesRef={mapEdgesRef}
              className="hidden w-full px-2 py-3 sm:block"
            />

            <p className="hidden px-3 pb-3 text-micro leading-relaxed text-faint sm:block">
              Thicker line = more flights per week. Click a route to focus the whole
              dashboard on it; click the background to undo.
            </p>
          </>
        )}
      </section>

      <RouteTable
        rows={activeRouteRows}
        allRows={routeRows}
        routeFilter={routeFilter}
        isPending={isPending}
        hoveredRouteId={hoveredRouteId}
        onHoverRoute={onHoverRoute}
        onSelectRoute={select}
        onClear={() => onSelectRoute('all')}
      />
    </div>
  )
}

interface RouteTableProps {
  rows: RouteRow[]
  allRows: RouteRow[]
  routeFilter: string
  isPending: boolean
  hoveredRouteId: string | null
  onHoverRoute: (routeId: string | null) => void
  onSelectRoute: (routeId: string) => void
  onClear: () => void
}

/**
 * The route list doubles as the rail's detail table on desktop and as the
 * map's replacement on mobile, so it always shows every sector and marks the
 * dimmed ones rather than hiding them.
 */
function RouteTable({
  rows,
  allRows,
  routeFilter,
  isPending,
  hoveredRouteId,
  onHoverRoute,
  onSelectRoute,
  onClear,
}: RouteTableProps) {
  const selected = routeFilter === 'all' ? null : allRows.find((row) => row.routeId === routeFilter)

  return (
    <section className={panel}>
      <header className={panelHeader}>
        <h2 className={panelTitle}>Routes</h2>
        {selected ? (
          <button
            type="button"
            onClick={onClear}
            className="cursor-pointer text-micro font-medium text-brand transition-colors duration-150 hover:text-brand-strong"
          >
            Clear selection
          </button>
        ) : (
          <p className={panelMeta}>How full, last month</p>
        )}
      </header>

      {isPending ? (
        <PanelLoading label="Loading route details." rows={5} />
      ) : (
        <ul className="divide-y divide-line">
          {allRows.map((row) => {
            const isActive = row.isSelected
            const isHovered = row.routeId === hoveredRouteId
            // A sector with no departures this month has no meaningful rate
            // metrics; show the shared empty-state text instead of 0%.
            const hasData = hasFlights(row.latest)
            return (
              <li key={row.routeId}>
                <button
                  type="button"
                  aria-pressed={isActive}
                  onClick={() => onSelectRoute(row.routeId)}
                  onPointerEnter={() => onHoverRoute(row.routeId)}
                  onPointerLeave={() => onHoverRoute(null)}
                  onFocus={() => onHoverRoute(row.routeId)}
                  onBlur={() => onHoverRoute(null)}
                  className={`${routeRow} ${row.isDimmed ? 'opacity-55' : ''}`}
                >
                  <span className="flex items-baseline justify-between gap-3">
                    <span className="flex items-baseline gap-2">
                      <span
                        className={`font-data text-label tabular-nums ${
                          isActive || isHovered ? 'text-brand-strong' : 'text-ink'
                        }`}
                      >
                        {row.route.from}–{row.route.to}
                      </span>
                      <span className="text-micro text-faint">{routeLabel(row.route)}</span>
                    </span>
                    {hasData ? (
                      <span className="font-data text-label tabular-nums text-ink">
                        {formatPercent(row.latest.loadFactorPercent)}
                      </span>
                    ) : (
                      <span className="text-micro text-muted">{NO_FLIGHTS_TEXT}</span>
                    )}
                  </span>
                  <span className="mt-0.5 flex items-baseline justify-between gap-3 text-micro text-faint">
                    <span className="font-data tabular-nums">
                      {row.totals.operatedFlights.toLocaleString()} flights ·{' '}
                      {row.route.weeklyFrequency}/wk
                    </span>
                    <span className="font-data tabular-nums">
                      {hasData ? `${formatPercent(row.latest.onTimePercent)} on time` : '—'}
                    </span>
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}

      {!isPending && rows.length === 0 ? (
        <p className="px-3 py-4 text-label text-faint">
          No routes match the current selection.
        </p>
      ) : null}
    </section>
  )
}