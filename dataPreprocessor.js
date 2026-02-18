/**
 * Data Preprocessor — normalization, feature engineering, time bucketing.
 */

class DataPreprocessor {
    /**
     * Bucket records into time windows.
     * @param {Array} records - Array of records with `timestamp` field
     * @param {number} bucketHours - Size of each bucket in hours
     * @returns {Object} Map of bucket keys to arrays of records
     */
    static timeBucket(records, bucketHours = 6) {
        const buckets = {};
        for (const record of records) {
            const ts = new Date(record.timestamp);
            const bucketStart = new Date(ts);
            bucketStart.setMinutes(0, 0, 0);
            bucketStart.setHours(Math.floor(ts.getHours() / bucketHours) * bucketHours);
            const key = bucketStart.toISOString();
            if (!buckets[key]) buckets[key] = [];
            buckets[key].push(record);
        }
        return buckets;
    }

    /**
     * Compute rolling average for an array of numeric values.
     */
    static rollingAverage(values, windowSize = 7) {
        const result = [];
        for (let i = 0; i < values.length; i++) {
            const start = Math.max(0, i - windowSize + 1);
            const window = values.slice(start, i + 1);
            result.push(window.reduce((a, b) => a + b, 0) / window.length);
        }
        return result;
    }

    /**
     * Compute rate of change between consecutive values.
     */
    static rateOfChange(values) {
        const result = [0];
        for (let i = 1; i < values.length; i++) {
            const prev = values[i - 1] || 1;
            result.push((values[i] - prev) / prev);
        }
        return result;
    }

    /**
     * Normalize values to 0-1 range.
     */
    static normalize(values) {
        const min = Math.min(...values);
        const max = Math.max(...values);
        const range = max - min || 1;
        return values.map(v => (v - min) / range);
    }

    /**
     * Aggregate admission counts by region and disease over time buckets.
     */
    static aggregateAdmissions(admissions, bucketHours = 6) {
        const buckets = this.timeBucket(admissions, bucketHours);
        const result = [];

        for (const [timestamp, records] of Object.entries(buckets)) {
            const byDisease = {};
            const byRegion = {};
            const bySeverity = { Mild: 0, Moderate: 0, Severe: 0 };

            for (const r of records) {
                byDisease[r.disease] = (byDisease[r.disease] || 0) + 1;
                byRegion[r.regionId] = (byRegion[r.regionId] || 0) + 1;
                bySeverity[r.severity] = (bySeverity[r.severity] || 0) + 1;
            }

            result.push({
                timestamp,
                total: records.length,
                byDisease,
                byRegion,
                bySeverity,
                avgAge: Math.round(records.reduce((s, r) => s + r.patientAge, 0) / records.length),
                anomalyCount: records.filter(r => r.isAnomaly).length
            });
        }

        result.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        return result;
    }

    /**
     * Aggregate water quality by region over time buckets.
     */
    static aggregateWaterQuality(waterData, bucketHours = 24) {
        const buckets = this.timeBucket(waterData, bucketHours);
        const result = [];

        for (const [timestamp, records] of Object.entries(buckets)) {
            const byRegion = {};

            for (const r of records) {
                if (!byRegion[r.regionId]) {
                    byRegion[r.regionId] = { samples: [], pH: [], turbidity: [], coliform: [], do: [] };
                }
                byRegion[r.regionId].samples.push(r);
                byRegion[r.regionId].pH.push(r.pH);
                byRegion[r.regionId].turbidity.push(r.turbidity);
                byRegion[r.regionId].coliform.push(r.coliformCount);
                byRegion[r.regionId].do.push(r.dissolvedOxygen);
            }

            const regionAverages = {};
            for (const [regionId, data] of Object.entries(byRegion)) {
                const avg = arr => arr.reduce((a, b) => a + b, 0) / arr.length;
                regionAverages[regionId] = {
                    avgPH: Math.round(avg(data.pH) * 100) / 100,
                    avgTurbidity: Math.round(avg(data.turbidity) * 100) / 100,
                    avgColiform: Math.round(avg(data.coliform)),
                    avgDO: Math.round(avg(data.do) * 100) / 100,
                    sampleCount: data.samples.length,
                    hasAnomaly: data.samples.some(s => s.isAnomaly)
                };
            }

            result.push({ timestamp, regionAverages });
        }

        result.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        return result;
    }

    /**
     * Compute the Water Quality Index (WQI) from individual parameters.
     * Returns a score from 0-100 where lower is worse.
     */
    static computeWQI(params) {
        const { pH, turbidity, coliformCount, dissolvedOxygen, chlorineResidual } = params;

        // Sub-index scores (0-100)
        const pHScore = pH >= 6.5 && pH <= 8.5
            ? 100 - Math.abs(pH - 7.0) * 20
            : Math.max(0, 50 - Math.abs(pH - 7.0) * 15);

        const turbidityScore = Math.max(0, 100 - turbidity * 5);
        const coliformScore = Math.max(0, 100 - coliformCount * 0.5);
        const doScore = Math.min(100, dissolvedOxygen * 12);
        const chlorineScore = chlorineResidual >= 0.2 ? Math.min(100, chlorineResidual * 100) : chlorineResidual * 200;

        // Weighted average
        const wqi = (pHScore * 0.15 + turbidityScore * 0.20 + coliformScore * 0.30 +
            doScore * 0.20 + chlorineScore * 0.15);

        return Math.round(Math.max(0, Math.min(100, wqi)));
    }

    /**
     * Extract feature vectors for ML models.
     */
    static extractFeatures(admissionAgg, waterAgg) {
        const features = [];

        for (let i = 0; i < admissionAgg.length; i++) {
            const adm = admissionAgg[i];
            const waterIdx = Math.min(Math.floor(i / 4), waterAgg.length - 1); // map 6h buckets to 24h
            const water = waterAgg[waterIdx];

            features.push({
                timestamp: adm.timestamp,
                totalAdmissions: adm.total,
                choleraCount: adm.byDisease['Cholera'] || 0,
                typhoidCount: adm.byDisease['Typhoid'] || 0,
                dengueCount: adm.byDisease['Dengue'] || 0,
                malariaCount: adm.byDisease['Malaria'] || 0,
                severeCount: adm.bySeverity['Severe'] || 0,
                avgAge: adm.avgAge,
                waterData: water ? water.regionAverages : {},
                isAnomaly: adm.anomalyCount > 0
            });
        }

        return features;
    }
}

module.exports = DataPreprocessor;
