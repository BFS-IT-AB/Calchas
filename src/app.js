// === Haupt-JavaScript-Datei - Interaktivität und Logik ===
// (API-Calls, Button-Clicks, DOM-Manipulation)

/**
 * App-State Management
 */
class AppState {
  constructor() {
    this.currentCity = null;
    this.currentCoordinates = null;
    this.weatherData = {
      openMeteo: null,
      brightSky: null,
      locationDetails: null,
      sunEvents: null,
      moonPhase: null,
    };
    this.isDarkMode = this._loadThemePreference();
    this.favorites = this._loadFavorites();
    this.units = {
      temperature: UI_CONFIG.TEMPERATURE_UNIT,
      wind: UI_CONFIG.WIND_UNIT,
    };
  }

  _loadThemePreference() {
    try {
      return localStorage.getItem("wetter_dark_mode") === "true";
    } catch (e) {
      return false;
    }
  }

  _loadFavorites() {
    try {
      return JSON.parse(localStorage.getItem("wetter_favorites")) || [];
    } catch (e) {
      return [];
    }
  }

  saveFavorite(city, coords) {
    const favorite = { city, coords, addedAt: Date.now() };

    // Prüfe ob schon vorhanden
    const exists = this.favorites.some(
      (f) => f.city.toLowerCase() === city.toLowerCase()
    );
    if (!exists) {
      this.favorites.push(favorite);
      try {
        localStorage.setItem(
          "wetter_favorites",
          JSON.stringify(this.favorites)
        );
        // Log analytics
        if (window.logAnalyticsEvent) {
          window.logAnalyticsEvent("favorite_action", {
            action: "add",
            city,
            timestamp: Date.now(),
          });
        }
      } catch (e) {
        console.warn("Fehler beim Speichern von Favoriten:", e);
      }
    }
  }

  removeFavorite(city) {
    this.favorites = this.favorites.filter(
      (f) => f.city.toLowerCase() !== city.toLowerCase()
    );
    try {
      localStorage.setItem("wetter_favorites", JSON.stringify(this.favorites));
      // Log analytics
      if (window.logAnalyticsEvent) {
        window.logAnalyticsEvent("favorite_action", {
          action: "remove",
          city,
          timestamp: Date.now(),
        });
      }
    } catch (e) {
      console.warn("Fehler beim Löschen von Favoriten:", e);
    }
  }

  isFavorite(city) {
    return this.favorites.some(
      (f) => f.city.toLowerCase() === city.toLowerCase()
    );
  }

  moveFavorite(fromIndex, toIndex) {
    if (fromIndex === toIndex) return;
    const lastIndex = this.favorites.length - 1;
    if (fromIndex < 0 || fromIndex > lastIndex) return;
    let targetIndex = Math.max(0, Math.min(toIndex, lastIndex));
    const item = this.favorites.splice(fromIndex, 1)[0];
    if (!item) return;
    if (fromIndex < targetIndex) {
      targetIndex -= 1;
    }
    this.favorites.splice(targetIndex, 0, item);
    try {
      localStorage.setItem("wetter_favorites", JSON.stringify(this.favorites));
    } catch (e) {
      console.warn("Fehler beim Speichern der Favoriten-Reihenfolge:", e);
    }
  }
}

const API_PROVIDERS = [
  { id: "open-meteo", name: "Open-Meteo", tag: "Hauptquelle" },
  { id: "brightsky", name: "BrightSky", tag: "Hauptquelle" },
  {
    id: "openweathermap",
    name: "OpenWeatherMap",
    tag: "Optional",
    requiresKey: true,
    key: "openweathermap",
  },
  {
    id: "visualcrossing",
    name: "VisualCrossing",
    tag: "Optional",
    requiresKey: true,
    key: "visualcrossing",
  },
  {
    id: "meteostat",
    name: "Meteostat",
    tag: "Historisch",
    requiresKey: true,
    key: "meteostat",
    note: "Für historische Trenddaten",
  },
  {
    id: "bigdatacloud",
    name: "BigDataCloud",
    tag: "Geodaten",
    note: "Reverse-Geocoding Details",
  },
  {
    id: "sunrisesunset",
    name: "Sunrise & Sunset",
    tag: "Astronomie",
    note: "Dämmerungszeiten",
  },
  {
    id: "moonphase",
    name: "Moon Phase",
    tag: "Astronomie",
    note: "Licht & Phase",
  },
];

/**
 * Einfaches HTML-Escape (für Sicherheitszwecke beim Erzeugen von innerHTML vermeiden wir es,
 * stattdessen erzeugen wir DOM-Elemente in `renderFavorites`).
 */
function escapeHtml(str) {
  const d = document.createElement("div");
  d.textContent = String(str);
  return d.innerHTML;
}

/**
 * Rendert die Favoriten-Liste in der UI
 */
function renderFavorites() {
  const container = document.querySelector(".favorites-list");
  if (!container || !window.appState) return;

  // Leere Container
  container.innerHTML = "";

  const favs = appState.favorites || [];
  if (!favs.length) {
    const p = document.createElement("p");
    p.className = "no-favorites";
    p.textContent =
      "⭐ Noch keine Favoriten. Favorit hinzufügen über das Stern-Symbol.";
    container.appendChild(p);
    return;
  }

  const formatter = new Intl.DateTimeFormat("de-DE", {
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

  favs.forEach((f, index) => {
    const item = document.createElement("div");
    item.className = "favorite-item";
    item.dataset.city = f.city;
    item.dataset.index = String(index);
    item.draggable = true;
    item.setAttribute("role", "listitem");
    item.setAttribute("aria-label", `Favorit ${f.city}`);
    item.setAttribute("aria-grabbed", "false");

    item.addEventListener("dragstart", (ev) => {
      ev.dataTransfer.effectAllowed = "move";
      ev.dataTransfer.setData("text/plain", item.dataset.index || "0");
      item.classList.add("dragging");
      item.setAttribute("aria-grabbed", "true");
    });

    item.addEventListener("dragend", () => {
      item.classList.remove("dragging");
      item.classList.remove("dragover");
      item.setAttribute("aria-grabbed", "false");
    });

    item.addEventListener("dragenter", (ev) => {
      ev.preventDefault();
      item.classList.add("dragover");
    });

    item.addEventListener("dragover", (ev) => {
      ev.preventDefault();
      ev.dataTransfer.dropEffect = "move";
    });

    item.addEventListener("dragleave", () => {
      item.classList.remove("dragover");
    });

    item.addEventListener("drop", (ev) => {
      ev.preventDefault();
      item.classList.remove("dragover");
      const fromIndex = parseInt(ev.dataTransfer.getData("text/plain"), 10);
      const toIndex = parseInt(item.dataset.index || "-1", 10);
      if (!Number.isNaN(fromIndex) && !Number.isNaN(toIndex)) {
        appState.moveFavorite(fromIndex, toIndex);
        renderFavorites();
      }
    });

    const info = document.createElement("div");
    info.className = "favorite-info";

    const nameBtn = document.createElement("button");
    nameBtn.className = "fav-name btn-small";
    nameBtn.type = "button";
    nameBtn.textContent = f.city;
    nameBtn.addEventListener("click", () => {
      loadWeather(f.city);
    });

    const meta = document.createElement("span");
    meta.className = "favorite-meta";
    const metaDate = f.addedAt ? new Date(f.addedAt) : new Date();
    meta.textContent = `Hinzugefügt: ${formatter.format(metaDate)}`;
    info.appendChild(nameBtn);
    info.appendChild(meta);

    const removeBtn = document.createElement("button");
    removeBtn.className = "favorite-remove btn-remove";
    removeBtn.type = "button";
    removeBtn.dataset.city = f.city;
    removeBtn.title = "Favorit entfernen";
    removeBtn.textContent = "✕";
    removeBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      // Keep a copy for undo
      const removedFav = Object.assign({}, f);
      appState.removeFavorite(f.city);
      renderFavorites();
      // Offer undo via the errorHandler's retry-style action
      errorHandler.showWithRetry(`${f.city} aus Favoriten entfernt`, () => {
        appState.saveFavorite(removedFav.city, removedFav.coords);
        renderFavorites();
        showSuccess(`${removedFav.city} wiederhergestellt`);
      });
    });

    const actions = document.createElement("div");
    actions.className = "favorite-actions";
    actions.appendChild(removeBtn);

    item.appendChild(info);
    item.appendChild(actions);
    container.appendChild(item);
  });

  syncFavoriteToggleState();
}

function syncFavoriteToggleState(city) {
  const favBtn = document.getElementById("favoriteToggle");
  if (!favBtn || !window.appState) return;
  const targetCity = city || window.appState.currentCity;
  if (!targetCity) return;
  const isFav = window.appState.isFavorite(targetCity);
  favBtn.textContent = isFav ? "⭐" : "☆";
  favBtn.title = isFav ? "Aus Favoriten entfernen" : "Zu Favoriten hinzufügen";
}
window.syncFavoriteToggleState = syncFavoriteToggleState;

let apiStatusStore = [];

function initializeApiStatusDefaults() {
  const hasManager = typeof window !== "undefined" && window.apiKeyManager;
  apiStatusStore = API_PROVIDERS.map((provider) => {
    const hasKey = provider.key
      ? hasManager && window.apiKeyManager.hasKey(provider.key)
      : true;
    const state = provider.requiresKey
      ? hasKey
        ? "online"
        : "missing-key"
      : "online";
    const message =
      provider.requiresKey && !hasKey
        ? "API-Key erforderlich"
        : provider.note ||
          (provider.requiresKey
            ? "Bereit – Key gespeichert"
            : "Noch nicht geladen");
    const detail = provider.requiresKey
      ? hasKey
        ? `🔐 Key gespeichert${provider.note ? ` · ${provider.note}` : ""}`
        : `Kein Key hinterlegt${provider.note ? ` · ${provider.note}` : ""}`
      : provider.note || "Bereit";
    return {
      id: provider.id,
      name: provider.name,
      tag: provider.tag,
      requiresKey: !!provider.requiresKey,
      hasKey,
      state,
      message,
      detail,
      updatedAt: Date.now(),
    };
  });
  renderApiStatusPanel();
}

function updateApiStatusStore(updates = []) {
  if (!Array.isArray(updates)) return;
  const timestamp = Date.now();
  updates.forEach((update) => {
    if (!update || !update.id) return;
    const providerMeta = API_PROVIDERS.find((p) => p.id === update.id);
    const idx = apiStatusStore.findIndex((entry) => entry.id === update.id);
    const baseEntry =
      idx >= 0
        ? apiStatusStore[idx]
        : {
            id: update.id,
            name: providerMeta?.name || update.id,
            tag: providerMeta?.tag,
            requiresKey: !!providerMeta?.requiresKey,
            hasKey: providerMeta?.requiresKey ? false : true,
            state: "pending",
            message: "Noch keine Daten",
          };

    const merged = {
      ...baseEntry,
      ...update,
    };

    if (providerMeta) {
      merged.name = merged.name || providerMeta.name;
      merged.tag = merged.tag || providerMeta.tag;
      merged.requiresKey = !!providerMeta.requiresKey;
      if (merged.hasKey === undefined) {
        merged.hasKey = providerMeta.requiresKey ? false : true;
      }
    }

    if (typeof update.hasKey === "boolean") {
      merged.hasKey = update.hasKey;
    }

    merged.state = merged.state || "pending";
    merged.message = merged.message || baseEntry.message || "Noch keine Daten";
    merged.updatedAt = update.updatedAt || timestamp;

    if (idx >= 0) {
      apiStatusStore[idx] = merged;
    } else {
      apiStatusStore.push(merged);
    }
  });
  renderApiStatusPanel();
}

function renderApiStatusPanel() {
  const container = document.getElementById("api-status");
  if (!container) return;
  ensureApiStatusActionsBinding(container);

  if (!apiStatusStore.length) {
    container.innerHTML =
      '<p class="api-status-empty">Noch keine Daten geladen</p>';
    return;
  }

  const iconFor = (state) => {
    switch (state) {
      case "online":
        return "✅";
      case "error":
        return "❌";
      case "skipped":
        return "🚫";
      case "missing-key":
        return "🔑";
      case "warning":
        return "⚠️";
      default:
        return "⏳";
    }
  };

  const stateLabelFor = (state) => {
    switch (state) {
      case "online":
        return "ONLINE";
      case "warning":
        return "WARNUNG";
      case "error":
        return "FEHLER";
      case "missing-key":
        return "KEY FEHLT";
      case "invalid-key":
        return "KEY UNGUELTIG";
      case "skipped":
        return "UEBERSPRUNGEN";
      default:
        return "WARTET";
    }
  };

  const html = apiStatusStore
    .map((entry) => {
      const icon = iconFor(entry.state);
      const metaParts = [];
      if (typeof entry.duration === "number") {
        metaParts.push(`${entry.duration}ms`);
      }
      if (entry.fromCache) {
        metaParts.push("Cache");
      }
      if (entry.updatedAt) {
        metaParts.push(
          new Date(entry.updatedAt).toLocaleTimeString("de-DE", {
            hour: "2-digit",
            minute: "2-digit",
          })
        );
      }
      const meta = metaParts.filter(Boolean).join(" · ");
      const detail = entry.detail ? escapeHtml(entry.detail) : "";
      const tagMarkup = entry.tag
        ? `<span class="api-status-tag">${escapeHtml(entry.tag)}</span>`
        : "";
      const stateBadge = entry.state
        ? `<span class="api-status-state state-${entry.state}">${stateLabelFor(
            entry.state
          )}</span>`
        : "";
      const keyButtonId = providerKeyInputId(entry.id);
      const keyBlock = entry.requiresKey
        ? `<div class="api-status-keyline">
            <span class="api-status-key ${
              entry.hasKey ? "key-ok" : "key-missing"
            }">${entry.hasKey ? "Key gespeichert" : "Key fehlt"}</span>
            ${
              keyButtonId
                ? `<button class="api-status-action" type="button" data-api-provider="${
                    entry.id
                  }">${
                    entry.hasKey ? "Key verwalten" : "Key hinzufuegen"
                  }</button>`
                : ""
            }
          </div>`
        : "";
      return `
      <div class="api-status-item status-${
        entry.state || "pending"
      }" data-provider="${entry.id || ""}">
        <div class="api-status-row">
          <span class="api-status-name">${icon} ${escapeHtml(
        entry.name || ""
      )}</span>
          <div class="api-status-row-meta">
            ${tagMarkup}
            ${stateBadge}
          </div>
        </div>
        <div class="api-status-message">${escapeHtml(entry.message || "")}</div>
        ${meta ? `<div class="api-status-meta">${meta}</div>` : ""}
        ${detail ? `<small class="api-status-extra">${detail}</small>` : ""}
        ${keyBlock}
      </div>
    `;
    })
    .join("");

  container.innerHTML = html;
}

function ensureApiStatusActionsBinding(container) {
  if (!container || container.dataset.actionsBound) return;
  container.addEventListener("click", (event) => {
    const target = event.target.closest(".api-status-action");
    if (!target) return;
    const providerId = target.dataset.apiProvider;
    if (!providerId) return;
    const inputId = providerKeyInputId(providerId);
    openSettingsModal(inputId || "settings-modal");
  });
  container.dataset.actionsBound = "true";
}

function buildApiStatusMessage(source) {
  if (!source) return "";
  if (source.skipped) {
    return source.error ? `${source.error}` : "Übersprungen";
  }
  if (source.success) {
    const parts = [];
    parts.push(source.fromCache ? "Cache" : "Live");
    if (typeof source.duration === "number") {
      parts.push(`${source.duration}ms`);
    }
    return parts.join(" · ");
  }
  return source.error || "Fehler";
}

function providerRequiresKey(providerId) {
  const provider = API_PROVIDERS.find((p) => p.id === providerId);
  return provider ? !!provider.requiresKey : false;
}

function providerNoteSuffix(providerId) {
  const provider = API_PROVIDERS.find((p) => p.id === providerId);
  return provider && provider.note ? ` · ${provider.note}` : "";
}

function providerKeyInputId(providerId) {
  switch (providerId) {
    case "openweathermap":
      return "openweathermap-key";
    case "visualcrossing":
      return "visualcrossing-key";
    case "meteostat":
      return "meteostat-key";
    default:
      return null;
  }
}

function notifyKeyIssue(providerId, errorMessage) {
  const issue = classifyProviderState(providerId, errorMessage);
  if (!issue) return false;
  const provider = API_PROVIDERS.find((p) => p.id === providerId);
  const inputId = providerKeyInputId(providerId);
  showWarning(issue.message, null, {
    title: `${provider?.name || providerId} API`,
    meta: errorMessage,
    actions: inputId
      ? [
          {
            label: "Einstellungen öffnen",
            kind: "primary",
            onClick: () => openSettingsModal(inputId),
          },
        ]
      : undefined,
  });
  if (inputId) {
    focusAndHighlight(inputId, 250);
  }
  return true;
}

function classifyProviderState(providerId, errorMessage) {
  if (!providerId || !errorMessage) return null;
  if (!providerRequiresKey(providerId)) return null;

  const normalized = errorMessage.toLowerCase();
  const invalidKeyPatterns =
    /invalid api key|unauthorized|401|forbidden|not authorized|ung(?:u|ü)ltig/;
  const missingKeyPatterns =
    /api key required|provide an api key|missing api key|no api key|key erforderlich|fehlender key|appid/;

  if (invalidKeyPatterns.test(normalized)) {
    return {
      state: "invalid-key",
      message: "Ungültiger API-Key – bitte neu speichern",
      detail: errorMessage,
    };
  }

  if (missingKeyPatterns.test(normalized)) {
    return {
      state: "missing-key",
      message: "API-Key erforderlich",
      detail: errorMessage,
    };
  }

  return null;
}

function syncProviderKeyState(providerId) {
  const provider = API_PROVIDERS.find((p) => p.id === providerId);
  if (!provider) return;
  const hasManager = typeof window !== "undefined" && window.apiKeyManager;
  const hasKey = provider.key
    ? hasManager && window.apiKeyManager.hasKey(provider.key)
    : true;
  const payload = {
    id: provider.id,
    name: provider.name,
    tag: provider.tag,
  };

  if (provider.requiresKey && !hasKey) {
    payload.state = "missing-key";
    payload.message = "API-Key erforderlich";
    payload.detail = `Kein Key hinterlegt${
      provider.note ? ` · ${provider.note}` : ""
    }`;
  } else {
    payload.state = "online";
    payload.message = provider.note || "Bereit – Key gespeichert";
    payload.detail = provider.requiresKey
      ? `🔐 Key gespeichert${provider.note ? ` · ${provider.note}` : ""}`
      : provider.note;
  }

  payload.requiresKey = !!provider.requiresKey;
  payload.hasKey = hasKey;
  updateApiStatusStore([payload]);
}

/**
 * Build render-ready data from raw API results and apply unit conversions.
 * Returns an object with formatted arrays ready for the UI (hourly/daily per source).
 */
function buildRenderData(rawData, units) {
  const result = {
    openMeteo: null,
    brightSky: null,
    locationDetails: null,
    sunEvents: null,
    moonPhase: null,
  };

  // Helper: compute feels-like temperature (apparent temperature)
  // Uses simple formula combining temperature (°C), relative humidity (%) and wind (m/s)
  // Returns value in °C or null if insufficient data
  function computeFeelsLike(tC, humidity, wind_mps) {
    if (typeof tC !== "number") return null;
    const RH = typeof humidity === "number" ? humidity : null;
    const W = typeof wind_mps === "number" ? wind_mps : 0;
    // Approximate vapor pressure (hPa)
    let e = 0;
    if (RH !== null) {
      e = (RH / 100) * 6.105 * Math.exp((17.27 * tC) / (237.7 + tC));
    }
    // Apparent temperature (Steadman-like): T + 0.33*e - 0.70*wind - 4.00
    const at = tC + 0.33 * e - 0.7 * W - 4.0;
    return Math.round(at * 10) / 10;
  }

  const dayFormatter = new Intl.DateTimeFormat("de-DE", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  });

  const toNumber = (value) =>
    typeof value === "number" && !Number.isNaN(value) ? value : null;

  const average = (values = []) => {
    const filtered = values.filter((v) => typeof v === "number");
    if (!filtered.length) return null;
    const total = filtered.reduce((acc, val) => acc + val, 0);
    return total / filtered.length;
  };

  const averageDirection = (values = []) => {
    const filtered = values.filter((v) => typeof v === "number");
    if (!filtered.length) return null;
    const sum = filtered.reduce(
      (acc, deg) => {
        const rad = (deg * Math.PI) / 180;
        acc.x += Math.cos(rad);
        acc.y += Math.sin(rad);
        return acc;
      },
      { x: 0, y: 0 }
    );
    const angle = (Math.atan2(sum.y, sum.x) * 180) / Math.PI;
    return (angle + 360) % 360;
  };

  const directionToCompass = (deg) => {
    if (typeof deg !== "number" || Number.isNaN(deg)) return null;
    const dirs = [
      "N",
      "NNO",
      "NO",
      "ONO",
      "O",
      "OSO",
      "SO",
      "SSO",
      "S",
      "SSW",
      "SW",
      "WSW",
      "W",
      "WNW",
      "NW",
      "NNW",
    ];
    const idx = Math.round(deg / 22.5) % dirs.length;
    return dirs[idx];
  };

  const formatDayLabel = (dateStr) => {
    if (!dateStr) return "";
    try {
      return dayFormatter.format(new Date(`${dateStr}T00:00:00`));
    } catch (err) {
      return dateStr;
    }
  };

  const createHourGrid = (hours = []) => {
    const hourLookup = new Map();
    hours.forEach((entry) => {
      if (!entry?.time) return;
      const dt = new Date(entry.time);
      if (Number.isNaN(dt.getTime())) return;
      const hour = dt.getHours();
      if (!hourLookup.has(hour)) {
        hourLookup.set(hour, entry);
      }
    });

    return Array.from({ length: 24 }, (_, hour) => {
      const slot = hourLookup.get(hour);
      return {
        hour,
        temperature: toNumber(slot?.temperature),
        emoji: slot?.emoji || "",
        precipitation: toNumber(slot?.precipitation),
        precipitationProbability: toNumber(slot?.precipitationProbability),
        uvIndex: toNumber(slot?.uvIndex),
        uvIndexClearSky: toNumber(slot?.uvIndexClearSky),
        windSpeed: toNumber(slot?.windSpeed),
        windDirection: toNumber(slot?.windDirection),
        dewPoint: toNumber(slot?.dewPoint),
        humidity: toNumber(slot?.humidity),
        isDay:
          typeof slot?.isDay === "number" ? slot.isDay : slot?.isDay ?? null,
      };
    });
  };

  const buildDayInsights = (byDayEntries = [], dailyEntries = []) =>
    byDayEntries.map((entry) => {
      const hours = entry.hours || [];
      const hourGrid = createHourGrid(hours);
      const hourTemps = hourGrid
        .map((slot) => slot.temperature)
        .filter((v) => v !== null);
      const dewValues = hourGrid
        .map((slot) => slot.dewPoint)
        .filter((v) => v !== null);
      const humidityValues = hourGrid
        .map((slot) => slot.humidity)
        .filter((v) => v !== null);
      const windSpeeds = hourGrid
        .map((slot) => slot.windSpeed)
        .filter((v) => v !== null);
      const windDirections = hourGrid
        .map((slot) => slot.windDirection)
        .filter((v) => v !== null);
      const precipAmounts = hourGrid.map((slot) => slot.precipitation || 0);

      const matchingDaily = dailyEntries.find((d) => d.date === entry.date);
      const uvSeries = hourGrid
        .map((slot) => slot.uvIndex)
        .filter((v) => v !== null);
      const uvPeak =
        typeof matchingDaily?.uvIndexMax === "number"
          ? matchingDaily.uvIndexMax
          : uvSeries.length
          ? Math.max(...uvSeries)
          : null;

      const sunrise = matchingDaily?.sunrise || null;
      const sunset = matchingDaily?.sunset || null;
      const sunriseDate = sunrise ? new Date(sunrise) : null;
      const sunsetDate = sunset ? new Date(sunset) : null;
      const daylightMinutes =
        sunriseDate && sunsetDate
          ? Math.max(0, Math.round((sunsetDate - sunriseDate) / 60000))
          : null;
      const sunrisePercent =
        sunriseDate !== null
          ? ((sunriseDate.getHours() + sunriseDate.getMinutes() / 60) / 24) *
            100
          : null;
      const sunsetPercent =
        sunsetDate !== null
          ? ((sunsetDate.getHours() + sunsetDate.getMinutes() / 60) / 24) * 100
          : null;

      const windDirectionAvg = averageDirection(windDirections);

      const condition =
        typeof matchingDaily?.weatherCode === "number"
          ? WEATHER_CODES[matchingDaily.weatherCode]?.description
          : undefined;

      return {
        date: entry.date,
        label: formatDayLabel(entry.date),
        emoji:
          matchingDaily?.emoji ||
          hours.find((h) => {
            const dt = new Date(h.time);
            return dt.getHours() === 12;
          })?.emoji ||
          hours[0]?.emoji ||
          "❓",
        summary: {
          tempMax:
            typeof matchingDaily?.tempMax === "number"
              ? matchingDaily.tempMax
              : hourTemps.length
              ? Math.max(...hourTemps)
              : null,
          tempMin:
            typeof matchingDaily?.tempMin === "number"
              ? matchingDaily.tempMin
              : hourTemps.length
              ? Math.min(...hourTemps)
              : null,
          dewPointAvg: average(dewValues),
          humidityAvg: average(humidityValues),
          precipitationSum:
            typeof matchingDaily?.precipitationSum === "number"
              ? matchingDaily.precipitationSum
              : precipAmounts.reduce((acc, val) => acc + (val || 0), 0),
          precipitationHours: matchingDaily?.precipitationHours ?? null,
          wind: {
            avgSpeed: average(windSpeeds),
            maxSpeed: windSpeeds.length ? Math.max(...windSpeeds) : null,
            directionDeg: windDirectionAvg,
            cardinal: directionToCompass(windDirectionAvg),
          },
          uvIndexMax: uvPeak,
          condition,
        },
        sun: {
          sunrise,
          sunset,
          sunrisePercent,
          sunsetPercent,
          daylightMinutes,
        },
        precipitationTimeline: hourGrid.map((slot) => ({
          hour: slot.hour,
          amount: slot.precipitation ?? 0,
          probability: slot.precipitationProbability ?? null,
          isDay: slot.isDay,
        })),
        uvTimeline: hourGrid.map((slot) => ({
          hour: slot.hour,
          value: slot.uvIndex,
          clearSky: slot.uvIndexClearSky,
        })),
        hourGrid,
        hours,
      };
    });
  try {
    if (rawData.openMeteo) {
      const hourly = openMeteoAPI.formatHourlyData(rawData.openMeteo, 168);
      const daily = openMeteoAPI.formatDailyData(rawData.openMeteo, 7);

      // Convert temps and wind per units
      const convertedHourly = hourly.map((h) => {
        const tC = typeof h.temperature === "number" ? h.temperature : null; // °C
        // Open-Meteo provides windspeed_10m in km/h -> convert to m/s for internal calc
        const rawWind = typeof h.windSpeed === "number" ? h.windSpeed : null; // likely km/h
        const wind_mps = rawWind === null ? null : rawWind / 3.6;
        const temp =
          tC === null
            ? null
            : units.temperature === "F"
            ? (tC * 9) / 5 + 32
            : tC;
        const dewPointRaw = typeof h.dewPoint === "number" ? h.dewPoint : null;
        const dewPoint =
          dewPointRaw === null
            ? null
            : units.temperature === "F"
            ? (dewPointRaw * 9) / 5 + 32
            : dewPointRaw;
        // Wind conversion: m/s -> km/h (multiply by 3.6) or m/s -> mph (multiply by 2.237)
        let wind = null;
        if (wind_mps !== null) {
          if (units.wind === "m/s") {
            wind = wind_mps;
          } else if (units.wind === "mph") {
            wind = wind_mps * 2.237; // 1 m/s = 2.237 mph
          } else {
            wind = wind_mps * 3.6; // Default: km/h
          }
        }
        // compute feels-like in °C using internal values, then convert if needed
        const feelsC =
          tC === null
            ? null
            : computeFeelsLike(tC, h.humidity ?? null, wind_mps);
        const feels =
          feelsC === null
            ? null
            : units.temperature === "F"
            ? (feelsC * 9) / 5 + 32
            : feelsC;
        return Object.assign({}, h, {
          temperature: temp,
          windSpeed: wind,
          feelsLike: feels,
          dewPoint,
        });
      });

      const convertedDaily = daily.map((d) => {
        const max = typeof d.tempMax === "number" ? d.tempMax : null;
        const min = typeof d.tempMin === "number" ? d.tempMin : null;
        const tMax =
          max === null
            ? null
            : units.temperature === "F"
            ? (max * 9) / 5 + 32
            : max;
        const tMin =
          min === null
            ? null
            : units.temperature === "F"
            ? (min * 9) / 5 + 32
            : min;
        return Object.assign({}, d, { tempMax: tMax, tempMin: tMin });
      });

      result.openMeteo = { hourly: convertedHourly, daily: convertedDaily };
      // Group hourly into days for 7-day view (first 3 days will include per-hour slices)
      function groupHourlyByDay(hourlyArray, maxDays = 7) {
        const map = new Map();
        hourlyArray.forEach((h) => {
          try {
            const dateKey =
              typeof h.time === "string" && h.time.includes("T")
                ? h.time.split("T")[0]
                : new Date(h.time).toISOString().split("T")[0];
            if (!map.has(dateKey)) map.set(dateKey, []);
            map.get(dateKey).push(h);
          } catch (e) {
            // ignore malformed time
          }
        });
        // Convert map to array and limit to maxDays
        const arr = Array.from(map.entries()).map(([date, hours]) => ({
          date,
          hours,
        }));
        return arr.slice(0, maxDays);
      }
      result.openMeteo.byDay = groupHourlyByDay(convertedHourly, 7);
      result.openMeteo.dayInsights = buildDayInsights(
        result.openMeteo.byDay,
        convertedDaily
      );
    }

    if (rawData.brightSky) {
      const bs = brightSkyAPI.formatWeatherData(rawData.brightSky, 48);
      const converted = bs.map((h) => {
        const tC = typeof h.temperature === "number" ? h.temperature : null; // assume °C
        const wind_mps = typeof h.windSpeed === "number" ? h.windSpeed : null; // assume m/s
        const temp =
          tC === null
            ? null
            : units.temperature === "F"
            ? (tC * 9) / 5 + 32
            : tC;
        // Wind conversion: m/s -> km/h or m/s -> mph
        let wind = null;
        if (wind_mps !== null) {
          if (units.wind === "m/s") {
            wind = wind_mps;
          } else if (units.wind === "mph") {
            wind = wind_mps * 2.237; // 1 m/s = 2.237 mph
          } else {
            wind = wind_mps * 3.6; // Default: km/h
          }
        }
        const feelsC =
          tC === null
            ? null
            : computeFeelsLike(
                tC,
                h.relativeHumidity ?? h.humidity ?? null,
                wind_mps
              );
        const feels =
          feelsC === null
            ? null
            : units.temperature === "F"
            ? (feelsC * 9) / 5 + 32
            : feelsC;
        return Object.assign({}, h, {
          temperature: temp,
          windSpeed: wind,
          feelsLike: feels,
        });
      });
      result.brightSky = { hourly: converted };
    }

    result.locationDetails = rawData.locationDetails || null;
    result.sunEvents = rawData.sunEvents || null;
    result.moonPhase = rawData.moonPhase || null;
  } catch (e) {
    console.warn("buildRenderData failed", e);
  }
  return result;
}

/**
 * Rerender UI from appState.renderData
 */
function renderFromRenderData() {
  try {
    if (!appState || !appState.renderData) return;
    const city = appState.currentCity || "";
    // display current (uses renderData format)
    weatherDisplay.displayCurrent(appState.renderData, city);

    // hourly and forecast for OpenMeteo
    if (appState.renderData.openMeteo) {
      weatherDisplay.displayHourly(
        appState.renderData.openMeteo.hourly.slice(0, 24),
        "Open-Meteo"
      );
      weatherDisplay.displayForecast(appState.renderData.openMeteo.daily);
    }

    // brightSky hourly (if present)
    if (appState.renderData.brightSky) {
      weatherDisplay.displayHourly(
        appState.renderData.brightSky.hourly,
        "BrightSky"
      );
    }
  } catch (e) {
    console.warn("renderFromRenderData failed", e);
  }
}

/**
 * Geo-Suche über Nominatim
 */
async function searchLocation(city) {
  try {
    console.log(`🔍 Suche Ort: ${city}`);

    const validation = validateCityInput(city);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    const params = new URLSearchParams({
      format: API_ENDPOINTS.NOMINATIM.PARAMS.format,
      q: sanitizeInput(city),
      limit: API_ENDPOINTS.NOMINATIM.PARAMS.limit,
      addressdetails: API_ENDPOINTS.NOMINATIM.PARAMS.addressdetails,
    });

    const url = `${API_ENDPOINTS.NOMINATIM.BASE}?${params.toString()}`;
    const response = await safeApiFetch(
      url,
      {},
      API_ENDPOINTS.NOMINATIM.TIMEOUT
    );
    const geoData = await response.json();

    const validation2 = validateApiResponse(geoData, "nominatim");
    if (!validation2.valid) {
      throw new Error(validation2.error);
    }

    console.log(`✅ Ort gefunden: ${geoData[0].display_name}`);

    return {
      city: geoData[0].display_name,
      lat: parseFloat(geoData[0].lat),
      lon: parseFloat(geoData[0].lon),
      results: geoData,
    };
  } catch (error) {
    console.error("❌ Ortssuche fehlgeschlagen:", error.message);
    throw error;
  }
}

/**
 * Lädt Wetterdaten von beiden APIs mit Fallback
 */
async function fetchWeatherData(lat, lon) {
  const sources = [];

  console.log(`🌡️ Lade Wetterdaten für ${lat}, ${lon}`);

  const [openMeteoResult, brightSkyResult] = await Promise.all([
    openMeteoAPI.fetchWeather(lat, lon),
    brightSkyAPI.fetchWeather(lat, lon),
  ]);

  if (!openMeteoResult.error) {
    sources.push({
      id: "open-meteo",
      name: "Open-Meteo",
      success: true,
      duration: openMeteoResult.duration,
      fromCache: openMeteoResult.fromCache,
    });
  } else {
    sources.push({
      id: "open-meteo",
      name: "Open-Meteo",
      success: false,
      error: openMeteoResult.error,
    });
    showWarning(`Open-Meteo: ${openMeteoResult.error}`);
  }

  if (!brightSkyResult.error) {
    sources.push({
      id: "brightsky",
      name: "BrightSky",
      success: true,
      duration: brightSkyResult.duration,
      fromCache: brightSkyResult.fromCache,
    });
  } else {
    sources.push({
      id: "brightsky",
      name: "BrightSky",
      success: false,
      error: brightSkyResult.error,
    });
    showWarning(`BrightSky: ${brightSkyResult.error}`);
  }

  // OPTIONALE APIs - Nur wenn API-Keys vorhanden
  let openWeatherMapResult = null;
  let visualCrossingResult = null;
  let bigDataCloudResult = null;
  let sunriseSunsetResult = null;
  let moonPhaseResult = null;

  // OpenWeatherMap (optional)
  if (window.apiKeyManager && window.apiKeyManager.hasKey("openweathermap")) {
    try {
      const owmAPI = new OpenWeatherMapAPI();
      const owmKey = window.apiKeyManager.getKey("openweathermap");
      openWeatherMapResult = await owmAPI.fetchWeather(lat, lon, owmKey);

      if (!openWeatherMapResult.error) {
        sources.push({
          id: "openweathermap",
          name: "OpenWeatherMap",
          state: openWeatherMapResult.state,
          statusMessage:
            openWeatherMapResult.statusMessage ||
            buildApiStatusMessage({
              success: true,
              duration: openWeatherMapResult.duration,
              fromCache: false,
            }),
          statusDetail: openWeatherMapResult.detail,
          success: true,
          duration: openWeatherMapResult.duration || 0,
          fromCache: false,
        });
        console.log("✅ OpenWeatherMap Daten geladen");
      } else {
        sources.push({
          id: "openweathermap",
          name: "OpenWeatherMap",
          state: openWeatherMapResult.state,
          statusMessage: openWeatherMapResult.statusMessage,
          statusDetail: openWeatherMapResult.detail,
          success: false,
          error: openWeatherMapResult.error,
        });
        const handled = notifyKeyIssue(
          "openweathermap",
          openWeatherMapResult.error
        );
        if (!handled) {
          showWarning(`OpenWeatherMap: ${openWeatherMapResult.error}`);
        }
      }
    } catch (e) {
      console.warn("OpenWeatherMap Fehler:", e.message);
      sources.push({
        id: "openweathermap",
        name: "OpenWeatherMap",
        success: false,
        error: e.message || "Unbekannter Fehler",
      });
      const handled = notifyKeyIssue("openweathermap", e.message);
      if (!handled) {
        showWarning(`OpenWeatherMap: ${e?.message || "Unbekannter Fehler"}`);
      }
    }
  }

  // VisualCrossing (optional)
  if (window.apiKeyManager && window.apiKeyManager.hasKey("visualcrossing")) {
    try {
      const vcAPI = new VisualCrossingAPI();
      const vcKey = window.apiKeyManager.getKey("visualcrossing");
      visualCrossingResult = await vcAPI.fetchWeather(lat, lon, vcKey);

      if (!visualCrossingResult.error) {
        sources.push({
          id: "visualcrossing",
          name: "VisualCrossing",
          success: true,
          duration: visualCrossingResult.duration || 0,
          fromCache: false,
        });
        console.log("✅ VisualCrossing Daten geladen");
      } else {
        sources.push({
          id: "visualcrossing",
          name: "VisualCrossing",
          success: false,
          error: visualCrossingResult.error,
        });
        const handled = notifyKeyIssue(
          "visualcrossing",
          visualCrossingResult.error
        );
        if (!handled) {
          showWarning(`VisualCrossing: ${visualCrossingResult.error}`);
        }
      }
    } catch (e) {
      console.warn("VisualCrossing Fehler:", e.message);
      sources.push({
        id: "visualcrossing",
        name: "VisualCrossing",
        success: false,
        error: e.message || "Unbekannter Fehler",
      });
      const handled = notifyKeyIssue("visualcrossing", e.message);
      if (!handled) {
        showWarning(`VisualCrossing: ${e?.message || "Unbekannter Fehler"}`);
      }
    }
  }

  if (typeof bigDataCloudAPI !== "undefined") {
    try {
      const key = window.apiKeyManager?.getKey("bigdatacloud") || null;
      bigDataCloudResult = await bigDataCloudAPI.fetchLocationDetails(
        lat,
        lon,
        key
      );
      if (!bigDataCloudResult.error) {
        sources.push({
          id: "bigdatacloud",
          name: "BigDataCloud",
          success: true,
          duration: bigDataCloudResult.duration,
          fromCache: false,
        });
      } else {
        sources.push({
          id: "bigdatacloud",
          name: "BigDataCloud",
          success: false,
          error: bigDataCloudResult.error,
        });
      }
    } catch (e) {
      console.warn("BigDataCloud Fehler:", e.message);
      sources.push({
        id: "bigdatacloud",
        name: "BigDataCloud",
        success: false,
        error: e.message || "Unbekannter Fehler",
      });
    }
  }

  if (typeof sunriseSunsetAPI !== "undefined") {
    try {
      const key = window.apiKeyManager?.getKey("sunrisesunset") || null;
      sunriseSunsetResult = await sunriseSunsetAPI.fetchSunEvents(
        lat,
        lon,
        key
      );
      if (!sunriseSunsetResult.error) {
        sources.push({
          id: "sunrisesunset",
          name: "Sunrise & Sunset",
          success: true,
          duration: sunriseSunsetResult.duration,
          fromCache: false,
        });
      } else {
        sources.push({
          id: "sunrisesunset",
          name: "Sunrise & Sunset",
          success: false,
          error: sunriseSunsetResult.error,
        });
      }
    } catch (e) {
      console.warn("SunriseSunset Fehler:", e.message);
      sources.push({
        id: "sunrisesunset",
        name: "Sunrise & Sunset",
        success: false,
        error: e.message || "Unbekannter Fehler",
      });
    }
  }

  if (typeof moonPhaseAPI !== "undefined") {
    try {
      const key = window.apiKeyManager?.getKey("moonphase") || null;
      const moonPhaseContext = {
        city:
          (bigDataCloudResult && !bigDataCloudResult.error
            ? bigDataCloudResult.data?.city ||
              bigDataCloudResult.data?.locality ||
              bigDataCloudResult.data?.region
            : null) ||
          window.appState?.currentCity ||
          null,
        locationDetails:
          bigDataCloudResult && !bigDataCloudResult.error
            ? bigDataCloudResult.data
            : null,
        latitude: lat,
        longitude: lon,
      };
      moonPhaseResult = await moonPhaseAPI.fetchPhase(
        new Date(),
        key,
        moonPhaseContext
      );
      if (!moonPhaseResult.error) {
        sources.push({
          id: "moonphase",
          name: "Moon Phase",
          success: true,
          duration: moonPhaseResult.duration,
          fromCache: false,
        });
      } else {
        sources.push({
          id: "moonphase",
          name: "Moon Phase",
          success: false,
          error: moonPhaseResult.error,
        });
      }
    } catch (e) {
      console.warn("MoonPhase Fehler:", e.message);
      sources.push({
        id: "moonphase",
        name: "Moon Phase",
        success: false,
        error: e.message || "Unbekannter Fehler",
      });
    }
  }

  if (sources.length) {
    const statusPayload = sources
      .filter((src) => src.id)
      .map((src) => {
        const classification = classifyProviderState(src.id, src.error);
        const state =
          src.state ||
          classification?.state ||
          (src.skipped ? "skipped" : src.success ? "online" : "error");
        const message =
          classification?.message ||
          src.statusMessage ||
          buildApiStatusMessage(src);
        const detail =
          classification?.detail ||
          src.statusDetail ||
          (!src.success && src.error
            ? src.error
            : providerRequiresKey(src.id)
            ? `🔐 Key aktiv${providerNoteSuffix(src.id)}`
            : "");
        return {
          id: src.id,
          name: src.name,
          state,
          message,
          duration: src.duration,
          fromCache: src.fromCache,
          detail,
        };
      });
    updateApiStatusStore(statusPayload);
  }

  // Prüfe ob mindestens eine Hauptquelle erfolgreich war
  const hasMainData = [openMeteoResult, brightSkyResult].some((r) => !r.error);
  if (!hasMainData) {
    throw new Error(
      "Keine Wetterdaten verfügbar - Hauptquellen fehlgeschlagen"
    );
  }

  return {
    openMeteo: openMeteoResult.error ? null : openMeteoResult.data,
    brightSky: brightSkyResult.error ? null : brightSkyResult.data,
    openWeatherMap:
      openWeatherMapResult && !openWeatherMapResult.error
        ? openWeatherMapResult.data
        : null,
    visualCrossing:
      visualCrossingResult && !visualCrossingResult.error
        ? visualCrossingResult.data
        : null,
    locationDetails:
      bigDataCloudResult && !bigDataCloudResult.error
        ? bigDataCloudResult.data
        : null,
    sunEvents:
      sunriseSunsetResult && !sunriseSunsetResult.error
        ? sunriseSunsetResult.data
        : null,
    moonPhase:
      moonPhaseResult && !moonPhaseResult.error ? moonPhaseResult.data : null,
    sources,
  };
}

/**
 * Zeigt Wetterdaten an
 */
function displayWeatherResults(location, weatherData) {
  const { openMeteo, brightSky, sources } = weatherData;

  // Update Source Info
  weatherDisplay.updateSourceInfo(sources);

  // Update detailed comparison view (if available)
  try {
    // Pass converted renderData if available (appState.renderData set by caller)
    weatherDisplay.showSourcesComparison(
      appState?.renderData?.openMeteo ? appState.renderData.openMeteo : null,
      appState?.renderData?.brightSky ? appState.renderData.brightSky : null,
      sources
    );
  } catch (e) {
    // ignore
  }

  // Zeige Open-Meteo Daten
  if (openMeteo) {
    // Prefer renderData (converted & feels-like included) if available
    const rd = appState?.renderData?.openMeteo?.hourly;
    const hourlyData =
      rd && rd.length
        ? rd.slice(0, 24)
        : openMeteoAPI.formatHourlyData(openMeteo, 24);
    weatherDisplay.displayHourly(hourlyData, "Open-Meteo");

    // Zeige aktuellen Wert (uses converted renderData when present)
    if (hourlyData.length > 0) {
      weatherDisplay.updateCurrentValues({
        temp: hourlyData[0].temperature,
        windSpeed: hourlyData[0].windSpeed,
        humidity: hourlyData[0].humidity,
        feelsLike: hourlyData[0].feelsLike ?? hourlyData[0].feels_like,
        emoji: hourlyData[0].emoji,
        description: hourlyData[0].description || "",
      });
    }

    // Zeige 5-Tage Vorhersage
    const dailyData = openMeteoAPI.formatDailyData(openMeteo, 7);
    weatherDisplay.displayForecast(dailyData);
  }

  // Zeige BrightSky Daten als Alternative
  if (brightSky) {
    const formattedData = brightSkyAPI.formatWeatherData(brightSky, 24);
    console.log("BrightSky Daten verfügbar:", formattedData.length);
  }
}

/**
 * Hauptfunktion: Wetter laden und anzeigen
 */
async function loadWeather(city) {
  try {
    // Log analytics
    if (window.logAnalyticsEvent) {
      window.logAnalyticsEvent("search", { city, timestamp: Date.now() });
    }

    // Zeige Loading-State
    weatherDisplay.showLoading();
    searchComponent.setLoading(true);
    errorHandler.clearAll();

    // Suche Ort
    const location = await searchLocation(city);
    appState.currentCity = location.city;
    appState.currentCoordinates = {
      lat: location.lat,
      lon: location.lon,
      lng: location.lon,
    };

    // Lade Wetterdaten
    const weatherData = await fetchWeatherData(location.lat, location.lon);

    // Log API call
    if (window.logAnalyticsEvent) {
      window.logAnalyticsEvent("api_call", {
        city: location.city,
        timestamp: Date.now(),
      });
    }

    // Speichere WeatherData im globalen State und bereite renderbare Daten vor
    try {
      appState.weatherData = weatherData;
      appState.renderData = buildRenderData(
        weatherData,
        appState.units || { temperature: "C", wind: "km/h" }
      );
    } catch (e) {
      /* ignore */
    }

    // Zeige Ergebnisse (verwende die konvertierten renderData für Anzeige)
    try {
      weatherDisplay.displayCurrent(appState.renderData, location.city);
    } catch (e) {
      // Fallback: falls renderData fehlt, zeige rohe Daten
      weatherDisplay.displayCurrent(weatherData, location.city);
    }
    displayWeatherResults(location, weatherData);

    if (window.weatherMap) {
      const lonValue =
        location.lon ?? location.lng ?? weatherData?.openMeteo?.longitude;
      if (typeof location.lat === "number" && typeof lonValue === "number") {
        window.weatherMap.init(location.lat, lonValue, location.city);
      }
    }

    // Speichere im Cache
    weatherCache.setGeo(city, {
      city: location.city,
      lat: location.lat,
      lon: location.lon,
    });

    showSuccess(`✅ Wetter für ${location.city} geladen`);
  } catch (error) {
    console.error("❌ Fehler beim Laden:", error);
    weatherDisplay.showError(error.message);
    errorHandler.showWithRetry(error.message, () => loadWeather(city));
  } finally {
    searchComponent.setLoading(false);
  }
}

/**
 * Initialisierung
 */
function initApp() {
  console.log("🚀 Initialisiere Calchas...");

  // Initialisiere API Key Manager
  window.apiKeyManager = new APIKeyManager();

  // Setze Default API-Keys (falls noch nicht vorhanden)
  const runtimeDefaultKeys =
    typeof window !== "undefined" &&
    window.__APP_DEFAULT_API_KEYS &&
    typeof window.__APP_DEFAULT_API_KEYS === "object"
      ? window.__APP_DEFAULT_API_KEYS
      : {};

  const bakedInDefaults = {
    // Vom Nutzer bereitgestellte Default-Keys, damit optionale APIs sofort laufen
    openweathermap: "9f79d40dc85bebc834364783854eefbd",
    visualcrossing: "JVCZ3WAHB5XBT7GXQC7RQBGBE",
    meteostat: "edda72c60bmsh4a38c4687147239p14e8d5jsn6f578346b68a",
  };

  window.apiKeyManager.setDefaults({
    ...bakedInDefaults,
    ...runtimeDefaultKeys,
  });

  initializeApiStatusDefaults();
  window.updateApiStatusEntry = (providerId, payload = {}) => {
    if (!providerId) return;
    updateApiStatusStore([{ id: providerId, ...payload }]);
  };

  // Initialisiere Components
  initErrorHandler("#error-container");

  searchComponent = new SearchInputComponent(
    "#cityInput",
    "#searchBtn",
    "#recent-cities"
  );
  weatherDisplay = new WeatherDisplayComponent(
    "current-weather",
    "forecast-container"
  );
  window.searchComponent = searchComponent;
  window.weatherDisplay = weatherDisplay;

  // Globale State
  appState = new AppState();
  window.appState = appState;

  // Render Favorites initial
  try {
    renderFavorites();
  } catch (e) {
    console.warn("Favoriten rendern fehlgeschlagen:", e);
  }

  // Event-Listener
  window.addEventListener("search", (e) => {
    loadWeather(e.detail.city);
  });

  document.getElementById("darkModeToggle")?.addEventListener("change", (e) => {
    appState.isDarkMode = e.target.checked;
    document.body.classList.toggle("dark-mode", appState.isDarkMode);
    try {
      localStorage.setItem("theme", appState.isDarkMode ? "dark" : "light");
    } catch (e) {
      console.warn("localStorage fehler:", e);
    }
  });

  // Dark Mode initial state
  const darkModeToggle = document.getElementById("darkModeToggle");
  if (darkModeToggle && appState) {
    darkModeToggle.checked = appState.isDarkMode;
  }

  // Settings Button - Toggle Modal
  const settingsBtn = document.getElementById("settingsBtn");
  const modalOverlay = document.getElementById("modal-overlay");

  if (settingsBtn) {
    settingsBtn.addEventListener("click", () => {
      openSettingsModal();
    });
  }

  // Modal Close Handlers
  const closeModalBtns = document.querySelectorAll(".modal-close");
  closeModalBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const modalId = btn.dataset.close;
      closeModal(modalId);
    });
  });

  // Close modal on overlay click
  if (modalOverlay) {
    modalOverlay.addEventListener("click", () => {
      closeAllModals();
    });
  }

  // Initialize Feature Modules (Maps, Alerts, Historical, Analytics)
  const weatherMap = new WeatherMap("weather-map");
  const weatherAlerts = new WeatherAlerts("weather-alerts");
  const historicalChart = new HistoricalChart("historical-chart");
  const analytics = new Analytics();
  weatherMap.bindToolbar("#map-layer-toolbar");
  const mapInspector = new MapDataInspector("map-inspector");
  weatherMap.attachInspector(mapInspector);
  window.weatherMap = weatherMap;
  window.mapInspector = mapInspector;

  // Log analytics events
  window.logAnalyticsEvent = (type, data) => analytics.logEvent(type, data);

  // 🌍 Automatischer Standort beim App-Start
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        console.log(`📍 Standort gefunden: ${latitude}, ${longitude}`);

        try {
          // Reverse Geocoding - finde Stadtnamen
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
          );
          const data = await response.json();
          const cityName =
            data.address?.city ||
            data.address?.town ||
            data.address?.county ||
            "Standort";

          // Füge Stadt in Suchfeld ein
          document.getElementById("cityInput").value = cityName;

          // Lade Wetter automatisch
          await loadWeather(cityName);
          console.log(`✅ Wetter für ${cityName} automatisch geladen`);
        } catch (err) {
          console.error("Fehler:", err);
          loadWeather("Berlin");
        }
      },
      (error) => {
        console.warn("❌ Geolokalisierung abgelehnt, lade Berlin");
        document.getElementById("cityInput").value = "Berlin";
        loadWeather("Berlin");
      },
      { timeout: 5000 }
    );
  } else {
    console.warn("⚠️ Geolokalisierung nicht unterstützt");
    document.getElementById("cityInput").value = "Berlin";
    loadWeather("Berlin");
  }

  // Tab Switching for Extra Features
  const tabButtons = document.querySelectorAll(".tab-btn");
  const tabContents = document.querySelectorAll(".tab-content");

  tabButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const tabName = btn.dataset.tab;

      // Remove active from all
      tabButtons.forEach((b) => b.classList.remove("active"));
      tabContents.forEach((c) => {
        c.classList.remove("active");
        c.style.display = "none";
      });

      // Add active to clicked
      btn.classList.add("active");
      const targetContent = document.querySelector(
        `[data-tab-content="${tabName}"]`
      );
      if (targetContent) {
        targetContent.classList.add("active");
        targetContent.style.display = "block";

        // Initialize features on first tab switch
        if (tabName === "maps" && appState.currentCoordinates) {
          const lon =
            appState.currentCoordinates.lon ?? appState.currentCoordinates.lng;
          weatherMap.init(
            appState.currentCoordinates.lat,
            lon,
            appState.currentCity || "Standort"
          );
          weatherMap.ensureVisibility();
        } else if (tabName === "maps") {
          weatherMap.ensureVisibility();
        } else if (tabName === "alerts" && appState.currentCoordinates) {
          const lon =
            appState.currentCoordinates.lon ?? appState.currentCoordinates.lng;
          weatherAlerts.fetchAlerts(
            appState.currentCoordinates.lat,
            lon,
            appState.currentCity || "Standort"
          );
        } else if (tabName === "historical" && appState.currentCoordinates) {
          const lon =
            appState.currentCoordinates.lon ?? appState.currentCoordinates.lng;
          historicalChart.fetchAndRender(
            appState.currentCoordinates.lat,
            lon,
            appState.currentCity || "Standort"
          );
        } else if (tabName === "analytics") {
          analytics.renderDashboard("analytics-dashboard");
        }
      }
    });
  });

  // Units selects initial state and handlers
  const tempSelect = document.getElementById("temp-unit-select");
  const windSelect = document.getElementById("wind-unit-select");
  // Load persisted units if present
  try {
    const savedTemp = localStorage.getItem("wetter_unit_temp");
    const savedWind = localStorage.getItem("wetter_unit_wind");
    if (savedTemp) appState.units.temperature = savedTemp;
    if (savedWind) appState.units.wind = savedWind;
  } catch (e) {
    /* ignore */
  }

  if (tempSelect) {
    tempSelect.value = appState.units.temperature || tempSelect.value;
    tempSelect.addEventListener("change", (e) => {
      appState.units.temperature = e.target.value;
      try {
        localStorage.setItem("wetter_unit_temp", e.target.value);
      } catch (err) {}
      // Rebuild renderData and re-render
      try {
        if (appState.weatherData) {
          appState.renderData = buildRenderData(
            appState.weatherData,
            appState.units
          );
          renderFromRenderData();
        }
      } catch (err) {
        console.warn("Unit change render failed", err);
      }
    });
  }

  if (windSelect) {
    windSelect.value = appState.units.wind || windSelect.value;
    windSelect.addEventListener("change", (e) => {
      appState.units.wind = e.target.value;
      try {
        localStorage.setItem("wetter_unit_wind", e.target.value);
      } catch (err) {}
      try {
        if (appState.weatherData) {
          appState.renderData = buildRenderData(
            appState.weatherData,
            appState.units
          );
          renderFromRenderData();
        }
      } catch (err) {
        console.warn("Unit change render failed", err);
      }
    });
  }

  // Setze initiales Theme
  if (appState.isDarkMode) {
    document.body.classList.add("dark-mode");
  }

  // Favoriten Toggle: Delegierter Klick-Handler (für den Stern-Button im aktuellen View)
  document.addEventListener("click", (e) => {
    const favToggle = e.target.closest && e.target.closest("#favoriteToggle");
    if (favToggle) {
      const city = favToggle.dataset.city;
      if (!city) return;

      if (appState.isFavorite(city)) {
        appState.removeFavorite(city);
        favToggle.textContent = "☆";
        favToggle.title = "Zu Favoriten hinzufügen";
        showInfo(`${city} aus Favoriten entfernt`);
      } else {
        appState.saveFavorite(city, appState.currentCoordinates || null);
        favToggle.textContent = "⭐";
        favToggle.title = "Aus Favoriten entfernen";
        showSuccess(`${city} zu Favoriten hinzugefügt`);
      }

      // Update Favoriten-Liste
      try {
        renderFavorites();
        syncFavoriteToggleState(city);
      } catch (err) {
        console.warn(err);
      }
    }
  });

  // Starte Cache-Cleanup
  setCacheInvalidation();

  // Push toggle handler (subscribe/unsubscribe)
  const pushBtn = document.getElementById("pushToggle");
  if (pushBtn) {
    syncPushToggleState();
    pushBtn.addEventListener("click", async () => {
      const enabled = localStorage.getItem("wetter_push_enabled") === "true";
      setPushToggleBusy(true);
      try {
        if (enabled) {
          await unsubscribeFromPush();
          showInfo("Push-Benachrichtigungen deaktiviert");
        } else {
          const ok = await subscribeToPush();
          if (ok) {
            showSuccess(
              "Push-Benachrichtigungen aktiviert (Subscription gespeichert)"
            );
          }
        }
      } catch (e) {
        console.warn("Push toggle error", e);
        handlePushToggleError(e);
      } finally {
        setPushToggleBusy(false);
      }
    });
  }

  // Cache & Verlauf Aktionen in den Einstellungen
  const clearCacheBtn = document.getElementById("clear-cache-btn");
  if (clearCacheBtn) {
    clearCacheBtn.addEventListener("click", () => {
      try {
        const statsBefore =
          typeof weatherCache.getStats === "function"
            ? weatherCache.getStats()
            : null;
        weatherCache.clear();
        showSuccess("Cache geleert – neue Anfragen laden frische Daten.");
        if (window.logAnalyticsEvent) {
          window.logAnalyticsEvent("settings_action", {
            action: "clear_cache",
            clearedEntries: statsBefore?.totalEntries || 0,
            clearedBytes: statsBefore?.totalSize || 0,
          });
        }
      } catch (err) {
        console.warn("Cache konnte nicht geleert werden", err);
        showWarning(
          "Cache konnte nicht geleert werden. Bitte erneut versuchen."
        );
      }
    });
  }

  const clearRecentBtn = document.getElementById("clear-recent-btn");
  if (clearRecentBtn) {
    clearRecentBtn.addEventListener("click", () => {
      if (
        window.searchComponent &&
        typeof window.searchComponent.clearRecent === "function"
      ) {
        const hadEntries = window.searchComponent.clearRecent();
        if (hadEntries) {
          showSuccess("Suchverlauf geleert.");
        } else {
          showInfo("Kein Suchverlauf vorhanden.");
        }
      } else {
        showWarning("Suchverlauf konnte nicht geleert werden.");
      }
    });
  }

  // API Keys - Load existing keys into inputs
  const owmKeyInput = document.getElementById("openweathermap-key");
  const vcKeyInput = document.getElementById("visualcrossing-key");
  const meteostatKeyInput = document.getElementById("meteostat-key");
  if (owmKeyInput)
    owmKeyInput.value = window.apiKeyManager.getKey("openweathermap") || "";
  if (vcKeyInput)
    vcKeyInput.value = window.apiKeyManager.getKey("visualcrossing") || "";
  if (meteostatKeyInput)
    meteostatKeyInput.value = window.apiKeyManager.getKey("meteostat") || "";

  // API Keys - Save handlers
  if (owmKeyInput) {
    const persistOwmKey = (rawValue) => {
      const trimmed = (rawValue || "").trim();
      if (!trimmed) {
        window.apiKeyManager.setKey("openweathermap", "");
        showInfo("OpenWeatherMap API-Key entfernt");
        syncProviderKeyState("openweathermap");
        window.weatherMap?.refreshOverlays?.();
        return;
      }
      if (!/^[A-Za-z0-9]{32,64}$/.test(trimmed)) {
        showWarning(
          "OpenWeatherMap API-Key muss 32 Zeichen enthalten. Bitte kopiere ihn exakt aus deinem OWM-Dashboard."
        );
        focusAndHighlight("openweathermap-key", 200);
        return;
      }
      const success = window.apiKeyManager.setKey("openweathermap", trimmed);
      if (success) {
        showSuccess("OpenWeatherMap API-Key gespeichert");
        syncProviderKeyState("openweathermap");
        window.weatherMap?.refreshOverlays?.();
      }
    };

    ["change", "blur"].forEach((evtName) => {
      owmKeyInput.addEventListener(evtName, (e) =>
        persistOwmKey(e.target.value)
      );
    });

    owmKeyInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        persistOwmKey(e.target.value);
      }
    });
  }
  if (vcKeyInput) {
    vcKeyInput.addEventListener("change", (e) => {
      const success = window.apiKeyManager.setKey(
        "visualcrossing",
        e.target.value
      );
      if (success) {
        showSuccess("VisualCrossing API-Key gespeichert");
        syncProviderKeyState("visualcrossing");
      }
    });
  }
  if (meteostatKeyInput) {
    meteostatKeyInput.addEventListener("change", (e) => {
      const success = window.apiKeyManager.setKey("meteostat", e.target.value);
      if (success) {
        showSuccess("Meteostat API-Key gespeichert");
        syncProviderKeyState("meteostat");
      }
    });
  }

  // VAPID Save button
  const saveVapidBtn = document.getElementById("saveVapidBtn");
  if (saveVapidBtn) {
    saveVapidBtn.addEventListener("click", () => {
      const v = document.getElementById("vapidKeyInput")?.value?.trim() || "";
      if (v.length < 20) {
        showWarning("Bitte gib einen gültigen VAPID Public Key an.");
        return;
      }
      persistVapidKey(v);
      showSuccess("VAPID key gespeichert.");
      syncPushToggleState();
    });
  }

  // Fetch VAPID from local server button
  const fetchVapidBtn = document.getElementById("fetchVapidBtn");
  if (fetchVapidBtn) {
    fetchVapidBtn.addEventListener("click", async () => {
      try {
        fetchVapidBtn.disabled = true;
        fetchVapidBtn.dataset.loading = "true";
        const key = await ensureVapidKey({ forceFetch: true });
        if (key) {
          showSuccess("VAPID key vom lokalen Server geladen");
        } else {
          showWarning("Konnte VAPID key nicht vom lokalen Server laden");
        }
      } catch (e) {
        showWarning("Fehler beim Laden des VAPID keys: " + (e && e.message));
      } finally {
        fetchVapidBtn.disabled = false;
        delete fetchVapidBtn.dataset.loading;
        syncPushToggleState();
      }
    });
  }

  // AUTO-FETCH VAPID on app init (fixes push notification issue)
  (async () => {
    try {
      const key = await ensureVapidKey();
      if (key) {
        console.log("✅ VAPID Key bereitgestellt");
      } else {
        console.warn(
          "⚠️ Kein VAPID Key abrufbar – bitte Push-Einstellungen prüfen"
        );
      }
    } catch (e) {
      console.warn("⚠️ VAPID Auto-Fetch fehlgeschlagen:", e.message);
    } finally {
      syncPushToggleState();
    }
  })();

  // Test: Zeige empty state
  weatherDisplay.showEmpty();

  // Expose a simple smoke-test callable from console
  window.runSmokeTest = runSmokeTest;

  console.log("✅ App initialisiert");
}

// Globale Komponenten-Instanzen
let appState;
let searchComponent;
let weatherDisplay;

// Starte App wenn DOM bereit
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initApp);
} else {
  initApp();
}

// === Stundenanzeige mit Endlosschleife & sanftem Drag ===
function renderHourly(
  containerId,
  times,
  temps,
  weatherCodes = [],
  useIcons = false
) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.classList.add("hourly");
  container.innerHTML = `
  <div class="hourly-bg"></div>
`;

  const baseCount = 24;
  const hours = times.slice(0, baseCount);
  const temps24 = temps.slice(0, baseCount);
  const codes24 = weatherCodes.slice(0, baseCount);
  const allTimes = [...hours, ...hours];
  const allTemps = [...temps24, ...temps24];
  const allCodes = [...codes24, ...codes24];

  allTimes.forEach((time, i) => {
    const date = new Date(time);
    const hour = date.getHours().toString().padStart(2, "0");
    const temp = allTemps[i]?.toFixed(1) ?? "-";
    let icon = "☀️";

    if (!useIcons) {
      const code = allCodes[i];
      if ([0].includes(code)) icon = "☀️";
      else if ([1, 2].includes(code)) icon = "🌤️";
      else if ([3].includes(code)) icon = "☁️";
      else if ([45, 48].includes(code)) icon = "🌫️";
      else if ([51, 61, 80].includes(code)) icon = "🌦️";
      else if ([63, 65, 81, 82].includes(code)) icon = "🌧️";
      else if ([71, 73, 75, 77, 85, 86].includes(code)) icon = "❄️";
      else icon = "🌡️";
    } else {
      const code = allCodes[i] || "";
      if (code.includes("cloudy")) icon = "☁️";
      else if (code.includes("rain")) icon = "🌧️";
      else if (code.includes("clear")) icon = "☀️";
      else icon = "🌦️";
    }

    const div = document.createElement("div");
    div.className = "hour";
    div.innerHTML = `<b>${hour}h</b><br>${icon}<br>${temp}°C`;
    container.appendChild(div);
  });

  // Textauswahl komplett deaktivieren
  container.style.userSelect = "none";

  // Sanftes Dragging aktivieren
  enableSmoothDragScroll(container);

  // Endlos-Loop
  container.addEventListener("scroll", () => {
    const half = container.scrollWidth / 2;
    if (container.scrollLeft >= half) container.scrollLeft -= half;
    else if (container.scrollLeft <= 0) container.scrollLeft += half;
  });

  // Startposition mittig
  container.scrollLeft = container.scrollWidth / 4;
}

/**
 * Einfacher Smoke-Test: prüft presence von Kern-Komponenten und Rendertests (offline-safe)
 * Gibt ein Objekt mit Resultaten zurück und loggt im Console.
 */
async function runSmokeTest() {
  const results = [];
  try {
    results.push({
      ok: !!window.searchComponent,
      msg: "searchComponent vorhanden",
    });
    results.push({
      ok: !!window.weatherDisplay,
      msg: "weatherDisplay vorhanden",
    });
    results.push({ ok: !!window.appState, msg: "appState vorhanden" });

    // Versuch Favoriten zu rendern
    try {
      renderFavorites();
      results.push({
        ok: true,
        msg: "renderFavorites() erfolgreich ausgeführt",
      });
    } catch (e) {
      results.push({
        ok: false,
        msg: "renderFavorites() fehlgeschlagen: " + e.message,
      });
    }

    // Loading/empty view
    try {
      weatherDisplay.showEmpty();
      results.push({ ok: true, msg: "weatherDisplay.showEmpty() OK" });
    } catch (e) {
      results.push({
        ok: false,
        msg: "weatherDisplay.showEmpty() failed: " + e.message,
      });
    }
  } catch (err) {
    results.push({ ok: false, msg: "Smoke test exception: " + err.message });
  }

  console.group("Smoke Test Results");
  results.forEach((r) =>
    console[r.ok ? "log" : "error"]((r.ok ? "PASS" : "FAIL") + " - " + r.msg)
  );
  console.groupEnd();
  return results;
}

/**
 * Subscribe to Push (best-effort). Stores subscription JSON in localStorage.
 * Note: For production you should pass a VAPID public key (applicationServerKey).
 */
async function subscribeToPush() {
  if (!("serviceWorker" in navigator))
    throw new Error("Service Worker nicht unterstützt");
  const reg = await navigator.serviceWorker.ready;
  try {
    let stored = await ensureVapidKey();
    if (!stored || stored.length < 20) {
      stored = resolveVapidKey();
    }
    if (!stored || stored.length < 20) {
      throw new Error(
        'Missing VAPID public key. Bitte füge in den Einstellungen deinen VAPID Public Key (Base64 URL-safe) ein oder starte den lokalen Push-Server und klicke "Fetch VAPID".'
      );
    }
    persistVapidKey(stored);
    const options = { userVisibleOnly: true };
    try {
      options.applicationServerKey = urlBase64ToUint8Array(stored);
    } catch (e) {
      throw new Error(
        "Ungültiges VAPID Key Format. Bitte überprüfe den Public Key."
      );
    }

    const sub = await reg.pushManager.subscribe(options);
    // try to send subscription to local push server if reachable
    try {
      await sendSubscriptionToServer(sub);
      showSuccess("Push-Subscription an lokalen Server übermittelt");
    } catch (e) {
      console.warn("Could not send subscription to local server", e);
    }
    localStorage.setItem("wetter_push_subscription", JSON.stringify(sub));
    localStorage.setItem("wetter_push_enabled", "true");
    console.log("Push Subscription:", sub);
    syncPushToggleState();
    return true;
  } catch (err) {
    console.warn("Push subscription failed", err);
    throw err;
  }
}

/**
 * Fetch VAPID public key from local push server (/keys)
 */
async function fetchVapidFromServer() {
  try {
    const res = await fetch("http://localhost:3030/keys");
    if (!res.ok) throw new Error("Local push server not available");
    const json = await res.json();
    return json.publicKey || null;
  } catch (e) {
    console.warn("fetchVapidFromServer failed", e);
    return null;
  }
}

/**
 * Send subscription object to local push server /subscribe
 */
async function sendSubscriptionToServer(subscription) {
  try {
    const res = await fetch("http://localhost:3030/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(subscription),
    });
    if (!res.ok) throw new Error("Server returned " + res.status);
    return await res.json();
  } catch (e) {
    console.warn("sendSubscriptionToServer failed", e);
    throw e;
  }
}

/**
 * Helper: converts a URL-safe base64 string to Uint8Array (for VAPID key)
 */
function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

async function unsubscribeFromPush() {
  if (!("serviceWorker" in navigator))
    throw new Error("Service Worker nicht unterstützt");
  const reg = await navigator.serviceWorker.ready;
  const subs = await reg.pushManager.getSubscription();
  if (subs) {
    await subs.unsubscribe();
  }
  localStorage.removeItem("wetter_push_subscription");
  localStorage.setItem("wetter_push_enabled", "false");
  syncPushToggleState();
  return true;
}

function handlePushToggleError(error) {
  const message = error?.message || "Unbekannter Fehler";
  const normalized = message.toLowerCase();

  if (normalized.includes("vapid")) {
    showWarning(
      "Push-Benachrichtigungen benötigen einen gültigen VAPID Public Key.",
      null,
      {
        title: "Push-Setup unvollständig",
        list: [
          "Öffne ⚙️ Einstellungen → Push-Benachrichtigungen",
          'Trage den Base64 VAPID Public Key ein oder klicke "Fetch VAPID"',
          "Aktiviere anschließend den Push-Schalter erneut",
        ],
        actions: [
          {
            label: "Einstellungen öffnen",
            kind: "primary",
            onClick: () => openSettingsModal("vapidKeyInput"),
          },
          {
            label: "Fetch VAPID",
            onClick: () => document.getElementById("fetchVapidBtn")?.click(),
          },
        ],
      }
    );
    return;
  }

  if (normalized.includes("service worker")) {
    showWarning(
      "Push-Benachrichtigungen werden von diesem Browser leider nicht unterstützt.",
      null,
      {
        meta: "Verwende einen aktuellen Chromium- oder Firefox-Browser mit aktiviertem Service Worker Support.",
      }
    );
    return;
  }

  showWarning(`Push konnte nicht umgeschaltet werden: ${message}`, null, {
    meta: "Bitte prüfe die Browser-Konsole für weitere Details.",
  });
}

function resolveVapidKey() {
  const input = document.getElementById("vapidKeyInput");
  const typed = input?.value?.trim();
  if (typed && typed.length >= 20) return typed;
  try {
    const stored = localStorage.getItem("wetter_vapid_public") || "";
    return stored.trim();
  } catch (e) {
    return "";
  }
}

function persistVapidKey(key) {
  if (!key) return "";
  const normalized = key.trim();
  if (!normalized) return "";
  try {
    localStorage.setItem("wetter_vapid_public", normalized);
  } catch (e) {
    console.warn("VAPID key konnte nicht gespeichert werden:", e);
  }
  const input = document.getElementById("vapidKeyInput");
  if (input && input.value !== normalized) {
    input.value = normalized;
  }
  return normalized;
}

function hasUsableVapidKey() {
  return resolveVapidKey().length >= 20;
}

async function ensureVapidKey({ forceFetch = false } = {}) {
  if (!forceFetch) {
    const existing = resolveVapidKey();
    if (existing && existing.length >= 20) {
      return existing;
    }
  }
  const fetched = await fetchVapidFromServer();
  if (fetched && fetched.length >= 20) {
    return persistVapidKey(fetched);
  }
  return null;
}

function syncPushToggleState() {
  const pushBtn = document.getElementById("pushToggle");
  if (!pushBtn) return;
  let enabled = false;
  try {
    enabled = localStorage.getItem("wetter_push_enabled") === "true";
  } catch (e) {
    enabled = false;
  }
  const hasKey = hasUsableVapidKey();
  pushBtn.textContent = enabled ? "🔕" : "🔔";
  pushBtn.title = enabled
    ? "Push-Benachrichtigungen deaktivieren"
    : hasKey
    ? "Push-Benachrichtigungen aktivieren"
    : "VAPID Key erforderlich";
  pushBtn.setAttribute("aria-pressed", enabled ? "true" : "false");
  const shouldDisable = !hasKey && !enabled;
  pushBtn.disabled = shouldDisable;
  pushBtn.dataset.pushState = enabled ? "on" : "off";
  pushBtn.dataset.pushKey = hasKey ? "ready" : "missing";
}

function setPushToggleBusy(isBusy) {
  const pushBtn = document.getElementById("pushToggle");
  if (!pushBtn) return;
  if (isBusy) {
    pushBtn.setAttribute("aria-busy", "true");
    pushBtn.dataset.loading = "true";
    pushBtn.disabled = true;
  } else {
    pushBtn.removeAttribute("aria-busy");
    delete pushBtn.dataset.loading;
    syncPushToggleState();
  }
}

function openSettingsModal(focusFieldId) {
  const modal = document.getElementById("settings-modal");
  const modalOverlay = document.getElementById("modal-overlay");
  if (!modal) return;
  modal.classList.add("active");
  modal.setAttribute("aria-hidden", "false");
  modalOverlay?.classList.add("active");
  document.body.style.overflow = "hidden";

  if (focusFieldId) {
    focusAndHighlight(focusFieldId, 250);
  }
}

function closeModal(modalId) {
  if (!modalId) return;
  const modal = document.getElementById(modalId);
  const modalOverlay = document.getElementById("modal-overlay");
  if (!modal) return;
  modal.classList.remove("active");
  modal.setAttribute("aria-hidden", "true");
  modalOverlay?.classList.remove("active");
  document.body.style.overflow = "";
}

function closeAllModals() {
  document.querySelectorAll(".modal.active").forEach((modal) => {
    modal.classList.remove("active");
    modal.setAttribute("aria-hidden", "true");
  });
  const modalOverlay = document.getElementById("modal-overlay");
  modalOverlay?.classList.remove("active");
  document.body.style.overflow = "";
}

function focusAndHighlight(elementId, delay = 150) {
  if (!elementId) return;
  setTimeout(() => {
    const element = document.getElementById(elementId);
    if (!element) return;
    try {
      element.focus({ preventScroll: false });
    } catch (e) {
      element.focus();
    }
    element.classList.add("input-highlight");
    setTimeout(() => element.classList.remove("input-highlight"), 2200);
  }, delay);
}

// === Drag ohne Zucken ===
function enableSmoothDragScroll(container) {
  let isDown = false;
  let startX, scrollLeft;

  const startDrag = (pageX) => {
    isDown = true;
    container.classList.add("dragging");
    startX = pageX - container.offsetLeft;
    scrollLeft = container.scrollLeft;
  };

  const endDrag = () => {
    isDown = false;
    container.classList.remove("dragging");
  };

  const moveDrag = (pageX) => {
    if (!isDown) return;
    const x = pageX - container.offsetLeft;
    const walk = x - startX;
    container.scrollLeft = scrollLeft - walk;
  };

  // Maus
  container.addEventListener("mousedown", (e) => startDrag(e.pageX));
  container.addEventListener("mousemove", (e) => moveDrag(e.pageX));
  window.addEventListener("mouseup", endDrag);

  // Touch
  container.addEventListener("touchstart", (e) =>
    startDrag(e.touches[0].pageX)
  );
  container.addEventListener("touchmove", (e) => moveDrag(e.touches[0].pageX));
  container.addEventListener("touchend", endDrag);
}

// === Pfeilnavigation ===
function updateView() {
  const boxWidth = boxes[0].offsetWidth + 30;
  const offset = -currentIndex * boxWidth;
  track.style.transform = `translateX(${offset}px)`;
}

document.getElementById("nextBtn").addEventListener("click", () => {
  if (currentIndex < boxes.length - 1) {
    currentIndex++;
    updateView();
  }
});

document.getElementById("prevBtn").addEventListener("click", () => {
  if (currentIndex > 0) {
    currentIndex--;
    updateView();
  }
});

window.addEventListener("load", updateView);

// === Suche mit Enter ===
document.getElementById("cityInput").addEventListener("keypress", (e) => {
  if (e.key === "Enter") document.getElementById("searchBtn").click();
});

// === Dark Mode ===
function toggleMode() {
  document.body.classList.toggle("dark-mode");
  const isDark = document.body.classList.contains("dark-mode");
  document.getElementById("modeToggle").innerText = isDark
    ? "☀️ Light Mode"
    : "🌙 Dark Mode";
}
