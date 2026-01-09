/**
 * =============================================================================
 * Tableau Iframe Embed - Simple & Reliable
 * =============================================================================
 * Uses iframe embedding for maximum compatibility.
 * This is the recommended approach for hackathon demos.
 * =============================================================================
 */

import { useState } from 'react'
import { ExternalLink, Maximize2, Minimize2, RefreshCw } from 'lucide-react'

interface TableauIframeProps {
  title?: string
  // Set to true if using Tableau Public (no auth required)
  usePublic?: boolean
  // Tableau Public URL (if using public)
  publicUrl?: string
}

export function TableauIframe({ 
  title = "Global Overview",
  usePublic = false,
  publicUrl = ""
}: TableauIframeProps) {
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // Tableau Cloud URL (requires authentication)
  const cloudUrl = "https://10ax.online.tableau.com/t/ccc-hackathon-partha/views/GlobalOverview/Dashboard1?:embed=y&:showVizHome=no&:toolbar=top"
  
  // Use Public URL if provided, otherwise use Cloud URL
  const tableauUrl = usePublic && publicUrl ? publicUrl : cloudUrl

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">{title}</h2>
          <p className="text-observatory-muted">Interactive Tableau Cloud Dashboard</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsLoading(true)}
            className="btn-secondary flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="btn-secondary flex items-center gap-2"
          >
            {isFullscreen ? (
              <>
                <Minimize2 className="w-4 h-4" />
                Exit Fullscreen
              </>
            ) : (
              <>
                <Maximize2 className="w-4 h-4" />
                Fullscreen
              </>
            )}
          </button>
          <a
            href={tableauUrl.replace('?:embed=y&:showVizHome=no&:toolbar=top', '')}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary flex items-center gap-2"
          >
            <ExternalLink className="w-4 h-4" />
            Open in Tableau
          </a>
        </div>
      </div>

      {/* Iframe Container */}
      <div 
        className={`glass-card overflow-hidden transition-all duration-300 ${
          isFullscreen ? 'fixed inset-4 z-50' : ''
        }`}
      >
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-observatory-bg/80 z-10">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-signal-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-observatory-muted">Loading Tableau Dashboard...</p>
            </div>
          </div>
        )}
        
        <iframe
          src={tableauUrl}
          width="100%"
          height={isFullscreen ? "100%" : "800px"}
          frameBorder="0"
          allowFullScreen
          onLoad={() => setIsLoading(false)}
          className="bg-white rounded-lg"
          title="Tableau Dashboard"
        />
      </div>

      {/* Fullscreen overlay close button */}
      {isFullscreen && (
        <button
          onClick={() => setIsFullscreen(false)}
          className="fixed top-6 right-6 z-50 btn-secondary"
        >
          <Minimize2 className="w-5 h-5" />
        </button>
      )}
    </div>
  )
}

export default TableauIframe
