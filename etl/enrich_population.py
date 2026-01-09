#!/usr/bin/env python3
"""
=============================================================================
MORTALITY SIGNALS - Population Enrichment
=============================================================================
Enriches the cause-of-death data with population figures from the World Bank
to calculate per-capita mortality rates.

This enables meaningful cross-country comparisons (deaths per 100K population).
=============================================================================
"""

import os
from pathlib import Path

import pandas as pd
import requests
from tqdm import tqdm

# =============================================================================
# Configuration
# =============================================================================

BASE_DIR = Path(__file__).parent.parent
PROCESSED_DIR = BASE_DIR / "data" / "processed"
ENRICHED_DIR = BASE_DIR / "data" / "enriched"

# World Bank Population API
WB_API_BASE = "https://api.worldbank.org/v2/country"
WB_INDICATOR = "SP.POP.TOTL"  # Total population

# Country code mapping (ISO 3166-1 alpha-3 to World Bank)
# Most should match, but some exceptions exist


def fetch_world_bank_population() -> pd.DataFrame:
    """
    Fetch population data from World Bank API for all countries and years.
    """
    print("Fetching population data from World Bank API...")
    
    # Fetch all countries, all years (1990-2023)
    url = f"{WB_API_BASE}/all/indicator/{WB_INDICATOR}"
    params = {
        "format": "json",
        "per_page": 20000,
        "date": "1990:2023"
    }
    
    response = requests.get(url, params=params)
    response.raise_for_status()
    
    data = response.json()
    
    if len(data) < 2:
        raise ValueError("Unexpected API response format")
    
    records = data[1]
    
    rows = []
    for record in tqdm(records, desc="Processing records"):
        if record["value"] is None:
            continue
        
        rows.append({
            "code": record["country"]["id"],
            "country_name": record["country"]["value"],
            "year": int(record["date"]),
            "population": int(record["value"])
        })
    
    df = pd.DataFrame(rows)
    print(f"✓ Fetched {len(df):,} population records")
    
    return df


def load_death_data() -> pd.DataFrame:
    """Load the processed death data."""
    path = PROCESSED_DIR / "cause_deaths_long.parquet"
    if not path.exists():
        raise FileNotFoundError(
            f"Processed data not found at {path}. "
            "Please run etl_pipeline.py first."
        )
    
    df = pd.read_parquet(path)
    print(f"✓ Loaded {len(df):,} death records")
    return df


def merge_population(death_df: pd.DataFrame, pop_df: pd.DataFrame) -> pd.DataFrame:
    """
    Merge population data with death data.
    Calculate per-capita mortality rates.
    """
    print("Merging population data...")
    
    # Merge on code and year
    merged = death_df.merge(
        pop_df[["code", "year", "population"]],
        on=["code", "year"],
        how="left"
    )
    
    # Calculate per-capita rate (per 100,000 population)
    merged["deaths_per_100k"] = (
        merged["deaths"] / merged["population"] * 100_000
    ).round(2)
    
    # Fill missing population with NaN (will show as unavailable)
    missing_pop = merged["population"].isna().sum()
    total = len(merged)
    
    print(f"  Merged records: {total:,}")
    print(f"  Missing population: {missing_pop:,} ({missing_pop/total*100:.1f}%)")
    
    return merged


def save_enriched(df: pd.DataFrame):
    """Save enriched dataset."""
    ENRICHED_DIR.mkdir(parents=True, exist_ok=True)
    
    # Parquet
    parquet_path = ENRICHED_DIR / "cause_deaths_enriched.parquet"
    df.to_parquet(parquet_path, index=False)
    print(f"✓ Saved: {parquet_path}")
    
    # CSV for Tableau
    csv_path = ENRICHED_DIR / "cause_deaths_enriched.csv"
    df.to_csv(csv_path, index=False)
    print(f"✓ Saved: {csv_path}")


def main():
    """Run population enrichment pipeline."""
    print("=" * 60)
    print("MORTALITY SIGNALS - Population Enrichment")
    print("=" * 60 + "\n")
    
    # Fetch population data
    pop_df = fetch_world_bank_population()
    
    # Load death data
    death_df = load_death_data()
    
    # Merge
    enriched_df = merge_population(death_df, pop_df)
    
    # Save
    save_enriched(enriched_df)
    
    print("\n✅ Population enrichment completed!")
    print(f"   Output: {ENRICHED_DIR}")


if __name__ == "__main__":
    main()
