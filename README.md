# 🦠 Predictive Disease Outbreak Dashboard

A real-time predictive analytics dashboard that integrates **hospital admission data** and **water quality reports** to forecast disease outbreaks (Cholera, Typhoid, Dengue, Malaria) up to **48 hours in advance**.

## ✨ Features

- **Real-time Disease Monitoring** — Live KPI cards with admission stats & trends
- **48-Hour Outbreak Forecasting** — EMA-based time-series predictions with confidence bands
- **Anomaly Detection** — Z-score statistical analysis on admissions & water quality
- **Geographic Hotspot Mapping** — Leaflet heatmap with region risk overlays
- **Risk Classification** — 4-tier risk scoring (Low / Moderate / High / Critical)
- **Automated Alerts** — Severity-based alert cards with live notifications

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────┐
│                  Frontend                       │
│  HTML/CSS/JS + Chart.js + Leaflet.js            │
├─────────────────────────────────────────────────┤
│                  Express API                    │
│  /api/dashboard  /api/predictions  /api/alerts  │
├─────────────────────────────────────────────────┤
│               ML / Analytics                    │
│  Anomaly Detection │ Forecaster │ Risk Scorer   │
├─────────────────────────────────────────────────┤
│                 Data Layer                      │
│  Hospital Admissions  │  Water Quality Reports  │
└─────────────────────────────────────────────────┘
```

## 🚀 Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Generate synthetic datasets
npm run generate-data

# 3. Start the development server
npm run dev

# 4. Open in browser
# http://localhost:3000
```

## 📁 Project Structure

```
disease-outbreak-dashboard/
├── server/
│   ├── index.js              # Express server entry point
│   ├── data/
│   │   ├── generateData.js   # Synthetic data generator
│   │   └── regions.js        # Geographic region definitions
│   ├── models/
│   │   ├── anomalyDetector.js
│   │   ├── forecaster.js
│   │   └── riskClassifier.js
│   ├── routes/
│   │   └── api.js            # REST API routes
│   └── utils/
│       └── dataPreprocessor.js
├── public/
│   ├── index.html            # Dashboard UI
│   ├── css/styles.css        # Dark theme styles
│   └── js/
│       ├── app.js            # Main controller
│       ├── charts.js         # Chart.js visualizations
│       ├── map.js            # Leaflet map & heatmap
│       └── alerts.js         # Alert system UI
├── package.json
└── README.md
```

## 📊 API Endpoints

| Endpoint | Description |
|---|---|
| `GET /api/dashboard` | Full dashboard data (KPIs, charts, alerts) |
| `GET /api/admissions` | Hospital admission records |
| `GET /api/water-quality` | Water quality reports |
| `GET /api/predictions` | 48-hour outbreak predictions |
| `GET /api/alerts` | Active alerts with severity |
| `GET /api/hotspots` | Geographic hotspot data |
| `GET /api/regions/:id/risk` | Risk classification for a region |

## 🤖 Machine Learning & Analytics Engine

The dashboard is powered by a custom-built analytics engine that processes real-time data streams to detect outbreaks before they spread.

### 1. Time-Series Forecasting (Holt's Linear Trend)
Instead of standard regression, we utilize **Holt’s Double Exponential Smoothing** to forecast disease admission rates 48 hours into the future. This technique is superior for short-term forecasting as it accounts for both the baseline level and the local trend (rate of change), allowing the system to react instantly to sudden spikes.

### 2. Statistical Anomaly Detection (Z-Score)
To identify potential outbreaks, the system employs **Z-Score Analysis** on rolling windows of admission data. By calculating the standard deviation from the moving average, we pinpoint statistically significant outliers (anomalies) that deviate from normal baseline patterns, triggering immediate alerts.

### 3. Multi-Factor Risk Classification
We use a **Weighted Linear Model** to assign a dynamic risk score (0-100) to each region. This model synthesizes multiple risk factors:
- **Admission Velocity**: Rate of change in hospital cases.
- **Water Quality Index (WQI)**: Composite score of pH, turbidity, and coliform levels.
- **Population Density**: Impact factor for spread rate.
- **Historical Vulnerability**: Baseline risk based on past data.

### 4. Correlation Analysis
The engine runs **Pearson Correlation Coefficients** in real-time to quantify the relationship between deteriorating water quality and specific disease outbreaks (e.g., rising turbidity vs. Cholera cases), validating the causal link for public health officials.

## 🛠️ Tech Stack

- **Backend**: Node.js, Express
- **Frontend**: Vanilla HTML/CSS/JS
- **Charts**: Chart.js
- **Maps**: Leaflet.js + Leaflet.heat
- **Analytics**: Custom Z-score anomaly detection, EMA forecasting
