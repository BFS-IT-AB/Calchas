/**
 * src/ui/mapComponent.js
 * Leaflet-based Weather Map Component
 * Shows weather location on interactive map with optional tile overlays
 */

// Dieser kompakte Map-Wrapper wird in kleineren UI-Karten verwendet (z. B.
// die `weather-map` Karte in der rechten Seitenleiste). Er nutzt Leaflet und
// stellt einfache Helfer bereit: Rendern einer OSM-Basiskarte, Setzen eines
// Standortmarkers und das optionale Einblenden von Wetter-Overlays (z. B.
// OpenWeatherMap Tiles). Auf der Live-Seite entspricht das der interaktiven
// Karte innerhalb der "Radar & Layers"-Kachel.
class MapComponent {
  constructor(containerId) {
    this.containerId = containerId;
    this.map = null;
    this.baseLayer = null;
    this.markers = {};
    this.currentMarker = null;
    this._pendingLocation = null;
    this.overlays = {}; // Store overlay layers for management
    // visual anchor offset in pixels: panBy([x,y]) applied after centering
    // default shifts map content left and down (left: negative x, down: positive y)
    this.anchorOffset = { x: 150, y: 200 };

    // Check if Leaflet is available
    if (typeof L === 'undefined') {
      console.warn('⚠️ Leaflet library not loaded. Map features unavailable.');
      this.available = false;
    } else {
      this.available = true;
    }

    // Listen for global location changes so the component recenters accordingly
    try {
      document.addEventListener('app:locationChanged', (e) => {
        const d = e && e.detail ? e.detail : null;
        if (d && typeof d.lat === 'number' && typeof d.lon === 'number') {
          console.log('[MapComponent] received app:locationChanged', d.lat, d.lon, d.label);
          // If map instance exists, apply location immediately, otherwise queue it
          if (this.map && typeof this.setLocation === 'function') {
            this.setLocation(d.lat, d.lon, d.label || '');
          } else {
            this._pendingLocation = { lat: d.lat, lon: d.lon, label: d.label || '' };
          }
        }
      });
    } catch (err) {
      // ignore if environment doesn't support CustomEvent
    }
  }

  /**
   * Initialize and render the map
   * Should be called after Leaflet library is loaded
   */
  render() {
  if (!this.available || !document.getElementById(this.containerId)) {
    console.warn('Map container not found or Leaflet not available');
    return this;
  }

  try {
    // Initialize Leaflet map
    this.map = L.map(this.containerId).setView([51.505, -0.09], 10);

    // Add OpenStreetMap base layer
    this.baseLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(this.map);

    // Add default weather overlay (precipitation) - this makes weather layers actually overlay the map
    try {
      this.addWeatherOverlay('openweathermap', null, 'rain');
    } catch (err) {
      console.warn('Failed to add default weather overlay:', err);
    }

    // If there was a pending location to set, apply it now
    if (this._pendingLocation) {
      this.setLocation(
        this._pendingLocation.lat,
        this._pendingLocation.lon,
        this._pendingLocation.label || '',
      );
      this._pendingLocation = null;
    }
      console.log('✅ Map initialized');
    } catch (err) {
      console.error('❌ Map initialization error:', err);
      this.available = false;
    }

    return this;
  }

  /**
   * Set location marker and center map
   * @param {number} latitude - Location latitude
   * @param {number} longitude - Location longitude
   * @param {string} locationName - Location name for marker popup
   */
  setLocation(latitude, longitude, locationName = 'Location') {
    if (!this.map) {
      console.warn('Map not initialized');
      return this;
    }

    try {
      // Ensure numeric values
      const lat = Number(latitude);
      const lon = Number(longitude);
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
        console.warn('Invalid coordinates for setLocation', latitude, longitude);
        return this;
      }

      // Invalidate size first in case container changed (common in hidden tabs/layout shifts)
      if (this.map.invalidateSize && typeof this.map.invalidateSize === 'function') {
        try { this.map.invalidateSize(); } catch (e) { /* ignore */ }
      }
      // Remove previous marker if exists
      if (this.currentMarker) {
        this.map.removeLayer(this.currentMarker);
      }

      // Create a fresh marker (restore original behavior)
      try {
        if (this.currentMarker) {
          this.map.removeLayer(this.currentMarker);
          this.currentMarker = null;
        }
      } catch (e) {
        /* ignore */
      }

      this.currentMarker = L.marker([lat, lon])
        .bindPopup(`<strong>${locationName}</strong><br>Lat: ${lat.toFixed(4)}, Lng: ${lon.toFixed(4)}`)
        .addTo(this.map);

        this.map.setView([latitude, longitude], 10)

      // Ensure container/layout is up-to-date then center the map.
      try {
        if (this.map && typeof this.map.invalidateSize === 'function') {
          try { this.map.invalidateSize(); } catch (e) { /* ignore */ }
        }

        // Preserve current zoom if available
        const currentZoom = (this.map && typeof this.map.getZoom === 'function') ? this.map.getZoom() : 10;

        // Ensure map sizing and center once the map is ready
        try {
          if (this.map && typeof this.map.whenReady === 'function') {
            this.map.whenReady(() => {
              try { if (this.map && typeof this.map.invalidateSize === 'function') this.map.invalidateSize(); } catch (e) { /* ignore */ }
              try {
                if (this.map && typeof this.map.getSize === 'function' && this.anchorOffset) {
                  const size = this.map.getSize();
                  const centerPoint = L.point(size.x / 2, size.y / 2);
                  const desiredPoint = centerPoint.add(L.point(this.anchorOffset.x, this.anchorOffset.y));
                  const newCenterLatLng = this.map.containerPointToLatLng(centerPoint.subtract(desiredPoint.subtract(centerPoint)));
                  this.map.setView(newCenterLatLng, currentZoom, { animate: false });
                } else if (this.map && typeof this.map.setView === 'function') {
                  this.map.setView([lat, lon], currentZoom);
                }
              } catch (e) { /* ignore */ }
            });
          } else {
            try { if (this.map && typeof this.map.invalidateSize === 'function') this.map.invalidateSize(); } catch (e) { /* ignore */ }
            try {
              if (this.map && typeof this.map.getSize === 'function' && this.anchorOffset) {
                // compute center such that marker at [lat,lon] appears at container center + anchorOffset
                const size = this.map.getSize();
                const centerPoint = L.point(size.x / 2, size.y / 2);
                const desiredPoint = centerPoint.add(L.point(this.anchorOffset.x, this.anchorOffset.y));
                const newCenterLatLng = this.map.containerPointToLatLng(centerPoint.subtract(desiredPoint.subtract(centerPoint)));
                this.map.setView(newCenterLatLng, 10, { animate: false });
              } else if (this.map && typeof this.map.setView === 'function') {
                this.map.setView([lat, lon], 10);
              }
            } catch (e) { /* ignore */ }
          }
        } catch (err) {
          console.warn('Error scheduling center (simple):', err);
        }
      } catch (err) {
        console.warn('Error scheduling center:', err);
      }

      console.log(`📍 Marker set for ${locationName} (${lat}, ${lon})`);
    } catch (err) {
      console.error('❌ Error setting location marker:', err);
    }

    return this;
  }

  /**
   * Add weather tile overlay
   * @param {string} provider - 'openweathermap' or 'weather-radar'
   * @param {string} apiKey - Optional API key for OpenWeatherMap
   * @param {string} layerType - Type of layer: 'rain', 'snow', 'temp', 'wind', 'clouds', 'pressure'
   */
  addWeatherOverlay(provider = 'openstreetmap', apiKey = null, layerType = 'clouds') {
    if (!this.map) {
      console.warn('Map not initialized');
      return this;
    }

    try {
      let layerUrl, attribution;

      if (provider === 'openweathermap') {
        // OpenWeatherMap Layer URLs (mit API-Key wenn vorhanden, sonst Fallback)
        const layerUrls = {
          'rain': apiKey
            ? `https://tile.openweathermap.org/map/precipitation_new/{z}/{x}/{y}.png?appid=${apiKey}`
            : `https://tile.openweathermap.org/map/precipitation_new/{z}/{x}/{y}.png?appid=8437e4b8d4acc41194a3cd3325c41233`, // Demo-Key
          'snow': apiKey
            ? `https://tile.openweathermap.org/map/snow_new/{z}/{x}/{y}.png?appid=${apiKey}`
            : `https://tile.openweathermap.org/map/snow_new/{z}/{x}/{y}.png?appid=8437e4b8d4acc41194a3cd3325c41233`,
          'temp': apiKey
            ? `https://tile.openweathermap.org/map/temp_new/{z}/{x}/{y}.png?appid=${apiKey}`
            : `https://tile.openweathermap.org/map/temp_new/{z}/{x}/{y}.png?appid=8437e4b8d4acc41194a3cd3325c41233`,
          'wind': apiKey
            ? `https://tile.openweathermap.org/map/wind_new/{z}/{x}/{y}.png?appid=${apiKey}`
            : `https://tile.openweathermap.org/map/wind_new/{z}/{x}/{y}.png?appid=8437e4b8d4acc41194a3cd3325c41233`,
          'clouds': apiKey
            ? `https://tile.openweathermap.org/map/clouds_new/{z}/{x}/{y}.png?appid=${apiKey}`
            : `https://tile.openweathermap.org/map/clouds_new/{z}/{x}/{y}.png?appid=8437e4b8d4acc41194a3cd3325c41233`,
          'pressure': apiKey
            ? `https://tile.openweathermap.org/map/pressure_new/{z}/{x}/{y}.png?appid=${apiKey}`
            : `https://tile.openweathermap.org/map/pressure_new/{z}/{x}/{y}.png?appid=8437e4b8d4acc41194a3cd3325c41233`,
        };

        layerUrl = layerUrls[layerType] || layerUrls['clouds'];
        attribution = `© OpenWeatherMap (${layerType})`;

        console.log('[MapComponent] Adding OpenWeatherMap overlay:', layerType, 'URL:', layerUrl.substring(0, 80) + '...');
      } else if (provider === 'weather-radar') {
        layerUrl = `https://tile.openweathermap.org/map/precipitation_new/{z}/{x}/{y}.png?appid=8437e4b8d4acc41194a3cd3325c41233`;
        attribution = '© OpenWeatherMap Precipitation';
        layerType = 'radar'; // Use consistent key for weather-radar
      } else {
        console.log('ℹ️ OpenStreetMap is already the base layer');
        return this;
      }

      // Remove existing overlay of the same type if it exists
      if (this.overlays[layerType]) {
        this.map.removeLayer(this.overlays[layerType]);
        delete this.overlays[layerType];
      }

      // Overlay Layer hinzufügen (höhere Deckkraft für bessere Sichtbarkeit)
      const overlayLayer = L.tileLayer(layerUrl, {
        attribution,
        opacity: 0.8, // Increased from 0.6 for better visibility
        maxZoom: 18,
      }).addTo(this.map);

      // Store the overlay for future management
      this.overlays[layerType] = overlayLayer;

      console.log(`✅ Weather overlay added: ${provider} (${layerType})`);
    } catch (err) {
      console.error(`❌ Error adding weather overlay (${provider}):`, err);
    }

    return this;
  }

  /**
   * Add a favorite location marker
   * @param {number} latitude - Latitude
   * @param {number} longitude - Longitude
   * @param {string} name - Location name
   * @param {string} id - Unique identifier
   */
  addFavoriteMarker(latitude, longitude, name, id) {
    if (!this.map) {
      console.warn('Map not initialized');
      return this;
    }

    try {
      const marker = L.marker([latitude, longitude], {
        icon: L.icon({
          iconUrl: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23FFD700"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>',
          iconSize: [32, 32],
          popupAnchor: [0, -16],
        }),
      })
        .bindPopup(`<strong>⭐ ${name}</strong><br>Lat: ${latitude.toFixed(4)}, Lng: ${longitude.toFixed(4)}`)
        .addTo(this.map);

      this.markers[id] = marker;
      console.log(`✅ Favorite marker added: ${name}`);
    } catch (err) {
      console.error('❌ Error adding favorite marker:', err);
    }

    return this;
  }

  /**
   * Remove a favorite marker
   * @param {string} id - Unique identifier
   */
  removeFavoriteMarker(id) {
    if (this.markers[id]) {
      this.map.removeLayer(this.markers[id]);
      delete this.markers[id];
      console.log(`✅ Favorite marker removed: ${id}`);
    }

    return this;
  }

  /**
   * Toggle weather overlay on/off
   * @param {string} layerType - Type of layer: 'rain', 'snow', 'temp', 'wind', 'clouds', 'pressure'
   * @param {boolean} visible - Whether to show or hide the overlay
   */
  toggleOverlay(layerType, visible) {
    if (!this.map) {
      console.warn('Map not initialized');
      return this;
    }

    if (visible) {
      // If we want to show it but it doesn't exist, we need to add it
      if (!this.overlays[layerType]) {
        console.warn(`Overlay ${layerType} not found. Use addWeatherOverlay first.`);
        return this;
      }
      // Add it back to the map if it's not already there
      if (!this.map.hasLayer(this.overlays[layerType])) {
        this.overlays[layerType].addTo(this.map);
        console.log(`✅ Overlay ${layerType} shown`);
      }
    } else {
      // Hide the overlay
      if (this.overlays[layerType] && this.map.hasLayer(this.overlays[layerType])) {
        this.map.removeLayer(this.overlays[layerType]);
        console.log(`✅ Overlay ${layerType} hidden`);
      }
    }

    return this;
  }

  /**
   * Show a simple layer selector UI
   */
  showLayerSelector() {
    // Remove existing selector if present
    this.hideLayerSelector();

    const selector = document.createElement('div');
    selector.id = 'map-layer-selector';
    selector.innerHTML = `
      <div style="position: absolute; top: 50px; right: 10px; background: rgba(10, 16, 32, 0.95); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 8px; padding: 12px; z-index: 1001; box-shadow: 0 4px 20px rgba(0,0,0,0.3); min-width: 180px;">
        <h4 style="margin: 0 0 12px 0; font-size: 14px; color: #fff; font-weight: 600;">Weather Layers</h4>
        <div style="display: flex; flex-direction: column; gap: 8px;">
          <label style="display: flex; align-items: center; font-size: 13px; color: #e0e0e0; cursor: pointer;">
            <input type="checkbox" data-layer="rain" checked style="margin-right: 8px;"> Rain
          </label>
          <label style="display: flex; align-items: center; font-size: 13px; color: #e0e0e0; cursor: pointer;">
            <input type="checkbox" data-layer="clouds" style="margin-right: 8px;"> Clouds
          </label>
          <label style="display: flex; align-items: center; font-size: 13px; color: #e0e0e0; cursor: pointer;">
            <input type="checkbox" data-layer="temp" style="margin-right: 8px;"> Temperature
          </label>
          <label style="display: flex; align-items: center; font-size: 13px; color: #e0e0e0; cursor: pointer;">
            <input type="checkbox" data-layer="wind" style="margin-right: 8px;"> Wind
          </label>
          <label style="display: flex; align-items: center; font-size: 13px; color: #e0e0e0; cursor: pointer;">
            <input type="checkbox" data-layer="pressure" style="margin-right: 8px;"> Pressure
          </label>
        </div>
      </div>
    `;

    // Add event listeners
    selector.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
      checkbox.addEventListener('change', (e) => {
        const layerType = e.target.dataset.layer;
        this.toggleOverlay(layerType, e.target.checked);
      });
    });

    // Add to map wrapper instead of map container for better layering
    const wrapper = document.querySelector('.radar-view__map-wrapper');
    if (wrapper) {
      wrapper.style.position = 'relative';
      wrapper.appendChild(selector);
    }

    // Close on click outside
    setTimeout(() => {
      document.addEventListener('click', (e) => {
        if (!selector.contains(e.target) && !e.target.closest('#map-layer-toggle')) {
          this.hideLayerSelector();
        }
      });
    }, 100);

    return this;
  }

  /**
   * Hide the layer selector UI
   */
  hideLayerSelector() {
    const selector = document.getElementById('map-layer-selector');
    if (selector) {
      selector.remove();
    }
    return this;
  }

  /**
   * Remove a specific weather overlay
   * @param {string} layerType - Type of layer to remove
   */
  removeOverlay(layerType) {
    if (this.overlays[layerType]) {
      if (this.map && this.map.hasLayer(this.overlays[layerType])) {
        this.map.removeLayer(this.overlays[layerType]);
      }
      delete this.overlays[layerType];
      console.log(`✅ Overlay ${layerType} removed`);
    }

    return this;
  }

  /**
   * Remove all weather overlays
   */
  clearOverlays() {
    Object.keys(this.overlays).forEach(layerType => {
      if (this.map && this.map.hasLayer(this.overlays[layerType])) {
        this.map.removeLayer(this.overlays[layerType]);
      }
      delete this.overlays[layerType];
    });
    console.log('✅ All overlays cleared');

    return this;
  }

  /**
   * Clear all markers except current location
   */
  clearMarkers() {
    Object.keys(this.markers).forEach(id => {
      this.map.removeLayer(this.markers[id]);
      delete this.markers[id];
    });
    console.log('✅ Markers cleared');

    return this;
  }

  /**
   * Destroy map instance and clean up
   */
  destroy() {
    if (this.map) {
      this.map.remove();
      this.map = null;
      this.markers = {};
      this.overlays = {};
      console.log('✅ Map destroyed');
    }

    return this;
  }

  /**
   * Get current map center coordinates
   * @returns {object} - { latitude, longitude }
   */
  getCenter() {
    if (!this.map) return null;
    const center = this.map.getCenter();
    return {
      latitude: center.lat,
      longitude: center.lng,
    };
  }

  /**
   * Set zoom level
   * @param {number} zoom - Zoom level (1-19)
   */
  setZoom(zoom) {
    if (this.map) {
      this.map.setZoom(Math.max(1, Math.min(19, zoom)));
    }

    return this;
  }
}

// Exportiere MapComponent global für Verwendung in anderen Modulen
window.MapComponent = MapComponent;

// Export for use in app
if (typeof module !== 'undefined' && module.exports) {
  module.exports = MapComponent;
}
