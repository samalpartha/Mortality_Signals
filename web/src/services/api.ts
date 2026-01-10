/**
 * =============================================================================
 * API Service Layer
 * =============================================================================
 * Handles all communication with the backend API.
 * Security: No credentials stored client-side. All auth handled server-side.
 * =============================================================================
 */

import type {
  GlobalStats,
  Entity,
  Cause,
  TimeseriesPoint,
  TopCause,
  EntityProfile,
  GlobalTrendPoint,
  CompareResult,
  Signal,
  AnomalyDetail,
  TrendInsight,
  ForecastResult,
  InsightsSummary,
  TableauConfig,
  TableauDashboard,
} from './types'

const API_BASE = import.meta.env.VITE_API_BASE_URL || ''

// =============================================================================
// Error Handling
// =============================================================================

class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public detail?: string
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}))
    throw new ApiError(
      errorBody.detail || response.statusText,
      response.status,
      errorBody.detail
    )
  }
  return response.json()
}

// =============================================================================
// Data Endpoints
// =============================================================================

export const api = {
  // Health check
  async health(): Promise<{ status: string; data_loaded: boolean }> {
    const res = await fetch(`${API_BASE}/health`)
    return handleResponse(res)
  },

  // Global statistics
  async getStats(): Promise<GlobalStats> {
    const res = await fetch(`${API_BASE}/api/data/global-stats`)
    return handleResponse(res)
  },

  // Entities
  async getEntities(query?: string, limit = 100): Promise<Entity[]> {
    const params = new URLSearchParams()
    if (query) params.set('q', query)
    params.set('limit', String(limit))
    const res = await fetch(`${API_BASE}/api/data/entities?${params}`)
    return handleResponse(res)
  },

  // Causes
  async getCauses(query?: string, category?: string): Promise<Cause[]> {
    const params = new URLSearchParams()
    if (query) params.set('q', query)
    if (category) params.set('category', category)
    const res = await fetch(`${API_BASE}/api/data/causes?${params}`)
    return handleResponse(res)
  },

  // Categories
  async getCategories(): Promise<string[]> {
    const res = await fetch(`${API_BASE}/api/data/categories`)
    return handleResponse(res)
  },

  // Time series data
  async getTimeseries(
    entity: string,
    causes: string[],
    yearFrom = 1990,
    yearTo = 2019
  ): Promise<TimeseriesPoint[]> {
    const params = new URLSearchParams()
    params.set('entity', entity)
    causes.forEach((c) => params.append('causes', c))
    params.set('year_from', String(yearFrom))
    params.set('year_to', String(yearTo))
    const res = await fetch(`${API_BASE}/api/data/timeseries?${params}`)
    return handleResponse(res)
  },

  // Top causes for an entity
  async getTopCauses(entity: string, year: number, topN = 10): Promise<TopCause[]> {
    const params = new URLSearchParams({
      entity,
      year: String(year),
      top_n: String(topN),
    })
    const res = await fetch(`${API_BASE}/api/data/top-causes?${params}`)
    return handleResponse(res)
  },

  // Global trend
  async getGlobalTrend(cause?: string, category?: string): Promise<GlobalTrendPoint[]> {
    const params = new URLSearchParams()
    if (cause) params.set('cause', cause)
    if (category) params.set('category', category)
    const res = await fetch(`${API_BASE}/api/data/global-trend?${params}`)
    return handleResponse(res)
  },

  // Entity profile
  async getEntityProfile(entity: string): Promise<EntityProfile> {
    const params = new URLSearchParams({ entity })
    const res = await fetch(`${API_BASE}/api/data/entity-profile?${params}`)
    return handleResponse(res)
  },

  // Compare entities
  async compareEntities(
    entities: string[],
    cause?: string,
    yearFrom = 1990,
    yearTo = 2019,
    indexed = true
  ): Promise<CompareResult[]> {
    const params = new URLSearchParams()
    entities.forEach((e) => params.append('entities', e))
    if (cause) params.set('cause', cause)
    params.set('year_from', String(yearFrom))
    params.set('year_to', String(yearTo))
    params.set('indexed', String(indexed))
    const res = await fetch(`${API_BASE}/api/data/compare?${params}`)
    return handleResponse(res)
  },
}

// =============================================================================
// Insights Endpoints
// =============================================================================

export const insightsApi = {
  // Get signals for the feed
  async getSignals(
    limit = 20,
    severity?: string,
    entity?: string
  ): Promise<Signal[]> {
    const params = new URLSearchParams({ limit: String(limit) })
    if (severity) params.set('severity', severity)
    if (entity) params.set('entity', entity)
    const res = await fetch(`${API_BASE}/api/insights/signals?${params}`)
    return handleResponse(res)
  },

  // Get anomaly detail
  async getAnomalyDetail(
    entity: string,
    cause: string,
    year: number
  ): Promise<AnomalyDetail> {
    const res = await fetch(
      `${API_BASE}/api/insights/anomaly/${encodeURIComponent(entity)}/${encodeURIComponent(cause)}/${year}`
    )
    return handleResponse(res)
  },

  // Get trend insights
  async getTrends(
    entity?: string,
    years = 10,
    limit = 10
  ): Promise<TrendInsight[]> {
    const params = new URLSearchParams({
      years: String(years),
      limit: String(limit),
    })
    if (entity) params.set('entity', entity)
    const res = await fetch(`${API_BASE}/api/insights/trends?${params}`)
    return handleResponse(res)
  },

  // Get forecast
  async getForecast(
    entity: string,
    cause: string,
    horizon = 5
  ): Promise<ForecastResult> {
    const params = new URLSearchParams({
      entity,
      cause,
      horizon: String(horizon),
    })
    const res = await fetch(`${API_BASE}/api/insights/forecast?${params}`)
    return handleResponse(res)
  },

  // Get insights summary
  async getSummary(entity?: string): Promise<InsightsSummary> {
    const params = new URLSearchParams()
    if (entity) params.set('entity', entity)
    const res = await fetch(`${API_BASE}/api/insights/summary?${params}`)
    return handleResponse(res)
  },

  // Compare entities insights
  async compareEntities(entities: string[], cause?: string) {
    const params = new URLSearchParams()
    entities.forEach((e) => params.append('entities', e))
    if (cause) params.set('cause', cause)
    const res = await fetch(`${API_BASE}/api/insights/compare-entities?${params}`)
    return handleResponse(res)
  },
}

// =============================================================================
// Tableau Endpoints (Server-side auth - no secrets exposed)
// =============================================================================

export const tableauApi = {
  // Get public config
  async getConfig(): Promise<TableauConfig> {
    const res = await fetch(`${API_BASE}/api/tableau/config`)
    return handleResponse(res)
  },

  // List available dashboards
  async getDashboards(): Promise<TableauDashboard[]> {
    const res = await fetch(`${API_BASE}/api/tableau/dashboards`)
    return handleResponse(res)
  },

  // Get embed URL for a dashboard
  async getEmbedUrl(
    dashboardId: string,
    entity?: string,
    cause?: string,
    year?: number
  ): Promise<{ embed_url: string }> {
    const params = new URLSearchParams({ dashboard_id: dashboardId })
    if (entity) params.set('entity', entity)
    if (cause) params.set('cause', cause)
    if (year) params.set('year', String(year))
    const res = await fetch(`${API_BASE}/api/tableau/embed-url?${params}`)
    return handleResponse(res)
  },

  // Health check for Tableau integration
  async health(): Promise<{
    status: string
    configured: boolean
    issues: string[] | null
  }> {
    const res = await fetch(`${API_BASE}/api/tableau/health`)
    return handleResponse(res)
  },
}
