import { create } from 'zustand'
import type { RouteFilter } from '../lib/analytics'

/* ---------------------------------------------------------------------------
   Filter state. Deliberately narrow: it holds only what the user controls, and
   nothing derived. The dashboard view model (below, in viewModel.ts) derives
   every displayed figure from this state plus the fetched dataset, which is
   what keeps the map, the KPIs and the charts in agreement by construction.
   --------------------------------------------------------------------------- */

/** Reporting windows offered in the header control. */
export const WINDOW_OPTIONS = [3, 6, 12] as const
export type WindowMonths = (typeof WINDOW_OPTIONS)[number]

export interface FilterState {
  /** A single sector id, or 'all' for the whole network. */
  routeFilter: RouteFilter
  /** Trailing months included in the reporting window. */
  windowMonths: WindowMonths
  /** When on, panels compare the window against the window before it. */
  compareEnabled: boolean
  setRouteFilter: (route: RouteFilter) => void
  setWindowMonths: (months: WindowMonths) => void
  setCompareEnabled: (enabled: boolean) => void
  toggleCompare: () => void
  reset: () => void
}

export const useFilterStore = create<FilterState>((set) => ({
  routeFilter: 'all',
  windowMonths: 12,
  compareEnabled: false,
  setRouteFilter: (routeFilter) => set({ routeFilter }),
  setWindowMonths: (windowMonths) => set({ windowMonths }),
  setCompareEnabled: (compareEnabled) => set({ compareEnabled }),
  toggleCompare: () => set((state) => ({ compareEnabled: !state.compareEnabled })),
  reset: () => set({ routeFilter: 'all', windowMonths: 12, compareEnabled: false }),
}))

/** Non-reactive read, for use inside event handlers and tests. */
export function currentFilters(): Pick<FilterState, 'routeFilter' | 'windowMonths' | 'compareEnabled'> {
  const { routeFilter, windowMonths, compareEnabled } = useFilterStore.getState()
  return { routeFilter, windowMonths, compareEnabled }
}