/**
 * WeatherDataService - Zentrale Datenfassade mit Parallel-Multi-Source-Architektur
 *
 * ARCHITEKTUR:
 * ============
 * 1. Adapter-Pattern: Jede API liefert andere JSON-Formate
 *    - API A: temp_c | API B: temperature | API C: t
 *    - Adapter = Übersetzer → Alles auf internes Format
 *    - WMO-Codes (Open-Meteo) vs. DWD-Codes (Brightsky) → Einheitlich
 *
 * 2. Fallback-Mechanismus (Parallel-Multi-Source):
 *    - Primärquellen (immer aktiv, kein API-Key): Open-Meteo + BrightSky
 *    - Beide parallel via Promise.allSettled() – kein sequenzielles Warten
 *    - Optional (mit User-API-Keys): OpenWeatherMap, VisualCrossing, Meteostat
 *
 * 3. Fehlerbehandlung pro API:
 *    - Retry-System: 3 Versuche + exponential backoff
 *    - API fehlschlägt? → Protokolliert, andere APIs weitermachen
 *    - Daten aller erfolgreichen Provider werden gemerged
 *
 * 4. Cache-Strategie:
 *    - TTL: 30 Minuten für Wetterdaten
 *    - Cache-Hit → Keine API-Anfrage
 *    - Requests aus LocalStorage bedient
 *
 * @module api/WeatherDataService
 * @version 2.0.0 - Parallel-Multi-Source
 */

import "../utils/validation.js";

// ============================================
// KONFIGURATION
// ============================================
const CONFIG = {
  CACHE_TTL: 30 * 60 * 1000, // 30 Minuten
  RETRY: {
    MAX_ATTEMPTS: 3,
    BASE_DELAY: 300, // ms
    BACKOFF_MULTIPLIER: 2,
  },
  TIMEOUT: {
    DEFAULT: 8000,
    HISTORICAL: 15000,
  },
};

// ============================================
// WETTERCODE-MAPPING (WMO → Intern → Beschreibung)
// ============================================
const WEATHER_CODES = {
  // Clear
  0: { description: "Klar", icon: "clear", severity: 0 },
  1: { description: "Überwiegend klar", icon: "mostly-clear", severity: 0 },
  2: { description: "Teilweise bewölkt", icon: "partly-cloudy", severity: 0 },
  3: { description: "Bewölkt", icon: "cloudy", severity: 0 },
  // Fog
  45: { description: "Nebel", icon: "fog", severity: 1 },
  48: { description: "Gefrierender Nebel", icon: "fog", severity: 2 },
  // Drizzle
  51: { description: "Leichter Nieselregen", icon: "drizzle", severity: 1 },
  53: { description: "Nieselregen", icon: "drizzle", severity: 1 },
  55: { description: "Starker Nieselregen", icon: "drizzle", severity: 2 },
  56: {
    description: "Gefrierender Nieselregen",
    icon: "freezing-drizzle",
    severity: 2,
  },
  57: {
    description: "Starker gefrierender Nieselregen",
    icon: "freezing-drizzle",
    severity: 3,
  },
  // Rain
  61: { description: "Leichter Regen", icon: "rain-light", severity: 1 },
  63: { description: "Regen", icon: "rain", severity: 2 },
  65: { description: "Starker Regen", icon: "rain-heavy", severity: 3 },
  66: { description: "Gefrierender Regen", icon: "freezing-rain", severity: 3 },
  67: {
    description: "Starker gefrierender Regen",
    icon: "freezing-rain",
    severity: 4,
  },
  // Snow
  71: { description: "Leichter Schneefall", icon: "snow-light", severity: 2 },
  73: { description: "Schneefall", icon: "snow", severity: 2 },
  75: { description: "Starker Schneefall", icon: "snow-heavy", severity: 3 },
  77: { description: "Schneegriesel", icon: "snow-grains", severity: 2 },
  // Showers
  80: {
    description: "Leichte Regenschauer",
    icon: "showers-light",
    severity: 1,
  },
  81: { description: "Regenschauer", icon: "showers", severity: 2 },
  82: {
    description: "Starke Regenschauer",
    icon: "showers-heavy",
    severity: 3,
  },
  85: {
    description: "Leichte Schneeschauer",
    icon: "snow-showers-light",
    severity: 2,
  },
  86: { description: "Schneeschauer", icon: "snow-showers", severity: 3 },
  // Thunderstorm
  95: { description: "Gewitter", icon: "thunderstorm", severity: 4 },
  96: {
    description: "Gewitter mit leichtem Hagel",
    icon: "thunderstorm-hail",
    severity: 4,
  },
  99: {
    description: "Gewitter mit Hagel",
    icon: "thunderstorm-hail",
    severity: 5,
  },
};

// DWD-Code zu WMO-Code Mapping (BrightSky)
const DWD_TO_WMO = {
  "clear-day": 0,
  "clear-night": 0,
  "partly-cloudy-day": 2,
  "partly-cloudy-night": 2,
  cloudy: 3,
  fog: 45,
  wind: 3,
  rain: 63,
  sleet: 66,
  snow: 73,
  hail: 96,
  thunderstorm: 95,
};

// ============================================
// ADAPTER KLASSEN - Übersetzen API-Formate zu internem Format
// ============================================

/**
 * Open-Meteo API Adapter
 */
class OpenMeteoAdapter {
  static name = "Open-Meteo";
  static requiresKey = false;

  static normalizeCurrent(data) {
    if (!data?.current) return null;
    const c = data.current;
    const code = c.weather_code ?? c.weathercode ?? 3;

    return {
      temp: c.temperature_2m ?? c.temperature ?? null,
      feels_like: c.apparent_temperature ?? c.temperature_2m ?? null,
      humidity: c.relative_humidity_2m ?? c.relativehumidity_2m ?? null,
      pressure: c.surface_pressure ?? c.pressure_msl ?? null,
      wind_speed: c.wind_speed_10m ?? c.windspeed_10m ?? null,
      wind_direction: c.wind_direction_10m ?? c.winddirection_10m ?? null,
      clouds: c.cloud_cover ?? c.cloudcover ?? null,
      visibility: c.visibility ? c.visibility / 1000 : null,
      uv_index: c.uv_index ?? null,
      precip: c.precipitation ?? c.rain ?? 0,
      weather_code: code,
      description: WEATHER_CODES[code]?.description ?? "Unbekannt",
      icon: WEATHER_CODES[code]?.icon ?? "cloudy",
      timestamp: c.time ? new Date(c.time).getTime() : Date.now(),
      source: "open-meteo",
    };
  }

  static normalizeDaily(data) {
    if (!data?.daily?.time) return [];
    const d = data.daily;

    return d.time.map((date, i) => ({
      date,
      temp_min: d.temperature_2m_min?.[i] ?? null,
      temp_max: d.temperature_2m_max?.[i] ?? null,
      temp_avg:
        d.temperature_2m_mean?.[i] ??
        (d.temperature_2m_min?.[i] != null && d.temperature_2m_max?.[i] != null
          ? (d.temperature_2m_min[i] + d.temperature_2m_max[i]) / 2
          : null),
      precip: d.precipitation_sum?.[i] ?? 0,
      precip_probability: d.precipitation_probability_max?.[i] ?? null,
      wind_speed: d.wind_speed_10m_max?.[i] ?? null,
      wind_direction: d.wind_direction_10m_dominant?.[i] ?? null,
      humidity: d.relative_humidity_2m_mean?.[i] ?? null,
      sunshine: d.sunshine_duration?.[i] ? d.sunshine_duration[i] / 3600 : null,
      uv_index: d.uv_index_max?.[i] ?? null,
      weather_code: d.weather_code?.[i] ?? 3,
      description:
        WEATHER_CODES[d.weather_code?.[i]]?.description ?? "Unbekannt",
      sunrise: d.sunrise?.[i] ?? null,
      sunset: d.sunset?.[i] ?? null,
      source: "open-meteo",
    }));
  }

  static normalizeHourly(data) {
    if (!data?.hourly?.time) return [];
    const h = data.hourly;

    return h.time.map((timestamp, i) => {
      const code = h.weather_code?.[i] ?? 3;
      const date = timestamp.split("T")[0];
      const hour = parseInt(timestamp.split("T")[1]?.split(":")[0] ?? "0", 10);

      return {
        timestamp,
        date,
        hour,
        temp: h.temperature_2m?.[i] ?? null,
        temp_avg: h.temperature_2m?.[i] ?? null,
        feels_like: h.apparent_temperature?.[i] ?? null,
        humidity:
          h.relative_humidity_2m?.[i] ?? h.relativehumidity_2m?.[i] ?? null,
        precip: h.precipitation?.[i] ?? 0,
        precip_probability: h.precipitation_probability?.[i] ?? null,
        wind_speed: h.wind_speed_10m?.[i] ?? h.windspeed_10m?.[i] ?? null,
        wind_direction:
          h.wind_direction_10m?.[i] ?? h.winddirection_10m?.[i] ?? null,
        clouds: h.cloud_cover?.[i] ?? h.cloudcover?.[i] ?? null,
        pressure: h.surface_pressure?.[i] ?? h.pressure_msl?.[i] ?? null,
        weather_code: code,
        description: WEATHER_CODES[code]?.description ?? "Unbekannt",
        source: "open-meteo",
      };
    });
  }
}

/**
 * BrightSky (DWD) API Adapter
 */
class BrightSkyAdapter {
  static name = "BrightSky";
  static requiresKey = false;

  static normalizeCurrent(data) {
    if (!data?.weather?.[0]) return null;
    const w = data.weather[0];
    const code = DWD_TO_WMO[w.icon] ?? 3;

    return {
      temp: w.temperature ?? null,
      feels_like: w.temperature ?? null,
      humidity: w.relative_humidity ?? null,
      pressure: w.pressure_msl ?? null,
      wind_speed: w.wind_speed ?? null,
      wind_direction: w.wind_direction ?? null,
      clouds: w.cloud_cover ?? null,
      visibility: w.visibility ? w.visibility / 1000 : null,
      uv_index: null,
      precip: w.precipitation ?? 0,
      weather_code: code,
      description:
        WEATHER_CODES[code]?.description ?? w.condition ?? "Unbekannt",
      icon: WEATHER_CODES[code]?.icon ?? "cloudy",
      timestamp: w.timestamp ? new Date(w.timestamp).getTime() : Date.now(),
      source: "brightsky",
    };
  }

  static normalizeDaily(data) {
    if (!data?.weather) return [];

    // Group by date and aggregate
    const byDate = {};
    data.weather.forEach((w) => {
      const date = w.timestamp?.split("T")[0];
      if (!date) return;

      if (!byDate[date]) {
        byDate[date] = {
          date,
          temps: [],
          precip: 0,
          wind_speeds: [],
          humidity: [],
          sunshine: 0,
          codes: [],
        };
      }

      if (w.temperature != null) byDate[date].temps.push(w.temperature);
      if (w.precipitation != null) byDate[date].precip += w.precipitation;
      if (w.wind_speed != null) byDate[date].wind_speeds.push(w.wind_speed);
      if (w.relative_humidity != null)
        byDate[date].humidity.push(w.relative_humidity);
      if (w.sunshine != null) byDate[date].sunshine += w.sunshine / 60;
      if (w.icon) byDate[date].codes.push(DWD_TO_WMO[w.icon] ?? 3);
    });

    return Object.values(byDate).map((d) => ({
      date: d.date,
      temp_min: d.temps.length ? Math.min(...d.temps) : null,
      temp_max: d.temps.length ? Math.max(...d.temps) : null,
      temp_avg: d.temps.length
        ? d.temps.reduce((a, b) => a + b, 0) / d.temps.length
        : null,
      precip: d.precip,
      precip_probability: null,
      wind_speed: d.wind_speeds.length ? Math.max(...d.wind_speeds) : null,
      wind_direction: null,
      humidity: d.humidity.length
        ? d.humidity.reduce((a, b) => a + b, 0) / d.humidity.length
        : null,
      sunshine: d.sunshine,
      uv_index: null,
      weather_code: d.codes.length
        ? d.codes[Math.floor(d.codes.length / 2)]
        : 3,
      description: WEATHER_CODES[d.codes[0]]?.description ?? "Unbekannt",
      sunrise: null,
      sunset: null,
      source: "brightsky",
    }));
  }

  static normalizeHourly(data) {
    if (!data?.weather) return [];

    return data.weather.map((w) => {
      const code = DWD_TO_WMO[w.icon] ?? 3;
      const timestamp = w.timestamp;
      const date = timestamp?.split("T")[0] ?? "";
      const hour = parseInt(timestamp?.split("T")[1]?.split(":")[0] ?? "0", 10);

      return {
        timestamp,
        date,
        hour,
        temp: w.temperature ?? null,
        temp_avg: w.temperature ?? null,
        feels_like: w.temperature ?? null,
        humidity: w.relative_humidity ?? null,
        precip: w.precipitation ?? 0,
        precip_probability: w.precipitation_probability ?? null,
        wind_speed: w.wind_speed ?? null,
        wind_direction: w.wind_direction ?? null,
        clouds: w.cloud_cover ?? null,
        pressure: w.pressure_msl ?? null,
        weather_code: code,
        description:
          WEATHER_CODES[code]?.description ?? w.condition ?? "Unbekannt",
        source: "brightsky",
      };
    });
  }
}

/**
 * Visual Crossing API Adapter
 */
class VisualCrossingAdapter {
  static name = "VisualCrossing";
  static requiresKey = true;

  static normalizeCurrent(data) {
    if (!data?.currentConditions) return null;
    const c = data.currentConditions;
    const code = VisualCrossingAdapter._mapConditionToWMO(c.conditions);

    return {
      temp: c.temp ?? null,
      feels_like: c.feelslike ?? c.temp ?? null,
      humidity: c.humidity ?? null,
      pressure: c.pressure ?? null,
      wind_speed: c.windspeed ?? null,
      wind_direction: c.winddir ?? null,
      clouds: c.cloudcover ?? null,
      visibility: c.visibility ?? null,
      uv_index: c.uvindex ?? null,
      precip: c.precip ?? 0,
      weather_code: code,
      description:
        WEATHER_CODES[code]?.description ?? c.conditions ?? "Unbekannt",
      icon: WEATHER_CODES[code]?.icon ?? "cloudy",
      timestamp: c.datetimeEpoch ? c.datetimeEpoch * 1000 : Date.now(),
      source: "visualcrossing",
    };
  }

  static normalizeDaily(data) {
    if (!data?.days) return [];

    return data.days.map((d) => {
      const code = VisualCrossingAdapter._mapConditionToWMO(d.conditions);
      return {
        date: d.datetime,
        temp_min: d.tempmin ?? null,
        temp_max: d.tempmax ?? null,
        temp_avg:
          d.temp ??
          (d.tempmin != null && d.tempmax != null
            ? (d.tempmin + d.tempmax) / 2
            : null),
        precip: d.precip ?? 0,
        precip_probability: d.precipprob ?? null,
        wind_speed: d.windspeed ?? null,
        wind_direction: d.winddir ?? null,
        humidity: d.humidity ?? null,
        sunshine: d.solarenergy ? d.solarenergy / 3.6 : null,
        uv_index: d.uvindex ?? null,
        weather_code: code,
        description:
          WEATHER_CODES[code]?.description ?? d.conditions ?? "Unbekannt",
        sunrise: d.sunrise ? `${d.datetime}T${d.sunrise}` : null,
        sunset: d.sunset ? `${d.datetime}T${d.sunset}` : null,
        source: "visualcrossing",
      };
    });
  }

  static normalizeHourly(data) {
    if (!data?.days) return [];
    const hourly = [];
    data.days.forEach((day) => {
      if (!day.hours) return;
      day.hours.forEach((h) => {
        const code = VisualCrossingAdapter._mapConditionToWMO(h.conditions);
        const timestamp = `${day.datetime}T${h.datetime}`;
        const hour = parseInt(h.datetime.split(":")[0], 10);

        hourly.push({
          timestamp,
          date: day.datetime,
          hour,
          temp: h.temp ?? null,
          temp_avg: h.temp ?? null,
          feels_like: h.feelslike ?? h.temp ?? null,
          humidity: h.humidity ?? null,
          precip: h.precip ?? 0,
          precip_probability: h.precipprob ?? null,
          wind_speed: h.windspeed ?? null,
          wind_direction: h.winddir ?? null,
          clouds: h.cloudcover ?? null,
          pressure: h.pressure ?? null,
          weather_code: code,
          description:
            WEATHER_CODES[code]?.description ?? h.conditions ?? "Unbekannt",
          source: "visualcrossing",
        });
      });
    });
    return hourly;
  }

  static _mapConditionToWMO(conditions) {
    if (!conditions) return 3;
    const cond = conditions.toLowerCase();
    if (cond.includes("clear") || cond.includes("sunny")) return 0;
    if (cond.includes("partly cloudy") || cond.includes("mostly clear"))
      return 2;
    if (cond.includes("cloudy") || cond.includes("overcast")) return 3;
    if (cond.includes("fog") || cond.includes("mist")) return 45;
    if (cond.includes("drizzle")) return 51;
    if (cond.includes("heavy rain")) return 65;
    if (cond.includes("rain")) return 63;
    if (cond.includes("snow")) return 73;
    if (cond.includes("thunderstorm")) return 95;
    return 3;
  }
}

/**
 * OpenWeatherMap API Adapter
 */
class OpenWeatherMapAdapter {
  static name = "OpenWeatherMap";
  static requiresKey = true;

  static normalizeCurrent(data) {
    if (!data?.main) return null;
    const code = OpenWeatherMapAdapter._mapOWMToWMO(data.weather?.[0]?.id);

    return {
      temp: data.main.temp ?? null,
      feels_like: data.main.feels_like ?? null,
      humidity: data.main.humidity ?? null,
      pressure: data.main.pressure ?? null,
      wind_speed: data.wind?.speed ? data.wind.speed * 3.6 : null,
      wind_direction: data.wind?.deg ?? null,
      clouds: data.clouds?.all ?? null,
      visibility: data.visibility ? data.visibility / 1000 : null,
      uv_index: null,
      precip: data.rain?.["1h"] ?? data.rain?.["3h"] ?? 0,
      weather_code: code,
      description:
        WEATHER_CODES[code]?.description ??
        data.weather?.[0]?.description ??
        "Unbekannt",
      icon: WEATHER_CODES[code]?.icon ?? "cloudy",
      timestamp: data.dt ? data.dt * 1000 : Date.now(),
      source: "openweathermap",
    };
  }

  static normalizeDaily(data) {
    if (!data?.daily) return [];
    return data.daily.map((d) => {
      const code = OpenWeatherMapAdapter._mapOWMToWMO(d.weather?.[0]?.id);
      const date = new Date(d.dt * 1000).toISOString().split("T")[0];
      return {
        date,
        temp_min: d.temp?.min ?? null,
        temp_max: d.temp?.max ?? null,
        temp_avg: d.temp?.day ?? null,
        precip: d.rain ?? d.snow ?? 0,
        precip_probability: d.pop ? d.pop * 100 : null,
        wind_speed: d.wind_speed ? d.wind_speed * 3.6 : null,
        wind_direction: d.wind_deg ?? null,
        humidity: d.humidity ?? null,
        sunshine: null,
        uv_index: d.uvi ?? null,
        weather_code: code,
        description:
          WEATHER_CODES[code]?.description ??
          d.weather?.[0]?.description ??
          "Unbekannt",
        sunrise: d.sunrise ? new Date(d.sunrise * 1000).toISOString() : null,
        sunset: d.sunset ? new Date(d.sunset * 1000).toISOString() : null,
        source: "openweathermap",
      };
    });
  }

  static normalizeHourly(data) {
    if (!data?.hourly) return [];
    return data.hourly.map((h) => {
      const code = OpenWeatherMapAdapter._mapOWMToWMO(h.weather?.[0]?.id);
      const timestamp = new Date(h.dt * 1000).toISOString();
      const date = timestamp.split("T")[0];
      const hour = new Date(h.dt * 1000).getHours();
      return {
        timestamp,
        date,
        hour,
        temp: h.temp ?? null,
        temp_avg: h.temp ?? null,
        feels_like: h.feels_like ?? null,
        humidity: h.humidity ?? null,
        precip: h.rain?.["1h"] ?? h.snow?.["1h"] ?? 0,
        precip_probability: h.pop ? h.pop * 100 : null,
        wind_speed: h.wind_speed ? h.wind_speed * 3.6 : null,
        wind_direction: h.wind_deg ?? null,
        clouds: h.clouds ?? null,
        pressure: h.pressure ?? null,
        weather_code: code,
        description:
          WEATHER_CODES[code]?.description ??
          h.weather?.[0]?.description ??
          "Unbekannt",
        source: "openweathermap",
      };
    });
  }

  static _mapOWMToWMO(owmId) {
    if (!owmId) return 3;
    if (owmId >= 200 && owmId < 300) return 95;
    if (owmId >= 300 && owmId < 400) return 51;
    if (owmId >= 500 && owmId < 600) {
      if (owmId === 500) return 61;
      if (owmId === 501) return 63;
      return 65;
    }
    if (owmId >= 600 && owmId < 700) return 73;
    if (owmId >= 700 && owmId < 800) return 45;
    if (owmId === 800) return 0;
    if (owmId === 801) return 1;
    if (owmId === 802) return 2;
    if (owmId >= 803) return 3;
    return 3;
  }
}

/**
 * Meteostat API Adapter
 */
class MeteostatAdapter {
  static name = "Meteostat";
  static requiresKey = false;

  static normalizeDaily(data) {
    if (!data?.data) return [];
    return data.data.map((d) => ({
      date: d.date,
      temp_min: d.tmin ?? null,
      temp_max: d.tmax ?? null,
      temp_avg:
        d.tavg ??
        (d.tmin != null && d.tmax != null ? (d.tmin + d.tmax) / 2 : null),
      precip: d.prcp ?? 0,
      precip_probability: null,
      wind_speed: d.wspd ?? null,
      wind_direction: d.wdir ?? null,
      humidity: null,
      sunshine: d.tsun ? d.tsun / 60 : null,
      uv_index: null,
      weather_code: MeteostatAdapter._estimateWeatherCode(d),
      description: null,
      sunrise: null,
      sunset: null,
      source: "meteostat",
    }));
  }

  static normalizeHourly(data) {
    if (!data?.data) return [];
    return data.data.map((h) => {
      const timestamp = `${h.date}T${String(h.hour).padStart(2, "0")}:00:00`;
      return {
        timestamp,
        date: h.date,
        hour: h.hour,
        temp: h.temp ?? null,
        temp_avg: h.temp ?? null,
        feels_like: null,
        humidity: h.rhum ?? null,
        precip: h.prcp ?? 0,
        precip_probability: null,
        wind_speed: h.wspd ?? null,
        wind_direction: h.wdir ?? null,
        clouds: h.coco ? MeteostatAdapter._cocoToCloudCover(h.coco) : null,
        pressure: h.pres ?? null,
        weather_code: h.coco ? MeteostatAdapter._cocoToWMO(h.coco) : 3,
        description: null,
        source: "meteostat",
      };
    });
  }

  static _estimateWeatherCode(d) {
    if (d.prcp > 10) return 65;
    if (d.prcp > 2) return 63;
    if (d.prcp > 0) return 61;
    if (d.snow && d.snow > 0) return 73;
    if (d.wspd && d.wspd > 50) return 95;
    return 0;
  }

  static _cocoToWMO(coco) {
    const mapping = {
      1: 0,
      2: 2,
      3: 3,
      4: 3,
      5: 45,
      6: 66,
      7: 61,
      8: 63,
      9: 65,
      10: 66,
      11: 65,
      12: 85,
      13: 85,
      14: 71,
      15: 73,
      16: 75,
      17: 77,
      18: 82,
      19: 85,
      20: 86,
      21: 85,
      22: 86,
      23: 95,
      24: 96,
      25: 95,
      26: 99,
      27: 95,
    };
    return mapping[coco] ?? 3;
  }

  static _cocoToCloudCover(coco) {
    if (coco === 1) return 0;
    if (coco === 2) return 25;
    if (coco === 3) return 50;
    if (coco === 4) return 100;
    return 50;
  }
}

// ============================================
// RETRY-SYSTEM MIT EXPONENTIAL BACKOFF
// ============================================

async function withRetry(fn, name, options = {}) {
  const maxAttempts = options.maxAttempts ?? CONFIG.RETRY.MAX_ATTEMPTS;
  const baseDelay = options.baseDelay ?? CONFIG.RETRY.BASE_DELAY;
  const backoffMultiplier =
    options.backoffMultiplier ?? CONFIG.RETRY.BACKOFF_MULTIPLIER;

  let lastError;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (
        error.message?.includes("HTTP 4") ||
        (error.status >= 400 && error.status < 500)
      )
        throw error;
      if (attempt >= maxAttempts) {
        console.error(
          `❌ [${name}] Failed after ${maxAttempts} attempts:`,
          error.message,
        );
        throw error;
      }
      const delay = baseDelay * Math.pow(backoffMultiplier, attempt - 1);
      console.warn(
        `⚠️ [${name}] Attempt ${attempt}/${maxAttempts} failed, retrying in ${delay}ms...`,
      );
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastError;
}

// ============================================
// DATA MERGER - Kombiniert Daten aus mehreren Quellen
// ============================================

class DataMerger {
  static mergeCurrent(results) {
    const priority = [
      "open-meteo",
      "brightsky",
      "visualcrossing",
      "openweathermap",
    ];
    const bySource = {};
    results.forEach((r) => {
      if (r && r.source) bySource[r.source] = r;
    });

    let merged = null;
    for (const source of priority) {
      if (bySource[source]) {
        if (!merged) {
          merged = { ...bySource[source] };
        } else {
          Object.keys(bySource[source]).forEach((key) => {
            if (
              (merged[key] === null || merged[key] === undefined) &&
              bySource[source][key] != null
            ) {
              merged[key] = bySource[source][key];
            }
          });
        }
      }
    }
    if (merged) merged.sources = Object.keys(bySource);
    return merged;
  }

  static mergeDaily(results) {
    const byDate = {};
    results.forEach((sourceData) => {
      if (!Array.isArray(sourceData)) return;
      sourceData.forEach((day) => {
        if (!day.date) return;
        if (!byDate[day.date]) {
          byDate[day.date] = { ...day, sources: [day.source] };
        } else {
          const existing = byDate[day.date];
          Object.keys(day).forEach((key) => {
            if (key === "source") return;
            if (
              (existing[key] === null || existing[key] === undefined) &&
              day[key] != null
            ) {
              existing[key] = day[key];
            }
          });
          if (!existing.sources.includes(day.source))
            existing.sources.push(day.source);
        }
      });
    });
    return Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date));
  }

  static mergeHourly(results) {
    const byTimestamp = {};
    results.forEach((sourceData) => {
      if (!Array.isArray(sourceData)) return;
      sourceData.forEach((hour) => {
        if (!hour.timestamp) return;
        if (!byTimestamp[hour.timestamp]) {
          byTimestamp[hour.timestamp] = { ...hour, sources: [hour.source] };
        } else {
          const existing = byTimestamp[hour.timestamp];
          Object.keys(hour).forEach((key) => {
            if (key === "source") return;
            if (
              (existing[key] === null || existing[key] === undefined) &&
              hour[key] != null
            ) {
              existing[key] = hour[key];
            }
          });
          if (!existing.sources.includes(hour.source))
            existing.sources.push(hour.source);
        }
      });
    });
    return Object.values(byTimestamp).sort((a, b) =>
      a.timestamp.localeCompare(b.timestamp),
    );
  }
}

// ============================================
// MAIN SERVICE CLASS
// ============================================

export class WeatherDataService {
  constructor(options = {}) {
    this.options = options;
    this.cache = null;
  }

  async _getCache() {
    if (!this.cache) {
      try {
        const module = await import("../utils/historyCache.js");
        this.cache = module.default;
      } catch (e) {
        console.warn("[WeatherDataService] Cache service not available:", e);
        this.cache = {
          get: () => null,
          set: () => {},
          generateKey: (t, s, e, lat, lon) => `${t}_${s}_${e}_${lat}_${lon}`,
        };
      }
    }
    return this.cache;
  }

  _getApiKey(provider) {
    return window.apiKeyManager?.getKey(provider) || null;
  }

  // ============================================
  // CURRENT WEATHER - Parallel Multi-Source
  // ============================================

  async loadCurrentWeather(latitude, longitude) {
    const cacheKey = `current_${latitude.toFixed(4)}_${longitude.toFixed(4)}`;
    const cache = await this._getCache();
    const cached = cache.get(cacheKey);
    if (cached) {
      console.log("✅ [WeatherDataService] Current weather from cache");
      return cached;
    }

    console.log(
      `🌐 [WeatherDataService] Loading current weather (${latitude}, ${longitude})`,
    );
    const promises = [
      this._fetchOpenMeteoCurrent(latitude, longitude)
        .then((r) => ({ source: "open-meteo", data: r }))
        .catch((e) => ({ source: "open-meteo", error: e.message })),
      this._fetchBrightSkyCurrent(latitude, longitude)
        .then((r) => ({ source: "brightsky", data: r }))
        .catch((e) => ({ source: "brightsky", error: e.message })),
    ];

    const vcKey = this._getApiKey("visualcrossing");
    if (vcKey)
      promises.push(
        this._fetchVisualCrossingCurrent(latitude, longitude, vcKey)
          .then((r) => ({ source: "visualcrossing", data: r }))
          .catch((e) => ({ source: "visualcrossing", error: e.message })),
      );

    const owmKey = this._getApiKey("openweathermap");
    if (owmKey)
      promises.push(
        this._fetchOpenWeatherMapCurrent(latitude, longitude, owmKey)
          .then((r) => ({ source: "openweathermap", data: r }))
          .catch((e) => ({ source: "openweathermap", error: e.message })),
      );

    const results = await Promise.allSettled(promises);
    const successfulData = [];
    results.forEach((result) => {
      if (result.status === "fulfilled" && result.value.data) {
        successfulData.push(result.value.data);
        console.log(`✅ [${result.value.source}] Success`);
      } else if (result.status === "fulfilled" && result.value.error) {
        console.warn(
          `⚠️ [${result.value.source}] Error: ${result.value.error}`,
        );
      }
    });

    const merged = DataMerger.mergeCurrent(successfulData);
    if (merged) {
      cache.set(cacheKey, merged);
      return merged;
    }
    throw new Error("Keine Wetterdaten verfügbar");
  }

  // ============================================
  // FORECAST - Parallel Multi-Source
  // ============================================

  async loadForecast(latitude, longitude, days = 7) {
    const cacheKey = `forecast_${days}d_${latitude.toFixed(4)}_${longitude.toFixed(4)}`;
    const cache = await this._getCache();
    const cached = cache.get(cacheKey);
    if (cached) {
      console.log("✅ [WeatherDataService] Forecast from cache");
      return cached;
    }

    console.log(`🌐 [WeatherDataService] Loading ${days}-day forecast`);
    const promises = [
      this._fetchOpenMeteoForecast(latitude, longitude, days)
        .then((r) => ({ source: "open-meteo", data: r }))
        .catch((e) => ({ source: "open-meteo", error: e.message })),
      this._fetchBrightSkyForecast(latitude, longitude, days)
        .then((r) => ({ source: "brightsky", data: r }))
        .catch((e) => ({ source: "brightsky", error: e.message })),
    ];

    const vcKey = this._getApiKey("visualcrossing");
    if (vcKey)
      promises.push(
        this._fetchVisualCrossingForecast(latitude, longitude, days, vcKey)
          .then((r) => ({ source: "visualcrossing", data: r }))
          .catch((e) => ({ source: "visualcrossing", error: e.message })),
      );

    const owmKey = this._getApiKey("openweathermap");
    if (owmKey)
      promises.push(
        this._fetchOpenWeatherMapForecast(latitude, longitude, days, owmKey)
          .then((r) => ({ source: "openweathermap", data: r }))
          .catch((e) => ({ source: "openweathermap", error: e.message })),
      );

    const results = await Promise.allSettled(promises);
    const dailyResults = [],
      hourlyResults = [];
    results.forEach((result) => {
      if (result.status === "fulfilled" && result.value.data) {
        if (result.value.data.daily) dailyResults.push(result.value.data.daily);
        if (result.value.data.hourly)
          hourlyResults.push(result.value.data.hourly);
        console.log(`✅ [${result.value.source}] Forecast success`);
      }
    });

    const merged = {
      daily: DataMerger.mergeDaily(dailyResults),
      hourly: DataMerger.mergeHourly(hourlyResults),
    };
    if (merged.daily.length > 0) {
      cache.set(cacheKey, merged);
      return merged;
    }
    throw new Error("Keine Vorhersagedaten verfügbar");
  }

  // ============================================
  // HISTORICAL DATA - Parallel Multi-Source
  // ============================================

  async loadHistory(latitude, longitude, startDate, endDate) {
    const cache = await this._getCache();
    const cacheKey = cache.generateKey(
      "daily",
      startDate,
      endDate,
      latitude,
      longitude,
    );
    const cached = cache.get(cacheKey);
    if (cached) {
      console.log("✅ [WeatherDataService] History from cache");
      return cached;
    }

    console.log(
      `🌐 [WeatherDataService] Loading history: ${startDate} to ${endDate}`,
    );
    const promises = [
      this._fetchOpenMeteoHistorical(latitude, longitude, startDate, endDate)
        .then((r) => ({ source: "open-meteo", data: r }))
        .catch((e) => ({ source: "open-meteo", error: e.message })),
      this._fetchBrightSkyHistorical(latitude, longitude, startDate, endDate)
        .then((r) => ({ source: "brightsky", data: r }))
        .catch((e) => ({ source: "brightsky", error: e.message })),
    ];

    const vcKey = this._getApiKey("visualcrossing");
    if (vcKey)
      promises.push(
        this._fetchVisualCrossingHistorical(
          latitude,
          longitude,
          startDate,
          endDate,
          vcKey,
        )
          .then((r) => ({ source: "visualcrossing", data: r }))
          .catch((e) => ({ source: "visualcrossing", error: e.message })),
      );

    const msKey = this._getApiKey("meteostat");
    promises.push(
      this._fetchMeteostatHistorical(
        latitude,
        longitude,
        startDate,
        endDate,
        msKey,
      )
        .then((r) => ({ source: "meteostat", data: r }))
        .catch((e) => ({ source: "meteostat", error: e.message })),
    );

    const results = await Promise.allSettled(promises);
    const dailyResults = [];
    results.forEach((result) => {
      if (result.status === "fulfilled" && result.value.data?.length > 0) {
        dailyResults.push(result.value.data);
        console.log(
          `✅ [${result.value.source}] History: ${result.value.data.length} days`,
        );
      }
    });

    const merged = DataMerger.mergeDaily(dailyResults);
    if (merged.length > 0) {
      cache.set(cacheKey, merged);
      return merged;
    }

    // Fallback to gridFields
    try {
      const { gridFieldsAPI } = await import("./gridFields.js");
      const data = await gridFieldsAPI.fetchHistoricalData(
        latitude,
        longitude,
        startDate,
        endDate,
      );
      if (data?.length > 0) {
        cache.set(cacheKey, data);
        return data;
      }
    } catch (e) {
      console.warn("[WeatherDataService] GridFields fallback failed:", e);
    }
    return [];
  }

  async loadHourlyHistory(latitude, longitude, startDate, endDate) {
    const cache = await this._getCache();
    const cacheKey = cache.generateKey(
      "hourly",
      startDate,
      endDate,
      latitude,
      longitude,
    );
    const cached = cache.get(cacheKey);
    if (cached) {
      console.log("✅ [WeatherDataService] Hourly history from cache");
      return { hourly: cached, source: "cache" };
    }

    console.log(
      `🌐 [WeatherDataService] Loading hourly history: ${startDate} to ${endDate}`,
    );
    const promises = [
      this._fetchOpenMeteoHourlyHistorical(
        latitude,
        longitude,
        startDate,
        endDate,
      )
        .then((r) => ({ source: "open-meteo", data: r }))
        .catch((e) => ({ source: "open-meteo", error: e.message })),
      this._fetchBrightSkyHourlyHistorical(
        latitude,
        longitude,
        startDate,
        endDate,
      )
        .then((r) => ({ source: "brightsky", data: r }))
        .catch((e) => ({ source: "brightsky", error: e.message })),
    ];

    const vcKey = this._getApiKey("visualcrossing");
    if (vcKey)
      promises.push(
        this._fetchVisualCrossingHourlyHistorical(
          latitude,
          longitude,
          startDate,
          endDate,
          vcKey,
        )
          .then((r) => ({ source: "visualcrossing", data: r }))
          .catch((e) => ({ source: "visualcrossing", error: e.message })),
      );

    const results = await Promise.allSettled(promises);
    const hourlyResults = [];
    results.forEach((result) => {
      if (result.status === "fulfilled" && result.value.data?.length > 0) {
        hourlyResults.push(result.value.data);
        console.log(
          `✅ [${result.value.source}] Hourly: ${result.value.data.length} hours`,
        );
      }
    });

    const merged = DataMerger.mergeHourly(hourlyResults);
    if (merged.length > 0) {
      cache.set(cacheKey, merged);
      return { hourly: merged, source: "multi-source" };
    }

    // Fallback to daily
    console.log("[WeatherDataService] Falling back to daily data");
    const dailyData = await this.loadHistory(
      latitude,
      longitude,
      startDate,
      endDate,
    );
    if (dailyData.length > 0) {
      const pseudoHourly = dailyData.map((day) => ({
        timestamp: `${day.date}T12:00:00`,
        date: day.date,
        hour: 12,
        temp: day.temp_avg,
        temp_avg: day.temp_avg,
        temp_min: day.temp_min,
        temp_max: day.temp_max,
        precip: day.precip,
        wind_speed: day.wind_speed,
        humidity: day.humidity,
        weather_code: day.weather_code,
        source: "daily-fallback",
        _dailyFallback: true,
      }));
      return {
        hourly: pseudoHourly,
        source: "daily-fallback",
        _isDailyFallback: true,
      };
    }
    return {
      hourly: [],
      source: "none",
      error: "Keine stündlichen Daten verfügbar",
    };
  }

  async loadHistoricalMetric(metric, latitude, longitude, startDate, endDate) {
    const data = await this.loadHistory(
      latitude,
      longitude,
      startDate,
      endDate,
    );
    const metricMapping = {
      temperature: ["temp_avg", "temp_min", "temp_max"],
      precipitation: ["precip", "precip_probability"],
      wind: ["wind_speed", "wind_direction"],
      humidity: ["humidity"],
      sunshine: ["sunshine"],
    };
    const fields = metricMapping[metric] || metricMapping.temperature;
    return data.map((day) => {
      const result = { date: day.date, source: day.source };
      fields.forEach((field) => {
        result[field] = day[field];
      });
      if (!fields.includes("temp_avg")) result.temp_avg = day.temp_avg;
      return result;
    });
  }

  // ============================================
  // INTERNAL API FETCH METHODS
  // ============================================

  async _fetchOpenMeteoCurrent(lat, lon) {
    return withRetry(async () => {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,cloud_cover,surface_pressure,wind_speed_10m,wind_direction_10m&timezone=auto`;
      const response = await fetch(url, {
        signal: AbortSignal.timeout(CONFIG.TIMEOUT.DEFAULT),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return OpenMeteoAdapter.normalizeCurrent(await response.json());
    }, "Open-Meteo Current");
  }

  async _fetchOpenMeteoForecast(lat, lon, days) {
    return withRetry(async () => {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,temperature_2m_min,temperature_2m_mean,precipitation_sum,precipitation_probability_max,weather_code,wind_speed_10m_max,wind_direction_10m_dominant,sunshine_duration,uv_index_max,sunrise,sunset&hourly=temperature_2m,relative_humidity_2m,precipitation,weather_code,wind_speed_10m,cloud_cover&forecast_days=${days}&timezone=auto`;
      const response = await fetch(url, {
        signal: AbortSignal.timeout(CONFIG.TIMEOUT.DEFAULT),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      return {
        daily: OpenMeteoAdapter.normalizeDaily(data),
        hourly: OpenMeteoAdapter.normalizeHourly(data),
      };
    }, "Open-Meteo Forecast");
  }

  async _fetchOpenMeteoHistorical(lat, lon, startDate, endDate) {
    return withRetry(async () => {
      const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}&start_date=${startDate}&end_date=${endDate}&daily=temperature_2m_max,temperature_2m_min,temperature_2m_mean,precipitation_sum,wind_speed_10m_max,sunshine_duration,weather_code&timezone=auto`;
      const response = await fetch(url, {
        signal: AbortSignal.timeout(CONFIG.TIMEOUT.HISTORICAL),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return OpenMeteoAdapter.normalizeDaily(await response.json());
    }, "Open-Meteo Historical");
  }

  async _fetchOpenMeteoHourlyHistorical(lat, lon, startDate, endDate) {
    return withRetry(async () => {
      const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}&start_date=${startDate}&end_date=${endDate}&hourly=temperature_2m,relative_humidity_2m,precipitation,weather_code,surface_pressure,cloud_cover,wind_speed_10m,wind_direction_10m&timezone=auto`;
      const response = await fetch(url, {
        signal: AbortSignal.timeout(CONFIG.TIMEOUT.HISTORICAL),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return OpenMeteoAdapter.normalizeHourly(await response.json());
    }, "Open-Meteo Hourly Historical");
  }

  async _fetchBrightSkyCurrent(lat, lon) {
    return withRetry(async () => {
      const url = `https://api.brightsky.dev/current_weather?lat=${lat}&lon=${lon}`;
      const response = await fetch(url, {
        signal: AbortSignal.timeout(CONFIG.TIMEOUT.DEFAULT),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return BrightSkyAdapter.normalizeCurrent(await response.json());
    }, "BrightSky Current");
  }

  async _fetchBrightSkyForecast(lat, lon, days) {
    return withRetry(async () => {
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + days);
      const url = `https://api.brightsky.dev/weather?lat=${lat}&lon=${lon}&date=${new Date().toISOString().split("T")[0]}&last_date=${endDate.toISOString().split("T")[0]}`;
      const response = await fetch(url, {
        signal: AbortSignal.timeout(CONFIG.TIMEOUT.DEFAULT),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      return {
        daily: BrightSkyAdapter.normalizeDaily(data),
        hourly: BrightSkyAdapter.normalizeHourly(data),
      };
    }, "BrightSky Forecast");
  }

  async _fetchBrightSkyHistorical(lat, lon, startDate, endDate) {
    return withRetry(async () => {
      const url = `https://api.brightsky.dev/weather?lat=${lat}&lon=${lon}&date=${startDate}&last_date=${endDate}`;
      const response = await fetch(url, {
        signal: AbortSignal.timeout(CONFIG.TIMEOUT.HISTORICAL),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return BrightSkyAdapter.normalizeDaily(await response.json());
    }, "BrightSky Historical");
  }

  async _fetchBrightSkyHourlyHistorical(lat, lon, startDate, endDate) {
    return withRetry(async () => {
      const url = `https://api.brightsky.dev/weather?lat=${lat}&lon=${lon}&date=${startDate}&last_date=${endDate}`;
      const response = await fetch(url, {
        signal: AbortSignal.timeout(CONFIG.TIMEOUT.HISTORICAL),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return BrightSkyAdapter.normalizeHourly(await response.json());
    }, "BrightSky Hourly Historical");
  }

  async _fetchVisualCrossingCurrent(lat, lon, apiKey) {
    return withRetry(async () => {
      const url = `https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services/timeline/${lat},${lon}/today?unitGroup=metric&include=current&key=${apiKey}&contentType=json`;
      const response = await fetch(url, {
        signal: AbortSignal.timeout(CONFIG.TIMEOUT.DEFAULT),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return VisualCrossingAdapter.normalizeCurrent(await response.json());
    }, "VisualCrossing Current");
  }

  async _fetchVisualCrossingForecast(lat, lon, days, apiKey) {
    return withRetry(async () => {
      const url = `https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services/timeline/${lat},${lon}/next${days}days?unitGroup=metric&include=days,hours&key=${apiKey}&contentType=json`;
      const response = await fetch(url, {
        signal: AbortSignal.timeout(CONFIG.TIMEOUT.DEFAULT),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      return {
        daily: VisualCrossingAdapter.normalizeDaily(data),
        hourly: VisualCrossingAdapter.normalizeHourly(data),
      };
    }, "VisualCrossing Forecast");
  }

  async _fetchVisualCrossingHistorical(lat, lon, startDate, endDate, apiKey) {
    return withRetry(async () => {
      const url = `https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services/timeline/${lat},${lon}/${startDate}/${endDate}?unitGroup=metric&include=days&key=${apiKey}&contentType=json`;
      const response = await fetch(url, {
        signal: AbortSignal.timeout(CONFIG.TIMEOUT.HISTORICAL),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return VisualCrossingAdapter.normalizeDaily(await response.json());
    }, "VisualCrossing Historical");
  }

  async _fetchVisualCrossingHourlyHistorical(
    lat,
    lon,
    startDate,
    endDate,
    apiKey,
  ) {
    return withRetry(async () => {
      const url = `https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services/timeline/${lat},${lon}/${startDate}/${endDate}?unitGroup=metric&include=hours&key=${apiKey}&contentType=json`;
      const response = await fetch(url, {
        signal: AbortSignal.timeout(CONFIG.TIMEOUT.HISTORICAL),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return VisualCrossingAdapter.normalizeHourly(await response.json());
    }, "VisualCrossing Hourly Historical");
  }

  async _fetchOpenWeatherMapCurrent(lat, lon, apiKey) {
    return withRetry(async () => {
      const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric&lang=de`;
      const response = await fetch(url, {
        signal: AbortSignal.timeout(CONFIG.TIMEOUT.DEFAULT),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return OpenWeatherMapAdapter.normalizeCurrent(await response.json());
    }, "OpenWeatherMap Current");
  }

  async _fetchOpenWeatherMapForecast(lat, lon, days, apiKey) {
    return withRetry(async () => {
      const url = `https://api.openweathermap.org/data/3.0/onecall?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric&lang=de&exclude=minutely,alerts`;
      const response = await fetch(url, {
        signal: AbortSignal.timeout(CONFIG.TIMEOUT.DEFAULT),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      return {
        daily: OpenWeatherMapAdapter.normalizeDaily(data),
        hourly: OpenWeatherMapAdapter.normalizeHourly(data),
      };
    }, "OpenWeatherMap Forecast");
  }

  async _fetchMeteostatHistorical(lat, lon, startDate, endDate, apiKey) {
    return withRetry(async () => {
      const headers = { "Content-Type": "application/json" };
      if (apiKey) headers["x-rapidapi-key"] = apiKey;
      const url = `https://meteostat.p.rapidapi.com/point/daily?lat=${lat}&lon=${lon}&start=${startDate}&end=${endDate}`;
      const response = await fetch(url, {
        headers,
        signal: AbortSignal.timeout(CONFIG.TIMEOUT.HISTORICAL),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return MeteostatAdapter.normalizeDaily(await response.json());
    }, "Meteostat Historical");
  }

  // ============================================
  // LEGACY COMPATIBILITY METHODS
  // ============================================

  async loadCurrentAndForecast(latitude, longitude) {
    const [current, forecast] = await Promise.all([
      this.loadCurrentWeather(latitude, longitude).catch(() => null),
      this.loadForecast(latitude, longitude, 7).catch(() => ({
        daily: [],
        hourly: [],
      })),
    ]);

    // Legacy format compatibility
    return {
      current,
      daily: forecast.daily,
      hourly: forecast.hourly,
      openMeteo: current, // Legacy field
      brightSky: current, // Legacy field
      sources: current?.sources || [],
      raw: { openMeteo: { data: current }, brightSky: { data: current } },
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

// Singleton-Instanz
export const weatherDataService = new WeatherDataService();

// Global registration for non-module access
if (typeof window !== "undefined") {
  window.weatherDataService = weatherDataService;
  window.WeatherDataService = WeatherDataService;
}
