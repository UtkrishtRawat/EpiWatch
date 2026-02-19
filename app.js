// ============================================================
// FRONTEND APP.JS
// Fetches ANONYMIZED data from the backend API and renders:
//  - Summary cards (total cases, active cases, alerts, risk)
//  - Disease trend chart
//  - 48-hour forecast panel
//  - Geographic hotspot map
//  - Alerts panel
//  - Water quality vs disease chart
//  - Disease distribution pie chart
//  - Severity bar chart
//  - Correlation table
//
// NO personal patient identity is displayed anywhere
// ============================================================

const API = "/api";

// Chart.js dark theme defaults
Chart.defaults.color = "#94a3b8";
Chart.defaults.borderColor = "rgba(255, 255, 255, 0.06)";
Chart.defaults.font.family = "'Inter', sans-serif";

// Color palette for diseases
const DISEASE_COLORS = {
    Cholera: { line: "#3b82f6", bg: "rgba(59, 130, 246, 0.15)" },
    Typhoid: { line: "#f59e0b", bg: "rgba(245, 158, 11, 0.15)" },
    Dengue: { line: "#ef4444", bg: "rgba(239, 68, 68, 0.15)" },
    Malaria: { line: "#10b981", bg: "rgba(16, 185, 129, 0.15)" },
    "Hepatitis A": { line: "#8b5cf6", bg: "rgba(139, 92, 246, 0.15)" },
};


// ============================================================
// INITIALIZATION
// ============================================================
document.addEventListener("DOMContentLoaded", async () => {
    console.log("🏥 Dashboard loading...");

    try {
        // Fetch all data in parallel
        const [summary, dailyCounts, forecast, hotspots, alerts, correlations] = await Promise.all([
            fetchJSON(`${API}/dashboard-summary`),
            fetchJSON(`${API}/daily-counts`),
            fetchJSON(`${API}/forecast`),
            fetchJSON(`${API}/hotspots`),
            fetchJSON(`${API}/alerts`),
            fetchJSON(`${API}/correlations`),
        ]);

        // Render each section
        renderSummaryCards(summary);
        renderTrendChart(dailyCounts.data);
        renderForecastPanel(forecast.forecasts);
        renderHotspotMap(hotspots.hotspots);
        renderAlerts(alerts.alerts);
        renderWaterChart(correlations.correlations);
        renderDiseaseChart(summary.diseaseCounts);
        renderSeverityChart(summary.severityCounts);
        renderCorrelationTable(correlations.correlations);

        document.getElementById("lastUpdated").textContent =
            `Updated: ${new Date().toLocaleTimeString()}`;

        console.log("✅ Dashboard loaded successfully!");
    } catch (error) {
        console.error("❌ Error loading dashboard:", error);
    }
});


// ============================================================
// HELPER: Fetch JSON from API
// ============================================================
async function fetchJSON(url) {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return response.json();
}


// ============================================================
// 1) SUMMARY CARDS
// ============================================================
function renderSummaryCards(summary) {
    document.getElementById("totalCases").textContent =
        summary.totalCases.toLocaleString();
    document.getElementById("activeCases").textContent =
        summary.activeCases.toLocaleString();
    document.getElementById("totalAlerts").textContent =
        summary.totalAlerts;

    const riskEl = document.getElementById("overallRisk");
    riskEl.textContent = summary.overallRisk;
    riskEl.className = `card-value risk-badge risk-${summary.overallRisk}`;

    // Count-up animation
    animateCountUp("totalCases", summary.totalCases);
    animateCountUp("activeCases", summary.activeCases);
}

function animateCountUp(elementId, target) {
    const el = document.getElementById(elementId);
    let current = 0;
    const step = Math.ceil(target / 40);
    const timer = setInterval(() => {
        current += step;
        if (current >= target) {
            current = target;
            clearInterval(timer);
        }
        el.textContent = current.toLocaleString();
    }, 30);
}


// ============================================================
// 2) DISEASE TREND CHART (Line Chart)
// ============================================================
function renderTrendChart(dailyData) {
    const ctx = document.getElementById("trendChart").getContext("2d");

    const labels = dailyData.map(d => d.date);
    const diseases = ["Cholera", "Typhoid", "Dengue", "Malaria", "Hepatitis A"];

    const datasets = diseases.map(disease => ({
        label: disease,
        data: dailyData.map(d => d[disease] || 0),
        borderColor: DISEASE_COLORS[disease].line,
        backgroundColor: DISEASE_COLORS[disease].bg,
        borderWidth: 2,
        fill: true,
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 5,
    }));

    new Chart(ctx, {
        type: "line",
        data: { labels, datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: "index", intersect: false },
            scales: {
                x: {
                    ticks: { maxTicksLimit: 10, font: { size: 11 } },
                    grid: { display: false },
                },
                y: { beginAtZero: true, ticks: { font: { size: 11 } } },
            },
            plugins: {
                legend: {
                    position: "top",
                    labels: { usePointStyle: true, padding: 16, font: { size: 12 } },
                },
            },
        },
    });
}


// ============================================================
// 3) FORECAST PANEL
// ============================================================
function renderForecastPanel(forecasts) {
    const container = document.getElementById("forecastList");
    container.innerHTML = "";

    for (const [disease, fc] of Object.entries(forecasts)) {
        const riskStyles = {
            Low: "background: rgba(16,185,129,0.15); color: #10b981;",
            Medium: "background: rgba(245,158,11,0.15); color: #f59e0b;",
            High: "background: rgba(249,115,22,0.15); color: #f97316;",
            Critical: "background: rgba(239,68,68,0.15); color: #ef4444;",
        };

        container.innerHTML += `
      <div class="forecast-item">
        <div class="forecast-item-header">
          <span class="forecast-disease">${disease}</span>
          <span class="forecast-risk" style="${riskStyles[fc.riskLevel]}">${fc.riskLevel}</span>
        </div>
        <div class="forecast-details">
          <span>Avg: ${fc.currentAverage}/day</span>
          <span class="forecast-trend">${fc.trend}</span>
        </div>
        <div class="forecast-predictions">
          <span>📅 24h: <strong>${fc.predictions[0].predictedCases}</strong> cases</span>
          <span>📅 48h: <strong>${fc.predictions[1].predictedCases}</strong> cases</span>
        </div>
      </div>
    `;
    }
}


// ============================================================
// 4) HOTSPOT MAP (Leaflet.js)
// ============================================================
function renderHotspotMap(hotspots) {
    const map = L.map("map", { scrollWheelZoom: true }).setView([28.615, 77.210], 13);

    // Dark map tiles
    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
        attribution: '&copy; <a href="https://carto.com/">CARTO</a>',
        maxZoom: 18,
    }).addTo(map);

    for (const spot of hotspots) {
        const colors = { Low: "#10b981", Medium: "#f59e0b", High: "#f97316", Critical: "#ef4444" };
        const color = colors[spot.riskLevel] || "#3b82f6";
        const radius = Math.max(15, Math.min(50, spot.totalCases / 8));

        const circle = L.circleMarker([spot.latitude, spot.longitude], {
            radius, fillColor: color, fillOpacity: 0.4,
            color, weight: 2, opacity: 0.8,
        }).addTo(map);

        // Popup shows ONLY counts, NO personal info
        const diseaseList = Object.entries(spot.diseases)
            .map(([d, c]) => `<b>${d}:</b> ${c} cases`)
            .join("<br>");

        circle.bindPopup(`
      <div style="min-width: 180px;">
        <h3 style="margin: 0 0 8px 0; font-size: 14px;">${spot.zone}</h3>
        <p style="margin: 4px 0;"><b>Total Cases:</b> ${spot.totalCases}</p>
        <p style="margin: 4px 0;"><b>Active:</b> ${spot.activeCases}</p>
        <p style="margin: 4px 0;"><b>Risk:</b> <span style="color:${color}; font-weight:600;">${spot.riskLevel}</span></p>
        <hr style="border-color: rgba(255,255,255,0.1); margin: 8px 0;">
        ${diseaseList}
      </div>
    `);
    }
}


// ============================================================
// 5) ALERTS PANEL
// ============================================================
function renderAlerts(alerts) {
    const container = document.getElementById("alertsList");
    container.innerHTML = "";

    if (alerts.length === 0) {
        container.innerHTML = '<p class="loading">No alerts at this time ✅</p>';
        return;
    }

    for (const alert of alerts) {
        const timeAgo = getTimeAgo(alert.timestamp);
        container.innerHTML += `
      <div class="alert-item alert-${alert.type}" style="animation-delay: ${alerts.indexOf(alert) * 0.1}s">
        <div class="alert-icon">${alert.icon}</div>
        <div class="alert-content">
          <div class="alert-title">${alert.title}</div>
          <div class="alert-message">${alert.message}</div>
          <div class="alert-time">${timeAgo}</div>
        </div>
      </div>
    `;
    }
}

function getTimeAgo(dateString) {
    const diffMs = new Date() - new Date(dateString);
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays > 0) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
    if (diffHours > 0) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
    if (diffMins > 0) return `${diffMins} min${diffMins > 1 ? "s" : ""} ago`;
    return "Just now";
}


// ============================================================
// 6) WATER QUALITY vs DISEASE CHART (Bar Chart)
// ============================================================
function renderWaterChart(correlations) {
    const ctx = document.getElementById("waterChart").getContext("2d");

    const zones = correlations.map(c => c.zone.replace("Zone ", "").split(" - ")[0]);
    const patients = correlations.map(c => c.totalPatients);
    const coliform = correlations.map(c => c.waterQuality.avgColiform);

    new Chart(ctx, {
        type: "bar",
        data: {
            labels: zones,
            datasets: [
                {
                    label: "Disease Cases",
                    data: patients,
                    backgroundColor: "rgba(59, 130, 246, 0.6)",
                    borderColor: "#3b82f6",
                    borderWidth: 1,
                    borderRadius: 6,
                    yAxisID: "y",
                },
                {
                    label: "Avg Coliform (CFU)",
                    data: coliform,
                    backgroundColor: "rgba(239, 68, 68, 0.6)",
                    borderColor: "#ef4444",
                    borderWidth: 1,
                    borderRadius: 6,
                    yAxisID: "y1",
                },
            ],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true, position: "left",
                    title: { display: true, text: "Disease Cases", font: { size: 11 } },
                },
                y1: {
                    beginAtZero: true, position: "right",
                    title: { display: true, text: "Coliform (CFU)", font: { size: 11 } },
                    grid: { drawOnChartArea: false },
                },
            },
            plugins: {
                legend: { labels: { usePointStyle: true, padding: 16, font: { size: 12 } } },
            },
        },
    });
}


// ============================================================
// 7) DISEASE DISTRIBUTION (Doughnut Chart)
// ============================================================
function renderDiseaseChart(diseaseCounts) {
    const ctx = document.getElementById("diseaseChart").getContext("2d");

    const labels = Object.keys(diseaseCounts);
    const data = Object.values(diseaseCounts);
    const colors = labels.map(d => DISEASE_COLORS[d]?.line || "#64748b");

    new Chart(ctx, {
        type: "doughnut",
        data: {
            labels,
            datasets: [{
                data,
                backgroundColor: colors.map(c => c + "33"),
                borderColor: colors,
                borderWidth: 2,
                hoverOffset: 10,
            }],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: "60%",
            plugins: {
                legend: {
                    position: "right",
                    labels: {
                        usePointStyle: true, padding: 16, font: { size: 12 },
                        generateLabels: (chart) => {
                            const d = chart.data;
                            return d.labels.map((label, i) => ({
                                text: `${label} (${d.datasets[0].data[i]})`,
                                fillStyle: d.datasets[0].borderColor[i],
                                strokeStyle: d.datasets[0].borderColor[i],
                                pointStyle: "circle", index: i,
                            }));
                        },
                    },
                },
            },
        },
    });
}


// ============================================================
// 8) SEVERITY BAR CHART
// ============================================================
function renderSeverityChart(severityCounts) {
    const ctx = document.getElementById("severityChart").getContext("2d");

    const labels = Object.keys(severityCounts);
    const data = Object.values(severityCounts);
    const colors = ["#10b981", "#f59e0b", "#f97316", "#ef4444"];

    new Chart(ctx, {
        type: "bar",
        data: {
            labels,
            datasets: [{
                label: "Number of Cases",
                data,
                backgroundColor: colors.map(c => c + "99"),
                borderColor: colors,
                borderWidth: 2,
                borderRadius: 8,
                borderSkipped: false,
            }],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            indexAxis: "y",
            scales: {
                x: { beginAtZero: true },
                y: { ticks: { font: { size: 12, weight: "600" } } },
            },
            plugins: { legend: { display: false } },
        },
    });
}


// ============================================================
// 9) CORRELATION TABLE
// ============================================================
function renderCorrelationTable(correlations) {
    const tbody = document.getElementById("correlationBody");
    tbody.innerHTML = "";

    for (const c of correlations) {
        const riskClass = `risk-tag risk-tag-${c.waterRisk}`;
        const zoneName = c.zone.split(" - ")[1] || c.zone;

        tbody.innerHTML += `
      <tr>
        <td><strong>${zoneName}</strong></td>
        <td>${c.totalPatients}</td>
        <td>${c.waterQuality.avgPH}</td>
        <td>${c.waterQuality.avgColiform}</td>
        <td><span class="${riskClass}">${c.waterRisk}</span></td>
        <td style="font-size: 0.78rem; color: var(--text-secondary);">${c.correlationNote}</td>
      </tr>
    `;
    }
}
