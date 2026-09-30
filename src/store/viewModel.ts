import { useMemo } from 'react'
import {
  ALL_ROUTES,
  aggregateTotals,
  hasFlights,
  buildMonthSeries,
  delta,
  deltaPoints,
  metricsForMonth,
  metricsForRoute,
  trailingMonths,
  type DashboardIndex,
  type RouteFilter,
} from '../lib/analytics'
import { addMonths, type MonthKey } from '../lib/months'
import type { NetworkTotals, Route, RouteId, Delta } from '../lib/mock/types'
import { useFilterStore, type WindowMonths } from '../store/filters'
import { useNetwork } from '../lib/mock/useNetwork'

/* ---------------------------------------------------------------------------
   The dashboard view model.

   Everything the page renders is derived here, in one pass, from
   (filter state + fetched dataset). The route map and both charts read the
   same `routeRows` / `series` arrays, so a filter change cannot reach one of
   them without reaching the others.
   --------------------------------------------------------------------------- */

export interface MonthSeriesPoint {
  month: MonthKey
  revenueNaira: number
  loadFactorPercent: number
  onTimePercent: number
  passengers: number
  scheduledFlights: number
  operatedFlights: number
  yieldPerPassenger: number
}

export interface RouteRow {
  routeId: RouteId
  route: Route
  /** Window aggregate for this route. */
  totals: NetworkTotals
  /** Latest month for this route, for the map tooltip and ranking. */
  latest: NetworkTotals
  /** Load factor change vs the previous month, in points. */
  loadFactorDelta: Delta
  /** Scheduled flights in the window — the route map's line weight input. */
  windowFlights: number
  /** True when this route is the active selection. */
  isSelected: boolean
  /** True for routes the current filter excludes from charts. */
  isDimmed: boolean
}

export interface DashboardViewModel {
  isReady: boolean
  routeFilter: RouteFilter
  selectedRoute: Route | undefined
  windowMonths: WindowMonths
  compareEnabled: boolean
  /** Months in the reporting window, oldest first. */
  window: MonthKey[]
  /** Equal-length window immediately before it, oldest first. */
  previousWindow: MonthKey[]
  /** Reporting month (the latest completed month in the dataset). */
  reportingMonth: MonthKey
  previousMonth: MonthKey
  /** Reporting window totals for the current scope. */
  windowTotals: NetworkTotals
  /** Aggregate for the reporting month alone. */
  monthTotals: NetworkTotals
  /** Aggregate for the month before it. */
  priorMonthTotals: NetworkTotals
  /** Month-over-month deltas powering the rate KPIs. */
  deltas: {
    onTimePoints: Delta
    loadFactorPoints: Delta
    revenue: Delta
    passengers: Delta
    flights: Delta
  }
  /** Selected scope, one point per month of the window. */
  series: MonthSeriesPoint[]
  /** Previous window, aligned by index to `series` for the comparison overlay. */
  comparisonSeries: MonthSeriesPoint[]
  /** Every route with its window aggregate — drives the charts and the map. */
  routeRows: RouteRow[]
  /** Routes contributing to the current scope (respects the route filter). */
  activeRouteRows: RouteRow[]
  activeRouteCount: number
  scheduledWeeklyDepartures: number
  /** True when the dashboard is scoped to one sector rather than the network. */
  isScoped: boolean
  /**
   * Volume-weighted network load factor for the reporting month. Always whole
   * network, never the filtered scope, so it works as a stable benchmark that
   * matches the load factor the KPI strip reports for the whole network.
   */
  networkLoadFactorPercent: number
  /** False when the reporting month's whole-network aggregate is empty. */
  networkHasFlights: boolean
}

const EMPTY_VM: DashboardViewModel = {
  isReady: false,
  routeFilter: ALL_ROUTES,
  selectedRoute: undefined,
  windowMonths: 12,
  compareEnabled: false,
  window: [],
  previousWindow: [],
  reportingMonth: '',
  previousMonth: '',
  windowTotals: aggregateTotals([]),
  monthTotals: aggregateTotals([]),
  priorMonthTotals: aggregateTotals([]),
  deltas: {
    onTimePoints: { value: 0, direction: 'flat', baselineAvailable: false },
    loadFactorPoints: { value: 0, direction: 'flat', baselineAvailable: false },
    revenue: { value: 0, direction: 'flat', baselineAvailable: false },
    passengers: { value: 0, direction: 'flat', baselineAvailable: false },
    flights: { value: 0, direction: 'flat', baselineAvailable: false },
  },
  series: [],
  comparisonSeries: [],
  routeRows: [],
  activeRouteRows: [],
  activeRouteCount: 0,
  scheduledWeeklyDepartures: 0,
  isScoped: false,
  networkLoadFactorPercent: 0,
  networkHasFlights: false,
}

function toSeriesPoint(month: MonthKey, totals: NetworkTotals): MonthSeriesPoint {
  return {
    month,
    revenueNaira: totals.revenueNaira,
    loadFactorPercent: totals.loadFactorPercent,
    onTimePercent: totals.onTimePercent,
    passengers: totals.passengers,
    scheduledFlights: totals.scheduledFlights,
    operatedFlights: totals.operatedFlights,
    yieldPerPassenger: totals.yieldPerPassenger,
  }
}

function buildViewModel(
  index: DashboardIndex,
  routeFilter: RouteFilter,
  windowMonths: WindowMonths,
  compareEnabled: boolean,
): DashboardViewModel {
  const { dataset } = index
  const reportingMonth = dataset.latestMonth
  const previousMonth = addMonths(reportingMonth, -1)

  const window = trailingMonths(index, reportingMonth, windowMonths)
  const previousWindow = trailingMonths(index, addMonths(reportingMonth, -windowMonths), windowMonths)

  const monthTotals = aggregateTotals(metricsForMonth(index, reportingMonth, routeFilter))
  const priorMonthTotals = aggregateTotals(metricsForMonth(index, previousMonth, routeFilter))

  const windowMetrics = metricsForRoute(index, routeFilter, window)
  const windowTotals = aggregateTotals(windowMetrics)

  // A prior month with zero departures is not a real baseline: rate metrics
  // over it resolve to 0, and comparing against that would fabricate a trend.
  const priorBaseline = hasFlights(priorMonthTotals)

  const series = buildMonthSeries(index, window, routeFilter).map((point) =>
    toSeriesPoint(point.month, point.totals),
  )
  const comparisonSeries = buildMonthSeries(index, previousWindow, routeFilter).map((point) =>
    toSeriesPoint(point.month, point.totals),
  )

  // Whole-network aggregate for the reporting month: the benchmark behind the
  // load-factor chart's reference line. Same aggregateTotals call the KPI
  // strip uses, just without the route filter, so the two can never disagree.
  const networkMonthTotals = aggregateTotals(metricsForMonth(index, reportingMonth))

  const routeRows: RouteRow[] = [...index.routesById.values()]
    .map((route) => {
      const routeWindow = metricsForRoute(index, route.id, window)
      const routeTotals = aggregateTotals(routeWindow)
      const latestMetrics = metricsForMonth(index, reportingMonth, route.id)
      const priorMetrics = metricsForMonth(index, previousMonth, route.id)
      const latest = aggregateTotals(latestMetrics)
      const prior = aggregateTotals(priorMetrics)
      const isSelected = routeFilter === route.id

      return {
        routeId: route.id,
        route,
        totals: routeTotals,
        latest,
        loadFactorDelta: deltaPoints(
          latest.loadFactorPercent,
          prior.loadFactorPercent,
          hasFlights(prior),
        ),
        windowFlights: routeTotals.operatedFlights,
        isSelected,
        isDimmed: routeFilter !== ALL_ROUTES && !isSelected,
      }
    })
    // Busiest sectors lead, so the map legend and bar chart share one order.
    .sort((a, b) => b.totals.revenueNaira - a.totals.revenueNaira)

  const activeRouteRows =
    routeFilter === ALL_ROUTES ? routeRows : routeRows.filter((row) => row.isSelected)

  return {
    isReady: true,
    routeFilter,
    selectedRoute: routeFilter === ALL_ROUTES ? undefined : index.routesById.get(routeFilter),
    windowMonths,
    compareEnabled,
    window,
    previousWindow,
    reportingMonth,
    previousMonth,
    windowTotals,
    monthTotals,
    priorMonthTotals,
    deltas: {
      onTimePoints: deltaPoints(
        monthTotals.onTimePercent,
        priorMonthTotals.onTimePercent,
        priorBaseline,
      ),
      loadFactorPoints: deltaPoints(
        monthTotals.loadFactorPercent,
        priorMonthTotals.loadFactorPercent,
        priorBaseline,
      ),
      revenue: delta(monthTotals.revenueNaira, priorMonthTotals.revenueNaira),
      passengers: delta(monthTotals.passengers, priorMonthTotals.passengers),
      flights: delta(monthTotals.operatedFlights, priorMonthTotals.operatedFlights),
    },
    series,
    comparisonSeries,
    routeRows,
    activeRouteRows,
    activeRouteCount: activeRouteRows.length,
    scheduledWeeklyDepartures: activeRouteRows.reduce(
      (sum, row) => sum + row.route.weeklyFrequency,
      0,
    ),
    isScoped: routeFilter !== ALL_ROUTES,
    networkLoadFactorPercent: networkMonthTotals.loadFactorPercent,
    networkHasFlights: hasFlights(networkMonthTotals),
  }
}

/**
 * Reads filter state and the dataset, returning the single view model the
 * whole dashboard renders from, plus the setters components need.
 */
export function useDashboard(): DashboardViewModel & {
  isPending: boolean
  isError: boolean
  error: Error | null
  refetch: () => void
  setRoute: (route: RouteFilter) => void
  setWindow: (months: WindowMonths) => void
  toggleCompare: () => void
} {
  const routeFilter = useFilterStore((state) => state.routeFilter)
  const windowMonths = useFilterStore((state) => state.windowMonths)
  const compareEnabled = useFilterStore((state) => state.compareEnabled)
  const setRouteFilter = useFilterStore((state) => state.setRouteFilter)
  const setWindowMonths = useFilterStore((state) => state.setWindowMonths)
  const toggleCompare = useFilterStore((state) => state.toggleCompare)
  const { index, isPending, isError, error, refetch } = useNetwork()

  const viewModel = useMemo(() => {
    if (!index) return null
    return buildViewModel(index, routeFilter, windowMonths, compareEnabled)
  }, [index, routeFilter, windowMonths, compareEnabled])

  return {
    ...(viewModel ?? EMPTY_VM),
    isPending,
    isError,
    error,
    refetch,
    setRoute: setRouteFilter,
    setWindow: setWindowMonths,
    toggleCompare,
  }
}