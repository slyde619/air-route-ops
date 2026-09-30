import {
  Bar,
  BarChart,
  Cell,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { axisTick, chartColor, gridProps } from '../lib/chartTokens'
import { hasFlights, NO_FLIGHTS_TEXT } from '../lib/analytics'
import { formatNairaCompact, formatPercent } from '../lib/format'
import { routeLabel } from '../lib/mock/network'
import type { DashboardViewModel } from '../store/viewModel'
import { TooltipFrame, TooltipRow } from './ChartTooltip'

/* ---------------------------------------------------------------------------
   Load factor by sector.

   Horizontal bars, one per sector in the current scope, ordered by the view
   model (busiest revenue first, matching the rail). A reference line marks the
   network average for the reporting month, so a bar's position relative to the
   network is readable without doing arithmetic — and sectors that sit
   materially below that average are the only place the alert accent is spent.
   --------------------------------------------------------------------------- */

/** How far below the network average a sector has to sit to be flagged. */
const ALERT_MARGIN_POINTS = 5

interface LoadFactorByRouteProps {
  vm: DashboardViewModel
  onSelectRoute: (routeId: string) => void
}

interface BarPoint {
  routeId: string
  code: string
  label: string
  loadFactorPercent: number
  onTimePercent: number
  revenueNaira: number
  isFlagged: boolean
  /** False for a sector that operated nothing this month. */
  hasData: boolean
}

export function LoadFactorByRoute({ vm, onSelectRoute }: LoadFactorByRouteProps) {
  const { activeRouteRows, routeFilter } = vm

  // The benchmark is the volume-weighted network load factor for the reporting
  // month — the same figure the KPI strip shows — not a mean of route
  // percentages, which would let a small sector count as much as the trunk.
  const networkAverage = vm.networkLoadFactorPercent

  const data: BarPoint[] = activeRouteRows.map((row) => ({
    routeId: row.routeId,
    code: `${row.route.from}–${row.route.to}`,
    label: routeLabel(row.route),
    loadFactorPercent: row.latest.loadFactorPercent,
    onTimePercent: row.latest.onTimePercent,
    revenueNaira: row.latest.revenueNaira,
    isFlagged:
      hasFlights(row.latest) &&
      row.latest.loadFactorPercent < networkAverage - ALERT_MARGIN_POINTS,
    hasData: hasFlights(row.latest),
  }))

  const height = Math.max(180, data.length * 38 + 40)

  return (
    <div className="w-full px-2 pt-3 pb-1">
      <div style={{ height }} className="w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 20, right: 16, bottom: 4, left: 4 }}
            barCategoryGap={10}
          >
            <CartesianGrid {...gridProps} horizontal={false} vertical />
            <XAxis
              type="number"
              domain={[0, 100]}
              tick={axisTick}
              tickLine={false}
              axisLine={{ stroke: chartColor.grid }}
              tickFormatter={(value: number) => `${value}%`}
              ticks={[0, 25, 50, 75, 100]}
            />
            <YAxis
              type="category"
              dataKey="code"
              tick={{ ...axisTick, fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              width={64}
            />
            {vm.networkHasFlights ? (
            <ReferenceLine
              x={networkAverage}
              stroke={chartColor.ink}
              strokeDasharray="4 3"
              label={{
                // Sits in the margin above the plot rather than inside it:
                // the busiest sector's bar reaches the top of the chart, and an
                // inside label would also collide with the 75% axis tick.
                value: `Network ${formatPercent(networkAverage, 1)}`,
                position: 'top',
                fill: chartColor.muted,
                fontSize: 10,
                fontFamily: 'var(--font-data)',
              }}
            />
            ) : null}
            <Tooltip
              cursor={{ fill: chartColor.raised }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null
                const point = payload[0].payload as BarPoint
                if (!point.hasData) {
                  return (
                    <TooltipFrame title={`${point.label} (${point.code})`}>
                      <TooltipRow label="Departures" value={NO_FLIGHTS_TEXT} tone="muted" />
                    </TooltipFrame>
                  )
                }
                return (
                  <TooltipFrame title={`${point.label} (${point.code})`}>
                    <TooltipRow
                      label="Load factor"
                      value={formatPercent(point.loadFactorPercent)}
                      tone="brand"
                    />
                    <TooltipRow label="On time" value={formatPercent(point.onTimePercent)} />
                    <TooltipRow
                      label="Revenue"
                      value={formatNairaCompact(point.revenueNaira)}
                    />
                    {point.isFlagged ? (
                      <TooltipRow
                        label="vs network average"
                        value={formatPercent(point.loadFactorPercent - networkAverage, 1)}
                        tone="muted"
                      />
                    ) : null}
                  </TooltipFrame>
                )
              }}
            />
            <Bar
              dataKey="loadFactorPercent"
              isAnimationActive={false}
              onClick={(entry: unknown) => {
                const point = entry as BarPoint
                if (point?.routeId) {
                  onSelectRoute(point.routeId === routeFilter ? 'all' : point.routeId)
                }
              }}
              className="cursor-pointer"
            >
              {data.map((point) => (
                <Cell
                  key={point.routeId}
                  fill={
                    point.isFlagged
                      ? chartColor.signal
                      : routeFilter === point.routeId
                        ? chartColor.brandStrong
                        : chartColor.brand
                  }
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}