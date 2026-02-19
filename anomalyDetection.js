// ============================================================
// ANOMALY DETECTION MODULE
// Uses Z-Score method to find unusual spikes in disease cases
// and correlates them with water quality data
// ============================================================

// ----- What is Z-Score? -----
// Z-Score tells us how far a data point is from the average.
// If a day has a Z-Score > 2, it means the number of cases
// that day is unusually high (an anomaly / potential outbreak).

/**
 * Calculate the mean (average) of an array of numbers
 */
function calculateMean(numbers) {
    if (numbers.length === 0) return 0;
    const sum = numbers.reduce((total, num) => total + num, 0);
    return sum / numbers.length;
}

/**
 * Calculate the standard deviation of an array of numbers
 */
function calculateStdDev(numbers) {
    if (numbers.length === 0) return 0;
    const mean = calculateMean(numbers);
    const squaredDiffs = numbers.map(num => Math.pow(num - mean, 2));
    const avgSquaredDiff = calculateMean(squaredDiffs);
    return Math.sqrt(avgSquaredDiff);
}

/**
 * Detect anomalies in daily admission counts using Z-Score method
 *
 * @param {Array} dailyCounts - Array of { date, Cholera, Typhoid, ... }
 * @param {number} threshold - Z-Score threshold (default: 1.5)
 * @returns {Array} - List of detected anomalies
 */
function detectAnomalies(dailyCounts, threshold = 1.5) {
    const anomalies = [];
    const diseases = ["Cholera", "Typhoid", "Dengue", "Malaria", "Hepatitis A"];

    for (const disease of diseases) {
        const counts = dailyCounts.map(day => day[disease] || 0);
        const mean = calculateMean(counts);
        const stdDev = calculateStdDev(counts);

        for (let i = 0; i < dailyCounts.length; i++) {
            const count = dailyCounts[i][disease] || 0;
            if (stdDev === 0) continue;

            const zScore = (count - mean) / stdDev;

            if (zScore > threshold) {
                anomalies.push({
                    date: dailyCounts[i].date,
                    disease: disease,
                    count: count,
                    averageCount: parseFloat(mean.toFixed(1)),
                    zScore: parseFloat(zScore.toFixed(2)),
                    severity: zScore > 3 ? "Critical" : zScore > 2.5 ? "High" : "Medium",
                    message: `Unusual spike in ${disease} cases: ${count} cases (avg: ${mean.toFixed(1)})`,
                });
            }
        }
    }

    anomalies.sort((a, b) => b.zScore - a.zScore);
    return anomalies;
}


/**
 * Correlate water quality with disease cases (by zone)
 * Uses anonymized zone-level counts — no personal data
 *
 * @param {Array} waterReports - Water quality data
 * @param {Array} hotspots - Zone-level case summaries
 * @returns {Array} - Correlation results by zone
 */
function correlateWaterAndDisease(waterReports, hotspots) {
    const correlations = [];

    // Group water reports by zone
    const waterByZone = {};
    for (const report of waterReports) {
        if (!waterByZone[report.zone]) {
            waterByZone[report.zone] = [];
        }
        waterByZone[report.zone].push(report);
    }

    // For each hotspot zone, correlate with water quality
    for (const zone of hotspots) {
        const zoneWater = waterByZone[zone.zone] || [];

        if (zoneWater.length === 0) {
            // No water data for this zone, still include with defaults
            correlations.push({
                zone: zone.zone,
                totalPatients: zone.totalCases,
                diseaseCounts: zone.diseases,
                waterQuality: { avgPH: 0, avgTurbidity: 0, avgColiform: 0, unsafeReadingsPercent: 0 },
                waterRisk: "No Data",
                correlationNote: "ℹ️ No water quality data available for this zone",
            });
            continue;
        }

        // Calculate average water quality
        const avgPH = calculateMean(zoneWater.map(r => r.pH));
        const avgTurbidity = calculateMean(zoneWater.map(r => r.turbidity));
        const avgColiform = calculateMean(zoneWater.map(r => r.coliformCount));
        const unsafeCount = zoneWater.filter(r => !r.isSafe).length;
        const unsafePercent = ((unsafeCount / zoneWater.length) * 100).toFixed(1);

        // Determine risk level
        let waterRisk = "Low";
        if (avgColiform > 100 || avgTurbidity > 10 || avgPH < 6.0) {
            waterRisk = "High";
        } else if (avgColiform > 30 || avgTurbidity > 5 || avgPH < 6.5) {
            waterRisk = "Medium";
        }

        correlations.push({
            zone: zone.zone,
            totalPatients: zone.totalCases,
            diseaseCounts: zone.diseases,
            waterQuality: {
                avgPH: parseFloat(avgPH.toFixed(2)),
                avgTurbidity: parseFloat(avgTurbidity.toFixed(2)),
                avgColiform: parseFloat(avgColiform.toFixed(0)),
                unsafeReadingsPercent: parseFloat(unsafePercent),
            },
            waterRisk: waterRisk,
            correlationNote: waterRisk === "High" && zone.totalCases > 100
                ? "⚠️ Strong correlation: Poor water quality matches high disease cases"
                : waterRisk === "Medium"
                    ? "⚡ Moderate correlation detected"
                    : "✅ No significant correlation",
        });
    }

    correlations.sort((a, b) => b.totalPatients - a.totalPatients);
    return correlations;
}

module.exports = { detectAnomalies, correlateWaterAndDisease };
