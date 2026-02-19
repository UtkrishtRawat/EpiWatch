// ============================================================
// SERVER.JS - Main entry point
// Generates ANONYMIZED data, runs analytics, serves dashboard
// Connects to MongoDB for custom user-entered data
// NO personal patient identity is stored or exposed
// ============================================================

const express = require("express");
const cors = require("cors");
const path = require("path");
const mongoose = require("mongoose");

// Import our modules
const { generateAllData } = require("./data/generateFakeData");
const { detectAnomalies, correlateWaterAndDisease } = require("./analytics/anomalyDetection");
const { forecast48Hours, generateAlerts } = require("./analytics/forecasting");
const { router: apiRouter, initRoutes } = require("./routes/api");

// Create Express app
const app = express();
const PORT = 3000;

// MongoDB connection string (local by default)
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/disease-dashboard";

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// ============================================================
// STEP 1: Connect to MongoDB
// ============================================================
console.log("\n========================================");
console.log("🏥 Disease Outbreak Dashboard - Starting");
console.log("========================================\n");

async function startServer() {
    // Try connecting to MongoDB
    try {
        await mongoose.connect(MONGO_URI);
        console.log(`✅ Connected to MongoDB at ${MONGO_URI}`);
    } catch (err) {
        console.log("⚠️  MongoDB not available — running with fake data only");
        console.log("   To enable MongoDB: install MongoDB and start mongod service");
        console.log(`   Connection attempted: ${MONGO_URI}\n`);
    }

    // ============================================================
    // STEP 2: Generate anonymized fake data
    // ============================================================
    const data = generateAllData();

    // ============================================================
    // STEP 3: Run analytics
    // ============================================================
    console.log("\n🔬 Running analytics...");

    const anomalies = detectAnomalies(data.dailyCounts);
    console.log(`✅ Found ${anomalies.length} anomalies`);

    const correlations = correlateWaterAndDisease(data.waterReports, data.hotspots);
    console.log(`✅ Analyzed ${correlations.length} zone correlations`);

    const forecasts = forecast48Hours(data.dailyCounts);
    console.log(`✅ Generated forecasts for ${Object.keys(forecasts).length} diseases`);

    const alerts = generateAlerts(forecasts, anomalies);
    console.log(`✅ Generated ${alerts.length} alerts`);

    const analyticsResults = { anomalies, correlations, forecasts, alerts };

    // ============================================================
    // STEP 4: Initialize API routes
    // ============================================================
    initRoutes(data, analyticsResults);
    app.use("/api", apiRouter);

    app.get("/", (req, res) => {
        res.sendFile(path.join(__dirname, "public", "index.html"));
    });

    // ============================================================
    // STEP 5: Start server
    // ============================================================
    app.listen(PORT, () => {
        const mongoStatus = mongoose.connection.readyState === 1
            ? "✅ Connected" : "⚠️  Not connected (fake data only)";

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
        console.log(`📝 Add Data:     http://localhost:${PORT}/add-data.html`);
        console.log(`\n🗄️  MongoDB:      ${mongoStatus}`);
        console.log(`🔒 All data is ANONYMIZED — no personal identity stored\n`);
    });
}

startServer();
