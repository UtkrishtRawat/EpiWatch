/**
 * Anomaly Detector — Z-score based anomaly detection on admission counts
 * and water quality metrics with correlation analysis.
 */

class AnomalyDetector {
    constructor(options = {}) {
        this.zThreshold = options.zThreshold || 2.0;
        this.windowSize = options.windowSize || 20;
    }

    /**
     * Compute mean and standard deviation of an array.
     */
    _stats(values) {
        const n = values.length;
        if (n === 0) return { mean: 0, std: 0 };
        const mean = values.reduce((a, b) => a + b, 0) / n;
        const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / n;
        return { mean, std: Math.sqrt(variance) };
    }

    /**
     * Compute Z-scores for each value in the array.
     */
    _zScores(values) {
        const { mean, std } = this._stats(values);
        if (std === 0) return values.map(() => 0);
        return values.map(v => (v - mean) / std);
    }

    /**
     * Detect anomalies in a time series of counts.
     * Uses a sliding window Z-score approach.
     * @param {Array<{timestamp: string, value: number}>} series
     * @returns {Array<{timestamp: string, value: number, zScore: number, isAnomaly: boolean}>}
     */
    detectInSeries(series) {
        const results = [];

        for (let i = 0; i < series.length; i++) {
            const windowStart = Math.max(0, i - this.windowSize);
            const windowValues = series.slice(windowStart, i + 1).map(s => s.value);
            const { mean, std } = this._stats(windowValues);
            const zScore = std === 0 ? 0 : (series[i].value - mean) / std;

            results.push({
                timestamp: series[i].timestamp,
                value: series[i].value,
                mean: Math.round(mean * 100) / 100,
                std: Math.round(std * 100) / 100,
                zScore: Math.round(zScore * 100) / 100,
                isAnomaly: Math.abs(zScore) > this.zThreshold
            });
        }

        return results;
    }

    /**
     * Detect anomalies in aggregated admission data.
     * Returns anomalies by disease and by region.
     */
    detectAdmissionAnomalies(aggregatedAdmissions) {
        // Overall admission anomalies
        const overallSeries = aggregatedAdmissions.map(a => ({
            timestamp: a.timestamp,
            value: a.total
        }));
        const overallAnomalies = this.detectInSeries(overallSeries);

        // Per-disease anomalies
        const diseases = ['Cholera', 'Typhoid', 'Dengue', 'Malaria'];
        const diseaseAnomalies = {};
        for (const disease of diseases) {
            const series = aggregatedAdmissions.map(a => ({
                timestamp: a.timestamp,
                value: a.byDisease[disease] || 0
            }));
            diseaseAnomalies[disease] = this.detectInSeries(series);
        }

        // Per-region anomalies
        const regionIds = [...new Set(aggregatedAdmissions.flatMap(a => Object.keys(a.byRegion)))];
        const regionAnomalies = {};
        for (const regionId of regionIds) {
            const series = aggregatedAdmissions.map(a => ({
                timestamp: a.timestamp,
                value: a.byRegion[regionId] || 0
            }));
            regionAnomalies[regionId] = this.detectInSeries(series);
        }

        return {
            overall: overallAnomalies,
            byDisease: diseaseAnomalies,
            byRegion: regionAnomalies
        };
    }

    /**
     * Detect anomalies in water quality data.
     */
    detectWaterAnomalies(aggregatedWater) {
        const metrics = ['avgTurbidity', 'avgColiform', 'avgPH', 'avgDO'];
        const regionIds = [...new Set(aggregatedWater.flatMap(w => Object.keys(w.regionAverages)))];
        const results = {};

        for (const regionId of regionIds) {
            results[regionId] = {};
            for (const metric of metrics) {
                const series = aggregatedWater.map(w => ({
                    timestamp: w.timestamp,
                    value: w.regionAverages[regionId]?.[metric] || 0
                }));
                results[regionId][metric] = this.detectInSeries(series);
            }
        }

        return results;
    }

    /**
     * Compute correlation between two time series.
     * Uses Pearson correlation coefficient.
     */
    correlate(seriesA, seriesB) {
        const n = Math.min(seriesA.length, seriesB.length);
        if (n < 3) return { correlation: 0, significance: 'insufficient data' };

        const a = seriesA.slice(0, n).map(s => s.value);
        const b = seriesB.slice(0, n).map(s => s.value);

        const statsA = this._stats(a);
        const statsB = this._stats(b);

        if (statsA.std === 0 || statsB.std === 0) return { correlation: 0, significance: 'no variance' };

        let sumProduct = 0;
        for (let i = 0; i < n; i++) {
            sumProduct += (a[i] - statsA.mean) * (b[i] - statsB.mean);
        }

        const correlation = sumProduct / (n * statsA.std * statsB.std);

        let significance;
        const absCorr = Math.abs(correlation);
        if (absCorr > 0.7) significance = 'strong';
        else if (absCorr > 0.4) significance = 'moderate';
        else if (absCorr > 0.2) significance = 'weak';
        else significance = 'negligible';

        return {
            correlation: Math.round(correlation * 1000) / 1000,
            significance
        };
    }

    /**
     * Analyze correlations between water quality degradation and disease admissions.
     */
    analyzeWaterDiseaseCorrelation(admissionAgg, waterAgg) {
        const diseases = ['Cholera', 'Typhoid'];
        const waterMetrics = ['avgTurbidity', 'avgColiform'];
        const regionIds = [...new Set(admissionAgg.flatMap(a => Object.keys(a.byRegion)))];

        const correlations = [];

        for (const regionId of regionIds) {
            for (const disease of diseases) {
                const admissionSeries = admissionAgg.map(a => ({
                    timestamp: a.timestamp,
                    value: a.byDisease[disease] || 0
                }));

                for (const metric of waterMetrics) {
                    const waterSeries = waterAgg.map(w => ({
                        timestamp: w.timestamp,
                        value: w.regionAverages[regionId]?.[metric] || 0
                    }));

                    const result = this.correlate(admissionSeries, waterSeries);
                    if (result.significance !== 'negligible' && result.significance !== 'insufficient data') {
                        correlations.push({
                            regionId,
                            disease,
                            waterMetric: metric,
                            ...result
                        });
                    }
                }
            }
        }

        correlations.sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation));
        return correlations;
    }
}

module.exports = AnomalyDetector;
