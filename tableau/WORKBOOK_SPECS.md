# Tableau Workbook Specifications

## Overview

This document defines the Tableau workbook structure for the **Mortality Signals** hackathon project. These dashboards are designed to embed into the React application via Tableau Embedding API v3.

---

## Data Source Configuration

### Primary Data Source: `cause_deaths_long`

**Connection:** Parquet file or Hyper extract

**Fields:**
| Field | Type | Role | Description |
|-------|------|------|-------------|
| entity | String | Dimension | Country/region name |
| code | String | Dimension | ISO country code |
| year | Integer | Dimension | Year (1990-2019) |
| cause | String | Dimension | Cause of death |
| cause_category | String | Dimension | Category (NCD, Communicable, Injury) |
| deaths | Integer | Measure | Number of deaths |
| yoy_change | Float | Measure | Year-over-year change |
| yoy_pct | Float | Measure | YoY percentage change |
| rolling_avg | Float | Measure | 5-year rolling average |
| anomaly_score | Float | Measure | Z-score anomaly indicator |
| is_anomaly | Boolean | Dimension | Anomaly flag |

### Secondary Data Source: `aggregations`

Pre-computed aggregations for faster queries:
- `global_by_year` - Global totals by year
- `entity_by_year` - Entity totals by year
- `cause_by_year` - Cause totals by year
- `anomalies` - Top 1000 anomalies

---

## Dashboard 1: Global Overview

**Purpose:** High-level view of global mortality burden and trends

### Layout (1600x900)
```
┌────────────────────────────────────────────────────────────────┐
│  HEADER: Title + Year Range Filter + Cause Category Filter     │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  ┌──────────────────────────────────────┐  ┌────────────────┐  │
│  │                                      │  │                │  │
│  │         WORLD MAP                    │  │  SIGNAL FEED   │  │
│  │     (Deaths by Entity)               │  │  (Top Anomalies)│  │
│  │                                      │  │                │  │
│  │                                      │  │                │  │
│  └──────────────────────────────────────┘  └────────────────┘  │
│                                                                │
│  ┌──────────────────────────┐  ┌──────────────────────────┐   │
│  │     GLOBAL TREND         │  │    TOP CAUSES (Bar)      │   │
│  │   (Area Chart)           │  │                          │   │
│  └──────────────────────────┘  └──────────────────────────┘   │
│                                                                │
│  KPI TILES: Total Deaths | Entities | Anomalies | YoY Change  │
└────────────────────────────────────────────────────────────────┘
```

### Sheets

#### Sheet 1.1: World Map
- **Type:** Filled Map
- **Color:** SUM(Deaths) - Sequential green gradient
- **Tooltip:** Entity, Total Deaths, Top Cause
- **Filter Action:** Click to filter other sheets

#### Sheet 1.2: Signal Feed
- **Type:** Text Table
- **Columns:** Entity, Cause, Year, Anomaly Score
- **Sort:** ABS(Anomaly Score) DESC
- **Filter:** is_anomaly = True
- **Conditional Formatting:** Red for score > 3, Orange for score > 2

#### Sheet 1.3: Global Trend
- **Type:** Area Chart
- **X-Axis:** Year (continuous)
- **Y-Axis:** SUM(Deaths)
- **Color:** Cause Category (if filtered to single category)

#### Sheet 1.4: Top Causes
- **Type:** Horizontal Bar
- **Rows:** Cause (sorted by deaths)
- **Columns:** SUM(Deaths)
- **Color:** Cause Category
- **Top N Filter:** Top 10 by SUM(Deaths)

#### KPI Calculations
```
// Total Deaths
SUM([Deaths])

// Entity Count
COUNTD([Entity])

// Anomaly Count
SUM(IF [Is Anomaly] THEN 1 ELSE 0 END)

// YoY Change (Global)
SUM([Deaths]) - LOOKUP(SUM([Deaths]), -1)
```

---

## Dashboard 2: Entity Profile

**Purpose:** Deep-dive analysis for a single country/region

### Layout (1600x900)
```
┌────────────────────────────────────────────────────────────────┐
│  HEADER: Entity Selector + Year Range + Title                  │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  KPI ROW: Latest Year Deaths | Top Cause | Anomaly Count       │
│                                                                │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                                                          │  │
│  │           CAUSE MIX (Stacked Area Chart)                 │  │
│  │                                                          │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                │
│  ┌────────────────────────┐  ┌────────────────────────────┐   │
│  │                        │  │                            │   │
│  │    WATERFALL           │  │     TOP CAUSES             │   │
│  │  (Change Drivers)      │  │     (Treemap)              │   │
│  │                        │  │                            │   │
│  └────────────────────────┘  └────────────────────────────┘   │
│                                                                │
│  ANOMALY TABLE: Recent anomalies for this entity              │
└────────────────────────────────────────────────────────────────┘
```

### Sheets

#### Sheet 2.1: Cause Mix Over Time
- **Type:** Stacked Area Chart
- **X-Axis:** Year
- **Y-Axis:** SUM(Deaths)
- **Color:** Cause (Top 10, others grouped)

#### Sheet 2.2: Change Waterfall
- **Type:** Waterfall/Gantt Chart
- **Rows:** Cause
- **Columns:** Change from Year A to Year B
- **Calculation:**
```
// Change Contribution
SUM(IF [Year] = [Parameter: End Year] THEN [Deaths] END)
- SUM(IF [Year] = [Parameter: Start Year] THEN [Deaths] END)
```

#### Sheet 2.3: Cause Treemap
- **Type:** Treemap
- **Size:** SUM(Deaths)
- **Color:** Cause Category
- **Label:** Cause, Deaths

---

## Dashboard 3: Entity Comparison

**Purpose:** Compare mortality trends across multiple entities

### Layout (1600x900)
```
┌────────────────────────────────────────────────────────────────┐
│  HEADER: Entity Multi-Select (up to 5) + Cause Filter          │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                                                          │  │
│  │           INDEXED TREND COMPARISON                       │  │
│  │           (Line Chart, Base Year = 100)                  │  │
│  │                                                          │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                │
│  ┌────────────────────────┐  ┌────────────────────────────┐   │
│  │                        │  │                            │   │
│  │    SLOPE CHART         │  │     SUMMARY TABLE          │   │
│  │  (1990 vs Latest)      │  │                            │   │
│  │                        │  │                            │   │
│  └────────────────────────┘  └────────────────────────────┘   │
└────────────────────────────────────────────────────────────────┘
```

### Key Calculation: Indexed Value
```
// Index to Base Year (1990 = 100)
SUM([Deaths]) / 
LOOKUP(SUM([Deaths]), FIRST()) 
* 100
```

---

## Dashboard 4: Scenario Builder

**Purpose:** What-if analysis for intervention modeling

### Layout (1600x900)
```
┌────────────────────────────────────────────────────────────────┐
│  HEADER: Entity + Cause Multi-Select + Reduction % Slider      │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  KPI ROW: Baseline | Scenario | Deaths Averted                 │
│                                                                │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                                                          │  │
│  │           BASELINE VS SCENARIO                           │  │
│  │           (Dual Axis Area Chart)                         │  │
│  │                                                          │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │           DEATHS AVERTED BY YEAR (Bar Chart)             │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                │
│  NARRATIVE: Auto-generated insight text                       │
└────────────────────────────────────────────────────────────────┘
```

### Parameters
```
// Reduction Percentage
Name: Reduction_Pct
Type: Float
Range: 5-80
Step: 5
Default: 20

// Start Year
Name: Start_Year
Type: Integer
Range: 1990-2018
Default: 2010
```

### Scenario Calculations
```
// Scenario Deaths
IF [Year] >= [Start_Year] THEN
  [Deaths] * (1 - [Reduction_Pct]/100)
ELSE
  [Deaths]
END

// Deaths Averted
[Deaths] - [Scenario Deaths]

// Cumulative Deaths Averted
RUNNING_SUM(SUM([Deaths Averted]))
```

---

## Embedding Configuration

### Connected App Settings
```
Scopes: tableau:views:embed, tableau:views:embed_authoring
Token Expiry: 10 minutes
```

### Embedding Code Template
```javascript
import { TableauViz } from '@tableau/embedding-api';

const viz = new TableauViz();
viz.src = 'https://your-site.online.tableau.com/views/MortalitySignals/GlobalOverview';
viz.token = await getEmbedToken(); // From backend
viz.toolbar = 'hidden';

// Set initial filters
viz.addFilter('Entity', selectedEntity);
viz.addFilter('Year', { min: 1990, max: 2019 });

document.getElementById('tableau-container').appendChild(viz);
```

### Filter Actions for Embedding
1. **Global Overview → Entity Profile**: Click map to navigate
2. **Entity Profile → Comparison**: "Compare with peers" button
3. **Any → Scenario**: Pre-populate entity and causes

---

## Design Guidelines

### Color Palette
- **Primary:** #22c55e (Signal Green)
- **Background:** #0a0f1a (Observatory Dark)
- **Surface:** #111827
- **Text:** #f9fafb
- **Severity Critical:** #ef4444
- **Severity Warning:** #f59e0b
- **Severity Info:** #3b82f6

### Typography
- **Headers:** Space Grotesk, Bold
- **Body:** JetBrains Mono
- **Numbers:** JetBrains Mono, Tabular

### Formatting
- Deaths: 1,234,567 (thousands separator)
- Percentages: 12.3%
- Large numbers: 1.2M, 1.2B

---

## Publication Checklist

1. [ ] Publish data source to Tableau Cloud
2. [ ] Create all 4 dashboards
3. [ ] Configure Connected App
4. [ ] Test embedding with JWT auth
5. [ ] Set up filter actions
6. [ ] Configure mobile layouts
7. [ ] Add dashboard descriptions
8. [ ] Set refresh schedule (if live connection)
