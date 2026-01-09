/**
 * =============================================================================
 * Comparison Component - Multi-Entity Analysis
 * =============================================================================
 * Compare mortality trends across multiple entities:
 * - Entity selection
 * - Indexed/absolute comparison
 * - Cause filtering
 * - Comparative insights
 * =============================================================================
 */

import React, { useState, useEffect, useMemo, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useSearchParams } from 'react-router-dom'
import {
  Plus,
  X,
  GitCompare,
  TrendingUp,
  Search,
} from 'lucide-react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { api, insightsApi } from '@/services/api'
import type { Entity, Cause, CompareResult } from '@/services/types'
import clsx from 'clsx'

interface ComparisonProps {
  entities: Entity[]
  causes: Cause[]
}

const COMPARISON_COLORS = [
  '#22c55e', // green
  '#3b82f6', // blue
  '#f59e0b', // amber
  '#ec4899', // pink
  '#8b5cf6', // purple
  '#06b6d4', // cyan
]

export function Comparison({ entities, causes }: ComparisonProps) {
  const [searchParams, setSearchParams] = useSearchParams()
  const [selectedEntities, setSelectedEntities] = useState<string[]>([])
  const [selectedCause, setSelectedCause] = useState<string | null>(null)
  const [indexed, setIndexed] = useState(true)
  const [comparisonData, setComparisonData] = useState<CompareResult[]>([])
  const [insights, setInsights] = useState<{ insights: string[]; entity_stats: any[] } | null>(null)
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [showEntityPicker, setShowEntityPicker] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const portalRef = useRef<HTMLDivElement>(null)

  // Initialize from URL params
  useEffect(() => {
    const entitiesParam = searchParams.get('entities')
    if (entitiesParam) {
      setSelectedEntities(entitiesParam.split(',').map(e => decodeURIComponent(e)))
    }
  }, [])

  // Load comparison data when entities change
  useEffect(() => {
    async function loadComparison() {
      if (selectedEntities.length < 2) {
        setComparisonData([])
        setInsights(null)
        return
      }

      try {
        setLoading(true)
        const [compareData, insightsData] = await Promise.all([
          api.compareEntities(selectedEntities, selectedCause || undefined, 1990, 2019, indexed),
          insightsApi.compareEntities(selectedEntities, selectedCause || undefined)
        ])
        setComparisonData(compareData)
        setInsights(insightsData as any)
      } catch (err) {
        console.error('Failed to load comparison:', err)
      } finally {
        setLoading(false)
      }
    }

    loadComparison()
  }, [selectedEntities, selectedCause, indexed])

  // Close entity picker when clicking outside
  useEffect(() => {
    if (!showEntityPicker) return

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      // Check if click is outside the entity picker AND the portal dropdown
      if (!target.closest('.entity-picker-container') &&
        portalRef.current &&
        !portalRef.current.contains(target)) {
        setShowEntityPicker(false)
        setSearchQuery('')
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showEntityPicker])

  // Transform data for chart
  const chartData = (() => {
    if (comparisonData.length === 0) return []

    const yearMap = new Map<number, Record<string, number>>()

    comparisonData.forEach(item => {
      const year = item.year
      if (!yearMap.has(year)) {
        yearMap.set(year, { year })
      }
      const yearData = yearMap.get(year)!
      yearData[item.entity] = indexed ? (item.indexed_value ?? item.deaths) : item.deaths
    })

    return Array.from(yearMap.values()).sort((a, b) => a.year - b.year)
  })()

  const addEntity = (entity: string) => {
    if (!selectedEntities.includes(entity) && selectedEntities.length < 6) {
      const newEntities = [...selectedEntities, entity]
      setSelectedEntities(newEntities)
      setSearchParams({ entities: newEntities.map(e => encodeURIComponent(e)).join(',') })
    }
    setShowEntityPicker(false)
    setSearchQuery('')
  }

  const removeEntity = (entity: string) => {
    const newEntities = selectedEntities.filter(e => e !== entity)
    setSelectedEntities(newEntities)
    if (newEntities.length > 0) {
      setSearchParams({ entities: newEntities.map(e => encodeURIComponent(e)).join(',') })
    } else {
      setSearchParams({})
    }
  }

  // Filter entities based on search query - recomputed on each render
  const filteredEntities = useMemo(() => {
    const query = searchQuery.toLowerCase().trim()
    if (!query) {
      // No search query - return all entities not already selected
      return entities.filter(e => !selectedEntities.includes(e.entity))
    }
    // Filter by search query
    return entities.filter(e =>
      e.entity.toLowerCase().includes(query) &&
      !selectedEntities.includes(e.entity)
    )
  }, [entities, searchQuery, selectedEntities])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-display font-bold flex items-center gap-3">
          <GitCompare className="w-7 h-7 text-signal-400" />
          Entity Comparison
        </h1>
        <p className="text-observatory-muted mt-1">
          Compare mortality trends across multiple countries and regions
        </p>
      </div>

      {/* Controls */}
      <div className="glass-card p-6">
        <div className="flex flex-col lg:flex-row lg:items-center gap-4">
          {/* Selected entities */}
          <div className="flex-1">
            <label className="text-sm text-observatory-muted mb-2 block">
              Selected Entities ({selectedEntities.length}/6)
            </label>
            <div className="flex flex-wrap gap-2">
              {selectedEntities.map((entity, index) => (
                <span
                  key={entity}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium"
                  style={{
                    backgroundColor: `${COMPARISON_COLORS[index]}20`,
                    borderColor: `${COMPARISON_COLORS[index]}50`,
                    color: COMPARISON_COLORS[index]
                  }}
                >
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: COMPARISON_COLORS[index] }}
                  />
                  {entity}
                  <button
                    onClick={() => removeEntity(entity)}
                    className="hover:bg-white/10 rounded-full p-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}

              {selectedEntities.length < 6 && (
                <div className="relative entity-picker-container">
                  <button
                    ref={buttonRef}
                    onClick={() => setShowEntityPicker(!showEntityPicker)}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm
                             bg-observatory-elevated border border-observatory-border
                             hover:border-signal-500/30 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Add Entity
                  </button>

                  {showEntityPicker && buttonRef.current && createPortal(
                    <div
                      ref={portalRef}
                      className="fixed w-72 glass-card p-3 z-[9999]"
                      style={{
                        top: `${buttonRef.current.getBoundingClientRect().bottom + window.scrollY + 8}px`,
                        left: `${buttonRef.current.getBoundingClientRect().left + window.scrollX}px`,
                      }}
                    >
                      <div className="relative mb-3">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-observatory-muted" />
                        <input
                          type="text"
                          placeholder="Search entities..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="input-field pl-9 py-2 text-sm w-full"
                          autoFocus
                        />
                        {searchQuery && (
                          <button
                            onClick={() => setSearchQuery('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-observatory-muted hover:text-observatory-text"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      {searchQuery && (
                        <div className="text-xs text-observatory-muted mb-2">
                          {filteredEntities.length} result{filteredEntities.length !== 1 ? 's' : ''} for "{searchQuery}"
                        </div>
                      )}
                      <div className="max-h-64 overflow-y-auto space-y-1">
                        {filteredEntities.length === 0 ? (
                          <div className="text-center py-4 text-observatory-muted text-sm">
                            No entities found for "{searchQuery}"
                          </div>
                        ) : (
                          filteredEntities.slice(0, 20).map((entity) => (
                            <button
                              key={entity.entity}
                              onClick={() => addEntity(entity.entity)}
                              className="w-full text-left px-3 py-2 rounded-lg hover:bg-observatory-elevated
                                       text-sm transition-colors"
                            >
                              {entity.entity}
                              <span className="text-observatory-muted ml-2">({entity.code || 'N/A'})</span>
                            </button>
                          ))
                        )}
                      </div>
                    </div>,
                    document.body
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Options */}
          <div className="flex items-center gap-4">
            {/* Cause filter */}
            <div>
              <label className="text-sm text-observatory-muted mb-2 block">Cause</label>
              <select
                value={selectedCause || ''}
                onChange={(e) => setSelectedCause(e.target.value || null)}
                className="input-field py-2"
              >
                <option value="">All Causes</option>
                {causes.map((cause) => (
                  <option key={cause.cause} value={cause.cause}>
                    {cause.cause}
                  </option>
                ))}
              </select>
            </div>

            {/* Index toggle */}
            <div>
              <label className="text-sm text-observatory-muted mb-2 block">View</label>
              <div className="flex rounded-lg bg-observatory-border/30 p-1">
                <button
                  onClick={() => setIndexed(true)}
                  className={clsx(
                    'px-3 py-1.5 rounded text-sm font-medium transition-colors',
                    indexed
                      ? 'bg-signal-500 text-white shadow-sm'
                      : 'text-observatory-text hover:bg-observatory-elevated'
                  )}
                >
                  Indexed
                </button>
                <button
                  onClick={() => setIndexed(false)}
                  className={clsx(
                    'px-3 py-1.5 rounded text-sm font-medium transition-colors',
                    !indexed
                      ? 'bg-signal-500 text-white shadow-sm'
                      : 'text-observatory-text hover:bg-observatory-elevated'
                  )}
                >
                  Absolute
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Chart */}
      {selectedEntities.length >= 2 ? (
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Mortality Trend Comparison</h2>
            {indexed && (
              <span className="text-xs text-observatory-muted bg-observatory-elevated px-2 py-1 rounded">
                Base year = 100
              </span>
            )}
          </div>

          {loading ? (
            <div className="h-96 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-signal-500" />
            </div>
          ) : (
            <div className="h-96">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.5} />
                  <XAxis
                    dataKey="year"
                    stroke="#6b7280"
                    tick={{ fill: '#6b7280', fontSize: 12 }}
                  />
                  <YAxis
                    stroke="#6b7280"
                    tick={{ fill: '#6b7280', fontSize: 12 }}
                    tickFormatter={(v) => indexed ? v.toFixed(0) : `${(v / 1000).toFixed(0)}K`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1f2937',
                      border: '1px solid #374151',
                      borderRadius: '8px',
                    }}
                    labelStyle={{ color: '#f9fafb' }}
                    formatter={(value: number, name: string) => [
                      indexed ? value.toFixed(1) : value.toLocaleString(),
                      name
                    ]}
                  />
                  <Legend />
                  {selectedEntities.map((entity, index) => (
                    <Line
                      key={entity}
                      type="monotone"
                      dataKey={entity}
                      stroke={COMPARISON_COLORS[index]}
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4 }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      ) : (
        <div className="glass-card p-12 text-center">
          <GitCompare className="w-12 h-12 text-observatory-muted mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">Select Entities to Compare</h3>
          <p className="text-observatory-muted">
            Add at least 2 entities to start comparing mortality trends
          </p>
        </div>
      )}

      {/* Insights */}
      {insights && insights.insights.length > 0 && (
        <div className="glass-card p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-signal-400" />
            Comparative Insights
          </h2>
          <ul className="space-y-2">
            {insights.insights.map((insight, i) => (
              <li key={i} className="flex items-start gap-3 text-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-signal-500 mt-2 flex-shrink-0" />
                {insight}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Entity stats table */}
      {insights && insights.entity_stats.length > 0 && (
        <div className="glass-card p-6">
          <h2 className="text-lg font-semibold mb-4">Entity Statistics ({insights.entity_stats[0]?.year || 'Latest Year'})</h2>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Entity</th>
                  <th>Total Deaths</th>
                  <th>Anomalies</th>
                  <th>Top Cause</th>
                </tr>
              </thead>
              <tbody>
                {insights.entity_stats.map((stat: any, i: number) => (
                  <tr key={stat.entity}>
                    <td>
                      <div className="flex items-center gap-2">
                        <span
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: COMPARISON_COLORS[i] }}
                        />
                        <span className="font-medium">{stat.entity}</span>
                      </div>
                    </td>
                    <td>{stat.total_deaths?.toLocaleString() || 'N/A'}</td>
                    <td>
                      <span className={clsx(
                        'px-2 py-0.5 rounded-full text-xs',
                        stat.anomaly_count > 0 ? 'bg-severity-warning/20 text-severity-warning' : 'bg-observatory-elevated'
                      )}>
                        {stat.anomaly_count}
                      </span>
                    </td>
                    <td className="text-sm">{stat.top_cause || 'N/A'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
