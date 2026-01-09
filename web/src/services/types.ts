// =============================================================================
// API Response Types
// =============================================================================

export interface GlobalStats {
  total_deaths: number
  year_range: [number, number]
  entity_count: number
  cause_count: number
  anomaly_count: number
}

export interface Entity {
  entity: string
  code: string
}

export interface Cause {
  cause: string
  cause_category: string
}

export interface TimeseriesPoint {
  year: number
  cause: string
  deaths: number
  yoy_change: number | null
  yoy_pct: number | null
  anomaly_score: number | null
  is_anomaly: boolean
}

export interface TopCause {
  cause: string
  cause_category: string
  deaths: number
}

export interface EntityProfile {
  entity: string
  code: string
  summary: {
    year_range: [number, number]
    total_deaths_latest_year: number
    cause_count: number
  }
  top_causes: Array<{ cause: string; deaths: number }>
  trend: Array<{ year: number; deaths: number }>
  recent_anomalies: Array<{
    year: number
    cause: string
    deaths: number
    anomaly_score: number
  }>
}

export interface GlobalTrendPoint {
  year: number
  total_deaths: number
}

export interface CompareResult {
  entity: string
  year: number
  deaths: number
  indexed_value?: number
}

// =============================================================================
// Insights Types
// =============================================================================

export interface Signal {
  id: string
  type: 'anomaly' | 'trend' | 'milestone' | 'comparison'
  severity: 'critical' | 'warning' | 'info'
  title: string
  description: string
  entity: string | null
  cause: string | null
  year: number | null
  value: number | null
  change_pct: number | null
  timestamp: string
}

export interface AnomalyDetail {
  entity: string
  cause: string
  year: number
  deaths: number
  expected_deaths: number
  anomaly_score: number
  severity: string
  explanation: string
  contributing_factors: string[]
  similar_anomalies: Array<{
    entity: string
    year: number
    anomaly_score: number
    deaths: number
  }>
}

export interface TrendInsight {
  entity: string
  cause: string | null
  direction: 'increasing' | 'decreasing' | 'stable'
  change_pct: number
  confidence: number
  period: string
  description: string
}

export interface ForecastResult {
  entity: string
  cause: string
  forecast_years: number[]
  forecast_values: number[]
  lower_bound: number[]
  upper_bound: number[]
  method: string
}

export interface InsightsSummary {
  total_anomalies: number
  critical_count: number
  warning_count: number
  top_increasing_causes: Array<{ cause: string; yoy_pct: number }>
  top_decreasing_causes: Array<{ cause: string; yoy_pct: number }>
  data_year_range?: [number, number]
  entities_analyzed?: number
}

// =============================================================================
// Tableau Types
// =============================================================================

export interface TableauConfig {
  base_url: string
  site_content_url: string
  configured: boolean
}

export interface TableauDashboard {
  id: string
  name: string
  description: string
  embed_path: string
}

export interface EmbedToken {
  token: string
  expires_at: string
  embed_url: string
}
