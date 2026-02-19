// ============================================================
// FORECASTING MODULE
// Uses Simple Moving Average (SMA) to predict disease cases
// 48 hours (2 days) into the future
// ============================================================

/**
 * Calculate Simple Moving Average for the last 'window' days
 */
function simpleMovingAverage(values, window = 7) {
    if (values.length === 0) return 0;
    const slice = values.slice(-window);
    const sum = slice.reduce((total, val) => total + val, 0);
    return sum / slice.length;
}

/**
 * Calculate trend (are cases going up or down?)
 */
function calculateTrend(values) {
    if (values.length < 2) return 0;
    const recent = values.slice(-3);
    const older = values.slice(-6, -3);
    if (older.length === 0) return 0;
    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;
    return recentAvg - olderAvg;
}

/**
 * Forecast disease cases for the next 48 hours (2 days)
 */
function forecast48Hours(dailyCounts) {
    const diseases = ["Cholera", "Typhoid", "Dengue", "Malaria", "Hepatitis A"];
    const forecasts = {};

    for (const disease of diseases) {
        const counts = dailyCounts.map(day => day[disease] || 0);
        const sma = simpleMovingAverage(counts, 7);
        const trend = calculateTrend(counts);

        const day1Prediction = Math.max(0, Math.round(sma + trend * 0.5));
        const day2Prediction = Math.max(0, Math.round(sma + trend * 1.0));

        const maxPredicted = Math.max(day1Prediction, day2Prediction);
        let riskLevel = "Low";
        let riskColor = "#4caf50";

        if (maxPredicted > sma * 2) { riskLevel = "Critical"; riskColor = "#f44336"; }
        else if (maxPredicted > sma * 1.5) { riskLevel = "High"; riskColor = "#ff9800"; }
        else if (maxPredicted > sma * 1.2) { riskLevel = "Medium"; riskColor = "#ffeb3b"; }

        const today = new Date();
        const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
        const dayAfter = new Date(today); dayAfter.setDate(dayAfter.getDate() + 2);

        forecasts[disease] = {
            disease,
            currentAverage: parseFloat(sma.toFixed(1)),
            trend: trend > 0.5 ? "Rising ↑" : trend < -0.5 ? "Falling ↓" : "Stable →",
            trendValue: parseFloat(trend.toFixed(2)),
            predictions: [
                { date: tomorrow.toISOString().split("T")[0], label: "Next 24 hours", predictedCases: day1Prediction },
                { date: dayAfter.toISOString().split("T")[0], label: "24-48 hours", predictedCases: day2Prediction },
            ],
            riskLevel,
            riskColor,
        };
    }

    return forecasts;
}

/**
 * Generate automated alerts based on forecasts and anomalies
 */
function generateAlerts(forecasts, anomalies) {
    const alerts = [];
    let alertId = 1;

    for (const disease of Object.keys(forecasts)) {
        const fc = forecasts[disease];
        if (fc.riskLevel === "Critical") {
            alerts.push({
                id: alertId++, type: "CRITICAL", icon: "🚨",
                title: `Critical Risk: ${disease}`,
                message: `${disease} cases predicted to spike to ${fc.predictions[0].predictedCases} in next 24 hours. Immediate action needed!`,
                disease, timestamp: new Date().toISOString(),
            });
        } else if (fc.riskLevel === "High") {
            alerts.push({
                id: alertId++, type: "WARNING", icon: "⚠️",
                title: `High Risk: ${disease}`,
                message: `${disease} showing upward trend. Expected ${fc.predictions[0].predictedCases} cases in next 24 hours.`,
                disease, timestamp: new Date().toISOString(),
            });
        }
    }

    const recentAnomalies = anomalies.slice(0, 5);
    for (const anomaly of recentAnomalies) {
        alerts.push({
            id: alertId++,
            type: anomaly.severity === "Critical" ? "CRITICAL" : "ANOMALY",
            icon: anomaly.severity === "Critical" ? "🚨" : "📊",
            title: `Anomaly Detected: ${anomaly.disease}`,
            message: anomaly.message,
            disease: anomaly.disease,
            timestamp: anomaly.date + "T00:00:00Z",
        });
    }

    alerts.push({
        id: alertId++, type: "INFO", icon: "ℹ️",
        title: "System Status",
        message: "Dashboard data refreshed. All monitoring systems operational.",
        disease: null, timestamp: new Date().toISOString(),
    });

    return alerts;
}

module.exports = { forecast48Hours, generateAlerts };
