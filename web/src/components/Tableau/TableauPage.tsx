/**
 * =============================================================================
 * Tableau Analytics Page
 * =============================================================================
 * Shows how this app integrates with Tableau Cloud for advanced analytics.
 * - Data export for Tableau
 * - Tableau embed (when configured)
 * - Direct links to Tableau dashboards
 * =============================================================================
 */

import { useState, useEffect, useRef } from 'react'
import { TableauSetupStatus } from './TableauEmbed'
import {
  LayoutDashboard,
  Settings,
  ExternalLink,
  Download,
  Database,
  BarChart3,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Loader2,
  FileSpreadsheet,
  TrendingUp,
  Globe,
} from 'lucide-react'
import clsx from 'clsx'

type Tab = 'overview' | 'data-export' | 'setup'

interface ExportData {
  columns: string[]
  row_count: number
  sample: Record<string, any>[]
}

export function TableauPage() {
  const API_BASE = import.meta.env.VITE_API_BASE_URL || ''
  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const [exportData, setExportData] = useState<ExportData | null>(null)
  const [loadingExport, setLoadingExport] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)

  const tabs = [
    { id: 'overview' as Tab, label: 'Overview', icon: LayoutDashboard },
    { id: 'data-export' as Tab, label: 'Data Export', icon: Download },
    { id: 'setup' as Tab, label: 'Setup & Status', icon: Settings },
  ]

  // Load export preview
  const loadExportPreview = async () => {
    setLoadingExport(true)
    setExportError(null)
    try {
      const response = await fetch(`${API_BASE}/api/export/tableau-ready?limit=5`)
      if (!response.ok) throw new Error('Failed to load export data')
      const data = await response.json()
      setExportData(data)
    } catch (err) {
      setExportError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setLoadingExport(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'data-export' && !exportData) {
      loadExportPreview()
    }
  }, [activeTab])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <BarChart3 className="w-8 h-8 text-signal-400" />
            Tableau Analytics
          </h1>
          <p className="text-observatory-muted mt-1">
            Professional business intelligence powered by Tableau Cloud
          </p>
        </div>
        <a
          href="https://10ax.online.tableau.com/#/site/ccc-hackathon-partha/home"
          target="_blank"
          rel="noopener noreferrer"
          className="btn-primary inline-flex items-center gap-2"
        >
          <ExternalLink className="w-4 h-4" />
          Open Tableau Cloud
        </a>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-observatory-border pb-4">
        {tabs.map((tab) => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={clsx(
                'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
                activeTab === tab.id
                  ? 'bg-signal-500/20 text-signal-400'
                  : 'text-observatory-muted hover:text-observatory-text hover:bg-observatory-elevated'
              )}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* EMBEDDED TABLEAU DASHBOARD - The Main Feature */}
          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-signal-400" />
                  Live Dashboard: Global Mortality Overview
                </h2>
                <p className="text-sm text-observatory-muted mt-1">
                  Interactive Tableau visualization embedded from Tableau Cloud
                </p>
              </div>
              <a
                href="https://10ax.online.tableau.com/#/site/ccc-hackathon-partha/views/GlobalOverview/Dashboard1"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary inline-flex items-center gap-2 text-sm"
              >
                <ExternalLink className="w-4 h-4" />
                Open Full Screen
              </a>
            </div>

            {/* Embedded Tableau Dashboard */}
            <TableauEmbeddedDashboard />
          </div>

          {/* What is Tableau's Role */}
          <div className="glass-card p-6">
            <h2 className="text-xl font-bold mb-4">How Tableau Enhances This Platform</h2>
            <div className="grid md:grid-cols-3 gap-6">
              <FeatureCard
                icon={Database}
                title="Data Pipeline"
                description="Our API processes raw mortality data and exports it in Tableau-ready format (CSV, JSON, or Hyper)."
                color="blue"
              />
              <FeatureCard
                icon={BarChart3}
                title="Advanced Visualization"
                description="Tableau Cloud provides professional-grade dashboards with drill-down, filtering, and geographic mapping."
                color="green"
              />
              <FeatureCard
                icon={Globe}
                title="Enterprise Sharing"
                description="Dashboards can be shared with stakeholders, embedded in reports, and exported to PDF."
                color="purple"
              />
            </div>
          </div>

          {/* Integration Flow */}
          <div className="glass-card p-6">
            <h2 className="text-xl font-bold mb-4">Integration Architecture</h2>
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <FlowStep
                step={1}
                title="Raw Data"
                description="CSV from Kaggle (1990-2019)"
                icon={FileSpreadsheet}
              />
              <ArrowRight className="w-6 h-6 text-observatory-muted hidden md:block" />
              <FlowStep
                step={2}
                title="ETL Pipeline"
                description="Transform & enrich data"
                icon={TrendingUp}
              />
              <ArrowRight className="w-6 h-6 text-observatory-muted hidden md:block" />
              <FlowStep
                step={3}
                title="API Export"
                description="/api/export/tableau-ready"
                icon={Database}
              />
              <ArrowRight className="w-6 h-6 text-observatory-muted hidden md:block" />
              <FlowStep
                step={4}
                title="Tableau Cloud"
                description="Professional dashboards"
                icon={BarChart3}
              />
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid md:grid-cols-2 gap-6">
            <div className="glass-card p-6">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-signal-400" />
                Access Your Tableau Dashboard
              </h3>
              <p className="text-sm text-observatory-muted mb-4">
                The "GlobalOverview" workbook is published to your Tableau Cloud site.
              </p>
              <a
                href="https://10ax.online.tableau.com/#/site/ccc-hackathon-partha/views/GlobalOverview/Dashboard1"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary inline-flex items-center gap-2"
              >
                <ExternalLink className="w-4 h-4" />
                View Global Dashboard
              </a>
            </div>

            <div className="glass-card p-6">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Download className="w-5 h-5 text-signal-400" />
                Export Data for Tableau
              </h3>
              <p className="text-sm text-observatory-muted mb-4">
                Download analysis-ready data to create custom Tableau dashboards.
              </p>
              <button
                onClick={() => setActiveTab('data-export')}
                className="btn-secondary inline-flex items-center gap-2"
              >
                <Database className="w-4 h-4" />
                View Export Options
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Data Export Tab */}
      {activeTab === 'data-export' && (
        <div className="space-y-6">
          <div className="glass-card p-6">
            <h2 className="text-xl font-bold mb-2">Tableau-Ready Data Export</h2>
            <p className="text-observatory-muted mb-6">
              Download processed mortality data in formats optimized for Tableau.
            </p>

            {/* Export Formats */}
            {/* Export Formats */}
            <div className="grid md:grid-cols-3 gap-4 mb-8">
              <ExportFormatCard
                format="CSV"
                description="Universal format, works with all BI tools"
                endpoint={`${API_BASE}/api/export/tableau-ready?format=csv`}
                recommended
              />
              <ExportFormatCard
                format="JSON"
                description="For programmatic access and web apps"
                endpoint={`${API_BASE}/api/export/tableau-ready?format=json`}
              />
              <ExportFormatCard
                format="Parquet"
                description="Columnar format for large datasets"
                endpoint={`${API_BASE}/api/export/tableau-ready?format=parquet`}
                disabled
              />
            </div>

            {/* Data Preview */}
            <div>
              <h3 className="font-semibold mb-3">Data Preview</h3>
              {loadingExport && (
                <div className="flex items-center gap-3 text-observatory-muted py-8">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Loading preview...
                </div>
              )}
              {exportError && (
                <div className="flex items-center gap-3 text-severity-critical py-4">
                  <AlertCircle className="w-5 h-5" />
                  {exportError}
                </div>
              )}
              {exportData && (
                <div className="overflow-x-auto">
                  <div className="text-sm text-observatory-muted mb-2">
                    {exportData.row_count.toLocaleString()} rows · {exportData.columns.length} columns
                  </div>
                  <table className="data-table">
                    <thead>
                      <tr>
                        {exportData.columns.slice(0, 6).map((col) => (
                          <th key={col}>{col}</th>
                        ))}
                        {exportData.columns.length > 6 && (
                          <th>+{exportData.columns.length - 6} more</th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {exportData.sample.map((row, i) => (
                        <tr key={i}>
                          {exportData.columns.slice(0, 6).map((col) => (
                            <td key={col}>
                              {typeof row[col] === 'number'
                                ? row[col].toLocaleString()
                                : row[col]}
                            </td>
                          ))}
                          {exportData.columns.length > 6 && <td>...</td>}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Schema Info */}
          <div className="glass-card p-6">
            <h3 className="font-semibold mb-4">Data Schema</h3>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
              <SchemaField name="entity" type="string" description="Country or region name" />
              <SchemaField name="code" type="string" description="ISO 3-letter code" />
              <SchemaField name="year" type="integer" description="1990-2019" />
              <SchemaField name="cause" type="string" description="Cause of death" />
              <SchemaField name="deaths" type="integer" description="Number of deaths" />
              <SchemaField name="cause_category" type="string" description="NCD, Communicable, Injury" />
              <SchemaField name="pct_of_total" type="float" description="Percentage of total deaths" />
              <SchemaField name="yoy_change" type="float" description="Year-over-year change %" />
            </div>
          </div>
        </div>
      )}

      {/* Setup Tab */}
      {activeTab === 'setup' && (
        <div className="space-y-6 max-w-3xl">
          <TableauSetupStatus />

          {/* Environment variables reference */}
          <div className="glass-card p-6">
            <h3 className="font-semibold mb-4">Environment Variables (Backend)</h3>
            <p className="text-sm text-observatory-muted mb-4">
              These are configured in <code className="text-xs bg-observatory-elevated px-1 rounded">.env</code> on the server.
            </p>
            <div className="space-y-3 text-sm font-mono">
              <EnvVar name="TABLEAU_BASE_URL" value="https://10ax.online.tableau.com" />
              <EnvVar name="TABLEAU_SITE_CONTENT_URL" value="ccc-hackathon-partha" />
              <EnvVar name="TABLEAU_CLIENT_ID" value="355e090e-..." sensitive />
              <EnvVar name="TABLEAU_SECRET_ID" value="97487f0a-..." sensitive />
              <EnvVar name="TABLEAU_SECRET_VALUE" value="***" sensitive />
              <EnvVar name="TABLEAU_EMBED_USER" value="partha.samal@paramount.com" />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// =============================================================================
// Helper Components
// =============================================================================

function FeatureCard({
  icon: Icon,
  title,
  description,
  color
}: {
  icon: any
  title: string
  description: string
  color: 'blue' | 'green' | 'purple'
}) {
  const colorClasses = {
    blue: 'bg-blue-500/20 text-blue-400',
    green: 'bg-signal-500/20 text-signal-400',
    purple: 'bg-purple-500/20 text-purple-400',
  }

  return (
    <div className="p-4 bg-observatory-elevated/50 rounded-lg">
      <div className={clsx('w-10 h-10 rounded-lg flex items-center justify-center mb-3', colorClasses[color])}>
        <Icon className="w-5 h-5" />
      </div>
      <h3 className="font-semibold mb-2">{title}</h3>
      <p className="text-sm text-observatory-muted">{description}</p>
    </div>
  )
}

function FlowStep({
  step,
  title,
  description,
  icon: Icon
}: {
  step: number
  title: string
  description: string
  icon: any
}) {
  return (
    <div className="flex flex-col items-center text-center p-4">
      <div className="w-12 h-12 rounded-full bg-signal-500/20 flex items-center justify-center mb-2">
        <Icon className="w-6 h-6 text-signal-400" />
      </div>
      <div className="text-xs text-observatory-muted mb-1">Step {step}</div>
      <div className="font-semibold">{title}</div>
      <div className="text-xs text-observatory-muted">{description}</div>
    </div>
  )
}

function ExportFormatCard({
  format,
  description,
  endpoint,
  recommended = false,
  disabled = false,
}: {
  format: string
  description: string
  endpoint: string
  recommended?: boolean
  disabled?: boolean
}) {
  const handleDownload = () => {
    if (disabled) return
    window.open(endpoint, '_blank')
  }

  return (
    <div className={clsx(
      'p-4 rounded-lg border transition-all',
      disabled
        ? 'bg-observatory-elevated/30 border-observatory-border/50 opacity-60'
        : 'bg-observatory-elevated/50 border-observatory-border hover:border-signal-500/50 cursor-pointer',
      recommended && 'ring-2 ring-signal-500/50'
    )} onClick={handleDownload}>
      <div className="flex items-center gap-2 mb-2">
        <span className="font-bold">{format}</span>
        {recommended && (
          <span className="text-xs px-2 py-0.5 bg-signal-500/20 text-signal-400 rounded-full">
            Recommended
          </span>
        )}
        {disabled && (
          <span className="text-xs px-2 py-0.5 bg-observatory-border text-observatory-muted rounded-full">
            Coming Soon
          </span>
        )}
      </div>
      <p className="text-sm text-observatory-muted">{description}</p>
    </div>
  )
}

function SchemaField({
  name,
  type,
  description
}: {
  name: string
  type: string
  description: string
}) {
  return (
    <div className="p-3 bg-observatory-elevated/50 rounded-lg">
      <div className="flex items-center gap-2 mb-1">
        <span className="font-mono text-signal-400">{name}</span>
        <span className="text-xs px-1.5 py-0.5 bg-observatory-border rounded text-observatory-muted">
          {type}
        </span>
      </div>
      <p className="text-xs text-observatory-muted">{description}</p>
    </div>
  )
}

function EnvVar({
  name,
  value,
  sensitive = false,
}: {
  name: string
  value: string
  sensitive?: boolean
}) {
  return (
    <div className="flex items-center gap-4 p-3 bg-observatory-elevated rounded-lg">
      <span className="text-signal-400">{name}</span>
      <span className="text-observatory-muted">=</span>
      <span className={sensitive ? 'text-severity-warning' : 'text-observatory-text'}>
        {sensitive ? '••••••••' : value}
      </span>
      {sensitive && (
        <span className="text-xs text-severity-warning ml-auto">🔒 Secret</span>
      )}
    </div>
  )
}

/**
 * TableauEmbeddedDashboard - Embeds the actual Tableau dashboard using the Embedding API v3
 */
function TableauEmbeddedDashboard() {
  const [embedStatus, setEmbedStatus] = useState<'loading' | 'loaded' | 'error'>('loading')
  const [token, setToken] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string>('')
  const containerRef = useRef<HTMLDivElement>(null)

  // Fetch JWT token from backend for authenticated embedding
  useEffect(() => {
    const fetchToken = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/tableau/embed-token`)
        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.detail || 'Failed to get embed token')
        }
        const data = await response.json()
        setToken(data.token)
      } catch (err) {
        console.error('Token fetch error:', err)
        // Continue without token - will use public embedding
        setToken('')
      }
    }
    fetchToken()
  }, [])

  // Create the tableau-viz element when token is ready
  useEffect(() => {
    if (token === null || !containerRef.current) return

    // Clear any existing content
    containerRef.current.innerHTML = ''

    // Create the tableau-viz element
    const tableauViz = document.createElement('tableau-viz')
    tableauViz.id = 'tableau-viz-embed'
    tableauViz.setAttribute('src', 'https://10ax.online.tableau.com/t/ccc-hackathon-partha/views/GlobalOverview/Dashboard1')
    tableauViz.setAttribute('width', '100%')
    tableauViz.setAttribute('height', '700')
    tableauViz.setAttribute('toolbar', 'bottom')
    tableauViz.setAttribute('hide-tabs', 'false')

    // If we have a JWT token, add it for authenticated embedding
    if (token) {
      tableauViz.setAttribute('token', token)
    }

    // Add event listeners
    tableauViz.addEventListener('firstinteractive', () => {
      setEmbedStatus('loaded')
    })

    tableauViz.addEventListener('vizloaderror', (event: any) => {
      console.error('Tableau load error:', event.detail)
      setEmbedStatus('error')
      setErrorMessage(event.detail?.message || 'Failed to load Tableau visualization')
    })

    containerRef.current.appendChild(tableauViz)

    // Set a timeout for loading
    const timeout = setTimeout(() => {
      if (embedStatus === 'loading') {
        setEmbedStatus('loaded') // Assume loaded if no error after 10s
      }
    }, 10000)

    return () => clearTimeout(timeout)
  }, [token])

  return (
    <div className="relative min-h-[700px] bg-observatory-elevated rounded-lg overflow-hidden">
      {/* Loading state */}
      {embedStatus === 'loading' && (
        <div className="absolute inset-0 flex items-center justify-center bg-observatory-surface z-10">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-signal-400 mx-auto mb-3" />
            <p className="text-observatory-muted">Loading Tableau Dashboard...</p>
            <p className="text-xs text-observatory-muted mt-2">
              Connecting to Tableau Cloud...
            </p>
          </div>
        </div>
      )}

      {/* Error state */}
      {embedStatus === 'error' && (
        <div className="absolute inset-0 flex items-center justify-center bg-observatory-surface z-10">
          <div className="text-center max-w-md p-6">
            <AlertCircle className="w-12 h-12 text-severity-warning mx-auto mb-4" />
            <h3 className="font-semibold mb-2">Unable to Embed Dashboard</h3>
            <p className="text-sm text-observatory-muted mb-4">
              {errorMessage || 'The Tableau visualization could not be loaded. This may be due to authentication requirements.'}
            </p>
            <div className="space-y-3">
              <a
                href="https://10ax.online.tableau.com/#/site/ccc-hackathon-partha/views/GlobalOverview/Dashboard1"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary inline-flex items-center gap-2"
              >
                <ExternalLink className="w-4 h-4" />
                Open Dashboard in Tableau Cloud
              </a>
              <p className="text-xs text-observatory-muted">
                Note: You may need to log in to Tableau Cloud to view the dashboard.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* The container where Tableau viz will be rendered */}
      <div ref={containerRef} className="w-full h-[700px]" />
    </div>
  )
}

export default TableauPage
