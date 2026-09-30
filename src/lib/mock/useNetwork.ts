import { queryOptions, useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { buildIndex, type DashboardIndex } from '../analytics'
import { fetchNetwork, networkQueryKey } from './api'
import type { NetworkDataset } from './types'

export function networkQueryOptions() {
  return queryOptions({
    queryKey: networkQueryKey,
    queryFn: ({ signal }) => fetchNetwork({ signal }),
    // Demo data is generated per request; caching it would hide the loading
    // state the UI is meant to show.
    staleTime: 0,
    gcTime: 5 * 60_000,
    retry: 1,
  })
}

export interface NetworkQueryResult {
  dataset: NetworkDataset | undefined
  /** Lookup tables derived once per successful fetch. */
  index: DashboardIndex | undefined
  isPending: boolean
  isError: boolean
  error: Error | null
  refetch: () => void
}

/**
 * Single entry point for the dataset. Components use this hook rather than
 * calling the query directly so the derived index is shared and built once.
 */
export function useNetwork(): NetworkQueryResult {
  const query = useQuery(networkQueryOptions())
  const index = useMemo(
    () => (query.data ? buildIndex(query.data) : undefined),
    [query.data],
  )

  return {
    dataset: query.data,
    index,
    isPending: query.isPending,
    isError: query.isError,
    error: (query.error as Error | null) ?? null,
    refetch: () => {
      void query.refetch()
    },
  }
}