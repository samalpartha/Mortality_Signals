"""
=============================================================================
Export Router - Data Export for Tableau
=============================================================================
Provides data export functionality:
- Export to Tableau Hyper format
- Export to CSV for Tableau import
- Generate Tableau-ready data extracts

This enables direct Tableau integration without complex ETL.
=============================================================================
"""

import io
import csv
from typing import List, Optional
from pathlib import Path
from datetime import datetime

import pandas as pd
from fastapi import APIRouter, Query, HTTPException
from fastapi.responses import StreamingResponse, FileResponse

# =============================================================================
# Router Setup
# =============================================================================

router = APIRouter()


def get_data():
    """Get the data store from main module."""
    from main import get_data_store
    return get_data_store()


# =============================================================================
# Endpoints
# =============================================================================

@router.get("/csv/main")
async def export_main_csv(
    entities: Optional[List[str]] = Query(None, description="Filter by entities"),
    causes: Optional[List[str]] = Query(None, description="Filter by causes"),
    year_from: int = Query(1990, description="Start year"),
    year_to: int = Query(2019, description="End year")
):
    """
    Export main dataset as CSV for Tableau import.
    
    This is the easiest way to get data into Tableau Desktop.
    """
    data = get_data()
    df = data.get("main", pd.DataFrame())
    
    if df.empty:
        raise HTTPException(status_code=503, detail="Data not loaded")
    
    # Apply filters
    filtered = df[(df["year"] >= year_from) & (df["year"] <= year_to)]
    
    if entities:
        filtered = filtered[filtered["entity"].isin(entities)]
    
    if causes:
        filtered = filtered[filtered["cause"].isin(causes)]
    
    # Convert to CSV
    output = io.StringIO()
    filtered.to_csv(output, index=False)
    output.seek(0)
    
    filename = f"mortality_signals_{datetime.now().strftime('%Y%m%d')}.csv"
    
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.get("/csv/aggregated")
async def export_aggregated_csv(
    aggregation: str = Query(..., description="Aggregation type: global_by_year, entity_by_year, cause_by_year, anomalies")
):
    """
    Export pre-aggregated data as CSV.
    
    These aggregations are optimized for Tableau performance.
    """
    data = get_data()
    
    if aggregation not in data:
        available = [k for k in data.keys() if k != "main"]
        raise HTTPException(
            status_code=400, 
            detail=f"Unknown aggregation. Available: {available}"
        )
    
    df = data[aggregation]
    
    output = io.StringIO()
    df.to_csv(output, index=False)
    output.seek(0)
    
    filename = f"mortality_{aggregation}_{datetime.now().strftime('%Y%m%d')}.csv"
    
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.get("/tableau-ready")
async def get_tableau_ready_data(
    entity: Optional[str] = Query(None, description="Single entity filter"),
    limit: int = Query(5, ge=1, le=1000000, description="Number of sample rows to return"),
    format: str = Query("json", description="Export format: json, csv")
):
    """
    Get Tableau-optimized data.
    
    This format is optimized for Tableau Web Data Connector and direct import.
    """
    data = get_data()
    df = data.get("main", pd.DataFrame())
    
    if df.empty:
        raise HTTPException(status_code=503, detail="Data not loaded")
    
    total_rows = len(df)
    
    if entity:
        df = df[df["entity"] == entity]
    
    # Get columns
    columns = list(df.columns)
    
    # Get sample and replace NaN with None for JSON compatibility
    sample_df = df.head(limit).copy()
    sample_df = sample_df.fillna(0)  # Replace NaN with 0 for numeric columns
    sample = sample_df.to_dict(orient="records")
    
    # Handle CSV format
    if format == "csv":
        output = io.StringIO()
        df.to_csv(output, index=False)
        output.seek(0)
        filename = f"mortality_signals_{datetime.now().strftime('%Y%m%d')}.csv"
        return StreamingResponse(
            iter([output.getvalue()]),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
    
    # Return JSON format with columns, row_count, and sample for preview
    return {
        "columns": columns,
        "row_count": total_rows,
        "sample": sample,
        "metadata": {
            "exported_at": datetime.utcnow().isoformat(),
            "entity_filter": entity,
        }
    }


@router.get("/schema")
async def get_data_schema():
    """
    Get data schema information for Tableau configuration.
    """
    data = get_data()
    df = data.get("main", pd.DataFrame())
    
    if df.empty:
        return {"status": "no_data"}
    
    return {
        "primary_table": {
            "name": "cause_deaths_long",
            "row_count": len(df),
            "columns": [
                {"name": col, "dtype": str(df[col].dtype)}
                for col in df.columns
            ]
        },
        "aggregations": {
            name: {
                "row_count": len(agg_df),
                "columns": list(agg_df.columns)
            }
            for name, agg_df in data.items()
            if name != "main" and isinstance(agg_df, pd.DataFrame)
        },
        "dimensions": {
            "entities": int(df["entity"].nunique()),
            "causes": int(df["cause"].nunique()),
            "categories": df["cause_category"].unique().tolist() if "cause_category" in df.columns else [],
            "year_range": [int(df["year"].min()), int(df["year"].max())],
        }
    }


@router.get("/wdc-config")
async def get_wdc_config():
    """
    Get Web Data Connector configuration.
    
    Use this to configure Tableau's Web Data Connector.
    """
    return {
        "wdc_version": "2.0",
        "connector_name": "Mortality Signals",
        "connector_id": "mortality_signals_wdc",
        "tables": [
            {
                "id": "main",
                "alias": "Mortality Data",
                "endpoint": "/api/export/tableau-ready",
                "incrementColumn": "year"
            },
            {
                "id": "anomalies",
                "alias": "Anomalies",
                "endpoint": "/api/export/csv/aggregated?aggregation=anomalies"
            }
        ],
        "auth": {
            "type": "none"  # Add OAuth if needed
        }
    }
