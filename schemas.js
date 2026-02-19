// ============================================================
// MONGODB MODELS
// Schemas for storing custom user-entered data
// All data remains ANONYMIZED — no personal identity fields
// ============================================================

const mongoose = require("mongoose");

// ----- Schema 1: Disease Case Record -----
// Stores grouped case data like: "3 people with Cholera in Zone A"
const caseSchema = new mongoose.Schema({
    date: { type: String, required: true },   // "2026-02-19"
    zone: { type: String, required: true },   // "Zone A - Riverside"
    disease: { type: String, required: true },   // "Cholera"
    diseaseType: { type: String, required: true },   // "Waterborne" or "Mosquito-borne"
    spreadBy: { type: String, default: "" },      // "Contaminated water"
    caseCount: { type: Number, required: true, min: 1 },
    activeCases: { type: Number, default: 0 },
    severityBreakdown: {
        Mild: { type: Number, default: 0 },
        Moderate: { type: Number, default: 0 },
        Severe: { type: Number, default: 0 },
        Critical: { type: Number, default: 0 },
    },
    ageGroupBreakdown: { type: Map, of: Number, default: {} },
    areaInfo: {
        latitude: { type: Number },
        longitude: { type: Number },
        population: { type: Number },
        waterSource: { type: String },
    },
    source: { type: String, default: "user" },  // "user" = manually added
    createdAt: { type: Date, default: Date.now },
});

// ----- Schema 2: Water Quality Report -----
const waterReportSchema = new mongoose.Schema({
    source: { type: String, required: true },   // "River Intake Point A"
    zone: { type: String, required: true },   // "Zone A - Riverside"
    date: { type: String, required: true },   // "2026-02-19"
    pH: { type: Number, required: true },
    turbidity: { type: Number, required: true },
    coliformCount: { type: Number, required: true },
    dissolvedOxygen: { type: Number, required: true },
    temperature: { type: Number, default: 25 },
    isSafe: { type: Boolean, default: true },
    latitude: { type: Number },
    longitude: { type: Number },
    dataSource: { type: String, default: "user" },
    createdAt: { type: Date, default: Date.now },
});

// Create models
const Case = mongoose.model("Case", caseSchema);
const WaterReport = mongoose.model("WaterReport", waterReportSchema);

module.exports = { Case, WaterReport };
