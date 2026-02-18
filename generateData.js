/**
 * Synthetic Data Generator for Disease Outbreak Dashboard
 * Generates realistic hospital admission and water quality datasets
 * with injected anomaly periods for ML testing.
 */

const fs = require('fs');
const path = require('path');
const { regions } = require('./regions');

// ── Configuration ──────────────────────────────────────────
const DAYS_OF_DATA = 30;
const RECORDS_PER_DAY_BASE = 40;
const HOURS_IN_DAY = 24;

const DISEASES = [
    { name: 'Cholera', baseRate: 0.25, waterLinked: true, severity: [0.3, 0.5, 0.2] },
    { name: 'Typhoid', baseRate: 0.30, waterLinked: true, severity: [0.25, 0.45, 0.3] },
    { name: 'Dengue', baseRate: 0.25, waterLinked: false, severity: [0.35, 0.4, 0.25] },
    { name: 'Malaria', baseRate: 0.20, waterLinked: false, severity: [0.4, 0.35, 0.25] }
];

const SEVERITY_LEVELS = ['Mild', 'Moderate', 'Severe'];

const HOSPITALS = [
    'City General Hospital', 'Central Medical Center', 'North District Hospital',
    'Community Health Clinic', 'South Medical Institute', 'Riverside Clinic',
    'East Industrial Hospital', 'West General Hospital', 'Suburban Health Center',
    'Heritage Hospital', 'Old Town Clinic', 'Settlement Health Post',
    'SW Medical College Hospital', 'Suburban District Hospital', 'Patel Clinic'
];

// Anomaly injection windows (day index ranges and multiplier)
const ANOMALY_WINDOWS = [
    { startDay: 8, endDay: 11, disease: 'Cholera', regionId: 'region-4', multiplier: 3.5 },
    { startDay: 15, endDay: 17, disease: 'Typhoid', regionId: 'region-7', multiplier: 4.0 },
    { startDay: 22, endDay: 25, disease: 'Dengue', regionId: 'region-2', multiplier: 3.0 },
    { startDay: 27, endDay: 29, disease: 'Cholera', regionId: 'region-6', multiplier: 5.0 }
];

// ── Utilities ──────────────────────────────────────────────
function randomBetween(min, max) {
    return Math.random() * (max - min) + min;
}

function randomInt(min, max) {
    return Math.floor(randomBetween(min, max + 1));
}

function pickWeighted(items, weights) {
    const total = weights.reduce((s, w) => s + w, 0);
    let r = Math.random() * total;
    for (let i = 0; i < items.length; i++) {
        r -= weights[i];
        if (r <= 0) return items[i];
    }
    return items[items.length - 1];
}

function jitterCoord(center, range) {
    return center + (Math.random() - 0.5) * range;
}

function generateAge() {
    const ageGroups = [
        { min: 0, max: 5, weight: 0.15 },
        { min: 6, max: 17, weight: 0.20 },
        { min: 18, max: 45, weight: 0.35 },
        { min: 46, max: 65, weight: 0.20 },
        { min: 66, max: 90, weight: 0.10 }
    ];
    const group = pickWeighted(ageGroups, ageGroups.map(g => g.weight));
    return randomInt(group.min, group.max);
}

// ── Hospital Admission Generator ───────────────────────────
function generateHospitalAdmissions() {
    const admissions = [];
    const now = new Date();
    const startDate = new Date(now.getTime() - DAYS_OF_DATA * 24 * 60 * 60 * 1000);

    for (let day = 0; day < DAYS_OF_DATA; day++) {
        const dayDate = new Date(startDate.getTime() + day * 24 * 60 * 60 * 1000);

        // Seasonal variation (slight)
        const seasonalFactor = 1 + 0.15 * Math.sin((day / DAYS_OF_DATA) * Math.PI * 2);

        for (let hour = 0; hour < HOURS_IN_DAY; hour++) {
            // Diurnal pattern — more admissions during day
            const hourFactor = 0.5 + 0.5 * Math.sin(((hour - 6) / 24) * Math.PI * 2);
            const baseCount = Math.round((RECORDS_PER_DAY_BASE / HOURS_IN_DAY) * seasonalFactor * hourFactor);
            const count = Math.max(1, baseCount + randomInt(-1, 2));

            for (let i = 0; i < count; i++) {
                const region = regions[randomInt(0, regions.length - 1)];
                const disease = pickWeighted(DISEASES, DISEASES.map(d => d.baseRate));
                const severityIdx = pickWeighted([0, 1, 2], disease.severity);

                // Check anomaly injection
                let anomalyMultiplier = 1;
                let isAnomaly = false;
                for (const aw of ANOMALY_WINDOWS) {
                    if (day >= aw.startDay && day <= aw.endDay &&
                        disease.name === aw.disease && region.id === aw.regionId) {
                        anomalyMultiplier = aw.multiplier;
                        isAnomaly = true;
                    }
                }

                // Only generate extra records for anomaly multiplier
                const extraRecords = isAnomaly ? Math.round(anomalyMultiplier - 1) : 0;

                const timestamp = new Date(dayDate);
                timestamp.setHours(hour, randomInt(0, 59), randomInt(0, 59));

                const baseRecord = {
                    id: `ADM-${day.toString().padStart(2, '0')}${hour.toString().padStart(2, '0')}${i.toString().padStart(3, '0')}`,
                    timestamp: timestamp.toISOString(),
                    disease: disease.name,
                    severity: SEVERITY_LEVELS[severityIdx],
                    regionId: region.id,
                    regionName: region.name,
                    lat: jitterCoord(region.center.lat, 0.02),
                    lng: jitterCoord(region.center.lng, 0.02),
                    hospital: HOSPITALS[randomInt(0, HOSPITALS.length - 1)],
                    patientAge: generateAge(),
                    patientGender: Math.random() > 0.48 ? 'Male' : 'Female',
                    isAnomaly: isAnomaly
                };

                admissions.push(baseRecord);

                // Add extra anomaly records
                for (let e = 0; e < extraRecords; e++) {
                    const anomalyTs = new Date(timestamp);
                    anomalyTs.setMinutes(anomalyTs.getMinutes() + randomInt(1, 30));
                    admissions.push({
                        ...baseRecord,
                        id: `${baseRecord.id}-A${e}`,
                        timestamp: anomalyTs.toISOString(),
                        lat: jitterCoord(region.center.lat, 0.025),
                        lng: jitterCoord(region.center.lng, 0.025),
                        patientAge: generateAge(),
                        patientGender: Math.random() > 0.48 ? 'Male' : 'Female'
                    });
                }
            }
        }
    }

    // Sort by timestamp
    admissions.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    return admissions;
}

// ── Water Quality Generator ────────────────────────────────
function generateWaterQuality() {
    const reports = [];
    const now = new Date();
    const startDate = new Date(now.getTime() - DAYS_OF_DATA * 24 * 60 * 60 * 1000);

    for (let day = 0; day < DAYS_OF_DATA; day++) {
        const dayDate = new Date(startDate.getTime() + day * 24 * 60 * 60 * 1000);

        // 3 samples per day per region
        for (const region of regions) {
            for (let sample = 0; sample < 3; sample++) {
                const hour = [6, 14, 22][sample]; // morning, afternoon, night
                const timestamp = new Date(dayDate);
                timestamp.setHours(hour, randomInt(0, 30));

                // Check if this region/day is in an anomaly window for waterborne diseases
                let waterAnomaly = false;
                for (const aw of ANOMALY_WINDOWS) {
                    if (day >= aw.startDay - 1 && day <= aw.endDay &&
                        region.id === aw.regionId &&
                        DISEASES.find(d => d.name === aw.disease)?.waterLinked) {
                        waterAnomaly = true;
                    }
                }

                // Normal water quality ranges
                let pH = randomBetween(6.5, 8.5);
                let turbidity = randomBetween(0.5, 5.0);   // NTU
                let coliformCount = randomInt(0, 10);        // CFU/100mL
                let dissolvedOxygen = randomBetween(5.0, 9.0); // mg/L
                let conductivity = randomBetween(200, 800);  // µS/cm
                let leadLevel = randomBetween(0, 0.01);      // mg/L
                let arsenicLevel = randomBetween(0, 0.008);   // mg/L
                let chlorineResidual = randomBetween(0.2, 1.0); // mg/L

                // Degrade water quality during anomaly periods
                if (waterAnomaly) {
                    pH = randomBetween(5.5, 6.5);
                    turbidity = randomBetween(8.0, 25.0);
                    coliformCount = randomInt(50, 500);
                    dissolvedOxygen = randomBetween(2.0, 4.5);
                    conductivity = randomBetween(1000, 2000);
                    leadLevel = randomBetween(0.02, 0.08);
                    arsenicLevel = randomBetween(0.015, 0.05);
                    chlorineResidual = randomBetween(0, 0.1);
                }

                reports.push({
                    id: `WQ-${region.id}-${day.toString().padStart(2, '0')}-${sample}`,
                    timestamp: timestamp.toISOString(),
                    regionId: region.id,
                    regionName: region.name,
                    sampleLocation: region.waterSources[sample % region.waterSources.length],
                    lat: jitterCoord(region.center.lat, 0.01),
                    lng: jitterCoord(region.center.lng, 0.01),
                    pH: Math.round(pH * 100) / 100,
                    turbidity: Math.round(turbidity * 100) / 100,
                    coliformCount: coliformCount,
                    dissolvedOxygen: Math.round(dissolvedOxygen * 100) / 100,
                    conductivity: Math.round(conductivity),
                    leadLevel: Math.round(leadLevel * 1000) / 1000,
                    arsenicLevel: Math.round(arsenicLevel * 1000) / 1000,
                    chlorineResidual: Math.round(chlorineResidual * 100) / 100,
                    isAnomaly: waterAnomaly
                });
            }
        }
    }

    reports.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    return reports;
}

// ── Main ───────────────────────────────────────────────────
function main() {
    console.log('🔬 Generating synthetic datasets...\n');

    console.log('  📋 Generating hospital admissions...');
    const admissions = generateHospitalAdmissions();
    console.log(`     ✅ Generated ${admissions.length} admission records`);

    console.log('  💧 Generating water quality reports...');
    const waterQuality = generateWaterQuality();
    console.log(`     ✅ Generated ${waterQuality.length} water quality reports`);

    // Write to files
    const dataDir = __dirname;

    fs.writeFileSync(
        path.join(dataDir, 'hospital_admissions.json'),
        JSON.stringify(admissions, null, 2)
    );
    console.log('\n  💾 Saved hospital_admissions.json');

    fs.writeFileSync(
        path.join(dataDir, 'water_quality.json'),
        JSON.stringify(waterQuality, null, 2)
    );
    console.log('  💾 Saved water_quality.json');

    // Summary stats
    console.log('\n📊 Dataset Summary:');
    console.log(`   Days of data: ${DAYS_OF_DATA}`);
    console.log(`   Regions: ${regions.length}`);
    console.log(`   Anomaly windows: ${ANOMALY_WINDOWS.length}`);

    const anomalyAdmissions = admissions.filter(a => a.isAnomaly).length;
    const anomalyWater = waterQuality.filter(w => w.isAnomaly).length;
    console.log(`   Anomaly admissions: ${anomalyAdmissions} (${(anomalyAdmissions / admissions.length * 100).toFixed(1)}%)`);
    console.log(`   Anomaly water samples: ${anomalyWater} (${(anomalyWater / waterQuality.length * 100).toFixed(1)}%)`);
    console.log('\n✨ Data generation complete!');
}

main();
