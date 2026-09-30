import type { MonthKey } from './months'
import { monthRange } from './months'
import type {
  Delta,
  MonthlyRouteStat,
  NetworkDataset,
  NetworkTotals,
  Route,
  RouteMonthMetrics,
  RouteId,
} from './mock/types'

/* ---------------------------------------------------------------------------
   The analytics core. Components never touch raw monthly rows: they consume
   the derived shapes produced here, which keeps the ratio definitions (what
   counts as on-time, what counts as a seat) in exactly one place.
   --------------------------------------------------------------------------- */

const EMPTY_TOTALS: NetworkTotals = {
  scheduledFlights: 0,
  cancelledFlights: 0,
  operatedFlights: 0,
  onTimeFlights: 0,
  onTimePercent: 0,
  completionPercent: 0,
  loadFactorPercent: 0,
  passengers: 0,
  seatsFlown: 0,
  revenueNaira: 0,
  yieldPerPassenger: 0,
}

export const ALL_ROUTES = 'all' as const
export type RouteFilter = RouteId | typeof ALL_ROUTES

/**
 * On-time performance excludes cancellations from the denominator, which is
 * how the metric is normally reported — a cancelled flight is a completion
 * problem, not a punctuality one.
 */
export function computeRouteMetrics(stat: MonthlyRouteStat): RouteMonthMetrics {
  const operatedFlights = stat.scheduledFlights - stat.cancelledFlights
  return {
    routeId: stat.routeId,
    month: stat.month,
    scheduledFlights: stat.scheduledFlights,
    cancelledFlights: stat.cancelledFlights,
    operatedFlights,
    onTimeFlights: stat.onTimeFlights,
    onTimePercent: operatedFlights > 0 ? (stat.onTimeFlights / operatedFlights) * 100 : 0,
    completionPercent:
      stat.scheduledFlights > 0 ? (operatedFlights / stat.scheduledFlights) * 100 : 0,
    passengers: stat.passengers,
    seatsFlown: stat.seatsFlown,
    loadFactorPercent: stat.seatsFlown > 0 ? (stat.passengers / stat.seatsFlown) * 100 : 0,
    revenueNaira: stat.revenueNaira,
    yieldPerPassenger: stat.passengers > 0 ? stat.revenueNaira / stat.passengers : 0,
  }
}

/**
 * Volume-weighted aggregation — ratios are recomputed from summed counts, so
 * a sector's contribution is proportional to how much it actually flew.
 *
 * Weighting note: load factor here is passengers ÷ seats flown across the
 * scope, i.e. weighted by seats, NOT a flat average of per-sector load
 * factors. A 145-seat A220 sector and a 90-seat CRJ sector therefore count
 * in proportion to the seats they offered. This is the industry-standard
 * definition and matches the plain-language label shown in the UI.
 */
export function aggregateTotals(metrics: readonly RouteMonthMetrics[]): NetworkTotals {
  if (metrics.length === 0) return { ...EMPTY_TOTALS }

  const sums = metrics.reduce(
    (acc, m) => ({
      scheduledFlights: acc.scheduledFlights + m.scheduledFlights,
      cancelledFlights: acc.cancelledFlights + m.cancelledFlights,
      operatedFlights: acc.operatedFlights + m.operatedFlights,
      onTimeFlights: acc.onTimeFlights + m.onTimeFlights,
      passengers: acc.passengers + m.passengers,
      seatsFlown: acc.seatsFlown + m.seatsFlown,
      revenueNaira: acc.revenueNaira + m.revenueNaira,
    }),
    {
      scheduledFlights: 0,
      cancelledFlights: 0,
      operatedFlights: 0,
      onTimeFlights: 0,
      passengers: 0,
      seatsFlown: 0,
      revenueNaira: 0,
    },
  )

  return {
    ...sums,
    onTimePercent:
      sums.operatedFlights > 0 ? (sums.onTimeFlights / sums.operatedFlights) * 100 : 0,
    completionPercent:
      sums.scheduledFlights > 0 ? (sums.operatedFlights / sums.scheduledFlights) * 100 : 0,
    loadFactorPercent: sums.seatsFlown > 0 ? (sums.passengers / sums.seatsFlown) * 100 : 0,
    yieldPerPassenger: sums.passengers > 0 ? sums.revenueNaira / sums.passengers : 0,
  }
}

/**
 * True when a period has at least one departure to report on. Rate metrics
 * (load factor, on-time %) computed over zero departures are meaningless —
 * they resolve to 0 by convention, which would read as "0% load factor"
 * instead of "nothing flew". Display sites must check this and render
 * NO_FLIGHTS_TEXT rather than the number.
 */
export function hasFlights(totals: Pick<NetworkTotals, 'operatedFlights'>): boolean {
  return totals.operatedFlights > 0
}

/** The one string every display site uses for a zero-departure period. */
export const NO_FLIGHTS_TEXT = 'No flights operated'

export interface DashboardIndex {
  dataset: NetworkDataset
  routesById: Map<RouteId, Route>
  /** Every monthly row as metrics, computed once per fetch. */
  allMetrics: RouteMonthMetrics[]
  /** Metrics grouped by month, oldest first. */
  byMonth: Map<MonthKey, RouteMonthMetrics[]>
  /** Metrics grouped by route, oldest month first. */
  byRoute: Map<RouteId, RouteMonthMetrics[]>
  months: MonthKey[]
}

/**
 * Builds the lookup tables once per dataset fetch. Every filter combination
 * below reads from these maps instead of rescanning the history array.
 */
export function buildIndex(dataset: NetworkDataset): DashboardIndex {
  assertMapCoverage(dataset)

  const allMetrics = dataset.history.map(computeRouteMetrics)
  const byMonth = new Map<MonthKey, RouteMonthMetrics[]>()
  const byRoute = new Map<RouteId, RouteMonthMetrics[]>()

  for (const metrics of allMetrics) {
    const monthBucket = byMonth.get(metrics.month)
    if (monthBucket) monthBucket.push(metrics)
    else byMonth.set(metrics.month, [metrics])

    const routeBucket = byRoute.get(metrics.routeId)
    if (routeBucket) routeBucket.push(metrics)
    else byRoute.set(metrics.routeId, [metrics])
  }

  const months = monthRange(dataset.latestMonth, monthRangeLength(dataset))
  for (const bucket of byMonth.values()) bucket.sort((a, b) => a.routeId.localeCompare(b.routeId))
  for (const bucket of byRoute.values()) bucket.sort((a, b) => a.month.localeCompare(b.month))

  return {
    dataset,
    routesById: new Map(dataset.routes.map((route) => [route.id, route])),
    allMetrics,
    byMonth,
    byRoute,
    months,
  }
}

function monthRangeLength(dataset: NetworkDataset): number {
  const [fromYear, fromMonth] = dataset.earliestMonth.split('-').map(Number)
  const [toYear, toMonth] = dataset.latestMonth.split('-').map(Number)
  return (toYear - fromYear) * 12 + (toMonth - fromMonth) + 1
}

/**
 * Dev-time guard: every airport code referenced by a sector must have a map
 * node in `dataset.airports`, or the route map would render a sector with a
 * dangling endpoint while the sector list shows it normally. This is the only
 * place the two views' shared dependency is checked, so a future dataset
 * change that drops an airport surfaces here loudly instead of as a silent
 * gap on the map.
 */
function assertMapCoverage(dataset: NetworkDataset): void {
  const mapped = new Set(dataset.airports.map((airport) => airport.code))
  const missing = new Set<string>()
  for (const route of dataset.routes) {
    for (const code of [route.from, route.to]) {
      if (!mapped.has(code)) missing.add(`${route.id} references ${code}`)
    }
  }
  if (missing.size > 0) {
    const detail = [...missing].join('; ')
    // import.meta.env only exists under Vite; Node consumers (scripts, tests)
    // must not crash on the check itself. Outside Vite, always warn.
    const isDev = typeof import.meta.env === 'undefined' || import.meta.env.DEV
    if (isDev) {
      console.error(
        `[route-ops] Sector list and route map are out of sync — ${detail}. ` +
          `Add the airport to the network definition so the map renders it.`,
      )
    }
  }
}

/** Metrics for one month, optionally narrowed to a single route. */
export function metricsForMonth(
  index: DashboardIndex,
  month: MonthKey,
  routeFilter: RouteFilter = ALL_ROUTES,
): RouteMonthMetrics[] {
  const bucket = index.byMonth.get(month) ?? []
  return routeFilter === ALL_ROUTES
    ? bucket
    : bucket.filter((m) => m.routeId === routeFilter)
}

/** Metrics for one route across a window of months, oldest first. */
export function metricsForRoute(
  index: DashboardIndex,
  routeFilter: RouteFilter,
  months: readonly MonthKey[],
): RouteMonthMetrics[] {
  const wanted = new Set(months)
  const bucket =
    routeFilter === ALL_ROUTES
      ? index.allMetrics
      : (index.byRoute.get(routeFilter) ?? [])
  return bucket.filter((m) => wanted.has(m.month)).sort((a, b) => a.month.localeCompare(b.month))
}

/** One row per month in the window, aggregated across whatever is selected. */
export interface MonthPoint {
  month: MonthKey
  totals: NetworkTotals
}

export function buildMonthSeries(
  index: DashboardIndex,
  months: readonly MonthKey[],
  routeFilter: RouteFilter = ALL_ROUTES,
): MonthPoint[] {
  return months.map((month) => ({
    month,
    totals: aggregateTotals(metricsForMonth(index, month, routeFilter)),
  }))
}

/** Consecutive-month series for the trailing twelve months of the dataset. */
export function trailingMonths(index: DashboardIndex, endMonth: MonthKey, count: number): MonthKey[] {
  const available = new Set(index.months)
  return monthRange(endMonth, count).filter((month) => available.has(month))
}

/**
 * Percent change between two values. When the baseline is zero there is no
 * honest percentage to report, so the delta is marked `baselineAvailable:
 * false` and the UI hides the trend rather than inventing +100%.
 */
export function delta(current: number, previous: number): Delta {
  if (previous === 0) {
    return {
      value: 0,
      direction: 'flat',
      baselineAvailable: false,
    }
  }
  const change = ((current - previous) / Math.abs(previous)) * 100
  const rounded = Math.abs(change) < 0.05 ? 0 : change
  return {
    value: rounded,
    direction: rounded > 0 ? 'up' : rounded < 0 ? 'down' : 'flat',
    baselineAvailable: true,
  }
}

/**
 * Percentage-point change, for metrics that are already a percentage. The
 * caller supplies whether the baseline period had any data at all, since a
 * 0.0% reading from an empty period is not a real baseline.
 */
export function deltaPoints(
  current: number,
  previous: number,
  baselineAvailable = true,
): Delta {
  const change = current - previous
  const rounded = Math.abs(change) < 0.05 ? 0 : change
  return {
    value: rounded,
    direction: rounded > 0 ? 'up' : rounded < 0 ? 'down' : 'flat',
    baselineAvailable,
  }
}

/** Sorted list of routes with their position in the network, for the rail. */
export interface RouteOption {
  route: Route
  label: string
}

export function routeOptions(index: DashboardIndex): RouteOption[] {
  return [...index.routesById.values()]
    .map((route) => ({
      route,
      label: `${route.from}\u2013${route.to}`,
    }))
    .sort((a, b) => b.route.weeklyFrequency - a.route.weeklyFrequency)
}