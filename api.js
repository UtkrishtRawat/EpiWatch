// ============================================================
// API ROUTES - All endpoints for the dashboard
// All data is ANONYMIZED — no personal patient info exposed
// Includes MongoDB CRUD for custom data entry
// ============================================================

const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();

// Import MongoDB models
const { Case, WaterReport } = require("../models/schemas");

let data = null;
let analyticsResults = null;

/**
 * Initialize routes with generated data and analytics results
 */
function initRoutes(generatedData, analytics) {
    data = generatedData;
    analyticsResults = analytics;
}

/**
 * Check if MongoDB is connected
 */
function isMongoConnected() {
    return mongoose.connection.readyState === 1;
}


// ============================================================
// READ ENDPOINTS (GET) — Serve fake + MongoDB data combined
// ============================================================

// ----- ENDPOINT 1: Dashboard Summary -----
router.get("/dashboard-summary", async (req, res) => {
    const criticalAlerts = analyticsResults.alerts.filter(a => a.type === "CRITICAL").length;

    const riskLevels = Object.values(analyticsResults.forecasts).map(f => f.riskLevel);
    let overallRisk = "Low";
    if (riskLevels.includes("Critical")) overallRisk = "Critical";
    else if (riskLevels.includes("High")) overallRisk = "High";
    else if (riskLevels.includes("Medium")) overallRisk = "Medium";

    // Count custom data from MongoDB if connected
    let customCases = 0;
    let customActive = 0;
    if (isMongoConnected()) {
        const mongoCases = await Case.find({});
        for (const c of mongoCases) {
            customCases += c.caseCount;
            customActive += c.activeCases;
        }
    }

    res.json({
        totalCases: data.totalCases + customCases,
        activeCases: data.totalActive + customActive,
        customCasesInDB: customCases,
        totalAlerts: analyticsResults.alerts.length,
        criticalAlerts,
        overallRisk,
        diseaseCounts: data.overallDisease,
        severityCounts: data.overallSeverity,
        mongoConnected: isMongoConnected(),
        lastUpdated: new Date().toISOString(),
    });
});


// ----- ENDPOINT 2: Disease Case Dataset -----
router.get("/cases", async (req, res) => {
    // Start with fake data
    let result = [...data.dataset];

    // Add MongoDB data if connected
    if (isMongoConnected()) {
        const mongoCases = await Case.find({}).lean();
        const formatted = mongoCases.map(c => ({
            ...c,
            _id: c._id.toString(),
            source: "mongodb",
        }));
        result = [...result, ...formatted];
    }

    // Filter by disease name
    if (req.query.disease) {
        result = result.filter(r => r.disease === req.query.disease);
    }

    // Filter by disease type (Waterborne / Mosquito-borne)
    if (req.query.type) {
        result = result.filter(r => r.diseaseType && r.diseaseType.toLowerCase().includes(req.query.type.toLowerCase()));
    }

    // Filter by zone
    if (req.query.zone) {
        result = result.filter(r => r.zone.includes(req.query.zone));
    }

    // Filter by source (fake / mongodb)
    if (req.query.source) {
        result = result.filter(r => (r.source || "fake") === req.query.source);
    }

    const limit = parseInt(req.query.limit) || 200;

    res.json({
        totalRecords: result.length,
        note: "All data is anonymized — no personal patient information is stored or shared",
        exampleFormat: "Each record = X people suffering from [disease] ([type]) in [zone]",
        records: result.slice(0, limit),
    });
});


// ----- ENDPOINT 3: Water Quality Reports -----
router.get("/water-quality", async (req, res) => {
    let result = [...data.waterReports];

    // Add MongoDB water reports if connected
    if (isMongoConnected()) {
        const mongoReports = await WaterReport.find({}).lean();
        const formatted = mongoReports.map(r => ({
            ...r,
            _id: r._id.toString(),
            dataSource: "mongodb",
        }));
        result = [...result, ...formatted];
    }

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
router.get("/anomalies", (req, res) => {
    let anomalies = [...analyticsResults.anomalies];

    if (req.query.disease) {
        anomalies = anomalies.filter(a => a.disease === req.query.disease);
    }

    res.json({ total: anomalies.length, anomalies });
});


// ----- ENDPOINT 5: 48-Hour Forecast -----
router.get("/forecast", (req, res) => {
    res.json({
        generatedAt: new Date().toISOString(),
        forecastWindow: "48 hours",
        forecasts: analyticsResults.forecasts,
    });
});


// ----- ENDPOINT 6: Geographic Hotspots -----
router.get("/hotspots", (req, res) => {
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
router.get("/alerts", (req, res) => {
    let alerts = [...analyticsResults.alerts];

    if (req.query.type) {
        alerts = alerts.filter(a => a.type === req.query.type);
    }

    res.json({ total: alerts.length, alerts });
});


// ----- ENDPOINT 8: Daily Counts (for charts) -----
router.get("/daily-counts", (req, res) => {
    res.json({
        total: data.dailyCounts.length,
        data: data.dailyCounts,
    });
});


// ----- ENDPOINT 9: Correlations -----
router.get("/correlations", (req, res) => {
    res.json({
        total: analyticsResults.correlations.length,
        correlations: analyticsResults.correlations,
    });
});


// ============================================================
// WRITE ENDPOINTS (POST/DELETE) — MongoDB custom data
// ============================================================

// ----- ENDPOINT 10: Add a Custom Case Record -----
// POST /api/cases
router.post("/cases", async (req, res) => {
    if (!isMongoConnected()) {
        return res.status(503).json({
            error: "MongoDB is not connected",
            message: "Start MongoDB to add custom data. Run: mongod",
        });
    }

    try {
        const newCase = new Case({
            date: req.body.date || new Date().toISOString().split("T")[0],
            zone: req.body.zone,
            disease: req.body.disease,
            diseaseType: req.body.diseaseType,
            spreadBy: req.body.spreadBy || "",
            caseCount: req.body.caseCount || 1,
            activeCases: req.body.activeCases || 0,
            severityBreakdown: req.body.severityBreakdown || { Mild: 0, Moderate: 0, Severe: 0, Critical: 0 },
            ageGroupBreakdown: req.body.ageGroupBreakdown || {},
            areaInfo: req.body.areaInfo || {},
            source: "user",
        });

        const saved = await newCase.save();
        res.status(201).json({
            success: true,
            message: "Case record added successfully",
            record: saved,
        });
    } catch (err) {
        res.status(400).json({ error: "Invalid data", details: err.message });
    }
});


// ----- ENDPOINT 11: Add a Water Quality Report -----
// POST /api/water-quality
router.post("/water-quality", async (req, res) => {
    if (!isMongoConnected()) {
        return res.status(503).json({
            error: "MongoDB is not connected",
            message: "Start MongoDB to add custom data. Run: mongod",
        });
    }

    try {
        const newReport = new WaterReport({
            source: req.body.source,
            zone: req.body.zone,
            date: req.body.date || new Date().toISOString().split("T")[0],
            pH: req.body.pH,
            turbidity: req.body.turbidity,
            coliformCount: req.body.coliformCount,
            dissolvedOxygen: req.body.dissolvedOxygen,
            temperature: req.body.temperature || 25,
            isSafe: req.body.isSafe !== undefined ? req.body.isSafe : true,
            latitude: req.body.latitude,
            longitude: req.body.longitude,
            dataSource: "user",
        });

        const saved = await newReport.save();
        res.status(201).json({
            success: true,
            message: "Water quality report added successfully",
            report: saved,
        });
    } catch (err) {
        res.status(400).json({ error: "Invalid data", details: err.message });
    }
});


// ----- ENDPOINT 12: Get all custom data from MongoDB -----
// GET /api/custom-data
router.get("/custom-data", async (req, res) => {
    if (!isMongoConnected()) {
        return res.json({
            mongoConnected: false,
            cases: [],
            waterReports: [],
            message: "MongoDB is not connected. Custom data unavailable.",
        });
    }

    const cases = await Case.find({}).sort({ createdAt: -1 }).lean();
    const waterReports = await WaterReport.find({}).sort({ createdAt: -1 }).lean();

    res.json({
        mongoConnected: true,
        totalCases: cases.length,
        totalWaterReports: waterReports.length,
        cases,
        waterReports,
    });
});


// ----- ENDPOINT 13: Delete a custom record -----
// DELETE /api/cases/:id
router.delete("/cases/:id", async (req, res) => {
    if (!isMongoConnected()) {
        return res.status(503).json({ error: "MongoDB is not connected" });
    }

    try {
        const result = await Case.findByIdAndDelete(req.params.id);
        if (!result) return res.status(404).json({ error: "Record not found" });
        res.json({ success: true, message: "Case record deleted" });
    } catch (err) {
        res.status(400).json({ error: "Invalid ID", details: err.message });
    }
});


// DELETE /api/water-quality/:id
router.delete("/water-quality/:id", async (req, res) => {
    if (!isMongoConnected()) {
        return res.status(503).json({ error: "MongoDB is not connected" });
    }

    try {
        const result = await WaterReport.findByIdAndDelete(req.params.id);
        if (!result) return res.status(404).json({ error: "Report not found" });
        res.json({ success: true, message: "Water quality report deleted" });
    } catch (err) {
        res.status(400).json({ error: "Invalid ID", details: err.message });
    }
});


// ----- ENDPOINT 14: MongoDB Status -----
// GET /api/db-status
router.get("/db-status", (req, res) => {
    res.json({
        connected: isMongoConnected(),
        uri: isMongoConnected() ? mongoose.connection.host : null,
        database: isMongoConnected() ? mongoose.connection.name : null,
        status: isMongoConnected() ? "Connected" : "Disconnected",
        message: isMongoConnected()
            ? "MongoDB is connected. You can add custom data."
            : "MongoDB is not connected. Start MongoDB to enable custom data entry.",
    });
});


// ----- ENDPOINT 15: Export MongoDB data to JSON files -----
// POST /api/export
const fs = require("fs");
const path = require("path");

router.post("/export", async (req, res) => {
    if (!isMongoConnected()) {
        return res.status(503).json({ error: "MongoDB is not connected" });
    }

    try {
        const exportDir = path.join(__dirname, "..", "mongo saved reports");

        // Ensure folder exists
        if (!fs.existsSync(exportDir)) {
            fs.mkdirSync(exportDir, { recursive: true });
        }

        const cases = await Case.find({}).lean();
        const waterReports = await WaterReport.find({}).lean();
        const timestamp = new Date().toISOString().replace(/[:.]/g, "-");

        // Save cases
        const casesFile = path.join(exportDir, `cases_${timestamp}.json`);
        fs.writeFileSync(casesFile, JSON.stringify(cases, null, 2));

        // Save water reports
        const waterFile = path.join(exportDir, `water_reports_${timestamp}.json`);
        fs.writeFileSync(waterFile, JSON.stringify(waterReports, null, 2));

        // Save a combined summary
        const summaryFile = path.join(exportDir, `summary_${timestamp}.json`);
        fs.writeFileSync(summaryFile, JSON.stringify({
            exportedAt: new Date().toISOString(),
            totalCases: cases.length,
            totalWaterReports: waterReports.length,
            casesByDisease: cases.reduce((acc, c) => { acc[c.disease] = (acc[c.disease] || 0) + c.caseCount; return acc; }, {}),
            casesByZone: cases.reduce((acc, c) => { acc[c.zone] = (acc[c.zone] || 0) + c.caseCount; return acc; }, {}),
        }, null, 2));

        res.json({
            success: true,
            message: "Data exported to 'mongo saved reports' folder",
            files: {
                cases: `cases_${timestamp}.json`,
                waterReports: `water_reports_${timestamp}.json`,
                summary: `summary_${timestamp}.json`,
            },
            recordCounts: { cases: cases.length, waterReports: waterReports.length },
        });
    } catch (err) {
        res.status(500).json({ error: "Export failed", details: err.message });
    }
});


module.exports = { router, initRoutes };
