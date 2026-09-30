import { type Ref } from 'react'
import { hasFlights, NO_FLIGHTS_TEXT } from '../lib/analytics'
import { formatCompact, formatNairaCompact, formatPercent } from '../lib/format'
import { monthLabel } from '../lib/months'
import type { DashboardViewModel } from '../store/viewModel'
import { panel, panelMeta } from './ui'
import { Trend } from './Trend'

/* ---------------------------------------------------------------------------
   KPI strip.

   Five figures, each one sentence about the reporting month with its change
   against the month before. Rate metrics (on-time, load factor) move in
   percentage points; volume metrics move in percent. No large gradient
   numerals — the value is a plain tabular figure and the change is the only
   coloured element.

   Every card carries a grey definition line so a reader with no aviation
   background can interpret the number in isolation. All values come from
   `vm.monthTotals`, which is produced by the single `aggregateTotals`
   function — no card recomputes anything.

   When a period has zero departures, rate cards show NO_FLIGHTS_TEXT instead
   of a meaningless 0%, and the trend indicator is hidden (the view model
   marks those deltas as having no baseline).
   --------------------------------------------------------------------------- */

interface KpiProps {
  label: string
  /** Rendered as the big figure, or replaced by the empty-state text. */
  value: string
  /** Plain-language definition, ≤65 chars so it does not wrap awkwardly. */
  note: string
  trend: React.ReactNode
  /** False when the period had no departures: value is not renderable. */
  hasData: boolean
}

function Kpi({ label, value, note, trend, hasData }: KpiProps) {
  return (
    <div className={`${panel} px-4 py-3`} data-kpi>
      <p className="text-micro font-medium tracking-loose text-muted">{label}</p>
      {hasData ? (
        <p className="mt-1.5 font-data text-metric tabular-nums text-ink">{value}</p>
      ) : (
        <p className="mt-1.5 font-data text-lead text-muted">{NO_FLIGHTS_TEXT}</p>
      )}
      {hasData ? <div className="mt-1.5">{trend}</div> : null}
      <p className="mt-1.5 text-micro leading-snug text-faint">{note}</p>
    </div>
  )
}

interface KpiStripProps {
  vm: DashboardViewModel
  isPending: boolean
  stripRef?: Ref<HTMLDivElement>
}

export function KpiStrip({ vm, isPending, stripRef }: KpiStripProps) {
  const { monthTotals } = vm
  const against = 'vs last month'
  const data = hasFlights(monthTotals)

  // Scope-aware phrasing: what the figures cover right now.
  const scope = vm.isScoped ? 'on the selected route' : 'across all routes'

  if (isPending) {
    return (
      <div ref={stripRef} className="grid grid-cols-1 gap-px bg-line sm:grid-cols-2 xl:grid-cols-5">
        {['On-time performance', 'Load factor', 'Flights flown', 'Revenue', 'Passengers'].map(
          (label) => (
            <div key={label} className={`${panel} px-4 py-3`} data-kpi>
              <p className="text-micro font-medium text-muted">{label}</p>
              <div className="mt-2 h-6 w-24 bg-raised motion-safe:animate-pulse" />
              <div className="mt-2 h-3 w-20 bg-raised motion-safe:animate-pulse" />
            </div>
          ),
        )}
      </div>
    )
  }

  return (
    <div ref={stripRef} className="grid grid-cols-1 gap-px bg-line sm:grid-cols-2 xl:grid-cols-5">
      <Kpi
        label="On-time performance"
        value={formatPercent(monthTotals.onTimePercent, 1)}
        note="Left within 15 min of schedule; cancellations not counted"
        trend={<Trend delta={vm.deltas.onTimePoints} unit="points" against={against} />}
        hasData={data}
      />
      <Kpi
        label="Load factor"
        value={formatPercent(monthTotals.loadFactorPercent, 1)}
        note="Share of available seats that were actually sold and flown"
        trend={<Trend delta={vm.deltas.loadFactorPoints} unit="points" against={against} />}
        hasData={data}
      />
      <Kpi
        label="Flights flown"
        value={formatCompact(monthTotals.operatedFlights)}
        note={
          data
            ? `Flights that actually flew; ${formatPercent(monthTotals.completionPercent, 1)} of those scheduled`
            : 'No flights were scheduled or flown this month'
        }
        trend={<Trend delta={vm.deltas.flights} against={against} />}
        hasData={data}
      />
      <Kpi
        label="Passenger revenue"
        value={formatNairaCompact(monthTotals.revenueNaira)}
        note={`Ticket money collected ${scope} this month`}
        trend={<Trend delta={vm.deltas.revenue} against={against} />}
        hasData={data}
      />
      <Kpi
        label="Passengers"
        value={formatCompact(monthTotals.passengers)}
        note={`People flown ${scope} this month`}
        trend={<Trend delta={vm.deltas.passengers} against={against} />}
        hasData={data}
      />
    </div>
  )
}

/** Caption above the strip, naming the period and the active scope. */
export function KpiCaption({ vm }: { vm: DashboardViewModel }) {
  return (
    <p className={panelMeta}>
      Data for {monthLabel(vm.reportingMonth)} ·{' '}
      {vm.isScoped
        ? 'one route selected'
        : `${vm.activeRouteCount} ${vm.activeRouteCount === 1 ? 'route' : 'routes'}`}
    </p>
  )
}