# Mortality Signals - Architecture Documentation

## Overview

Mortality Signals is an AI-powered global mortality analytics platform that combines:
- **Data ETL Pipeline** for processing WHO/Kaggle mortality data
- **FastAPI Backend** providing REST APIs for data access and insights
- **React Frontend** with modern observatory-style UI
- **Tableau Cloud Integration** for advanced visualizations (optional)

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              MORTALITY SIGNALS                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌──────────────┐     ┌──────────────┐     ┌──────────────────────────┐   │
│   │   Frontend   │     │   Backend    │     │      Data Layer          │   │
│   │   (React)    │────▶│   (FastAPI)  │────▶│                          │   │
│   │              │     │              │     │  ┌──────────────────┐    │   │
│   │ • Dashboard  │     │ • /api/data  │     │  │ ETL Pipeline     │    │   │
│   │ • Signals    │     │ • /api/insights│   │  │ (Python)         │    │   │
│   │ • Compare    │     │ • /api/tableau│   │  └────────┬─────────┘    │   │
│   │ • Entity     │     │              │     │           │              │   │
│   │   Profile    │     │              │     │  ┌────────▼─────────┐    │   │
│   └──────────────┘     └──────────────┘     │  │ Parquet Files    │    │   │
│                                             │  │ (Processed Data) │    │   │
│                                             │  └──────────────────┘    │   │
│                                             └──────────────────────────┘   │
│                                                                             │
│   ┌─────────────────────────────────────────────────────────────────────┐  │
│   │                    Optional: Tableau Cloud                          │  │
│   │   • Embedded dashboards via Embedding API v3                        │  │
│   │   • Server-side JWT authentication (secrets never exposed)          │  │
│   └─────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Component Details

### 1. Frontend (React + TypeScript + Vite)

**Location:** `web/`

**Key Features:**
- Observatory-style dark theme UI
- Real-time signal feed for anomaly alerts
- Interactive charts (Recharts)
- Entity comparison tools
- Responsive design

**Tech Stack:**
- React 18 with TypeScript
- Vite for fast development/builds
- TailwindCSS for styling
- Recharts for visualizations
- React Router for navigation
- Lucide for icons

**Security:**
- No secrets stored in frontend
- API calls proxied through BFF pattern
- Environment variables prefixed with `VITE_` only

### 2. Backend (FastAPI)

**Location:** `api/`

**Routers:**
- `/api/data` - Mortality data endpoints
- `/api/insights` - AI-powered anomaly detection
- `/api/tableau` - Tableau Cloud integration

**Key Features:**
- Async request handling
- In-memory data caching at startup
- Pydantic response models
- CORS configuration
- Error handling middleware

**Data Endpoints:**
```
GET /api/data/entities       - List all entities
GET /api/data/causes         - List all causes
GET /api/data/timeseries     - Time series data
GET /api/data/top-causes     - Top causes for entity/year
GET /api/data/global-trend   - Global death trends
GET /api/data/entity-profile - Detailed entity analysis
GET /api/data/compare        - Multi-entity comparison
```

**Insights Endpoints:**
```
GET /api/insights/signals    - Anomaly signal feed
GET /api/insights/anomaly/*  - Anomaly detail
GET /api/insights/trends     - Trend analysis
GET /api/insights/forecast   - Simple forecasting
GET /api/insights/summary    - Dashboard summary
```

### 3. ETL Pipeline

**Location:** `etl/`

**Pipeline Steps:**
1. Load raw CSV from Kaggle dataset
2. Clean and normalize column names
3. Reshape wide-to-long format
4. Add cause category classification
5. Calculate derived metrics:
   - Year-over-year changes
   - Rolling averages
   - Anomaly scores (Z-score based)
6. Create aggregations
7. Save to Parquet format

**Output Files:**
- `cause_deaths_long.parquet` - Main dataset
- `global_by_year.parquet` - Global aggregations
- `entity_by_year.parquet` - Entity aggregations
- `cause_by_year.parquet` - Cause aggregations
- `anomalies.parquet` - Top anomalies

### 4. Tableau Integration (Optional)

**Security Model:**
- Connected App credentials stored server-side only
- JWT tokens generated on-demand
- Short-lived embed tokens (10 min default)
- No secrets exposed to browser

**Flow:**
1. Frontend requests embed URL from backend
2. Backend generates JWT with appropriate scopes
3. Backend returns parameterized embed URL
4. Frontend loads Tableau Embedding API v3
5. Dashboard renders with user context

## Data Flow

```
Kaggle Dataset (CSV)
        │
        ▼
   ETL Pipeline
   (Python/Pandas)
        │
        ▼
   Parquet Files
   (data/processed/)
        │
        ▼
   FastAPI Backend
   (loads at startup)
        │
        ├──────────────────┬─────────────────┐
        ▼                  ▼                 ▼
   Data Endpoints    Insights Engine    Tableau JWT
        │                  │                 │
        └──────────────────┴─────────────────┘
                           │
                           ▼
                    React Frontend
                    (visualizations)
```

## Security Considerations

### Secrets Management
- All secrets in `.env` files (never committed)
- Production: use cloud secret managers
- Tableau credentials server-side only

### API Security
- CORS restricted to allowed origins
- Rate limiting recommended for production
- Input validation via Pydantic
- Error messages sanitized in production

### Data Security
- Read-only data access
- No PII in mortality dataset
- Aggregated statistics only

## Deployment Options

### Docker Compose (Development)
```bash
docker compose up --build
```

### Production
1. Build frontend: `npm run build`
2. Serve static files via nginx
3. Run API behind reverse proxy
4. Configure HTTPS (required for Tableau)
5. Set up monitoring/logging

## Performance Considerations

- Data loaded into memory at startup
- Parquet format for fast reads
- Pre-computed aggregations
- Frontend caching for repeated queries
- Lazy loading for charts

## Future Enhancements

1. **Real-time Data Pipeline**
   - Stream processing for live updates
   - Kafka/Flink integration

2. **Advanced ML Models**
   - Time series forecasting (Prophet/ARIMA)
   - Clustering for entity similarity
   - Root cause analysis

3. **User Management**
   - Authentication (OIDC)
   - Saved views/favorites
   - Alert subscriptions

4. **Tableau Deep Integration**
   - Custom extensions
   - Write-back capabilities
   - Pulse integration
