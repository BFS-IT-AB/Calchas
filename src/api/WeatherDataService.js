/**
 * WeatherDataService - Browser-kompatible Version (kein ES Module)
 *
 * Zentrale Datenfassade mit Parallel-Multi-Source-Architektur
 * Für index.html Script-Einbindung ohne ES Module Support
 *
 * @version 2.0.0
 */
(function (global) {
  "use strict";

  // ============================================
  // KONFIGURATION
  // ============================================
  const CONFIG = {
    CACHE_TTL: 30 * 60 * 1000, // 30 Minuten
    RETRY: {
      MAX_ATTEMPTS: 3,
      BASE_DELAY: 300,
      BACKOFF_MULTIPLIER: 2,
    },
    TIMEOUT: {
      DEFAULT: 8000,
      HISTORICAL: 15000,
    },
  };

  // ============================================
  // WETTERCODE-MAPPING (WMO → Beschreibung)
  // ============================================
  const WEATHER_CODES = {
    0: { description: "Klar", icon: "clear", severity: 0 },
    1: { description: "Überwiegend klar", icon: "mostly-clear", severity: 0 },
    2: { description: "Teilweise bewölkt", icon: "partly-cloudy", severity: 0 },
    3: { description: "Bewölkt", icon: "cloudy", severity: 0 },
    45: { description: "Nebel", icon: "fog", severity: 1 },
    48: { description: "Gefrierender Nebel", icon: "fog", severity: 2 },
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
    61: { description: "Leichter Regen", icon: "rain-light", severity: 1 },
    63: { description: "Regen", icon: "rain", severity: 2 },
    65: { description: "Starker Regen", icon: "rain-heavy", severity: 3 },
    66: {
      description: "Gefrierender Regen",
      icon: "freezing-rain",
      severity: 3,
    },
    67: {
      description: "Starker gefrierender Regen",
      icon: "freezing-rain",
      severity: 4,
    },
    71: { description: "Leichter Schneefall", icon: "snow-light", severity: 2 },
    73: { description: "Schneefall", icon: "snow", severity: 2 },
    75: { description: "Starker Schneefall", icon: "snow-heavy", severity: 3 },
    77: { description: "Schneegriesel", icon: "snow-grains", severity: 2 },
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
  // ADAPTER KLASSEN
  // ============================================

  const OpenMeteoAdapter = {
    name: "Open-Meteo",
    normalizeCurrent: function (data) {
      if (!data || !data.current) return null;
      const c = data.current;
      const code = c.weather_code || c.weathercode || 3;
      return {
        temp: c.temperature_2m || c.temperature || null,
        feels_like: c.apparent_temperature || c.temperature_2m || null,
        humidity: c.relative_humidity_2m || c.relativehumidity_2m || null,
        pressure: c.surface_pressure || c.pressure_msl || null,
        wind_speed: c.wind_speed_10m || c.windspeed_10m || null,
        wind_direction: c.wind_direction_10m || c.winddirection_10m || null,
        clouds: c.cloud_cover || c.cloudcover || null,
        visibility: c.visibility ? c.visibility / 1000 : null,
        uv_index: c.uv_index || null,
        precip: c.precipitation || c.rain || 0,
        weather_code: code,
        description: WEATHER_CODES[code]
          ? WEATHER_CODES[code].description
          : "Unbekannt",
        icon: WEATHER_CODES[code] ? WEATHER_CODES[code].icon : "cloudy",
        timestamp: c.time ? new Date(c.time).getTime() : Date.now(),
        source: "open-meteo",
      };
    },
    normalizeDaily: function (data) {
      if (!data || !data.daily || !data.daily.time) return [];
      const d = data.daily;
      return d.time.map(function (date, i) {
        var tempMin = d.temperature_2m_min ? d.temperature_2m_min[i] : null;
        var tempMax = d.temperature_2m_max ? d.temperature_2m_max[i] : null;
        return {
          date: date,
          temp_min: tempMin,
          temp_max: tempMax,
          temp_avg: d.temperature_2m_mean
            ? d.temperature_2m_mean[i]
            : tempMin !== null && tempMax !== null
              ? (tempMin + tempMax) / 2
              : null,
          precip: d.precipitation_sum ? d.precipitation_sum[i] : 0,
          precip_probability: d.precipitation_probability_max
            ? d.precipitation_probability_max[i]
            : null,
          wind_speed: d.wind_speed_10m_max ? d.wind_speed_10m_max[i] : null,
          wind_direction: d.wind_direction_10m_dominant
            ? d.wind_direction_10m_dominant[i]
            : null,
          humidity: d.relative_humidity_2m_mean
            ? d.relative_humidity_2m_mean[i]
            : null,
          sunshine:
            d.sunshine_duration && d.sunshine_duration[i]
              ? d.sunshine_duration[i] / 3600
              : null,
          uv_index: d.uv_index_max ? d.uv_index_max[i] : null,
          weather_code: d.weather_code ? d.weather_code[i] : 3,
          description: WEATHER_CODES[d.weather_code ? d.weather_code[i] : 3]
            ? WEATHER_CODES[d.weather_code[i]].description
            : "Unbekannt",
          sunrise: d.sunrise ? d.sunrise[i] : null,
          sunset: d.sunset ? d.sunset[i] : null,
          source: "open-meteo",
        };
      });
    },
    normalizeHourly: function (data) {
      if (!data || !data.hourly || !data.hourly.time) return [];
      const h = data.hourly;
      return h.time.map(function (timestamp, i) {
        const code = h.weather_code ? h.weather_code[i] : 3;
        const datePart = timestamp.split("T")[0];
        const hourPart = timestamp.split("T")[1];
        const hour = parseInt(hourPart ? hourPart.split(":")[0] : "0", 10);
        return {
          timestamp: timestamp,
          date: datePart,
          hour: hour,
          temp: h.temperature_2m ? h.temperature_2m[i] : null,
          temp_avg: h.temperature_2m ? h.temperature_2m[i] : null,
          feels_like: h.apparent_temperature ? h.apparent_temperature[i] : null,
          humidity: h.relative_humidity_2m
            ? h.relative_humidity_2m[i]
            : h.relativehumidity_2m
              ? h.relativehumidity_2m[i]
              : null,
          precip: h.precipitation ? h.precipitation[i] : 0,
          precip_probability: h.precipitation_probability
            ? h.precipitation_probability[i]
            : null,
          wind_speed: h.wind_speed_10m
            ? h.wind_speed_10m[i]
            : h.windspeed_10m
              ? h.windspeed_10m[i]
              : null,
          wind_direction: h.wind_direction_10m
            ? h.wind_direction_10m[i]
            : h.winddirection_10m
              ? h.winddirection_10m[i]
              : null,
          clouds: h.cloud_cover
            ? h.cloud_cover[i]
            : h.cloudcover
              ? h.cloudcover[i]
              : null,
          pressure: h.surface_pressure
            ? h.surface_pressure[i]
            : h.pressure_msl
              ? h.pressure_msl[i]
              : null,
          weather_code: code,
          description: WEATHER_CODES[code]
            ? WEATHER_CODES[code].description
            : "Unbekannt",
          source: "open-meteo",
        };
      });
    },
  };

  const BrightSkyAdapter = {
    name: "BrightSky",
    normalizeCurrent: function (data) {
      if (!data || !data.weather || !data.weather[0]) return null;
      const w = data.weather[0];
      const code = DWD_TO_WMO[w.icon] || 3;
      return {
        temp: w.temperature || null,
        feels_like: w.temperature || null,
        humidity: w.relative_humidity || null,
        pressure: w.pressure_msl || null,
        wind_speed: w.wind_speed || null,
        wind_direction: w.wind_direction || null,
        clouds: w.cloud_cover || null,
        visibility: w.visibility ? w.visibility / 1000 : null,
        uv_index: null,
        precip: w.precipitation || 0,
        weather_code: code,
        description: WEATHER_CODES[code]
          ? WEATHER_CODES[code].description
          : w.condition || "Unbekannt",
        icon: WEATHER_CODES[code] ? WEATHER_CODES[code].icon : "cloudy",
        timestamp: w.timestamp ? new Date(w.timestamp).getTime() : Date.now(),
        source: "brightsky",
      };
    },
    normalizeDaily: function (data) {
      if (!data || !data.weather) return [];
      const byDate = {};
      data.weather.forEach(function (w) {
        const date = w.timestamp ? w.timestamp.split("T")[0] : null;
        if (!date) return;
        if (!byDate[date]) {
          byDate[date] = {
            date: date,
            temps: [],
            precip: 0,
            wind_speeds: [],
            humidity: [],
            sunshine: 0,
            codes: [],
          };
        }
        if (w.temperature !== null && w.temperature !== undefined)
          byDate[date].temps.push(w.temperature);
        if (w.precipitation !== null && w.precipitation !== undefined)
          byDate[date].precip += w.precipitation;
        if (w.wind_speed !== null && w.wind_speed !== undefined)
          byDate[date].wind_speeds.push(w.wind_speed);
        if (w.relative_humidity !== null && w.relative_humidity !== undefined)
          byDate[date].humidity.push(w.relative_humidity);
        if (w.sunshine !== null && w.sunshine !== undefined)
          byDate[date].sunshine += w.sunshine / 60;
        if (w.icon) byDate[date].codes.push(DWD_TO_WMO[w.icon] || 3);
      });
      return Object.keys(byDate)
        .map(function (key) {
          const d = byDate[key];
          return {
            date: d.date,
            temp_min: d.temps.length ? Math.min.apply(null, d.temps) : null,
            temp_max: d.temps.length ? Math.max.apply(null, d.temps) : null,
            temp_avg: d.temps.length
              ? d.temps.reduce(function (a, b) {
                  return a + b;
                }, 0) / d.temps.length
              : null,
            precip: d.precip,
            wind_speed: d.wind_speeds.length
              ? Math.max.apply(null, d.wind_speeds)
              : null,
            humidity: d.humidity.length
              ? d.humidity.reduce(function (a, b) {
                  return a + b;
                }, 0) / d.humidity.length
              : null,
            sunshine: d.sunshine,
            weather_code: d.codes.length
              ? d.codes[Math.floor(d.codes.length / 2)]
              : 3,
            source: "brightsky",
          };
        })
        .sort(function (a, b) {
          return a.date.localeCompare(b.date);
        });
    },
    normalizeHourly: function (data) {
      if (!data || !data.weather) return [];
      return data.weather.map(function (w) {
        const code = DWD_TO_WMO[w.icon] || 3;
        const timestamp = w.timestamp;
        const datePart = timestamp ? timestamp.split("T")[0] : "";
        const hourPart = timestamp ? timestamp.split("T")[1] : "00:00";
        const hour = parseInt(hourPart.split(":")[0], 10);
        return {
          timestamp: timestamp,
          date: datePart,
          hour: hour,
          temp: w.temperature || null,
          temp_avg: w.temperature || null,
          feels_like: w.temperature || null,
          humidity: w.relative_humidity || null,
          precip: w.precipitation || 0,
          wind_speed: w.wind_speed || null,
          wind_direction: w.wind_direction || null,
          clouds: w.cloud_cover || null,
          pressure: w.pressure_msl || null,
          weather_code: code,
          description: WEATHER_CODES[code]
            ? WEATHER_CODES[code].description
            : w.condition || "Unbekannt",
          source: "brightsky",
        };
      });
    },
  };

  const VisualCrossingAdapter = {
    name: "VisualCrossing",
    _mapConditionToWMO: function (conditions) {
      if (!conditions) return 3;
      const cond = conditions.toLowerCase();
      if (cond.indexOf("clear") >= 0 || cond.indexOf("sunny") >= 0) return 0;
      if (
        cond.indexOf("partly cloudy") >= 0 ||
        cond.indexOf("mostly clear") >= 0
      )
        return 2;
      if (cond.indexOf("cloudy") >= 0 || cond.indexOf("overcast") >= 0)
        return 3;
      if (cond.indexOf("fog") >= 0 || cond.indexOf("mist") >= 0) return 45;
      if (cond.indexOf("drizzle") >= 0) return 51;
      if (cond.indexOf("heavy rain") >= 0) return 65;
      if (cond.indexOf("rain") >= 0) return 63;
      if (cond.indexOf("snow") >= 0) return 73;
      if (cond.indexOf("thunderstorm") >= 0) return 95;
      return 3;
    },
    normalizeCurrent: function (data) {
      if (!data || !data.currentConditions) return null;
      const c = data.currentConditions;
      const code = this._mapConditionToWMO(c.conditions);
      return {
        temp: c.temp || null,
        feels_like: c.feelslike || c.temp || null,
        humidity: c.humidity || null,
        pressure: c.pressure || null,
        wind_speed: c.windspeed || null,
        wind_direction: c.winddir || null,
        clouds: c.cloudcover || null,
        visibility: c.visibility || null,
        uv_index: c.uvindex || null,
        precip: c.precip || 0,
        weather_code: code,
        description: WEATHER_CODES[code]
          ? WEATHER_CODES[code].description
          : c.conditions || "Unbekannt",
        icon: WEATHER_CODES[code] ? WEATHER_CODES[code].icon : "cloudy",
        timestamp: c.datetimeEpoch ? c.datetimeEpoch * 1000 : Date.now(),
        source: "visualcrossing",
      };
    },
    normalizeDaily: function (data) {
      if (!data || !data.days) return [];
      var self = this;
      return data.days.map(function (d) {
        const code = self._mapConditionToWMO(d.conditions);
        return {
          date: d.datetime,
          temp_min: d.tempmin || null,
          temp_max: d.tempmax || null,
          temp_avg:
            d.temp ||
            (d.tempmin !== null && d.tempmax !== null
              ? (d.tempmin + d.tempmax) / 2
              : null),
          precip: d.precip || 0,
          precip_probability: d.precipprob || null,
          wind_speed: d.windspeed || null,
          humidity: d.humidity || null,
          sunshine: d.solarenergy ? d.solarenergy / 3.6 : null,
          uv_index: d.uvindex || null,
          weather_code: code,
          description: WEATHER_CODES[code]
            ? WEATHER_CODES[code].description
            : d.conditions || "Unbekannt",
          source: "visualcrossing",
        };
      });
    },
    normalizeHourly: function (data) {
      if (!data || !data.days) return [];
      var hourly = [];
      var self = this;
      data.days.forEach(function (day) {
        if (!day.hours) return;
        day.hours.forEach(function (h) {
          const code = self._mapConditionToWMO(h.conditions);
          const timestamp = day.datetime + "T" + h.datetime;
          const hour = parseInt(h.datetime.split(":")[0], 10);
          hourly.push({
            timestamp: timestamp,
            date: day.datetime,
            hour: hour,
            temp: h.temp || null,
            temp_avg: h.temp || null,
            feels_like: h.feelslike || h.temp || null,
            humidity: h.humidity || null,
            precip: h.precip || 0,
            wind_speed: h.windspeed || null,
            weather_code: code,
            source: "visualcrossing",
          });
        });
      });
      return hourly;
    },
  };

  const OpenWeatherMapAdapter = {
    name: "OpenWeatherMap",
    normalizeCurrent: function (data) {
      if (!data || !data.current) return null;
      const c = data.current;
      const code =
        c.weather && c.weather[0] ? this._mapOWMToWMO(c.weather[0].id) : 3;
      return {
        temp: c.temp || null,
        feels_like: c.feels_like || c.temp || null,
        humidity: c.humidity || null,
        pressure: c.pressure || null,
        wind_speed: c.wind_speed ? c.wind_speed * 3.6 : null, // m/s → km/h
        wind_direction: c.wind_deg || null,
        clouds: c.clouds || null,
        visibility: c.visibility ? c.visibility / 1000 : null, // m → km
        uv_index: c.uvi || null,
        precip:
          (c.rain ? c.rain["1h"] || 0 : 0) + (c.snow ? c.snow["1h"] || 0 : 0),
        weather_code: code,
        description: WEATHER_CODES[code]
          ? WEATHER_CODES[code].description
          : c.weather && c.weather[0]
            ? c.weather[0].description
            : "Unbekannt",
        icon: WEATHER_CODES[code] ? WEATHER_CODES[code].icon : "cloudy",
        timestamp: c.dt ? c.dt * 1000 : Date.now(),
        source: "openweathermap",
      };
    },
    normalizeDaily: function (data) {
      if (!data || !data.daily) return [];
      var self = this;
      return data.daily.map(function (d) {
        const code =
          d.weather && d.weather[0] ? self._mapOWMToWMO(d.weather[0].id) : 3;
        return {
          date: d.dt ? new Date(d.dt * 1000).toISOString().split("T")[0] : null,
          temp_min: d.temp && d.temp.min !== undefined ? d.temp.min : null,
          temp_max: d.temp && d.temp.max !== undefined ? d.temp.max : null,
          temp_avg: d.temp && d.temp.day !== undefined ? d.temp.day : null,
          precip: (d.rain || 0) + (d.snow || 0),
          wind_speed: d.wind_speed ? d.wind_speed * 3.6 : null, // m/s → km/h
          humidity: d.humidity || null,
          uv_index: d.uvi || null,
          weather_code: code,
          description: WEATHER_CODES[code]
            ? WEATHER_CODES[code].description
            : d.weather && d.weather[0]
              ? d.weather[0].description
              : "Unbekannt",
          source: "openweathermap",
        };
      });
    },
    normalizeHourly: function (data) {
      if (!data || !data.hourly) return [];
      var self = this;
      return data.hourly.map(function (h) {
        const code =
          h.weather && h.weather[0] ? self._mapOWMToWMO(h.weather[0].id) : 3;
        const timestamp = h.dt ? new Date(h.dt * 1000).toISOString() : null;
        const date = timestamp ? timestamp.split("T")[0] : null;
        const hour = timestamp
          ? parseInt(timestamp.split("T")[1].split(":")[0], 10)
          : 0;
        return {
          timestamp: timestamp,
          date: date,
          hour: hour,
          temp: h.temp || null,
          temp_avg: h.temp || null,
          feels_like: h.feels_like || h.temp || null,
          humidity: h.humidity || null,
          precip:
            (h.rain ? h.rain["1h"] || 0 : 0) + (h.snow ? h.snow["1h"] || 0 : 0),
          wind_speed: h.wind_speed ? h.wind_speed * 3.6 : null, // m/s → km/h
          weather_code: code,
          source: "openweathermap",
        };
      });
    },
    _mapOWMToWMO: function (owmId) {
      // OpenWeatherMap ID → WMO Code Mapping
      // https://openweathermap.org/weather-conditions
      if (owmId >= 200 && owmId < 300) return 95; // Thunderstorm
      if (owmId >= 300 && owmId < 400) return 51; // Drizzle
      if (owmId >= 500 && owmId < 600) {
        if (owmId >= 502) return 65; // Heavy rain
        if (owmId >= 501) return 63; // Moderate rain
        return 61; // Light rain
      }
      if (owmId >= 600 && owmId < 700) return 73; // Snow
      if (owmId >= 700 && owmId < 800) return 45; // Fog/Mist
      if (owmId === 800) return 0; // Clear
      if (owmId === 801) return 1; // Few clouds
      if (owmId === 802) return 2; // Scattered clouds
      if (owmId >= 803) return 3; // Broken/Overcast clouds
      return 3; // Default: Cloudy
    },
  };

  const MeteostatAdapter = {
    name: "Meteostat",
    normalizeCurrent: function (data) {
      // Meteostat hat keine Current-Weather-API, nur Historical
      // Verwende letzten verfügbaren Tag als "current"
      if (!data || !data.data || data.data.length === 0) return null;
      const latest = data.data[data.data.length - 1];
      var code = 0;
      if (latest.prcp > 10) code = 65;
      else if (latest.prcp > 2) code = 63;
      else if (latest.prcp > 0) code = 61;
      else if (latest.snow && latest.snow > 0) code = 73;

      return {
        temp:
          latest.tavg ||
          (latest.tmin && latest.tmax ? (latest.tmin + latest.tmax) / 2 : null),
        feels_like: latest.tavg || null,
        humidity: null,
        pressure: latest.pres || null,
        wind_speed: latest.wspd || null,
        wind_direction: latest.wdir || null,
        clouds: null,
        visibility: null,
        uv_index: null,
        precip: latest.prcp || 0,
        weather_code: code,
        description: WEATHER_CODES[code]
          ? WEATHER_CODES[code].description
          : "Unbekannt",
        icon: WEATHER_CODES[code] ? WEATHER_CODES[code].icon : "cloudy",
        timestamp: latest.date ? new Date(latest.date).getTime() : Date.now(),
        source: "meteostat",
      };
    },
    normalizeDaily: function (data) {
      if (!data || !data.data) return [];
      return data.data.map(function (d) {
        var code = 0;
        if (d.prcp > 10) code = 65;
        else if (d.prcp > 2) code = 63;
        else if (d.prcp > 0) code = 61;
        else if (d.snow && d.snow > 0) code = 73;
        return {
          date: d.date,
          temp_min: d.tmin || null,
          temp_max: d.tmax || null,
          temp_avg:
            d.tavg ||
            (d.tmin !== null && d.tmax !== null ? (d.tmin + d.tmax) / 2 : null),
          precip: d.prcp || 0,
          wind_speed: d.wspd || null,
          sunshine: d.tsun ? d.tsun / 60 : null,
          weather_code: code,
          source: "meteostat",
        };
      });
    },
    normalizeHourly: function (data) {
      // Meteostat hat keine native Hourly-API
      // Konvertiere Daily-Daten zu pseudo-hourly (Mittagswert)
      if (!data || !data.data) return [];
      return data.data.map(function (d) {
        var code = 0;
        if (d.prcp > 10) code = 65;
        else if (d.prcp > 2) code = 63;
        else if (d.prcp > 0) code = 61;
        else if (d.snow && d.snow > 0) code = 73;
        return {
          timestamp: d.date + "T12:00:00",
          date: d.date,
          hour: 12,
          temp: d.tavg || (d.tmin && d.tmax ? (d.tmin + d.tmax) / 2 : null),
          temp_avg: d.tavg || null,
          feels_like: d.tavg || null,
          humidity: null,
          precip: d.prcp || 0,
          wind_speed: d.wspd || null,
          weather_code: code,
          source: "meteostat",
        };
      });
    },
  };

  // ============================================
  // RETRY SYSTEM
  // ============================================
  function withRetry(fn, name, options) {
    options = options || {};
    const maxAttempts = options.maxAttempts || CONFIG.RETRY.MAX_ATTEMPTS;
    const baseDelay = options.baseDelay || CONFIG.RETRY.BASE_DELAY;
    const backoffMultiplier =
      options.backoffMultiplier || CONFIG.RETRY.BACKOFF_MULTIPLIER;

    return new Promise(function (resolve, reject) {
      var attempt = 0;
      var lastError;

      function tryOnce() {
        attempt++;
        fn()
          .then(resolve)
          .catch(function (error) {
            lastError = error;
            if (error.message && error.message.indexOf("HTTP 4") >= 0) {
              reject(error);
              return;
            }
            if (attempt >= maxAttempts) {
              console.error(
                "❌ [" + name + "] Failed after " + maxAttempts + " attempts:",
                error.message,
              );
              reject(error);
              return;
            }
            var delay = baseDelay * Math.pow(backoffMultiplier, attempt - 1);
            console.warn(
              "⚠️ [" +
                name +
                "] Attempt " +
                attempt +
                "/" +
                maxAttempts +
                " failed, retrying in " +
                delay +
                "ms...",
            );
            setTimeout(tryOnce, delay);
          });
      }
      tryOnce();
    });
  }

  // ============================================
  // DATA MERGER
  // ============================================
  const DataMerger = {
    mergeCurrent: function (results) {
      const priority = [
        "open-meteo",
        "openweathermap",
        "brightsky",
        "visualcrossing",
        "meteostat",
      ];
      const bySource = {};
      results.forEach(function (r) {
        if (r && r.source) bySource[r.source] = r;
      });

      var merged = null;
      priority.forEach(function (source) {
        if (bySource[source]) {
          if (!merged) {
            merged = Object.assign({}, bySource[source]);
          } else {
            Object.keys(bySource[source]).forEach(function (key) {
              if (
                (merged[key] === null || merged[key] === undefined) &&
                bySource[source][key] !== null &&
                bySource[source][key] !== undefined
              ) {
                merged[key] = bySource[source][key];
              }
            });
          }
        }
      });
      if (merged) merged.sources = Object.keys(bySource);
      return merged;
    },
    mergeDaily: function (results) {
      const byDate = {};
      results.forEach(function (sourceData) {
        if (!Array.isArray(sourceData)) return;
        sourceData.forEach(function (day) {
          if (!day.date) return;
          if (!byDate[day.date]) {
            byDate[day.date] = Object.assign({}, day, {
              sources: [day.source],
            });
          } else {
            var existing = byDate[day.date];
            Object.keys(day).forEach(function (key) {
              if (key === "source") return;
              if (
                (existing[key] === null || existing[key] === undefined) &&
                day[key] !== null &&
                day[key] !== undefined
              ) {
                existing[key] = day[key];
              }
            });
            if (existing.sources.indexOf(day.source) < 0)
              existing.sources.push(day.source);
          }
        });
      });
      return Object.keys(byDate)
        .map(function (k) {
          return byDate[k];
        })
        .sort(function (a, b) {
          return a.date.localeCompare(b.date);
        });
    },
    mergeHourly: function (results) {
      const byTimestamp = {};
      results.forEach(function (sourceData) {
        if (!Array.isArray(sourceData)) return;
        sourceData.forEach(function (hour) {
          if (!hour.timestamp) return;
          if (!byTimestamp[hour.timestamp]) {
            byTimestamp[hour.timestamp] = Object.assign({}, hour, {
              sources: [hour.source],
            });
          } else {
            var existing = byTimestamp[hour.timestamp];
            Object.keys(hour).forEach(function (key) {
              if (key === "source") return;
              if (
                (existing[key] === null || existing[key] === undefined) &&
                hour[key] !== null &&
                hour[key] !== undefined
              ) {
                existing[key] = hour[key];
              }
            });
            if (existing.sources.indexOf(hour.source) < 0)
              existing.sources.push(hour.source);
          }
        });
      });
      return Object.keys(byTimestamp)
        .map(function (k) {
          return byTimestamp[k];
        })
        .sort(function (a, b) {
          return a.timestamp.localeCompare(b.timestamp);
        });
    },
  };

  // ============================================
  // MAIN SERVICE CLASS
  // ============================================
  function WeatherDataService(options) {
    this.options = options || {};
    this.cache = global.historyCacheService || null;
  }

  WeatherDataService.prototype._getCache = function () {
    if (!this.cache && global.historyCacheService) {
      this.cache = global.historyCacheService;
    }
    return (
      this.cache || {
        get: function () {
          return null;
        },
        set: function () {},
        generateKey: function (t, s, e, lat, lon) {
          return t + "_" + s + "_" + e + "_" + lat + "_" + lon;
        },
      }
    );
  };

  WeatherDataService.prototype._getApiKey = function (provider) {
    return global.apiKeyManager ? global.apiKeyManager.getKey(provider) : null;
  };

  // ============================================
  // LOAD CURRENT WEATHER
  // ============================================
  WeatherDataService.prototype.loadCurrentWeather = function (
    latitude,
    longitude,
  ) {
    var self = this;
    var cache = this._getCache();
    var today = new Date().toISOString().split("T")[0];
    var cacheKey = cache.generateKey(
      "current",
      today,
      today,
      latitude,
      longitude,
    );
    var cached = cache.get(cacheKey);

    if (cached) {
      console.log("✅ [WeatherDataService] Current weather from cache");
      return Promise.resolve(cached);
    }

    console.log(
      "🌐 [WeatherDataService] Loading current weather for: " +
        latitude +
        ", " +
        longitude,
    );

    // Parallel fetch from multiple sources
    var fetches = [];

    // Open-Meteo current weather
    fetches.push(
      withRetry(
        function () {
          var url =
            "https://api.open-meteo.com/v1/forecast?latitude=" +
            latitude +
            "&longitude=" +
            longitude +
            "&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,rain,weather_code,cloud_cover,visibility,wind_speed_10m,wind_direction_10m,surface_pressure,uv_index" +
            "&wind_speed_unit=kmh&timezone=auto";
          return fetch(url).then(function (r) {
            return r.json();
          });
        },
        { maxAttempts: CONFIG.RETRY.MAX_ATTEMPTS },
      )
        .then(function (data) {
          return {
            source: "open-meteo",
            data: OpenMeteoAdapter.normalizeCurrent(data),
          };
        })
        .catch(function (err) {
          console.warn(
            "[WeatherDataService] Open-Meteo current failed:",
            err.message,
          );
          return { source: "open-meteo", data: null };
        }),
    );

    // BrightSky current weather (for Germany)
    fetches.push(
      withRetry(
        function () {
          var url =
            "https://api.brightsky.dev/current_weather?lat=" +
            latitude +
            "&lon=" +
            longitude;
          return fetch(url).then(function (r) {
            return r.json();
          });
        },
        { maxAttempts: CONFIG.RETRY.MAX_ATTEMPTS },
      )
        .then(function (data) {
          return {
            source: "brightsky",
            data: BrightSkyAdapter.normalizeCurrent(data),
          };
        })
        .catch(function (err) {
          console.warn(
            "[WeatherDataService] BrightSky current failed:",
            err.message,
          );
          return { source: "brightsky", data: null };
        }),
    );

    // VisualCrossing current weather (if API key available)
    var vcKey = self._getApiKey("visualcrossing");
    if (vcKey) {
      fetches.push(
        withRetry(
          function () {
            var url =
              "https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services/timeline/" +
              latitude +
              "," +
              longitude +
              "/today?unitGroup=metric&key=" +
              vcKey +
              "&include=current";
            return fetch(url).then(function (r) {
              return r.json();
            });
          },
          { maxAttempts: CONFIG.RETRY.MAX_ATTEMPTS },
        )
          .then(function (data) {
            return {
              source: "visualcrossing",
              data: VisualCrossingAdapter.normalizeCurrent(data),
            };
          })
          .catch(function (err) {
            console.warn(
              "[WeatherDataService] VisualCrossing current failed:",
              err.message,
            );
            return { source: "visualcrossing", data: null };
          }),
      );
    }

    // OpenWeatherMap current weather (if API key available)
    var owmKey = self._getApiKey("openweathermap");
    if (owmKey) {
      fetches.push(
        withRetry(
          function () {
            var url =
              "https://api.openweathermap.org/data/2.5/weather?lat=" +
              latitude +
              "&lon=" +
              longitude +
              "&appid=" +
              owmKey +
              "&units=metric";
            return fetch(url).then(function (r) {
              return r.json();
            });
          },
          { maxAttempts: CONFIG.RETRY.MAX_ATTEMPTS },
        )
          .then(function (data) {
            // Wrap in format expected by adapter
            return {
              source: "openweathermap",
              data: OpenWeatherMapAdapter.normalizeCurrent({ current: data }),
            };
          })
          .catch(function (err) {
            console.warn(
              "[WeatherDataService] OpenWeatherMap current failed:",
              err.message,
            );
            return { source: "openweathermap", data: null };
          }),
      );
    }

    return Promise.all(fetches).then(function (results) {
      var successfulResults = results.filter(function (r) {
        return r.data !== null;
      });
      console.log(
        "📊 [WeatherDataService] Current weather results: " +
          successfulResults.length +
          "/" +
          results.length +
          " sources succeeded",
      );

      if (successfulResults.length === 0) {
        throw new Error("All current weather sources failed");
      }

      // Merge results (priority: open-meteo > visualcrossing > brightsky)
      var merged = DataMerger.mergeCurrent(
        successfulResults.map(function (r) {
          return r.data;
        }),
      );
      merged.sources = successfulResults.map(function (r) {
        return r.source;
      });

      // Cache for 15 minutes (current data updates more frequently)
      cache.set(cacheKey, merged, 15 * 60 * 1000);

      return merged;
    });
  };

  // ============================================
  // LOAD HISTORY (Daily)
  // ============================================
  WeatherDataService.prototype.loadHistory = function (
    latitude,
    longitude,
    startDate,
    endDate,
  ) {
    var self = this;
    var cache = this._getCache();
    var cacheKey = cache.generateKey(
      "daily",
      startDate,
      endDate,
      latitude,
      longitude,
    );
    var cached = cache.get(cacheKey);
    if (cached) {
      console.log("✅ [WeatherDataService] History from cache");
      return Promise.resolve(cached);
    }

    console.log(
      "🌐 [WeatherDataService] Loading history: " +
        startDate +
        " to " +
        endDate,
    );

    var promises = [];

    // Open-Meteo Historical
    promises.push(
      self
        ._fetchOpenMeteoHistorical(latitude, longitude, startDate, endDate)
        .then(function (r) {
          return { source: "open-meteo", data: r };
        })
        .catch(function (e) {
          return { source: "open-meteo", error: e.message };
        }),
    );

    // BrightSky Historical
    promises.push(
      self
        ._fetchBrightSkyHistorical(latitude, longitude, startDate, endDate)
        .then(function (r) {
          return { source: "brightsky", data: r };
        })
        .catch(function (e) {
          return { source: "brightsky", error: e.message };
        }),
    );

    // Visual Crossing (optional)
    var vcKey = self._getApiKey("visualcrossing");
    if (vcKey) {
      promises.push(
        self
          ._fetchVisualCrossingHistorical(
            latitude,
            longitude,
            startDate,
            endDate,
            vcKey,
          )
          .then(function (r) {
            return { source: "visualcrossing", data: r };
          })
          .catch(function (e) {
            return { source: "visualcrossing", error: e.message };
          }),
      );
    }

    // OpenWeatherMap Historical (if API key available - uses One Call 3.0)
    var owmKey = self._getApiKey("openweathermap");
    if (owmKey) {
      promises.push(
        self
          ._fetchOpenWeatherMapHistorical(
            latitude,
            longitude,
            startDate,
            endDate,
            owmKey,
          )
          .then(function (r) {
            return { source: "openweathermap", data: r };
          })
          .catch(function (e) {
            return { source: "openweathermap", error: e.message };
          }),
      );
    }

    // Meteostat (optional)
    var msKey = self._getApiKey("meteostat");
    promises.push(
      self
        ._fetchMeteostatHistorical(
          latitude,
          longitude,
          startDate,
          endDate,
          msKey,
        )
        .then(function (r) {
          return { source: "meteostat", data: r };
        })
        .catch(function (e) {
          return { source: "meteostat", error: e.message };
        }),
    );

    return Promise.all(promises).then(function (results) {
      var dailyResults = [];
      results.forEach(function (result) {
        if (result.data && result.data.length > 0) {
          dailyResults.push(result.data);
          console.log(
            "✅ [" +
              result.source +
              "] History: " +
              result.data.length +
              " days",
          );
        } else if (result.error) {
          console.warn("⚠️ [" + result.source + "] Error: " + result.error);
        }
      });

      var merged = DataMerger.mergeDaily(dailyResults);
      if (merged.length > 0) {
        cache.set(cacheKey, merged);
        return merged;
      }

      // Fallback to gridFields
      if (global.gridFieldsAPI && global.gridFieldsAPI.fetchHistoricalData) {
        return global.gridFieldsAPI
          .fetchHistoricalData(latitude, longitude, startDate, endDate)
          .then(function (data) {
            if (data && data.length > 0) {
              cache.set(cacheKey, data);
              return data;
            }
            return [];
          })
          .catch(function () {
            return [];
          });
      }
      return [];
    });
  };

  // ============================================
  // LOAD HOURLY HISTORY
  // ============================================
  WeatherDataService.prototype.loadHourlyHistory = function (
    latitude,
    longitude,
    startDate,
    endDate,
  ) {
    var self = this;
    var cache = this._getCache();
    var cacheKey = cache.generateKey(
      "hourly",
      startDate,
      endDate,
      latitude,
      longitude,
    );
    var cached = cache.get(cacheKey);
    if (cached) {
      console.log("✅ [WeatherDataService] Hourly history from cache");
      return Promise.resolve({ hourly: cached, source: "cache" });
    }

    console.log(
      "🌐 [WeatherDataService] Loading hourly history: " +
        startDate +
        " to " +
        endDate,
    );

    var promises = [];

    // Open-Meteo Hourly Historical
    promises.push(
      self
        ._fetchOpenMeteoHourlyHistorical(
          latitude,
          longitude,
          startDate,
          endDate,
        )
        .then(function (r) {
          return { source: "open-meteo", data: r };
        })
        .catch(function (e) {
          return { source: "open-meteo", error: e.message };
        }),
    );

    // BrightSky Hourly Historical
    promises.push(
      self
        ._fetchBrightSkyHourlyHistorical(
          latitude,
          longitude,
          startDate,
          endDate,
        )
        .then(function (r) {
          return { source: "brightsky", data: r };
        })
        .catch(function (e) {
          return { source: "brightsky", error: e.message };
        }),
    );

    // Visual Crossing (optional)
    var vcKey = self._getApiKey("visualcrossing");
    if (vcKey) {
      promises.push(
        self
          ._fetchVisualCrossingHourlyHistorical(
            latitude,
            longitude,
            startDate,
            endDate,
            vcKey,
          )
          .then(function (r) {
            return { source: "visualcrossing", data: r };
          })
          .catch(function (e) {
            return { source: "visualcrossing", error: e.message };
          }),
      );
    }

    // OpenWeatherMap Hourly Historical (if API key available)
    var owmKey = self._getApiKey("openweathermap");
    if (owmKey) {
      promises.push(
        self
          ._fetchOpenWeatherMapHourlyHistorical(
            latitude,
            longitude,
            startDate,
            endDate,
            owmKey,
          )
          .then(function (r) {
            return { source: "openweathermap", data: r };
          })
          .catch(function (e) {
            return { source: "openweathermap", error: e.message };
          }),
      );
    }

    // Meteostat Hourly (pseudo-hourly from daily)
    var msKey = self._getApiKey("meteostat");
    promises.push(
      self
        ._fetchMeteostatHistorical(
          latitude,
          longitude,
          startDate,
          endDate,
          msKey,
        )
        .then(function (r) {
          return {
            source: "meteostat",
            data: MeteostatAdapter.normalizeHourly({ data: r }),
          };
        })
        .catch(function (e) {
          return { source: "meteostat", error: e.message };
        }),
    );

    return Promise.all(promises).then(function (results) {
      var hourlyResults = [];
      results.forEach(function (result) {
        if (result.data && result.data.length > 0) {
          hourlyResults.push(result.data);
          console.log(
            "✅ [" +
              result.source +
              "] Hourly: " +
              result.data.length +
              " hours",
          );
        } else if (result.error) {
          console.warn("⚠️ [" + result.source + "] Error: " + result.error);
        }
      });

      var merged = DataMerger.mergeHourly(hourlyResults);
      if (merged.length > 0) {
        cache.set(cacheKey, merged);
        return { hourly: merged, source: "multi-source" };
      }

      // Fallback to daily data
      console.log("[WeatherDataService] Falling back to daily data");
      return self
        .loadHistory(latitude, longitude, startDate, endDate)
        .then(function (dailyData) {
          if (dailyData.length > 0) {
            var pseudoHourly = dailyData.map(function (day) {
              return {
                timestamp: day.date + "T12:00:00",
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
              };
            });
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
        });
    });
  };

  // ============================================
  // INTERNAL FETCH METHODS
  // ============================================
  WeatherDataService.prototype._fetchOpenMeteoHistorical = function (
    lat,
    lon,
    startDate,
    endDate,
  ) {
    return withRetry(function () {
      var url =
        "https://archive-api.open-meteo.com/v1/archive?latitude=" +
        lat +
        "&longitude=" +
        lon +
        "&start_date=" +
        startDate +
        "&end_date=" +
        endDate +
        "&daily=temperature_2m_max,temperature_2m_min,temperature_2m_mean,precipitation_sum,wind_speed_10m_max,sunshine_duration,weather_code&timezone=auto";
      return fetch(url, {
        signal: AbortSignal.timeout
          ? AbortSignal.timeout(CONFIG.TIMEOUT.HISTORICAL)
          : undefined,
      })
        .then(function (response) {
          if (!response.ok) throw new Error("HTTP " + response.status);
          return response.json();
        })
        .then(function (data) {
          return OpenMeteoAdapter.normalizeDaily(data);
        });
    }, "Open-Meteo Historical");
  };

  WeatherDataService.prototype._fetchOpenMeteoHourlyHistorical = function (
    lat,
    lon,
    startDate,
    endDate,
  ) {
    return withRetry(function () {
      var url =
        "https://archive-api.open-meteo.com/v1/archive?latitude=" +
        lat +
        "&longitude=" +
        lon +
        "&start_date=" +
        startDate +
        "&end_date=" +
        endDate +
        "&hourly=temperature_2m,relative_humidity_2m,precipitation,weather_code,surface_pressure,cloud_cover,wind_speed_10m,wind_direction_10m&timezone=auto";
      return fetch(url, {
        signal: AbortSignal.timeout
          ? AbortSignal.timeout(CONFIG.TIMEOUT.HISTORICAL)
          : undefined,
      })
        .then(function (response) {
          if (!response.ok) throw new Error("HTTP " + response.status);
          return response.json();
        })
        .then(function (data) {
          return OpenMeteoAdapter.normalizeHourly(data);
        });
    }, "Open-Meteo Hourly Historical");
  };

  WeatherDataService.prototype._fetchBrightSkyHistorical = function (
    lat,
    lon,
    startDate,
    endDate,
  ) {
    return withRetry(function () {
      var url =
        "https://api.brightsky.dev/weather?lat=" +
        lat +
        "&lon=" +
        lon +
        "&date=" +
        startDate +
        "&last_date=" +
        endDate;
      return fetch(url, {
        signal: AbortSignal.timeout
          ? AbortSignal.timeout(CONFIG.TIMEOUT.HISTORICAL)
          : undefined,
      })
        .then(function (response) {
          if (!response.ok) throw new Error("HTTP " + response.status);
          return response.json();
        })
        .then(function (data) {
          return BrightSkyAdapter.normalizeDaily(data);
        });
    }, "BrightSky Historical");
  };

  WeatherDataService.prototype._fetchBrightSkyHourlyHistorical = function (
    lat,
    lon,
    startDate,
    endDate,
  ) {
    return withRetry(function () {
      var url =
        "https://api.brightsky.dev/weather?lat=" +
        lat +
        "&lon=" +
        lon +
        "&date=" +
        startDate +
        "&last_date=" +
        endDate;
      return fetch(url, {
        signal: AbortSignal.timeout
          ? AbortSignal.timeout(CONFIG.TIMEOUT.HISTORICAL)
          : undefined,
      })
        .then(function (response) {
          if (!response.ok) throw new Error("HTTP " + response.status);
          return response.json();
        })
        .then(function (data) {
          return BrightSkyAdapter.normalizeHourly(data);
        });
    }, "BrightSky Hourly Historical");
  };

  WeatherDataService.prototype._fetchVisualCrossingHistorical = function (
    lat,
    lon,
    startDate,
    endDate,
    apiKey,
  ) {
    return withRetry(function () {
      var url =
        "https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services/timeline/" +
        lat +
        "," +
        lon +
        "/" +
        startDate +
        "/" +
        endDate +
        "?unitGroup=metric&include=days&key=" +
        apiKey +
        "&contentType=json";
      return fetch(url, {
        signal: AbortSignal.timeout
          ? AbortSignal.timeout(CONFIG.TIMEOUT.HISTORICAL)
          : undefined,
      })
        .then(function (response) {
          if (!response.ok) throw new Error("HTTP " + response.status);
          return response.json();
        })
        .then(function (data) {
          return VisualCrossingAdapter.normalizeDaily(data);
        });
    }, "VisualCrossing Historical");
  };

  WeatherDataService.prototype._fetchVisualCrossingHourlyHistorical = function (
    lat,
    lon,
    startDate,
    endDate,
    apiKey,
  ) {
    return withRetry(function () {
      var url =
        "https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services/timeline/" +
        lat +
        "," +
        lon +
        "/" +
        startDate +
        "/" +
        endDate +
        "?unitGroup=metric&include=hours&key=" +
        apiKey +
        "&contentType=json";
      return fetch(url, {
        signal: AbortSignal.timeout
          ? AbortSignal.timeout(CONFIG.TIMEOUT.HISTORICAL)
          : undefined,
      })
        .then(function (response) {
          if (!response.ok) throw new Error("HTTP " + response.status);
          return response.json();
        })
        .then(function (data) {
          return VisualCrossingAdapter.normalizeHourly(data);
        });
    }, "VisualCrossing Hourly Historical");
  };

  WeatherDataService.prototype._fetchOpenWeatherMapHistorical = function (
    lat,
    lon,
    startDate,
    endDate,
    apiKey,
  ) {
    // OpenWeatherMap One Call 3.0 supports historical data via Time Machine
    // For free tier, we'll try to use daily aggregates (limited availability)
    return withRetry(function () {
      // Calculate timestamps for start/end (Unix epoch)
      var start = Math.floor(new Date(startDate).getTime() / 1000);
      var end = Math.floor(new Date(endDate).getTime() / 1000);
      var days = Math.ceil((end - start) / 86400);

      // Note: Historical data in OWM requires paid subscription for One Call 3.0
      // This is a best-effort implementation
      var url =
        "https://api.openweathermap.org/data/3.0/onecall/timemachine?lat=" +
        lat +
        "&lon=" +
        lon +
        "&dt=" +
        start +
        "&appid=" +
        apiKey +
        "&units=metric";

      return fetch(url, {
        signal: AbortSignal.timeout
          ? AbortSignal.timeout(CONFIG.TIMEOUT.HISTORICAL)
          : undefined,
      })
        .then(function (response) {
          if (!response.ok) throw new Error("HTTP " + response.status);
          return response.json();
        })
        .then(function (data) {
          return OpenWeatherMapAdapter.normalizeDaily(data);
        });
    }, "OpenWeatherMap Historical");
  };

  WeatherDataService.prototype._fetchOpenWeatherMapHourlyHistorical = function (
    lat,
    lon,
    startDate,
    endDate,
    apiKey,
  ) {
    // OWM One Call 3.0 Time Machine for hourly historical data
    return withRetry(function () {
      var start = Math.floor(new Date(startDate).getTime() / 1000);
      var url =
        "https://api.openweathermap.org/data/3.0/onecall/timemachine?lat=" +
        lat +
        "&lon=" +
        lon +
        "&dt=" +
        start +
        "&appid=" +
        apiKey +
        "&units=metric";

      return fetch(url, {
        signal: AbortSignal.timeout
          ? AbortSignal.timeout(CONFIG.TIMEOUT.HISTORICAL)
          : undefined,
      })
        .then(function (response) {
          if (!response.ok) throw new Error("HTTP " + response.status);
          return response.json();
        })
        .then(function (data) {
          return OpenWeatherMapAdapter.normalizeHourly(data);
        });
    }, "OpenWeatherMap Hourly Historical");
  };

  WeatherDataService.prototype._fetchMeteostatHistorical = function (
    lat,
    lon,
    startDate,
    endDate,
    apiKey,
  ) {
    return withRetry(function () {
      var headers = { "Content-Type": "application/json" };
      if (apiKey) headers["x-rapidapi-key"] = apiKey;
      var url =
        "https://meteostat.p.rapidapi.com/point/daily?lat=" +
        lat +
        "&lon=" +
        lon +
        "&start=" +
        startDate +
        "&end=" +
        endDate;
      return fetch(url, {
        headers: headers,
        signal: AbortSignal.timeout
          ? AbortSignal.timeout(CONFIG.TIMEOUT.HISTORICAL)
          : undefined,
      })
        .then(function (response) {
          if (!response.ok) throw new Error("HTTP " + response.status);
          return response.json();
        })
        .then(function (data) {
          return MeteostatAdapter.normalizeDaily(data);
        });
    }, "Meteostat Historical");
  };

  // ============================================
  // SINGLETON
  // ============================================
  var weatherDataService = new WeatherDataService();

  // Global registration
  global.WeatherDataService = WeatherDataService;
  global.weatherDataService = weatherDataService;

  console.log(
    "✅ [WeatherDataServiceBrowser] Loaded - Parallel Multi-Source Architecture",
  );
})(typeof window !== "undefined" ? window : this);
