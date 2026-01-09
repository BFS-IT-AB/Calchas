/* open-meteo.com API Integration */

// Live-Seite: `OpenMeteoAPI` ist die primäre Quellenintegration für
// Vorhersagen und aktuelle Messwerte (stündliche/tägliche Serien). Die
// UI-Komponenten (Hero, Forecast-Listen) beziehen hier ihre Daten her.

class OpenMeteoAPI {
  constructor() {
    this.baseUrl = API_ENDPOINTS.OPEN_METEO.BASE;
    this.timeout = API_ENDPOINTS.OPEN_METEO.TIMEOUT;
    this.name = "Open-Meteo";
  }

  /**
   * Holt Wetter-Daten für Koordinaten
   * @param {number} latitude - Breitengrad
   * @param {number} longitude - Längengrad
   * @returns {Promise<object>} - Wetterdaten
   */
  async fetchWeather(latitude, longitude) {
    try {
      // Validiere Koordinaten
      const coordCheck = validateCoordinates(latitude, longitude);
      if (!coordCheck.valid) {
        throw new Error(coordCheck.error);
      }

      // Prüfe Cache
      const cacheKey = `openmeteo_${latitude}_${longitude}`;
      const cached = weatherCache.getForecast(
        `${latitude}_${longitude}`,
        "openmeteo"
      );
      if (cached) {
        console.log("✅ Open-Meteo Cache Hit");
        return { data: cached, fromCache: true };
      }

      // Baue URL mit Parametern
      const params = new URLSearchParams({
        latitude: latitude.toFixed(4),
        longitude: longitude.toFixed(4),
        hourly: API_ENDPOINTS.OPEN_METEO.PARAMS.hourly,
        daily: API_ENDPOINTS.OPEN_METEO.PARAMS.daily,
        timezone: API_ENDPOINTS.OPEN_METEO.PARAMS.timezone,
        forecast_days: API_ENDPOINTS.OPEN_METEO.PARAMS.forecast_days,
      });

      const url = `${this.baseUrl}?${params.toString()}`;
      const startTime = Date.now();

      // Fetch mit Timeout + einfachem Retry für transient errors
      const maxAttempts = 3;
      let attempt = 0;
      let response = null;
      let data = null;
      while (attempt < maxAttempts) {
        try {
          response = await safeApiFetch(url, {}, this.timeout);
          data = await response.json();
          // Validiere Response
          const validation = validateApiResponse(data, "openmeteo");
          if (!validation.valid) {
            throw new Error(validation.error);
          }
          // Erfolg, breche die Retry-Schleife ab
          break;
        } catch (err) {
          attempt += 1;
          const isLast = attempt >= maxAttempts;
          // Wenn HTTP 4xx (client error) oder andere nicht-transiente Fehler, don't retry
          const msg = err && err.message ? err.message : "";
          const isClientError = /HTTP Fehler 4\d\d|404|400|429/.test(msg);
          if (isClientError || isLast) {
            throw err;
          }
          // Warte etwas (exponential backoff)
          const waitMs = 200 * Math.pow(2, attempt - 1);
          await new Promise((r) => setTimeout(r, waitMs));
          console.warn(
            `Open-Meteo Versuch ${attempt} fehlgeschlagen, erneut in ${waitMs}ms...`
          );
        }
      }

      const duration = Date.now() - startTime;
      console.log(`✅ Open-Meteo erfolgreich (${duration}ms)`);

      // Speichere im Cache
      weatherCache.setForecast(`${latitude}_${longitude}`, "openmeteo", data);

      return {
        data,
        fromCache: false,
        duration,
        source: "open-meteo",
      };
    } catch (error) {
      console.error(`❌ Open-Meteo Fehler: ${error.message}`);
      return {
        error: error.message,
        source: "open-meteo",
      };
    }
  }

  /**
   * Formatiert Stunden-Daten für Anzeige
   * @param {object} data - Open-Meteo Rohdaten
   * @param {number} hours - Anzahl der Stunden (default: 24)
   * @returns {array} - Formatierte Stunden-Daten
   */
  formatHourlyData(data, hours = 24) {
    if (!data || !data.hourly) return [];

    const times = data.hourly.time.slice(0, hours);
    const temps = data.hourly.temperature_2m.slice(0, hours);
    const codes = data.hourly.weathercode?.slice(0, hours) || [];
    const windspeed = data.hourly.windspeed_10m?.slice(0, hours) || [];
    const windgusts = data.hourly.windgusts_10m?.slice(0, hours) || [];
    const humidity = data.hourly.relativehumidity_2m?.slice(0, hours) || [];
    const windDir = data.hourly.winddirection_10m?.slice(0, hours) || [];
    const dewpoint = data.hourly.dewpoint_2m?.slice(0, hours) || [];
    const apparent = data.hourly.apparent_temperature?.slice(0, hours) || [];
    const precipitation = data.hourly.precipitation?.slice(0, hours) || [];
    const precipitationProb =
      data.hourly.precipitation_probability?.slice(0, hours) || [];
    const uvIndex = data.hourly.uv_index?.slice(0, hours) || [];
    const uvClear = data.hourly.uv_index_clear_sky?.slice(0, hours) || [];
    const pressure = data.hourly.pressure_msl?.slice(0, hours) || [];
    const surfacePressure = data.hourly.surface_pressure?.slice(0, hours) || [];
    const cloudCover = data.hourly.cloudcover?.slice(0, hours) || [];
    const visibility = data.hourly.visibility?.slice(0, hours) || [];
    const isDay = data.hourly.is_day?.slice(0, hours) || [];

    return times.map((time, i) => ({
      time,
      temperature: temps[i],
      weatherCode: codes[i],
      weathercode: codes[i],
      windSpeed: windspeed[i],
      windGust: windgusts[i],
      humidity: humidity[i],
      windDirection: windDir[i],
      dewPoint: dewpoint[i],
      apparentTemperature: apparent[i],
      feelsLike: apparent[i],
      precipitation: precipitation[i],
      precipitationProbability: precipitationProb[i],
      precipProb: precipitationProb[i],
      uvIndex: uvIndex[i],
      uvIndexClearSky: uvClear[i],
      pressure: pressure[i],
      surfacePressure: surfacePressure[i],
      cloudCover: cloudCover[i],
      visibility: visibility[i] ? visibility[i] / 1000 : null, // Von Meter zu KM
      isDay: isDay[i],
      emoji: this._getWeatherEmoji(codes[i]),
      iconHtml: this._getWeatherEmoji(codes[i]),
    }));
  }

  /**
   * Formatiert Tages-Daten für Vorhersage
   * @param {object} data - Open-Meteo Rohdaten
   * @param {number} days - Anzahl der Tage (default: 7)
   * @returns {array} - Formatierte Tages-Daten
   */
  formatDailyData(data, days = 7) {
    if (!data || !data.daily) return [];

    const dates = data.daily.time.slice(0, days);
    const codes = data.daily.weathercode.slice(0, days);
    const tempMax = data.daily.temperature_2m_max.slice(0, days);
    const tempMin = data.daily.temperature_2m_min.slice(0, days);
    const sunrise = data.daily.sunrise?.slice(0, days) || [];
    const sunset = data.daily.sunset?.slice(0, days) || [];
    const uvMax = data.daily.uv_index_max?.slice(0, days) || [];
    const uvClearMax = data.daily.uv_index_clear_sky_max?.slice(0, days) || [];
    const precipitationSum = data.daily.precipitation_sum?.slice(0, days) || [];
    const precipitationHours =
      data.daily.precipitation_hours?.slice(0, days) || [];
    const precipProbMax =
      data.daily.precipitation_probability_max?.slice(0, days) || [];
    const windSpeedMax = data.daily.windspeed_10m_max?.slice(0, days) || [];

    return dates.map((date, i) => ({
      date,
      weatherCode: codes[i],
      tempMax: tempMax[i],
      tempMin: tempMin[i],
      temperatureMax: tempMax[i],
      temperatureMin: tempMin[i],
      sunrise: sunrise[i],
      sunset: sunset[i],
      sunriseTs: sunrise[i] ? new Date(sunrise[i]).getTime() : null,
      sunsetTs: sunset[i] ? new Date(sunset[i]).getTime() : null,
      uvIndexMax: uvMax[i],
      uvIndexClearSkyMax: uvClearMax[i],
      precipitationSum: precipitationSum[i],
      precipitationHours: precipitationHours[i],
      precipProbMax: precipProbMax[i] || 0,
      precipitationProbabilityMax: precipProbMax[i] || 0,
      windSpeedMax: windSpeedMax[i],
      emoji: this._getWeatherEmoji(codes[i]),
      iconHtml: this._getWeatherEmoji(codes[i]),
    }));
  }

  /**
   * Map WMO Code zu Emoji
   * @private
   */
  _getWeatherEmoji(code) {
    const weatherInfo = WEATHER_CODES[code];
    return weatherInfo ? weatherInfo.emoji : "❓";
  }

  /**
   * Gibt Zeitzone aus API-Daten
   */
  getTimezone(data) {
    return data?.timezone || "Europe/Berlin";
  }
}

/**
 * Singleton-Instanz
 */
const openMeteoAPI = new OpenMeteoAPI();
