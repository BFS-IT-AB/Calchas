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

    // --- RainViewer Integration ---
    this.rainViewerCache = [];
    this.rainViewerHost = "https://tilecache.rainviewer.com";
    this.activeProvider = null;
    this.currentTimestamp = null;

    // Expose as MapContainer for RadarController
    if (typeof window !== "undefined") {
      window.MapContainer = this;
    }

    // Check if Leaflet is available
    if (typeof L === "undefined") {
      console.warn("⚠️ Leaflet library not loaded. Map features unavailable.");
      this.available = false;
    } else {
      this.available = true;
    }

    // Listen for global location changes so the component recenters accordingly
    try {
      document.addEventListener("app:locationChanged", (e) => {
        const d = e && e.detail ? e.detail : null;
        if (d && typeof d.lat === "number" && typeof d.lon === "number") {
          console.log(
            "[MapComponent] received app:locationChanged",
            d.lat,
            d.lon,
            d.label
          );
          // If map instance exists, apply location immediately, otherwise queue it
          if (this.map && typeof this.setLocation === "function") {
            this.setLocation(d.lat, d.lon, d.label || "");
          } else {
            this._pendingLocation = {
              lat: d.lat,
              lon: d.lon,
              label: d.label || "",
            };
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
      console.warn("Map container not found or Leaflet not available");
      return this;
    }

    try {
      // Initialize Leaflet map
      this.map = L.map(this.containerId, { zoomControl: false }).setView(
        [51.505, -0.09],
        10
      );

      // Add OpenStreetMap base layer
      this.baseLayer = L.tileLayer(
        "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        {
          attribution: "&copy; OpenStreetMap contributors",
          maxZoom: 19,
          attributionControl: false, // Disable default attribution as requested by user
        }
      ).addTo(this.map);

      // Add minimal custom attribution bottom-right if legally needed, but user asked to remove white credits.
      // We will ensure the control is hidden via CSS in action 2.

      // Map Interaction setup

      // TRACK POPUP STATE to prevent immediate reopening when clicking to close
      this._popupJustClosed = false;
      this.map.on("popupclose", () => {
        this._popupJustClosed = true;
        // Small delay to ensure the click event is ignored if it caused the close
        setTimeout(() => {
          this._popupJustClosed = false;
        }, 200);
      });

      // --- NEW: Map Interaction (Click/Tap handler for weather info) ---
      // Fixes issue where user wants data when moving/tapping over map.
      this.map.on("click", async (e) => {
        // If a popup just closed (e.g. user clicked map to dismiss), do not open a new one immediately.
        if (this._popupJustClosed) return;

        const { lat, lng } = e.latlng;

        // Smart Positioning Logic
        const containerPoint = this.map.latLngToContainerPoint(e.latlng);
        const size = this.map.getSize();
        let className = "weather-detail-popup";
        let offset = [0, 0];
        // Default autoPan padding
        let autoPanPadding = [50, 50];

        // Edge Detection
        const isTop = containerPoint.y < size.y * 0.35;
        const isBottom = containerPoint.y > size.y * 0.75;
        const isLeft = containerPoint.x < size.x * 0.2;
        const isRight = containerPoint.x > size.x * 0.8;

        if (isTop) {
          className += " popup-below";
          // No offset needed if we use CSS margin, or use offset to push down
          offset = [0, 20];
        } else if (isBottom) {
          offset = [0, -10];
        }

        // Logic for left/right is usually handled well by Leaflet autoPan,
        // but we can increase padding on the side we are close to.
        if (isLeft) autoPanPadding = [100, 50]; // Force more pan from left
        if (isRight) autoPanPadding = [50, 100]; // Force more pan from right

        // Show loading popup
        const uniqueId = `popup-${Date.now()}`;
        const popup = L.popup({
          className,
          offset,
          autoPan: true,
          autoPanPadding,
        })
          .setLatLng([lat, lng])
          .setContent(
            `
            <div class="weather-popup-loading" id="${uniqueId}">
              <div class="spinner"></div> Lade Wetterdaten...
            </div>
          `
          )
          .openOn(this.map);

        try {
          // Fetch data for this point. We'll use the existing API if possible or a direct fetch.
          // Since we need "current location based correct weather data", let's use the weather service.
          // Assuming WeatherDataService is global or we can fetch directly.

          // Using BigDataCloud or OpenWeatherMap directly for point data
          // FALLBACK: Use Open-Meteo as it is free and easy for point data if API key is an issue,
          // but let's try to reuse app infrastructure if possible.

          // Let's emulate a quick fetch using Open-Meteo for reliability in this specific view
          // as it returns all the requested metrics (temp, humidity, visibility, rain, cover).
          const response = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,precipitation,rain,cloud_cover,visibility,wind_speed_10m,wind_direction_10m&wind_speed_unit=kmh`
          );
          const data = await response.json();
          const current = data.current;

          if (current) {
            const content = `
              <div class="weather-popup-content">
                <div class="popup-header">
                  <strong>Wetter an Position</strong>
                </div>
                <div class="popup-grid">
                  <div class="popup-item">
                    <span class="popup-label">Temp</span>
                    <span class="popup-value">${current.temperature_2m}${
              data.current_units.temperature_2m
            }</span>
                  </div>
                  <div class="popup-item">
                    <span class="popup-label">Wind</span>
                    <span class="popup-value">${
                      current.wind_speed_10m
                    } <small>km/h</small> <span style="display:inline-block; transform: rotate(${
              current.wind_direction_10m
            }deg)">↓</span></span>
                  </div>
                  <div class="popup-item">
                    <span class="popup-label">Regen</span>
                    <span class="popup-value">${current.precipitation}${
              data.current_units.precipitation
            }</span>
                  </div>
                  <div class="popup-item">
                    <span class="popup-label">Feuchtigkeit</span>
                    <span class="popup-value">${current.relative_humidity_2m}${
              data.current_units.relative_humidity_2m
            }</span>
                  </div>
                  <div class="popup-item">
                    <span class="popup-label">Wolken</span>
                    <span class="popup-value">${current.cloud_cover}${
              data.current_units.cloud_cover
            }</span>
                  </div>
                  <div class="popup-item">
                    <span class="popup-label">Sichtweite</span>
                    <span class="popup-value">${(
                      current.visibility / 1000
                    ).toFixed(1)} km</span>
                  </div>
                </div>
                <div class="popup-footer">
                  <small>Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}</small>
                </div>
              </div>
            `;
            // Update popup content
            // Leaflet doesn't have a simple updateContent on the opened popup instance easily if we just used openOn
            // But we can just open a new one or bind.
            L.popup({
              className,
              offset,
              autoPan: true,
              autoPanPadding: [50, 50],
            })
              .setLatLng([lat, lng])
              .setContent(content)
              .openOn(this.map);
          }
        } catch (err) {
          console.error("Failed to fetch weather for point", err);
          L.popup({ className, offset })
            .setLatLng([lat, lng])
            .setContent(
              `<div class="weather-popup-error">Daten nicht verfügbar</div>`
            )
            .openOn(this.map);
        }
      });

      // Add default weather overlay (precipitation) - this makes weather layers actually overlay the map
      try {
        this.addWeatherOverlay("rainviewer", null, "rain");
      } catch (err) {
        console.warn("Failed to add default weather overlay:", err);
      }

      // Initialize Legend Click Handlers (Make legend items interactive)
      this._initLegendInteractivity();

      // If there was a pending location to set, apply it now
      if (this._pendingLocation) {
        this.setLocation(
          this._pendingLocation.lat,
          this._pendingLocation.lon,
          this._pendingLocation.label || ""
        );
        this._pendingLocation = null;
      }
      console.log("✅ Map initialized");
      this._removePlaceholder();
    } catch (err) {
      console.error("❌ Map initialization error:", err);
      this.available = false;
    }

    return this;
  }

  /**
   * Make static HTML legend items interactive
   */
  _initLegendInteractivity() {
    const legendItems = document.querySelectorAll(".radar-view__legend-item");
    if (!legendItems.length) return;

    console.log("[MapComponent] Initializing legend interactivity");

    // Mapping from text content to layer key
    const layerMap = {
      regen: "rain",
      schnee: "snow",
      temp: "temp",
      wind: "wind",
      wolken: "clouds",
    };

    legendItems.forEach((item) => {
      const text = item.textContent.trim().toLowerCase();
      const layerType = layerMap[text];

      if (layerType) {
        item.style.cursor = "pointer";
        item.title = `Layer ${text} umschalten`;

        // Add active state visual logic if needed, but for now just toggle
        item.addEventListener("click", () => {
          // Check if active
          const isActive =
            this.overlays[layerType] &&
            this.map.hasLayer(this.overlays[layerType]);

          // Toggle off all others? Usually layers are exclusive or additive.
          // OpenWeatherMap layers are tiles. They can stack but might look messy.
          // Let's toggle THIS one.
          this.toggleOverlay(layerType, !isActive);

          // Optional: Visual feedback on the legend item
          if (!isActive) {
            item.classList.add("active-layer");
            // Remove active class from others if we want exclusive behavior (optional)
          } else {
            item.classList.remove("active-layer");
          }
        });
      }
    });
  }

  _removePlaceholder() {
    const container = document.getElementById(this.containerId);
    if (container) {
      const placeholder = container.querySelector(
        ".radar-view__map-placeholder"
      );
      if (placeholder) {
        placeholder.style.display = "none";
      }
    }
  }

  invalidate() {
    if (this.map) {
      setTimeout(() => {
        this.map.invalidateSize();
      }, 100);
    }
  }

  /**
   * Set location marker and center map
   * @param {number} latitude - Location latitude
   * @param {number} longitude - Location longitude
   * @param {string} locationName - Location name for marker popup
   */
  setLocation(latitude, longitude, locationName = "Location") {
    if (!this.map) {
      console.warn("Map not initialized");
      return this;
    }

    try {
      // Ensure numeric values
      const lat = Number(latitude);
      const lon = Number(longitude);
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
        console.warn(
          "Invalid coordinates for setLocation",
          latitude,
          longitude
        );
        return this;
      }

      // Invalidate size first in case container changed (common in hidden tabs/layout shifts)
      if (
        this.map.invalidateSize &&
        typeof this.map.invalidateSize === "function"
      ) {
        try {
          this.map.invalidateSize();
        } catch (e) {
          /* ignore */
        }
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
        .bindPopup(
          `<strong>${locationName}</strong><br>Lat: ${lat.toFixed(
            4
          )}, Lng: ${lon.toFixed(4)}`
        )
        .addTo(this.map);

      this.map.setView([latitude, longitude], 10);

      // Ensure container/layout is up-to-date then center the map.
      try {
        if (this.map && typeof this.map.invalidateSize === "function") {
          try {
            this.map.invalidateSize();
          } catch (e) {
            /* ignore */
          }
        }

        // Preserve current zoom if available
        const currentZoom =
          this.map && typeof this.map.getZoom === "function"
            ? this.map.getZoom()
            : 10;

        // Ensure map sizing and center once the map is ready
        try {
          if (this.map && typeof this.map.whenReady === "function") {
            this.map.whenReady(() => {
              try {
                if (this.map && typeof this.map.invalidateSize === "function")
                  this.map.invalidateSize();
              } catch (e) {
                /* ignore */
              }
              try {
                if (
                  this.map &&
                  typeof this.map.getSize === "function" &&
                  this.anchorOffset
                ) {
                  const size = this.map.getSize();
                  const centerPoint = L.point(size.x / 2, size.y / 2);
                  const desiredPoint = centerPoint.add(
                    L.point(this.anchorOffset.x, this.anchorOffset.y)
                  );
                  const newCenterLatLng = this.map.containerPointToLatLng(
                    centerPoint.subtract(desiredPoint.subtract(centerPoint))
                  );
                  this.map.setView(newCenterLatLng, currentZoom, {
                    animate: false,
                  });
                } else if (this.map && typeof this.map.setView === "function") {
                  this.map.setView([lat, lon], currentZoom);
                }
              } catch (e) {
                /* ignore */
              }
            });
          } else {
            try {
              if (this.map && typeof this.map.invalidateSize === "function")
                this.map.invalidateSize();
            } catch (e) {
              /* ignore */
            }
            try {
              if (
                this.map &&
                typeof this.map.getSize === "function" &&
                this.anchorOffset
              ) {
                // compute center such that marker at [lat,lon] appears at container center + anchorOffset
                const size = this.map.getSize();
                const centerPoint = L.point(size.x / 2, size.y / 2);
                const desiredPoint = centerPoint.add(
                  L.point(this.anchorOffset.x, this.anchorOffset.y)
                );
                const newCenterLatLng = this.map.containerPointToLatLng(
                  centerPoint.subtract(desiredPoint.subtract(centerPoint))
                );
                this.map.setView(newCenterLatLng, 10, { animate: false });
              } else if (this.map && typeof this.map.setView === "function") {
                this.map.setView([lat, lon], 10);
              }
            } catch (e) {
              /* ignore */
            }
          }
        } catch (err) {
          console.warn("Error scheduling center (simple):", err);
        }
      } catch (err) {
        console.warn("Error scheduling center:", err);
      }

      console.log(`📍 Marker set for ${locationName} (${lat}, ${lon})`);
    } catch (err) {
      console.error("❌ Error setting location marker:", err);
    }

    return this;
  }

  /**
   * Add weather tile overlay
   * @param {string} provider - 'openweathermap' or 'weather-radar'
   * @param {string} apiKey - Optional API key for OpenWeatherMap
   * @param {string} layerType - Type of layer: 'rain', 'snow', 'temp', 'wind', 'clouds', 'pressure'
   */
  addWeatherOverlay(
    provider = "openstreetmap",
    apiKey = null,
    layerType = "clouds"
  ) {
    if (!this.map) {
      console.warn("Map not initialized");
      return this;
    }

    try {
      let layerUrl, attribution;

      if (provider === "openweathermap") {
        // Attempt to find a better key from storage if one isn't provided
        if (!apiKey && typeof localStorage !== "undefined") {
          const storedKey = localStorage.getItem("wetter_api_openweathermap");
          if (storedKey) {
            console.log(
              "[MapComponent] Using stored OpenWeatherMap key for layer"
            );
            apiKey = storedKey;
          }
        }

        // OpenWeatherMap Layer URLs (mit API-Key wenn vorhanden, sonst Fallback)
        // Fallback key might be rate limited or invalid.
        const defaultKey = "8437e4b8d4acc41194a3cd3325c41233";

        const layerUrls = {
          rain: apiKey
            ? `https://tile.openweathermap.org/map/precipitation_new/{z}/{x}/{y}.png?appid=${apiKey}`
            : `https://tile.openweathermap.org/map/precipitation_new/{z}/{x}/{y}.png?appid=${defaultKey}`,
          snow: apiKey
            ? `https://tile.openweathermap.org/map/snow_new/{z}/{x}/{y}.png?appid=${apiKey}`
            : `https://tile.openweathermap.org/map/snow_new/{z}/{x}/{y}.png?appid=${defaultKey}`,
          temp: apiKey
            ? `https://tile.openweathermap.org/map/temp_new/{z}/{x}/{y}.png?appid=${apiKey}`
            : `https://tile.openweathermap.org/map/temp_new/{z}/{x}/{y}.png?appid=${defaultKey}`,
          wind: apiKey
            ? `https://tile.openweathermap.org/map/wind_new/{z}/{x}/{y}.png?appid=${apiKey}`
            : `https://tile.openweathermap.org/map/wind_new/{z}/{x}/{y}.png?appid=${defaultKey}`,
          clouds: apiKey
            ? `https://tile.openweathermap.org/map/clouds_new/{z}/{x}/{y}.png?appid=${apiKey}`
            : `https://tile.openweathermap.org/map/clouds_new/{z}/{x}/{y}.png?appid=${defaultKey}`,
          pressure: apiKey
            ? `https://tile.openweathermap.org/map/pressure_new/{z}/{x}/{y}.png?appid=${apiKey}`
            : `https://tile.openweathermap.org/map/pressure_new/{z}/{x}/{y}.png?appid=${defaultKey}`,
        };

        layerUrl = layerUrls[layerType] || layerUrls["clouds"];
        attribution = `© OpenWeatherMap (${layerType})`;

        console.log(
          "[MapComponent] Adding OpenWeatherMap overlay:",
          layerType,
          "URL:",
          layerUrl.substring(0, 80) + "..."
        );
      } else if (provider === "rainviewer") {
        // Init RainViewer
        this._fetchRainViewerData(); // Async but fine
        this.activeProvider = "rainviewer";

        layerUrl = this._buildRainViewerUrl(
          this.currentTimestamp || Date.now()
        );
        attribution = "RainViewer";
        // Ensure layerType is consistent, usually 'rain' or 'radar'
        if (!layerType) layerType = "rain";
      } else if (provider === "weather-radar") {
        layerUrl = `https://tile.openweathermap.org/map/precipitation_new/{z}/{x}/{y}.png?appid=8437e4b8d4acc41194a3cd3325c41233`;
        attribution = "© OpenWeatherMap Precipitation";
        layerType = "radar"; // Use consistent key for weather-radar
      } else {
        console.log("ℹ️ OpenStreetMap is already the base layer");
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
        opacity: 1.0, // Maximum visibility
        maxZoom: 18,
      }).addTo(this.map);

      // Store the overlay for future management
      this.overlays[layerType] = overlayLayer;

      console.log(
        `✅ Weather overlay added: ${provider} (${layerType}) using key: ${
          apiKey ? "Custom" : "Default"
        }`
      );
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
      console.warn("Map not initialized");
      return this;
    }

    try {
      const marker = L.marker([latitude, longitude], {
        icon: L.icon({
          iconUrl:
            'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23FFD700"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>',
          iconSize: [32, 32],
          popupAnchor: [0, -16],
        }),
      })
        .bindPopup(
          `<strong>⭐ ${name}</strong><br>Lat: ${latitude.toFixed(
            4
          )}, Lng: ${longitude.toFixed(4)}`
        )
        .addTo(this.map);

      this.markers[id] = marker;
      console.log(`✅ Favorite marker added: ${name}`);
    } catch (err) {
      console.error("❌ Error adding favorite marker:", err);
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
      console.warn("Map not initialized");
      return this;
    }

    if (visible) {
      // If we want to show it but it doesn't exist, we need to add it
      if (!this.overlays[layerType]) {
        console.log(`Layer ${layerType} not found in overlays, creating it...`);

        let provider = "openweathermap";
        if (
          layerType === "rain" ||
          layerType === "radar" ||
          layerType === "regen"
        ) {
          provider = "rainviewer";
        }

        this.addWeatherOverlay(provider, null, layerType);
        return this;
      }
      // Add it back to the map if it's not already there
      if (!this.map.hasLayer(this.overlays[layerType])) {
        this.overlays[layerType].addTo(this.map);
        console.log(`✅ Overlay ${layerType} shown`);
      }
    } else {
      // Hide the overlay
      if (
        this.overlays[layerType] &&
        this.map.hasLayer(this.overlays[layerType])
      ) {
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
    // Toggle check: if already open, close it and return
    const existing = document.getElementById("map-layer-selector");
    if (existing) {
      this.hideLayerSelector();
      return this;
    }

    // Remove existing selector if present (safety)
    this.hideLayerSelector();

    const selector = document.createElement("div");
    selector.id = "map-layer-selector";
    selector.className = "map-layer-menu";
    selector.innerHTML = `
      <div class="map-layer-menu-header">
        <span class="map-layer-menu-title">Wetter Layers</span>
      </div>
      <div style="display: flex; flex-direction: column; gap: 2px;">
        <label class="map-layer-item">
          <input type="checkbox" data-layer="rain">
          <div class="map-layer-checkbox"></div>
          <span class="map-layer-label">Regen</span>
        </label>
        <label class="map-layer-item">
          <input type="checkbox" data-layer="clouds">
          <div class="map-layer-checkbox"></div>
          <span class="map-layer-label">Wolken</span>
        </label>
        <label class="map-layer-item">
          <input type="checkbox" data-layer="temp">
          <div class="map-layer-checkbox"></div>
          <span class="map-layer-label">Temperatur</span>
        </label>
        <label class="map-layer-item">
          <input type="checkbox" data-layer="wind">
          <div class="map-layer-checkbox"></div>
          <span class="map-layer-label">Wind</span>
        </label>
        <label class="map-layer-item">
          <input type="checkbox" data-layer="pressure">
          <div class="map-layer-checkbox"></div>
          <span class="map-layer-label">Luftdruck</span>
        </label>
      </div>
    `;

    // Add event listeners
    selector.querySelectorAll('input[type="checkbox"]').forEach((checkbox) => {
      // Set initial state
      const layerType = checkbox.dataset.layer;
      // Check if this layer is currently in the overlays object and on the map
      const isVisible =
        this.overlays[layerType] && this.map.hasLayer(this.overlays[layerType]);
      checkbox.checked = !!isVisible;

      checkbox.addEventListener("change", (e) => {
        const layerType = e.target.dataset.layer;
        this.toggleOverlay(layerType, e.target.checked);
      });
    });

    // Add to map wrapper instead of map container for better layering
    const wrapper = document.querySelector(".radar-view__map-wrapper");
    if (wrapper) {
      // wrapper.style.position = "relative"; // Already in CSS
      wrapper.appendChild(selector);
    }

    // Close on click outside
    setTimeout(() => {
      const closeHandler = (e) => {
        const el = document.getElementById("map-layer-selector");
        if (
          el &&
          !el.contains(e.target) &&
          !e.target.closest("#map-layer-toggle")
        ) {
          this.hideLayerSelector();
          document.removeEventListener("click", closeHandler);
        }
      };
      document.addEventListener("click", closeHandler);
    }, 100);

    return this;
  }

  /**
   * Hide the layer selector UI
   */
  hideLayerSelector() {
    const selector = document.getElementById("map-layer-selector");
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
    Object.keys(this.overlays).forEach((layerType) => {
      if (this.map && this.map.hasLayer(this.overlays[layerType])) {
        this.map.removeLayer(this.overlays[layerType]);
      }
      delete this.overlays[layerType];
    });
    console.log("✅ All overlays cleared");

    return this;
  }

  /**
   * Clear all markers except current location
   */
  clearMarkers() {
    Object.keys(this.markers).forEach((id) => {
      this.map.removeLayer(this.markers[id]);
      delete this.markers[id];
    });
    console.log("✅ Markers cleared");

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
      console.log("✅ Map destroyed");
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

  // --- RainViewer & Timeline Support ---

  async _fetchRainViewerData() {
    try {
      if (this.rainViewerCache.length > 0) return; // Already loaded
      const response = await fetch(
        "https://api.rainviewer.com/public/weather-maps.json"
      );
      const data = await response.json();
      this.rainViewerCache = [
        ...(data.radar?.past || []),
        ...(data.radar?.nowcast || []),
      ];
      if (data.host) this.rainViewerHost = data.host;
      console.log(
        "[MapComponent] RainViewer frames loaded:",
        this.rainViewerCache.length
      );

      // Regenerate RadarController frames now that data is available
      if (global.RadarController && typeof global.RadarController.regenerateFrames === "function") {
        global.RadarController.regenerateFrames();
      }

      // If we have a pending specific timestamp, update now
      if (this.currentTimestamp) {
        this.handleTimelineUpdate(this.currentTimestamp);
      }
    } catch (e) {
      console.warn("[MapComponent] Failed to fetch RainViewer frames", e);
    }
  }

  _buildRainViewerUrl(ts) {
    // Find closest timestamp in cache
    let useTime = ts;
    if (this.rainViewerCache.length > 0 && typeof ts === "number") {
      // Find closest
      // RadarController sends ms. RainViewer is seconds.
      const tsSec = ts / 1000;
      const closest = this.rainViewerCache.reduce((prev, curr) => {
        return Math.abs(curr.time - tsSec) < Math.abs(prev.time - tsSec)
          ? curr
          : prev;
      });
      if (closest) {
        useTime = closest.time; // This is in seconds
      }
    } else {
      // Fallback for initial load or no data
      useTime = Math.floor(Date.now() / 1000);
    }

    // URL pattern: {host}/v2/radar/{ts}/{size}/{z}/{x}/{y}/{color}/{smooth}_{snow}.png
    return `${this.rainViewerHost}/v2/radar/${useTime}/512/{z}/{x}/{y}/2/1_1.png`;
  }

  handleTimelineUpdate(timestamp) {
    this.currentTimestamp = timestamp;

    // Fallback: If cache is empty, try to fetch if we haven't
    if (this.rainViewerCache.length === 0 && !this._fetchingRainViewer) {
      this._fetchingRainViewer = true;
      this._fetchRainViewerData().finally(() => {
        this._fetchingRainViewer = false;
      });
    }

    // Attempt to update common RainViewer layers
    const targetLayer = this.overlays["rain"] || this.overlays["radar"];
    if (targetLayer && this.map.hasLayer(targetLayer)) {
      const newUrl = this._buildRainViewerUrl(timestamp);
      // Optimize: Only setUrl if changed
      if (targetLayer._url !== newUrl) {
        targetLayer.setUrl(newUrl);
      }
    }
  }

  // Support generic MapLayerManager interface
  updateLayerData(layerId, timestamp) {
    if (layerId === "radar" || layerId === "rain") {
      this.handleTimelineUpdate(timestamp);
    }
  }
}

// Exportiere MapComponent global für Verwendung in anderen Modulen
window.MapComponent = MapComponent;

// Export for use in app
if (typeof module !== "undefined" && module.exports) {
  module.exports = MapComponent;
}
