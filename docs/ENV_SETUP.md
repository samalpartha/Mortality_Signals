# Environment Configuration

## Quick Setup

Create a `.env` file in the project root with these values:

```bash
# =============================================================================
# Mortality Signals - Environment Configuration
# =============================================================================

# -----------------------------------------------------------------------------
# Tableau Cloud Configuration (YOUR VALUES)
# -----------------------------------------------------------------------------
TABLEAU_BASE_URL=https://10ax.online.tableau.com
TABLEAU_SITE_CONTENT_URL=ccc-hackathon-partha
TABLEAU_CLIENT_ID=355e090e-ea5a-49dd-b6d6-5618092d5dd6
TABLEAU_SECRET_ID=97487f0a-0458-42f7-b566-6a69753caeed

# ⚠️ ADD YOUR SECRET VALUE HERE (from Tableau Cloud Connected App)
TABLEAU_SECRET_VALUE=paste-your-secret-value-here

# Tableau user for embedding
TABLEAU_EMBED_USER=partha.samal@paramount.com
TABLEAU_EMBED_TOKEN_EXPIRY_MINUTES=10

# -----------------------------------------------------------------------------
# API Configuration
# -----------------------------------------------------------------------------
API_HOST=0.0.0.0
API_PORT=8000
DEBUG=true
DATA_PATH=./data/processed/cause_deaths_long.parquet

# -----------------------------------------------------------------------------
# CORS
# -----------------------------------------------------------------------------
CORS_ORIGINS=http://localhost:5173,http://localhost:3000
```

## Getting Your Secret Value

1. Go to [Tableau Cloud](https://10ax.online.tableau.com/#/site/ccc-hackathon-partha/home)
2. Click **Settings** (gear icon) → **Connected Apps**
3. Find "Counterfactual Command Center"
4. Go to the **Secrets** tab
5. If you have an existing secret, use that value
6. If not, click **Generate New Secret** and copy the value immediately

⚠️ **IMPORTANT**: The Secret Value is only shown once when created!

## Verify Configuration

After creating your `.env` file, test the connection:

```bash
# Start the API
cd api
uvicorn main:app --reload --port 8000

# In another terminal, test Tableau health
curl http://localhost:8000/api/tableau/health
```

Expected response:
```json
{
  "status": "healthy",
  "configured": true,
  "issues": null,
  "base_url": "https://10ax.online.tableau.com"
}
```
