import { generateDataset } from './generate'
import type { NetworkDataset } from './types'

/* ---------------------------------------------------------------------------
   The API seam.

   Components only ever reach the data through `fetchNetwork()`. Replacing this
   with a real backend means changing this one function (and the query's return
   type if the server sends a different shape) — no component changes.

   Open backend questions this mock deliberately does not decide:
     - Auth: this demo has no session. A real deployment needs to establish who
       is asking before exposing yield and revenue figures.
     - Pagination/windowing: twelve months is returned in one payload. A real
       endpoint should accept a date range and route filter so the client stops
       filtering server-scale data in memory.
     - Freshness: metrics are derived here from raw monthly counts. If the
       backend can compute on-time % and load factor itself, the client-side
       analytics should be dropped rather than duplicated.
   --------------------------------------------------------------------------- */

export interface FetchNetworkOptions {
  /** AbortSignal so TanStack Query can cancel superseded requests. */
  signal?: AbortSignal
}

/** Simulated network latency, in ms. */
const MIN_LATENCY = 320
const MAX_LATENCY = 620

function latency(): number {
  return MIN_LATENCY + Math.random() * (MAX_LATENCY - MIN_LATENCY)
}

/**
 * Simulated failure switch. Left off; flip to true to exercise the error state
 * in the UI without touching any component.
 */
export const SIMULATE_FAILURE = false

export class ApiError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ApiError'
  }
}

export async function fetchNetwork(
  options: FetchNetworkOptions = {},
): Promise<NetworkDataset> {
  const { signal } = options

  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(resolve, latency())
    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(timer)
        reject(new DOMException('Request aborted', 'AbortError'))
      },
      { once: true },
    )
  })

  if (SIMULATE_FAILURE) {
    throw new ApiError('Operations data is unavailable.')
  }

  const dataset = generateDataset()

  // Demo hook for exercising the zero-data edge case without a backend:
  // load the page with ?debug=no-flights and the reporting month's rows are
  // emptied, so every panel must fall back to its "No flights operated" state.
  if (typeof window !== 'undefined' && window.location.search.includes('debug=no-flights')) {
    dataset.history = dataset.history.map((stat) =>
      stat.month === dataset.latestMonth
        ? { ...stat, scheduledFlights: 0, cancelledFlights: 0, onTimeFlights: 0, passengers: 0, seatsFlown: 0, revenueNaira: 0 }
        : stat,
    )
  }

  return dataset
}

export const networkQueryKey = ['network'] as const