// Zentrale Fassade für alle Wetter-Datenflüsse
// Nutzt bestehende API-Module und kapselt deren Aufrufe

import "../utils/validation.js";

export class WeatherDataService {
  constructor(options = {}) {
    this.options = options;
  }

  async loadCurrentAndForecast(latitude, longitude) {
    const [{ default: openMeteoAPI }, { default: brightSkyApi }] =
      await Promise.all([import("./weather.js"), import("./brightsky.js")]);

    const [openMeteoResult, brightSkyResult] = await Promise.all([
      openMeteoAPI.fetchWeather(latitude, longitude),
      brightSkyApi.fetchWeather(latitude, longitude),
    ]);

    return {
      openMeteo: openMeteoResult?.data || null,
      brightSky: brightSkyResult?.data || null,
      raw: {
        openMeteo: openMeteoResult,
        brightSky: brightSkyResult,
      },
    };
  }

  async loadHistory(latitude, longitude, startDate, endDate) {
    const { gridFieldsAPI } = await import("./gridFields.js");
    return gridFieldsAPI.fetchHistoricalData(
      latitude,
      longitude,
      startDate,
      endDate,
    );
  }

  /**
   * Loads hourly historical weather data with fallback strategy
   * @param {number} latitude - Latitude coordinate
   * @param {number} longitude - Longitude coordinate
   * @param {string} startDate - Start date (YYYY-MM-DD format)
   * @param {string} endDate - End date (YYYY-MM-DD format)
   * @returns {Promise<object>} - { hourly: [...], source: string } or error object
   *
   * Fallback strategy:
   * 1. Open-Meteo Historical (free, no key, 1940-present)
   * 2. Visual Crossing (requires key, hourly data)
   * 3. Meteostat daily (fallback to daily aggregates if hourly fails)
   */
  async loadHourlyHistory(latitude, longitude, startDate, endDate) {
    console.log(
      `🔄 [WeatherDataService] Loading hourly history: ${startDate} to ${endDate}`,
    );

    // PRIORITY 1: Open-Meteo Historical (Free, no key required, high quality)
    try {
      const openMeteoHistorical = (await import("./openMeteoHistorical.js"))
        .default;
      const result = await openMeteoHistorical.fetchHourlyHistorical(
        latitude,
        longitude,
        startDate,
        endDate,
      );

      if (
        result &&
        !result.error &&
        result.hourly &&
        result.hourly.length > 0
      ) {
        console.log(
          `✅ [WeatherDataService] Open-Meteo Historical successful (${result.hourly.length} hours)`,
        );
        return result;
      }

      console.warn(
        `⚠️ [WeatherDataService] Open-Meteo Historical returned no data or error: ${result?.error}`,
      );
    } catch (err) {
      console.error(
        `❌ [WeatherDataService] Open-Meteo Historical failed:`,
        err,
      );
    }

    // PRIORITY 2: Visual Crossing (Requires API key, good hourly data)
    try {
      const apiKey = window.apiKeyManager?.getKey("visualcrossing");
      if (apiKey) {
        const VisualCrossingAPI =
          (await import("./visualcrossing.js")).default ||
          (await import("./visualcrossing.js"));
        const vcAPI = new (VisualCrossingAPI.default || VisualCrossingAPI)();
        const result = await vcAPI.fetchHourlyHistorical(
          latitude,
          longitude,
          startDate,
          endDate,
          apiKey,
        );

        if (
          result &&
          !result.error &&
          result.hourly &&
          result.hourly.length > 0
        ) {
          console.log(
            `✅ [WeatherDataService] Visual Crossing Historical successful (${result.hourly.length} hours)`,
          );
          return result;
        }

        console.warn(
          `⚠️ [WeatherDataService] Visual Crossing returned no data or error: ${result?.error}`,
        );
      } else {
        console.log(
          `ℹ️ [WeatherDataService] Visual Crossing API key not available, skipping`,
        );
      }
    } catch (err) {
      console.error(
        `❌ [WeatherDataService] Visual Crossing Historical failed:`,
        err,
      );
    }

    // PRIORITY 3: Meteostat (Fallback to daily data)
    try {
      const MeteostatAPI =
        (await import("./meteostat.js")).default ||
        (await import("./meteostat.js"));
      const meteostatAPI = new (MeteostatAPI.default || MeteostatAPI)();
      const apiKey = window.apiKeyManager?.getKey("meteostat") || null;

      const result = await meteostatAPI.fetchHistorical(
        latitude,
        longitude,
        startDate,
        endDate,
        apiKey,
      );

      if (result && !result.error && result.daily && result.daily.length > 0) {
        console.log(
          `✅ [WeatherDataService] Meteostat daily fallback successful (${result.daily.length} days)`,
        );
        // Convert daily to pseudo-hourly (one entry per day at noon)
        const pseudoHourly = result.daily.map((day) => ({
          timestamp: `${day.date}T12:00:00`,
          date: day.date,
          hour: 12,
          temp: day.temp_avg,
          temp_avg: day.temp_avg,
          temp_min: day.temp_min,
          temp_max: day.temp_max,
          precip: day.precip || day.precipitation || 0,
          wind_speed: day.wind_speed,
          humidity: day.humidity,
          _dailyFallback: true,
        }));

        return {
          hourly: pseudoHourly,
          source: "meteostat-daily",
          fromCache: false,
          _isDailyFallback: true,
        };
      }

      console.warn(
        `⚠️ [WeatherDataService] Meteostat returned no data or error: ${result?.error}`,
      );
    } catch (err) {
      console.error(
        `❌ [WeatherDataService] Meteostat daily fallback failed:`,
        err,
      );
    }

    // ALL FALLBACKS FAILED
    console.error(`❌ [WeatherDataService] All hourly history sources failed`);
    return {
      error: "Keine stündlichen historischen Daten verfügbar",
      hourly: [],
      source: "none",
    };
  }

  async loadAirQuality(latitude, longitude) {
    const { default: aqiApi } = await import("./aqi.js");
    try {
      const result = await aqiApi.fetchAirQuality(latitude, longitude);
      return result?.data || null;
    } catch (e) {
      console.warn("[WeatherDataService] loadAirQuality failed", e);
      return null;
    }
  }

  async loadMapLayers(centerLat, centerLon) {
    const { GridFieldsAPI } = await import("./gridFields.js");
    const api = new GridFieldsAPI();

    const [temp, wind, clouds, humidity] = await Promise.all([
      api.fetchTemperature(centerLat, centerLon),
      api.fetchWind(centerLat, centerLon),
      api.fetchCloudCover(centerLat, centerLon),
      api.fetchHumidity(centerLat, centerLon),
    ]);

    return { temp, wind, clouds, humidity };
  }
}

// einfache Singleton-Instanz
export const weatherDataService = new WeatherDataService();
