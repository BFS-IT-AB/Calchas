/* OpenWeatherMap API Integration
 * 
 * API Documentation: https://openweathermap.org/api
 * Requires free API key from https://openweathermap.org/api
 * 
 * Response structure:
 * - current: Current weather conditions
 * - hourly: Hourly forecast (next 48 hours in free tier)
 * - daily: Daily forecast (next 8 days in free tier)
 */

class OpenWeatherMapAPI {
  constructor() {
    this.baseUrl = 'https://api.openweathermap.org/data/2.5/onecall';
    this.timeout = 5000;
    this.name = 'OpenWeatherMap';
  }

  /**
   * Fetches weather data from OpenWeatherMap
   * @param {number} latitude - Latitude coordinate
   * @param {number} longitude - Longitude coordinate
   * @param {string} apiKey - OpenWeatherMap API key
   * @param {string} units - Temperature units ('metric', 'imperial', 'standard')
   * @returns {Promise<object>} - { current, hourly, daily, source: 'openweathermap' } or error object
   */
  async fetchWeather(latitude, longitude, apiKey, units = 'metric') {
    try {
      // Validate API key
      if (!apiKey || typeof apiKey !== 'string' || apiKey.trim().length === 0) {
        console.warn('⚠️ OpenWeatherMap: API key missing or invalid');
        return {
          error: 'OpenWeatherMap API key erforderlich',
          source: 'openweathermap'
        };
      }

      // Validate coordinates
      const coordCheck = validateCoordinates(latitude, longitude);
      if (!coordCheck.valid) {
        throw new Error(coordCheck.error);
      }

      // Build URL with parameters
      const params = new URLSearchParams({
        lat: latitude.toFixed(4),
        lon: longitude.toFixed(4),
        appid: apiKey.trim(),
        units: units,
        exclude: 'minutely' // Exclude minutely data to reduce payload
      });

      const url = `${this.baseUrl}?${params.toString()}`;
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
          const msg = (err && err.message) ? err.message : '';

          // Don't retry on client errors (401, 403, 404, 429)
          const isClientError = /HTTP Fehler 4\d\d|401|403|404|429|API key|Invalid API/.test(msg);
          if (isClientError || isLast) {
            throw err;
          }

          // Exponential backoff for retries
          const waitMs = 200 * Math.pow(2, attempt - 1);
          await new Promise(r => setTimeout(r, waitMs));
          console.warn(`OpenWeatherMap Versuch ${attempt} fehlgeschlagen, erneut in ${waitMs}ms...`);
        }
      }

      const duration = Date.now() - startTime;
      console.log(`✅ OpenWeatherMap erfolgreich (${duration}ms)`);

      // Format response data
      const formatted = this._formatWeatherData(data);

      return {
        current: formatted.current,
        hourly: formatted.hourly,
        daily: formatted.daily,
        fromCache: false,
        duration,
        source: 'openweathermap'
      };
    } catch (error) {
      console.error(`❌ OpenWeatherMap Fehler: ${error.message}`);
      return {
        error: error.message,
        source: 'openweathermap'
      };
    }
  }

  /**
   * Validates OpenWeatherMap API response structure
   * @param {object} data - API response data
   * @returns {object} - {valid: boolean, error: string|null}
   * @private
   */
  _validateResponse(data) {
    if (!data) {
      return { valid: false, error: 'Keine Daten von OpenWeatherMap erhalten' };
    }

    if (data.cod && data.cod !== 200) {
      if (data.message) {
        return { valid: false, error: `OpenWeatherMap: ${data.message}` };
      }
      return { valid: false, error: `OpenWeatherMap Fehler: ${data.cod}` };
    }

    if (!data.current) {
      return { valid: false, error: 'Ungültige OpenWeatherMap Antwort: Keine aktuellen Daten' };
    }

    if (!Array.isArray(data.hourly)) {
      return { valid: false, error: 'Ungültige OpenWeatherMap Antwort: Keine Stundendaten' };
    }

    if (!Array.isArray(data.daily)) {
      return { valid: false, error: 'Ungültige OpenWeatherMap Antwort: Keine Tagesdaten' };
    }

    return { valid: true, error: null };
  }

  /**
   * Formats OpenWeatherMap data to standardized format
   * @param {object} data - Raw API response
   * @returns {object} - Formatted weather data
   * @private
   */
  _formatWeatherData(data) {
    const current = {
      temp: data.current.temp,
      humidity: data.current.humidity,
      wind_speed: data.current.wind_speed,
      pressure: data.current.pressure,
      clouds: data.current.clouds || 0,
      weather_code: this._mapWeatherCode(data.current.weather[0]?.main),
      description: data.current.weather[0]?.description || 'Unbekannt',
      timestamp: data.current.dt * 1000
    };

    const hourly = (data.hourly || []).slice(0, 24).map(hour => ({
      temp: hour.temp,
      precipitation: (hour.pop || 0) * 100, // Probability of precipitation (0-100)
      rain_volume: hour.rain?.['1h'] || 0,
      wind_speed: hour.wind_speed,
      timestamp: hour.dt * 1000,
      weather_code: this._mapWeatherCode(hour.weather[0]?.main)
    }));

    const daily = (data.daily || []).slice(0, 7).map(day => ({
      temp_min: day.temp.min,
      temp_max: day.temp.max,
      precipitation: (day.pop || 0) * 100,
      rain_volume: day.rain || 0,
      wind_speed: day.wind_speed,
      date: new Date(day.dt * 1000).toISOString().split('T')[0],
      weather_code: this._mapWeatherCode(day.weather[0]?.main)
    }));

    return { current, hourly, daily };
  }

  /**
   * Maps OpenWeatherMap weather conditions to standardized codes
   * OWM uses descriptions like 'Clear', 'Clouds', 'Rain', 'Snow', etc.
   * Returns WMO-like codes for consistent emoji/description mapping
   * @param {string} owmDescription - OpenWeatherMap weather description
   * @returns {number} - Mapped weather code
   * @private
   */
  _mapWeatherCode(owmDescription) {
    if (!owmDescription) return 3; // Default to cloudy

    const desc = owmDescription.toLowerCase();

    if (desc === 'clear') return 0;
    if (desc === 'clouds') return 3;
    if (desc === 'drizzle') return 51;
    if (desc === 'rain') return 61;
    if (desc === 'thunderstorm') return 95;
    if (desc === 'snow') return 71;
    if (desc === 'mist' || desc === 'smoke' || desc === 'haze' || 
        desc === 'dust' || desc === 'fog' || desc === 'sand' || desc === 'ash') {
      return 45; // Foggy
    }
    if (desc === 'tornado') return 95;

    return 3; // Default fallback
  }

  /**
   * Formats data for display purposes
   * @param {object} data - Formatted weather data
   * @param {number} limit - Number of entries to return
   * @returns {object} - Display-ready data
   */
  formatForDisplay(data, limit = 24) {
    if (!data || data.error) return null;

    return {
      current: {
        temp: `${data.current.temp.toFixed(1)}°`,
        humidity: `${data.current.humidity}%`,
        wind: `${data.current.wind_speed.toFixed(1)} m/s`,
        pressure: `${data.current.pressure} hPa`,
        description: data.current.description
      },
      hourly: data.hourly.slice(0, limit).map(h => ({
        time: new Date(h.timestamp).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }),
        temp: `${h.temp.toFixed(1)}°`,
        wind: `${h.wind_speed.toFixed(1)} m/s`,
        precipitation: `${h.precipitation.toFixed(0)}%`,
        code: h.weather_code
      })),
      daily: data.daily.map(d => ({
        date: new Date(d.date).toLocaleDateString('de-DE'),
        temp_min: `${d.temp_min.toFixed(1)}°`,
        temp_max: `${d.temp_max.toFixed(1)}°`,
        precipitation: `${d.precipitation.toFixed(0)}%`,
        code: d.weather_code
      }))
    };
  }
}

// Export the class
if (typeof module !== 'undefined' && module.exports) {
  module.exports = OpenWeatherMapAPI;
}
