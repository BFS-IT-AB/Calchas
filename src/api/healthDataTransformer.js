/**
 * healthDataTransformer.js - API Data Transformer for HealthEngine
 * Maps raw weather API data (OpenMeteo, BrightSky, etc.) to the format
 * expected by HealthEngine. Supports offline-first with cache integration.
 * @module api/healthDataTransformer
 */

(function (global) {
  "use strict";

  /**
   * HealthDataTransformer Class
   * Transforms various API formats to unified health data format
   */
  class HealthDataTransformer {
    constructor(options = {}) {
      this.cacheKey = options.cacheKey || "health_data";
      this.cacheDuration = options.cacheDuration || 30 * 60 * 1000; // 30 minutes default
    }

    // ============================================
    // MAIN TRANSFORMATION METHOD
    // ============================================

    /**
     * Transform raw app state to HealthEngine-compatible format
     * @param {object} appState - Raw app state from weather APIs
     * @returns {object} Transformed data for HealthEngine
     */
    transform(appState) {
      if (!appState) {
        return this.getEmptyState();
      }

      const current = this.transformCurrent(appState.current || {});
      const hourly = this.transformHourly(appState.hourly || []);
      const daily = this.transformDaily(appState.daily || []);
      const aqi = this.transformAqi(appState.aqi || {});
      const pollen = this.transformPollen(appState.pollen || {});

      const result = {
        current,
        hourly,
        daily,
        aqi,
        pollen,
        location: appState.location || null,
        lastUpdated: appState.lastUpdated || new Date().toISOString(),
        fromCache: appState.fromCache || false,
        source: appState.source || "unknown",
      };

      // Cache the transformed data
      this.cacheData(result);

      return result;
    }

    /**
     * Get empty state structure
     */
    getEmptyState() {
      return {
        current: {
          temperature: null,
          apparentTemperature: null,
          humidity: null,
          windSpeed: null,
          precipProb: 0,
          uvIndex: 0,
          visibility: 10,
          pressure: null,
          cloudCover: 50,
        },
        hourly: [],
        daily: [],
        aqi: { europeanAqi: 0, usAqi: 0 },
        pollen: { trees: 0, grass: 0, weeds: 0 },
        lastUpdated: null,
        fromCache: false,
        source: null,
      };
    }

    // ============================================
    // CURRENT CONDITIONS TRANSFORMER
    // ============================================

    /**
     * Transform current weather conditions
     * @param {object} raw - Raw current data
     * @returns {object} Normalized current conditions
     */
    transformCurrent(raw) {
      return {
        temperature: this.extractNumber(raw.temperature, raw.temp, raw.t),
        apparentTemperature: this.extractNumber(
          raw.apparentTemperature,
          raw.feelsLike,
          raw.feels_like,
          raw.apparent_temperature,
        ),
        humidity: this.extractNumber(
          raw.humidity,
          raw.relativeHumidity,
          raw.relative_humidity,
        ),
        windSpeed: this.extractNumber(
          raw.windSpeed,
          raw.wind_speed,
          raw.windspeed,
        ),
        windGust: this.extractNumber(
          raw.windGust,
          raw.wind_gust,
          raw.windgusts,
        ),
        windDirection: this.extractNumber(
          raw.windDirection,
          raw.wind_direction,
          raw.winddirection,
        ),
        precipProb:
          this.extractNumber(
            raw.precipProb,
            raw.precipitationProbability,
            raw.precipitation_probability,
            raw.pop,
          ) || 0,
        precipitation:
          this.extractNumber(raw.precipitation, raw.rain, raw.precip) || 0,
        uvIndex: this.extractNumber(raw.uvIndex, raw.uv_index, raw.uv),
        visibility: this.extractNumber(raw.visibility) || 10,
        pressure: this.extractNumber(
          raw.pressure,
          raw.surfacePressure,
          raw.surface_pressure,
          raw.pressure_msl,
          raw.mslp,
        ),
        cloudCover:
          this.extractNumber(raw.cloudCover, raw.cloud_cover, raw.clouds) || 50,
        condition: raw.condition || raw.weatherCode || raw.weather_code,
        icon: raw.icon || raw.weatherIcon,
        time: raw.time || new Date().toISOString(),
      };
    }

    // ============================================
    // HOURLY DATA TRANSFORMER
    // ============================================

    /**
     * Transform hourly forecast data
     * @param {Array} rawHourly - Raw hourly data array
     * @returns {Array} Normalized hourly data
     */
    transformHourly(rawHourly) {
      if (!Array.isArray(rawHourly)) return [];

      return rawHourly.map((hour) => ({
        time: hour.time || hour.datetime || hour.dt,
        timeLabel: this.extractTimeLabel(hour),
        temperature: this.extractNumber(hour.temperature, hour.temp, hour.t),
        apparentTemperature: this.extractNumber(
          hour.apparentTemperature,
          hour.feelsLike,
          hour.feels_like,
          hour.apparent_temperature,
        ),
        humidity: this.extractNumber(
          hour.humidity,
          hour.relativeHumidity,
          hour.relative_humidity,
        ),
        windSpeed: this.extractNumber(
          hour.windSpeed,
          hour.wind_speed,
          hour.windspeed,
        ),
        windGust: this.extractNumber(hour.windGust, hour.wind_gust),
        precipitationProbability:
          this.extractNumber(
            hour.precipitationProbability,
            hour.precipProb,
            hour.precipitation_probability,
            hour.pop,
          ) || 0,
        precipitation:
          this.extractNumber(hour.precipitation, hour.rain, hour.precip) || 0,
        uvIndex: this.extractNumber(hour.uvIndex, hour.uv_index, hour.uv),
        visibility: this.extractNumber(hour.visibility),
        pressure: this.extractNumber(
          hour.pressure,
          hour.surfacePressure,
          hour.surface_pressure,
          hour.pressure_msl,
        ),
        cloudCover: this.extractNumber(
          hour.cloudCover,
          hour.cloud_cover,
          hour.clouds,
        ),
        condition: hour.condition || hour.weatherCode || hour.weather_code,
        icon: hour.icon || hour.weatherIcon,
      }));
    }

    /**
     * Extract time label from hour data
     */
    extractTimeLabel(hour) {
      if (hour.timeLabel) return hour.timeLabel;

      const time = hour.time || hour.datetime;
      if (!time) return "";

      try {
        const date = new Date(time);
        if (!isNaN(date.getTime())) {
          return date.toLocaleTimeString("de-DE", {
            hour: "2-digit",
            minute: "2-digit",
          });
        }
      } catch (e) {
        // Fallback
      }

      // Try to extract from string
      const match = String(time).match(/(\d{1,2}):(\d{2})/);
      if (match) {
        return `${match[1].padStart(2, "0")}:${match[2]}`;
      }

      return "";
    }

    // ============================================
    // DAILY DATA TRANSFORMER
    // ============================================

    /**
     * Transform daily forecast data
     * @param {Array} rawDaily - Raw daily data array
     * @returns {Array} Normalized daily data
     */
    transformDaily(rawDaily) {
      if (!Array.isArray(rawDaily)) return [];

      return rawDaily.map((day) => ({
        date: day.date || day.datetime || day.dt,
        tempMax: this.extractNumber(
          day.tempMax,
          day.temperature_2m_max,
          day.maxTemp,
          day.high,
        ),
        tempMin: this.extractNumber(
          day.tempMin,
          day.temperature_2m_min,
          day.minTemp,
          day.low,
        ),
        precipProbMax:
          this.extractNumber(
            day.precipProbMax,
            day.precipitation_probability_max,
            day.pop,
          ) || 0,
        precipSum:
          this.extractNumber(
            day.precipSum,
            day.precipitation_sum,
            day.totalPrecip,
          ) || 0,
        uvIndexMax: this.extractNumber(
          day.uvIndexMax,
          day.uv_index_max,
          day.uvIndex,
        ),
        windSpeedMax: this.extractNumber(
          day.windSpeedMax,
          day.wind_speed_10m_max,
          day.maxWind,
        ),
        sunrise: day.sunrise,
        sunset: day.sunset,
        condition: day.condition || day.weatherCode || day.weather_code,
        icon: day.icon || day.weatherIcon,
      }));
    }

    // ============================================
    // AQI TRANSFORMER
    // ============================================

    /**
     * Transform Air Quality Index data
     * @param {object} rawAqi - Raw AQI data
     * @returns {object} Normalized AQI data
     */
    transformAqi(rawAqi) {
      return {
        europeanAqi:
          this.extractNumber(
            rawAqi.europeanAqi,
            rawAqi.european_aqi,
            rawAqi.aqi_eu,
          ) || 0,
        usAqi:
          this.extractNumber(
            rawAqi.usAqi,
            rawAqi.us_aqi,
            rawAqi.aqi_us,
            rawAqi.aqi,
          ) || 0,
        pm25: this.extractNumber(rawAqi.pm25, rawAqi.pm2_5),
        pm10: this.extractNumber(rawAqi.pm10),
        o3: this.extractNumber(rawAqi.o3, rawAqi.ozone),
        no2: this.extractNumber(rawAqi.no2),
        so2: this.extractNumber(rawAqi.so2),
        co: this.extractNumber(rawAqi.co),
        label:
          rawAqi.label ||
          rawAqi.category ||
          this.getAqiLabel(rawAqi.europeanAqi || rawAqi.usAqi || 0),
      };
    }

    /**
     * Get AQI label based on value
     */
    getAqiLabel(value) {
      if (value <= 20) return "Good";
      if (value <= 40) return "Fair";
      if (value <= 60) return "Moderate";
      if (value <= 80) return "Poor";
      if (value <= 100) return "Very Poor";
      return "Hazardous";
    }

    // ============================================
    // POLLEN TRANSFORMER
    // ============================================

    /**
     * Transform pollen data
     * @param {object} rawPollen - Raw pollen data
     * @returns {object} Normalized pollen data (0-5 scale)
     */
    transformPollen(rawPollen) {
      return {
        trees: this.normalizePollenLevel(
          rawPollen.trees,
          rawPollen.tree,
          rawPollen.tree_pollen,
        ),
        grass: this.normalizePollenLevel(
          rawPollen.grass,
          rawPollen.grass_pollen,
        ),
        weeds: this.normalizePollenLevel(
          rawPollen.weeds,
          rawPollen.weed,
          rawPollen.ragweed,
        ),
        overall: this.normalizePollenLevel(rawPollen.overall, rawPollen.total),
      };
    }

    /**
     * Normalize pollen level to 0-5 scale
     */
    normalizePollenLevel(...values) {
      const value = this.extractNumber(...values);
      if (value == null) return 0;

      // If already 0-5 scale
      if (value <= 5) return Math.round(value);

      // If 0-100 scale, convert
      if (value <= 100) return Math.round(value / 20);

      // Unknown scale, cap at 5
      return Math.min(5, Math.round(value / 100));
    }

    // ============================================
    // UTILITY METHODS
    // ============================================

    /**
     * Extract first valid number from multiple potential values
     */
    extractNumber(...values) {
      for (const val of values) {
        if (val !== undefined && val !== null && !isNaN(Number(val))) {
          return Number(val);
        }
      }
      return null;
    }

    // ============================================
    // CACHE INTEGRATION (Offline-First)
    // ============================================

    /**
     * Cache transformed data for offline use
     */
    cacheData(data) {
      if (typeof localStorage === "undefined") return;

      try {
        const cacheEntry = {
          data,
          timestamp: Date.now(),
          expires: Date.now() + this.cacheDuration,
        };
        localStorage.setItem(this.cacheKey, JSON.stringify(cacheEntry));
      } catch (e) {
        console.warn("HealthDataTransformer: Failed to cache data", e);
      }
    }

    /**
     * Get cached data if valid
     * @returns {object|null} Cached data or null
     */
    getCachedData() {
      if (typeof localStorage === "undefined") return null;

      try {
        const cached = localStorage.getItem(this.cacheKey);
        if (!cached) return null;

        const cacheEntry = JSON.parse(cached);

        // Check if expired
        if (Date.now() > cacheEntry.expires) {
          localStorage.removeItem(this.cacheKey);
          return null;
        }

        // Mark as from cache
        cacheEntry.data.fromCache = true;
        cacheEntry.data.cacheAge = Date.now() - cacheEntry.timestamp;

        return cacheEntry.data;
      } catch (e) {
        console.warn("HealthDataTransformer: Failed to read cache", e);
        return null;
      }
    }

    /**
     * Get data with fallback to cache
     * @param {object} appState - Fresh app state (may be null if offline)
     * @returns {object} Fresh data or cached data
     */
    getWithFallback(appState) {
      if (appState && appState.current) {
        return this.transform(appState);
      }

      // Try cache
      const cached = this.getCachedData();
      if (cached) {
        console.log("HealthDataTransformer: Using cached data");
        return cached;
      }

      // Return empty state
      return this.getEmptyState();
    }

    /**
     * Check if we have valid cached data
     * @returns {boolean}
     */
    hasCachedData() {
      return this.getCachedData() !== null;
    }

    /**
     * Clear cached data
     */
    clearCache() {
      if (typeof localStorage !== "undefined") {
        localStorage.removeItem(this.cacheKey);
      }
    }

    // ============================================
    // SERVICE WORKER CACHE INTEGRATION
    // ============================================

    /**
     * Get data from Service Worker cache (CacheStorage)
     * @param {string} cacheKey - Cache name
     * @returns {Promise<object|null>}
     */
    async getFromServiceWorkerCache(cacheKey = "calchas-health-data") {
      if (typeof caches === "undefined") return null;

      try {
        const cache = await caches.open(cacheKey);
        const response = await cache.match("/health-data");

        if (response) {
          const data = await response.json();
          data.fromCache = true;
          data.fromServiceWorker = true;
          return data;
        }
      } catch (e) {
        console.warn(
          "HealthDataTransformer: ServiceWorker cache read failed",
          e,
        );
      }

      return null;
    }

    /**
     * Store data in Service Worker cache
     * @param {object} data - Data to cache
     * @param {string} cacheKey - Cache name
     */
    async storeInServiceWorkerCache(data, cacheKey = "calchas-health-data") {
      if (typeof caches === "undefined") return;

      try {
        const cache = await caches.open(cacheKey);
        const response = new Response(
          JSON.stringify({
            ...data,
            cachedAt: new Date().toISOString(),
          }),
          {
            headers: { "Content-Type": "application/json" },
          },
        );
        await cache.put("/health-data", response);
      } catch (e) {
        console.warn(
          "HealthDataTransformer: ServiceWorker cache write failed",
          e,
        );
      }
    }
  }

  // ============================================
  // STATIC HELPER FOR QUICK TRANSFORMS
  // ============================================

  /**
   * Quick transform without instantiation
   */
  HealthDataTransformer.quick = function (appState) {
    const transformer = new HealthDataTransformer();
    return transformer.transform(appState);
  };

  /**
   * Quick transform with cache fallback
   */
  HealthDataTransformer.withFallback = function (appState) {
    const transformer = new HealthDataTransformer();
    return transformer.getWithFallback(appState);
  };

  // Export
  global.HealthDataTransformer = HealthDataTransformer;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = HealthDataTransformer;
  }
})(typeof window !== "undefined" ? window : global);
