/**
 * =============================================================================
 * Embeddable Dashboard Component
 * =============================================================================
 * A self-contained, embeddable version of the mortality dashboard.
 * Designed for iframe embedding or standalone deployment.
 * 
 * Usage:
 *   <iframe src="/embed?entity=India&causes=Malaria" />
 * =============================================================================
 */

import { useState, useEffect, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'

const API_BASE = import.meta.env.VITE_API_BASE_URL || ''

interface Entity {
  entity: string
  code: string
}

interface TimeseriesRow {
  year: number
  cause: string
  deaths: number
}

interface TopCause {
  cause: string
  deaths: number
}

// Color palette for causes
const CAUSE_COLORS = [
  '#22c55e', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6',
  '#06b6d4', '#84cc16', '#f97316', '#14b8a6', '#a855f7',
]

function groupSeries(rows: TimeseriesRow[], selectedCauses: string[]) {
  const byYear = new Map<number, Record<string, number>>()
  
  for (const r of rows) {
    if (!byYear.has(r.year)) {
      byYear.set(r.year, { year: r.year })
    }
    byYear.get(r.year)![r.cause] = r.deaths
  }
  
  const data = Array.from(byYear.values()).sort((a, b) => a.year - b.year)
  
  // Ensure all selected causes exist per row
  for (const row of data) {
    for (const c of selectedCauses) {
      if (row[c] == null) row[c] = 0
    }
  }
  
  return data
}

export function EmbeddableDashboard() {
  const [searchParams] = useSearchParams()
  
  // Get params from URL
  const defaultEntity = searchParams.get('entity') || 'World'
  const defaultCauses = searchParams.get('causes')?.split(',') || []
  const minYear = parseInt(searchParams.get('minYear') || '1990')
  const maxYear = parseInt(searchParams.get('maxYear') || '2019')
  const theme = searchParams.get('theme') || 'dark'
  
  // State
  const [entityQuery, setEntityQuery] = useState('')
  const [entities, setEntities] = useState<Entity[]>([])
  const [entity, setEntity] = useState(defaultEntity)
  
  const [causeQuery, setCauseQuery] = useState('')
  const [causes, setCauses] = useState<string[]>([])
  const [selectedCauses, setSelectedCauses] = useState<string[]>(defaultCauses)
  
  const [yearFrom, setYearFrom] = useState(minYear)
  const [yearTo, setYearTo] = useState(maxYear)
  const [topYear, setTopYear] = useState(maxYear)
  
  const [tsRows, setTsRows] = useState<TimeseriesRow[]>([])
  const [topRows, setTopRows] = useState<TopCause[]>([])
  const [loading, setLoading] = useState(true)

  // Load entities
  useEffect(() => {
    const url = new URL(`${API_BASE}/api/data/entities`)
    if (entityQuery) url.searchParams.set('q', entityQuery)
    url.searchParams.set('limit', '200')
    fetch(url).then(r => r.json()).then(setEntities).catch(console.error)
  }, [entityQuery])

  // Load causes
  useEffect(() => {
    const url = new URL(`${API_BASE}/api/data/causes`)
    if (causeQuery) url.searchParams.set('q', causeQuery)
    fetch(url).then(r => r.json()).then(data => {
      setCauses(data.map((c: any) => c.cause || c))
    }).catch(console.error)
  }, [causeQuery])

  // Load timeseries
  useEffect(() => {
    if (!entity || selectedCauses.length === 0) {
      setTsRows([])
      setLoading(false)
      return
    }
    
    setLoading(true)
    const url = new URL(`${API_BASE}/api/data/timeseries`)
    url.searchParams.set('entity', entity)
    url.searchParams.set('year_from', String(yearFrom))
    url.searchParams.set('year_to', String(yearTo))
    selectedCauses.forEach(c => url.searchParams.append('causes', c))

    fetch(url)
      .then(r => r.json())
      .then(setTsRows)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [entity, selectedCauses, yearFrom, yearTo])

  // Load top causes
  useEffect(() => {
    if (!entity || !topYear) {
      setTopRows([])
      return
    }
    
    const url = new URL(`${API_BASE}/api/data/top-causes`)
    url.searchParams.set('entity', entity)
    url.searchParams.set('year', String(topYear))
    url.searchParams.set('top_n', '10')
    
    fetch(url).then(r => r.json()).then(setTopRows).catch(console.error)
  }, [entity, topYear])

  const tsData = useMemo(
    () => groupSeries(tsRows, selectedCauses),
    [tsRows, selectedCauses]
  )

  // Theme styles
  const isDark = theme === 'dark'
  const bgColor = isDark ? '#0a0f1a' : '#ffffff'
  const surfaceColor = isDark ? '#111827' : '#f9fafb'
  const borderColor = isDark ? '#374151' : '#e5e7eb'
  const textColor = isDark ? '#f9fafb' : '#111827'
  const mutedColor = isDark ? '#6b7280' : '#6b7280'

  return (
    <div 
      style={{ 
        fontFamily: 'system-ui, -apple-system, sans-serif',
        padding: 16, 
        maxWidth: 1200,
        margin: '0 auto',
        backgroundColor: bgColor,
        color: textColor,
        minHeight: '100vh',
      }}
    >
      <h2 style={{ 
        margin: '0 0 16px 0', 
        fontSize: 24, 
        fontWeight: 700,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}>
        <span style={{ color: '#22c55e' }}>●</span>
        Mortality Signals Dashboard
      </h2>

      {/* Controls Grid */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: 12, 
        marginBottom: 20 
      }}>
        {/* Entity Selector */}
        <div style={{ 
          border: `1px solid ${borderColor}`, 
          borderRadius: 12, 
          padding: 12,
          backgroundColor: surfaceColor,
        }}>
          <div style={{ fontWeight: 600, marginBottom: 8, fontSize: 14 }}>Entity</div>
          <input
            value={entityQuery}
            onChange={(e) => setEntityQuery(e.target.value)}
            placeholder="Search..."
            style={{ 
              width: '100%', 
              padding: 8, 
              marginBottom: 8,
              backgroundColor: bgColor,
              border: `1px solid ${borderColor}`,
              borderRadius: 6,
              color: textColor,
            }}
          />
          <select
            value={entity}
            onChange={(e) => setEntity(e.target.value)}
            style={{ 
              width: '100%', 
              padding: 8,
              backgroundColor: bgColor,
              border: `1px solid ${borderColor}`,
              borderRadius: 6,
              color: textColor,
            }}
          >
            {entities.map((x) => (
              <option key={`${x.entity}-${x.code}`} value={x.entity}>
                {x.entity}
              </option>
            ))}
          </select>
        </div>

        {/* Cause Selector */}
        <div style={{ 
          border: `1px solid ${borderColor}`, 
          borderRadius: 12, 
          padding: 12,
          backgroundColor: surfaceColor,
        }}>
          <div style={{ fontWeight: 600, marginBottom: 8, fontSize: 14 }}>
            Causes ({selectedCauses.length} selected)
          </div>
          <input
            value={causeQuery}
            onChange={(e) => setCauseQuery(e.target.value)}
            placeholder="Search causes..."
            style={{ 
              width: '100%', 
              padding: 8, 
              marginBottom: 8,
              backgroundColor: bgColor,
              border: `1px solid ${borderColor}`,
              borderRadius: 6,
              color: textColor,
            }}
          />
          <select
            multiple
            value={selectedCauses}
            onChange={(e) => {
              setSelectedCauses(Array.from(e.target.selectedOptions).map(o => o.value))
            }}
            style={{ 
              width: '100%', 
              padding: 8, 
              height: 120,
              backgroundColor: bgColor,
              border: `1px solid ${borderColor}`,
              borderRadius: 6,
              color: textColor,
            }}
          >
            {causes.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <div style={{ marginTop: 8, fontSize: 11, color: mutedColor }}>
            Ctrl/Cmd + click for multiple
          </div>
        </div>

        {/* Year Range */}
        <div style={{ 
          border: `1px solid ${borderColor}`, 
          borderRadius: 12, 
          padding: 12,
          backgroundColor: surfaceColor,
        }}>
          <div style={{ fontWeight: 600, marginBottom: 8, fontSize: 14 }}>Year Range</div>
          
          <label style={{ display: 'block', fontSize: 12, marginBottom: 4, color: mutedColor }}>
            From
          </label>
          <input
            type="number"
            min={minYear}
            max={maxYear}
            value={yearFrom}
            onChange={(e) => setYearFrom(Number(e.target.value))}
            style={{ 
              width: '100%', 
              padding: 8, 
              marginBottom: 8,
              backgroundColor: bgColor,
              border: `1px solid ${borderColor}`,
              borderRadius: 6,
              color: textColor,
            }}
          />

          <label style={{ display: 'block', fontSize: 12, marginBottom: 4, color: mutedColor }}>
            To
          </label>
          <input
            type="number"
            min={minYear}
            max={maxYear}
            value={yearTo}
            onChange={(e) => setYearTo(Number(e.target.value))}
            style={{ 
              width: '100%', 
              padding: 8, 
              marginBottom: 8,
              backgroundColor: bgColor,
              border: `1px solid ${borderColor}`,
              borderRadius: 6,
              color: textColor,
            }}
          />

          <label style={{ display: 'block', fontSize: 12, marginBottom: 4, color: mutedColor }}>
            Top causes year
          </label>
          <input
            type="number"
            min={minYear}
            max={maxYear}
            value={topYear}
            onChange={(e) => setTopYear(Number(e.target.value))}
            style={{ 
              width: '100%', 
              padding: 8,
              backgroundColor: bgColor,
              border: `1px solid ${borderColor}`,
              borderRadius: 6,
              color: textColor,
            }}
          />
        </div>
      </div>

      {/* Charts Grid */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: '2fr 1fr', 
        gap: 16 
      }}>
        {/* Time Series Chart */}
        <div style={{ 
          border: `1px solid ${borderColor}`, 
          borderRadius: 12, 
          padding: 16,
          backgroundColor: surfaceColor,
        }}>
          <div style={{ fontWeight: 600, marginBottom: 12 }}>
            Deaths per Year
          </div>
          <div style={{ width: '100%', height: 360 }}>
            {loading ? (
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                height: '100%',
                color: mutedColor,
              }}>
                Loading...
              </div>
            ) : tsData.length > 0 ? (
              <ResponsiveContainer>
                <LineChart data={tsData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={borderColor} opacity={0.5} />
                  <XAxis dataKey="year" stroke={mutedColor} tick={{ fill: mutedColor, fontSize: 12 }} />
                  <YAxis stroke={mutedColor} tick={{ fill: mutedColor, fontSize: 12 }} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: surfaceColor, 
                      border: `1px solid ${borderColor}`,
                      borderRadius: 8,
                    }}
                  />
                  <Legend />
                  {selectedCauses.map((c, i) => (
                    <Line 
                      key={c} 
                      type="monotone" 
                      dataKey={c} 
                      stroke={CAUSE_COLORS[i % CAUSE_COLORS.length]}
                      strokeWidth={2}
                      dot={false}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                height: '100%',
                color: mutedColor,
              }}>
                Select causes to view trends
              </div>
            )}
          </div>
        </div>

        {/* Top Causes Bar Chart */}
        <div style={{ 
          border: `1px solid ${borderColor}`, 
          borderRadius: 12, 
          padding: 16,
          backgroundColor: surfaceColor,
        }}>
          <div style={{ fontWeight: 600, marginBottom: 12 }}>
            Top 10 Causes ({topYear})
          </div>
          <div style={{ width: '100%', height: 360 }}>
            {topRows.length > 0 ? (
              <ResponsiveContainer>
                <BarChart data={topRows} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke={borderColor} opacity={0.5} />
                  <XAxis type="number" stroke={mutedColor} tick={{ fill: mutedColor, fontSize: 10 }} />
                  <YAxis 
                    type="category" 
                    dataKey="cause" 
                    width={130} 
                    stroke={mutedColor}
                    tick={{ fill: mutedColor, fontSize: 10 }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: surfaceColor, 
                      border: `1px solid ${borderColor}`,
                      borderRadius: 8,
                    }}
                  />
                  <Bar dataKey="deaths" fill="#22c55e" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                height: '100%',
                color: mutedColor,
              }}>
                No data available
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ 
        marginTop: 16, 
        padding: 12, 
        borderTop: `1px solid ${borderColor}`,
        fontSize: 12,
        color: mutedColor,
        display: 'flex',
        justifyContent: 'space-between',
      }}>
        <span>Mortality Signals • Powered by Kaggle Open Data</span>
        <span>Entity: {entity} • Years: {yearFrom}-{yearTo}</span>
      </div>
    </div>
  )
}
