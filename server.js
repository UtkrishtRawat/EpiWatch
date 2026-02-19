// ============================================================
// SERVER.JS - Main entry point
// Generates ANONYMIZED data, runs analytics, serves dashboard
// NO personal patient identity is stored or exposed
// ============================================================

const express = require("express");
const cors = require("cors");
const path = require("path");

// Import our modules
const { generateAllData } = require("./data/generateFakeData");
const { detectAnomalies, correlateWaterAndDisease } = require("./analytics/anomalyDetection");
const { forecast48Hours, generateAlerts } = require("./analytics/forecasting");
const { router: apiRouter, initRoutes } = require("./routes/api");

// Create Express app
const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// ============================================================
// STEP 1: Generate anonymized fake data
// ============================================================
console.log("\n========================================");
console.log("🏥 Disease Outbreak Dashboard - Starting");
console.log("========================================\n");

const data = generateAllData();

// ============================================================
// STEP 2: Run analytics
// ============================================================
console.log("\n🔬 Running analytics...");

const anomalies = detectAnomalies(data.dailyCounts);
console.log(`✅ Found ${anomalies.length} anomalies`);

// Use hotspots (zone summaries) for correlation — no individual patient data
const correlations = correlateWaterAndDisease(data.waterReports, data.hotspots);
console.log(`✅ Analyzed ${correlations.length} zone correlations`);

const forecasts = forecast48Hours(data.dailyCounts);
console.log(`✅ Generated forecasts for ${Object.keys(forecasts).length} diseases`);

const alerts = generateAlerts(forecasts, anomalies);
console.log(`✅ Generated ${alerts.length} alerts`);

const analyticsResults = { anomalies, correlations, forecasts, alerts };

// ============================================================
// STEP 3: Initialize API routes
// ============================================================
initRoutes(data, analyticsResults);
app.use("/api", apiRouter);

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ============================================================
// STEP 4: Start server
// ============================================================
app.listen(PORT, () => {
    console.log("\n========================================");
    console.log(`🚀 Server running at http://localhost:${PORT}`);
    console.log("========================================");
    console.log(`\n📊 Dashboard:    http://localhost:${PORT}`);
    console.log(`📋 API Summary:  http://localhost:${PORT}/api/dashboard-summary`);
    console.log(`🏥 Cases:        http://localhost:${PORT}/api/cases?limit=10`);
    console.log(`💧 Water Data:   http://localhost:${PORT}/api/water-quality`);
    console.log(`📈 Forecast:     http://localhost:${PORT}/api/forecast`);
    console.log(`🗺️  Hotspots:     http://localhost:${PORT}/api/hotspots`);
    console.log(`🔔 Alerts:       http://localhost:${PORT}/api/alerts`);
    console.log(`\n🔒 All data is ANONYMIZED — no personal identity stored\n`);
});
