import { addMonths, monthRange, parseMonthKey, toMonthKey, type MonthKey } from '../months'
import { ROUTES, SEATS_BY_AIRCRAFT } from './network'
import type { MonthlyRouteStat, NetworkDataset, Route } from './types'
import { AIRPORTS } from './network'

/** Months of history the dashboard carries. */
export const HISTORY_MONTHS = 12

/* ---------------------------------------------------------------------------
   Deterministic pseudo-randomness.
   Values must not change between reloads or the comparison toggle and the
   charts would disagree with what the user saw a second ago, so every draw is
   seeded from the route id and month key rather than Math.random.
   --------------------------------------------------------------------------- */

function hashSeed(text: string): number {
  let h = 2166136261
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

type Rng = () => number

/** Uniform draw in [min, max). */
function between(rng: Rng, min: number, max: number): number {
  return min + rng() * (max - min)
}

/* ---------------------------------------------------------------------------
   Operating assumptions per sector. These are demo planning figures shaped to
   look like a real Nigerian domestic network: the Uyo–Lagos trunk and the
   Abuja–Lagos business sector carry the highest yields, short south-east hops
   are high-frequency but low-fare, and the thinner sectors to Calabar and
   Owerri run at lower load factors.
   --------------------------------------------------------------------------- */

interface RouteProfile {
  /** Load factor at an average month, before seasonality. */
  baseLoadFactor: number
  /** Average realised fare in naira per passenger. */
  baseFareNaira: number
  /** Share of operated departures within 15 minutes of schedule. */
  baseOnTime: number
  /** Share of scheduled departures cancelled. */
  baseCancellationRate: number
}

const ROUTE_PROFILES: Record<string, RouteProfile> = {
  'QUO-LOS': { baseLoadFactor: 0.79, baseFareNaira: 78000, baseOnTime: 0.87, baseCancellationRate: 0.008 },
  'ABV-LOS': { baseLoadFactor: 0.8, baseFareNaira: 96000, baseOnTime: 0.84, baseCancellationRate: 0.011 },
  'ABV-QUO': { baseLoadFactor: 0.76, baseFareNaira: 89000, baseOnTime: 0.82, baseCancellationRate: 0.014 },
  'PHC-QUO': { baseLoadFactor: 0.7, baseFareNaira: 42000, baseOnTime: 0.9, baseCancellationRate: 0.006 },
  'ENU-LOS': { baseLoadFactor: 0.73, baseFareNaira: 71000, baseOnTime: 0.85, baseCancellationRate: 0.012 },
  'BNI-LOS': { baseLoadFactor: 0.69, baseFareNaira: 63000, baseOnTime: 0.86, baseCancellationRate: 0.01 },
  'LOS-QOW': { baseLoadFactor: 0.66, baseFareNaira: 68000, baseOnTime: 0.81, baseCancellationRate: 0.017 },
  'CBQ-LOS': { baseLoadFactor: 0.64, baseFareNaira: 74000, baseOnTime: 0.79, baseCancellationRate: 0.019 },
}

/**
 * Network punctuality runs ahead of the weakest sector rather than averaging
 * with it, because the busiest routes also carry the best OTP and dominate
 * departure counts. Applied as a lift after per-sector values are drawn.
 */
const OTP_NETWORK_LIFT = 0.03

/**
 * Domestic demand seasonality, indexed by calendar month (0 = January).
 * Peaks at Christmas, Easter and the August return-travel window; troughs in
 * the post-Christmas lull and the rainy-season dip.
 */
const SEASONALITY = [1.0, 0.95, 1.02, 1.06, 1.0, 0.94, 0.97, 1.05, 1.01, 1.0, 1.04, 1.14]

/** Year-on-year growth applied across the trailing twelve months. */
const ANNUAL_GROWTH = 0.11

/** Fuel and naira pressure lift fares through the year while OTP slips. */
const FARE_INFLATION = 0.16
const OTP_PRESSURE = -0.035

/* --------------------------------------------------------------------------- */

function latestCompletedMonth(): MonthKey {
  const now = new Date()
  // The dashboard reports completed months, so the current month is excluded.
  return addMonths(toMonthKey(now.getFullYear(), now.getMonth()), -1)
}

function round(value: number): number {
  return Math.round(value)
}

function generateRouteMonth(
  route: Route,
  month: MonthKey,
  monthIndexFromStart: number,
  rng: Rng,
): MonthlyRouteStat {
  const profile = ROUTE_PROFILES[route.id]
  if (!profile) throw new Error(`Missing operating profile for route ${route.id}`)
  const { monthIndex } = parseMonthKey(month)

  // Schedule grows with demand and the fleet ramp; the draw keeps individual
  // months from forming a suspiciously smooth curve.
  const growth = 1 + ANNUAL_GROWTH * (monthIndexFromStart / (HISTORY_MONTHS - 1))
  const seasonal = SEASONALITY[monthIndex]
  const scheduledFlights = Math.max(
    16,
    round(route.weeklyFrequency * 4.345 * growth * seasonal * between(rng, 0.96, 1.04)),
  )

  const cancellationRate = Math.min(
    0.06,
    profile.baseCancellationRate * between(rng, 0.55, 1.7) * (seasonal > 1.03 ? 1.25 : 0.95),
  )
  const cancelledFlights = round(scheduledFlights * cancellationRate)
  const operatedFlights = scheduledFlights - cancelledFlights

  const onTimeRate = Math.min(
    0.97,
    Math.max(
      0.6,
      profile.baseOnTime +
        OTP_NETWORK_LIFT +
        OTP_PRESSURE * (monthIndexFromStart / (HISTORY_MONTHS - 1)) +
        between(rng, -0.05, 0.05) -
        (seasonal > 1.03 ? 0.045 : 0),
    ),
  )
  const onTimeFlights = round(operatedFlights * onTimeRate)

  const seatsFlown = operatedFlights * SEATS_BY_AIRCRAFT[route.aircraft]
  const loadFactor = Math.min(
    0.9,
    Math.max(
      0.52,
      // Seasonality is applied as a partial pull off 1.0 so every route does
      // not peak in lockstep; the draw carries the route-specific variance.
      profile.baseLoadFactor * (1 + (seasonal - 1) * 0.45) * between(rng, 0.93, 1.07) +
        (monthIndexFromStart / (HISTORY_MONTHS - 1)) * 0.015,
    ),
  )
  const passengers = round(seatsFlown * loadFactor)

  const fare = profile.baseFareNaira * (1 + FARE_INFLATION * (monthIndexFromStart / (HISTORY_MONTHS - 1)))
  const revenueNaira = round(passengers * fare * between(rng, 0.97, 1.03))

  return {
    routeId: route.id,
    month,
    scheduledFlights,
    cancelledFlights,
    onTimeFlights,
    passengers,
    seatsFlown,
    revenueNaira,
  }
}

/** Builds the full twelve-month history for every route in the network. */
export function generateDataset(endMonth: MonthKey = latestCompletedMonth()): NetworkDataset {
  const months = monthRange(endMonth, HISTORY_MONTHS)
  const history: MonthlyRouteStat[] = []

  for (const route of ROUTES) {
    months.forEach((month, index) => {
      const rng = mulberry32(hashSeed(`${route.id}:${month}`))
      history.push(generateRouteMonth(route, month, index, rng))
    })
  }

  return {
    airports: [...AIRPORTS],
    routes: [...ROUTES],
    history,
    earliestMonth: months[0],
    latestMonth: months[months.length - 1],
    generatedAt: new Date().toISOString(),
  }
}