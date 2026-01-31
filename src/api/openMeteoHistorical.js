/* Open-Meteo Historical Weather API Integration
 *
 * API Documentation: https://open-meteo.com/en/docs/historical-weather-api
 * NO API KEY REQUIRED - Completely free historical weather data
 *
 * Features:
 * - Hourly weather data from 1940 to present
 * - High-quality ERA5 reanalysis data
 * - Temperature, precipitation, wind, humidity, pressure, cloud cover
 * - Global coverage
 * - No rate limits for non-commercial use
 *
 * Response structure:
 * - hourly: Hourly weather data with timestamps
 * - daily: Optional daily aggregates
 */

class OpenMeteoHistoricalAPI {
  constructor() {
    this.baseUrl = "https://archive-api.open-meteo.com/v1/archive";
    this.timeout = 8000; // Historical queries may take longer
    this.name = "Open-Meteo Historical";
  }

  /**
   * Fetches hourly historical weather data from Open-Meteo
   * @param {number} latitude - Latitude coordinate
   * @param {number} longitude - Longitude coordinate
   * @param {string} startDate - Start date (YYYY-MM-DD format)
   * @param {string} endDate - End date (YYYY-MM-DD format)
   * @param {string[]} hourlyParams - Hourly parameters to fetch (default: temp, precip, wind, humidity)
   * @returns {Promise<object>} - { hourly: [...], source: 'openmeteo-historical' } or error object
   */
  async fetchHourlyHistorical(
    latitude,
    longitude,
    startDate,
    endDate,
    hourlyParams = [
      "temperature_2m",
      "precipitation",
      "windspeed_10m",
      "winddirection_10m",
      "relativehumidity_2m",
      "surface_pressure",
      "cloudcover",
    ],
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

      // Build URL parameters
      const params = new URLSearchParams({
        latitude: latitude.toFixed(4),
        longitude: longitude.toFixed(4),
        start_date: startDate,
        end_date: endDate,
        hourly: hourlyParams.join(","),
        timezone: "auto", // Automatic timezone detection
        temperature_unit: "celsius",
        windspeed_unit: "kmh",
        precipitation_unit: "mm",
      });

      const url = `${this.baseUrl}?${params.toString()}`;
      const startTime = Date.now();

      console.log(
        `🌐 Open-Meteo Historical: ${startDate} bis ${endDate} (hourly)`,
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
          const validation = this._validateResponse(data);
          if (!validation.valid) {
            throw new Error(validation.error);
          }

          break; // Success
        } catch (err) {
          attempt += 1;
          const isLast = attempt >= maxAttempts;
          const msg = err && err.message ? err.message : "";

          // Open-Meteo has no auth errors, but may have rate limits or server errors
          const shouldRetry = !isLast && !/HTTP Fehler 4\d\d/.test(msg);
          if (!shouldRetry) {
            throw err;
          }

          // Exponential backoff for retries
          const waitMs = 300 * Math.pow(2, attempt - 1);
          await new Promise((r) => setTimeout(r, waitMs));
          console.warn(
            `Open-Meteo Historical Versuch ${attempt} fehlgeschlagen, erneut in ${waitMs}ms...`,
          );
        }
      }

      const duration = Date.now() - startTime;
      console.log(`✅ Open-Meteo Historical erfolgreich (${duration}ms)`);

      // Format response data
      const formatted = this._formatHourlyData(data);

      return {
        hourly: formatted.hourly,
        metadata: {
          latitude: data.latitude,
          longitude: data.longitude,
          timezone: data.timezone,
          elevation: data.elevation,
        },
        fromCache: false,
        duration,
        source: "openmeteo-historical",
      };
    } catch (error) {
      console.error(`❌ Open-Meteo Historical Fehler: ${error.message}`);
      return {
        error: error.message,
        source: "openmeteo-historical",
      };
    }
  }

  /**
   * Fetches daily aggregated historical weather data from Open-Meteo
   * @param {number} latitude - Latitude coordinate
   * @param {number} longitude - Longitude coordinate
   * @param {string} startDate - Start date (YYYY-MM-DD format)
   * @param {string} endDate - End date (YYYY-MM-DD format)
   * @returns {Promise<object>} - { daily: [...], source: 'openmeteo-historical' } or error object
   */
  async fetchDailyHistorical(latitude, longitude, startDate, endDate) {
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

      // Build URL parameters for daily data
      const params = new URLSearchParams({
        latitude: latitude.toFixed(4),
        longitude: longitude.toFixed(4),
        start_date: startDate,
        end_date: endDate,
        daily:
          "temperature_2m_max,temperature_2m_min,temperature_2m_mean,precipitation_sum,windspeed_10m_max,sunrise,sunset",
        timezone: "auto",
        temperature_unit: "celsius",
        windspeed_unit: "kmh",
        precipitation_unit: "mm",
      });

      const url = `${this.baseUrl}?${params.toString()}`;
      const startTime = Date.now();

      console.log(
        `🌐 Open-Meteo Historical: ${startDate} bis ${endDate} (daily)`,
      );

      const response = await safeApiFetch(url, {}, this.timeout);
      const data = await response.json();

      const validation = this._validateResponse(data);
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      const duration = Date.now() - startTime;
      console.log(`✅ Open-Meteo Historical daily erfolgreich (${duration}ms)`);

      // Format daily data
      const formatted = this._formatDailyData(data);

      return {
        daily: formatted.daily,
        metadata: {
          latitude: data.latitude,
          longitude: data.longitude,
          timezone: data.timezone,
          elevation: data.elevation,
        },
        fromCache: false,
        duration,
        source: "openmeteo-historical",
      };
    } catch (error) {
      console.error(`❌ Open-Meteo Historical daily Fehler: ${error.message}`);
      return {
        error: error.message,
        source: "openmeteo-historical",
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
    const minDate = new Date("1940-01-01");
    const maxDate = new Date();

    if (start < minDate) {
      return {
        valid: false,
        error: "Start-Datum muss nach 1940-01-01 liegen",
      };
    }

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

    // Check if date range is too large (more than 1 year for hourly data)
    const daysDiff = (end - start) / (1000 * 60 * 60 * 24);
    if (daysDiff > 366) {
      console.warn(
        `⚠️ Open-Meteo Historical: Große Zeitspanne (${daysDiff.toFixed(0)} Tage) - Anfrage kann lange dauern`,
      );
    }

    return {
      valid: true,
      error: null,
    };
  }

  /**
   * Validates API response structure
   * @param {object} data - Response data
   * @returns {object} - {valid: boolean, error: string|null}
   * @private
   */
  _validateResponse(data) {
    if (!data) {
      return {
        valid: false,
        error: "Keine Daten empfangen",
      };
    }

    if (data.error) {
      return {
        valid: false,
        error: `API-Fehler: ${data.reason || data.error}`,
      };
    }

    if (!data.hourly && !data.daily) {
      return {
        valid: false,
        error: "Antwort enthält keine Wetterdaten",
      };
    }

    return {
      valid: true,
      error: null,
    };
  }

  /**
   * Formats hourly API response to standardized structure
   * @param {object} data - Raw API response
   * @returns {object} - {hourly: [...]}
   * @private
   */
  _formatHourlyData(data) {
    const hourly = [];

    if (!data.hourly || !data.hourly.time) {
      return { hourly };
    }

    const times = data.hourly.time;
    const temps = data.hourly.temperature_2m || [];
    const precips = data.hourly.precipitation || [];
    const winds = data.hourly.windspeed_10m || [];
    const windDirs = data.hourly.winddirection_10m || [];
    const humidities = data.hourly.relativehumidity_2m || [];
    const pressures = data.hourly.surface_pressure || [];
    const clouds = data.hourly.cloudcover || [];

    for (let i = 0; i < times.length; i++) {
      const timestamp = times[i];

      hourly.push({
        timestamp,
        date: timestamp.split("T")[0],
        hour: parseInt(timestamp.split("T")[1].split(":")[0], 10),
        temp: temps[i] !== null && temps[i] !== undefined ? temps[i] : null,
        temp_avg: temps[i] !== null && temps[i] !== undefined ? temps[i] : null,
        precip:
          precips[i] !== null && precips[i] !== undefined ? precips[i] : 0,
        wind_speed:
          winds[i] !== null && winds[i] !== undefined ? winds[i] : null,
        wind_direction:
          windDirs[i] !== null && windDirs[i] !== undefined
            ? windDirs[i]
            : null,
        humidity:
          humidities[i] !== null && humidities[i] !== undefined
            ? humidities[i]
            : null,
        pressure:
          pressures[i] !== null && pressures[i] !== undefined
            ? pressures[i]
            : null,
        cloudcover:
          clouds[i] !== null && clouds[i] !== undefined ? clouds[i] : null,
      });
    }

    return { hourly };
  }

  /**
   * Formats daily API response to standardized structure
   * @param {object} data - Raw API response
   * @returns {object} - {daily: [...]}
   * @private
   */
  _formatDailyData(data) {
    const daily = [];

    if (!data.daily || !data.daily.time) {
      return { daily };
    }

    const times = data.daily.time;
    const tempMaxs = data.daily.temperature_2m_max || [];
    const tempMins = data.daily.temperature_2m_min || [];
    const tempMeans = data.daily.temperature_2m_mean || [];
    const precips = data.daily.precipitation_sum || [];
    const windMaxs = data.daily.windspeed_10m_max || [];
    const sunrises = data.daily.sunrise || [];
    const sunsets = data.daily.sunset || [];

    for (let i = 0; i < times.length; i++) {
      daily.push({
        date: times[i],
        temp_max:
          tempMaxs[i] !== null && tempMaxs[i] !== undefined
            ? tempMaxs[i]
            : null,
        temp_min:
          tempMins[i] !== null && tempMins[i] !== undefined
            ? tempMins[i]
            : null,
        temp_avg:
          tempMeans[i] !== null && tempMeans[i] !== undefined
            ? tempMeans[i]
            : null,
        precip:
          precips[i] !== null && precips[i] !== undefined ? precips[i] : 0,
        wind_speed:
          windMaxs[i] !== null && windMaxs[i] !== undefined
            ? windMaxs[i]
            : null,
        sunrise: sunrises[i],
        sunset: sunsets[i],
      });
    }

    return { daily };
  }
}

// Export singleton instance
const openMeteoHistoricalAPI = new OpenMeteoHistoricalAPI();
export default openMeteoHistoricalAPI;
