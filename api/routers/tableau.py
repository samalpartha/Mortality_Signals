"""
=============================================================================
Tableau Router - Secure Tableau Cloud Integration
=============================================================================
Handles Tableau Cloud authentication and embedding:
- JWT token generation for connected apps
- Embed URL generation
- Dashboard metadata

SECURITY: All credentials are server-side only. Never exposed to client.
=============================================================================
"""

import os
import time
import uuid
from datetime import datetime, timedelta
from typing import Optional

import jwt
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

# =============================================================================
# Router Setup
# =============================================================================

router = APIRouter()


# =============================================================================
# Configuration
# =============================================================================

def get_tableau_config():
    """Get Tableau configuration from environment."""
    return {
        "base_url": os.getenv("TABLEAU_BASE_URL", "https://sso.online.tableau.com"),
        "site_content_url": os.getenv("TABLEAU_SITE_CONTENT_URL", ""),
        "client_id": os.getenv("TABLEAU_CLIENT_ID", ""),
        "secret_id": os.getenv("TABLEAU_SECRET_ID", ""),
        "secret_value": os.getenv("TABLEAU_SECRET_VALUE", ""),
        "token_expiry_minutes": int(os.getenv("TABLEAU_EMBED_TOKEN_EXPIRY_MINUTES", "10")),
    }


# =============================================================================
# Response Models
# =============================================================================

class EmbedTokenResponse(BaseModel):
    token: str
    expires_at: datetime
    embed_url: str


class DashboardInfo(BaseModel):
    id: str
    name: str
    description: str
    embed_path: str


# =============================================================================
# JWT Token Generation
# =============================================================================

def generate_tableau_jwt(
    username: str,
    config: dict,
    scopes: list = None
) -> tuple[str, datetime]:
    """
    Generate a JWT token for Tableau Connected App authentication.
    
    Args:
        username: The Tableau user to authenticate as
        config: Tableau configuration dict
        scopes: Optional list of scopes
    
    Returns:
        Tuple of (token, expiry_datetime)
    """
    if not all([config["client_id"], config["secret_id"], config["secret_value"]]):
        raise HTTPException(
            status_code=500,
            detail="Tableau credentials not configured. Check environment variables."
        )
    
    # Token expiry
    exp_minutes = config["token_expiry_minutes"]
    exp_time = datetime.utcnow() + timedelta(minutes=exp_minutes)
    
    # JWT payload per Tableau Connected App spec
    payload = {
        "iss": config["client_id"],
        "exp": exp_time,
        "jti": str(uuid.uuid4()),
        "aud": "tableau",
        "sub": username,
        "scp": scopes or ["tableau:views:embed", "tableau:views:embed_authoring"],
    }
    
    # JWT headers
    headers = {
        "kid": config["secret_id"],
        "iss": config["client_id"],
    }
    
    # Generate token
    token = jwt.encode(
        payload,
        config["secret_value"],
        algorithm="HS256",
        headers=headers
    )
    
    return token, exp_time


# =============================================================================
# Endpoints
# =============================================================================

@router.get("/config")
async def get_public_config():
    """
    Get public Tableau configuration (no secrets).
    """
    config = get_tableau_config()
    
    return {
        "base_url": config["base_url"],
        "site_content_url": config["site_content_url"],
        "configured": bool(config["client_id"] and config["secret_id"]),
    }


@router.get("/embed-token", response_model=EmbedTokenResponse)
async def generate_embed_token(
    username: str = Query(
        default=os.getenv("TABLEAU_EMBED_USER", "partha.samal@paramount.com"),
        description="Tableau username"
    ),
    view_path: Optional[str] = Query(None, description="View path to embed")
):
    """
    Generate a JWT token for embedding Tableau dashboards.
    
    This token is short-lived and scoped to embedding only.
    """
    config = get_tableau_config()
    
    try:
        token, expiry = generate_tableau_jwt(username, config)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate token: {str(e)}"
        )
    
    # Construct embed URL
    embed_url = f"{config['base_url']}/t/{config['site_content_url']}"
    if view_path:
        embed_url = f"{embed_url}/views/{view_path}"
    
    return EmbedTokenResponse(
        token=token,
        expires_at=expiry,
        embed_url=embed_url
    )


@router.get("/dashboards")
async def list_dashboards():
    """
    List available dashboards for embedding.
    
    These are the pre-built dashboards for the Counterfactual Command Center.
    Workbook name in Tableau Cloud should match these paths.
    """
    # Define the dashboards - update embed_path to match your published workbooks
    dashboards = [
        DashboardInfo(
            id="global-overview",
            name="Global Mortality Overview",
            description="Global mortality trends and statistics",
            embed_path="GlobalOverview/Dashboard1"
        ),
        DashboardInfo(
            id="entity-profile",
            name="Entity Deep Dive",
            description="Detailed analysis for a single country/region",
            embed_path="GlobalOverview/Dashboard1"
        ),
        DashboardInfo(
            id="comparison",
            name="Entity Comparison",
            description="Compare multiple entities side-by-side",
            embed_path="GlobalOverview/Dashboard1"
        ),
        DashboardInfo(
            id="scenario",
            name="Scenario Builder",
            description="What-if analysis for intervention modeling",
            embed_path="GlobalOverview/Dashboard1"
        ),
    ]
    
    return [d.dict() for d in dashboards]


@router.get("/embed-url")
async def get_embed_url(
    dashboard_id: str = Query(..., description="Dashboard ID"),
    entity: Optional[str] = Query(None, description="Pre-filter by entity"),
    cause: Optional[str] = Query(None, description="Pre-filter by cause"),
    year: Optional[int] = Query(None, description="Pre-filter by year"),
):
    """
    Generate a parameterized embed URL for a specific dashboard.
    """
    config = get_tableau_config()
    
    # Dashboard path mapping - matches published workbook structure
    # Format: WorkbookName/DashboardName (as shown in Tableau Cloud URL)
    # Note: Spaces in dashboard names become URL-encoded or use underscores
    dashboard_paths = {
        "global-overview": "GlobalOverview/Dashboard1",
        "entity-profile": "GlobalOverview/Dashboard1",  # Update when you create more dashboards
        "comparison": "GlobalOverview/Dashboard1",
        "scenario": "GlobalOverview/Dashboard1",
    }
    
    path = dashboard_paths.get(dashboard_id)
    if not path:
        raise HTTPException(status_code=404, detail=f"Dashboard not found: {dashboard_id}")
    
    # Base URL
    base_url = f"{config['base_url']}/t/{config['site_content_url']}/views/{path}"
    
    # Add filter parameters
    params = []
    if entity:
        params.append(f"Entity={entity}")
    if cause:
        params.append(f"Cause={cause}")
    if year:
        params.append(f"Year={year}")
    
    if params:
        base_url += "?" + "&".join(params)
    
    return {"embed_url": base_url}


@router.get("/health")
async def tableau_health():
    """
    Check Tableau integration health.
    """
    config = get_tableau_config()
    
    issues = []
    
    if not config["client_id"]:
        issues.append("TABLEAU_CLIENT_ID not set")
    if not config["secret_id"]:
        issues.append("TABLEAU_SECRET_ID not set")
    if not config["secret_value"]:
        issues.append("TABLEAU_SECRET_VALUE not set")
    if not config["site_content_url"]:
        issues.append("TABLEAU_SITE_CONTENT_URL not set")
    
    return {
        "status": "healthy" if not issues else "degraded",
        "configured": len(issues) == 0,
        "issues": issues if issues else None,
        "base_url": config["base_url"],
    }
