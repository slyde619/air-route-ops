import type { Airport, AirportCode, Route } from './types'

/**
 * Static network definition: the eight domestic airports in this demo set and
 * the eight sectors between them.
 *
 * The map coordinates are hand-placed schematic positions, not a real
 * projection. For reference, the approximate real coordinates are Abuja
 * 9.0°N 7.3°E, Lagos 6.6°N 3.3°E, Benin City 6.3°N 5.6°E, Enugu 6.5°N 7.6°E,
 * Owerri 5.4°N 7.2°E, Uyo 5.0°N 7.9°E, Port Harcourt 5.0°N 6.9°E, Calabar
 * 4.9°N 8.3°E — so Abuja sits north, Lagos west, and the south-east airports
 * cluster toward the bottom right. The diagram honours that arrangement while
 * compressing it so labels stay legible.
 */
export const AIRPORTS: readonly Airport[] = [
  { code: 'ABV', city: 'Abuja', name: 'Nnamdi Azikiwe Intl', map: { x: 170, y: 56 }, label: { dx: 0, dy: -20, anchor: 'middle' } },
  { code: 'ENU', city: 'Enugu', name: 'Akanu Ibiam Intl', map: { x: 300, y: 140 }, label: { dx: 0, dy: -20, anchor: 'middle' } },
  { code: 'LOS', city: 'Lagos', name: 'Murtala Muhammed Intl', map: { x: 60, y: 150 }, label: { dx: 0, dy: 26, anchor: 'middle' } },
  { code: 'BNI', city: 'Benin City', name: 'Oba Ovonramwen', map: { x: 126, y: 224 }, label: { dx: -12, dy: 4, anchor: 'end' } },
  { code: 'QOW', city: 'Owerri', name: 'Sam Mbakwe Intl', map: { x: 196, y: 244 }, label: { dx: -12, dy: 4, anchor: 'end' } },
  { code: 'PHC', city: 'Port Harcourt', name: 'Omagwa Intl', map: { x: 230, y: 286 }, label: { dx: 0, dy: 26, anchor: 'middle' } },
  { code: 'QUO', city: 'Uyo', name: 'Victor Attah Intl', map: { x: 312, y: 240 }, label: { dx: 12, dy: 4, anchor: 'start' } },
  { code: 'CBQ', city: 'Calabar', name: 'Margaret Ekpo Intl', map: { x: 352, y: 296 }, label: { dx: -12, dy: 4, anchor: 'end' } },
] as const

/**
 * Sectors are keyed by airport pair so lookups never depend on direction.
 *
 * `weeklyFrequency` is total scheduled departures per week across the sector,
 * both directions combined, and drives route map line weight. The set is
 * scaled to a ten-aircraft short-haul fleet (CRJ900s and A220-300s) and puts
 * the network at roughly 39 departures a day.
 */
export const ROUTES: readonly Route[] = [
  { id: 'QUO-LOS', from: 'QUO', to: 'LOS', distanceKm: 560, aircraft: 'A220-300', weeklyFrequency: 56, bidirectional: true },
  { id: 'ABV-LOS', from: 'ABV', to: 'LOS', distanceKm: 520, aircraft: 'A220-300', weeklyFrequency: 49, bidirectional: true },
  { id: 'ABV-QUO', from: 'ABV', to: 'QUO', distanceKm: 480, aircraft: 'A220-300', weeklyFrequency: 42, bidirectional: true },
  { id: 'PHC-QUO', from: 'PHC', to: 'QUO', distanceKm: 130, aircraft: 'CRJ900', weeklyFrequency: 35, bidirectional: true },
  { id: 'ENU-LOS', from: 'ENU', to: 'LOS', distanceKm: 500, aircraft: 'CRJ900', weeklyFrequency: 28, bidirectional: true },
  { id: 'BNI-LOS', from: 'BNI', to: 'LOS', distanceKm: 320, aircraft: 'CRJ900', weeklyFrequency: 24, bidirectional: true },
  { id: 'LOS-QOW', from: 'LOS', to: 'QOW', distanceKm: 460, aircraft: 'CRJ900', weeklyFrequency: 21, bidirectional: true },
  { id: 'CBQ-LOS', from: 'CBQ', to: 'LOS', distanceKm: 590, aircraft: 'CRJ900', weeklyFrequency: 18, bidirectional: true },
] as const

export const AIRPORTS_BY_CODE = new Map<AirportCode, Airport>(
  AIRPORTS.map((airport) => [airport.code, airport]),
)

export function airport(code: AirportCode): Airport {
  const found = AIRPORTS_BY_CODE.get(code)
  if (!found) throw new Error(`Unknown airport code: ${code}`)
  return found
}

/** Cabin capacity by type, from the operating fleet assumptions. */
export const SEATS_BY_AIRCRAFT: Record<Route['aircraft'], number> = {
  CRJ900: 90,
  'A220-300': 145,
}

export function routeLabel(route: Route): string {
  return `${airport(route.from).city} \u2013 ${airport(route.to).city}`
}

export function routeCodeLabel(route: Route): string {
  return `${route.from}\u2013${route.to}`
}

/** Canonical id for an unordered airport pair. */
export function routeIdFor(a: AirportCode, b: AirportCode): string {
  const pair = [a, b].sort().join('-')
  const match = ROUTES.find((route) => [route.from, route.to].sort().join('-') === pair)
  if (!match) throw new Error(`No scheduled route between ${a} and ${b}`)
  return match.id
}