/**
 * =============================================================================
 * Entity Profile Component - Deep Dive Analysis
 * =============================================================================
 * Detailed analysis view for a single entity (country/region):
 * - Summary statistics
 * - Top causes breakdown
 * - Historical trend
 * - Anomaly timeline
 * - Forecast projections
 * =============================================================================
 */

import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Calendar,
  Activity,
  ChevronRight,
} from 'lucide-react'
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { api, insightsApi } from '@/services/api'
import type { 
  Entity, 
  Cause, 
  EntityProfile as EntityProfileType,
  TrendInsight,
  ForecastResult 
} from '@/services/types'
import clsx from 'clsx'

interface EntityProfileProps {
  entities: Entity[]
  causes: Cause[]
}

export function EntityProfile({ entities, causes }: EntityProfileProps) {
  const { entityName } = useParams<{ entityName: string }>()
  const [profile, setProfile] = useState<EntityProfileType | null>(null)
  const [trends, setTrends] = useState<TrendInsight[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedCause, setSelectedCause] = useState<string | null>(null)
  const [forecast, setForecast] = useState<ForecastResult | null>(null)

  const decodedEntity = entityName ? decodeURIComponent(entityName) : ''

  useEffect(() => {
    async function loadProfile() {
      if (!decodedEntity) return
      
      try {
        setLoading(true)
        setError(null)
        
        const [profileData, trendsData] = await Promise.all([
          api.getEntityProfile(decodedEntity),
          insightsApi.getTrends(decodedEntity, 10, 10)
        ])
        
        setProfile(profileData)
        setTrends(trendsData)
        
        // Set default selected cause
        if (profileData.top_causes.length > 0) {
          setSelectedCause(profileData.top_causes[0].cause)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load entity profile')
      } finally {
        setLoading(false)
      }
    }
    
    loadProfile()
  }, [decodedEntity])

  // Load forecast when cause is selected
  useEffect(() => {
    async function loadForecast() {
      if (!decodedEntity || !selectedCause) return
      
      try {
        const forecastData = await insightsApi.getForecast(decodedEntity, selectedCause, 5)
        setForecast(forecastData)
      } catch (err) {
        // Forecast might not be available for all cause/entity combinations
        setForecast(null)
      }
    }
    
    loadForecast()
  }, [decodedEntity, selectedCause])

  if (loading) {
    return <LoadingSkeleton />
  }

  if (error || !profile) {
    return (
      <div className="glass-card p-8 text-center">
        <AlertTriangle className="w-12 h-12 text-severity-warning mx-auto mb-4" />
        <h2 className="text-xl font-semibold mb-2">Entity Not Found</h2>
        <p className="text-observatory-muted mb-4">{error || 'Unable to load entity data'}</p>
        <Link to="/" className="btn-primary inline-flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" />
          Back to Observatory
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb & header */}
      <div>
        <Link 
          to="/" 
          className="inline-flex items-center gap-2 text-observatory-muted hover:text-observatory-text mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Observatory
        </Link>
        
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold">{profile.entity}</h1>
            <p className="text-observatory-muted mt-1">
              Code: {profile.code || 'N/A'} • {profile.summary.year_range[0]}-{profile.summary.year_range[1]}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link 
              to={`/compare?entities=${encodeURIComponent(profile.entity)}`}
              className="btn-secondary"
            >
              Compare with others
            </Link>
          </div>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-card p-6">
          <p className="text-sm text-observatory-muted">Latest Year Deaths</p>
          <p className="text-2xl font-bold mt-1">
            {profile.summary.total_deaths_latest_year.toLocaleString()}
          </p>
          <p className="text-sm text-observatory-muted mt-2">
            in {profile.summary.year_range[1]}
          </p>
        </div>
        
        <div className="glass-card p-6">
          <p className="text-sm text-observatory-muted">Causes Tracked</p>
          <p className="text-2xl font-bold mt-1">{profile.summary.cause_count}</p>
          <p className="text-sm text-observatory-muted mt-2">
            across all categories
          </p>
        </div>
        
        <div className="glass-card p-6">
          <p className="text-sm text-observatory-muted">Recent Anomalies</p>
          <p className="text-2xl font-bold mt-1 text-severity-warning">
            {profile.recent_anomalies.length}
          </p>
          <p className="text-sm text-observatory-muted mt-2">
            unusual patterns detected
          </p>
        </div>
      </div>

      {/* Main content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Historical trend */}
        <div className="lg:col-span-2 glass-card p-6">
          <h2 className="text-lg font-semibold mb-4">Historical Mortality Trend</h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={profile.trend}>
                <defs>
                  <linearGradient id="colorEntityDeaths" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.5} />
                <XAxis 
                  dataKey="year" 
                  stroke="#6b7280" 
                  tick={{ fill: '#6b7280', fontSize: 12 }}
                />
                <YAxis 
                  stroke="#6b7280" 
                  tick={{ fill: '#6b7280', fontSize: 12 }}
                  tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1f2937',
                    border: '1px solid #374151',
                    borderRadius: '8px',
                  }}
                  labelStyle={{ color: '#f9fafb' }}
                  formatter={(value: number) => [value.toLocaleString(), 'Deaths']}
                />
                <Area
                  type="monotone"
                  dataKey="deaths"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorEntityDeaths)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top causes */}
        <div className="glass-card p-6">
          <h2 className="text-lg font-semibold mb-4">Top Causes of Death</h2>
          <div className="space-y-3">
            {profile.top_causes.map((cause, index) => (
              <button
                key={cause.cause}
                onClick={() => setSelectedCause(cause.cause)}
                className={clsx(
                  'w-full p-3 rounded-lg text-left transition-all',
                  selectedCause === cause.cause
                    ? 'bg-signal-500/10 border border-signal-500/30'
                    : 'bg-observatory-elevated/50 hover:bg-observatory-elevated border border-transparent'
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium truncate flex-1">{cause.cause}</span>
                  <ChevronRight className={clsx(
                    'w-4 h-4 text-observatory-muted transition-transform',
                    selectedCause === cause.cause && 'rotate-90'
                  )} />
                </div>
                <div className="mt-2">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-observatory-muted">Deaths</span>
                    <span className="font-medium">{cause.deaths.toLocaleString()}</span>
                  </div>
                  <div className="w-full h-1.5 bg-observatory-border rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-signal-500 rounded-full"
                      style={{ 
                        width: `${(cause.deaths / profile.top_causes[0].deaths) * 100}%` 
                      }}
                    />
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Forecast section */}
      {forecast && (
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold">Mortality Forecast</h2>
              <p className="text-sm text-observatory-muted">
                {selectedCause} • Linear projection
              </p>
            </div>
            <span className="text-xs text-observatory-muted bg-observatory-elevated px-2 py-1 rounded">
              {forecast.method.replace('_', ' ')}
            </span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart 
                data={forecast.forecast_years.map((year, i) => ({
                  year,
                  forecast: forecast.forecast_values[i],
                  lower: forecast.lower_bound[i],
                  upper: forecast.upper_bound[i]
                }))}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.5} />
                <XAxis 
                  dataKey="year" 
                  stroke="#6b7280" 
                  tick={{ fill: '#6b7280', fontSize: 12 }}
                />
                <YAxis 
                  stroke="#6b7280" 
                  tick={{ fill: '#6b7280', fontSize: 12 }}
                  tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1f2937',
                    border: '1px solid #374151',
                    borderRadius: '8px',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="upper"
                  stroke="none"
                  fill="#22c55e"
                  fillOpacity={0.1}
                />
                <Area
                  type="monotone"
                  dataKey="lower"
                  stroke="none"
                  fill="#0a0f1a"
                  fillOpacity={1}
                />
                <Line
                  type="monotone"
                  dataKey="forecast"
                  stroke="#22c55e"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={{ fill: '#22c55e', strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Anomalies table */}
      {profile.recent_anomalies.length > 0 && (
        <div className="glass-card p-6">
          <h2 className="text-lg font-semibold mb-4">Recent Anomalies</h2>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Year</th>
                  <th>Cause</th>
                  <th>Deaths</th>
                  <th>Anomaly Score</th>
                  <th>Severity</th>
                </tr>
              </thead>
              <tbody>
                {profile.recent_anomalies.map((anomaly, i) => {
                  const severity = Math.abs(anomaly.anomaly_score) >= 4 
                    ? 'critical' 
                    : Math.abs(anomaly.anomaly_score) >= 3 
                      ? 'warning' 
                      : 'info'
                  return (
                    <tr key={i}>
                      <td className="font-medium">{anomaly.year}</td>
                      <td>{anomaly.cause}</td>
                      <td>{anomaly.deaths.toLocaleString()}</td>
                      <td>
                        <span className={clsx(
                          'font-mono',
                          anomaly.anomaly_score > 0 ? 'text-severity-critical' : 'text-severity-info'
                        )}>
                          {anomaly.anomaly_score > 0 ? '+' : ''}{anomaly.anomaly_score.toFixed(2)}
                        </span>
                      </td>
                      <td>
                        <span className={clsx(
                          'text-xs px-2 py-1 rounded-full border',
                          severity === 'critical' && 'severity-critical',
                          severity === 'warning' && 'severity-warning',
                          severity === 'info' && 'severity-info'
                        )}>
                          {severity}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Trend insights */}
      {trends.length > 0 && (
        <div className="glass-card p-6">
          <h2 className="text-lg font-semibold mb-4">Trend Insights</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {trends.slice(0, 6).map((trend, i) => (
              <div 
                key={i}
                className="p-4 rounded-lg bg-observatory-elevated/50 border border-observatory-border/50"
              >
                <div className="flex items-center gap-2 mb-2">
                  {trend.direction === 'increasing' ? (
                    <TrendingUp className="w-4 h-4 text-severity-critical" />
                  ) : (
                    <TrendingDown className="w-4 h-4 text-signal-400" />
                  )}
                  <span className={clsx(
                    'text-sm font-medium',
                    trend.direction === 'increasing' ? 'text-severity-critical' : 'text-signal-400'
                  )}>
                    {trend.change_pct > 0 ? '+' : ''}{trend.change_pct.toFixed(1)}%
                  </span>
                </div>
                <p className="text-sm font-medium truncate">{trend.cause}</p>
                <p className="text-xs text-observatory-muted mt-1">{trend.period}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="skeleton h-8 w-48" />
      <div className="skeleton h-6 w-64" />
      
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="glass-card p-6">
            <div className="skeleton h-4 w-24 mb-3" />
            <div className="skeleton h-8 w-32" />
          </div>
        ))}
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 glass-card p-6">
          <div className="skeleton h-80 w-full" />
        </div>
        <div className="glass-card p-6">
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="skeleton h-16 w-full" />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
