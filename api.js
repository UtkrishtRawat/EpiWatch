/**
 * API Routes — REST endpoints for the Disease Outbreak Dashboard.
 */

const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const DataPreprocessor = require('../utils/dataPreprocessor');
const AnomalyDetector = require('../models/anomalyDetector');
const Forecaster = require('../models/forecaster');
const RiskClassifier = require('../models/riskClassifier');
const { regions } = require('../data/regions');

// ── Data Loading ──────────────────────────────────────────
let admissions = [];
let waterQuality = [];
let admissionAgg = [];
let waterAgg = [];
let anomalies = {};
let forecasts = {};
let riskClassifications = [];
let alerts = [];
let correlations = [];

function loadAndProcess() {
    const dataDir = path.join(__dirname, '..', 'data');
    const admFile = path.join(dataDir, 'hospital_admissions.json');
    const waterFile = path.join(dataDir, 'water_quality.json');

    if (!fs.existsSync(admFile) || !fs.existsSync(waterFile)) {
        console.warn('⚠️  Data files not found. Run "npm run generate-data" first.');
        return false;
    }

    console.log('📂 Loading datasets...');
    admissions = JSON.parse(fs.readFileSync(admFile, 'utf8'));
    waterQuality = JSON.parse(fs.readFileSync(waterFile, 'utf8'));

    console.log(`   Loaded ${admissions.length} admissions, ${waterQuality.length} water reports`);

    // Preprocess
    console.log('⚙️  Preprocessing data...');
    admissionAgg = DataPreprocessor.aggregateAdmissions(admissions, 6);
    waterAgg = DataPreprocessor.aggregateWaterQuality(waterQuality, 24);

    // Anomaly detection
    console.log('🔍 Running anomaly detection...');
    const detector = new AnomalyDetector({ zThreshold: 2.0, windowSize: 20 });
    anomalies = detector.detectAdmissionAnomalies(admissionAgg);
    const waterAnomalies = detector.detectWaterAnomalies(waterAgg);
    correlations = detector.analyzeWaterDiseaseCorrelation(admissionAgg, waterAgg);

    // Forecasting
    console.log('📈 Generating 48h forecasts...');
    const forecaster = new Forecaster({ alpha: 0.3, trendAlpha: 0.1 });
    forecasts = forecaster.forecastAll(admissionAgg);

    // Risk classification
    console.log('🎯 Classifying risk levels...');
    const classifier = new RiskClassifier();
    riskClassifications = classifier.classifyAll(regions, admissionAgg, waterAgg, forecasts);
    alerts = classifier.generateAlerts(riskClassifications, anomalies);

    console.log('✅ Processing complete!\n');
    return true;
}

// Load on startup
loadAndProcess();

// ── Endpoints ─────────────────────────────────────────────

/**
 * GET /api/dashboard — Full dashboard data
 */
router.get('/dashboard', (req, res) => {
    // Recent stats (last 24h)
    const last24h = admissionAgg.slice(-4);
    const prev24h = admissionAgg.slice(-8, -4);

    const totalRecent = last24h.reduce((s, a) => s + a.total, 0);
    const totalPrev = prev24h.reduce((s, a) => s + a.total, 0) || 1;
    const changePercent = Math.round(((totalRecent - totalPrev) / totalPrev) * 100);

    // Disease breakdown (last 24h)
    const diseaseBreakdown = {};
    for (const bucket of last24h) {
        for (const [disease, count] of Object.entries(bucket.byDisease)) {
            diseaseBreakdown[disease] = (diseaseBreakdown[disease] || 0) + count;
        }
    }

    // Severity breakdown
    const severityBreakdown = { Mild: 0, Moderate: 0, Severe: 0 };
    for (const bucket of last24h) {
        for (const [sev, count] of Object.entries(bucket.bySeverity)) {
            severityBreakdown[sev] += count;
        }
    }

    // Active regions count
    const activeRegions = new Set();
    for (const bucket of last24h) {
        for (const regionId of Object.keys(bucket.byRegion)) {
            activeRegions.add(regionId);
        }
    }

    // Water quality overview
    const latestWater = waterAgg[waterAgg.length - 1];
    const waterSummary = {};
    if (latestWater) {
        for (const [regionId, data] of Object.entries(latestWater.regionAverages)) {
            const region = regions.find(r => r.id === regionId);
            waterSummary[regionId] = {
                regionName: region?.name || regionId,
                wqi: DataPreprocessor.computeWQI({
                    pH: data.avgPH,
                    turbidity: data.avgTurbidity,
                    coliformCount: data.avgColiform,
                    dissolvedOxygen: data.avgDO,
                    chlorineResidual: 0.5
                }),
                ...data
            };
        }
    }

    res.json({
        summary: {
            totalAdmissions24h: totalRecent,
            changePercent,
            trend: changePercent > 10 ? 'rising' : changePercent < -10 ? 'falling' : 'stable',
            activeRegions: activeRegions.size,
            totalRegions: regions.length,
            criticalAlerts: alerts.filter(a => a.severity === 'critical').length,
            highAlerts: alerts.filter(a => a.severity === 'high').length,
            totalRecords: admissions.length
        },
        diseaseBreakdown,
        severityBreakdown,
        waterSummary,
        topRiskRegions: riskClassifications.slice(0, 5),
        recentAlerts: alerts.slice(0, 10),
        lastUpdated: new Date().toISOString()
    });
});

/**
 * GET /api/admissions — Admission trend data
 */
router.get('/admissions', (req, res) => {
    const limit = parseInt(req.query.limit) || 120;
    const disease = req.query.disease;
    const regionId = req.query.region;

    let data = admissionAgg.slice(-limit);

    if (disease || regionId) {
        data = data.map(bucket => ({
            timestamp: bucket.timestamp,
            total: disease ? (bucket.byDisease[disease] || 0) : (regionId ? (bucket.byRegion[regionId] || 0) : bucket.total),
            byDisease: bucket.byDisease,
            byRegion: bucket.byRegion,
            bySeverity: bucket.bySeverity
        }));
    }

    res.json({
        data,
        total: data.length,
        range: {
            from: data[0]?.timestamp,
            to: data[data.length - 1]?.timestamp
        }
    });
});

/**
 * GET /api/water-quality — Water quality data
 */
router.get('/water-quality', (req, res) => {
    const regionId = req.query.region;
    let data = waterAgg;

    if (regionId) {
        data = data.map(w => ({
            timestamp: w.timestamp,
            data: w.regionAverages[regionId] || null
        })).filter(d => d.data);
    }

    res.json({
        data,
        regions: regions.map(r => ({ id: r.id, name: r.name }))
    });
});

/**
 * GET /api/predictions — 48-hour forecasts
 */
router.get('/predictions', (req, res) => {
    res.json(forecasts);
});

/**
 * GET /api/alerts — Active alerts
 */
router.get('/alerts', (req, res) => {
    const severity = req.query.severity;
    let filtered = alerts;

    if (severity) {
        filtered = alerts.filter(a => a.severity === severity);
    }

    res.json({
        alerts: filtered,
        total: filtered.length,
        bySeverity: {
            critical: alerts.filter(a => a.severity === 'critical').length,
            high: alerts.filter(a => a.severity === 'high').length,
            moderate: alerts.filter(a => a.severity === 'moderate').length
        }
    });
});

/**
 * GET /api/hotspots — Geographic hotspot data for heatmap
 */
router.get('/hotspots', (req, res) => {
    // Get recent admissions for heatmap
    const recentAdmissions = admissions.filter(a => {
        const ts = new Date(a.timestamp);
        const cutoff = new Date(Date.now() - 72 * 3600000); // Last 72h
        return ts >= cutoff;
    });

    const hotspotData = recentAdmissions.map(a => ({
        lat: a.lat,
        lng: a.lng,
        intensity: a.severity === 'Severe' ? 1.0 : a.severity === 'Moderate' ? 0.6 : 0.3,
        disease: a.disease,
        regionId: a.regionId
    }));

    // Water quality points
    const recentWater = waterQuality.filter(w => {
        const ts = new Date(w.timestamp);
        const cutoff = new Date(Date.now() - 72 * 3600000);
        return ts >= cutoff;
    });

    const waterPoints = recentWater.map(w => ({
        lat: w.lat,
        lng: w.lng,
        wqi: DataPreprocessor.computeWQI(w),
        regionId: w.regionId
    }));

    res.json({
        admissionHotspots: hotspotData,
        waterQualityPoints: waterPoints,
        regionRisks: riskClassifications.map(rc => ({
            ...rc,
            center: regions.find(r => r.id === rc.regionId)?.center
        })),
        correlations: correlations.slice(0, 10)
    });
});

/**
 * GET /api/regions/:id/risk — Risk for a specific region
 */
router.get('/regions/:id/risk', (req, res) => {
    const rc = riskClassifications.find(r => r.regionId === req.params.id);
    if (!rc) return res.status(404).json({ error: 'Region not found' });

    const regionAlerts = alerts.filter(a => a.regionId === req.params.id);
    const region = regions.find(r => r.id === req.params.id);

    res.json({
        ...rc,
        alerts: regionAlerts,
        regionInfo: region,
        forecast: forecasts.byRegion?.[req.params.id]
    });
});

/**
 * POST /api/refresh — Reload and reprocess data
 */
router.post('/refresh', (req, res) => {
    const success = loadAndProcess();
    res.json({ success, message: success ? 'Data refreshed' : 'Data files not found' });
});

module.exports = router;
