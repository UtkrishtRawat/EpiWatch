/**
 * Alerts Module — Alert card rendering, risk list, water quality, correlations.
 */

const AlertsModule = (() => {

    function renderAlerts(alertData) {
        const container = document.getElementById('alertsList');
        const counter = document.getElementById('alertCounter');
        if (!container) return;

        const alerts = alertData.alerts || [];
        counter.textContent = alerts.length;

        if (alerts.length === 0) {
            container.innerHTML = '<div class="loading-placeholder">No active alerts ✅</div>';
            return;
        }

        container.innerHTML = alerts.slice(0, 15).map((alert, i) => `
      <div class="alert-card alert-card-${alert.severity}" style="animation-delay: ${i * 0.05}s">
        <div class="alert-title">${escapeHtml(alert.title)}</div>
        <div class="alert-message">${escapeHtml(alert.message)}</div>
        <div class="alert-time">${formatTimeAgo(alert.timestamp)}</div>
      </div>
    `).join('');
    }

    function renderRiskList(riskData) {
        const container = document.getElementById('riskList');
        if (!container) return;

        if (!riskData || riskData.length === 0) {
            container.innerHTML = '<div class="loading-placeholder">No risk data</div>';
            return;
        }

        container.innerHTML = riskData.map(rc => {
            const level = rc.riskLevel.toLowerCase();
            const barColor = rc.riskInfo?.color || '#64748b';
            const barWidth = Math.round(rc.riskScore * 100);

            return `
        <div class="risk-item">
          <div class="risk-item-info">
            <span class="risk-region-name">${escapeHtml(rc.regionName)}</span>
            <span class="risk-score-text">Score: ${rc.riskScore.toFixed(2)} • Pop: ${(rc.population || 0).toLocaleString()}</span>
            <div class="risk-bar-container">
              <div class="risk-bar" style="width: ${barWidth}%; background: ${barColor}"></div>
            </div>
          </div>
          <span class="risk-badge risk-badge-${level}">${rc.riskLevel}</span>
        </div>
      `;
        }).join('');
    }

    function renderWaterQuality(waterSummary) {
        const container = document.getElementById('waterList');
        if (!container) return;

        const entries = Object.entries(waterSummary || {});
        if (entries.length === 0) {
            container.innerHTML = '<div class="loading-placeholder">No water data</div>';
            return;
        }

        container.innerHTML = entries.map(([regionId, data]) => {
            const wqi = data.wqi || 0;
            let wqiColor = '#22c55e';
            if (wqi < 40) wqiColor = '#ef4444';
            else if (wqi < 60) wqiColor = '#f59e0b';
            else if (wqi < 80) wqiColor = '#3b82f6';

            return `
        <div class="water-item">
          <span class="water-region">${escapeHtml(data.regionName || regionId)}</span>
          <div class="wqi-gauge">
            <div class="wqi-bar-container">
              <div class="wqi-bar" style="width: ${wqi}%; background: ${wqiColor}"></div>
            </div>
            <span class="wqi-value" style="color: ${wqiColor}">${wqi}</span>
          </div>
        </div>
      `;
        }).join('');
    }

    function renderCorrelations(correlations) {
        const container = document.getElementById('correlationsList');
        if (!container) return;

        if (!correlations || correlations.length === 0) {
            container.innerHTML = '<div class="loading-placeholder">No significant correlations</div>';
            return;
        }

        container.innerHTML = correlations.slice(0, 8).map(c => {
            const strengthClass = c.significance === 'strong' ? 'correlation-strong' :
                c.significance === 'moderate' ? 'correlation-moderate' : 'correlation-weak';
            const metricName = c.waterMetric.replace('avg', '').replace(/([A-Z])/g, ' $1').trim();

            return `
        <div class="correlation-item">
          <span class="correlation-label">${escapeHtml(c.disease)} ↔ ${metricName}</span>
          <span class="correlation-value ${strengthClass}">${c.correlation.toFixed(3)}</span>
        </div>
      `;
        }).join('');
    }

    // ── Utilities ────────────────────────────────────────────
    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str || '';
        return div.innerHTML;
    }

    function formatTimeAgo(timestamp) {
        const now = new Date();
        const ts = new Date(timestamp);
        const diffMs = now - ts;
        const diffMins = Math.floor(diffMs / 60000);

        if (diffMins < 1) return 'just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        const diffHours = Math.floor(diffMins / 60);
        if (diffHours < 24) return `${diffHours}h ago`;
        const diffDays = Math.floor(diffHours / 24);
        return `${diffDays}d ago`;
    }

    return { renderAlerts, renderRiskList, renderWaterQuality, renderCorrelations };
})();
