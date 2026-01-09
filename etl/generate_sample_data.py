#!/usr/bin/env python3
"""
=============================================================================
MORTALITY SIGNALS - Sample Data Generator
=============================================================================
Generates realistic sample mortality data for demo/testing purposes.
This mimics the structure of the Kaggle "Annual Cause of Death Numbers" dataset.

Use this if you don't have the actual Kaggle data for testing.
=============================================================================
"""

import numpy as np
import pandas as pd
from pathlib import Path

# =============================================================================
# Configuration
# =============================================================================

OUTPUT_DIR = Path(__file__).parent.parent / "data" / "raw"
OUTPUT_FILE = "annual-number-of-deaths-by-cause.csv"

# Sample entities (countries/regions)
ENTITIES = [
    ("Afghanistan", "AFG"),
    ("Albania", "ALB"),
    ("Algeria", "DZA"),
    ("Argentina", "ARG"),
    ("Australia", "AUS"),
    ("Austria", "AUT"),
    ("Bangladesh", "BGD"),
    ("Belgium", "BEL"),
    ("Brazil", "BRA"),
    ("Canada", "CAN"),
    ("Chile", "CHL"),
    ("China", "CHN"),
    ("Colombia", "COL"),
    ("Democratic Republic of Congo", "COD"),
    ("Egypt", "EGY"),
    ("Ethiopia", "ETH"),
    ("France", "FRA"),
    ("Germany", "DEU"),
    ("Ghana", "GHA"),
    ("Greece", "GRC"),
    ("India", "IND"),
    ("Indonesia", "IDN"),
    ("Iran", "IRN"),
    ("Iraq", "IRQ"),
    ("Ireland", "IRL"),
    ("Israel", "ISR"),
    ("Italy", "ITA"),
    ("Japan", "JPN"),
    ("Kenya", "KEN"),
    ("Malaysia", "MYS"),
    ("Mexico", "MEX"),
    ("Morocco", "MAR"),
    ("Myanmar", "MMR"),
    ("Netherlands", "NLD"),
    ("New Zealand", "NZL"),
    ("Nigeria", "NGA"),
    ("Norway", "NOR"),
    ("Pakistan", "PAK"),
    ("Peru", "PER"),
    ("Philippines", "PHL"),
    ("Poland", "POL"),
    ("Portugal", "PRT"),
    ("Romania", "ROU"),
    ("Russia", "RUS"),
    ("Saudi Arabia", "SAU"),
    ("South Africa", "ZAF"),
    ("South Korea", "KOR"),
    ("Spain", "ESP"),
    ("Sudan", "SDN"),
    ("Sweden", "SWE"),
    ("Switzerland", "CHE"),
    ("Tanzania", "TZA"),
    ("Thailand", "THA"),
    ("Turkey", "TUR"),
    ("Uganda", "UGA"),
    ("Ukraine", "UKR"),
    ("United Arab Emirates", "ARE"),
    ("United Kingdom", "GBR"),
    ("United States", "USA"),
    ("Vietnam", "VNM"),
    ("World", "OWID_WRL"),
]

# Causes with base death rates and trends
# (cause_name, base_rate_per_100k, yearly_trend, noise_factor)
CAUSES = [
    ("Cardiovascular diseases", 250, -0.5, 0.1),
    ("Neoplasms", 150, 0.3, 0.08),
    ("Lower respiratory infections", 40, -1.5, 0.15),
    ("Chronic respiratory diseases", 45, 0.2, 0.1),
    ("Alzheimer's disease and other dementias", 25, 1.5, 0.1),
    ("Diabetes mellitus", 20, 0.8, 0.12),
    ("Chronic kidney disease", 15, 0.5, 0.1),
    ("Digestive diseases", 25, -0.2, 0.08),
    ("Cirrhosis and other chronic liver diseases", 15, 0.1, 0.1),
    ("Road injuries", 18, -0.3, 0.12),
    ("Self-harm", 12, 0.1, 0.15),
    ("Interpersonal violence", 8, -0.1, 0.2),
    ("HIV/AIDS", 15, -2.0, 0.25),
    ("Malaria", 20, -1.5, 0.3),
    ("Tuberculosis", 12, -1.0, 0.2),
    ("Neonatal disorders", 25, -1.2, 0.15),
    ("Nutritional deficiencies", 8, -0.8, 0.2),
    ("Meningitis", 5, -0.5, 0.15),
    ("Drowning", 4, -0.3, 0.12),
    ("Parkinson's disease", 8, 0.8, 0.1),
    ("Alcohol use disorders", 5, 0.2, 0.15),
    ("Drug use disorders", 4, 0.5, 0.2),
    ("Fire, heat, and hot substances", 2, -0.2, 0.15),
    ("Poisonings", 2, 0.1, 0.15),
    ("Conflict and terrorism", 3, 0.5, 0.5),
    ("Exposure to forces of nature", 0.5, 0.1, 0.8),
    ("Environmental heat and cold exposure", 1, 0.2, 0.3),
    ("Intestinal infectious diseases", 10, -1.0, 0.2),
    ("Maternal disorders", 5, -1.5, 0.2),
    ("Acute hepatitis", 3, -0.3, 0.15),
]

# Population estimates (millions) for scaling
POPULATIONS = {
    "China": 1400,
    "India": 1380,
    "United States": 330,
    "Indonesia": 270,
    "Pakistan": 220,
    "Brazil": 210,
    "Nigeria": 200,
    "Bangladesh": 165,
    "Russia": 145,
    "Mexico": 130,
    "Japan": 125,
    "Ethiopia": 115,
    "Philippines": 110,
    "Egypt": 100,
    "Vietnam": 97,
    "Democratic Republic of Congo": 90,
    "Germany": 83,
    "Turkey": 84,
    "Iran": 84,
    "Thailand": 70,
    "United Kingdom": 67,
    "France": 67,
    "Italy": 60,
    "South Africa": 59,
    "Tanzania": 59,
    "Myanmar": 54,
    "Kenya": 53,
    "South Korea": 52,
    "Colombia": 50,
    "Spain": 47,
    "Uganda": 45,
    "Argentina": 45,
    "Algeria": 44,
    "Sudan": 43,
    "Ukraine": 44,
    "Iraq": 40,
    "Poland": 38,
    "Canada": 38,
    "Morocco": 37,
    "Saudi Arabia": 34,
    "Peru": 33,
    "Malaysia": 32,
    "Ghana": 31,
    "Australia": 25,
    "Chile": 19,
    "Netherlands": 17,
    "Belgium": 11.5,
    "Greece": 10.5,
    "Portugal": 10.3,
    "Sweden": 10.3,
    "United Arab Emirates": 9.9,
    "Austria": 9,
    "Switzerland": 8.6,
    "Israel": 9.2,
    "Ireland": 5,
    "Norway": 5.4,
    "New Zealand": 5,
    "Albania": 2.9,
    "Afghanistan": 38,
    "Romania": 19,
    "World": 7800,
}

YEARS = list(range(1990, 2020))


def get_population(entity: str) -> float:
    """Get population for an entity (in millions)."""
    return POPULATIONS.get(entity, 20)  # Default 20M


def get_region_modifier(entity: str, cause: str) -> float:
    """
    Get a modifier based on region/cause combination.
    This creates more realistic regional patterns.
    """
    # African countries have higher infectious disease burden
    african_countries = ["Nigeria", "Ethiopia", "Democratic Republic of Congo", 
                        "Tanzania", "Kenya", "Uganda", "Ghana", "South Africa", "Sudan"]
    
    # Developed countries have higher NCD burden
    developed = ["United States", "United Kingdom", "Germany", "France", "Japan",
                "Canada", "Australia", "Italy", "Spain", "Netherlands", "Sweden",
                "Norway", "Switzerland", "Austria", "Belgium", "Ireland", "New Zealand"]
    
    infectious = ["Malaria", "HIV/AIDS", "Tuberculosis", "Lower respiratory infections",
                 "Intestinal infectious diseases", "Meningitis"]
    
    ncds = ["Cardiovascular diseases", "Neoplasms", "Alzheimer's disease and other dementias",
           "Parkinson's disease", "Diabetes mellitus"]
    
    modifier = 1.0
    
    if entity in african_countries:
        if cause in infectious:
            modifier *= 3.0
        if cause in ncds:
            modifier *= 0.6
        if cause == "Malaria":
            modifier *= 5.0
    
    if entity in developed:
        if cause in infectious:
            modifier *= 0.3
        if cause in ncds:
            modifier *= 1.3
        if cause == "Malaria":
            modifier *= 0.01
    
    # Conflict zones
    if entity in ["Afghanistan", "Iraq", "Sudan", "Democratic Republic of Congo"]:
        if cause == "Conflict and terrorism":
            modifier *= 10.0
        if cause == "Interpersonal violence":
            modifier *= 2.0
    
    return modifier


def generate_deaths(entity: str, cause_info: tuple, year: int) -> int:
    """Generate realistic death count for entity/cause/year."""
    cause_name, base_rate, trend, noise = cause_info
    
    # Get population
    pop = get_population(entity)
    
    # Calculate base deaths
    years_from_base = year - 2000
    adjusted_rate = base_rate + (trend * years_from_base)
    adjusted_rate = max(adjusted_rate, 0.1)  # Minimum rate
    
    # Apply regional modifier
    region_mod = get_region_modifier(entity, cause_name)
    adjusted_rate *= region_mod
    
    # Calculate deaths (rate per 100k * population in millions * 10)
    base_deaths = adjusted_rate * pop * 10
    
    # Add noise
    noise_factor = 1 + np.random.normal(0, noise)
    noise_factor = max(noise_factor, 0.5)  # Prevent negative
    
    deaths = int(base_deaths * noise_factor)
    
    return max(deaths, 0)


def main():
    """Generate the sample dataset."""
    print("=" * 60)
    print("MORTALITY SIGNALS - Sample Data Generator")
    print("=" * 60)
    
    # Create output directory
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    
    # Generate data
    rows = []
    
    for entity, code in ENTITIES:
        for year in YEARS:
            row = {
                "Entity": entity,
                "Code": code,
                "Year": year
            }
            
            for cause_info in CAUSES:
                cause_name = cause_info[0]
                # Create column name matching Kaggle format
                col_name = f"Deaths - {cause_name} - Sex: Both - Age: All Ages (Number)"
                row[col_name] = generate_deaths(entity, cause_info, year)
            
            rows.append(row)
    
    # Create DataFrame
    df = pd.DataFrame(rows)
    
    # Save to CSV
    output_path = OUTPUT_DIR / OUTPUT_FILE
    df.to_csv(output_path, index=False)
    
    print(f"\n✓ Generated {len(df):,} rows")
    print(f"✓ {len(ENTITIES)} entities")
    print(f"✓ {len(CAUSES)} causes")
    print(f"✓ {len(YEARS)} years ({YEARS[0]}-{YEARS[-1]})")
    print(f"\n✓ Saved to: {output_path}")
    
    # Print summary
    print("\nSample data preview:")
    print(df.head())
    
    print("\nColumn list:")
    for col in df.columns[:10]:
        print(f"  - {col}")
    print(f"  ... and {len(df.columns) - 10} more columns")
    
    print("\n" + "=" * 60)
    print("Run the ETL pipeline next:")
    print("  cd etl && python etl_pipeline.py")
    print("=" * 60)


if __name__ == "__main__":
    main()
