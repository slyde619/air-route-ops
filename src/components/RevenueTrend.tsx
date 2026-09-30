import { Fragment } from 'react'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { axisTick, chartColor, gridProps } from '../lib/chartTokens'
import { NO_FLIGHTS_TEXT } from '../lib/analytics'
import { formatNairaAxis, formatNairaCompact, formatPercent } from '../lib/format'
import { monthLabel, monthTick } from '../lib/months'
import type { DashboardViewModel } from '../store/viewModel'
import { TooltipFrame, TooltipRow } from './ChartTooltip'

/* ---------------------------------------------------------------------------
   Revenue trend.

   Two lines: the reporting window, and — when the comparison toggle is on —
   the equal-length window immediately before it, aligned by position rather
   than by date so the shape of the two periods can be compared directly. The
   prior line is drawn in a muted gold so it reads as context, not as a second
   live series.
   --------------------------------------------------------------------------- */

interface RevenueTrendProps {
  vm: DashboardViewModel
}

interface ChartPoint {
  label: string
  month: string
  revenueNaira: number
  passengers: number
  loadFactorPercent: number
  operatedFlights: number
  comparisonRevenue?: number
  comparisonMonth?: string
}

export function RevenueTrend({ vm }: RevenueTrendProps) {
  const data: ChartPoint[] = vm.series.map((point, index) => {
    const comparison = vm.compareEnabled ? vm.comparisonSeries[index] : undefined
    return {
      label: monthTick(point.month),
      month: point.month,
      revenueNaira: point.revenueNaira,
      passengers: point.passengers,
      loadFactorPercent: point.loadFactorPercent,
      operatedFlights: point.operatedFlights,
      comparisonRevenue: comparison?.revenueNaira,
      comparisonMonth: comparison?.month,
    }
  })

  return (
    <div className="h-64 w-full px-2 pt-3 pb-1 sm:h-72">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 12, right: 28, bottom: 4, left: 4 }}>
          <CartesianGrid {...gridProps} />
          <XAxis
            dataKey="label"
            tick={axisTick}
            tickLine={false}
            axisLine={{ stroke: chartColor.grid }}
            tickMargin={8}
            interval="preserveStartEnd"
            minTickGap={16}
          />
          <YAxis
            tick={axisTick}
            tickLine={false}
            axisLine={false}
            width={52}
            tickFormatter={(value: number) => formatNairaAxis(value)}
          />
          <Tooltip
            cursor={{ stroke: chartColor.faint, strokeWidth: 1 }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null
              const point = payload[0].payload as ChartPoint
              // Same aggregateTotals output the KPI strip reads; a month with
              // zero departures has no meaningful load factor, so show the
              // shared empty-state text instead of 0%.
              const hasData = point.operatedFlights > 0
              return (
                <TooltipFrame title={monthLabel(point.month)}>
                  <TooltipRow label="Revenue" value={formatNairaCompact(point.revenueNaira)} tone="brand" />
                  <TooltipRow label="Passengers" value={point.passengers.toLocaleString()} />
                  <TooltipRow
                    label="Load factor"
                    value={hasData ? formatPercent(point.loadFactorPercent) : NO_FLIGHTS_TEXT}
                  />
                  {vm.compareEnabled && point.comparisonMonth ? (
                    <TooltipRow
                      label={monthLabel(point.comparisonMonth)}
                      value={formatNairaCompact(point.comparisonRevenue ?? 0)}
                      tone="muted"
                    />
                  ) : null}
                </TooltipFrame>
              )
            }}
          />
          {vm.compareEnabled ? (
            <Line
              type="linear"
              dataKey="comparisonRevenue"
              name="Previous period"
              stroke={chartColor.gold}
              strokeWidth={1.5}
              strokeDasharray="4 3"
              dot={false}
              isAnimationActive={false}
            />
          ) : null}
          <Line
            type="linear"
            dataKey="revenueNaira"
            name="Revenue"
            stroke={chartColor.brand}
            strokeWidth={2}
            dot={{ r: 2, fill: chartColor.brand, strokeWidth: 0 }}
            activeDot={{ r: 4, fill: chartColor.brandStrong, strokeWidth: 0 }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

/** Legend rendered as text rather than a Recharts <Legend> block. */
export function RevenueLegend({ vm }: { vm: DashboardViewModel }) {
  return (
    <Fragment>
      <span className="inline-flex items-center gap-1.5 text-micro text-muted">
        <span aria-hidden="true" className="h-0.5 w-4 bg-brand" />
        last {vm.windowMonths} months
      </span>
      {vm.compareEnabled ? (
        <span className="inline-flex items-center gap-1.5 text-micro text-muted">
          <span
            aria-hidden="true"
            className="h-0.5 w-4 border-t border-dashed border-gold"
          />
          previous {vm.windowMonths} months
        </span>
      ) : null}
    </Fragment>
  )
}