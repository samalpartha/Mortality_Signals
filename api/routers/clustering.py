"""
=============================================================================
Clustering Router - Peer Comparison & Similarity
=============================================================================
Provides entity clustering and similarity endpoints:
- Find similar entities based on cause patterns
- Cluster countries by mortality profile
- Compare entity against peers

This enables the "Comparables" feature highlighted in the hackathon blueprint.
=============================================================================
"""

from typing import List, Optional, Dict, Any
import numpy as np
import pandas as pd
from fastapi import APIRouter, Query, HTTPException
from pydantic import BaseModel
from sklearn.preprocessing import StandardScaler
from sklearn.cluster import KMeans
from sklearn.metrics.pairwise import cosine_similarity

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

class SimilarEntity(BaseModel):
    """A similar entity with similarity score."""
    entity: str
    code: str
    similarity_score: float
    shared_top_causes: List[str]
    key_differences: List[str]


class ClusterInfo(BaseModel):
    """Information about an entity's cluster."""
    cluster_id: int
    cluster_name: str
    cluster_description: str
    member_count: int
    members: List[str]
    defining_causes: List[Dict[str, Any]]


# =============================================================================
# Cluster Names and Descriptions
# =============================================================================

CLUSTER_PROFILES = {
    0: ("High NCD Burden", "Dominated by cardiovascular diseases and cancers"),
    1: ("Infectious Disease Burden", "High rates of communicable diseases"),
    2: ("Injury & Violence", "Elevated injury and violence-related deaths"),
    3: ("Mixed Transitional", "Transitioning from infectious to NCD burden"),
    4: ("Low Overall Burden", "Relatively low death rates across causes"),
    5: ("Aging Population Profile", "High dementia and age-related conditions"),
}


# =============================================================================
# Helper Functions
# =============================================================================

def build_cause_share_matrix(df: pd.DataFrame, year: Optional[int] = None) -> pd.DataFrame:
    """
    Build a matrix of cause shares per entity.
    
    Each row is an entity, each column is a cause, values are shares (0-1).
    """
    if year is None:
        year = df["year"].max()
    
    # Filter to year
    year_df = df[df["year"] == year].copy()
    
    # Pivot to get deaths by entity and cause
    pivot = year_df.pivot_table(
        index=["entity", "code"],
        columns="cause",
        values="deaths",
        aggfunc="sum",
        fill_value=0
    )
    
    # Convert to shares
    row_sums = pivot.sum(axis=1)
    shares = pivot.div(row_sums, axis=0).fillna(0)
    
    return shares


def get_top_causes(shares: pd.Series, n: int = 5) -> List[str]:
    """Get top N causes by share."""
    return shares.nlargest(n).index.tolist()


def get_cause_differences(shares1: pd.Series, shares2: pd.Series, n: int = 3) -> List[str]:
    """Get causes with largest difference between two entities."""
    diff = (shares1 - shares2).abs().nlargest(n)
    return [f"{cause}: {shares1.get(cause, 0)*100:.1f}% vs {shares2.get(cause, 0)*100:.1f}%" 
            for cause in diff.index]


# =============================================================================
# Endpoints
# =============================================================================

@router.get("/similar")
async def find_similar_entities(
    entity: str = Query(..., description="Reference entity"),
    year: Optional[int] = Query(None, description="Year to analyze"),
    top_n: int = Query(5, ge=1, le=20, description="Number of similar entities")
):
    """
    Find entities with similar mortality cause patterns.
    
    Uses cosine similarity on cause share vectors.
    """
    data = get_data()
    df = data.get("main", pd.DataFrame())
    
    if df.empty:
        raise HTTPException(status_code=503, detail="Data not loaded")
    
    if year is None:
        year = int(df["year"].max())
    
    # Build cause share matrix
    shares = build_cause_share_matrix(df, year)
    
    if entity not in shares.index.get_level_values(0):
        raise HTTPException(status_code=404, detail=f"Entity not found: {entity}")
    
    # Get reference entity vector
    ref_idx = shares.index.get_level_values(0) == entity
    ref_vector = shares.loc[ref_idx].values
    
    # Calculate similarities
    similarities = cosine_similarity(ref_vector, shares.values)[0]
    
    # Create results
    results = []
    ref_shares = shares.loc[ref_idx].iloc[0]
    ref_top_causes = get_top_causes(ref_shares)
    
    # Sort by similarity and get top N (excluding self)
    sorted_idx = np.argsort(similarities)[::-1]
    
    for idx in sorted_idx:
        ent = shares.index[idx][0]
        code = shares.index[idx][1]
        
        if ent == entity:
            continue
        
        sim_score = float(similarities[idx])
        ent_shares = shares.iloc[idx]
        ent_top_causes = get_top_causes(ent_shares)
        
        # Find shared top causes
        shared = list(set(ref_top_causes) & set(ent_top_causes))
        
        # Find key differences
        differences = get_cause_differences(ref_shares, ent_shares)
        
        results.append(SimilarEntity(
            entity=ent,
            code=code if pd.notna(code) else "",
            similarity_score=round(sim_score, 3),
            shared_top_causes=shared[:5],
            key_differences=differences
        ))
        
        if len(results) >= top_n:
            break
    
    return {
        "reference_entity": entity,
        "year": year,
        "similar_entities": [r.dict() for r in results]
    }


@router.get("/cluster")
async def get_entity_cluster(
    entity: str = Query(..., description="Entity to analyze"),
    year: Optional[int] = Query(None, description="Year to analyze"),
    n_clusters: int = Query(6, ge=3, le=12, description="Number of clusters")
):
    """
    Get cluster assignment and peers for an entity.
    
    Uses K-means clustering on standardized cause share vectors.
    """
    data = get_data()
    df = data.get("main", pd.DataFrame())
    
    if df.empty:
        raise HTTPException(status_code=503, detail="Data not loaded")
    
    if year is None:
        year = int(df["year"].max())
    
    # Build cause share matrix
    shares = build_cause_share_matrix(df, year)
    
    if entity not in shares.index.get_level_values(0):
        raise HTTPException(status_code=404, detail=f"Entity not found: {entity}")
    
    # Standardize features
    scaler = StandardScaler()
    scaled_data = scaler.fit_transform(shares.values)
    
    # Cluster
    kmeans = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
    clusters = kmeans.fit_predict(scaled_data)
    
    # Find entity's cluster
    entity_idx = shares.index.get_level_values(0).tolist().index(entity)
    entity_cluster = int(clusters[entity_idx])
    
    # Get cluster members
    cluster_members = [
        shares.index[i][0] 
        for i in range(len(clusters)) 
        if clusters[i] == entity_cluster
    ]
    
    # Get defining causes for cluster (highest mean shares)
    cluster_mask = clusters == entity_cluster
    cluster_shares = shares.values[cluster_mask]
    mean_shares = cluster_shares.mean(axis=0)
    top_cause_idx = np.argsort(mean_shares)[::-1][:5]
    
    defining_causes = [
        {
            "cause": shares.columns[i],
            "cluster_avg_share": round(float(mean_shares[i]) * 100, 1)
        }
        for i in top_cause_idx
    ]
    
    # Get cluster name/description
    cluster_name, cluster_desc = CLUSTER_PROFILES.get(
        entity_cluster % len(CLUSTER_PROFILES),
        (f"Cluster {entity_cluster}", "Mixed mortality profile")
    )
    
    return ClusterInfo(
        cluster_id=entity_cluster,
        cluster_name=cluster_name,
        cluster_description=cluster_desc,
        member_count=len(cluster_members),
        members=sorted(cluster_members)[:20],  # Limit to 20 for response size
        defining_causes=defining_causes
    )


@router.get("/all-clusters")
async def get_all_clusters(
    year: Optional[int] = Query(None, description="Year to analyze"),
    n_clusters: int = Query(6, ge=3, le=12, description="Number of clusters")
):
    """
    Get all cluster assignments for visualization.
    
    Returns a mapping of entities to cluster IDs.
    """
    data = get_data()
    df = data.get("main", pd.DataFrame())
    
    if df.empty:
        raise HTTPException(status_code=503, detail="Data not loaded")
    
    if year is None:
        year = int(df["year"].max())
    
    # Build cause share matrix
    shares = build_cause_share_matrix(df, year)
    
    # Standardize and cluster
    scaler = StandardScaler()
    scaled_data = scaler.fit_transform(shares.values)
    
    kmeans = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
    clusters = kmeans.fit_predict(scaled_data)
    
    # Build result
    cluster_assignments = {}
    for i, (entity, code) in enumerate(shares.index):
        cluster_id = int(clusters[i])
        cluster_name, _ = CLUSTER_PROFILES.get(
            cluster_id % len(CLUSTER_PROFILES),
            (f"Cluster {cluster_id}", "")
        )
        
        if cluster_name not in cluster_assignments:
            cluster_assignments[cluster_name] = {
                "cluster_id": cluster_id,
                "entities": []
            }
        
        cluster_assignments[cluster_name]["entities"].append({
            "entity": entity,
            "code": code if pd.notna(code) else ""
        })
    
    return {
        "year": year,
        "n_clusters": n_clusters,
        "clusters": cluster_assignments
    }


@router.get("/cause-profile")
async def get_cause_profile(
    entity: str = Query(..., description="Entity to analyze"),
    year: Optional[int] = Query(None, description="Year to analyze")
):
    """
    Get detailed cause profile for an entity.
    
    Returns cause shares, categories, and comparison to global average.
    """
    data = get_data()
    df = data.get("main", pd.DataFrame())
    
    if df.empty:
        raise HTTPException(status_code=503, detail="Data not loaded")
    
    if year is None:
        year = int(df["year"].max())
    
    # Get entity data
    entity_data = df[(df["entity"] == entity) & (df["year"] == year)]
    
    if entity_data.empty:
        raise HTTPException(status_code=404, detail=f"No data for {entity} in {year}")
    
    # Calculate entity shares
    total_deaths = entity_data["deaths"].sum()
    entity_profile = entity_data.groupby(["cause", "cause_category"]).agg({
        "deaths": "sum"
    }).reset_index()
    entity_profile["share"] = entity_profile["deaths"] / total_deaths
    
    # Calculate global average shares
    global_data = df[df["year"] == year]
    global_total = global_data["deaths"].sum()
    global_shares = global_data.groupby("cause")["deaths"].sum() / global_total
    
    # Combine
    entity_profile["global_share"] = entity_profile["cause"].map(global_shares)
    entity_profile["vs_global"] = entity_profile["share"] - entity_profile["global_share"]
    
    # Sort by share
    entity_profile = entity_profile.sort_values("share", ascending=False)
    
    # Category breakdown
    category_summary = entity_profile.groupby("cause_category").agg({
        "deaths": "sum",
        "share": "sum"
    }).reset_index()
    category_summary = category_summary.sort_values("share", ascending=False)
    
    return {
        "entity": entity,
        "year": year,
        "total_deaths": int(total_deaths),
        "cause_breakdown": entity_profile.to_dict(orient="records"),
        "category_summary": category_summary.to_dict(orient="records"),
        "top_causes": entity_profile.head(5)["cause"].tolist(),
        "above_global_avg": entity_profile[entity_profile["vs_global"] > 0.01]["cause"].tolist()[:5],
        "below_global_avg": entity_profile[entity_profile["vs_global"] < -0.01]["cause"].tolist()[:5]
    }
