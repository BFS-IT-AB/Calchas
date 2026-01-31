/* Visual Crossing API Integration
 *
 * API Documentation: https://www.visualcrossing.com/weather-api
 * Requires API key from https://www.visualcrossing.com/weather-api (free trial available)
 *
 * Response structure:
 * - current: Current weather conditions
 * - historical: Last 7-30 days of historical data
 * - forecast: Next 7 days forecast
 */

class VisualCrossingAPI {
  constructor() {
    this.baseUrl =
      "https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services/timeline";
    this.timeout = 5000;
    this.name = "Visual Crossing";
  }

  /**
   * Fetches weather data from Visual Crossing
   * @param {number} latitude - Latitude coordinate
   * @param {number} longitude - Longitude coordinate
   * @param {string} apiKey - Visual Crossing API key (required)
   * @param {string} units - Temperature units ('metric', 'us')
   * @returns {Promise<object>} - { current, historical, forecast, source: 'visualcrossing' } or error object
   */
  async fetchWeather(latitude, longitude, apiKey, units = "metric") {
    try {
      // Validate API key
      if (!apiKey || typeof apiKey !== "string" || apiKey.trim().length === 0) {
        console.warn("⚠️ Visual Crossing: API key missing or invalid");
        return {
          error: "Visual Crossing API key erforderlich",
          source: "visualcrossing",
        };
      }

      // Validate coordinates
      const coordCheck = validateCoordinates(latitude, longitude);
      if (!coordCheck.valid) {
        throw new Error(coordCheck.error);
      }

      // Validate units parameter
      if (!["metric", "us"].includes(units)) {
        units = "metric";
      }

      // Build URL - Visual Crossing uses location in path
      const location = `${latitude.toFixed(4)},${longitude.toFixed(4)}`;
      const params = new URLSearchParams({
        unitGroup: units === "metric" ? "metric" : "us",
        include: "current,days,alerts",
        contentType: "json",
        key: apiKey.trim(),
      });

      const url = `${this.baseUrl}/${location}?${params.toString()}`;
      const startTime = Date.now();

      // Fetch with retry logic for transient errors
      const maxAttempts = 3;
      let attempt = 0;
      let response = null;
      let data = null;

      while (attempt < maxAttempts) {
        try {
          response = await safeApiFetch(url, {}, this.timeout);
          data = await response.json();

          // Validate response structure
          const validation = this._validateResponse(data);
          if (!validation.valid) {
            throw new Error(validation.error);
          }

          break; // Success
        } catch (err) {
          attempt += 1;
          const isLast = attempt >= maxAttempts;
          const msg = err && err.message ? err.message : "";

          // Don't retry on client errors (401, 403, 404, 429)
          const isClientError =
            /HTTP Fehler 4\d\d|401|403|404|429|API key|Invalid API|unauthorized/.test(
              msg,
            );
          if (isClientError || isLast) {
            throw err;
          }

          // Exponential backoff for retries
          const waitMs = 200 * Math.pow(2, attempt - 1);
          await new Promise((r) => setTimeout(r, waitMs));
          console.warn(
            `Visual Crossing Versuch ${attempt} fehlgeschlagen, erneut in ${waitMs}ms...`,
          );
        }
      }

      const duration = Date.now() - startTime;
      console.log(`✅ Visual Crossing erfolgreich (${duration}ms)`);

      // Format response data
      const formatted = this._formatWeatherData(data);

      return {
        current: formatted.current,
        historical: formatted.historical,
        forecast: formatted.forecast,
        fromCache: false,
        duration,
        source: "visualcrossing",
      };
    } catch (error) {
      console.error(`❌ Visual Crossing Fehler: ${error.message}`);
      return {
        error: error.message,
        source: "visualcrossing",
      };
    }
  }

  /**
   * Fetches hourly historical weather data from Visual Crossing
   * @param {number} latitude - Latitude coordinate
   * @param {number} longitude - Longitude coordinate
   * @param {string} startDate - Start date (YYYY-MM-DD format)
   * @param {string} endDate - End date (YYYY-MM-DD format)
   * @param {string} apiKey - Visual Crossing API key (required)
   * @param {string} units - Temperature units ('metric', 'us')
   * @returns {Promise<object>} - { hourly: [...], source: 'visualcrossing' } or error object
   */
  async fetchHourlyHistorical(
    latitude,
    longitude,
    startDate,
    endDate,
    apiKey,
    units = "metric",
  ) {
    try {
      // Validate API key
      if (!apiKey || typeof apiKey !== "string" || apiKey.trim().length === 0) {
        console.warn("⚠️ Visual Crossing: API key missing or invalid");
        return {
          error: "Visual Crossing API key erforderlich",
          source: "visualcrossing",
        };
      }

      // Validate coordinates
      const coordCheck = validateCoordinates(latitude, longitude);
      if (!coordCheck.valid) {
        throw new Error(coordCheck.error);
      }

      // Validate dates
      const dateCheck = this._validateDates(startDate, endDate);
      if (!dateCheck.valid) {
        throw new Error(dateCheck.error);
      }

      // Validate units parameter
      if (!["metric", "us"].includes(units)) {
        units = "metric";
      }

      // Build URL - Visual Crossing format: location/startDate/endDate
      const location = `${latitude.toFixed(4)},${longitude.toFixed(4)}`;
      const dateRange = `${startDate}/${endDate}`;
      const params = new URLSearchParams({
        unitGroup: units === "metric" ? "metric" : "us",
        include: "hours",
        contentType: "json",
        key: apiKey.trim(),
      });

      const url = `${this.baseUrl}/${location}/${dateRange}?${params.toString()}`;
      const startTime = Date.now();

      console.log(
        `🌐 Visual Crossing Historical: ${startDate} bis ${endDate} (hourly)`,
      );

      // Fetch with retry logic
      const maxAttempts = 3;
      let attempt = 0;
      let response = null;
      let data = null;

      while (attempt < maxAttempts) {
        try {
          response = await safeApiFetch(url, {}, this.timeout);
          data = await response.json();

          // Validate response structure
          const validation = this._validateHistoricalResponse(data);
          if (!validation.valid) {
            throw new Error(validation.error);
          }

          break; // Success
        } catch (err) {
          attempt += 1;
          const isLast = attempt >= maxAttempts;
          const msg = err && err.message ? err.message : "";

          // Don't retry on client errors (401, 403, 404, 429)
          const isClientError =
            /HTTP Fehler 4\d\d|401|403|404|429|API key|Invalid API|unauthorized/.test(
              msg,
            );
          if (isClientError || isLast) {
            throw err;
          }

          // Exponential backoff for retries
          const waitMs = 200 * Math.pow(2, attempt - 1);
          await new Promise((r) => setTimeout(r, waitMs));
          console.warn(
            `Visual Crossing Historical Versuch ${attempt} fehlgeschlagen, erneut in ${waitMs}ms...`,
          );
        }
      }

      const duration = Date.now() - startTime;
      console.log(`✅ Visual Crossing Historical erfolgreich (${duration}ms)`);

      // Format hourly data
      const formatted = this._formatHourlyHistoricalData(data);

      return {
        hourly: formatted.hourly,
        fromCache: false,
        duration,
        source: "visualcrossing",
      };
    } catch (error) {
      console.error(`❌ Visual Crossing Historical Fehler: ${error.message}`);
      return {
        error: error.message,
        source: "visualcrossing",
      };
    }
  }

  /**
   * Validates date parameters for historical queries
   * @param {string} startDate - Start date (YYYY-MM-DD)
   * @param {string} endDate - End date (YYYY-MM-DD)
   * @returns {object} - {valid: boolean, error: string|null}
   * @private
   */
  _validateDates(startDate, endDate) {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

    if (!startDate || !dateRegex.test(startDate)) {
      return {
        valid: false,
        error: "Ungültiges Start-Datum (Format: YYYY-MM-DD)",
      };
    }

    if (!endDate || !dateRegex.test(endDate)) {
      return {
        valid: false,
        error: "Ungültiges End-Datum (Format: YYYY-MM-DD)",
      };
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    const maxDate = new Date();

    if (end > maxDate) {
      return {
        valid: false,
        error: "End-Datum darf nicht in der Zukunft liegen",
      };
    }

    if (start > end) {
      return {
        valid: false,
        error: "Start-Datum muss vor End-Datum liegen",
      };
    }

    return {
      valid: true,
      error: null,
    };
  }

  /**
   * Validates Visual Crossing historical response
   * @param {object} data - API response data
   * @returns {object} - {valid: boolean, error: string|null}
   * @private
   */
  _validateHistoricalResponse(data) {
    if (!data) {
      return {
        valid: false,
        error: "Keine Daten von Visual Crossing erhalten",
      };
    }

    if (data.errorCode) {
      const errorMsg = data.message || `Error code: ${data.errorCode}`;
      return { valid: false, error: `Visual Crossing: ${errorMsg}` };
    }

    if (!Array.isArray(data.days)) {
      return {
        valid: false,
        error: "Ungültige Visual Crossing Antwort: Keine Tagesdaten",
      };
    }

    return { valid: true, error: null };
  }

  /**
   * Formats Visual Crossing hourly historical data to standardized structure
   * @param {object} data - Raw API response
   * @returns {object} - {hourly: [...]}
   * @private
   */
  _formatHourlyHistoricalData(data) {
    const hourly = [];

    if (!data.days || !Array.isArray(data.days)) {
      return { hourly };
    }

    // Process each day's hourly data
    data.days.forEach((day) => {
      if (!day.hours || !Array.isArray(day.hours)) {
        return;
      }

      day.hours.forEach((hour) => {
        const timestamp = `${day.datetime}T${hour.datetime}`;

        hourly.push({
          timestamp,
          date: day.datetime,
          hour: parseInt(hour.datetime.split(":")[0], 10),
          temp:
            hour.temp !== null && hour.temp !== undefined ? hour.temp : null,
          temp_avg:
            hour.temp !== null && hour.temp !== undefined ? hour.temp : null,
          precip:
            hour.precip !== null && hour.precip !== undefined ? hour.precip : 0,
          wind_speed:
            hour.windspeed !== null && hour.windspeed !== undefined
              ? hour.windspeed
              : null,
          wind_direction:
            hour.winddir !== null && hour.winddir !== undefined
              ? hour.winddir
              : null,
          humidity:
            hour.humidity !== null && hour.humidity !== undefined
              ? hour.humidity
              : null,
          pressure:
            hour.pressure !== null && hour.pressure !== undefined
              ? hour.pressure
              : null,
          cloudcover:
            hour.cloudcover !== null && hour.cloudcover !== undefined
              ? hour.cloudcover
              : null,
          weather_code: this._mapWeatherCondition(hour.conditions),
          description: hour.conditions || "Unbekannt",
        });
      });
    });

    return { hourly };
  }

  /**
   * Validates Visual Crossing API response structure
   * @param {object} data - API response data
   * @returns {object} - {valid: boolean, error: string|null}
   * @private
   */
  _validateResponse(data) {
    if (!data) {
      return {
        valid: false,
        error: "Keine Daten von Visual Crossing erhalten",
      };
    }

    if (data.errorCode) {
      const errorMsg = data.message || `Error code: ${data.errorCode}`;
      return { valid: false, error: `Visual Crossing: ${errorMsg}` };
    }

    if (!data.currentConditions) {
      return {
        valid: false,
        error: "Ungültige Visual Crossing Antwort: Keine aktuellen Bedingungen",
      };
    }

    if (!Array.isArray(data.days)) {
      return {
        valid: false,
        error: "Ungültige Visual Crossing Antwort: Keine Tagesdaten",
      };
    }

    return { valid: true, error: null };
  }

  /**
   * Formats Visual Crossing data to standardized format
   * @param {object} data - Raw API response
   * @returns {object} - Formatted weather data
   * @private
   */
  _formatWeatherData(data) {
    const unitGroup = data.resolvedUnit || "metric";

    // Parse current conditions
    const current = {
      temp: data.currentConditions.temp,
      humidity: data.currentConditions.humidity,
      wind_speed: data.currentConditions.windspeed,
      pressure: data.currentConditions.pressure,
      clouds: data.currentConditions.cloudcover || 0,
      weather_code: this._mapWeatherCondition(
        data.currentConditions.conditions,
      ),
      description: data.currentConditions.conditions || "Unbekannt",
      timestamp: data.currentConditions.datetimeEpoch * 1000,
    };

    // Parse historical data (last 7 days)
    const today = new Date();
    const historical = data.days
      .filter((day, index) => {
        // Include today and past 6 days (indices 0-6)
        const dayDate = new Date(day.datetime);
        const dayCount = Math.floor((today - dayDate) / (1000 * 60 * 60 * 24));
        return dayCount >= 0 && dayCount <= 6;
      })
      .reverse() // Show oldest first
      .map((day) => ({
        date: day.datetime,
        temp_min: day.tempmin,
        temp_max: day.tempmax,
        temp_avg: day.temp,
        precipitation: day.precip || 0,
        wind_speed: day.windspeed,
        weather_code: this._mapWeatherCondition(day.conditions),
        description: day.conditions || "Unbekannt",
      }));

    // Parse forecast data (next 7 days)
    const forecast = (data.days || []).slice(1, 8).map((day) => ({
      date: day.datetime,
      temp_min: day.tempmin,
      temp_max: day.tempmax,
      temp_avg: day.temp,
      precipitation: day.precip || 0,
      wind_speed: day.windspeed,
      weather_code: this._mapWeatherCondition(day.conditions),
      description: day.conditions || "Unbekannt",
    }));

    return { current, historical, forecast };
  }

  /**
   * Maps Visual Crossing weather conditions to standardized codes
   * Visual Crossing returns text descriptions like 'Clear', 'Partly cloudy', 'Rain', etc.
   * @param {string} conditions - Visual Crossing weather conditions string
   * @returns {number} - Mapped weather code (WMO-like)
   * @private
   */
  _mapWeatherCondition(conditions) {
    if (!conditions) return 3; // Default to cloudy

    const cond = conditions.toLowerCase();

    // Clear conditions
    if (cond.includes("clear") || cond.includes("sunny")) return 0;

    // Partly cloudy
    if (cond.includes("partly cloudy") || cond.includes("mostly clear"))
      return 2;

    // Cloudy
    if (cond.includes("cloudy") || cond.includes("overcast")) return 3;

    // Drizzle/Light rain
    if (cond.includes("drizzle") || cond.includes("light rain")) return 51;

    // Rain
    if (cond.includes("rain")) return 63;

    // Heavy rain
    if (cond.includes("heavy rain") || cond.includes("intense rain")) return 65;

    // Snow
    if (cond.includes("snow")) return 71;

    // Thunderstorm/Severe
    if (
      cond.includes("thunderstorm") ||
      cond.includes("severe") ||
      cond.includes("tornado")
    )
      return 95;

    // Fog/Mist
    if (cond.includes("fog") || cond.includes("mist")) return 45;

    // Wind
    if (cond.includes("wind")) return 3; // Treat as cloudy

    // Default fallback
    return 3;
  }

  /**
   * Formats data for display purposes
   * @param {object} data - Formatted weather data
   * @returns {object} - Display-ready data
   */
  formatForDisplay(data) {
    if (!data || data.error) return null;

    return {
      current: {
        temp: `${data.current.temp.toFixed(1)}°`,
        humidity: `${data.current.humidity.toFixed(0)}%`,
        wind: `${data.current.wind_speed.toFixed(1)} m/s`,
        pressure: data.current.pressure
          ? `${data.current.pressure.toFixed(0)} hPa`
          : "N/A",
        description: data.current.description,
      },
      historical: data.historical.map((day) => ({
        date: new Date(day.date).toLocaleDateString("de-DE"),
        temp_min: `${day.temp_min.toFixed(1)}°`,
        temp_max: `${day.temp_max.toFixed(1)}°`,
        temp_avg: `${day.temp_avg.toFixed(1)}°`,
        precipitation: `${day.precipitation.toFixed(1)} mm`,
        wind: `${day.wind_speed.toFixed(1)} m/s`,
        code: day.weather_code,
        description: day.description,
      })),
      forecast: data.forecast.map((day) => ({
        date: new Date(day.date).toLocaleDateString("de-DE"),
        temp_min: `${day.temp_min.toFixed(1)}°`,
        temp_max: `${day.temp_max.toFixed(1)}°`,
        precipitation: `${day.precipitation.toFixed(1)} mm`,
        wind: `${day.wind_speed.toFixed(1)} m/s`,
        code: day.weather_code,
        description: day.description,
      })),
    };
  }
}

// Export the class
if (typeof module !== "undefined" && module.exports) {
  module.exports = VisualCrossingAPI;
}
