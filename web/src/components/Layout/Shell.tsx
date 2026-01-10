/**
 * =============================================================================
 * Shell Component - Main Application Layout
 * =============================================================================
 * Observatory-style dashboard shell with:
 * - Collapsible sidebar navigation
 * - Top bar with search, theme toggle, user menu
 * - Responsive layout
 * =============================================================================
 */

import { useState, useEffect, useRef, type ReactNode } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Activity,
  Globe,
  GitCompare,
  Settings,
  ChevronLeft,
  ChevronRight,
  Bell,
  Search,
  Moon,
  Sun,
  Menu,
  X,
  Heart,
  TrendingUp,
  AlertTriangle,
  Zap,
  BarChart3,
  HelpCircle,
} from 'lucide-react'
import type { GlobalStats } from '@/services/types'
import clsx from 'clsx'

interface ShellProps {
  children: ReactNode
  stats: GlobalStats | null
  loading: boolean
}

const navItems = [
  { path: '/', label: 'Observatory', icon: LayoutDashboard },
  { path: '/signals', label: 'Signal Feed', icon: Activity },
  { path: '/compare', label: 'Compare', icon: GitCompare },
  { path: '/scenario', label: 'Scenario Builder', icon: Zap },
  { path: '/tableau', label: 'Tableau Analytics', icon: BarChart3 },
]

export function Shell({ children, stats, loading }: ShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [darkMode, setDarkMode] = useState(() => {
    // Check localStorage for saved preference
    const saved = localStorage.getItem('theme')
    return saved ? saved === 'dark' : true
  })
  const [showGuide, setShowGuide] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const location = useLocation()

  // Apply theme to document
  useEffect(() => {
    const html = document.documentElement
    if (darkMode) {
      html.classList.remove('light')
      html.setAttribute('data-theme', 'dark')
      localStorage.setItem('theme', 'dark')
    } else {
      html.classList.add('light')
      html.setAttribute('data-theme', 'light')
      localStorage.setItem('theme', 'light')
    }
    // Force re-render of styles
    document.body.style.transition = 'background-color 0.3s ease, color 0.3s ease'
  }, [darkMode])

  return (
    <div className="min-h-screen bg-observatory-bg mesh-gradient">
      {/* Mobile menu overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={clsx(
          'fixed top-0 left-0 h-full bg-observatory-surface/95 backdrop-blur-xl',
          'border-r border-observatory-border z-50 transition-all duration-300',
          'flex flex-col',
          sidebarOpen ? 'w-64' : 'w-20',
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-observatory-border">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-signal-500 to-signal-700 flex items-center justify-center">
              <Heart className="w-5 h-5 text-white" />
            </div>
            {sidebarOpen && (
              <div className="animate-fade-in">
                <div className="font-display font-bold text-lg">Mortality</div>
                <div className="text-xs text-observatory-muted">Signals</div>
              </div>
            )}
          </Link>
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="lg:hidden p-2 hover:bg-observatory-elevated rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = location.pathname === item.path
            return (
              <Link
                key={item.path}
                to={item.path}
                className={clsx(
                  'nav-item',
                  isActive && 'active'
                )}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {sidebarOpen && (
                  <span className="animate-fade-in">{item.label}</span>
                )}
              </Link>
            )
          })}
        </nav>

        {/* Stats summary */}
        {sidebarOpen && stats && (
          <div className="p-4 border-t border-observatory-border animate-fade-in">
            <div className="text-xs text-observatory-muted uppercase tracking-wider mb-3">
              Data Overview
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-observatory-muted">Entities</span>
                <span className="font-medium">{stats.entity_count.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-observatory-muted">Causes</span>
                <span className="font-medium">{stats.cause_count}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-observatory-muted">Anomalies</span>
                <span className="font-medium text-severity-warning">
                  {stats.anomaly_count.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-observatory-muted">Years</span>
                <span className="font-medium">
                  {stats.year_range[0]}-{stats.year_range[1]}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Collapse button */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="hidden lg:flex items-center justify-center h-12 border-t border-observatory-border
                     text-observatory-muted hover:text-observatory-text hover:bg-observatory-elevated
                     transition-colors"
        >
          {sidebarOpen ? (
            <ChevronLeft className="w-5 h-5" />
          ) : (
            <ChevronRight className="w-5 h-5" />
          )}
        </button>
      </aside>

      {/* Main content area */}
      <div
        className={clsx(
          'transition-all duration-300',
          sidebarOpen ? 'lg:ml-64' : 'lg:ml-20'
        )}
      >
        {/* Top bar */}
        <header className="sticky top-0 z-30 h-16 bg-observatory-bg/80 backdrop-blur-xl border-b border-observatory-border">
          <div className="h-full px-4 lg:px-6 flex items-center justify-between gap-4">
            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 hover:bg-observatory-elevated rounded-lg"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Search */}
            <SearchBar />

            {/* Right side controls */}
            <div className="flex items-center gap-2">
              {/* Environment badge */}
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-signal-500/10 text-signal-400 text-xs font-medium">
                <div className="w-1.5 h-1.5 rounded-full bg-signal-500 animate-pulse" />
                LIVE
              </div>

              {/* Notifications */}
              <div className="relative">
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="relative p-2 hover:bg-observatory-elevated rounded-lg transition-colors"
                >
                  <Bell className="w-5 h-5 text-observatory-muted" />
                  {stats && stats.anomaly_count > 0 && (
                    <span className="absolute top-1 right-1 w-2 h-2 bg-severity-critical rounded-full" />
                  )}
                </button>

                {/* Notifications Dropdown */}
                {showNotifications && (
                  <div className="absolute right-0 mt-2 w-80 bg-observatory-surface border border-observatory-border rounded-lg shadow-xl z-50">
                    <div className="p-4 border-b border-observatory-border">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold">Notifications</h3>
                        <button
                          onClick={() => setShowNotifications(false)}
                          className="p-1 hover:bg-observatory-elevated rounded"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                      {stats && stats.anomaly_count > 0 ? (
                        <div className="p-4 space-y-3">
                          <div className="flex items-start gap-3 p-2 rounded-lg hover:bg-observatory-elevated">
                            <AlertTriangle className="w-5 h-5 text-severity-warning mt-0.5" />
                            <div>
                              <p className="text-sm font-medium">{stats.anomaly_count} anomalies detected</p>
                              <p className="text-xs text-observatory-muted">Across {stats.entity_count} entities</p>
                            </div>
                          </div>
                          <Link
                            to="/signals"
                            onClick={() => setShowNotifications(false)}
                            className="block text-center text-sm text-signal-400 hover:text-signal-300 py-2"
                          >
                            View all signals →
                          </Link>
                        </div>
                      ) : (
                        <div className="p-8 text-center text-observatory-muted">
                          <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">No new notifications</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Theme toggle */}
              <button
                onClick={() => setDarkMode(!darkMode)}
                className="p-2 hover:bg-observatory-elevated rounded-lg transition-colors"
              >
                {darkMode ? (
                  <Moon className="w-5 h-5 text-observatory-muted" />
                ) : (
                  <Sun className="w-5 h-5 text-observatory-muted" />
                )}
              </button>

              {/* Help Guide */}
              <button
                onClick={() => setShowGuide(true)}
                className="p-2 hover:bg-observatory-elevated rounded-lg transition-colors"
                title="Dashboard Guide"
              >
                <HelpCircle className="w-5 h-5 text-observatory-muted" />
              </button>

              {/* Settings */}
              <button
                onClick={() => setShowSettings(true)}
                className="p-2 hover:bg-observatory-elevated rounded-lg transition-colors"
              >
                <Settings className="w-5 h-5 text-observatory-muted" />
              </button>
            </div>
          </div>
        </header>

        {/* Dashboard Guide Modal */}
        {showGuide && (
          <DashboardGuide onClose={() => setShowGuide(false)} />
        )}

        {/* Settings Modal */}
        {showSettings && (
          <SettingsModal onClose={() => setShowSettings(false)} stats={stats} />
        )}

        {/* Page content */}
        <main className="p-4 lg:p-6">
          {loading ? (
            <LoadingSkeleton />
          ) : (
            children
          )}
        </main>
      </div>
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* KPI row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="glass-card p-6">
            <div className="skeleton h-4 w-24 mb-3" />
            <div className="skeleton h-8 w-32" />
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="glass-card p-6">
            <div className="skeleton h-4 w-40 mb-4" />
            <div className="skeleton h-64 w-full" />
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="glass-card p-6">
        <div className="skeleton h-4 w-48 mb-4" />
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="skeleton h-12 w-full" />
          ))}
        </div>
      </div>
    </div>
  )
}

/**
 * Dashboard Guide Modal - Explains features and Tableau integration
 */
function DashboardGuide({ onClose }: { onClose: () => void }) {
  const guides = [
    {
      title: 'Observatory',
      icon: LayoutDashboard,
      description: 'Global mortality overview with real-time KPIs, 30-year trends, and cause breakdowns. Your command center for 3.3B+ death records across 61 countries.',
      features: ['Real-time KPIs', 'Cause category pie chart', 'Interactive trend (1Y/5Y/All)', 'Quick entity access'],
    },
    {
      title: 'Signal Feed',
      icon: Activity,
      description: 'AI-powered anomaly detection using Z-score analysis. Automatically surfaces unusual mortality spikes and drops with severity levels.',
      features: ['4,500+ detected anomalies', 'Critical/Warning/Info levels', 'Entity & cause filtering', 'Trend explanations'],
    },
    {
      title: 'Compare',
      icon: GitCompare,
      description: 'Multi-entity comparison with indexed (base=100) or absolute views. Find peer countries and compare mortality trajectories.',
      features: ['Up to 6 entities', 'Indexed vs Absolute', 'Cause filtering', 'Auto-generated insights'],
    },
    {
      title: 'Scenario Builder',
      icon: Zap,
      description: 'Model "What-If" interventions. Calculate lives saved from reducing specific causes of death with historical baselines.',
      features: ['Custom reduction %', 'Multi-cause selection', 'Lives saved projections', 'Impact visualization'],
    },
    {
      title: 'Tableau Analytics',
      icon: BarChart3,
      description: 'Professional BI dashboards embedded from Tableau Cloud. Explore the Top 10 Causes, yearly trends, and export data.',
      features: ['JWT-authenticated embed', 'Interactive filters', 'Direct Tableau access', 'CSV/JSON export'],
    },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-observatory-surface border border-observatory-border rounded-xl shadow-2xl p-6 max-w-4xl w-full max-h-[85vh] overflow-y-auto animate-fade-in">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 hover:bg-observatory-elevated rounded-lg z-10"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="mb-6">
          <h2 className="text-2xl font-bold mb-2 text-gradient">Mortality Signals Dashboard Guide</h2>
          <p className="text-observatory-muted">
            AI-powered global mortality analytics platform. Analyze 30 years of death data across 61 countries with embedded Tableau Cloud dashboards.
          </p>
        </div>

        {/* Architecture Overview */}
        <div className="mb-6 p-4 bg-observatory-elevated/30 rounded-lg border border-observatory-border">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Globe className="w-5 h-5 text-signal-400" />
            Architecture Overview
          </h3>
          <div className="text-sm font-mono text-observatory-muted overflow-x-auto">
            <pre className="whitespace-pre text-xs leading-relaxed">{`
┌─────────────────────────────────────────────────────────────────────────────┐
│                           MORTALITY SIGNALS                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   ┌─────────────┐     ┌─────────────────────────────────────────────────┐   │
│   │  React UI   │────►│              FastAPI Backend                    │   │
│   │  (Vite)     │     │  /api/data     - Global stats, entities, causes │   │
│   │             │     │  /api/insights - AI anomaly detection           │   │
│   │  Observatory│     │  /api/scenario - What-if modeling               │   │
│   │  Signals    │     │  /api/clustering- Peer comparison               │   │
│   │  Compare    │     │  /api/tableau  - JWT token generation           │   │
│   │  Scenario   │     │  /api/export   - CSV/JSON for Tableau           │   │
│   └─────────────┘     └─────────────────────────────────────────────────┘   │
│          │                                    │                              │
│          │                                    ▼                              │
│          │            ┌─────────────────────────────────────────────────┐   │
│          │            │                  Data Layer                      │   │
│          │            │  Kaggle CSV → ETL Pipeline → Parquet Files       │   │
│          │            │  61 entities • 30 causes • 1990-2019             │   │
│          │            │  Anomaly scoring • Cause categorization          │   │
│          │            └─────────────────────────────────────────────────┘   │
│          │                                                                   │
│          └───────────────────────►┌─────────────────────────────────────┐   │
│           JWT Auth                │         Tableau Cloud                │   │
│                                   │  GlobalOverview/Dashboard1           │   │
│                                   │  Embedded via Tableau API v3         │   │
│                                   └─────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
`}</pre>
          </div>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {guides.map((guide) => {
            const Icon = guide.icon
            return (
              <div key={guide.title} className="flex gap-4 p-4 bg-observatory-elevated/50 rounded-lg hover:bg-observatory-elevated transition-colors">
                <div className="w-10 h-10 rounded-lg bg-signal-500/20 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-5 h-5 text-signal-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold mb-1">{guide.title}</h3>
                  <p className="text-sm text-observatory-muted mb-2">{guide.description}</p>
                  <div className="flex flex-wrap gap-1">
                    {guide.features.map((feature) => (
                      <span key={feature} className="text-xs px-2 py-0.5 bg-observatory-border rounded-full">
                        {feature}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Tableau Integration Section */}
        <div className="p-4 bg-signal-500/10 border border-signal-500/30 rounded-lg mb-6">
          <h3 className="font-semibold text-signal-400 mb-3 flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Tableau Cloud Integration
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-medium mb-2">How It Works</h4>
              <ul className="space-y-2 text-observatory-muted">
                <li className="flex items-start gap-2">
                  <span className="text-signal-400 font-mono">1.</span>
                  <span>ETL pipeline processes Kaggle data → Parquet files</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-signal-400 font-mono">2.</span>
                  <span>FastAPI serves data via REST endpoints</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-signal-400 font-mono">3.</span>
                  <span>Backend generates JWT tokens (secrets server-side only)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-signal-400 font-mono">4.</span>
                  <span>Tableau dashboards embedded via Embedding API v3</span>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">Key Endpoints</h4>
              <ul className="space-y-2 text-observatory-muted font-mono text-xs">
                <li className="p-2 bg-observatory-elevated rounded">GET /api/export/tableau-ready</li>
                <li className="p-2 bg-observatory-elevated rounded">GET /api/export/csv/main</li>
                <li className="p-2 bg-observatory-elevated rounded">GET /api/tableau/embed-token</li>
                <li className="p-2 bg-observatory-elevated rounded">GET /api/insights/signals</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Data Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className="p-3 bg-observatory-elevated rounded-lg text-center">
            <div className="text-2xl font-bold text-signal-400">61</div>
            <div className="text-xs text-observatory-muted">Entities</div>
          </div>
          <div className="p-3 bg-observatory-elevated rounded-lg text-center">
            <div className="text-2xl font-bold text-signal-400">30</div>
            <div className="text-xs text-observatory-muted">Causes</div>
          </div>
          <div className="p-3 bg-observatory-elevated rounded-lg text-center">
            <div className="text-2xl font-bold text-signal-400">30</div>
            <div className="text-xs text-observatory-muted">Years</div>
          </div>
          <div className="p-3 bg-observatory-elevated rounded-lg text-center">
            <div className="text-2xl font-bold text-severity-warning">4.5K+</div>
            <div className="text-xs text-observatory-muted">Anomalies</div>
          </div>
        </div>

        {/* Quick Tips */}
        <div className="p-4 bg-observatory-elevated/50 rounded-lg mb-4">
          <h3 className="font-semibold mb-2">Quick Tips</h3>
          <ul className="text-sm text-observatory-muted space-y-1">
            <li>• Use the <strong>search bar</strong> to find specific countries and regions</li>
            <li>• Click the <strong>moon/sun icon</strong> to toggle dark/light mode</li>
            <li>• Explore <strong>Signal Feed</strong> for AI-detected anomalies</li>
            <li>• Use <strong>Scenario Builder</strong> to model intervention impact</li>
            <li>• <strong>Tableau Analytics</strong> provides embedded professional dashboards</li>
          </ul>
        </div>

        <div className="flex justify-end gap-3">
          <a
            href="https://10ax.online.tableau.com/#/site/ccc-hackathon-partha/views/GlobalOverview/Dashboard1"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary flex items-center gap-2"
          >
            <BarChart3 className="w-4 h-4" />
            Open Tableau
          </a>
          <button onClick={onClose} className="btn-primary">
            Get Started
          </button>
        </div>
      </div>
    </div>
  )
}

/**
 * Settings Modal Component
 */
function SettingsModal({ onClose, stats }: { onClose: () => void; stats: GlobalStats | null }) {
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || ''

  const handleExportData = async (format: 'csv' | 'json') => {
    const url = format === 'csv'
      ? `${apiBaseUrl}/api/export/csv/main`
      : `${apiBaseUrl}/api/export/tableau-ready`
    window.open(url, '_blank')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative glass-card p-6 max-w-lg w-full animate-fade-in">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 hover:bg-observatory-elevated rounded-lg"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="mb-6">
          <h2 className="text-2xl font-bold mb-2 flex items-center gap-2">
            <Settings className="w-6 h-6" />
            Settings
          </h2>
          <p className="text-observatory-muted">
            Application configuration and data export options.
          </p>
        </div>

        {/* Data Export Section */}
        <div className="space-y-4 mb-6">
          <h3 className="font-semibold text-signal-400">Export Data</h3>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => handleExportData('csv')}
              className="btn-secondary flex items-center gap-2"
            >
              <TrendingUp className="w-4 h-4" />
              Export CSV
            </button>
            <button
              onClick={() => handleExportData('json')}
              className="btn-secondary flex items-center gap-2"
            >
              <Activity className="w-4 h-4" />
              Export JSON
            </button>
          </div>
        </div>

        {/* API Info Section */}
        <div className="space-y-4 mb-6">
          <h3 className="font-semibold text-signal-400">API Endpoints</h3>
          <div className="space-y-2 text-sm">
            <div className="p-3 bg-observatory-elevated rounded-lg">
              <code className="text-xs">/api/data/entities</code>
              <p className="text-observatory-muted mt-1">List all entities</p>
            </div>
            <div className="p-3 bg-observatory-elevated rounded-lg">
              <code className="text-xs">/api/data/timeseries</code>
              <p className="text-observatory-muted mt-1">Get mortality timeseries</p>
            </div>
            <div className="p-3 bg-observatory-elevated rounded-lg">
              <code className="text-xs">/api/export/tableau-ready</code>
              <p className="text-observatory-muted mt-1">Tableau-optimized data export</p>
            </div>
          </div>
        </div>

        {/* Data Stats */}
        {stats && (
          <div className="space-y-4 mb-6">
            <h3 className="font-semibold text-signal-400">Current Data</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-observatory-elevated rounded-lg text-center">
                <div className="text-2xl font-bold">{stats.entity_count}</div>
                <div className="text-xs text-observatory-muted">Entities</div>
              </div>
              <div className="p-3 bg-observatory-elevated rounded-lg text-center">
                <div className="text-2xl font-bold">{stats.cause_count}</div>
                <div className="text-xs text-observatory-muted">Causes</div>
              </div>
              <div className="p-3 bg-observatory-elevated rounded-lg text-center">
                <div className="text-2xl font-bold">{stats.year_range[1] - stats.year_range[0]}</div>
                <div className="text-xs text-observatory-muted">Years of Data</div>
              </div>
              <div className="p-3 bg-observatory-elevated rounded-lg text-center">
                <div className="text-2xl font-bold text-severity-warning">{stats.anomaly_count}</div>
                <div className="text-xs text-observatory-muted">Anomalies</div>
              </div>
            </div>
          </div>
        )}

        {/* About Section */}
        <div className="p-4 bg-signal-500/10 border border-signal-500/30 rounded-lg">
          <h3 className="font-semibold text-signal-400 mb-2">About Mortality Signals</h3>
          <p className="text-sm text-observatory-muted">
            Powered by AI-driven anomaly detection and Tableau Cloud integration.
            Built for the 2026 Tableau Hackathon.
          </p>
          <div className="mt-2 text-xs text-observatory-muted">
            Version 1.0.0 | Data: 1990-2019
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="btn-primary">
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

/**
 * Search Bar Component - Functional search across entities
 */
function SearchBar() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Array<{ entity: string; code: string }>>([])
  const [showResults, setShowResults] = useState(false)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)
  const resultsRef = useRef<HTMLDivElement>(null)

  // Search entities as user types
  useEffect(() => {
    if (query.length < 2) {
      setResults([])
      return
    }

    const searchEntities = async () => {
      setLoading(true)
      try {
        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || ''}/api/data/entities?q=${encodeURIComponent(query)}&limit=10`)
        if (response.ok) {
          const data = await response.json()
          setResults(data)
        }
      } catch (err) {
        console.error('Search error:', err)
      } finally {
        setLoading(false)
      }
    }

    const debounce = setTimeout(searchEntities, 300)
    return () => clearTimeout(debounce)
  }, [query])

  // Handle clicking outside to close results
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        inputRef.current && !inputRef.current.contains(e.target as Node) &&
        resultsRef.current && !resultsRef.current.contains(e.target as Node)
      ) {
        setShowResults(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSelect = (entity: string) => {
    navigate(`/entity/${encodeURIComponent(entity)}`)
    setQuery('')
    setShowResults(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && results.length > 0) {
      handleSelect(results[0].entity)
    }
    if (e.key === 'Escape') {
      setShowResults(false)
    }
  }

  return (
    <div className="flex-1 max-w-xl relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-observatory-muted" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setShowResults(true)
          }}
          onFocus={() => setShowResults(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search countries & regions..."
          className="input-field pl-10 py-2"
        />
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="w-4 h-4 border-2 border-signal-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>

      {/* Search Results Dropdown */}
      {showResults && results.length > 0 && (
        <div
          ref={resultsRef}
          className="absolute top-full left-0 right-0 mt-2 glass-card shadow-xl z-50 max-h-64 overflow-y-auto"
        >
          {results.map((result) => (
            <button
              key={result.code}
              onClick={() => handleSelect(result.entity)}
              className="w-full px-4 py-3 flex items-center gap-3 hover:bg-observatory-elevated transition-colors text-left"
            >
              <Globe className="w-4 h-4 text-signal-400 flex-shrink-0" />
              <div>
                <div className="font-medium">{result.entity}</div>
                <div className="text-xs text-observatory-muted">{result.code}</div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* No results */}
      {showResults && query.length >= 2 && !loading && results.length === 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 glass-card shadow-xl z-50 p-4">
          <div className="text-center text-observatory-muted mb-2">
            No entities found for "{query}"
          </div>
          <div className="text-xs text-observatory-muted text-center">
            💡 Tip: This search finds countries and regions. Use the{' '}
            <span className="text-signal-400">Signal Feed</span> to explore causes and anomalies.
          </div>
        </div>
      )}
    </div>
  )
}
