import type { MonthKey } from '../months'

/** Airport served by the Ibom Air domestic network (demo set). */
export type AirportCode =
  | 'LOS' // Lagos — Murtala Muhammed
  | 'ABV' // Abuja — Nnamdi Azikiwe
  | 'PHC' // Port Harcourt — Omagwa
  | 'QUO' // Uyo — Victor Attah (Ibom Air's base)
  | 'ENU' // Enugu — Akanu Ibiam
  | 'CBQ' // Calabar — Margaret Ekpo
  | 'QOW' // Owerri — Sam Mbakwe
  | 'BNI' // Benin City — Oba Ovonramwen

export type AircraftType = 'CRJ900' | 'A220-300'

export interface Airport {
  code: AirportCode
  city: string
  name: string
  /** Schematic positions for the route map — hand-placed to read like the
   *  real geography (Uyo south-east, Abuja north-centre), not projected. */
  map: { x: number; y: number }
  /** Compact label placement on the map so node text never collides with
   *  route lines. */
  label: { dx: number; dy: number; anchor: 'start' | 'middle' | 'end' }
}

export type RouteId = string

export interface Route {
  id: RouteId
  from: AirportCode
  to: AirportCode
  /** Great-circle-ish distance in km, used for illustrative context. */
  distanceKm: number
  aircraft: AircraftType
  /** Scheduled departures per week — drives route map line weight. */
  weeklyFrequency: number
  /** True when the sector is flown in both directions as one timetable line. */
  bidirectional: boolean
}

/** One month of operating results for one route. */
export interface MonthlyRouteStat {
  routeId: RouteId
  month: MonthKey
  scheduledFlights: number
  cancelledFlights: number
  /** Departures within 15 minutes of schedule, excluding cancellations. */
  onTimeFlights: number
  passengers: number
  seatsFlown: number
  revenueNaira: number
}

/** A computed view of one route's month — what components actually consume. */
export interface RouteMonthMetrics {
  routeId: RouteId
  month: MonthKey
  scheduledFlights: number
  cancelledFlights: number
  operatedFlights: number
  onTimeFlights: number
  onTimePercent: number
  completionPercent: number
  passengers: number
  seatsFlown: number
  loadFactorPercent: number
  revenueNaira: number
  /** Average fare actually realised, ₦ per passenger. */
  yieldPerPassenger: number
}

export interface MonthSnapshot {
  month: MonthKey
  metrics: RouteMonthMetrics[]
  totals: NetworkTotals
}

export interface NetworkTotals {
  scheduledFlights: number
  cancelledFlights: number
  operatedFlights: number
  onTimeFlights: number
  onTimePercent: number
  completionPercent: number
  loadFactorPercent: number
  passengers: number
  seatsFlown: number
  revenueNaira: number
  yieldPerPassenger: number
}

export interface NetworkDataset {
  airports: Airport[]
  routes: Route[]
  /** Per-route monthly history, newest month last. */
  history: MonthlyRouteStat[]
  /** Latest month covered by `history`. */
  latestMonth: MonthKey
  /** Oldest month covered by `history`. */
  earliestMonth: MonthKey
  generatedAt: string
}

/** A delta between two values, with the direction resolved once. */
export interface Delta {
  value: number
  direction: 'up' | 'down' | 'flat'
  /**
   * False when the comparison baseline had no data (e.g. the month before the
   * dataset starts, or a month with zero departures). A delta without a
   * baseline must not be rendered as a trend — there is no honest percentage
   * to show, and fabricating +100% would be a lie.
   */
  baselineAvailable: boolean
}