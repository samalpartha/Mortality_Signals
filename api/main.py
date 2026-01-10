"""
=============================================================================
MORTALITY SIGNALS - FastAPI Backend
=============================================================================
Production-grade API providing:
- Data endpoints for mortality statistics
- Tableau Cloud JWT authentication
- AI-powered insights and anomaly detection
- Forecasting and scenario modeling

Security: All Tableau credentials are server-side only.
=============================================================================
"""

import os
from contextlib import asynccontextmanager
from pathlib import Path

# Load environment variables from .env file
from dotenv import load_dotenv
env_path = Path(__file__).parent.parent / ".env"
load_dotenv(env_path)

import pandas as pd
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from routers import data, tableau, insights, scenario, clustering, export

# =============================================================================
# Configuration
# =============================================================================


# Handle both container and local paths
if Path("/app/data/processed").exists():
    DATA_DIR = Path("/app/data/processed")
    ENRICHED_DIR = Path("/app/data/enriched")
else:
    # Fallback to local relative path (assuming running from api/ directory or root)
    DATA_DIR = Path(__file__).parent.parent / "data" / "processed"
    ENRICHED_DIR = Path(__file__).parent.parent / "data" / "enriched"

print(f"DEBUG: Calculated DATA_DIR: {DATA_DIR} (Exists: {DATA_DIR.exists()})")


# Global data store (loaded at startup)
data_store = {}


def load_data():
    """Load all data files into memory for fast queries."""
    print("Loading data files...")
    
    # Main dataset
    main_path = DATA_DIR / "cause_deaths_long.parquet"
    if main_path.exists():
        data_store["main"] = pd.read_parquet(main_path)
        print(f"  ✓ Main dataset: {len(data_store['main']):,} rows")
    else:
        print(f"  ⚠ Main dataset not found: {main_path}")
        # Create empty DataFrame with expected schema
        data_store["main"] = pd.DataFrame(columns=[
            "entity", "code", "year", "cause", "deaths",
            "cause_category", "yoy_change", "yoy_pct",
            "rolling_avg", "rolling_std", "anomaly_score", "is_anomaly"
        ])
    
    # Aggregations
    for agg_name in ["global_by_year", "entity_by_year", "cause_by_year", "anomalies"]:
        agg_path = DATA_DIR / f"{agg_name}.parquet"
        if agg_path.exists():
            data_store[agg_name] = pd.read_parquet(agg_path)
            print(f"  ✓ {agg_name}: {len(data_store[agg_name]):,} rows")
    
    # Enriched dataset (if available)
    enriched_path = ENRICHED_DIR / "cause_deaths_enriched.parquet"
    if enriched_path.exists():
        data_store["enriched"] = pd.read_parquet(enriched_path)
        print(f"  ✓ Enriched dataset: {len(data_store['enriched']):,} rows")
    
    print("Data loading complete.")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler."""
    # Startup
    load_data()
    yield
    # Shutdown
    data_store.clear()


# =============================================================================
# Application Setup
# =============================================================================

app = FastAPI(
    title="Mortality Signals API",
    description="AI-powered global mortality analytics platform",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "https://mortality-signals-web-108816008638.us-central1.run.app",
        "https://ccc-tableau-cloud-108816008638.us-central1.run.app"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =============================================================================
# Health & Status Endpoints
# =============================================================================

@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "data_loaded": len(data_store) > 0,
        "datasets": list(data_store.keys()),
    }


@app.get("/")
async def root():
    """Root endpoint with API info."""
    return {
        "name": "Mortality Signals API",
        "version": "1.0.0",
        "description": "AI-powered global mortality analytics",
        "endpoints": {
            "health": "/health",
            "docs": "/docs",
            "data": "/api/data/*",
            "tableau": "/api/tableau/*",
            "insights": "/api/insights/*",
        }
    }


# =============================================================================
# Include Routers
# =============================================================================

app.include_router(data.router, prefix="/api/data", tags=["Data"])
app.include_router(tableau.router, prefix="/api/tableau", tags=["Tableau"])
app.include_router(insights.router, prefix="/api/insights", tags=["Insights"])
app.include_router(scenario.router, prefix="/api/scenario", tags=["Scenario"])
app.include_router(clustering.router, prefix="/api/clustering", tags=["Clustering"])
app.include_router(export.router, prefix="/api/export", tags=["Export"])


# =============================================================================
# Error Handlers
# =============================================================================

@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    """Global exception handler."""
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal server error",
            "detail": str(exc) if os.getenv("DEBUG") else "An error occurred"
        }
    )


# =============================================================================
# Data Store Access (for routers)
# =============================================================================

def get_data_store():
    """Get the global data store."""
    return data_store


# Export for routers
__all__ = ["app", "get_data_store"]
