/**
 * App Controller — Main application: data fetching, periodic refresh, state management.
 */

const App = (() => {
    const API_BASE = '/api';
    const REFRESH_INTERVAL = 30000; // 30 seconds
    let refreshTimer = null;

    async function fetchJSON(endpoint) {
        try {
            const res = await fetch(`${API_BASE}${endpoint}`);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return await res.json();
        } catch (err) {
            console.error(`Error fetching ${endpoint}:`, err);
            return null;
        }
    }

    // ── Update KPI Cards ────────────────────────────────────
    function updateKPIs(dashboard) {
        if (!dashboard) return;

        const s = dashboard.summary;

        // Admissions
        const admVal = document.getElementById('kpiAdmissionsValue');
        const admChange = document.getElementById('kpiAdmissionsChange');
        if (admVal) admVal.textContent = s.totalAdmissions24h.toLocaleString();
        if (admChange) {
            const sign = s.changePercent > 0 ? '+' : '';
            admChange.textContent = `${sign}${s.changePercent}% vs prev 24h`;
            admChange.className = 'kpi-change ' +
                (s.changePercent > 10 ? 'kpi-change-up' : s.changePercent < -10 ? 'kpi-change-down' : 'kpi-change-stable');
        }

        // Alerts
        const alertVal = document.getElementById('kpiAlertsValue');
        const alertCrit = document.getElementById('kpiAlertsCritical');
        if (alertVal) alertVal.textContent = s.criticalAlerts + s.highAlerts;
        if (alertCrit) alertCrit.textContent = `${s.criticalAlerts} critical`;

        // Regions
        const regVal = document.getElementById('kpiRegionsValue');
        const regTotal = document.getElementById('kpiRegionsTotal');
        if (regVal) regVal.textContent = s.activeRegions;
        if (regTotal) {
            regTotal.textContent = `of ${s.totalRegions} total`;
            regTotal.className = 'kpi-change kpi-change-stable';
        }

        // Forecast trend
        const foreVal = document.getElementById('kpiForecastValue');
        const foreLabel = document.getElementById('kpiForecastLabel');
        if (foreVal) {
            const icon = s.trend === 'rising' ? '📈' : s.trend === 'falling' ? '📉' : '➡️';
            foreVal.textContent = icon;
        }
        if (foreLabel) {
            foreLabel.textContent = s.trend.charAt(0).toUpperCase() + s.trend.slice(1);
            foreLabel.className = 'kpi-change ' +
                (s.trend === 'rising' ? 'kpi-change-up' : s.trend === 'falling' ? 'kpi-change-down' : 'kpi-change-stable');
        }

        // Last updated
        const lastUp = document.getElementById('lastUpdated');
        if (lastUp) {
            const now = new Date();
            lastUp.textContent = `Last updated: ${now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`;
        }
    }

    // ── Load All Dashboard Data ──────────────────────────────
    async function loadDashboard() {
        // Fetch all data in parallel
        const [dashboard, admissions, predictions, alerts, hotspots] = await Promise.all([
            fetchJSON('/dashboard'),
            fetchJSON('/admissions?limit=120'),
            fetchJSON('/predictions'),
            fetchJSON('/alerts'),
            fetchJSON('/hotspots')
        ]);

        // Update KPI cards
        updateKPIs(dashboard);

        // Update charts
        if (admissions) ChartsModule.updateTrendChart(admissions);
        if (predictions) ChartsModule.updateForecastChart(predictions);
        if (dashboard?.diseaseBreakdown) ChartsModule.updateDiseaseChart(dashboard.diseaseBreakdown);
        if (dashboard?.severityBreakdown) ChartsModule.updateSeverityChart(dashboard.severityBreakdown);

        // Update map
        if (hotspots) MapModule.updateHotspots(hotspots);

        // Update alerts sidebar
        if (alerts) AlertsModule.renderAlerts(alerts);

        // Update risk list
        if (dashboard?.topRiskRegions) AlertsModule.renderRiskList(dashboard.topRiskRegions);

        // Update water quality
        if (dashboard?.waterSummary) AlertsModule.renderWaterQuality(dashboard.waterSummary);

        // Update correlations
        if (hotspots?.correlations) AlertsModule.renderCorrelations(hotspots.correlations);
    }

    // ── Time Range Filter ────────────────────────────────────
    function setupFilters() {
        const trendRange = document.getElementById('trendTimeRange');
        if (trendRange) {
            trendRange.addEventListener('change', async () => {
                const limit = parseInt(trendRange.value) || 120;
                const admissions = await fetchJSON(`/admissions?limit=${limit}`);
                if (admissions) ChartsModule.updateTrendChart(admissions);
            });
        }
    }

    // ── Refresh Button ───────────────────────────────────────
    function setupRefreshButton() {
        const btn = document.getElementById('btnRefresh');
        if (btn) {
            btn.addEventListener('click', async () => {
                btn.style.animation = 'spin 0.8s linear';
                await loadDashboard();
                setTimeout(() => { btn.style.animation = ''; }, 800);
            });
        }
    }

    // ── Auto Refresh ─────────────────────────────────────────
    function startAutoRefresh() {
        if (refreshTimer) clearInterval(refreshTimer);
        refreshTimer = setInterval(loadDashboard, REFRESH_INTERVAL);
    }

    // ── Initialize ───────────────────────────────────────────
    async function init() {
        console.log('🦠 Disease Outbreak Dashboard — Initializing...');

        // Initialize map
        MapModule.init();

        // Setup event handlers
        setupFilters();
        setupRefreshButton();

        // Load initial data
        await loadDashboard();

        // Start auto-refresh
        startAutoRefresh();

        console.log('✅ Dashboard initialized. Auto-refreshing every 30s.');
    }

    // Boot on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    return { loadDashboard, init };
})();
