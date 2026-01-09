/**
 * =============================================================================
 * React Hooks for API Data Fetching
 * =============================================================================
 * Custom hooks for fetching and caching API data with:
 * - Loading states
 * - Error handling
 * - Automatic refetching
 * - Optimistic updates
 * =============================================================================
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { api, insightsApi, tableauApi } from '@/services/api'
import type {
  GlobalStats,
  Entity,
  Cause,
  TimeseriesPoint,
  TopCause,
  EntityProfile,
  GlobalTrendPoint,
  Signal,
  InsightsSummary,
  TableauConfig,
  TableauDashboard,
} from '@/services/types'

// =============================================================================
// Generic fetch hook
// =============================================================================

interface UseFetchResult<T> {
  data: T | null
  loading: boolean
  error: Error | null
  refetch: () => Promise<void>
}

function useFetch<T>(
  fetchFn: () => Promise<T>,
  deps: unknown[] = []
): UseFetchResult<T> {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const mountedRef = useRef(true)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const result = await fetchFn()
      if (mountedRef.current) {
        setData(result)
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err instanceof Error ? err : new Error('Unknown error'))
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false)
      }
    }
  }, deps)

  useEffect(() => {
    mountedRef.current = true
    fetchData()
    return () => {
      mountedRef.current = false
    }
  }, [fetchData])

  return { data, loading, error, refetch: fetchData }
}

// =============================================================================
// Data hooks
// =============================================================================

export function useGlobalStats() {
  return useFetch<GlobalStats>(() => api.getStats())
}

export function useEntities(query?: string) {
  return useFetch<Entity[]>(() => api.getEntities(query), [query])
}

export function useCauses(query?: string, category?: string) {
  return useFetch<Cause[]>(() => api.getCauses(query, category), [query, category])
}

export function useCategories() {
  return useFetch<string[]>(() => api.getCategories())
}

export function useTimeseries(
  entity: string,
  causes: string[],
  yearFrom = 1990,
  yearTo = 2019
) {
  return useFetch<TimeseriesPoint[]>(
    () => api.getTimeseries(entity, causes, yearFrom, yearTo),
    [entity, causes.join(','), yearFrom, yearTo]
  )
}

export function useTopCauses(entity: string, year: number, topN = 10) {
  return useFetch<TopCause[]>(
    () => api.getTopCauses(entity, year, topN),
    [entity, year, topN]
  )
}

export function useGlobalTrend(cause?: string, category?: string) {
  return useFetch<GlobalTrendPoint[]>(
    () => api.getGlobalTrend(cause, category),
    [cause, category]
  )
}

export function useEntityProfile(entity: string) {
  return useFetch<EntityProfile>(
    () => api.getEntityProfile(entity),
    [entity]
  )
}

// =============================================================================
// Insights hooks
// =============================================================================

export function useSignals(limit = 20, severity?: string, entity?: string) {
  return useFetch<Signal[]>(
    () => insightsApi.getSignals(limit, severity, entity),
    [limit, severity, entity]
  )
}

export function useInsightsSummary(entity?: string) {
  return useFetch<InsightsSummary>(
    () => insightsApi.getSummary(entity),
    [entity]
  )
}

// =============================================================================
// Tableau hooks
// =============================================================================

export function useTableauConfig() {
  return useFetch<TableauConfig>(() => tableauApi.getConfig())
}

export function useTableauDashboards() {
  return useFetch<TableauDashboard[]>(() => tableauApi.getDashboards())
}

// =============================================================================
// Debounced search hook
// =============================================================================

export function useDebouncedValue<T>(value: T, delay = 300): T {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(timer)
    }
  }, [value, delay])

  return debouncedValue
}

// =============================================================================
// Local storage hook
// =============================================================================

export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((prev: T) => T)) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key)
      return item ? JSON.parse(item) : initialValue
    } catch {
      return initialValue
    }
  })

  const setValue = (value: T | ((prev: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value
      setStoredValue(valueToStore)
      window.localStorage.setItem(key, JSON.stringify(valueToStore))
    } catch (error) {
      console.error('Error saving to localStorage:', error)
    }
  }

  return [storedValue, setValue]
}

// =============================================================================
// Favorites hook
// =============================================================================

interface Favorite {
  type: 'entity' | 'cause' | 'dashboard'
  id: string
  name: string
  addedAt: string
}

export function useFavorites() {
  const [favorites, setFavorites] = useLocalStorage<Favorite[]>('mortality-signals-favorites', [])

  const addFavorite = (type: Favorite['type'], id: string, name: string) => {
    setFavorites((prev) => {
      if (prev.some((f) => f.type === type && f.id === id)) {
        return prev
      }
      return [...prev, { type, id, name, addedAt: new Date().toISOString() }]
    })
  }

  const removeFavorite = (type: Favorite['type'], id: string) => {
    setFavorites((prev) => prev.filter((f) => !(f.type === type && f.id === id)))
  }

  const isFavorite = (type: Favorite['type'], id: string) => {
    return favorites.some((f) => f.type === type && f.id === id)
  }

  return { favorites, addFavorite, removeFavorite, isFavorite }
}

// =============================================================================
// Recent views hook
// =============================================================================

interface RecentView {
  type: 'entity' | 'dashboard'
  id: string
  name: string
  viewedAt: string
}

export function useRecentViews(maxItems = 10) {
  const [recentViews, setRecentViews] = useLocalStorage<RecentView[]>('mortality-signals-recent', [])

  const addRecentView = (type: RecentView['type'], id: string, name: string) => {
    setRecentViews((prev) => {
      const filtered = prev.filter((v) => !(v.type === type && v.id === id))
      return [
        { type, id, name, viewedAt: new Date().toISOString() },
        ...filtered,
      ].slice(0, maxItems)
    })
  }

  return { recentViews, addRecentView }
}
