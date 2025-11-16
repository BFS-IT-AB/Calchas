class SunriseSunsetAPI {
  constructor() {
    this.baseUrl = API_ENDPOINTS.SUNRISE_SUNSET.BASE;
    this.timeout = API_ENDPOINTS.SUNRISE_SUNSET.TIMEOUT;
    this.name = "SunriseSunset";
  }

  async fetchSunEvents(latitude, longitude, apiKey = null) {
    try {
      const coordCheck = validateCoordinates(latitude, longitude);
      if (!coordCheck.valid) {
        throw new Error(coordCheck.error);
      }

      const params = new URLSearchParams({
        lat: Number(latitude).toFixed(4),
        lng: Number(longitude).toFixed(4),
        formatted: 0,
      });
      if (apiKey) {
        params.set("key", apiKey.trim());
      }
      const url = `${this.baseUrl}?${params.toString()}`;
      const start = Date.now();
      const response = await safeApiFetch(url, {}, this.timeout);
      const payload = await response.json();
      if (!payload || payload.status !== "OK") {
        throw new Error(
          payload?.status || payload?.error || "SunriseSunset API Fehler"
        );
      }
      const results = payload.results || {};
      const normalized = this._normalize(results);
      return {
        data: normalized,
        duration: Date.now() - start,
        source: "sunrisesunset",
      };
    } catch (error) {
      console.warn("SunriseSunset", error);
      return {
        error: error.message || String(error),
        source: "sunrisesunset",
      };
    }
  }

  _normalize(results) {
    const dayLengthSeconds = Number(results.day_length) || null;
    return {
      sunrise: results.sunrise,
      sunset: results.sunset,
      solarNoon: results.solar_noon,
      dayLengthSeconds,
      civil: {
        dawn: results.civil_twilight_begin,
        dusk: results.civil_twilight_end,
      },
      nautical: {
        dawn: results.nautical_twilight_begin,
        dusk: results.nautical_twilight_end,
      },
      astronomical: {
        dawn: results.astronomical_twilight_begin,
        dusk: results.astronomical_twilight_end,
      },
    };
  }
}

const sunriseSunsetAPI = new SunriseSunsetAPI();

if (typeof module !== "undefined" && module.exports) {
  module.exports = SunriseSunsetAPI;
}
