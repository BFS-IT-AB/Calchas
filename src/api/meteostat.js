/* Meteostat API Integration
 *
 * API Documentation: https://meteostat.net/
 * Optional API key from https://meteostat.net/ (basic free tier available)
 *
 * Response structure:
 * - daily: Historical weather data with min/max temps, precipitation, wind speed
 *
 * Note: Meteostat is designed for historical weather data, not forecasts.
 * Can be used to retrieve weather patterns and trends.
 */

class MeteostatAPI {
  constructor() {
    this.baseUrl = "https://api.meteostat.net/v2/daily";
    this.timeout = 5000;
    this.name = "Meteostat";
  }

  /**
   * Fetches historical weather data from Meteostat
   * @param {number} latitude - Latitude coordinate
   * @param {number} longitude - Longitude coordinate
   * @param {string} startDate - Start date (YYYY-MM-DD format)
   * @param {string} endDate - End date (YYYY-MM-DD format)
   * @param {string|null} apiKey - Optional Meteostat API key
   * @returns {Promise<object>} - { daily: [...], source: 'meteostat' } or error object
   */
  async fetchHistorical(
    latitude,
    longitude,
    startDate,
    endDate,
    apiKey = null
  ) {
    try {
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

      // Build request body - Meteostat uses POST with JSON
      const requestBody = {
        start: startDate,
        end: endDate,
        lon: longitude,
        lat: latitude,
        unit: "metric",
      };

      // Build headers
      const headers = {
        "Content-Type": "application/json",
        "User-Agent": "Calchas/1.0",
      };

      // Add API key if provided
      if (apiKey && typeof apiKey === "string" && apiKey.trim().length > 0) {
        headers["API-Key"] = apiKey.trim();
      }

      const url = this.baseUrl;
      const startTime = Date.now();

      // Fetch with retry logic for transient errors
      const maxAttempts = 3;
      let attempt = 0;
      let response = null;
      let data = null;

      while (attempt < maxAttempts) {
        try {
          response = await safeApiFetch(
            url,
            {
              method: "POST",
              headers: headers,
              body: JSON.stringify(requestBody),
            },
            this.timeout
          );

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
            /HTTP Fehler 4\d\d|401|403|404|429|API key|Invalid/.test(msg);
          if (isClientError || isLast) {
            throw err;
          }

          // Exponential backoff for retries
          const waitMs = 200 * Math.pow(2, attempt - 1);
          await new Promise((r) => setTimeout(r, waitMs));
          console.warn(
            `Meteostat Versuch ${attempt} fehlgeschlagen, erneut in ${waitMs}ms...`
          );
        }
      }

      const duration = Date.now() - startTime;
      console.log(`✅ Meteostat erfolgreich (${duration}ms)`);

      // Format response data
      const formatted = this._formatHistoricalData(data);

      return {
        daily: formatted.daily,
        fromCache: false,
        duration,
        source: "meteostat",
      };
    } catch (error) {
      console.error(`❌ Meteostat Fehler: ${error.message}`);
      return {
        error: error.message,
        source: "meteostat",
      };
    }
  }

  /**
   * Validates date parameters
   * @param {string} startDate - Start date (YYYY-MM-DD)
   * @param {string} endDate - End date (YYYY-MM-DD)
   * @returns {object} - {valid: boolean, error: string|null}
   * @private
   */
  _validateDates(startDate, endDate) {
    if (!startDate || typeof startDate !== "string") {
      return {
        valid: false,
        error: "Startdatum erforderlich (Format: YYYY-MM-DD)",
      };
    }

    if (!endDate || typeof endDate !== "string") {
      return {
        valid: false,
        error: "Enddatum erforderlich (Format: YYYY-MM-DD)",
      };
    }

    // Basic format validation
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
      return {
        valid: false,
        error: "Ungültiges Datumformat (erwartet: YYYY-MM-DD)",
      };
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return { valid: false, error: "Ungültige Datumswerte" };
    }

    if (start > end) {
      return { valid: false, error: "Startdatum muss vor Enddatum liegen" };
    }

    // Check that date range is not more than 1 year for free tier
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays > 365) {
      return {
        valid: false,
        error: "Zeitraum darf 365 Tage nicht überschreiten",
      };
    }

    return { valid: true, error: null };
  }

  /**
   * Validates Meteostat API response structure
   * @param {object} data - API response data
   * @returns {object} - {valid: boolean, error: string|null}
   * @private
   */
  _validateResponse(data) {
    if (!data) {
      return { valid: false, error: "Keine Daten von Meteostat erhalten" };
    }

    if (data.error) {
      return { valid: false, error: `Meteostat: ${data.error}` };
    }

    if (!Array.isArray(data.data)) {
      return {
        valid: false,
        error: "Ungültige Meteostat Antwort: Keine Datenarray",
      };
    }

    if (data.data.length === 0) {
      return {
        valid: false,
        error: "Meteostat: Keine Daten für den angegebenen Zeitraum",
      };
    }

    return { valid: true, error: null };
  }

  /**
   * Formats Meteostat data to standardized format
   * @param {object} data - Raw API response
   * @returns {object} - Formatted weather data
   * @private
   */
  _formatHistoricalData(data) {
    const daily = (data.data || []).map((day) => {
      // Meteostat returns temperature in Celsius by default
      // Precipitation is in mm, wind speed in km/h (convert to m/s)
      return {
        date: day.date || "",
        temp_min: day.tmin !== null ? day.tmin : null,
        temp_max: day.tmax !== null ? day.tmax : null,
        temp_avg: day.tavg !== null ? day.tavg : null,
        precipitation: day.prcp !== null ? day.prcp : 0, // mm
        wind_speed: day.wspd !== null ? day.wspd / 3.6 : null, // Convert km/h to m/s
        wind_direction: day.wdir !== null ? day.wdir : null, // Degrees
        pressure: day.pres !== null ? day.pres : null, // hPa
        weather_code: this._mapPrecipitationToCode(day.prcp), // Inferred from precipitation
      };
    });

    return { daily };
  }

  /**
   * Maps precipitation data to weather codes
   * Since Meteostat provides historical data, we infer weather codes from precipitation
   * @param {number} precipitation - Precipitation in mm
   * @returns {number} - Inferred weather code
   * @private
   */
  _mapPrecipitationToCode(precipitation) {
    if (
      precipitation === null ||
      precipitation === undefined ||
      precipitation === 0
    ) {
      return 0; // Clear
    }

    if (precipitation < 2) {
      return 61; // Light rain
    } else if (precipitation < 5) {
      return 63; // Moderate rain
    } else {
      return 65; // Heavy rain
    }
  }

  /**
   * Formats data for display purposes
   * @param {object} data - Formatted weather data
   * @returns {object} - Display-ready data
   */
  formatForDisplay(data) {
    if (!data || data.error) return null;

    return {
      daily: data.daily.map((d) => ({
        date: d.date,
        temp_min: d.temp_min !== null ? `${d.temp_min.toFixed(1)}°` : "N/A",
        temp_max: d.temp_max !== null ? `${d.temp_max.toFixed(1)}°` : "N/A",
        temp_avg: d.temp_avg !== null ? `${d.temp_avg.toFixed(1)}°` : "N/A",
        precipitation:
          d.precipitation !== null ? `${d.precipitation.toFixed(1)} mm` : "N/A",
        wind_speed:
          d.wind_speed !== null ? `${d.wind_speed.toFixed(1)} m/s` : "N/A",
        pressure: d.pressure !== null ? `${d.pressure.toFixed(0)} hPa` : "N/A",
        code: d.weather_code,
      })),
    };
  }
}

// Export the class
if (typeof module !== "undefined" && module.exports) {
  module.exports = MeteostatAPI;
}
