/* Caching-Logik für API-Antworten */

class CacheManager {
  constructor() {
    this.cache = new Map();
    this.ttl = {
      WEATHER: 30 * 60 * 1000, // 30 Minuten für Wetterdaten
      GEO: 7 * 24 * 60 * 60 * 1000, // 7 Tage für Geo-Daten
      FORECAST: 60 * 60 * 1000, // 1 Stunde für Vorhersagen
    };
  }

  /**
   * Speichert Daten im Cache
   * @param {string} key - Cache-Schlüssel
   * @param {*} value - Zu speichernder Wert
   * @param {string} type - Cache-Typ (WEATHER, GEO, FORECAST)
   */
  set(key, value, type = "WEATHER") {
    const expireTime = Date.now() + this.ttl[type];
    this.cache.set(key, {
      value,
      expireTime,
      createdAt: Date.now(),
      type,
    });
    this._saveToLocalStorage(key);
  }

  /**
   * Holt Daten aus dem Cache
   * @param {string} key - Cache-Schlüssel
   * @returns {*} - Gecachter Wert oder null wenn abgelaufen
   */
  get(key) {
    const cached = this.cache.get(key) || this._loadFromLocalStorage(key);

    if (!cached) {
      return null;
    }

    // Prüfe ob Cache abgelaufen ist
    if (cached.expireTime < Date.now()) {
      this.delete(key);
      return null;
    }

    this._emitAnalyticsEvent("cache_hit", {
      key,
      type: cached.type || "unknown",
      ageMs: Date.now() - (cached.createdAt || Date.now()),
    });

    return cached.value;
  }

  /**
   * Prüft ob ein Cache-Eintrag existiert und noch gültig ist
   * @param {string} key - Cache-Schlüssel
   * @returns {boolean}
   */
  has(key) {
    return this.get(key) !== null;
  }

  /**
   * Löscht einen Cache-Eintrag
   * @param {string} key - Cache-Schlüssel
   */
  delete(key) {
    this.cache.delete(key);
    localStorage.removeItem(`cache_${key}`);
  }

  /**
   * Löscht alle Cache-Einträge
   */
  clear() {
    this.cache.clear();
    // Lösche alle Cache-Einträge aus localStorage
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key.startsWith("cache_")) {
        localStorage.removeItem(key);
      }
    }
    this._emitAnalyticsEvent("cache_clear", { scope: "all" });
  }

  /**
   * Gibt Cache-Statistiken zurück
   * @returns {object} - Anzahl und Größe der Cache-Einträge
   */
  getStats() {
    let totalSize = 0;
    const entries = [];

    this.cache.forEach((item, key) => {
      const size = JSON.stringify(item.value).length;
      totalSize += size;
      entries.push({
        key,
        type: item.type,
        size,
        age: Date.now() - item.createdAt,
        expiresIn: item.expireTime - Date.now(),
      });
    });

    return {
      totalEntries: this.cache.size,
      totalSize: totalSize,
      entries,
    };
  }

  /**
   * Löscht abgelaufene Cache-Einträge
   */
  cleanupExpired() {
    let cleaned = 0;
    this.cache.forEach((item, key) => {
      if (item.expireTime < Date.now()) {
        this.delete(key);
        cleaned++;
      }
    });
    return cleaned;
  }

  /**
   * Speichert Cache in localStorage
   * Handles QuotaExceededError with automatic cleanup
   * @private
   */
  _saveToLocalStorage(key) {
    try {
      const item = this.cache.get(key);
      if (item) {
        localStorage.setItem(`cache_${key}`, JSON.stringify(item));
      }
    } catch (e) {
      if (e.name === "QuotaExceededError" || e.code === 22 || e.code === 1014) {
        console.warn("localStorage quota exceeded, cleaning up old entries...");
        this._handleQuotaExceeded(key);
      } else {
        console.warn("localStorage voll oder deaktiviert:", e);
      }
    }
  }

  /**
   * Handles QuotaExceededError by removing oldest entries
   * @private
   */
  _handleQuotaExceeded(retryKey) {
    try {
      // 1. Sammle alle cache_* Einträge mit Alter
      const cacheEntries = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith("cache_")) {
          try {
            const item = JSON.parse(localStorage.getItem(key));
            cacheEntries.push({
              key,
              createdAt: item.createdAt || 0,
              size: localStorage.getItem(key).length,
            });
          } catch (parseErr) {
            // Korrupter Eintrag - sofort löschen
            localStorage.removeItem(key);
          }
        }
      }

      // 2. Sortiere nach Alter (älteste zuerst)
      cacheEntries.sort((a, b) => a.createdAt - b.createdAt);

      // 3. Lösche älteste 25% der Einträge
      const deleteCount = Math.max(1, Math.ceil(cacheEntries.length * 0.25));
      let freedSpace = 0;
      for (let i = 0; i < deleteCount && i < cacheEntries.length; i++) {
        freedSpace += cacheEntries[i].size;
        localStorage.removeItem(cacheEntries[i].key);
        this.cache.delete(cacheEntries[i].key.replace("cache_", ""));
      }

      console.log(
        `Cache cleanup: Removed ${deleteCount} entries, freed ~${(freedSpace / 1024).toFixed(1)}KB`,
      );

      // 4. Versuche erneut zu speichern
      if (retryKey) {
        const item = this.cache.get(retryKey);
        if (item) {
          try {
            localStorage.setItem(`cache_${retryKey}`, JSON.stringify(item));
          } catch (retryErr) {
            console.warn(
              "Storage still full after cleanup, skipping localStorage save",
            );
          }
        }
      }

      this._emitAnalyticsEvent("cache_quota_cleanup", {
        deletedEntries: deleteCount,
        freedSpace,
      });
    } catch (cleanupErr) {
      console.error("Cache quota cleanup failed:", cleanupErr);
    }
  }

  /**
   * Lädt Cache aus localStorage
   * @private
   */
  _loadFromLocalStorage(key) {
    try {
      const stored = localStorage.getItem(`cache_${key}`);
      if (stored) {
        const item = JSON.parse(stored);
        this.cache.set(key, item);
        return item;
      }
    } catch (e) {
      console.warn("Fehler beim Laden aus localStorage:", e);
    }
    return null;
  }

  _emitAnalyticsEvent(type, detail = {}) {
    try {
      if (typeof window !== "undefined" && window.logAnalyticsEvent) {
        window.logAnalyticsEvent(type, {
          ...detail,
          timestamp: Date.now(),
        });
      }
    } catch (e) {
      console.warn("Analytics Event konnte nicht gesendet werden:", e);
    }
  }
}

/**
 * Spezialisierter Cache für Wetter-API-Anfragen
 */
class WeatherCache extends CacheManager {
  /**
   * Speichert Wetterdaten für eine Location
   * @param {string} city - Stadtname
   * @param {object} data - Wetterdaten
   */
  setWeather(city, data) {
    const key = this._normalizeCity(city);
    this.set(key, data, "WEATHER");
  }

  /**
   * Holt Wetterdaten für eine Location
   * @param {string} city - Stadtname
   * @returns {object|null}
   */
  getWeather(city) {
    const key = this._normalizeCity(city);
    return this.get(key);
  }

  /**
   * Speichert Geo-Koordinaten
   * @param {string} city - Stadtname
   * @param {object} geoData - {lat, lon, displayName}
   */
  setGeo(city, geoData) {
    const key = `geo_${this._normalizeCity(city)}`;
    this.set(key, geoData, "GEO");
  }

  /**
   * Holt Geo-Koordinaten
   * @param {string} city - Stadtname
   * @returns {object|null}
   */
  getGeo(city) {
    const key = `geo_${this._normalizeCity(city)}`;
    return this.get(key);
  }

  /**
   * Speichert Vorhersage-Daten
   * @param {string} city - Stadtname
   * @param {string} source - API-Quelle (openmeteo, brightsky)
   * @param {object} data - Vorhersage-Daten
   */
  setForecast(city, source, data) {
    const key = `forecast_${this._normalizeCity(city)}_${source}`;
    this.set(key, data, "FORECAST");
  }

  /**
   * Holt Vorhersage-Daten
   * @param {string} city - Stadtname
   * @param {string} source - API-Quelle
   * @returns {object|null}
   */
  getForecast(city, source) {
    const key = `forecast_${this._normalizeCity(city)}_${source}`;
    return this.get(key);
  }

  /**
   * Normalisiert Stadtnamen für konsistente Cache-Keys
   * @private
   */
  _normalizeCity(city) {
    return city.trim().toLowerCase().replace(/\s+/g, "_");
  }

  /**
   * Gibt Wetter-spezifische Statistiken zurück
   */
  getWeatherStats() {
    const stats = this.getStats();
    const grouped = {
      weather: [],
      geo: [],
      forecast: [],
    };

    stats.entries.forEach((entry) => {
      if (entry.type === "WEATHER") {
        grouped.weather.push(entry);
      } else if (entry.type === "GEO") {
        grouped.geo.push(entry);
      } else if (entry.type === "FORECAST") {
        grouped.forecast.push(entry);
      }
    });

    return {
      ...stats,
      byType: grouped,
    };
  }
}

// Globale Cache-Instanzen
const weatherCache = new WeatherCache();

/**
 * Hilfsfunktion - Cache invalidieren nach X Zeit
 */
function setCacheInvalidation() {
  // Räume jeden Minute abgelaufene Einträge auf
  setInterval(() => {
    const cleaned = weatherCache.cleanupExpired();
    if (cleaned > 0) {
      console.log(
        `🧹 Cache bereinigt: ${cleaned} abgelaufene Einträge entfernt`,
      );
    }
  }, 60 * 1000); // 60 Sekunden
}

/**
 * Logging für Cache-Operationen
 */
function logCache(operation, key, success = true) {
  const emoji = success ? "✅" : "❌";
  console.log(`${emoji} Cache ${operation}: ${key}`);
}
