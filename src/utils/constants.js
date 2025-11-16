/* Konstanten (API-URLs, etc.) */

// ============================================
// API ENDPOINTS
// ============================================

const API_ENDPOINTS = {
  // Nominatim - Geolocation
  NOMINATIM: {
    BASE: "https://nominatim.openstreetmap.org/search",
    TIMEOUT: 5000,
    PARAMS: {
      format: "json",
      limit: 5,
      addressdetails: 1,
      countrycodes: "de,at,ch", // Optional: auf DACH-Länder beschränken
    },
  },

  // Open-Meteo - Wetter-Vorhersage (kostenlos, kein API-Key nötig)
  OPEN_METEO: {
    BASE: "https://api.open-meteo.com/v1/forecast",
    TIMEOUT: 5000,
    PARAMS: {
      hourly:
        "temperature_2m,apparent_temperature,dewpoint_2m,relativehumidity_2m,weathercode,windspeed_10m,winddirection_10m,pressure_msl,precipitation,precipitation_probability,uv_index,uv_index_clear_sky,is_day",
      daily:
        "weathercode,temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max,uv_index_clear_sky_max,precipitation_sum,precipitation_hours",
      timezone: "auto",
      forecast_days: 7,
    },
  },

  // BrightSky - Deutsche Wetterdaten
  BRIGHTSKY: {
    BASE: "https://api.brightsky.dev/weather",
    TIMEOUT: 5000,
    PARAMS: {
      max_age: 3600, // Maximales Alter in Sekunden
    },
  },

  // Open-Meteo Geocoding (Alternative zu Nominatim)
  GEOCODING: {
    BASE: "https://geocoding-api.open-meteo.com/v1/search",
    TIMEOUT: 5000,
    PARAMS: {
      language: "de",
      count: 5,
      format: "json",
    },
  },

  BIGDATACLOUD: {
    BASE: "https://api.bigdatacloud.net/data/reverse-geocode-client",
    TIMEOUT: 4500,
  },

  SUNRISE_SUNSET: {
    BASE: "https://api.sunrise-sunset.org/json",
    TIMEOUT: 4500,
  },

  MOONPHASE: {
    BASE: "https://api.phaseofthemoontoday.com/v1",
    TIMEOUT: 6000,
  },

  CURRENT_UV: {
    BASE: "https://api.openuv.io/api/v1/uv",
    TIMEOUT: 5000,
  },

  AIR_QUALITY: {
    BASE: "https://api.waqi.info/feed",
    TIMEOUT: 5000,
  },

  VISUALIZATION: {
    BASE: "https://api.weatherbit.io/v2.0/current",
    TIMEOUT: 5000,
  },

  MAPTILER_WEATHER: {
    BASE: "https://api.maptiler.com/weather/forecast",
    TILE_BASE: "https://api.maptiler.com/weather",
    TIMEOUT: 5000,
  },
};

// ============================================
// WETTER-CODES (WMO Weather Codes)
// ============================================

const WEATHER_CODES = {
  // Klarer Himmel
  0: { emoji: "☀️", description: "Klarer Himmel", color: "#FFD700" },
  1: { emoji: "🌤️", description: "Meist klar", color: "#FFA500" },
  2: { emoji: "⛅", description: "Teilweise bewölkt", color: "#A9A9A9" },
  3: { emoji: "☁️", description: "Bewölkt", color: "#808080" },
  45: { emoji: "🌫️", description: "Neblig", color: "#696969" },
  48: { emoji: "🌫️", description: "Raureif", color: "#708090" },

  // Nieselregen
  51: { emoji: "🌦️", description: "Leichter Nieselregen", color: "#4682B4" },
  53: { emoji: "🌧️", description: "Moderater Nieselregen", color: "#36648B" },
  55: { emoji: "🌧️", description: "Dichter Nieselregen", color: "#27408B" },

  // Regen
  61: { emoji: "🌧️", description: "Leichter Regen", color: "#4682B4" },
  63: { emoji: "🌧️", description: "Moderater Regen", color: "#36648B" },
  65: { emoji: "⛈️", description: "Starkregen", color: "#1E90FF" },

  // Schnee
  71: { emoji: "🌨️", description: "Leichter Schneefall", color: "#B0E0E6" },
  73: { emoji: "🌨️", description: "Moderater Schneefall", color: "#87CEEB" },
  75: { emoji: "❄️", description: "Starker Schneefall", color: "#00BFFF" },
  77: { emoji: "❄️", description: "Schneekörner", color: "#6495ED" },

  // Regenschauer
  80: { emoji: "🚿", description: "Leichte Regenschauer", color: "#6495ED" },
  81: { emoji: "🌧️", description: "Moderate Regenschauer", color: "#4169E1" },
  82: { emoji: "⛈️", description: "Kräftige Regenschauer", color: "#00008B" },

  // Schnee/Regen Schauer
  85: { emoji: "🌨️", description: "Leichte Schnee-Schauer", color: "#87CEEB" },
  86: { emoji: "❄️", description: "Kräftige Schnee-Schauer", color: "#4169E1" },

  // Gewitter
  80: { emoji: "⛈️", description: "Gewitter ohne Hagel", color: "#00008B" },
  82: { emoji: "⛈️", description: "Gewitter mit Hagel", color: "#000080" },
  95: { emoji: "⛈️", description: "Gewitter", color: "#4B0082" },
  96: { emoji: "⛈️", description: "Gewitter mit Hagel", color: "#2F4F4F" },
  99: { emoji: "⛈️", description: "Extremes Gewitter", color: "#000000" },
};

// ============================================
// CACHE-EINSTELLUNGEN
// ============================================

const CACHE_CONFIG = {
  ENABLED: true,
  TTL: {
    WEATHER: 30 * 60 * 1000, // 30 Minuten
    GEO: 7 * 24 * 60 * 60 * 1000, // 7 Tage
    FORECAST: 60 * 60 * 1000, // 1 Stunde
  },
  MAX_SIZE: 50 * 1024 * 1024, // 50 MB
  STORAGE_KEY: "wetter_app_cache",
};

// ============================================
// UI-EINSTELLUNGEN
// ============================================

const UI_CONFIG = {
  // Theme
  THEME: {
    LIGHT: "light",
    DARK: "dark",
  },
  DEFAULT_THEME: "light",

  // Temperatur-Anzeigeformat
  TEMPERATURE_UNIT: "C", // 'C' oder 'F'
  WIND_UNIT: "km/h", // 'km/h' oder 'm/s'

  // Update-Intervalle
  AUTO_REFRESH_INTERVAL: 15 * 60 * 1000, // 15 Minuten
  SCROLL_ANIMATION_DURATION: 300, // ms

  // UI-Limits
  MAX_RECENT_CITIES: 10,
  MAX_SEARCH_RESULTS: 5,

  // Fehler-Anzeigedauer
  ERROR_DISPLAY_TIME: 5000, // ms
};

// ============================================
// VALIDIERUNG & ERROR-CODES
// ============================================

const VALIDATION = {
  CITY_NAME: {
    MIN_LENGTH: 2,
    MAX_LENGTH: 100,
    PATTERN: /^[a-zA-Z\s\-äöüÄÖÜß]+$/,
    ERROR_MESSAGE: "Ungültiger Stadtname",
  },

  COORDINATES: {
    LAT_MIN: -90,
    LAT_MAX: 90,
    LON_MIN: -180,
    LON_MAX: 180,
    DECIMAL_PLACES: 4,
  },

  TEMPERATURE: {
    MIN: -60,
    MAX: 60,
    UNIT: "Celsius",
  },
};

const ERROR_CODES = {
  NETWORK_ERROR: {
    code: "NETWORK_ERROR",
    message: "Netzwerkfehler - bitte überprüfen Sie Ihre Verbindung",
    icon: "📡",
  },
  LOCATION_NOT_FOUND: {
    code: "LOCATION_NOT_FOUND",
    message: "Ort nicht gefunden - versuchen Sie einen anderen Namen",
    icon: "📍",
  },
  API_ERROR: {
    code: "API_ERROR",
    message: "API-Fehler - bitte später erneut versuchen",
    icon: "⚠️",
  },
  TIMEOUT: {
    code: "TIMEOUT",
    message: "Anfrage hat zu lange gedauert - bitte erneut versuchen",
    icon: "⏱️",
  },
  INVALID_INPUT: {
    code: "INVALID_INPUT",
    message: "Ungültige Eingabe",
    icon: "❌",
  },
  CACHE_ERROR: {
    code: "CACHE_ERROR",
    message: "Cache-Fehler - lokale Daten können nicht gespeichert werden",
    icon: "💾",
  },
};

// ============================================
// FEATURE-FLAGS
// ============================================

const FEATURES = {
  ENABLE_CACHE: true,
  ENABLE_OFFLINE_MODE: true,
  ENABLE_DARK_MODE: true,
  ENABLE_NOTIFICATIONS: false,
  ENABLE_LOCATION_DETECTION: true,
  ENABLE_MULTIPLE_SOURCES: true,
  DEBUG_MODE: false,
};

// ============================================
// SPRACH-KONFIGURATION
// ============================================

const LANGUAGE = {
  DEFAULT: "de",
  SUPPORTED: ["de", "en"],
};

const TRANSLATIONS = {
  de: {
    loading: "🔎 Suche Wetter für",
    no_location: "Bitte geben Sie einen Ort ein!",
    not_found: "Ort nicht gefunden 😢",
    no_data: "Keine Daten verfügbar 😕",
    error: "Fehler beim Laden 😞",
    recent: "Zuletzt gesucht",
    favorites: "Favoriten",
    settings: "Einstellungen",
  },
  en: {
    loading: "🔎 Searching weather for",
    no_location: "Please enter a location!",
    not_found: "Location not found 😢",
    no_data: "No data available 😕",
    error: "Error loading 😞",
    recent: "Recently searched",
    favorites: "Favorites",
    settings: "Settings",
  },
};

// ============================================
// LOGGING-KONFIGURATION
// ============================================

const LOGGING = {
  LEVEL: {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3,
  },
  DEFAULT_LEVEL: 1, // INFO
  ENABLE_CONSOLE: true,
  ENABLE_FILE: false,
  MAX_LOGS: 1000,
};
