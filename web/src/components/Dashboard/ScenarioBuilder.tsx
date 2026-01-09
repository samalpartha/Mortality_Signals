/**
 * =============================================================================
 * Scenario Builder Component - What-If Analysis
 * =============================================================================
 * The "killer feature" for hackathon judging:
 * - Select entity, causes, and reduction percentage
 * - Visualize baseline vs scenario
 * - See deaths averted and narrative explanation
 * - Compare pre-built intervention templates
 * =============================================================================
 */

import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Zap,
  TrendingDown,
  Target,
  Lightbulb,
  ChevronDown,
  ChevronUp,
  Play,
  RotateCcw,
} from 'lucide-react'
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
} from 'recharts'
import type { Entity, Cause } from '@/services/types'
import clsx from 'clsx'

const API_BASE = import.meta.env.VITE_API_BASE_URL || ''

interface ScenarioBuilderProps {
  entities: Entity[]
  causes: Cause[]
}

interface ScenarioResult {
  entity: string
  causes: string[]
  reduction_pct: number
  start_year: number
  end_year: number
  baseline_total: number
  scenario_total: number
  deaths_averted: number
  pct_reduction_achieved: number
  yearly_comparison: Array<{
    year: number
    baseline_deaths: number
    scenario_deaths: number
    deaths_averted: number
  }>
  narrative: string
}

interface Intervention {
  id: string
  name: string
  description: string
  causes: string[]
  suggested_reduction: number
  evidence_level: string
}

export function ScenarioBuilder({ entities, causes }: ScenarioBuilderProps) {
  const [searchParams] = useSearchParams()
  
  // Form state
  const [selectedEntity, setSelectedEntity] = useState(searchParams.get('entity') || '')
  const [selectedCauses, setSelectedCauses] = useState<string[]>([])
  const [reductionPct, setReductionPct] = useState(20)
  const [startYear, setStartYear] = useState(2010)
  const [endYear, setEndYear] = useState(2019)
  
  // Results state
  const [result, setResult] = useState<ScenarioResult | null>(null)
  const [interventions, setInterventions] = useState<Intervention[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // UI state
  const [showInterventions, setShowInterventions] = useState(true)

  // Load intervention templates
  useEffect(() => {
    fetch(`${API_BASE}/api/scenario/interventions`)
      .then(r => r.json())
      .then(setInterventions)
      .catch(console.error)
  }, [])

  // Apply intervention template
  const applyIntervention = (intervention: Intervention) => {
    setSelectedCauses(intervention.causes)
    setReductionPct(intervention.suggested_reduction)
  }

  // Run simulation
  const runSimulation = async () => {
    if (!selectedEntity || selectedCauses.length === 0) {
      setError('Please select an entity and at least one cause')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams({
        entity: selectedEntity,
        reduction_pct: String(reductionPct),
        start_year: String(startYear),
        end_year: String(endYear),
      })
      selectedCauses.forEach(c => params.append('causes', c))

      const response = await fetch(`${API_BASE}/api/scenario/simulate?${params}`)
      
      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.detail || 'Simulation failed')
      }

      const data = await response.json()
      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Simulation failed')
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setSelectedCauses([])
    setReductionPct(20)
    setStartYear(2010)
    setEndYear(2019)
    setResult(null)
    setError(null)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold flex items-center gap-3">
            <Zap className="w-7 h-7 text-amber-400" />
            Scenario Builder
          </h1>
          <p className="text-observatory-muted mt-1">
            Model the impact of mortality interventions
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Controls Panel */}
        <div className="space-y-4">
          {/* Entity Selection */}
          <div className="glass-card p-4">
            <label className="text-sm font-medium text-observatory-muted mb-2 block">
              Select Entity
            </label>
            <select
              value={selectedEntity}
              onChange={(e) => setSelectedEntity(e.target.value)}
              className="input-field"
            >
              <option value="">Choose a country/region...</option>
              {entities.map(e => (
                <option key={e.entity} value={e.entity}>{e.entity}</option>
              ))}
            </select>
          </div>

          {/* Intervention Templates */}
          <div className="glass-card p-4">
            <button
              onClick={() => setShowInterventions(!showInterventions)}
              className="w-full flex items-center justify-between text-sm font-medium"
            >
              <span className="flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-amber-400" />
                Intervention Templates
              </span>
              {showInterventions ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>
            
            {showInterventions && (
              <div className="mt-3 space-y-2">
                {interventions.map(int => (
                  <button
                    key={int.id}
                    onClick={() => applyIntervention(int)}
                    className="w-full text-left p-3 rounded-lg bg-white/50 dark:bg-observatory-elevated/50 
                             hover:bg-white dark:hover:bg-observatory-elevated border border-observatory-border/50
                             hover:border-amber-500/30 transition-all group shadow-sm"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">{int.name}</span>
                      <span className={clsx(
                        'text-xs px-2 py-0.5 rounded-full',
                        int.evidence_level === 'high' && 'bg-signal-500/20 text-signal-400',
                        int.evidence_level === 'medium' && 'bg-amber-500/20 text-amber-400',
                        int.evidence_level === 'low' && 'bg-observatory-muted/20 text-observatory-muted'
                      )}>
                        {int.evidence_level}
                      </span>
                    </div>
                    <p className="text-xs text-observatory-muted mt-1">{int.description}</p>
                    <p className="text-xs text-observatory-muted mt-1">
                      Suggested: -{int.suggested_reduction}%
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Cause Selection */}
          <div className="glass-card p-4">
            <label className="text-sm font-medium text-observatory-muted mb-2 block">
              Select Causes ({selectedCauses.length} selected)
            </label>
            <select
              multiple
              value={selectedCauses}
              onChange={(e) => {
                const selected = Array.from(e.target.selectedOptions).map(o => o.value)
                setSelectedCauses(selected)
              }}
              className="input-field h-40"
            >
              {causes.map(c => (
                <option key={c.cause} value={c.cause}>{c.cause}</option>
              ))}
            </select>
            <p className="text-xs text-observatory-muted mt-2">
              Ctrl/Cmd + click to select multiple
            </p>
          </div>

          {/* Parameters */}
          <div className="glass-card p-4 space-y-4">
            <div>
              <label className="text-sm font-medium text-observatory-muted mb-2 flex items-center justify-between">
                <span>Reduction Target</span>
                <span className="text-amber-400">{reductionPct}%</span>
              </label>
              <input
                type="range"
                min="5"
                max="80"
                step="5"
                value={reductionPct}
                onChange={(e) => setReductionPct(Number(e.target.value))}
                className="w-full accent-amber-500"
              />
              <div className="flex justify-between text-xs text-observatory-muted mt-1">
                <span>5%</span>
                <span>80%</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-observatory-muted mb-1 block">Start Year</label>
                <input
                  type="number"
                  min="1990"
                  max="2018"
                  value={startYear}
                  onChange={(e) => setStartYear(Number(e.target.value))}
                  className="input-field py-2"
                />
              </div>
              <div>
                <label className="text-sm text-observatory-muted mb-1 block">End Year</label>
                <input
                  type="number"
                  min="1991"
                  max="2019"
                  value={endYear}
                  onChange={(e) => setEndYear(Number(e.target.value))}
                  className="input-field py-2"
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2">
            {(!selectedEntity || selectedCauses.length === 0) && (
              <div className="text-xs text-amber-400 flex items-center gap-1">
                <Lightbulb className="w-3 h-3" />
                {!selectedEntity 
                  ? 'Select an entity above to enable simulation' 
                  : 'Add at least one cause to simulate'
                }
              </div>
            )}
            <div className="flex gap-3">
              <button
                onClick={runSimulation}
                disabled={loading || !selectedEntity || selectedCauses.length === 0}
                className={clsx(
                  "btn-primary flex-1 flex items-center justify-center gap-2",
                  (!selectedEntity || selectedCauses.length === 0)
                    ? "opacity-50 cursor-not-allowed bg-gray-600"
                    : "bg-amber-600 hover:bg-amber-500"
                )}
                title={
                  !selectedEntity 
                    ? 'Select an entity first' 
                    : selectedCauses.length === 0 
                    ? 'Add at least one cause' 
                    : 'Run what-if simulation'
                }
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                ) : (
                  <Play className="w-4 h-4" />
                )}
                Run Simulation
              </button>
              <button
                onClick={resetForm}
                className="btn-secondary"
                title="Reset form"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-severity-critical/10 border border-severity-critical/30 text-severity-critical text-sm">
              {error}
            </div>
          )}
        </div>

        {/* Results Panel */}
        <div className="lg:col-span-2 space-y-6">
          {result ? (
            <>
              {/* Impact Summary */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="glass-card p-5 bg-gradient-to-br from-blue-500/20 to-blue-600/5">
                  <p className="text-sm text-observatory-muted">Baseline Deaths</p>
                  <p className="text-2xl font-bold mt-1 text-blue-400">
                    {result.baseline_total.toLocaleString()}
                  </p>
                  <p className="text-xs text-observatory-muted mt-1">
                    {result.start_year}-{result.end_year}
                  </p>
                </div>
                
                <div className="glass-card p-5 bg-gradient-to-br from-signal-500/20 to-signal-600/5">
                  <p className="text-sm text-observatory-muted">Scenario Deaths</p>
                  <p className="text-2xl font-bold mt-1 text-signal-400">
                    {result.scenario_total.toLocaleString()}
                  </p>
                  <p className="text-xs text-observatory-muted mt-1">
                    With {result.reduction_pct}% reduction
                  </p>
                </div>
                
                <div className="glass-card p-5 bg-gradient-to-br from-amber-500/20 to-amber-600/5 kpi-glow">
                  <p className="text-sm text-observatory-muted">Deaths Averted</p>
                  <p className="text-2xl font-bold mt-1 text-amber-400">
                    {result.deaths_averted.toLocaleString()}
                  </p>
                  <p className="text-xs text-observatory-muted mt-1">
                    {result.pct_reduction_achieved.toFixed(1)}% total reduction
                  </p>
                </div>
              </div>

              {/* Narrative */}
              <div className="glass-card p-5 bg-gradient-to-r from-amber-500/5 to-transparent border-l-4 border-amber-500">
                <div className="flex items-start gap-3">
                  <Target className="w-5 h-5 text-amber-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold mb-2">Impact Analysis</h3>
                    <p className="text-sm text-observatory-muted leading-relaxed">
                      {result.narrative}
                    </p>
                  </div>
                </div>
              </div>

              {/* Chart */}
              <div className="glass-card p-6">
                <h3 className="text-lg font-semibold mb-4">Baseline vs Scenario</h3>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={result.yearly_comparison}>
                      <defs>
                        <linearGradient id="colorBaseline" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorScenario" x1="0" y1="0" x2="0" y2="1">
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
                        tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#1f2937',
                          border: '1px solid #374151',
                          borderRadius: '8px',
                        }}
                        formatter={(value: number, name: string) => [
                          value.toLocaleString(),
                          name === 'baseline_deaths' ? 'Baseline' : 'Scenario'
                        ]}
                      />
                      <Legend />
                      <Area
                        type="monotone"
                        dataKey="baseline_deaths"
                        name="Baseline"
                        stroke="#3b82f6"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#colorBaseline)"
                      />
                      <Area
                        type="monotone"
                        dataKey="scenario_deaths"
                        name="Scenario"
                        stroke="#22c55e"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#colorScenario)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Deaths Averted by Year */}
              <div className="glass-card p-6">
                <h3 className="text-lg font-semibold mb-4">Deaths Averted by Year</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={result.yearly_comparison}>
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
                        formatter={(value: number) => [value.toLocaleString(), 'Deaths Averted']}
                      />
                      <Bar 
                        dataKey="deaths_averted" 
                        fill="#f59e0b" 
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </>
          ) : (
            <div className="glass-card p-12 text-center">
              <Zap className="w-16 h-16 text-observatory-muted mx-auto mb-4 opacity-50" />
              <h3 className="text-xl font-semibold mb-2">Build Your Scenario</h3>
              <p className="text-observatory-muted max-w-md mx-auto">
                Select an entity, choose causes to target, set your reduction goal, 
                and run the simulation to see potential lives saved.
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-2">
                {interventions.slice(0, 4).map(int => (
                  <button
                    key={int.id}
                    onClick={() => {
                      applyIntervention(int)
                      if (entities.length > 0 && !selectedEntity) {
                        setSelectedEntity(entities[0].entity)
                      }
                    }}
                    className="px-3 py-1.5 rounded-full text-sm bg-signal-500/10 text-signal-600 dark:text-signal-400
                             border border-signal-500/20 hover:bg-signal-500/20 hover:border-signal-500/40 transition-colors"
                  >
                    {int.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
