"""
=============================================================================
Data Router - Mortality Statistics Endpoints
=============================================================================
Provides REST endpoints for querying mortality data:
- Entity listing and search
- Cause listing and search
- Time series data
- Top causes rankings
- Aggregated statistics
=============================================================================
"""

from typing import List, Optional

import pandas as pd
from fastapi import APIRouter, Query, HTTPException
from pydantic import BaseModel

# =============================================================================
# Router Setup
# =============================================================================

router = APIRouter()


def get_data():
    """Get the data store from main module."""
    from main import get_data_store
    return get_data_store()


# =============================================================================
# Response Models
# =============================================================================

class EntityResponse(BaseModel):
    entity: str
    code: str


class TimeseriesPoint(BaseModel):
    year: int
    cause: str
    deaths: int
    yoy_change: Optional[float] = None
    yoy_pct: Optional[float] = None
    anomaly_score: Optional[float] = None
    is_anomaly: bool = False


class TopCauseResponse(BaseModel):
    cause: str
    cause_category: str
    deaths: int


class GlobalStatsResponse(BaseModel):
    total_deaths: int
    year_range: List[int]
    entity_count: int
    cause_count: int
    anomaly_count: int


# =============================================================================
# Endpoints
# =============================================================================

@router.get("/entities", response_model=List[EntityResponse])
async def list_entities(
    q: Optional[str] = Query(None, description="Search query"),
    limit: int = Query(100, ge=1, le=500)
):
    """
    List all entities (countries/regions) with optional search.
    """
    data = get_data()
    df = data.get("main", pd.DataFrame())
    
    if df.empty:
        return []
    
    entities = df[["entity", "code"]].drop_duplicates().sort_values("entity")
    
    if q:
        mask = entities["entity"].str.lower().str.contains(q.lower(), na=False)
        entities = entities[mask]
    
    return entities.head(limit).to_dict(orient="records")


@router.get("/causes")
async def list_causes(
    q: Optional[str] = Query(None, description="Search query"),
    category: Optional[str] = Query(None, description="Filter by category"),
    limit: int = Query(100, ge=1, le=200)
):
    """
    List all causes of death with optional filtering.
    """
    data = get_data()
    df = data.get("main", pd.DataFrame())
    
    if df.empty:
        return []
    
    causes = df[["cause", "cause_category"]].drop_duplicates().sort_values("cause")
    
    if q:
        mask = causes["cause"].str.lower().str.contains(q.lower(), na=False)
        causes = causes[mask]
    
    if category:
        causes = causes[causes["cause_category"] == category]
    
    return causes.head(limit).to_dict(orient="records")


@router.get("/categories")
async def list_categories():
    """
    List all cause categories.
    """
    data = get_data()
    df = data.get("main", pd.DataFrame())
    
    if df.empty:
        return []
    
    categories = df["cause_category"].dropna().unique().tolist()
    return sorted(categories)


@router.get("/timeseries")
async def get_timeseries(
    entity: str = Query(..., description="Entity name"),
    causes: List[str] = Query(..., description="List of causes"),
    year_from: int = Query(1990, ge=1900, le=2100),
    year_to: int = Query(2019, ge=1900, le=2100)
):
    """
    Get time series data for an entity and selected causes.
    """
    data = get_data()
    df = data.get("main", pd.DataFrame())
    
    if df.empty:
        raise HTTPException(status_code=503, detail="Data not loaded")
    
    # Filter
    mask = (
        (df["entity"] == entity) &
        (df["year"] >= year_from) &
        (df["year"] <= year_to) &
        (df["cause"].isin(causes))
    )
    
    result = df[mask][
        ["year", "cause", "deaths", "yoy_change", "yoy_pct", "anomaly_score", "is_anomaly"]
    ].sort_values(["cause", "year"])
    
    # Convert NaN to None for JSON serialization
    result = result.where(pd.notna(result), None)
    
    return result.to_dict(orient="records")


@router.get("/top-causes")
async def get_top_causes(
    entity: str = Query(..., description="Entity name"),
    year: int = Query(..., description="Year"),
    top_n: int = Query(10, ge=1, le=50)
):
    """
    Get top N causes of death for an entity in a specific year.
    """
    data = get_data()
    df = data.get("main", pd.DataFrame())
    
    if df.empty:
        raise HTTPException(status_code=503, detail="Data not loaded")
    
    # Filter
    mask = (df["entity"] == entity) & (df["year"] == year)
    result = df[mask].groupby(["cause", "cause_category"]).agg({
        "deaths": "sum"
    }).reset_index()
    
    result = result.sort_values("deaths", ascending=False).head(top_n)
    
    return result.to_dict(orient="records")


@router.get("/global-trend")
async def get_global_trend(
    cause: Optional[str] = Query(None, description="Filter by cause"),
    category: Optional[str] = Query(None, description="Filter by category")
):
    """
    Get global death trend over time.
    """
    data = get_data()
    df = data.get("main", pd.DataFrame())
    
    if df.empty:
        raise HTTPException(status_code=503, detail="Data not loaded")
    
    filtered = df.copy()
    
    if cause:
        filtered = filtered[filtered["cause"] == cause]
    if category:
        filtered = filtered[filtered["cause_category"] == category]
    
    result = filtered.groupby("year").agg({
        "deaths": "sum"
    }).reset_index()
    
    result.columns = ["year", "total_deaths"]
    
    return result.sort_values("year").to_dict(orient="records")


@router.get("/entity-profile")
async def get_entity_profile(
    entity: str = Query(..., description="Entity name")
):
    """
    Get comprehensive profile for an entity including:
    - Summary statistics
    - Cause breakdown
    - Trend over time
    - Top anomalies
    """
    data = get_data()
    df = data.get("main", pd.DataFrame())
    
    if df.empty:
        raise HTTPException(status_code=503, detail="Data not loaded")
    
    entity_data = df[df["entity"] == entity]
    
    if entity_data.empty:
        raise HTTPException(status_code=404, detail=f"Entity not found: {entity}")
    
    # Summary stats
    latest_year = entity_data["year"].max()
    earliest_year = entity_data["year"].min()
    latest_data = entity_data[entity_data["year"] == latest_year]
    
    total_deaths_latest = int(latest_data["deaths"].sum())
    
    # Top causes
    top_causes = latest_data.groupby("cause")["deaths"].sum().sort_values(ascending=False).head(5)
    
    # Trend
    trend = entity_data.groupby("year")["deaths"].sum().reset_index()
    
    # Anomalies
    anomalies = entity_data[entity_data["is_anomaly"] == True].sort_values(
        "anomaly_score", key=abs, ascending=False
    ).head(10)
    
    return {
        "entity": entity,
        "code": entity_data["code"].iloc[0] if len(entity_data) > 0 else "",
        "summary": {
            "year_range": [int(earliest_year), int(latest_year)],
            "total_deaths_latest_year": total_deaths_latest,
            "cause_count": int(entity_data["cause"].nunique()),
        },
        "top_causes": [
            {"cause": cause, "deaths": int(deaths)}
            for cause, deaths in top_causes.items()
        ],
        "trend": trend.to_dict(orient="records"),
        "recent_anomalies": anomalies[
            ["year", "cause", "deaths", "anomaly_score"]
        ].to_dict(orient="records")
    }


@router.get("/stats")
async def get_global_stats():
    """
    Get global summary statistics.
    """
    data = get_data()
    df = data.get("main", pd.DataFrame())
    
    if df.empty:
        return {
            "total_deaths": 0,
            "year_range": [0, 0],
            "entity_count": 0,
            "cause_count": 0,
            "anomaly_count": 0
        }
    
    return {
        "total_deaths": int(df["deaths"].sum()),
        "year_range": [int(df["year"].min()), int(df["year"].max())],
        "entity_count": int(df["entity"].nunique()),
        "cause_count": int(df["cause"].nunique()),
        "anomaly_count": int(df["is_anomaly"].sum())
    }


@router.get("/compare")
async def compare_entities(
    entities: List[str] = Query(..., description="Entities to compare"),
    cause: Optional[str] = Query(None, description="Filter by cause"),
    year_from: int = Query(1990, ge=1900, le=2100),
    year_to: int = Query(2019, ge=1900, le=2100),
    indexed: bool = Query(True, description="Index to base year = 100")
):
    """
    Compare multiple entities over time.
    Optionally index to base year for normalized comparison.
    """
    data = get_data()
    df = data.get("main", pd.DataFrame())
    
    if df.empty:
        raise HTTPException(status_code=503, detail="Data not loaded")
    
    # Filter
    mask = (
        (df["entity"].isin(entities)) &
        (df["year"] >= year_from) &
        (df["year"] <= year_to)
    )
    
    if cause:
        mask &= (df["cause"] == cause)
    
    filtered = df[mask]
    
    # Aggregate by entity and year
    result = filtered.groupby(["entity", "year"]).agg({
        "deaths": "sum"
    }).reset_index()
    
    if indexed:
        # Index to first year = 100 for each entity
        def index_series(group):
            base = group["deaths"].iloc[0]
            if base > 0:
                group["indexed_value"] = (group["deaths"] / base) * 100
            else:
                group["indexed_value"] = 100
            return group
        
        result = result.groupby("entity").apply(index_series).reset_index(drop=True)
    
    return result.to_dict(orient="records")
