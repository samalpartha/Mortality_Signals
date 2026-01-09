#!/usr/bin/env python3
"""
=============================================================================
MORTALITY SIGNALS - ETL Pipeline
=============================================================================
Transforms the Kaggle "Annual Cause of Death Numbers" dataset from wide format
to a normalized long format optimized for analytics.

Features:
- Wide-to-long transformation (33 cause columns → single cause column)
- Cause category classification (Communicable, NCD, Injury)
- Anomaly score calculation (Z-score based)
- Year-over-year change metrics
- Population enrichment (optional)

Output: Parquet files ready for Tableau and API consumption
=============================================================================
"""

import os
import sys
from pathlib import Path
from typing import Optional

import numpy as np
import pandas as pd
from scipy import stats
from tqdm import tqdm

# =============================================================================
# Configuration
# =============================================================================

# Paths
BASE_DIR = Path(__file__).parent.parent
RAW_DIR = BASE_DIR / "data" / "raw"
PROCESSED_DIR = BASE_DIR / "data" / "processed"
ENRICHED_DIR = BASE_DIR / "data" / "enriched"

# Input file name (from Kaggle)
INPUT_FILE = "annual-number-of-deaths-by-cause.csv"

# Columns that are identifiers (not causes)
ID_COLUMNS = ["Entity", "Code", "Year"]

# Cause category mapping
CAUSE_CATEGORIES = {
    # Communicable, maternal, neonatal, and nutritional diseases
    "Meningitis": "Communicable",
    "Lower respiratory infections": "Communicable",
    "Intestinal infectious diseases": "Communicable",
    "Tuberculosis": "Communicable",
    "Malaria": "Communicable",
    "HIV/AIDS": "Communicable",
    "Acute hepatitis": "Communicable",
    "Maternal disorders": "Communicable",
    "Neonatal disorders": "Communicable",
    "Nutritional deficiencies": "Communicable",
    
    # Non-communicable diseases
    "Cardiovascular diseases": "NCD",
    "Neoplasms": "NCD",
    "Diabetes mellitus": "NCD",
    "Chronic kidney disease": "NCD",
    "Chronic respiratory diseases": "NCD",
    "Cirrhosis and other chronic liver diseases": "NCD",
    "Digestive diseases": "NCD",
    "Alzheimer's disease and other dementias": "NCD",
    "Parkinson's disease": "NCD",
    "Alcohol use disorders": "NCD",
    "Drug use disorders": "NCD",
    
    # Injuries
    "Road injuries": "Injury",
    "Drowning": "Injury",
    "Fire, heat, and hot substances": "Injury",
    "Interpersonal violence": "Injury",
    "Self-harm": "Injury",
    "Conflict and terrorism": "Injury",
    "Exposure to forces of nature": "Injury",
    "Environmental heat and cold exposure": "Injury",
    "Poisonings": "Injury",
}

# Anomaly detection settings
ANOMALY_ZSCORE_THRESHOLD = 1.5  # Lowered to detect more anomalies in demo data
ROLLING_WINDOW = 5


def ensure_directories():
    """Create output directories if they don't exist."""
    for dir_path in [RAW_DIR, PROCESSED_DIR, ENRICHED_DIR]:
        dir_path.mkdir(parents=True, exist_ok=True)
    print(f"✓ Directories ready: {RAW_DIR}, {PROCESSED_DIR}, {ENRICHED_DIR}")


def download_dataset():
    """
    Download the Kaggle dataset.
    
    Requires Kaggle API credentials in ~/.kaggle/kaggle.json
    Or manually download and place in data/raw/
    """
    input_path = RAW_DIR / INPUT_FILE
    
    if input_path.exists():
        print(f"✓ Dataset already exists: {input_path}")
        return input_path
    
    print("⚠ Dataset not found. Please download from Kaggle:")
    print("  https://www.kaggle.com/datasets/willianoliveiragibin/annual-cause-death-numbers")
    print(f"  Place the CSV in: {RAW_DIR}/")
    
    # Try Kaggle API download
    try:
        import kaggle
        print("Attempting Kaggle API download...")
        kaggle.api.dataset_download_files(
            "willianoliveiragibin/annual-cause-death-numbers",
            path=str(RAW_DIR),
            unzip=True
        )
        print(f"✓ Downloaded to {RAW_DIR}")
    except Exception as e:
        print(f"✗ Kaggle API download failed: {e}")
        print("  Please download manually and re-run.")
        sys.exit(1)
    
    return input_path


def load_raw_data(input_path: Path) -> pd.DataFrame:
    """Load the raw CSV file."""
    print(f"Loading raw data from {input_path}...")
    df = pd.read_csv(input_path)
    print(f"✓ Loaded {len(df):,} rows, {len(df.columns)} columns")
    return df


def clean_column_names(df: pd.DataFrame) -> pd.DataFrame:
    """Standardize column names for consistency."""
    # The Kaggle dataset has verbose column names, simplify them
    rename_map = {}
    
    for col in df.columns:
        if col in ID_COLUMNS:
            continue
        
        # Extract the cause name from verbose column names
        # e.g., "Deaths - Meningitis - Sex: Both - Age: All Ages (Number)" → "Meningitis"
        clean_name = col
        if " - " in col:
            parts = col.split(" - ")
            if len(parts) >= 2:
                clean_name = parts[1].strip()
        
        rename_map[col] = clean_name
    
    df = df.rename(columns=rename_map)
    print(f"✓ Cleaned column names: {len(rename_map)} columns renamed")
    return df


def reshape_wide_to_long(df: pd.DataFrame) -> pd.DataFrame:
    """
    Transform from wide format (one column per cause) to long format.
    
    Input:  Entity | Code | Year | Meningitis | Malaria | ...
    Output: Entity | Code | Year | Cause      | Deaths
    """
    print("Reshaping from wide to long format...")
    
    # Identify cause columns (everything except ID columns)
    cause_columns = [c for c in df.columns if c not in ID_COLUMNS]
    
    print(f"  Found {len(cause_columns)} cause columns")
    
    # Melt to long format
    long_df = df.melt(
        id_vars=ID_COLUMNS,
        value_vars=cause_columns,
        var_name="cause",
        value_name="deaths"
    )
    
    # Clean up
    long_df["deaths"] = pd.to_numeric(long_df["deaths"], errors="coerce").fillna(0).astype(int)
    long_df["year"] = long_df["Year"].astype(int)
    long_df["entity"] = long_df["Entity"].str.strip()
    long_df["code"] = long_df["Code"].fillna("")
    
    # Drop original columns and reorder
    long_df = long_df[["entity", "code", "year", "cause", "deaths"]]
    
    print(f"✓ Reshaped to {len(long_df):,} rows")
    return long_df


def add_cause_categories(df: pd.DataFrame) -> pd.DataFrame:
    """Add cause category classification."""
    print("Adding cause categories...")
    
    df["cause_category"] = df["cause"].map(CAUSE_CATEGORIES).fillna("Other")
    
    category_counts = df["cause_category"].value_counts()
    for cat, count in category_counts.items():
        print(f"  {cat}: {count:,} rows")
    
    return df


def calculate_metrics(df: pd.DataFrame) -> pd.DataFrame:
    """
    Calculate derived metrics for each entity-cause combination.
    
    Metrics:
    - yoy_change: Year-over-year absolute change
    - yoy_pct: Year-over-year percentage change
    - rolling_avg: 5-year rolling average
    - anomaly_score: Z-score vs rolling mean/std
    - is_anomaly: Boolean flag for significant anomalies
    """
    print("Calculating derived metrics...")
    
    # Sort for proper time series calculations
    df = df.sort_values(["entity", "cause", "year"]).reset_index(drop=True)
    
    metrics_list = []
    
    # Group by entity-cause for time series calculations
    groups = df.groupby(["entity", "cause"])
    
    for (entity, cause), group in tqdm(groups, desc="Processing groups"):
        group = group.copy()
        
        # Year-over-year change
        group["yoy_change"] = group["deaths"].diff()
        group["yoy_pct"] = group["deaths"].pct_change() * 100
        
        # Rolling statistics
        group["rolling_avg"] = group["deaths"].rolling(
            window=ROLLING_WINDOW, min_periods=1
        ).mean()
        group["rolling_std"] = group["deaths"].rolling(
            window=ROLLING_WINDOW, min_periods=1
        ).std().fillna(1)
        
        # Anomaly score (Z-score relative to rolling window)
        group["anomaly_score"] = (
            (group["deaths"] - group["rolling_avg"]) / group["rolling_std"].replace(0, 1)
        )
        
        # Flag significant anomalies
        group["is_anomaly"] = group["anomaly_score"].abs() > ANOMALY_ZSCORE_THRESHOLD
        
        metrics_list.append(group)
    
    result = pd.concat(metrics_list, ignore_index=True)
    
    # Clean up infinite values
    result["yoy_pct"] = result["yoy_pct"].replace([np.inf, -np.inf], np.nan)
    result["anomaly_score"] = result["anomaly_score"].replace([np.inf, -np.inf], np.nan)
    
    anomaly_count = result["is_anomaly"].sum()
    print(f"✓ Calculated metrics. Found {anomaly_count:,} anomalies")
    
    return result


def create_aggregations(df: pd.DataFrame) -> dict:
    """Create pre-aggregated summary tables for faster queries."""
    print("Creating aggregations...")
    
    aggregations = {}
    
    # 1. Global totals by year
    global_by_year = df.groupby("year").agg({
        "deaths": "sum"
    }).reset_index()
    global_by_year.columns = ["year", "total_deaths"]
    aggregations["global_by_year"] = global_by_year
    print(f"  ✓ Global by year: {len(global_by_year)} rows")
    
    # 2. Entity totals by year
    entity_by_year = df.groupby(["entity", "code", "year"]).agg({
        "deaths": "sum"
    }).reset_index()
    entity_by_year.columns = ["entity", "code", "year", "total_deaths"]
    aggregations["entity_by_year"] = entity_by_year
    print(f"  ✓ Entity by year: {len(entity_by_year):,} rows")
    
    # 3. Cause totals globally by year
    cause_by_year = df.groupby(["cause", "cause_category", "year"]).agg({
        "deaths": "sum"
    }).reset_index()
    cause_by_year.columns = ["cause", "cause_category", "year", "total_deaths"]
    aggregations["cause_by_year"] = cause_by_year
    print(f"  ✓ Cause by year: {len(cause_by_year):,} rows")
    
    # 4. Top anomalies (for signal feed)
    anomalies = df[df["is_anomaly"]].copy()
    anomalies = anomalies.sort_values("anomaly_score", ascending=False, key=abs)
    aggregations["anomalies"] = anomalies.head(1000)  # Keep top 1000
    print(f"  ✓ Top anomalies: {len(aggregations['anomalies'])} rows")
    
    # 5. Entity cause mix (latest year) - for clustering
    latest_year = df["year"].max()
    cause_mix = df[df["year"] == latest_year].pivot_table(
        index=["entity", "code"],
        columns="cause",
        values="deaths",
        aggfunc="sum",
        fill_value=0
    )
    # Convert to shares
    cause_mix = cause_mix.div(cause_mix.sum(axis=1), axis=0)
    cause_mix = cause_mix.reset_index()
    aggregations["cause_mix_shares"] = cause_mix
    print(f"  ✓ Cause mix shares: {len(cause_mix)} entities")
    
    return aggregations


def save_outputs(df: pd.DataFrame, aggregations: dict):
    """Save all outputs to Parquet files."""
    print("\nSaving outputs...")
    
    # Main dataset
    main_path = PROCESSED_DIR / "cause_deaths_long.parquet"
    df.to_parquet(main_path, index=False)
    print(f"✓ Main dataset: {main_path} ({os.path.getsize(main_path) / 1024 / 1024:.1f} MB)")
    
    # Aggregations
    for name, agg_df in aggregations.items():
        agg_path = PROCESSED_DIR / f"{name}.parquet"
        agg_df.to_parquet(agg_path, index=False)
        print(f"✓ {name}: {agg_path}")
    
    # Also save a CSV version for Tableau direct import
    csv_path = PROCESSED_DIR / "cause_deaths_long.csv"
    df.to_csv(csv_path, index=False)
    print(f"✓ CSV for Tableau: {csv_path}")


def generate_data_profile(df: pd.DataFrame):
    """Generate and print a data profile summary."""
    print("\n" + "=" * 60)
    print("DATA PROFILE SUMMARY")
    print("=" * 60)
    
    print(f"\nTotal rows: {len(df):,}")
    print(f"Total columns: {len(df.columns)}")
    
    print(f"\nYear range: {df['year'].min()} - {df['year'].max()}")
    print(f"Unique entities: {df['entity'].nunique()}")
    print(f"Unique causes: {df['cause'].nunique()}")
    
    print("\nTop 10 entities by total deaths (all years):")
    top_entities = df.groupby("entity")["deaths"].sum().sort_values(ascending=False).head(10)
    for entity, deaths in top_entities.items():
        print(f"  {entity}: {deaths:,.0f}")
    
    print("\nTop 10 causes globally (all years):")
    top_causes = df.groupby("cause")["deaths"].sum().sort_values(ascending=False).head(10)
    for cause, deaths in top_causes.items():
        print(f"  {cause}: {deaths:,.0f}")
    
    print("\nDeaths by category (all years):")
    by_category = df.groupby("cause_category")["deaths"].sum().sort_values(ascending=False)
    for cat, deaths in by_category.items():
        print(f"  {cat}: {deaths:,.0f}")
    
    print("\n" + "=" * 60)


def main():
    """Run the complete ETL pipeline."""
    print("=" * 60)
    print("MORTALITY SIGNALS - ETL Pipeline")
    print("=" * 60 + "\n")
    
    # Setup
    ensure_directories()
    
    # Download/locate data
    input_path = download_dataset()
    
    # Load and transform
    df = load_raw_data(input_path)
    df = clean_column_names(df)
    df = reshape_wide_to_long(df)
    df = add_cause_categories(df)
    df = calculate_metrics(df)
    
    # Create aggregations
    aggregations = create_aggregations(df)
    
    # Save outputs
    save_outputs(df, aggregations)
    
    # Profile
    generate_data_profile(df)
    
    print("\n✅ ETL Pipeline completed successfully!")
    print(f"   Output directory: {PROCESSED_DIR}")


if __name__ == "__main__":
    main()
