/**
 * =============================================================================
 * Dashboard Component - Global Mortality Observatory
 * =============================================================================
 * Main dashboard view with:
 * - KPI cards showing key metrics
 * - Global trend chart
 * - Top causes breakdown
 * - Signal feed preview
 * - Entity quick-access
 * =============================================================================
 */

import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Globe,
  Users,
  Activity,
  ArrowRight,
  ChevronRight,
  ChevronDown,
  ChevronUp,
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
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import { api, insightsApi } from '@/services/api'
import type { GlobalStats, Entity, Cause, GlobalTrendPoint, Signal } from '@/services/types'
import clsx from 'clsx'

interface DashboardProps {
  stats: GlobalStats | null
  entities: Entity[]
  causes: Cause[]
  loading: boolean
}

const CATEGORY_COLORS: Record<string, string> = {
  'NCD': '#22c55e',
  'Communicable': '#3b82f6',
  'Injury': '#f59e0b',
  'Other': '#6b7280',
}

type TimeRange = '1Y' | '5Y' | 'All'

export function Dashboard({ stats, entities, causes, loading }: DashboardProps) {
  const [globalTrend, setGlobalTrend] = useState<GlobalTrendPoint[]>([])
  const [signals, setSignals] = useState<Signal[]>([])
  const [topEntities, setTopEntities] = useState<Array<{ entity: string; deaths: number }>>([])
  const [timeRange, setTimeRange] = useState<TimeRange>('All')
  const [showAllEntities, setShowAllEntities] = useState(false)

  useEffect(() => {
    async function loadDashboardData() {
      try {
        const [trendData, signalsData] = await Promise.all([
          api.getGlobalTrend(),
          insightsApi.getSignals(5)
        ])
        setGlobalTrend(trendData)
        setSignals(signalsData)
      } catch (err) {
        console.error('Failed to load dashboard data:', err)
      }
    }
    loadDashboardData()
  }, [])

  // Filter trend data based on time range
  const filteredTrend = globalTrend.filter((point) => {
    if (timeRange === 'All') return true
    const latestYear = globalTrend.length > 0 ? Math.max(...globalTrend.map(p => p.year)) : 2019
    if (timeRange === '1Y') return point.year >= latestYear - 1
    if (timeRange === '5Y') return point.year >= latestYear - 5
    return true
  })

  if (!stats) return null

  // Calculate cause category breakdown
  const categoryBreakdown = causes.reduce((acc, cause) => {
    const cat = cause.cause_category
    acc[cat] = (acc[cat] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const pieData = Object.entries(categoryBreakdown).map(([name, value]) => ({
    name,
    value,
    color: CATEGORY_COLORS[name] || '#6b7280'
  }))

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold">Global Mortality Observatory</h1>
          <p className="text-observatory-muted mt-1">
            AI-powered mortality analytics • {stats.year_range[0]}-{stats.year_range[1]}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-observatory-muted">Last updated:</span>
          <span className="text-sm font-medium">Just now</span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Total Deaths Tracked"
          value={formatNumber(stats.total_deaths)}
          icon={Activity}
          trend={{ value: 2.3, direction: 'up' }}
          color="signal"
        />
        <KPICard
          title="Countries & Regions"
          value={stats.entity_count.toString()}
          icon={Globe}
          subtitle="Global coverage"
          color="blue"
        />
        <KPICard
          title="Causes Monitored"
          value={stats.cause_count.toString()}
          icon={Users}
          subtitle="All categories"
          color="purple"
        />
        <KPICard
          title="Active Anomalies"
          value={stats.anomaly_count.toLocaleString()}
          icon={AlertTriangle}
          trend={{ value: 12, direction: 'up' }}
          color="warning"
          alert
        />
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Global trend chart - spans 2 columns */}
        <div className="lg:col-span-2 glass-card p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold">Global Mortality Trend</h2>
            <div className="flex items-center gap-2">
              {(['1Y', '5Y', 'All'] as TimeRange[]).map((range) => (
                <button 
                  key={range}
                  onClick={() => setTimeRange(range)}
                  className={clsx(
                    'btn-secondary text-sm py-1.5',
                    timeRange === range && 'bg-signal-500/10 border-signal-500/30 text-signal-400'
                  )}
                >
                  {range}
                </button>
              ))}
            </div>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={filteredTrend}>
                <defs>
                  <linearGradient id="colorDeaths" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
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
                  tickFormatter={(v) => `${(v / 1000000).toFixed(0)}M`}
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
                  dataKey="total_deaths"
                  stroke="#22c55e"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorDeaths)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Signal feed preview */}
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Latest Signals</h2>
            <Link to="/signals" className="text-signal-400 hover:text-signal-300 text-sm flex items-center gap-1">
              View all <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="space-y-3">
            {signals.length > 0 ? (
              signals.map((signal) => (
                <SignalCard key={signal.id} signal={signal} />
              ))
            ) : (
              <div className="text-center py-8 text-observatory-muted">
                <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No signals detected</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Second row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Category breakdown */}
        <div className="glass-card p-6">
          <h2 className="text-lg font-semibold mb-4">Cause Categories</h2>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1f2937',
                    border: '1px solid #374151',
                    borderRadius: '8px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-2 mt-4">
            {pieData.map((item) => (
              <div key={item.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full flex-shrink-0" 
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-sm text-observatory-muted">{item.name}</span>
                </div>
                <span className="text-sm font-medium tabular-nums">{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Quick entity access */}
        <div className="lg:col-span-2 glass-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Explore Entities</h2>
            {entities.length > 8 && (
              <button
                onClick={() => setShowAllEntities(!showAllEntities)}
                className="text-sm text-signal-400 hover:text-signal-300 flex items-center gap-1 transition-colors"
              >
                {showAllEntities ? 'Show less' : `Show all ${entities.length}`}
                {showAllEntities ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            )}
          </div>
          <div className={clsx(
            "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 transition-all duration-300",
            showAllEntities ? "max-h-[600px] overflow-y-auto" : ""
          )}>
            {(showAllEntities ? entities : entities.slice(0, 8)).map((entity) => (
              <Link
                key={entity.entity}
                to={`/entity/${encodeURIComponent(entity.entity)}`}
                className="p-4 rounded-lg bg-observatory-elevated/50 hover:bg-observatory-elevated 
                         border border-observatory-border/50 hover:border-signal-500/30
                         transition-all duration-200 group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-signal-500/10 flex items-center justify-center
                               group-hover:bg-signal-500/20 transition-colors">
                    <Globe className="w-4 h-4 text-signal-400" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-medium text-sm truncate">{entity.entity}</div>
                    <div className="text-xs text-observatory-muted">{entity.code || 'N/A'}</div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
          {!showAllEntities && entities.length > 8 && (
            <div className="mt-4 text-center">
              <button
                onClick={() => setShowAllEntities(true)}
                className="text-signal-400 hover:text-signal-300 text-sm font-medium 
                         flex items-center gap-2 mx-auto transition-colors"
              >
                <span>+ {entities.length - 8} more entities</span>
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// =============================================================================
// Sub-components
// =============================================================================

interface KPICardProps {
  title: string
  value: string
  icon: React.ComponentType<{ className?: string }>
  trend?: { value: number; direction: 'up' | 'down' }
  subtitle?: string
  color: 'signal' | 'blue' | 'purple' | 'warning'
  alert?: boolean
}

function KPICard({ title, value, icon: Icon, trend, subtitle, color, alert }: KPICardProps) {
  const colorClasses = {
    signal: 'from-signal-500/20 to-signal-600/5 border-signal-500/20',
    blue: 'from-blue-500/20 to-blue-600/5 border-blue-500/20',
    purple: 'from-purple-500/20 to-purple-600/5 border-purple-500/20',
    warning: 'from-amber-500/20 to-amber-600/5 border-amber-500/20',
  }

  const iconColors = {
    signal: 'text-signal-400',
    blue: 'text-blue-400',
    purple: 'text-purple-400',
    warning: 'text-amber-400',
  }

  return (
    <div 
      className={clsx(
        'glass-card p-6 bg-gradient-to-br border',
        colorClasses[color],
        alert && 'animate-glow'
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-observatory-muted">{title}</p>
          <p className="text-2xl font-bold mt-1 font-display">{value}</p>
          {trend && (
            <div className={clsx(
              'flex items-center gap-1 mt-2 text-sm',
              trend.direction === 'up' ? 'text-signal-400' : 'text-severity-critical'
            )}>
              {trend.direction === 'up' ? (
                <TrendingUp className="w-4 h-4" />
              ) : (
                <TrendingDown className="w-4 h-4" />
              )}
              <span>{trend.value}%</span>
            </div>
          )}
          {subtitle && (
            <p className="text-sm text-observatory-muted mt-2">{subtitle}</p>
          )}
        </div>
        <div className={clsx('p-3 rounded-xl bg-observatory-elevated/50', iconColors[color])}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  )
}

function SignalCard({ signal }: { signal: Signal }) {
  const severityClasses = {
    critical: 'severity-critical',
    warning: 'severity-warning',
    info: 'severity-info',
  }

  return (
    <div className="p-3 rounded-lg bg-observatory-elevated/50 border border-observatory-border/50 hover:border-observatory-border transition-colors">
      <div className="flex items-start gap-3">
        <div className={clsx(
          'w-2 h-2 rounded-full mt-2 flex-shrink-0',
          signal.severity === 'critical' && 'bg-severity-critical',
          signal.severity === 'warning' && 'bg-severity-warning',
          signal.severity === 'info' && 'bg-severity-info'
        )} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className={clsx(
              'text-xs px-2 py-0.5 rounded-full border',
              severityClasses[signal.severity]
            )}>
              {signal.severity}
            </span>
            <span className="text-xs text-observatory-muted">{signal.entity}</span>
          </div>
          <p className="text-sm font-medium mt-1 truncate">{signal.title}</p>
          <p className="text-xs text-observatory-muted mt-0.5 line-clamp-2">
            {signal.description}
          </p>
        </div>
      </div>
    </div>
  )
}

// =============================================================================
// Helpers
// =============================================================================

function formatNumber(num: number): string {
  if (num >= 1_000_000_000) {
    return `${(num / 1_000_000_000).toFixed(1)}B`
  }
  if (num >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(1)}M`
  }
  if (num >= 1_000) {
    return `${(num / 1_000).toFixed(1)}K`
  }
  return num.toString()
}
