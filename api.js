// ============================================================
// API ROUTES - All endpoints for the dashboard
// All data is ANONYMIZED — no personal patient info exposed
// ============================================================

const express = require("express");
const router = express.Router();

let data = null;
let analyticsResults = null;

/**
 * Initialize routes with generated data and analytics results
 */
function initRoutes(generatedData, analytics) {
    data = generatedData;
    analyticsResults = analytics;
}


// ----- ENDPOINT 1: Dashboard Summary -----
// GET /api/dashboard-summary
router.get("/dashboard-summary", (req, res) => {
    // Count critical alerts
    const criticalAlerts = analyticsResults.alerts.filter(a => a.type === "CRITICAL").length;

    // Overall risk level
    const riskLevels = Object.values(analyticsResults.forecasts).map(f => f.riskLevel);
    let overallRisk = "Low";
    if (riskLevels.includes("Critical")) overallRisk = "Critical";
    else if (riskLevels.includes("High")) overallRisk = "High";
    else if (riskLevels.includes("Medium")) overallRisk = "Medium";

    res.json({
        totalCases: data.totalCases,
        activeCases: data.totalActive,
        totalAlerts: analyticsResults.alerts.length,
        criticalAlerts,
        overallRisk,
        diseaseCounts: data.overallDisease,
        severityCounts: data.overallSeverity,
        lastUpdated: new Date().toISOString(),
    });
});


// ----- ENDPOINT 2: Disease Case Dataset -----
// GET /api/cases?disease=Cholera&zone=Zone%20A&type=Waterborne
// Returns grouped records like "3 people with Cholera in Zone A"
// NO personal identity — only counts, area info, and disease type
router.get("/cases", (req, res) => {
    let result = [...data.dataset];

    // Filter by disease name
    if (req.query.disease) {
        result = result.filter(r => r.disease === req.query.disease);
    }

    // Filter by disease type (Waterborne / Mosquito-borne)
    if (req.query.type) {
        result = result.filter(r => r.diseaseType.toLowerCase().includes(req.query.type.toLowerCase()));
    }

    // Filter by zone
    if (req.query.zone) {
        result = result.filter(r => r.zone.includes(req.query.zone));
    }

    // Limit results
    const limit = parseInt(req.query.limit) || 200;

    res.json({
        totalRecords: result.length,
        note: "All data is anonymized — no personal patient information is stored or shared",
        exampleFormat: "Each record = X people suffering from [disease] ([type]) in [zone]",
        records: result.slice(0, limit),
    });
});


// ----- ENDPOINT 3: Water Quality Reports -----
// GET /api/water-quality?zone=Zone%20A
router.get("/water-quality", (req, res) => {
    let result = [...data.waterReports];

    if (req.query.zone) {
        result = result.filter(r => r.zone.includes(req.query.zone));
    }

    if (req.query.safe === "true") {
        result = result.filter(r => r.isSafe);
    } else if (req.query.safe === "false") {
        result = result.filter(r => !r.isSafe);
    }

    res.json({ total: result.length, reports: result });
});


// ----- ENDPOINT 4: Anomalies -----
// GET /api/anomalies
router.get("/anomalies", (req, res) => {
    let anomalies = [...analyticsResults.anomalies];

    if (req.query.disease) {
        anomalies = anomalies.filter(a => a.disease === req.query.disease);
    }

    res.json({ total: anomalies.length, anomalies });
});


// ----- ENDPOINT 5: 48-Hour Forecast -----
// GET /api/forecast
router.get("/forecast", (req, res) => {
    res.json({
        generatedAt: new Date().toISOString(),
        forecastWindow: "48 hours",
        forecasts: analyticsResults.forecasts,
    });
});


// ----- ENDPOINT 6: Geographic Hotspots -----
// GET /api/hotspots
router.get("/hotspots", (req, res) => {
    // Add risk level to each hotspot
    const hotspotsWithRisk = data.hotspots.map(h => {
        let riskLevel = "Low";
        if (h.activeCases > 200) riskLevel = "Critical";
        else if (h.activeCases > 100) riskLevel = "High";
        else if (h.activeCases > 50) riskLevel = "Medium";
        return { ...h, riskLevel };
    });

    hotspotsWithRisk.sort((a, b) => b.totalCases - a.totalCases);
    res.json({ hotspots: hotspotsWithRisk });
});


// ----- ENDPOINT 7: Alerts -----
// GET /api/alerts
router.get("/alerts", (req, res) => {
    let alerts = [...analyticsResults.alerts];

    if (req.query.type) {
        alerts = alerts.filter(a => a.type === req.query.type);
    }

    res.json({ total: alerts.length, alerts });
});


// ----- ENDPOINT 8: Daily Counts (for charts) -----
// GET /api/daily-counts
router.get("/daily-counts", (req, res) => {
    res.json({
        total: data.dailyCounts.length,
        data: data.dailyCounts,
    });
});


// ----- ENDPOINT 9: Correlations -----
// GET /api/correlations
router.get("/correlations", (req, res) => {
    res.json({
        total: analyticsResults.correlations.length,
        correlations: analyticsResults.correlations,
    });
});

module.exports = { router, initRoutes };
