/**
 * Charts Module — Chart.js visualizations for the dashboard.
 */

const ChartsModule = (() => {
    let trendChart = null;
    let forecastChart = null;
    let diseaseChart = null;
    let severityChart = null;

    // Chart.js global defaults
    Chart.defaults.color = '#94a3b8';
    Chart.defaults.borderColor = 'rgba(255, 255, 255, 0.04)';
    Chart.defaults.font.family = "'Inter', sans-serif";
    Chart.defaults.font.size = 11;

    const COLORS = {
        Cholera: { main: '#3b82f6', bg: 'rgba(59, 130, 246, 0.15)' },
        Typhoid: { main: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.15)' },
        Dengue: { main: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)' },
        Malaria: { main: '#22c55e', bg: 'rgba(34, 197, 94, 0.15)' }
    };

    function formatTime(ts) {
        const d = new Date(ts);
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' ' +
            d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
    }

    function shortTime(ts) {
        const d = new Date(ts);
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }

    // ── Trend Chart ──────────────────────────────────────────
    function updateTrendChart(admissionData) {
        const ctx = document.getElementById('trendChart');
        if (!ctx) return;

        const data = admissionData.data || [];
        const labels = data.map(d => formatTime(d.timestamp));

        // Per-disease lines
        const diseases = ['Cholera', 'Typhoid', 'Dengue', 'Malaria'];
        const datasets = diseases.map(disease => ({
            label: disease,
            data: data.map(d => d.byDisease?.[disease] || 0),
            borderColor: COLORS[disease].main,
            backgroundColor: COLORS[disease].bg,
            borderWidth: 2,
            pointRadius: 0,
            pointHoverRadius: 4,
            tension: 0.4,
            fill: false
        }));

        // Total line
        datasets.unshift({
            label: 'Total',
            data: data.map(d => d.total),
            borderColor: '#f1f5f9',
            backgroundColor: 'rgba(241, 245, 249, 0.05)',
            borderWidth: 2.5,
            pointRadius: 0,
            pointHoverRadius: 5,
            tension: 0.4,
            fill: true
        });

        if (trendChart) {
            trendChart.data.labels = labels;
            trendChart.data.datasets = datasets;
            trendChart.update('none');
        } else {
            trendChart = new Chart(ctx, {
                type: 'line',
                data: { labels, datasets },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    interaction: { mode: 'index', intersect: false },
                    plugins: {
                        legend: {
                            position: 'top',
                            labels: { usePointStyle: true, pointStyle: 'circle', padding: 16, font: { size: 11 } }
                        },
                        tooltip: {
                            backgroundColor: 'rgba(17, 24, 39, 0.95)',
                            borderColor: 'rgba(255, 255, 255, 0.1)',
                            borderWidth: 1,
                            titleFont: { weight: 600 },
                            padding: 12,
                            cornerRadius: 8
                        }
                    },
                    scales: {
                        x: {
                            ticks: { maxTicksLimit: 12, maxRotation: 0 },
                            grid: { display: false }
                        },
                        y: {
                            beginAtZero: true,
                            ticks: { stepSize: 5 },
                            grid: { color: 'rgba(255, 255, 255, 0.03)' }
                        }
                    }
                }
            });
        }
    }

    // ── Forecast Chart ───────────────────────────────────────
    function updateForecastChart(predictions) {
        const ctx = document.getElementById('forecastChart');
        if (!ctx) return;

        const overall = predictions?.overall;
        if (!overall) return;

        // Historical smoothed + predictions
        const historyData = (overall.smoothedHistory || []).slice(-20);
        const forecastData = overall.predictions || [];

        const allLabels = [
            ...historyData.map(h => formatTime(h.timestamp)),
            ...forecastData.map(f => formatTime(f.timestamp))
        ];

        const historyValues = historyData.map(h => h.value);
        const forecastValues = forecastData.map(f => f.predicted);
        const upperBand = forecastData.map(f => f.upper);
        const lowerBand = forecastData.map(f => f.lower);

        // Pad arrays
        const padHistory = new Array(forecastData.length).fill(null);
        const padForecast = new Array(historyData.length).fill(null);

        const datasets = [
            {
                label: 'Historical',
                data: [...historyValues, ...padHistory],
                borderColor: '#6366f1',
                backgroundColor: 'rgba(99, 102, 241, 0.1)',
                borderWidth: 2.5,
                pointRadius: 0,
                tension: 0.4,
                fill: true
            },
            {
                label: 'Forecast',
                data: [...padForecast, ...forecastValues],
                borderColor: '#f59e0b',
                backgroundColor: 'rgba(245, 158, 11, 0.1)',
                borderWidth: 2.5,
                borderDash: [6, 3],
                pointRadius: 3,
                pointBackgroundColor: '#f59e0b',
                tension: 0.4,
                fill: false
            },
            {
                label: 'Upper Bound',
                data: [...padForecast, ...upperBand],
                borderColor: 'transparent',
                backgroundColor: 'rgba(245, 158, 11, 0.08)',
                borderWidth: 0,
                pointRadius: 0,
                fill: '+1',
                tension: 0.4
            },
            {
                label: 'Lower Bound',
                data: [...padForecast, ...lowerBand],
                borderColor: 'rgba(245, 158, 11, 0.2)',
                backgroundColor: 'transparent',
                borderWidth: 1,
                borderDash: [3, 3],
                pointRadius: 0,
                fill: false,
                tension: 0.4
            }
        ];

        // Update forecast badge
        const badge = document.getElementById('forecastBadge');
        if (badge && overall.trend) {
            badge.textContent = overall.trend.toUpperCase();
            badge.className = 'forecast-badge forecast-badge-' + overall.trend;
        }

        if (forecastChart) {
            forecastChart.data.labels = allLabels;
            forecastChart.data.datasets = datasets;
            forecastChart.update('none');
        } else {
            forecastChart = new Chart(ctx, {
                type: 'line',
                data: { labels: allLabels, datasets },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    interaction: { mode: 'index', intersect: false },
                    plugins: {
                        legend: {
                            position: 'top',
                            labels: {
                                usePointStyle: true, pointStyle: 'circle', padding: 16,
                                font: { size: 11 },
                                filter: item => !['Upper Bound', 'Lower Bound'].includes(item.text)
                            }
                        },
                        tooltip: {
                            backgroundColor: 'rgba(17, 24, 39, 0.95)',
                            borderColor: 'rgba(255, 255, 255, 0.1)',
                            borderWidth: 1,
                            padding: 12,
                            cornerRadius: 8,
                            filter: item => !['Upper Bound', 'Lower Bound'].includes(item.dataset.label)
                        }
                    },
                    scales: {
                        x: {
                            ticks: { maxTicksLimit: 10, maxRotation: 0 },
                            grid: { display: false }
                        },
                        y: {
                            beginAtZero: true,
                            grid: { color: 'rgba(255, 255, 255, 0.03)' }
                        }
                    }
                }
            });
        }
    }

    // ── Disease Breakdown Chart ──────────────────────────────
    function updateDiseaseChart(breakdown) {
        const ctx = document.getElementById('diseaseChart');
        if (!ctx) return;

        const diseases = Object.keys(breakdown);
        const values = Object.values(breakdown);
        const colors = diseases.map(d => COLORS[d]?.main || '#64748b');
        const bgColors = diseases.map(d => COLORS[d]?.bg || 'rgba(100,116,139,0.15)');

        if (diseaseChart) {
            diseaseChart.data.labels = diseases;
            diseaseChart.data.datasets[0].data = values;
            diseaseChart.update('none');
        } else {
            diseaseChart = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: diseases,
                    datasets: [{
                        data: values,
                        backgroundColor: colors,
                        borderColor: 'rgba(0,0,0,0.3)',
                        borderWidth: 2,
                        hoverOffset: 8
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    cutout: '65%',
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: { usePointStyle: true, pointStyle: 'circle', padding: 14, font: { size: 11 } }
                        },
                        tooltip: {
                            backgroundColor: 'rgba(17, 24, 39, 0.95)',
                            borderColor: 'rgba(255, 255, 255, 0.1)',
                            borderWidth: 1,
                            padding: 12,
                            cornerRadius: 8
                        }
                    }
                }
            });
        }
    }

    // ── Severity Chart ───────────────────────────────────────
    function updateSeverityChart(breakdown) {
        const ctx = document.getElementById('severityChart');
        if (!ctx) return;

        const labels = Object.keys(breakdown);
        const values = Object.values(breakdown);
        const colors = ['#22c55e', '#f59e0b', '#ef4444'];

        if (severityChart) {
            severityChart.data.datasets[0].data = values;
            severityChart.update('none');
        } else {
            severityChart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels,
                    datasets: [{
                        label: 'Cases',
                        data: values,
                        backgroundColor: colors.map(c => c + '35'),
                        borderColor: colors,
                        borderWidth: 2,
                        borderRadius: 6,
                        borderSkipped: false
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            backgroundColor: 'rgba(17, 24, 39, 0.95)',
                            borderColor: 'rgba(255, 255, 255, 0.1)',
                            borderWidth: 1,
                            padding: 12,
                            cornerRadius: 8
                        }
                    },
                    scales: {
                        x: { grid: { display: false } },
                        y: {
                            beginAtZero: true,
                            grid: { color: 'rgba(255, 255, 255, 0.03)' }
                        }
                    }
                }
            });
        }
    }

    return {
        updateTrendChart,
        updateForecastChart,
        updateDiseaseChart,
        updateSeverityChart
    };
})();
