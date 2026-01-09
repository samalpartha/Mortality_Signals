"""
=============================================================================
Scenario Router - What-If Analysis Engine
=============================================================================
Provides intervention modeling endpoints:
- Simulate cause reduction scenarios
- Calculate deaths averted
- Compare baseline vs intervention
- Generate scenario narratives

This is the "killer feature" for hackathon judging - shows actionable insights.
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

class ScenarioInput(BaseModel):
    """Input parameters for scenario modeling."""
    entity: str
    causes: List[str]
    reduction_pct: float  # 0-100
    start_year: int
    end_year: Optional[int] = None


class ScenarioResult(BaseModel):
    """Result of a scenario simulation."""
    entity: str
    causes: List[str]
    reduction_pct: float
    start_year: int
    end_year: int
    baseline_total: int
    scenario_total: int
    deaths_averted: int
    pct_reduction_achieved: float
    yearly_comparison: List[Dict[str, Any]]
    narrative: str


class InterventionOption(BaseModel):
    """Pre-defined intervention scenario."""
    id: str
    name: str
    description: str
    causes: List[str]
    suggested_reduction: float
    evidence_level: str  # high, medium, low


# =============================================================================
# Pre-defined Intervention Templates
# =============================================================================

INTERVENTION_TEMPLATES = [
    InterventionOption(
        id="malaria-control",
        name="Malaria Control Program",
        description="Bed nets, indoor spraying, and treatment access",
        causes=["Malaria"],
        suggested_reduction=30,
        evidence_level="high"
    ),
    InterventionOption(
        id="road-safety",
        name="Road Safety Initiative",
        description="Speed limits, seat belt laws, drunk driving enforcement",
        causes=["Road injuries"],
        suggested_reduction=25,
        evidence_level="high"
    ),
    InterventionOption(
        id="cvd-prevention",
        name="Cardiovascular Prevention",
        description="Tobacco control, salt reduction, hypertension treatment",
        causes=["Cardiovascular diseases"],
        suggested_reduction=15,
        evidence_level="high"
    ),
    InterventionOption(
        id="hiv-treatment",
        name="HIV/AIDS Treatment Scale-up",
        description="Antiretroviral therapy access expansion",
        causes=["HIV/AIDS"],
        suggested_reduction=40,
        evidence_level="high"
    ),
    InterventionOption(
        id="drowning-prevention",
        name="Drowning Prevention",
        description="Swimming lessons, barriers, supervision",
        causes=["Drowning"],
        suggested_reduction=50,
        evidence_level="medium"
    ),
    InterventionOption(
        id="respiratory-care",
        name="Respiratory Disease Management",
        description="Pneumonia vaccines, air quality, treatment access",
        causes=["Lower respiratory infections", "Chronic respiratory diseases"],
        suggested_reduction=20,
        evidence_level="medium"
    ),
    InterventionOption(
        id="mental-health",
        name="Mental Health & Suicide Prevention",
        description="Crisis services, treatment access, stigma reduction",
        causes=["Self-harm"],
        suggested_reduction=20,
        evidence_level="medium"
    ),
    InterventionOption(
        id="ncd-comprehensive",
        name="Comprehensive NCD Program",
        description="Multi-cause non-communicable disease prevention",
        causes=["Cardiovascular diseases", "Neoplasms", "Diabetes mellitus", "Chronic respiratory diseases"],
        suggested_reduction=10,
        evidence_level="medium"
    ),
]


# =============================================================================
# Helper Functions
# =============================================================================

def generate_scenario_narrative(
    entity: str,
    causes: List[str],
    reduction_pct: float,
    start_year: int,
    end_year: int,
    baseline_total: int,
    deaths_averted: int
) -> str:
    """Generate a human-readable narrative for the scenario."""
    
    cause_text = causes[0] if len(causes) == 1 else f"{len(causes)} causes"
    
    if deaths_averted > 1_000_000:
        averted_text = f"{deaths_averted / 1_000_000:.1f} million"
    elif deaths_averted > 1_000:
        averted_text = f"{deaths_averted / 1_000:.0f} thousand"
    else:
        averted_text = f"{deaths_averted:,}"
    
    narrative = (
        f"If {entity} achieved a {reduction_pct:.0f}% reduction in {cause_text} deaths "
        f"starting from {start_year}, approximately {averted_text} deaths could have been "
        f"averted through {end_year}. This represents a "
        f"{(deaths_averted / baseline_total * 100):.1f}% reduction in total burden "
        f"for the selected causes over this period."
    )
    
    # Add context based on magnitude
    if deaths_averted > 100_000:
        narrative += " This is a substantial public health impact at national scale."
    elif deaths_averted > 10_000:
        narrative += " This represents significant lives saved through targeted intervention."
    
    return narrative


# =============================================================================
# Endpoints
# =============================================================================

@router.get("/interventions")
async def list_interventions():
    """
    List pre-defined intervention templates.
    
    These are evidence-based intervention scenarios that users can apply.
    """
    return [i.dict() for i in INTERVENTION_TEMPLATES]


@router.get("/simulate")
async def simulate_scenario(
    entity: str = Query(..., description="Target entity"),
    causes: List[str] = Query(..., description="Causes to reduce"),
    reduction_pct: float = Query(..., ge=0, le=100, description="Reduction percentage"),
    start_year: int = Query(..., description="Year intervention starts"),
    end_year: Optional[int] = Query(None, description="End year (defaults to latest)")
):
    """
    Simulate a what-if scenario.
    
    Models the impact of reducing deaths from selected causes by a given percentage
    starting from a specified year.
    
    Returns baseline vs scenario comparison with deaths averted calculation.
    """
    data = get_data()
    df = data.get("main", pd.DataFrame())
    
    if df.empty:
        raise HTTPException(status_code=503, detail="Data not loaded")
    
    # Filter to entity and causes
    entity_data = df[df["entity"] == entity]
    
    if entity_data.empty:
        raise HTTPException(status_code=404, detail=f"Entity not found: {entity}")
    
    # Validate causes exist
    available_causes = entity_data["cause"].unique()
    invalid_causes = [c for c in causes if c not in available_causes]
    if invalid_causes:
        raise HTTPException(
            status_code=400, 
            detail=f"Causes not found for this entity: {invalid_causes}"
        )
    
    # Set end year
    max_year = int(entity_data["year"].max())
    if end_year is None:
        end_year = max_year
    end_year = min(end_year, max_year)
    
    if start_year > end_year:
        raise HTTPException(status_code=400, detail="Start year must be <= end year")
    
    # Filter to relevant data
    scenario_data = entity_data[
        (entity_data["cause"].isin(causes)) &
        (entity_data["year"] >= start_year) &
        (entity_data["year"] <= end_year)
    ].copy()
    
    # Calculate baseline and scenario
    yearly_comparison = []
    baseline_total = 0
    scenario_total = 0
    
    for year in range(start_year, end_year + 1):
        year_data = scenario_data[scenario_data["year"] == year]
        baseline_deaths = int(year_data["deaths"].sum())
        
        # Apply reduction factor (linear phase-in over first 3 years)
        years_since_start = year - start_year
        if years_since_start < 3:
            effective_reduction = (reduction_pct / 100) * (years_since_start + 1) / 3
        else:
            effective_reduction = reduction_pct / 100
        
        scenario_deaths = int(baseline_deaths * (1 - effective_reduction))
        
        baseline_total += baseline_deaths
        scenario_total += scenario_deaths
        
        yearly_comparison.append({
            "year": year,
            "baseline_deaths": baseline_deaths,
            "scenario_deaths": scenario_deaths,
            "deaths_averted": baseline_deaths - scenario_deaths,
            "effective_reduction_pct": effective_reduction * 100
        })
    
    deaths_averted = baseline_total - scenario_total
    pct_reduction = (deaths_averted / baseline_total * 100) if baseline_total > 0 else 0
    
    narrative = generate_scenario_narrative(
        entity, causes, reduction_pct, start_year, end_year,
        baseline_total, deaths_averted
    )
    
    return ScenarioResult(
        entity=entity,
        causes=causes,
        reduction_pct=reduction_pct,
        start_year=start_year,
        end_year=end_year,
        baseline_total=baseline_total,
        scenario_total=scenario_total,
        deaths_averted=deaths_averted,
        pct_reduction_achieved=round(pct_reduction, 2),
        yearly_comparison=yearly_comparison,
        narrative=narrative
    )


@router.get("/compare-interventions")
async def compare_interventions(
    entity: str = Query(..., description="Target entity"),
    intervention_ids: List[str] = Query(..., description="Intervention IDs to compare"),
    start_year: int = Query(2010, description="Start year"),
    end_year: Optional[int] = Query(None, description="End year")
):
    """
    Compare multiple intervention scenarios side by side.
    """
    data = get_data()
    df = data.get("main", pd.DataFrame())
    
    if df.empty:
        raise HTTPException(status_code=503, detail="Data not loaded")
    
    # Map intervention IDs to templates
    interventions = {i.id: i for i in INTERVENTION_TEMPLATES}
    
    results = []
    for iid in intervention_ids:
        if iid not in interventions:
            continue
        
        template = interventions[iid]
        
        # Get available causes for this entity
        entity_causes = df[df["entity"] == entity]["cause"].unique()
        valid_causes = [c for c in template.causes if c in entity_causes]
        
        if not valid_causes:
            continue
        
        # Filter data
        scenario_data = df[
            (df["entity"] == entity) &
            (df["cause"].isin(valid_causes)) &
            (df["year"] >= start_year)
        ]
        
        if end_year:
            scenario_data = scenario_data[scenario_data["year"] <= end_year]
        
        baseline = int(scenario_data["deaths"].sum())
        reduction = template.suggested_reduction / 100
        scenario = int(baseline * (1 - reduction))
        averted = baseline - scenario
        
        results.append({
            "intervention_id": iid,
            "intervention_name": template.name,
            "causes_targeted": valid_causes,
            "reduction_pct": template.suggested_reduction,
            "baseline_deaths": baseline,
            "scenario_deaths": scenario,
            "deaths_averted": averted,
            "evidence_level": template.evidence_level
        })
    
    # Sort by deaths averted
    results.sort(key=lambda x: x["deaths_averted"], reverse=True)
    
    return {
        "entity": entity,
        "start_year": start_year,
        "end_year": end_year or int(df["year"].max()),
        "interventions": results
    }


@router.get("/impact-ranking")
async def get_impact_ranking(
    entity: str = Query(..., description="Target entity"),
    year: Optional[int] = Query(None, description="Year to analyze"),
    top_n: int = Query(10, ge=1, le=30)
):
    """
    Rank causes by potential impact of intervention.
    
    Shows which causes would yield the most deaths averted
    with a standardized intervention (e.g., 20% reduction).
    """
    data = get_data()
    df = data.get("main", pd.DataFrame())
    
    if df.empty:
        raise HTTPException(status_code=503, detail="Data not loaded")
    
    if year is None:
        year = int(df["year"].max())
    
    # Get deaths by cause for this entity/year
    cause_deaths = df[
        (df["entity"] == entity) & 
        (df["year"] == year)
    ].groupby("cause")["deaths"].sum().reset_index()
    
    # Calculate impact of 20% reduction
    cause_deaths["potential_averted_20pct"] = (cause_deaths["deaths"] * 0.20).astype(int)
    cause_deaths["potential_averted_50pct"] = (cause_deaths["deaths"] * 0.50).astype(int)
    
    # Sort and return top N
    cause_deaths = cause_deaths.sort_values("deaths", ascending=False).head(top_n)
    
    return {
        "entity": entity,
        "year": year,
        "standard_reduction_pct": 20,
        "causes": cause_deaths.to_dict(orient="records"),
        "insight": f"A 20% reduction across all top {top_n} causes would avert approximately "
                  f"{cause_deaths['potential_averted_20pct'].sum():,} deaths in {year}."
    }
