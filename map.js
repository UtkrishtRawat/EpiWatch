/**
 * Map Module — Leaflet map with heatmap, markers, and region overlays.
 */

const MapModule = (() => {
    let map = null;
    let heatLayer = null;
    let markerGroup = null;
    let regionLayers = [];

    function init() {
        map = L.map('map', {
            center: [28.6139, 77.2090],
            zoom: 12,
            zoomControl: true,
            attributionControl: false
        });

        // Dark tile layer
        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            maxZoom: 19,
            subdomains: 'abcd'
        }).addTo(map);

        // Attribution
        L.control.attribution({
            prefix: false,
            position: 'bottomright'
        }).addTo(map);

        markerGroup = L.layerGroup().addTo(map);

        // Map disease filter
        const filterEl = document.getElementById('mapDiseaseFilter');
        if (filterEl) {
            filterEl.addEventListener('change', () => {
                if (window._lastHotspotData) {
                    updateHotspots(window._lastHotspotData, filterEl.value);
                }
            });
        }
    }

    function updateHotspots(data, diseaseFilter = 'all') {
        window._lastHotspotData = data;

        // Clear existing layers
        if (heatLayer) map.removeLayer(heatLayer);
        markerGroup.clearLayers();
        regionLayers.forEach(l => map.removeLayer(l));
        regionLayers = [];

        // Filter hotspots by disease
        let hotspots = data.admissionHotspots || [];
        if (diseaseFilter !== 'all') {
            hotspots = hotspots.filter(h => h.disease === diseaseFilter);
        }

        // Create heatmap
        if (hotspots.length > 0) {
            const heatData = hotspots.map(h => [h.lat, h.lng, h.intensity]);
            heatLayer = L.heatLayer(heatData, {
                radius: 25,
                blur: 20,
                maxZoom: 15,
                max: 1.0,
                gradient: {
                    0.0: '#0d47a1',
                    0.2: '#1565c0',
                    0.4: '#42a5f5',
                    0.5: '#66bb6a',
                    0.6: '#ffee58',
                    0.7: '#ffa726',
                    0.8: '#ef5350',
                    1.0: '#b71c1c'
                }
            }).addTo(map);
        }

        // Add region risk overlays
        if (data.regionRisks) {
            for (const rc of data.regionRisks) {
                if (!rc.center) continue;

                const color = rc.riskInfo?.color || '#64748b';
                const opacity = Math.min(0.35, rc.riskScore * 0.5);

                // Circle overlay for the region
                const circle = L.circle([rc.center.lat, rc.center.lng], {
                    radius: 1200,
                    fillColor: color,
                    fillOpacity: opacity,
                    color: color,
                    weight: 1.5,
                    opacity: 0.6
                }).addTo(map);

                // Popup with region info
                circle.bindPopup(`
          <div class="region-popup">
            <h3>${rc.regionName}</h3>
            <p>Population: ${(rc.population || 0).toLocaleString()}</p>
            <p>Risk Score: <strong>${(rc.riskScore || 0).toFixed(2)}</strong></p>
            <span class="popup-risk" style="background: ${color}20; color: ${color}">
              ${rc.riskLevel}
            </span>
          </div>
        `);

                regionLayers.push(circle);
            }
        }

        // Add water quality markers
        if (data.waterQualityPoints) {
            const waterIcon = (wqi) => {
                let color = '#22c55e';
                if (wqi < 40) color = '#ef4444';
                else if (wqi < 60) color = '#f59e0b';
                else if (wqi < 80) color = '#3b82f6';

                return L.divIcon({
                    html: `<div style="
            width: 12px; height: 12px; border-radius: 50%;
            background: ${color}; border: 2px solid ${color}40;
            box-shadow: 0 0 6px ${color}60;
          "></div>`,
                    iconSize: [12, 12],
                    className: 'water-marker'
                });
            };

            // Sample a subset to avoid clutter
            const waterSample = data.waterQualityPoints.filter((_, i) => i % 3 === 0);
            for (const wp of waterSample) {
                const marker = L.marker([wp.lat, wp.lng], { icon: waterIcon(wp.wqi) });
                marker.bindPopup(`
          <div class="region-popup">
            <h3>💧 Water Quality</h3>
            <p>WQI: <strong>${wp.wqi}/100</strong></p>
            <p>Region: ${wp.regionId}</p>
          </div>
        `);
                markerGroup.addLayer(marker);
            }
        }
    }

    return { init, updateHotspots };
})();
