/**
 * Risk Classifier — Multi-factor risk scoring with 4-tier classification.
 * Combines admission velocity, water quality indices, population density,
 * and historical outbreak patterns.
 */

const DataPreprocessor = require('../utils/dataPreprocessor');

class RiskClassifier {
    constructor() {
        this.RISK_LEVELS = {
            LOW: { label: 'Low', color: '#22c55e', threshold: 0.25, icon: '✅' },
            MODERATE: { label: 'Moderate', color: '#f59e0b', threshold: 0.50, icon: '⚠️' },
            HIGH: { label: 'High', color: '#f97316', threshold: 0.75, icon: '🔶' },
            CRITICAL: { label: 'Critical', color: '#ef4444', threshold: 1.00, icon: '🚨' }
        };

        this.weights = {
            admissionVelocity: 0.30,
            waterQuality: 0.25,
            severityIndex: 0.20,
            historicalRisk: 0.10,
            populationDensity: 0.08,
            trendScore: 0.07
        };
    }

    /**
     * Compute admission velocity — rate of change in recent admission counts.
     */
    _admissionVelocity(recentAdmissions, regionId) {
        const last24h = recentAdmissions.slice(-4); // 4 x 6h buckets
        const prev24h = recentAdmissions.slice(-8, -4);

        const recentCount = last24h.reduce((s, a) => s + (a.byRegion[regionId] || 0), 0);
        const prevCount = prev24h.reduce((s, a) => s + (a.byRegion[regionId] || 0), 0) || 1;

        const velocity = (recentCount - prevCount) / prevCount;
        // Normalize to 0-1, cap at 3x increase
        return Math.min(1, Math.max(0, velocity / 3));
    }

    /**
     * Compute water quality risk score for a region.
     */
    _waterQualityScore(waterAgg, regionId) {
        const recentWater = waterAgg.slice(-3); // Last 3 days
        if (recentWater.length === 0) return 0.5;

        const scores = recentWater.map(w => {
            const data = w.regionAverages[regionId];
            if (!data) return 50;
            return DataPreprocessor.computeWQI({
                pH: data.avgPH,
                turbidity: data.avgTurbidity,
                coliformCount: data.avgColiform,
                dissolvedOxygen: data.avgDO,
                chlorineResidual: 0.5
            });
        });

        const avgWQI = scores.reduce((a, b) => a + b, 0) / scores.length;
        // Invert: low WQI = high risk
        return 1 - (avgWQI / 100);
    }

    /**
     * Compute severity index — proportion of severe cases.
     */
    _severityIndex(recentAdmissions) {
        const last48h = recentAdmissions.slice(-8);
        const totalSevere = last48h.reduce((s, a) => s + (a.bySeverity['Severe'] || 0), 0);
        const total = last48h.reduce((s, a) => s + a.total, 0) || 1;
        return Math.min(1, (totalSevere / total) * 3); // Scale up — typical severe ratio is ~25%
    }

    /**
     * Compute trend score from forecaster output.
     */
    _trendScore(forecast) {
        if (!forecast || forecast.trend === 'insufficient_data') return 0.5;
        if (forecast.trend === 'rising') return Math.min(1, 0.6 + forecast.trendValue * 0.1);
        if (forecast.trend === 'falling') return Math.max(0, 0.4 - Math.abs(forecast.trendValue) * 0.1);
        return 0.5;
    }

    /**
     * Classify risk for a single region.
     */
    classifyRegion(region, admissionAgg, waterAgg, forecast) {
        const velocity = this._admissionVelocity(admissionAgg, region.id);
        const waterScore = this._waterQualityScore(waterAgg, region.id);
        const severity = this._severityIndex(admissionAgg);
        const historical = region.historicalRisk;
        const popDensity = Math.min(1, region.population / 200000);
        const trend = this._trendScore(forecast);

        // Weighted composite score
        const riskScore =
            velocity * this.weights.admissionVelocity +
            waterScore * this.weights.waterQuality +
            severity * this.weights.severityIndex +
            historical * this.weights.historicalRisk +
            popDensity * this.weights.populationDensity +
            trend * this.weights.trendScore;

        // Classification
        let riskLevel;
        if (riskScore >= this.RISK_LEVELS.CRITICAL.threshold * 0.75) riskLevel = 'CRITICAL';
        else if (riskScore >= this.RISK_LEVELS.HIGH.threshold * 0.65) riskLevel = 'HIGH';
        else if (riskScore >= this.RISK_LEVELS.MODERATE.threshold * 0.55) riskLevel = 'MODERATE';
        else riskLevel = 'LOW';

        return {
            regionId: region.id,
            regionName: region.name,
            riskScore: Math.round(riskScore * 100) / 100,
            riskLevel,
            riskInfo: this.RISK_LEVELS[riskLevel],
            factors: {
                admissionVelocity: { value: Math.round(velocity * 100) / 100, weight: this.weights.admissionVelocity },
                waterQuality: { value: Math.round(waterScore * 100) / 100, weight: this.weights.waterQuality },
                severityIndex: { value: Math.round(severity * 100) / 100, weight: this.weights.severityIndex },
                historicalRisk: { value: Math.round(historical * 100) / 100, weight: this.weights.historicalRisk },
                populationDensity: { value: Math.round(popDensity * 100) / 100, weight: this.weights.populationDensity },
                trendScore: { value: Math.round(trend * 100) / 100, weight: this.weights.trendScore }
            },
            population: region.population,
            center: region.center
        };
    }

    /**
     * Classify all regions and return sorted by risk.
     */
    classifyAll(regions, admissionAgg, waterAgg, forecasts) {
        const results = regions.map(region => {
            const forecast = forecasts?.byRegion?.[region.id];
            return this.classifyRegion(region, admissionAgg, waterAgg, forecast);
        });

        results.sort((a, b) => b.riskScore - a.riskScore);
        return results;
    }

    /**
     * Generate alerts based on risk classifications and anomalies.
     */
    generateAlerts(riskClassifications, anomalies) {
        const alerts = [];
        const now = new Date();

        // Risk-based alerts
        for (const rc of riskClassifications) {
            if (rc.riskLevel === 'CRITICAL') {
                alerts.push({
                    id: `ALERT-CRIT-${rc.regionId}`,
                    type: 'CRITICAL_RISK',
                    severity: 'critical',
                    timestamp: now.toISOString(),
                    title: `🚨 CRITICAL: ${rc.regionName}`,
                    message: `Risk score ${rc.riskScore.toFixed(2)} — immediate action required. Water quality and admission rates indicate potential outbreak.`,
                    regionId: rc.regionId,
                    regionName: rc.regionName,
                    riskScore: rc.riskScore
                });
            } else if (rc.riskLevel === 'HIGH') {
                alerts.push({
                    id: `ALERT-HIGH-${rc.regionId}`,
                    type: 'HIGH_RISK',
                    severity: 'high',
                    timestamp: now.toISOString(),
                    title: `🔶 HIGH RISK: ${rc.regionName}`,
                    message: `Risk score ${rc.riskScore.toFixed(2)} — elevated disease activity detected. Monitor closely.`,
                    regionId: rc.regionId,
                    regionName: rc.regionName,
                    riskScore: rc.riskScore
                });
            }
        }

        // Anomaly-based alerts
        if (anomalies?.overall) {
            const recentAnomalies = anomalies.overall.filter(a => a.isAnomaly).slice(-5);
            for (const anomaly of recentAnomalies) {
                alerts.push({
                    id: `ALERT-ANOM-${anomaly.timestamp}`,
                    type: 'ANOMALY_DETECTED',
                    severity: Math.abs(anomaly.zScore) > 3 ? 'critical' : 'high',
                    timestamp: anomaly.timestamp,
                    title: `📊 Anomaly: Admission Spike`,
                    message: `Unusual admission count of ${anomaly.value} detected (Z-score: ${anomaly.zScore}). Mean: ${anomaly.mean}, Std: ${anomaly.std}.`,
                    zScore: anomaly.zScore,
                    value: anomaly.value
                });
            }
        }

        // Disease-specific alerts
        if (anomalies?.byDisease) {
            for (const [disease, data] of Object.entries(anomalies.byDisease)) {
                const recent = data.filter(d => d.isAnomaly).slice(-2);
                for (const anomaly of recent) {
                    alerts.push({
                        id: `ALERT-DIS-${disease}-${anomaly.timestamp}`,
                        type: 'DISEASE_SPIKE',
                        severity: 'high',
                        timestamp: anomaly.timestamp,
                        title: `🦠 ${disease} Spike Detected`,
                        message: `${disease} admissions spiked to ${anomaly.value} (Z-score: ${anomaly.zScore}).`,
                        disease,
                        zScore: anomaly.zScore,
                        value: anomaly.value
                    });
                }
            }
        }

        alerts.sort((a, b) => {
            const severityOrder = { critical: 0, high: 1, moderate: 2, low: 3 };
            return (severityOrder[a.severity] || 3) - (severityOrder[b.severity] || 3);
        });

        return alerts;
    }
}

module.exports = RiskClassifier;
