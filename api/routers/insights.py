"""
=============================================================================
Insights Router - AI-Powered Mortality Analytics
=============================================================================
Provides intelligent analysis endpoints:
- Anomaly detection and explanation
- Trend analysis and forecasting
- Comparative insights
- Signal generation for the dashboard feed

Security: All analysis happens server-side. No sensitive data exposed.
=============================================================================
"""

from typing import List, Optional, Dict, Any
from datetime import datetime
import numpy as np
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

class Signal(BaseModel):
    """A mortality signal/alert for the feed."""
    id: str
    type: str  # anomaly, trend, milestone, comparison
    severity: str  # critical, warning, info
    title: str
    description: str
    entity: Optional[str] = None
    cause: Optional[str] = None
    year: Optional[int] = None
    value: Optional[float] = None
    change_pct: Optional[float] = None
    timestamp: datetime


class AnomalyDetail(BaseModel):
    """Detailed anomaly information."""
    entity: str
    cause: str
    year: int
    deaths: int
    expected_deaths: float
    anomaly_score: float
    severity: str
    explanation: str
    contributing_factors: List[str]
    similar_anomalies: List[Dict[str, Any]]


class TrendInsight(BaseModel):
    """Trend analysis result."""
    entity: str
    cause: Optional[str] = None
    direction: str  # increasing, decreasing, stable
    change_pct: float
    confidence: float
    period: str
    description: str


class ForecastResult(BaseModel):
    """Simple forecast result."""
    entity: str
    cause: str
    forecast_years: List[int]
    forecast_values: List[float]
    lower_bound: List[float]
    upper_bound: List[float]
    method: str


# =============================================================================
# Helper Functions
# =============================================================================

def calculate_severity(anomaly_score: float) -> str:
    """Determine severity level from anomaly score."""
    abs_score = abs(anomaly_score)
    if abs_score >= 4.0:
        return "critical"
    elif abs_score >= 3.0:
        return "warning"
    else:
        return "info"


def generate_anomaly_explanation(row: pd.Series) -> str:
    """Generate a human-readable explanation for an anomaly."""
    direction = "spike" if row.get("anomaly_score", 0) > 0 else "drop"
    pct = row.get("yoy_pct", 0)
    
    if abs(pct) > 100:
        magnitude = "dramatic"
    elif abs(pct) > 50:
        magnitude = "significant"
    else:
        magnitude = "notable"
    
    return (
        f"A {magnitude} {direction} in {row['cause']} deaths was detected in "
        f"{row['entity']} ({row['year']}). Deaths changed by {pct:+.1f}% "
        f"year-over-year, which is {abs(row.get('anomaly_score', 0)):.1f} "
        f"standard deviations from the historical trend."
    )


def identify_contributing_factors(row: pd.Series, df: pd.DataFrame) -> List[str]:
    """Identify potential contributing factors for an anomaly."""
    factors = []
    
    # Check if this is part of a regional pattern
    same_year_cause = df[
        (df["year"] == row["year"]) & 
        (df["cause"] == row["cause"]) & 
        (df["is_anomaly"] == True)
    ]
    if len(same_year_cause) > 5:
        factors.append(f"Part of a global pattern: {len(same_year_cause)} regions affected")
    
    # Check if entity has multiple anomalies in same year
    same_year_entity = df[
        (df["year"] == row["year"]) & 
        (df["entity"] == row["entity"]) & 
        (df["is_anomaly"] == True)
    ]
    if len(same_year_entity) > 3:
        factors.append(f"Multiple cause anomalies in {row['entity']} this year")
    
    # Add category context
    factors.append(f"Category: {row.get('cause_category', 'Unknown')}")
    
    return factors


def find_similar_anomalies(row: pd.Series, df: pd.DataFrame, limit: int = 3) -> List[Dict]:
    """Find similar anomalies for comparison."""
    same_cause = df[
        (df["cause"] == row["cause"]) & 
        (df["is_anomaly"] == True) &
        (df["entity"] != row["entity"])
    ].sort_values("anomaly_score", key=abs, ascending=False)
    
    similar = []
    for _, r in same_cause.head(limit).iterrows():
        similar.append({
            "entity": r["entity"],
            "year": int(r["year"]),
            "anomaly_score": float(r["anomaly_score"]) if pd.notna(r["anomaly_score"]) else 0,
            "deaths": int(r["deaths"])
        })
    
    return similar


# =============================================================================
# Endpoints
# =============================================================================

@router.get("/signals", response_model=List[Signal])
async def get_signals(
    limit: int = Query(20, ge=1, le=100),
    severity: Optional[str] = Query(None, description="Filter by severity"),
    entity: Optional[str] = Query(None, description="Filter by entity")
):
    """
    Get the latest mortality signals for the dashboard feed.
    
    Signals include:
    - Anomalies (unusual death counts)
    - Trend changes
    - Milestones (e.g., lowest ever, highest ever)
    """
    data = get_data()
    df = data.get("main", pd.DataFrame())
    
    if df.empty:
        return []
    
    signals = []
    
    # Get top anomalies as signals
    anomalies = df[df["is_anomaly"] == True].copy()
    
    if entity:
        anomalies = anomalies[anomalies["entity"] == entity]
    
    anomalies = anomalies.sort_values("anomaly_score", key=abs, ascending=False)
    
    for _, row in anomalies.head(limit * 2).iterrows():
        sev = calculate_severity(row.get("anomaly_score", 0))
        
        if severity and sev != severity:
            continue
        
        direction = "increase" if row.get("anomaly_score", 0) > 0 else "decrease"
        
        signal = Signal(
            id=f"anomaly-{row['entity']}-{row['cause']}-{row['year']}".replace(" ", "-").lower(),
            type="anomaly",
            severity=sev,
            title=f"Unusual {direction} in {row['cause']}",
            description=f"{row['entity']} ({row['year']}): {row['deaths']:,} deaths, "
                       f"{row.get('yoy_pct', 0):+.1f}% YoY",
            entity=row["entity"],
            cause=row["cause"],
            year=int(row["year"]),
            value=float(row["deaths"]),
            change_pct=float(row.get("yoy_pct", 0)) if pd.notna(row.get("yoy_pct")) else None,
            timestamp=datetime.utcnow()
        )
        signals.append(signal)
        
        if len(signals) >= limit:
            break
    
    return signals


@router.get("/anomaly/{entity}/{cause}/{year}", response_model=AnomalyDetail)
async def get_anomaly_detail(
    entity: str,
    cause: str,
    year: int
):
    """
    Get detailed information about a specific anomaly.
    
    Includes explanation, contributing factors, and similar anomalies.
    """
    data = get_data()
    df = data.get("main", pd.DataFrame())
    
    if df.empty:
        raise HTTPException(status_code=503, detail="Data not loaded")
    
    # Find the specific record
    mask = (df["entity"] == entity) & (df["cause"] == cause) & (df["year"] == year)
    records = df[mask]
    
    if records.empty:
        raise HTTPException(status_code=404, detail="Record not found")
    
    row = records.iloc[0]
    
    # Calculate expected deaths (rolling average)
    expected = row.get("rolling_avg", row["deaths"])
    
    return AnomalyDetail(
        entity=row["entity"],
        cause=row["cause"],
        year=int(row["year"]),
        deaths=int(row["deaths"]),
        expected_deaths=float(expected) if pd.notna(expected) else float(row["deaths"]),
        anomaly_score=float(row.get("anomaly_score", 0)) if pd.notna(row.get("anomaly_score")) else 0,
        severity=calculate_severity(row.get("anomaly_score", 0)),
        explanation=generate_anomaly_explanation(row),
        contributing_factors=identify_contributing_factors(row, df),
        similar_anomalies=find_similar_anomalies(row, df)
    )


@router.get("/trends", response_model=List[TrendInsight])
async def get_trend_insights(
    entity: Optional[str] = Query(None, description="Filter by entity"),
    years: int = Query(10, ge=3, le=30, description="Years to analyze"),
    limit: int = Query(10, ge=1, le=50)
):
    """
    Get trend insights showing significant changes over time.
    """
    data = get_data()
    df = data.get("main", pd.DataFrame())
    
    if df.empty:
        return []
    
    # Determine year range
    max_year = df["year"].max()
    min_year = max_year - years
    
    filtered = df[(df["year"] >= min_year) & (df["year"] <= max_year)]
    
    if entity:
        filtered = filtered[filtered["entity"] == entity]
    
    insights = []
    
    # Analyze by entity-cause combination
    for (ent, cause), group in filtered.groupby(["entity", "cause"]):
        if len(group) < 3:
            continue
        
        group = group.sort_values("year")
        first_deaths = group.iloc[0]["deaths"]
        last_deaths = group.iloc[-1]["deaths"]
        
        if first_deaths == 0:
            continue
        
        change_pct = ((last_deaths - first_deaths) / first_deaths) * 100
        
        # Determine direction
        if change_pct > 10:
            direction = "increasing"
        elif change_pct < -10:
            direction = "decreasing"
        else:
            direction = "stable"
        
        # Skip stable trends for insights
        if direction == "stable":
            continue
        
        # Calculate confidence based on consistency
        deaths_series = group["deaths"].values
        if len(deaths_series) > 2:
            correlation = np.corrcoef(range(len(deaths_series)), deaths_series)[0, 1]
            confidence = abs(correlation) if not np.isnan(correlation) else 0.5
        else:
            confidence = 0.5
        
        insights.append(TrendInsight(
            entity=ent,
            cause=cause,
            direction=direction,
            change_pct=round(change_pct, 1),
            confidence=round(confidence, 2),
            period=f"{int(min_year)}-{int(max_year)}",
            description=f"{cause} deaths in {ent} have been {direction} "
                       f"({change_pct:+.1f}% over {years} years)"
        ))
    
    # Sort by absolute change and return top N
    insights.sort(key=lambda x: abs(x.change_pct), reverse=True)
    return insights[:limit]


@router.get("/forecast")
async def get_forecast(
    entity: str = Query(..., description="Entity to forecast"),
    cause: str = Query(..., description="Cause to forecast"),
    horizon: int = Query(5, ge=1, le=10, description="Years to forecast")
):
    """
    Generate a simple forecast for deaths.
    
    Uses linear extrapolation with confidence bounds.
    Note: This is a simplified forecast for demonstration.
    """
    data = get_data()
    df = data.get("main", pd.DataFrame())
    
    if df.empty:
        raise HTTPException(status_code=503, detail="Data not loaded")
    
    # Get historical data
    mask = (df["entity"] == entity) & (df["cause"] == cause)
    history = df[mask].sort_values("year")
    
    if len(history) < 5:
        raise HTTPException(
            status_code=400, 
            detail="Insufficient historical data for forecast"
        )
    
    # Simple linear regression
    years = history["year"].values
    deaths = history["deaths"].values
    
    # Fit line
    coeffs = np.polyfit(years, deaths, 1)
    slope, intercept = coeffs
    
    # Generate forecast
    max_year = int(years.max())
    forecast_years = list(range(max_year + 1, max_year + horizon + 1))
    forecast_values = [slope * y + intercept for y in forecast_years]
    
    # Calculate bounds (simplified: +/- 1 std of residuals)
    fitted = np.polyval(coeffs, years)
    residual_std = np.std(deaths - fitted)
    
    lower_bound = [max(0, v - 1.96 * residual_std) for v in forecast_values]
    upper_bound = [v + 1.96 * residual_std for v in forecast_values]
    
    return ForecastResult(
        entity=entity,
        cause=cause,
        forecast_years=forecast_years,
        forecast_values=[round(v, 0) for v in forecast_values],
        lower_bound=[round(v, 0) for v in lower_bound],
        upper_bound=[round(v, 0) for v in upper_bound],
        method="linear_extrapolation"
    )


@router.get("/summary")
async def get_insights_summary(
    entity: Optional[str] = Query(None, description="Filter by entity")
):
    """
    Get a high-level summary of insights for the dashboard.
    """
    data = get_data()
    df = data.get("main", pd.DataFrame())
    
    if df.empty:
        return {
            "total_anomalies": 0,
            "critical_count": 0,
            "warning_count": 0,
            "top_increasing_causes": [],
            "top_decreasing_causes": []
        }
    
    filtered = df if not entity else df[df["entity"] == entity]
    
    # Count anomalies by severity
    anomalies = filtered[filtered["is_anomaly"] == True]
    
    critical = len(anomalies[anomalies["anomaly_score"].abs() >= 4.0])
    warning = len(anomalies[(anomalies["anomaly_score"].abs() >= 3.0) & 
                            (anomalies["anomaly_score"].abs() < 4.0)])
    
    # Find top increasing/decreasing causes (recent years)
    recent_years = filtered[filtered["year"] >= filtered["year"].max() - 5]
    
    cause_trends = recent_years.groupby("cause").agg({
        "yoy_pct": "mean"
    }).reset_index()
    
    cause_trends = cause_trends.dropna()
    
    increasing = cause_trends.nlargest(5, "yoy_pct")[["cause", "yoy_pct"]].to_dict("records")
    decreasing = cause_trends.nsmallest(5, "yoy_pct")[["cause", "yoy_pct"]].to_dict("records")
    
    return {
        "total_anomalies": len(anomalies),
        "critical_count": critical,
        "warning_count": warning,
        "top_increasing_causes": increasing,
        "top_decreasing_causes": decreasing,
        "data_year_range": [int(df["year"].min()), int(df["year"].max())],
        "entities_analyzed": int(filtered["entity"].nunique())
    }


@router.get("/compare-entities")
async def compare_entities_insights(
    entities: List[str] = Query(..., description="Entities to compare"),
    cause: Optional[str] = Query(None, description="Filter by cause")
):
    """
    Generate comparative insights between entities.
    """
    data = get_data()
    df = data.get("main", pd.DataFrame())
    
    if df.empty:
        raise HTTPException(status_code=503, detail="Data not loaded")
    
    if len(entities) < 2:
        raise HTTPException(status_code=400, detail="Need at least 2 entities to compare")
    
    filtered = df[df["entity"].isin(entities)]
    
    if cause:
        filtered = filtered[filtered["cause"] == cause]
    
    # Get latest year data
    latest_year = filtered["year"].max()
    latest = filtered[filtered["year"] == latest_year]
    
    comparisons = []
    
    for ent in entities:
        ent_data = latest[latest["entity"] == ent]
        total_deaths = ent_data["deaths"].sum()
        anomaly_count = ent_data["is_anomaly"].sum()
        top_cause = ent_data.nlargest(1, "deaths")
        
        comparisons.append({
            "entity": ent,
            "total_deaths": int(total_deaths),
            "anomaly_count": int(anomaly_count),
            "top_cause": top_cause.iloc[0]["cause"] if not top_cause.empty else None,
            "top_cause_deaths": int(top_cause.iloc[0]["deaths"]) if not top_cause.empty else 0
        })
    
    # Generate comparative insights
    insights = []
    
    if len(comparisons) >= 2:
        sorted_by_deaths = sorted(comparisons, key=lambda x: x["total_deaths"], reverse=True)
        highest = sorted_by_deaths[0]
        lowest = sorted_by_deaths[-1]
        
        if highest["total_deaths"] > 0 and lowest["total_deaths"] > 0:
            ratio = highest["total_deaths"] / lowest["total_deaths"]
            insights.append(
                f"{highest['entity']} has {ratio:.1f}x more deaths than {lowest['entity']} "
                f"in {int(latest_year)}"
            )
    
    return {
        "year": int(latest_year),
        "entity_stats": comparisons,
        "insights": insights
    }
