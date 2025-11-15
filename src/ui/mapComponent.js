/**
 * src/ui/mapComponent.js
 * Leaflet-based Weather Map Component
 * Shows weather location on interactive map with optional tile overlays
 */

class MapComponent {
  constructor(containerId) {
    this.containerId = containerId;
    this.map = null;
    this.markers = {};
    this.currentMarker = null;
    
    // Check if Leaflet is available
    if (typeof L === 'undefined') {
      console.warn('⚠️ Leaflet library not loaded. Map features unavailable.');
      this.available = false;
    } else {
      this.available = true;
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
      
      // Add OpenStreetMap tiles as default layer
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(this.map);

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
      // Remove previous marker if exists
      if (this.currentMarker) {
        this.map.removeLayer(this.currentMarker);
      }

      // Add new marker
      this.currentMarker = L.marker([latitude, longitude])
        .bindPopup(`<strong>${locationName}</strong><br>Lat: ${latitude.toFixed(4)}, Lng: ${longitude.toFixed(4)}`)
        .addTo(this.map);

      // Center map on marker
      this.map.setView([latitude, longitude], 10);

      console.log(`📍 Marker set for ${locationName} (${latitude}, ${longitude})`);
    } catch (err) {
      console.error('❌ Error setting location marker:', err);
    }

    return this;
  }

  /**
   * Add weather tile overlay
   * @param {string} provider - 'openstreetmap' (default), 'openweathermap' (requires API key), 'weather-radar'
   * @param {string} apiKey - Optional API key for OpenWeatherMap
   */
  addWeatherOverlay(provider = 'openstreetmap', apiKey = null) {
    if (!this.map) {
      console.warn('Map not initialized');
      return this;
    }

    try {
      let layerUrl, attribution;

      switch (provider) {
        case 'openweathermap':
          if (!apiKey) {
            console.warn('⚠️ OpenWeatherMap API key required for weather overlay');
            return this;
          }
          // OpenWeatherMap cloud cover overlay
          layerUrl = `https://tile.openweathermap.org/map/clouds_new/{z}/{x}/{y}.png?appid=${apiKey}`;
          attribution = '© OpenWeatherMap';
          break;

        case 'weather-radar':
          // Radar tiles from Rainviewer or OpenWeatherMap
          layerUrl = `https://tile.openweathermap.org/map/precipitation_new/{z}/{x}/{y}.png`;
          attribution = '© OpenWeatherMap Precipitation';
          break;

        case 'openstreetmap':
        default:
          // Already added in render(), skip
          console.log('ℹ️ OpenStreetMap already set as base layer');
          return this;
      }

      // Add overlay layer
      L.tileLayer(layerUrl, {
        attribution,
        opacity: 0.6,
        maxZoom: 18,
      }).addTo(this.map);

      console.log(`✅ Weather overlay added: ${provider}`);
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

// Export for use in app
if (typeof module !== 'undefined' && module.exports) {
  module.exports = MapComponent;
}
