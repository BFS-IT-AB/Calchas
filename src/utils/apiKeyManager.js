/**
 * API Key Manager - Zentralisierte Verwaltung aller API-Keys
 *
 * Live-Seite: Speichert und stellt API-Keys bereit, die von anderen
 * Modulen (z. B. `openweathermap`, `visualcrossing`) verwendet werden.
 * Bei Erststart werden ggf. Demo-Keys geladen; Benutzer können eigene Keys
 * in den Einstellungen hinterlegen.
 */

class APIKeyManager {
  constructor() {
    this.keys = {
      openweathermap: null,
      visualcrossing: null,
      meteostat: null,
    };
    this.loadKeys();
    this._purgeStaleDemoKeys();
  }

  /**
   * Lädt alle gespeicherten API-Keys aus localStorage
   */
  loadKeys() {
    try {
      this.keys.openweathermap =
        localStorage.getItem("wetter_api_openweathermap") || null;
      this.keys.visualcrossing =
        localStorage.getItem("wetter_api_visualcrossing") || null;
      this.keys.meteostat =
        localStorage.getItem("wetter_api_meteostat") || null;
      console.log("✅ API Keys geladen:", {
        openweathermap: !!this.keys.openweathermap,
        visualcrossing: !!this.keys.visualcrossing,
        meteostat: !!this.keys.meteostat,
      });
    } catch (e) {
      console.warn("Fehler beim Laden der API-Keys:", e);
    }
  }

  _purgeStaleDemoKeys() {
    const runtimeOverrides =
      typeof window !== "undefined" &&
      window.__APP_STALE_API_KEYS &&
      typeof window.__APP_STALE_API_KEYS === "object"
        ? window.__APP_STALE_API_KEYS
        : {};

    const toSet = (value) => {
      if (!value) return new Set();
      if (value instanceof Set) return value;
      if (Array.isArray(value)) {
        return new Set(value.filter(Boolean));
      }
      if (typeof value === "string") {
        return new Set([value]);
      }
      return new Set();
    };

    const defaultStale = {
      openweathermap: new Set(),
      visualcrossing: new Set(),
      meteostat: new Set(),
    };

    const staleKeys = Object.keys(defaultStale).reduce((acc, provider) => {
      acc[provider] = toSet(
        runtimeOverrides[provider] || defaultStale[provider]
      );
      return acc;
    }, {});

    Object.entries(staleKeys).forEach(([provider, blacklist]) => {
      const key = this.keys[provider];
      if (key && blacklist.has(key)) {
        this.keys[provider] = null;
        try {
          localStorage.removeItem(`wetter_api_${provider}`);
        } catch (e) {
          console.warn(`Konnte Demo-Key für ${provider} nicht entfernen`, e);
        }
        console.info(
          `🔁 Demo-Key für ${provider} wurde entfernt – bitte eigenen API-Key hinterlegen.`
        );
      }
    });
  }

  /**
   * Speichert einen API-Key
   * @param {string} provider - API Provider (openweathermap, visualcrossing, meteostat)
   * @param {string} key - API Key
   */
  setKey(provider, key) {
    if (!["openweathermap", "visualcrossing", "meteostat"].includes(provider)) {
      console.error("Unbekannter API Provider:", provider);
      return false;
    }

    try {
      const trimmedKey = key ? key.trim() : "";
      let persisted = false;
      if (trimmedKey) {
        try {
          localStorage.setItem(`wetter_api_${provider}`, trimmedKey);
          persisted = true;
        } catch (storageError) {
          console.warn(
            `Persistieren des ${provider} API-Keys fehlgeschlagen – verwende nur In-Memory-Key`,
            storageError
          );
        }
        this.keys[provider] = trimmedKey;
        console.log(
          `✅ ${provider} API-Key gespeichert${
            persisted ? "" : " (nicht persistent)"
          }`
        );
        return true;
      }

      // Leerer Key = Löschen
      try {
        localStorage.removeItem(`wetter_api_${provider}`);
      } catch (storageError) {
        console.warn(
          `Persistenter ${provider} API-Key konnte nicht entfernt werden`,
          storageError
        );
      }
      this.keys[provider] = null;
      console.log(`🗑️ ${provider} API-Key entfernt`);
      return true;
    } catch (e) {
      console.error(`Fehler beim Speichern des ${provider} API-Keys:`, e);
      return false;
    }
  }

  /**
   * Gibt einen API-Key zurück
   * @param {string} provider - API Provider
   * @returns {string|null} - API Key oder null
   */
  getKey(provider) {
    return this.keys[provider] || null;
  }

  /**
   * Prüft ob ein API-Key vorhanden ist
   * @param {string} provider - API Provider
   * @returns {boolean}
   */
  hasKey(provider) {
    return !!this.keys[provider];
  }

  /**
   * Gibt alle verfügbaren APIs zurück
   * @returns {string[]} - Array von Provider-Namen mit Keys
   */
  getAvailableAPIs() {
    return Object.keys(this.keys).filter((provider) => this.hasKey(provider));
  }

  /**
   * Setzt Default-Keys (z.B. beim ersten Start)
   * @param {object} defaults - { provider: key, ... }
   */
  setDefaults(defaults) {
    Object.keys(defaults).forEach((provider) => {
      if (!this.hasKey(provider) && defaults[provider]) {
        this.setKey(provider, defaults[provider]);
      }
    });
  }

  /**
   * Exportiert alle Keys (für Backup)
   * @returns {object} - { provider: key, ... }
   */
  exportKeys() {
    return { ...this.keys };
  }

  /**
   * Importiert Keys (für Restore)
   * @param {object} keys - { provider: key, ... }
   */
  importKeys(keys) {
    Object.keys(keys).forEach((provider) => {
      if (keys[provider]) {
        this.setKey(provider, keys[provider]);
      }
    });
  }
}

// Global verfügbar machen
window.APIKeyManager = APIKeyManager;
window.apiKeyManager = new APIKeyManager();
