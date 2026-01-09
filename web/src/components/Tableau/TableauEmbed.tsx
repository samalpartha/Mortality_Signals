/**
 * =============================================================================
 * Tableau Embed Component - Tableau Cloud Dashboard Embedding
 * =============================================================================
 * Embeds Tableau Cloud dashboards using the Embedding API v3.
 * 
 * Requirements:
 * 1. Tableau Cloud account with Connected App configured
 * 2. Backend configured with TABLEAU_* environment variables
 * 3. Workbooks published to Tableau Cloud
 * 
 * Security: JWT tokens are generated server-side. No secrets in browser.
 * =============================================================================
 */

import { useEffect, useRef, useState } from 'react'
import { Loader2, AlertTriangle, ExternalLink } from 'lucide-react'
import clsx from 'clsx'

const API_BASE = import.meta.env.VITE_API_BASE_URL || ''

// Tableau Embedding API types
declare global {
  namespace tableau {
    class TableauViz extends HTMLElement {
      src: string
      token?: string
      toolbar?: string
      hideTabs?: boolean
      width?: string
      height?: string
    }
  }
}

interface TableauEmbedProps {
  dashboardId: string
  entity?: string
  cause?: string
  year?: number
  height?: string
  showToolbar?: boolean
  className?: string
}

interface TableauConfig {
  base_url: string
  site_content_url: string
  configured: boolean
}

interface EmbedToken {
  token: string
  expires_at: string
  embed_url: string
}

export function TableauEmbed({
  dashboardId,
  entity,
  cause,
  year,
  height = '600px',
  showToolbar = false,
  className,
}: TableauEmbedProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [config, setConfig] = useState<TableauConfig | null>(null)
  const [embedUrl, setEmbedUrl] = useState<string | null>(null)

  // Load Tableau configuration
  useEffect(() => {
    async function loadConfig() {
      try {
        const response = await fetch(`${API_BASE}/api/tableau/config`)
        const data = await response.json()
        setConfig(data)

        if (!data.configured) {
          setError('Tableau integration not configured. Set TABLEAU_* environment variables.')
          setLoading(false)
        }
      } catch (err) {
        setError('Failed to load Tableau configuration')
        setLoading(false)
      }
    }
    loadConfig()
  }, [])

  // Get embed URL
  useEffect(() => {
    if (!config?.configured) return

    async function getEmbedUrl() {
      try {
        const params = new URLSearchParams({ dashboard_id: dashboardId })
        if (entity) params.set('entity', entity)
        if (cause) params.set('cause', cause)
        if (year) params.set('year', String(year))

        const response = await fetch(`${API_BASE}/api/tableau/embed-url?${params}`)
        const data = await response.json()
        setEmbedUrl(data.embed_url)
      } catch (err) {
        setError('Failed to get embed URL')
      }
    }
    getEmbedUrl()
  }, [config, dashboardId, entity, cause, year])

  // Initialize Tableau viz
  useEffect(() => {
    if (!embedUrl || !containerRef.current) return

    async function initViz() {
      try {
        // Load Tableau Embedding API if not already loaded
        if (!customElements.get('tableau-viz')) {
          await loadTableauAPI()
        }

        // Get embed token from backend
        const tokenResponse = await fetch(`${API_BASE}/api/tableau/embed-token`)

        if (!tokenResponse.ok) {
          throw new Error('Failed to get embed token')
        }

        const tokenData: EmbedToken = await tokenResponse.json()

        // Clear container
        if (containerRef.current) {
          containerRef.current.innerHTML = ''
        }

        // Create tableau-viz element
        const viz = document.createElement('tableau-viz') as tableau.TableauViz
        viz.src = embedUrl!
        viz.token = tokenData.token
        viz.toolbar = showToolbar ? 'top' : 'hidden'
        viz.hideTabs = true
        viz.style.width = '100%'
        viz.style.height = height

        containerRef.current?.appendChild(viz)
        setLoading(false)
      } catch (err) {
        console.error('Tableau embed error:', err)
        setError(err instanceof Error ? err.message : 'Failed to load Tableau dashboard')
        setLoading(false)
      }
    }

    initViz()
  }, [embedUrl, height, showToolbar])

  // Render loading state
  if (loading) {
    return (
      <div
        className={clsx('glass-card flex items-center justify-center', className)}
        style={{ height }}
      >
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-signal-400 mx-auto mb-3" />
          <p className="text-observatory-muted">Loading Tableau dashboard...</p>
        </div>
      </div>
    )
  }

  // Render error state
  if (error) {
    return (
      <div
        className={clsx('glass-card flex items-center justify-center', className)}
        style={{ height }}
      >
        <div className="text-center max-w-md">
          <AlertTriangle className="w-12 h-12 text-severity-warning mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Tableau Not Connected</h3>
          <p className="text-observatory-muted mb-4">{error}</p>
          <div className="space-y-2">
            <a
              href="/docs/tableau-setup"
              className="btn-secondary inline-flex items-center gap-2"
            >
              Setup Guide <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>
    )
  }

  // Render Tableau container
  return (
    <div
      ref={containerRef}
      className={clsx('glass-card overflow-hidden', className)}
      style={{ height }}
    />
  )
}

/**
 * Load Tableau Embedding API v3 dynamically
 */
async function loadTableauAPI(): Promise<void> {
  return new Promise((resolve, reject) => {
    // Check if already loaded
    if (customElements.get('tableau-viz')) {
      resolve()
      return
    }

    const script = document.createElement('script')
    script.type = 'module'
    script.src = 'https://embedding.tableauusercontent.com/tableau.embedding.3.latest.min.js'

    script.onload = () => {
      // Wait for custom element to be defined
      customElements.whenDefined('tableau-viz').then(() => resolve())
    }

    script.onerror = () => reject(new Error('Failed to load Tableau Embedding API'))

    document.head.appendChild(script)
  })
}

// =============================================================================
// Tableau Dashboard Gallery Component
// =============================================================================

interface Dashboard {
  id: string
  name: string
  description: string
  embed_path: string
}

export function TableauDashboardGallery() {
  const [dashboards, setDashboards] = useState<Dashboard[]>([])
  const [selectedDashboard, setSelectedDashboard] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadDashboards() {
      try {
        const response = await fetch(`${API_BASE}/api/tableau/dashboards`)
        const data = await response.json()
        setDashboards(data)
        if (data.length > 0) {
          setSelectedDashboard(data[0].id)
        }
      } catch (err) {
        console.error('Failed to load dashboards:', err)
      } finally {
        setLoading(false)
      }
    }
    loadDashboards()
  }, [])

  if (loading) {
    return (
      <div className="glass-card p-8 text-center">
        <Loader2 className="w-8 h-8 animate-spin text-signal-400 mx-auto" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Dashboard selector */}
      <div className="flex flex-wrap gap-2">
        {dashboards.map((dash) => (
          <button
            key={dash.id}
            onClick={() => setSelectedDashboard(dash.id)}
            className={clsx(
              'px-4 py-2 rounded-lg text-sm font-medium transition-all',
              selectedDashboard === dash.id
                ? 'bg-signal-500/20 text-signal-400 border border-signal-500/30'
                : 'bg-observatory-elevated text-observatory-muted hover:text-observatory-text'
            )}
          >
            {dash.name}
          </button>
        ))}
      </div>

      {/* Selected dashboard description */}
      {selectedDashboard && (
        <div className="text-sm text-observatory-muted">
          {dashboards.find(d => d.id === selectedDashboard)?.description}
        </div>
      )}

      {/* Embedded dashboard */}
      {selectedDashboard && (
        <TableauEmbed
          dashboardId={selectedDashboard}
          height="700px"
          showToolbar={true}
        />
      )}
    </div>
  )
}

// =============================================================================
// Tableau Setup Status Component
// =============================================================================

export function TableauSetupStatus() {
  const [status, setStatus] = useState<{
    status: string
    configured: boolean
    issues: string[] | null
    base_url: string
  } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function checkHealth() {
      try {
        const response = await fetch(`${API_BASE}/api/tableau/health`)
        const data = await response.json()
        setStatus(data)
      } catch (err) {
        setStatus({
          status: 'error',
          configured: false,
          issues: ['Failed to connect to API'],
          base_url: '',
        })
      } finally {
        setLoading(false)
      }
    }
    checkHealth()
  }, [])

  if (loading) {
    return <div className="animate-pulse h-24 bg-observatory-elevated rounded-lg" />
  }

  return (
    <div className={clsx(
      'glass-card p-6',
      status?.configured ? 'border-signal-500/30' : 'border-severity-warning/30'
    )}>
      <div className="flex items-start gap-4">
        <div className={clsx(
          'w-10 h-10 rounded-full flex items-center justify-center',
          status?.configured ? 'bg-signal-500/20' : 'bg-severity-warning/20'
        )}>
          {status?.configured ? (
            <div className="w-3 h-3 rounded-full bg-signal-500" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-severity-warning" />
          )}
        </div>

        <div className="flex-1">
          <h3 className="font-semibold mb-1">
            Tableau Integration: {status?.configured ? 'Connected' : 'Not Configured'}
          </h3>

          {status?.base_url && (
            <p className="text-sm text-observatory-muted mb-2">
              Base URL: {status.base_url}
            </p>
          )}

          {status?.issues && status.issues.length > 0 && (
            <ul className="text-sm text-severity-warning space-y-1">
              {status.issues.map((issue, i) => (
                <li key={i}>• {issue}</li>
              ))}
            </ul>
          )}

          {!status?.configured && (
            <div className="mt-4 p-3 bg-observatory-elevated rounded-lg text-sm">
              <p className="font-medium mb-2">To configure Tableau Cloud:</p>
              <ol className="list-decimal list-inside space-y-1 text-observatory-muted">
                <li>Create a Connected App in Tableau Cloud</li>
                <li>Set environment variables (TABLEAU_CLIENT_ID, etc.)</li>
                <li>Restart the API server</li>
              </ol>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
