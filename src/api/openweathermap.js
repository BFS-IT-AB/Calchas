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

// Live-Seite: Dieses Modul liefert Rohdaten von OpenWeatherMap. Es wird
// primär für optionale Overlays (z. B. Temperatur-, Niederschlags- oder
// Wolken-Tiles) und als zusätzlicher Datenprovider für Forecasts verwendet.

class OpenWeatherMapAPI {
  constructor() {
    this.timeout = 5000;
    this.name = "OpenWeatherMap";
    // Verwende standardmäßig Free Tier um 401-Fehler zu vermeiden
    // One Call 3.0/2.5 erfordern ein kostenpflichtiges Abo
    this.useFreeTierFirst = true;
    this.endpoints = [
      {
        version: "3.0",
        url: "https://api.openweathermap.org/data/3.0/onecall",
        label: "One Call 3.0",
      },
      {
        version: "2.5",
        url: "https://api.openweathermap.org/data/2.5/onecall",
        label: "One Call 2.5 (Legacy)",
      },
    ];
    this.freeTierEndpoints = {
      current: "https://api.openweathermap.org/data/2.5/weather",
      forecast: "https://api.openweathermap.org/data/2.5/forecast",
    };
  }

  /**
   * Fetches weather data from OpenWeatherMap
   * @param {number} latitude - Latitude coordinate
   * @param {number} longitude - Longitude coordinate
   * @param {string} apiKey - OpenWeatherMap API key
   * @param {string} units - Temperature units ('metric', 'imperial', 'standard')
   * @returns {Promise<object>} - { current, hourly, daily, source: 'openweathermap' } or error object
   */
  async fetchWeather(latitude, longitude, apiKey, units = "metric") {
    try {
      const keyCheck = this._validateApiKey(apiKey);
      if (!keyCheck.valid) {
        return {
          error: keyCheck.message,
          code: keyCheck.code,
          state: keyCheck.state,
          detail: keyCheck.detail,
          statusMessage: keyCheck.statusMessage,
          source: "openweathermap",
        };
      }
      const sanitizedKey = keyCheck.key;

      // Validate coordinates
      const coordCheck = validateCoordinates(latitude, longitude);
      if (!coordCheck.valid) {
        throw new Error(coordCheck.error);
      }

      // Verwende standardmäßig Free Tier um 401-Fehler bei One Call zu vermeiden
      // One Call 3.0/2.5 erfordern ein kostenpflichtiges Abo
      if (this.useFreeTierFirst) {
        try {
          const result = await this._fetchFreeTierBundle({
            latitude,
            longitude,
            apiKey: sanitizedKey,
            units,
          });
          if (result && !result.error) {
            return result;
          }
        } catch (e) {
          console.info(
            "OpenWeatherMap Free Tier nicht verfügbar, probiere One Call..."
          );
        }
      }

      let lastError = null;

      for (const endpoint of this.endpoints) {
        try {
          const { data, duration } = await this._requestFromEndpoint({
            endpoint,
            latitude,
            longitude,
            apiKey: sanitizedKey,
            units,
          });

          const formatted = this._formatWeatherData(data);
          console.log(
            `✅ OpenWeatherMap ${endpoint.label} erfolgreich (${duration}ms)`
          );

          return {
            data: formatted,
            current: formatted.current,
            hourly: formatted.hourly,
            daily: formatted.daily,
            fromCache: false,
            duration,
            state: "online",
            statusMessage: `Live · ${duration}ms (${endpoint.version})`,
            detail:
              endpoint.version === "2.5"
                ? "Fallback auf One Call 2.5, weil 3.0 nicht freigeschaltet ist"
                : undefined,
            source: "openweathermap",
          };
        } catch (err) {
          lastError = err;
          if (this._shouldFallbackToLegacy(endpoint.version, err)) {
            // Stille Warnung - Fallback wird automatisch versucht
            continue;
          }
          break;
        }
      }

      // Wenn One Call fehlschlägt und wir noch nicht Free Tier probiert haben
      if (
        lastError &&
        !this.useFreeTierFirst &&
        this._shouldUseFreeTierBundle(lastError)
      ) {
        return await this._fetchFreeTierBundle({
          latitude,
          longitude,
          apiKey: sanitizedKey,
          units,
        });
      }

      throw (
        lastError || new Error("OpenWeatherMap konnte nicht geladen werden")
      );
    } catch (error) {
      const classified = this._classifyError(error);
      console.error(`❌ OpenWeatherMap Fehler: ${classified.message}`);
      return {
        error: classified.message,
        code: classified.code,
        state: classified.state,
        detail: classified.detail,
        statusMessage: classified.statusMessage,
        source: "openweathermap",
      };
    }
  }

  async _requestFromEndpoint({ endpoint, latitude, longitude, apiKey, units }) {
    const params = new URLSearchParams({
      lat: latitude.toFixed(4),
      lon: longitude.toFixed(4),
      appid: apiKey,
      units,
      exclude: "minutely",
    });

    const url = `${endpoint.url}?${params.toString()}`;
    const startTime = Date.now();

    const maxAttempts = 3;
    let attempt = 0;

    while (attempt < maxAttempts) {
      try {
        const response = await safeApiFetch(url, {}, this.timeout);
        const data = await response.json();
        const validation = this._validateResponse(data);
        if (!validation.valid) {
          throw new Error(validation.error);
        }
        const duration = Date.now() - startTime;
        return { data, duration };
      } catch (err) {
        attempt += 1;
        const isLast = attempt >= maxAttempts;
        const msg = err && err.message ? err.message : "";
        const isClientError =
          /HTTP Fehler 4\d\d|401|403|404|429|API key|Invalid API|403 Forbidden/.test(
            msg
          );
        if (isClientError || isLast) {
          throw err;
        }
        const waitMs = 200 * Math.pow(2, attempt - 1);
        await new Promise((r) => setTimeout(r, waitMs));
        console.warn(
          `OpenWeatherMap ${endpoint.label} Versuch ${attempt} fehlgeschlagen, erneut in ${waitMs}ms...`
        );
      }
    }
    throw new Error(`OpenWeatherMap ${endpoint.label} fehlgeschlagen`);
  }

  _shouldFallbackToLegacy(version, error) {
    if (version !== "3.0") return false;
    const message = (error?.message || "").toLowerCase();
    if (!message) return false;

    const httpStatusMatch = /401|403/.test(message);
    const invalidKeyHint =
      message.includes("invalid api key") || message.includes("appid");
    const blockedHint = message.includes("blocked");
    const subscriptionHint =
      message.includes("subscription") ||
      message.includes("plan") ||
      message.includes("one call 3") ||
      message.includes("onecall 3") ||
      message.includes("3.0");

    return httpStatusMatch || invalidKeyHint || blockedHint || subscriptionHint;
  }

  _shouldUseFreeTierBundle(error) {
    const message = (error?.message || "").toLowerCase();
    if (!message) return false;
    const authProblem =
      message.includes("401") ||
      message.includes("403") ||
      message.includes("invalid api key") ||
      message.includes("appid") ||
      message.includes("blocked");
    const planHint =
      message.includes("subscription") ||
      message.includes("plan") ||
      message.includes("billing");
    return authProblem || planHint;
  }

  async _fetchFreeTierBundle({ latitude, longitude, apiKey, units }) {
    const params = new URLSearchParams({
      lat: latitude.toFixed(4),
      lon: longitude.toFixed(4),
      appid: apiKey,
      units,
    });

    const currentUrl = `${this.freeTierEndpoints.current}?${params.toString()}`;
    const forecastUrl = `${
      this.freeTierEndpoints.forecast
    }?${params.toString()}`;

    const startTime = Date.now();
    const [currentResp, forecastResp] = await Promise.all([
      safeApiFetch(currentUrl, {}, this.timeout),
      safeApiFetch(forecastUrl, {}, this.timeout),
    ]);

    const [currentData, forecastData] = await Promise.all([
      currentResp.json(),
      forecastResp.json(),
    ]);

    const validation = this._validateFreeTierResponse(
      currentData,
      forecastData
    );
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    const formatted = this._formatFreeTierData(currentData, forecastData);
    const duration = Date.now() - startTime;

    return {
      data: formatted,
      current: formatted.current,
      hourly: formatted.hourly,
      daily: formatted.daily,
      fromCache: false,
      duration,
      state: "online",
      statusMessage: `Free Tier · ${duration}ms`,
      detail:
        "OpenWeatherMap Free Tier (Current + 5-Tage/3h Prognose) – One Call nicht verfügbar",
      source: "openweathermap",
    };
  }

  _validateFreeTierResponse(current, forecast) {
    if (!current || !current.main || !current.weather) {
      return {
        valid: false,
        error: "OpenWeatherMap (Free Tier): Ungültige Current Weather Antwort",
      };
    }
    if (!forecast || !Array.isArray(forecast.list) || !forecast.list.length) {
      return {
        valid: false,
        error: "OpenWeatherMap (Free Tier): Ungültige Forecast Antwort",
      };
    }
    return { valid: true, error: null };
  }

  _formatFreeTierData(currentData, forecastData) {
    const current = {
      temp: currentData.main.temp,
      humidity: currentData.main.humidity,
      wind_speed: currentData.wind?.speed ?? 0,
      pressure: currentData.main.pressure,
      clouds: currentData.clouds?.all ?? 0,
      weather_code: this._mapWeatherCode(currentData.weather?.[0]?.main),
      description: currentData.weather?.[0]?.description || "Unbekannt",
      timestamp: currentData.dt * 1000,
    };

    const hourly = this._buildHourlyFromForecast(forecastData.list);
    const daily = this._buildDailyFromForecast(forecastData.list);

    return { current, hourly, daily };
  }

  _buildHourlyFromForecast(entries = []) {
    return entries.slice(0, 24).map((entry) => ({
      temp: entry.main?.temp ?? 0,
      precipitation: (entry.pop || 0) * 100,
      rain_volume: entry.rain?.["3h"] || 0,
      wind_speed: entry.wind?.speed ?? 0,
      timestamp: entry.dt * 1000,
      weather_code: this._mapWeatherCode(entry.weather?.[0]?.main),
    }));
  }

  _buildDailyFromForecast(entries = []) {
    const buckets = new Map();
    entries.forEach((entry) => {
      const date = new Date(entry.dt * 1000).toISOString().split("T")[0];
      if (!buckets.has(date)) {
        buckets.set(date, {
          temp_min: entry.main?.temp_min,
          temp_max: entry.main?.temp_max,
          precipitation: (entry.pop || 0) * 100,
          rain_volume: entry.rain?.["3h"] || 0,
          wind_speed: entry.wind?.speed ?? 0,
          weather_code: this._mapWeatherCode(entry.weather?.[0]?.main),
        });
        return;
      }

      const bucket = buckets.get(date);
      bucket.temp_min = Math.min(
        bucket.temp_min,
        entry.main?.temp_min ?? bucket.temp_min
      );
      bucket.temp_max = Math.max(
        bucket.temp_max,
        entry.main?.temp_max ?? bucket.temp_max
      );
      bucket.precipitation = Math.max(
        bucket.precipitation,
        (entry.pop || 0) * 100
      );
      bucket.rain_volume += entry.rain?.["3h"] || 0;
      bucket.wind_speed = Math.max(
        bucket.wind_speed,
        entry.wind?.speed ?? bucket.wind_speed
      );
    });

    return Array.from(buckets.entries())
      .slice(0, 7)
      .map(([date, values]) => ({
        date,
        ...values,
      }));
  }

  /**
   * Validates OpenWeatherMap API response structure
   * @param {object} data - API response data
   * @returns {object} - {valid: boolean, error: string|null}
   * @private
   */
  _validateResponse(data) {
    if (!data) {
      return { valid: false, error: "Keine Daten von OpenWeatherMap erhalten" };
    }

    if (data.cod && data.cod !== 200) {
      if (data.message) {
        return { valid: false, error: `OpenWeatherMap: ${data.message}` };
      }
      return { valid: false, error: `OpenWeatherMap Fehler: ${data.cod}` };
    }

    if (!data.current) {
      return {
        valid: false,
        error: "Ungültige OpenWeatherMap Antwort: Keine aktuellen Daten",
      };
    }

    if (!Array.isArray(data.hourly)) {
      return {
        valid: false,
        error: "Ungültige OpenWeatherMap Antwort: Keine Stundendaten",
      };
    }

    if (!Array.isArray(data.daily)) {
      return {
        valid: false,
        error: "Ungültige OpenWeatherMap Antwort: Keine Tagesdaten",
      };
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
      description: data.current.weather[0]?.description || "Unbekannt",
      timestamp: data.current.dt * 1000,
    };

    const hourly = (data.hourly || []).slice(0, 24).map((hour) => ({
      temp: hour.temp,
      precipitation: (hour.pop || 0) * 100, // Probability of precipitation (0-100)
      rain_volume: hour.rain?.["1h"] || 0,
      wind_speed: hour.wind_speed,
      timestamp: hour.dt * 1000,
      weather_code: this._mapWeatherCode(hour.weather[0]?.main),
    }));

    const daily = (data.daily || []).slice(0, 7).map((day) => ({
      temp_min: day.temp.min,
      temp_max: day.temp.max,
      precipitation: (day.pop || 0) * 100,
      rain_volume: day.rain || 0,
      wind_speed: day.wind_speed,
      date: new Date(day.dt * 1000).toISOString().split("T")[0],
      weather_code: this._mapWeatherCode(day.weather[0]?.main),
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

    if (desc === "clear") return 0;
    if (desc === "clouds") return 3;
    if (desc === "drizzle") return 51;
    if (desc === "rain") return 61;
    if (desc === "thunderstorm") return 95;
    if (desc === "snow") return 71;
    if (
      desc === "mist" ||
      desc === "smoke" ||
      desc === "haze" ||
      desc === "dust" ||
      desc === "fog" ||
      desc === "sand" ||
      desc === "ash"
    ) {
      return 45; // Foggy
    }
    if (desc === "tornado") return 95;

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
        description: data.current.description,
      },
      hourly: data.hourly.slice(0, limit).map((h) => ({
        time: new Date(h.timestamp).toLocaleTimeString("de-DE", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        temp: `${h.temp.toFixed(1)}°`,
        wind: `${h.wind_speed.toFixed(1)} m/s`,
        precipitation: `${h.precipitation.toFixed(0)}%`,
        code: h.weather_code,
      })),
      daily: data.daily.map((d) => ({
        date: new Date(d.date).toLocaleDateString("de-DE"),
        temp_min: `${d.temp_min.toFixed(1)}°`,
        temp_max: `${d.temp_max.toFixed(1)}°`,
        precipitation: `${d.precipitation.toFixed(0)}%`,
        code: d.weather_code,
      })),
    };
  }

  _validateApiKey(apiKey) {
    const trimmed = typeof apiKey === "string" ? apiKey.trim() : "";
    const guidance = this._getKeyGuidance();

    if (!trimmed) {
      return {
        valid: false,
        code: "missing-key",
        state: "missing-key",
        message: "OpenWeatherMap API-Key erforderlich",
        detail: guidance,
        statusMessage: "API-Key fehlt",
      };
    }

    if (!/^[A-Za-z0-9]{32,64}$/.test(trimmed)) {
      return {
        valid: false,
        code: "invalid-key",
        state: "invalid-key",
        message:
          "OpenWeatherMap API-Key scheint unvollständig (32 Zeichen erwartet)",
        detail: `${guidance} · Format: 32 Zeichen (hexadezimal)`,
        statusMessage: "API-Key prüfen",
      };
    }

    return { valid: true, key: trimmed };
  }

  _classifyError(error) {
    const rawMessage = error?.message || "Unbekannter Fehler";
    const normalized = rawMessage.toLowerCase();
    const guidance = this._getKeyGuidance();

    if (/401|unauthorized|invalid api key|appid/.test(normalized)) {
      return {
        message: "OpenWeatherMap: API-Key ungültig oder blockiert (401)",
        detail: `${guidance} Falls du gerade einen neuen Key erstellt hast, beachte die Aktivierungszeit von ca. 15 Minuten. (Antwort: ${rawMessage})`,
        code: "invalid-key",
        state: "invalid-key",
        statusMessage: "API-Key ungültig",
      };
    }

    if (/403|forbidden/.test(normalized)) {
      return {
        message: "OpenWeatherMap: Zugriff verweigert (403)",
        detail: `${guidance} Prüfe auch, ob die One Call API für deinen Account freigeschaltet ist.`,
        code: "invalid-key",
        state: "invalid-key",
        statusMessage: "Zugriff verweigert",
      };
    }

    if (/429/.test(normalized) || /rate limit/.test(normalized)) {
      return {
        message: "OpenWeatherMap: Rate Limit erreicht (429)",
        detail:
          "Bitte warte eine Minute oder reduziere die Anzahl der Anfragen. Ein Upgrade des Plans entfernt dieses Limit.",
        code: "rate-limit",
        state: "warning",
        statusMessage: "Rate Limit",
      };
    }

    if (/timeout/.test(normalized) || /aborted/.test(normalized)) {
      return {
        message: "OpenWeatherMap: Anfrage hat zu lange gedauert",
        detail:
          "Netzwerk langsam oder Server ausgelastet. Versuch es gleich erneut.",
        code: "timeout",
        state: "warning",
        statusMessage: "Zeitüberschreitung",
      };
    }

    return {
      message: `OpenWeatherMap: ${rawMessage}`,
      detail: rawMessage,
      code: "error",
      state: "error",
      statusMessage: "Fehler",
    };
  }

  _getKeyGuidance() {
    return "Öffne ⚙️ Einstellungen → Integrationen & APIs → Optionale API Keys und speichere deinen persönlichen OpenWeatherMap-Key.";
  }
}

// Export the class
if (typeof module !== "undefined" && module.exports) {
  module.exports = OpenWeatherMapAPI;
}
