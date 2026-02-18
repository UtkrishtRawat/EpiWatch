/**
 * Forecaster — Exponential Moving Average (EMA) based 48-hour disease
 * outbreak forecasting with trend decomposition and confidence intervals.
 */

class Forecaster {
    constructor(options = {}) {
        this.alpha = options.alpha || 0.3;          // EMA smoothing factor
        this.trendAlpha = options.trendAlpha || 0.1; // Trend smoothing
        this.forecastHours = options.forecastHours || 48;
        this.bucketHours = options.bucketHours || 6;
    }

    /**
     * Compute Exponential Moving Average.
     */
    _ema(values, alpha) {
        const result = [values[0]];
        for (let i = 1; i < values.length; i++) {
            result.push(alpha * values[i] + (1 - alpha) * result[i - 1]);
        }
        return result;
    }

    /**
     * Double Exponential Smoothing (Holt's method) for trend-based forecasting.
     */
    _holtSmoothing(values) {
        if (values.length < 2) return { level: values[0] || 0, trend: 0, smoothed: values };

        let level = values[0];
        let trend = values[1] - values[0];
        const smoothed = [level];

        for (let i = 1; i < values.length; i++) {
            const prevLevel = level;
            level = this.alpha * values[i] + (1 - this.alpha) * (prevLevel + trend);
            trend = this.trendAlpha * (level - prevLevel) + (1 - this.trendAlpha) * trend;
            smoothed.push(level);
        }

        return { level, trend, smoothed };
    }

    /**
     * Compute residuals and standard error for confidence intervals.
     */
    _computeResiduals(actual, smoothed) {
        const residuals = [];
        for (let i = 0; i < actual.length; i++) {
            residuals.push(actual[i] - smoothed[i]);
        }
        const n = residuals.length;
        const mse = residuals.reduce((s, r) => s + r * r, 0) / n;
        return { residuals, standardError: Math.sqrt(mse) };
    }

    /**
     * Generate 48-hour forecast for a time series.
     * @param {Array<{timestamp: string, value: number}>} series - Historical data
     * @returns {Object} Forecast with predictions, confidence intervals
     */
    forecast(series) {
        if (series.length < 4) {
            return {
                predictions: [],
                confidence: { upper: [], lower: [] },
                trend: 'insufficient_data',
                smoothedHistory: []
            };
        }

        const values = series.map(s => s.value);
        const timestamps = series.map(s => s.timestamp);

        // Apply Holt's double exponential smoothing
        const { level, trend, smoothed } = this._holtSmoothing(values);
        const { standardError } = this._computeResiduals(values, smoothed);

        // Generate forecast points
        const forecastSteps = Math.ceil(this.forecastHours / this.bucketHours);
        const predictions = [];
        const lastTimestamp = new Date(timestamps[timestamps.length - 1]);

        for (let step = 1; step <= forecastSteps; step++) {
            const forecastValue = Math.max(0, level + trend * step);
            const forecastTime = new Date(lastTimestamp.getTime() + step * this.bucketHours * 3600000);

            // Widen confidence interval as we forecast further out
            const confidenceMultiplier = 1.96 * Math.sqrt(step);

            predictions.push({
                timestamp: forecastTime.toISOString(),
                predicted: Math.round(forecastValue * 100) / 100,
                upper: Math.round((forecastValue + standardError * confidenceMultiplier) * 100) / 100,
                lower: Math.round(Math.max(0, forecastValue - standardError * confidenceMultiplier) * 100) / 100,
                confidence: Math.round(Math.max(50, 95 - step * 5))
            });
        }

        // Determine trend direction
        let trendDirection;
        if (trend > 0.5) trendDirection = 'rising';
        else if (trend < -0.5) trendDirection = 'falling';
        else trendDirection = 'stable';

        return {
            predictions,
            trend: trendDirection,
            trendValue: Math.round(trend * 100) / 100,
            currentLevel: Math.round(level * 100) / 100,
            standardError: Math.round(standardError * 100) / 100,
            smoothedHistory: smoothed.map((v, i) => ({
                timestamp: timestamps[i],
                value: Math.round(v * 100) / 100
            }))
        };
    }

    /**
     * Generate forecasts for all diseases and regions.
     */
    forecastAll(aggregatedAdmissions) {
        const diseases = ['Cholera', 'Typhoid', 'Dengue', 'Malaria'];
        const regionIds = [...new Set(aggregatedAdmissions.flatMap(a => Object.keys(a.byRegion)))];

        // Overall forecast
        const overallSeries = aggregatedAdmissions.map(a => ({
            timestamp: a.timestamp,
            value: a.total
        }));
        const overallForecast = this.forecast(overallSeries);

        // Per-disease forecasts
        const diseaseForecast = {};
        for (const disease of diseases) {
            const series = aggregatedAdmissions.map(a => ({
                timestamp: a.timestamp,
                value: a.byDisease[disease] || 0
            }));
            diseaseForecast[disease] = this.forecast(series);
        }

        // Per-region forecasts
        const regionForecast = {};
        for (const regionId of regionIds) {
            const series = aggregatedAdmissions.map(a => ({
                timestamp: a.timestamp,
                value: a.byRegion[regionId] || 0
            }));
            regionForecast[regionId] = this.forecast(series);
        }

        return {
            overall: overallForecast,
            byDisease: diseaseForecast,
            byRegion: regionForecast,
            generatedAt: new Date().toISOString(),
            forecastHorizon: `${this.forecastHours} hours`
        };
    }

    /**
     * Compute forecast accuracy metrics on historical data using holdout.
     */
    evaluate(series, holdoutRatio = 0.2) {
        const holdoutSize = Math.max(1, Math.floor(series.length * holdoutRatio));
        const trainSeries = series.slice(0, -holdoutSize);
        const testSeries = series.slice(-holdoutSize);

        const { predictions } = this.forecast(trainSeries);

        // Compute MAPE (Mean Absolute Percentage Error)
        let totalError = 0;
        const n = Math.min(predictions.length, testSeries.length);
        for (let i = 0; i < n; i++) {
            const actual = testSeries[i].value || 1;
            totalError += Math.abs(predictions[i].predicted - actual) / actual;
        }

        return {
            mape: n > 0 ? Math.round((totalError / n) * 10000) / 100 : null,
            samplesUsed: n,
            accuracy: n > 0 ? Math.round((1 - totalError / n) * 10000) / 100 : null
        };
    }
}

module.exports = Forecaster;
