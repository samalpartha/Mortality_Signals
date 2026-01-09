/**
 * =============================================================================
 * Signal Feed Component - Mortality Alerts & Insights
 * =============================================================================
 * Real-time feed of mortality signals including:
 * - Anomaly alerts
 * - Trend changes
 * - Comparative insights
 * - Filterable by severity and entity
 * =============================================================================
 */

import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Activity,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Filter,
  RefreshCw,
  ChevronRight,
  ExternalLink,
  Clock,
} from 'lucide-react'
import { insightsApi } from '@/services/api'
import type { Signal, InsightsSummary, AnomalyDetail } from '@/services/types'
import clsx from 'clsx'

export function SignalFeed() {
  const [signals, setSignals] = useState<Signal[]>([])
  const [summary, setSummary] = useState<InsightsSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedSeverity, setSelectedSeverity] = useState<string | null>(null)
  const [selectedSignal, setSelectedSignal] = useState<Signal | null>(null)
  const [anomalyDetail, setAnomalyDetail] = useState<AnomalyDetail | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const loadData = async () => {
    try {
      setLoading(true)
      const [signalsData, summaryData] = await Promise.all([
        insightsApi.getSignals(50, selectedSeverity || undefined),
        insightsApi.getSummary()
      ])
      setSignals(signalsData)
      setSummary(summaryData)
    } catch (err) {
      console.error('Failed to load signals:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [selectedSeverity])

  const handleRefresh = async () => {
    setRefreshing(true)
    await loadData()
    setRefreshing(false)
  }

  const handleSignalClick = async (signal: Signal) => {
    setSelectedSignal(signal)
    
    if (signal.type === 'anomaly' && signal.entity && signal.cause && signal.year) {
      try {
        const detail = await insightsApi.getAnomalyDetail(
          signal.entity,
          signal.cause,
          signal.year
        )
        setAnomalyDetail(detail)
      } catch (err) {
        console.error('Failed to load anomaly detail:', err)
        setAnomalyDetail(null)
      }
    } else {
      setAnomalyDetail(null)
    }
  }

  const severityCounts = {
    critical: signals.filter(s => s.severity === 'critical').length,
    warning: signals.filter(s => s.severity === 'warning').length,
    info: signals.filter(s => s.severity === 'info').length,
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold flex items-center gap-3">
            <Activity className="w-7 h-7 text-signal-400" />
            Signal Feed
          </h1>
          <p className="text-observatory-muted mt-1">
            AI-detected mortality anomalies and insights
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="btn-secondary flex items-center gap-2"
        >
          <RefreshCw className={clsx('w-4 h-4', refreshing && 'animate-spin')} />
          Refresh
        </button>
      </div>

      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <SummaryCard
            title="Total Anomalies"
            value={summary.total_anomalies}
            icon={AlertTriangle}
            color="amber"
          />
          <SummaryCard
            title="Critical"
            value={summary.critical_count}
            icon={AlertTriangle}
            color="red"
            onClick={() => setSelectedSeverity(selectedSeverity === 'critical' ? null : 'critical')}
            active={selectedSeverity === 'critical'}
          />
          <SummaryCard
            title="Warning"
            value={summary.warning_count}
            icon={TrendingUp}
            color="amber"
            onClick={() => setSelectedSeverity(selectedSeverity === 'warning' ? null : 'warning')}
            active={selectedSeverity === 'warning'}
          />
          <SummaryCard
            title="Entities Analyzed"
            value={summary.entities_analyzed || 0}
            icon={Activity}
            color="blue"
          />
        </div>
      )}

      {/* Main content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Signal list */}
        <div className="lg:col-span-2 space-y-4">
          {/* Filters */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-observatory-muted" />
            <span className="text-sm text-observatory-muted">Filter:</span>
            {['all', 'critical', 'warning', 'info'].map((sev) => (
              <button
                key={sev}
                onClick={() => setSelectedSeverity(sev === 'all' ? null : sev)}
                className={clsx(
                  'px-3 py-1 rounded-full text-xs font-medium transition-colors',
                  (sev === 'all' && !selectedSeverity) || selectedSeverity === sev
                    ? 'bg-signal-500/20 text-signal-400'
                    : 'bg-observatory-elevated text-observatory-muted hover:text-observatory-text'
                )}
              >
                {sev === 'all' ? 'All' : sev.charAt(0).toUpperCase() + sev.slice(1)}
                {sev !== 'all' && (
                  <span className="ml-1">({severityCounts[sev as keyof typeof severityCounts]})</span>
                )}
              </button>
            ))}
          </div>

          {/* Signal list */}
          {loading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="glass-card p-4 animate-pulse">
                  <div className="skeleton h-4 w-24 mb-2" />
                  <div className="skeleton h-6 w-3/4 mb-2" />
                  <div className="skeleton h-4 w-full" />
                </div>
              ))}
            </div>
          ) : signals.length === 0 ? (
            <div className="glass-card p-12 text-center">
              <Activity className="w-12 h-12 text-observatory-muted mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No Signals Found</h3>
              <p className="text-observatory-muted">
                {selectedSeverity 
                  ? `No ${selectedSeverity} signals detected. Try changing the filter.`
                  : 'No mortality anomalies have been detected.'
                }
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {signals.map((signal) => (
                <SignalCard
                  key={signal.id}
                  signal={signal}
                  selected={selectedSignal?.id === signal.id}
                  onClick={() => handleSignalClick(signal)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Detail panel */}
        <div className="glass-card p-6 h-fit sticky top-24">
          {selectedSignal ? (
            <SignalDetailPanel 
              signal={selectedSignal} 
              anomalyDetail={anomalyDetail}
            />
          ) : (
            <div className="text-center py-8">
              <Activity className="w-10 h-10 text-observatory-muted mx-auto mb-3" />
              <p className="text-observatory-muted">
                Select a signal to view details
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Trend insights */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Increasing causes */}
          {summary.top_increasing_causes && summary.top_increasing_causes.length > 0 && (
            <div className="glass-card p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-severity-critical" />
                Increasing Causes
              </h3>
              <div className="space-y-3">
                {summary.top_increasing_causes.slice(0, 5).map((item, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className="text-sm truncate flex-1">{item.cause}</span>
                    <span className="text-sm font-medium text-severity-critical">
                      +{item.yoy_pct?.toFixed(1)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Decreasing causes */}
          {summary.top_decreasing_causes && summary.top_decreasing_causes.length > 0 && (
            <div className="glass-card p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <TrendingDown className="w-5 h-5 text-signal-400" />
                Decreasing Causes
              </h3>
              <div className="space-y-3">
                {summary.top_decreasing_causes.slice(0, 5).map((item, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className="text-sm truncate flex-1">{item.cause}</span>
                    <span className="text-sm font-medium text-signal-400">
                      {item.yoy_pct?.toFixed(1)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// =============================================================================
// Sub-components
// =============================================================================

interface SummaryCardProps {
  title: string
  value: number
  icon: React.ComponentType<{ className?: string }>
  color: 'red' | 'amber' | 'blue' | 'green'
  onClick?: () => void
  active?: boolean
}

function SummaryCard({ title, value, icon: Icon, color, onClick, active }: SummaryCardProps) {
  const colorClasses = {
    red: 'from-red-500/20 to-red-600/5',
    amber: 'from-amber-500/20 to-amber-600/5',
    blue: 'from-blue-500/20 to-blue-600/5',
    green: 'from-green-500/20 to-green-600/5',
  }

  const iconColors = {
    red: 'text-red-400',
    amber: 'text-amber-400',
    blue: 'text-blue-400',
    green: 'text-green-400',
  }

  return (
    <div 
      onClick={onClick}
      className={clsx(
        'glass-card p-5 bg-gradient-to-br',
        colorClasses[color],
        onClick && 'cursor-pointer hover:scale-[1.02] transition-transform',
        active && 'ring-2 ring-signal-500'
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-observatory-muted">{title}</p>
          <p className="text-2xl font-bold mt-1">{value.toLocaleString()}</p>
        </div>
        <Icon className={clsx('w-5 h-5', iconColors[color])} />
      </div>
    </div>
  )
}

interface SignalCardProps {
  signal: Signal
  selected: boolean
  onClick: () => void
}

function SignalCard({ signal, selected, onClick }: SignalCardProps) {
  return (
    <div 
      onClick={onClick}
      className={clsx(
        'glass-card p-4 cursor-pointer transition-all',
        'hover:border-signal-500/30',
        selected && 'border-signal-500/50 bg-signal-500/5'
      )}
    >
      <div className="flex items-start gap-4">
        <div className={clsx(
          'w-3 h-3 rounded-full mt-1.5 flex-shrink-0',
          signal.severity === 'critical' && 'bg-severity-critical animate-pulse',
          signal.severity === 'warning' && 'bg-severity-warning',
          signal.severity === 'info' && 'bg-severity-info'
        )} />
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={clsx(
              'text-xs px-2 py-0.5 rounded-full border',
              signal.severity === 'critical' && 'severity-critical',
              signal.severity === 'warning' && 'severity-warning',
              signal.severity === 'info' && 'severity-info'
            )}>
              {signal.severity}
            </span>
            <span className="text-xs text-observatory-muted">{signal.type}</span>
            {signal.entity && (
              <span className="text-xs text-observatory-muted">• {signal.entity}</span>
            )}
          </div>
          
          <h4 className="font-medium">{signal.title}</h4>
          <p className="text-sm text-observatory-muted mt-1 line-clamp-2">
            {signal.description}
          </p>
          
          <div className="flex items-center gap-4 mt-2 text-xs text-observatory-muted">
            {signal.year && (
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {signal.year}
              </span>
            )}
            {signal.change_pct !== null && (
              <span className={clsx(
                'font-medium',
                signal.change_pct > 0 ? 'text-severity-critical' : 'text-signal-400'
              )}>
                {signal.change_pct > 0 ? '+' : ''}{signal.change_pct.toFixed(1)}% YoY
              </span>
            )}
          </div>
        </div>
        
        <ChevronRight className={clsx(
          'w-5 h-5 text-observatory-muted transition-transform',
          selected && 'rotate-90'
        )} />
      </div>
    </div>
  )
}

interface SignalDetailPanelProps {
  signal: Signal
  anomalyDetail: AnomalyDetail | null
}

function SignalDetailPanel({ signal, anomalyDetail }: SignalDetailPanelProps) {
  return (
    <div className="space-y-6">
      <div>
        <span className={clsx(
          'text-xs px-2 py-1 rounded-full border',
          signal.severity === 'critical' && 'severity-critical',
          signal.severity === 'warning' && 'severity-warning',
          signal.severity === 'info' && 'severity-info'
        )}>
          {signal.severity.toUpperCase()}
        </span>
        <h3 className="text-lg font-semibold mt-3">{signal.title}</h3>
        <p className="text-sm text-observatory-muted mt-2">{signal.description}</p>
      </div>

      {anomalyDetail && (
        <>
          <div>
            <h4 className="text-sm font-medium text-observatory-muted mb-2">Explanation</h4>
            <p className="text-sm">{anomalyDetail.explanation}</p>
          </div>

          <div>
            <h4 className="text-sm font-medium text-observatory-muted mb-2">Statistics</h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-observatory-elevated/50">
                <p className="text-xs text-observatory-muted">Actual Deaths</p>
                <p className="text-lg font-semibold">{anomalyDetail.deaths.toLocaleString()}</p>
              </div>
              <div className="p-3 rounded-lg bg-observatory-elevated/50">
                <p className="text-xs text-observatory-muted">Expected</p>
                <p className="text-lg font-semibold">{Math.round(anomalyDetail.expected_deaths).toLocaleString()}</p>
              </div>
              <div className="p-3 rounded-lg bg-observatory-elevated/50">
                <p className="text-xs text-observatory-muted">Anomaly Score</p>
                <p className={clsx(
                  'text-lg font-semibold font-mono',
                  anomalyDetail.anomaly_score > 0 ? 'text-severity-critical' : 'text-severity-info'
                )}>
                  {anomalyDetail.anomaly_score > 0 ? '+' : ''}{anomalyDetail.anomaly_score.toFixed(2)}σ
                </p>
              </div>
              <div className="p-3 rounded-lg bg-observatory-elevated/50">
                <p className="text-xs text-observatory-muted">Deviation</p>
                <p className="text-lg font-semibold">
                  {((anomalyDetail.deaths - anomalyDetail.expected_deaths) / anomalyDetail.expected_deaths * 100).toFixed(1)}%
                </p>
              </div>
            </div>
          </div>

          {anomalyDetail.contributing_factors.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-observatory-muted mb-2">Contributing Factors</h4>
              <ul className="space-y-1">
                {anomalyDetail.contributing_factors.map((factor, i) => (
                  <li key={i} className="text-sm flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-signal-500 mt-2 flex-shrink-0" />
                    {factor}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {anomalyDetail.similar_anomalies.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-observatory-muted mb-2">Similar Anomalies</h4>
              <div className="space-y-2">
                {anomalyDetail.similar_anomalies.map((similar, i) => (
                  <div 
                    key={i}
                    className="flex items-center justify-between p-2 rounded-lg bg-observatory-elevated/50 text-sm"
                  >
                    <span>{similar.entity} ({similar.year})</span>
                    <span className="font-mono text-observatory-muted">
                      {similar.anomaly_score > 0 ? '+' : ''}{similar.anomaly_score.toFixed(1)}σ
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {signal.entity && (
        <Link
          to={`/entity/${encodeURIComponent(signal.entity)}`}
          className="btn-primary w-full flex items-center justify-center gap-2"
        >
          View Entity Profile
          <ExternalLink className="w-4 h-4" />
        </Link>
      )}
    </div>
  )
}
