import { Routes, Route, useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { Shell } from './components/Layout/Shell'
import { Dashboard } from './components/Dashboard/Dashboard'
import { EntityProfile } from './components/Dashboard/EntityProfile'
import { Comparison } from './components/Dashboard/Comparison'
import { ScenarioBuilder } from './components/Dashboard/ScenarioBuilder'
import { SignalFeed } from './components/Insights/SignalFeed'
import { EmbeddableDashboard } from './components/Embed/EmbeddableDashboard'
import { TableauPage } from './components/Tableau/TableauPage'
import { api } from './services/api'
import type { GlobalStats, Entity, Cause } from './services/types'

function App() {
  const location = useLocation()
  const [stats, setStats] = useState<GlobalStats | null>(null)
  const [entities, setEntities] = useState<Entity[]>([])
  const [causes, setCauses] = useState<Cause[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Check if we're on the embed route
  const isEmbed = location.pathname === '/embed'

  useEffect(() => {
    // Skip loading for embed route (it handles its own data)
    if (isEmbed) {
      setLoading(false)
      return
    }

    async function loadInitialData() {
      try {
        setLoading(true)
        const [statsData, entitiesData, causesData] = await Promise.all([
          api.getStats(),
          api.getEntities(),
          api.getCauses()
        ])
        setStats(statsData)
        setEntities(entitiesData)
        setCauses(causesData)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data')
      } finally {
        setLoading(false)
      }
    }
    loadInitialData()
  }, [isEmbed])

  // Render embed route without shell
  if (isEmbed) {
    return (
      <Routes>
        <Route path="/embed" element={<EmbeddableDashboard />} />
      </Routes>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-observatory-bg">
        <div className="glass-card p-8 max-w-md text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-severity-critical/20 flex items-center justify-center">
            <svg className="w-8 h-8 text-severity-critical" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold mb-2">Connection Error</h2>
          <p className="text-observatory-muted mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="btn-primary"
          >
            Retry Connection
          </button>
        </div>
      </div>
    )
  }

  return (
    <Shell stats={stats} loading={loading}>
      <Routes>
        <Route 
          path="/" 
          element={
            <Dashboard 
              stats={stats} 
              entities={entities} 
              causes={causes}
              loading={loading} 
            />
          } 
        />
        <Route 
          path="/entity/:entityName" 
          element={<EntityProfile entities={entities} causes={causes} />} 
        />
        <Route 
          path="/compare" 
          element={<Comparison entities={entities} causes={causes} />} 
        />
        <Route 
          path="/signals" 
          element={<SignalFeed />} 
        />
        <Route 
          path="/scenario" 
          element={<ScenarioBuilder entities={entities} causes={causes} />} 
        />
        <Route 
          path="/tableau" 
          element={<TableauPage />} 
        />
      </Routes>
    </Shell>
  )
}

export default App
