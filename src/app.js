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
      brightSky: null
    };
    this.isDarkMode = this._loadThemePreference();
    this.favorites = this._loadFavorites();
    this.units = {
      temperature: UI_CONFIG.TEMPERATURE_UNIT,
      wind: UI_CONFIG.WIND_UNIT
    };
  }

  _loadThemePreference() {
    try {
      return localStorage.getItem('wetter_dark_mode') === 'true';
    } catch (e) {
      return false;
    }
  }

  _loadFavorites() {
    try {
      return JSON.parse(localStorage.getItem('wetter_favorites')) || [];
    } catch (e) {
      return [];
    }
  }

  saveFavorite(city, coords) {
    const favorite = { city, coords, addedAt: Date.now() };
    
    // Prüfe ob schon vorhanden
    const exists = this.favorites.some(f => f.city.toLowerCase() === city.toLowerCase());
    if (!exists) {
      this.favorites.push(favorite);
      try {
        localStorage.setItem('wetter_favorites', JSON.stringify(this.favorites));
      } catch (e) {
        console.warn('Fehler beim Speichern von Favoriten:', e);
      }
    }
  }

  removeFavorite(city) {
    this.favorites = this.favorites.filter(f => f.city.toLowerCase() !== city.toLowerCase());
    try {
      localStorage.setItem('wetter_favorites', JSON.stringify(this.favorites));
    } catch (e) {
      console.warn('Fehler beim Löschen von Favoriten:', e);
    }
  }

  isFavorite(city) {
    return this.favorites.some(f => f.city.toLowerCase() === city.toLowerCase());
  }

  moveFavorite(fromIndex, toIndex) {
    if (fromIndex === toIndex) return;
    if (fromIndex < 0 || toIndex < 0 || fromIndex >= this.favorites.length || toIndex > this.favorites.length) return;
    const item = this.favorites.splice(fromIndex, 1)[0];
    this.favorites.splice(toIndex, 0, item);
    try {
      localStorage.setItem('wetter_favorites', JSON.stringify(this.favorites));
    } catch (e) {
      console.warn('Fehler beim Speichern der Favoriten-Reihenfolge:', e);
    }
  }
}

/**
 * Einfaches HTML-Escape (für Sicherheitszwecke beim Erzeugen von innerHTML vermeiden wir es,
 * stattdessen erzeugen wir DOM-Elemente in `renderFavorites`).
 */
function escapeHtml(str) {
  const d = document.createElement('div');
  d.textContent = String(str);
  return d.innerHTML;
}

/**
 * Rendert die Favoriten-Liste in der UI
 */
function renderFavorites() {
  const container = document.querySelector('.favorites-list');
  if (!container || !window.appState) return;

  // Leere Container
  container.innerHTML = '';

  const favs = appState.favorites || [];
  if (!favs.length) {
    const p = document.createElement('p');
    p.className = 'no-favorites';
    p.textContent = '⭐ Noch keine Favoriten. Favorit hinzufügen über das Stern-Symbol.';
    container.appendChild(p);
    return;
  }

  favs.forEach(f => {
    const item = document.createElement('div');
    item.className = 'favorite-item';
    item.dataset.city = f.city;
    item.draggable = true;

    item.addEventListener('dragstart', (ev) => {
      ev.dataTransfer.setData('text/plain', f.city);
      item.classList.add('dragging');
    });

    item.addEventListener('dragend', () => {
      item.classList.remove('dragging');
    });

    item.addEventListener('dragover', (ev) => {
      ev.preventDefault();
      item.classList.add('dragover');
    });

    item.addEventListener('dragleave', () => {
      item.classList.remove('dragover');
    });

    item.addEventListener('drop', (ev) => {
      ev.preventDefault();
      const cityDragged = ev.dataTransfer.getData('text/plain');
      const fromIndex = appState.favorites.findIndex(x => x.city === cityDragged);
      const toIndex = appState.favorites.findIndex(x => x.city === f.city);
      if (fromIndex >= 0 && toIndex >= 0) {
        appState.moveFavorite(fromIndex, toIndex);
        renderFavorites();
      }
    });

    const nameBtn = document.createElement('button');
    nameBtn.className = 'fav-name btn-small';
    nameBtn.type = 'button';
    nameBtn.textContent = f.city;
    nameBtn.addEventListener('click', () => {
      loadWeather(f.city);
    });

    const removeBtn = document.createElement('button');
    removeBtn.className = 'favorite-remove btn-remove';
    removeBtn.type = 'button';
    removeBtn.dataset.city = f.city;
    removeBtn.title = 'Favorit entfernen';
    removeBtn.textContent = '✕';
    removeBtn.addEventListener('click', (e) => {
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

    item.appendChild(nameBtn);
    item.appendChild(removeBtn);
    container.appendChild(item);
  });
}

/**
 * Build render-ready data from raw API results and apply unit conversions.
 * Returns an object with formatted arrays ready for the UI (hourly/daily per source).
 */
function buildRenderData(rawData, units) {
  const result = { openMeteo: null, brightSky: null };
  
  // Helper: compute feels-like temperature (apparent temperature)
  // Uses simple formula combining temperature (°C), relative humidity (%) and wind (m/s)
  // Returns value in °C or null if insufficient data
  function computeFeelsLike(tC, humidity, wind_mps) {
    if (typeof tC !== 'number') return null;
    const RH = (typeof humidity === 'number') ? humidity : null;
    const W = (typeof wind_mps === 'number') ? wind_mps : 0;
    // Approximate vapor pressure (hPa)
    let e = 0;
    if (RH !== null) {
      e = RH / 100 * 6.105 * Math.exp(17.27 * tC / (237.7 + tC));
    }
    // Apparent temperature (Steadman-like): T + 0.33*e - 0.70*wind - 4.00
    const at = tC + 0.33 * e - 0.70 * W - 4.0;
    return Math.round(at * 10) / 10;
  }
  try {
    if (rawData.openMeteo) {
      const hourly = openMeteoAPI.formatHourlyData(rawData.openMeteo, 48);
      const daily = openMeteoAPI.formatDailyData(rawData.openMeteo, 7);

      // Convert temps and wind per units
      const convertedHourly = hourly.map(h => {
        const tC = (typeof h.temperature === 'number') ? h.temperature : null; // °C
        // Open-Meteo provides windspeed_10m in km/h -> convert to m/s for internal calc
        const rawWind = (typeof h.windSpeed === 'number') ? h.windSpeed : null; // likely km/h
        const wind_mps = rawWind === null ? null : (rawWind / 3.6);
        const temp = tC === null ? null : (units.temperature === 'F' ? (tC * 9/5 + 32) : tC);
        // Wind conversion: m/s -> km/h (multiply by 3.6) or m/s -> mph (multiply by 2.237)
        let wind = null;
        if (wind_mps !== null) {
          if (units.wind === 'm/s') {
            wind = wind_mps;
          } else if (units.wind === 'mph') {
            wind = wind_mps * 2.237; // 1 m/s = 2.237 mph
          } else {
            wind = wind_mps * 3.6; // Default: km/h
          }
        }
        // compute feels-like in °C using internal values, then convert if needed
        const feelsC = (tC === null) ? null : computeFeelsLike(tC, h.humidity ?? null, wind_mps);
        const feels = feelsC === null ? null : (units.temperature === 'F' ? (feelsC * 9/5 + 32) : feelsC);
        return Object.assign({}, h, { temperature: temp, windSpeed: wind, feelsLike: feels });
      });

      const convertedDaily = daily.map(d => {
        const max = (typeof d.tempMax === 'number') ? d.tempMax : null;
        const min = (typeof d.tempMin === 'number') ? d.tempMin : null;
        const tMax = max === null ? null : (units.temperature === 'F' ? (max * 9/5 + 32) : max);
        const tMin = min === null ? null : (units.temperature === 'F' ? (min * 9/5 + 32) : min);
        return Object.assign({}, d, { tempMax: tMax, tempMin: tMin });
      });

      result.openMeteo = { hourly: convertedHourly, daily: convertedDaily };
      // Group hourly into days for 7-day view (first 3 days will include per-hour slices)
      function groupHourlyByDay(hourlyArray, maxDays = 7) {
        const map = new Map();
        hourlyArray.forEach(h => {
          try {
            const d = new Date(h.time);
            const dateKey = d.toISOString().split('T')[0];
            if (!map.has(dateKey)) map.set(dateKey, []);
            map.get(dateKey).push(h);
          } catch (e) {
            // ignore malformed time
          }
        });
        // Convert map to array and limit to maxDays
        const arr = Array.from(map.entries()).map(([date, hours]) => ({ date, hours }));
        return arr.slice(0, maxDays);
      }
      result.openMeteo.byDay = groupHourlyByDay(convertedHourly, 7);
    }

    if (rawData.brightSky) {
      const bs = brightSkyAPI.formatWeatherData(rawData.brightSky, 48);
      const converted = bs.map(h => {
        const tC = (typeof h.temperature === 'number') ? h.temperature : null; // assume °C
        const wind_mps = (typeof h.windSpeed === 'number') ? h.windSpeed : null; // assume m/s
        const temp = tC === null ? null : (units.temperature === 'F' ? (tC * 9/5 + 32) : tC);
        // Wind conversion: m/s -> km/h or m/s -> mph
        let wind = null;
        if (wind_mps !== null) {
          if (units.wind === 'm/s') {
            wind = wind_mps;
          } else if (units.wind === 'mph') {
            wind = wind_mps * 2.237; // 1 m/s = 2.237 mph
          } else {
            wind = wind_mps * 3.6; // Default: km/h
          }
        }
        const feelsC = (tC === null) ? null : computeFeelsLike(tC, h.relativeHumidity ?? h.humidity ?? null, wind_mps);
        const feels = feelsC === null ? null : (units.temperature === 'F' ? (feelsC * 9/5 + 32) : feelsC);
        return Object.assign({}, h, { temperature: temp, windSpeed: wind, feelsLike: feels });
      });
      result.brightSky = { hourly: converted };
    }
  } catch (e) {
    console.warn('buildRenderData failed', e);
  }
  return result;
}

/**
 * Rerender UI from appState.renderData
 */
function renderFromRenderData() {
  try {
    if (!appState || !appState.renderData) return;
    const city = appState.currentCity || '';
    // display current (uses renderData format)
    weatherDisplay.displayCurrent(appState.renderData, city);

    // hourly and forecast for OpenMeteo
    if (appState.renderData.openMeteo) {
      weatherDisplay.displayHourly(appState.renderData.openMeteo.hourly, 'Open-Meteo');
      weatherDisplay.displayForecast(appState.renderData.openMeteo.daily);
    }

    // brightSky hourly (if present)
    if (appState.renderData.brightSky) {
      weatherDisplay.displayHourly(appState.renderData.brightSky.hourly, 'BrightSky');
    }
  } catch (e) {
    console.warn('renderFromRenderData failed', e);
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
      addressdetails: API_ENDPOINTS.NOMINATIM.PARAMS.addressdetails
    });

    const url = `${API_ENDPOINTS.NOMINATIM.BASE}?${params.toString()}`;
    const response = await safeApiFetch(url, {}, API_ENDPOINTS.NOMINATIM.TIMEOUT);
    const geoData = await response.json();

    const validation2 = validateApiResponse(geoData, 'nominatim');
    if (!validation2.valid) {
      throw new Error(validation2.error);
    }

    console.log(`✅ Ort gefunden: ${geoData[0].display_name}`);

    return {
      city: geoData[0].display_name,
      lat: parseFloat(geoData[0].lat),
      lon: parseFloat(geoData[0].lon),
      results: geoData
    };
  } catch (error) {
    console.error('❌ Ortssuche fehlgeschlagen:', error.message);
    throw error;
  }
}

/**
 * Lädt Wetterdaten von beiden APIs mit Fallback
 */
async function fetchWeatherData(lat, lon) {
  const sources = [];
  
  console.log(`🌡️ Lade Wetterdaten für ${lat}, ${lon}`);

  // Versuche Open-Meteo
  const openMeteoResult = await openMeteoAPI.fetchWeather(lat, lon);
  
  if (!openMeteoResult.error) {
    sources.push({
      name: 'Open-Meteo',
      success: true,
      duration: openMeteoResult.duration,
      fromCache: openMeteoResult.fromCache
    });
  } else {
    sources.push({
      name: 'Open-Meteo',
      success: false,
      error: openMeteoResult.error
    });
    showWarning(`Open-Meteo: ${openMeteoResult.error}`);
  }

  // Versuche BrightSky
  const brightSkyResult = await brightSkyAPI.fetchWeather(lat, lon);
  
  if (!brightSkyResult.error) {
    sources.push({
      name: 'BrightSky',
      success: true,
      duration: brightSkyResult.duration,
      fromCache: brightSkyResult.fromCache
    });
  } else {
    sources.push({
      name: 'BrightSky',
      success: false,
      error: brightSkyResult.error
    });
    showWarning(`BrightSky: ${brightSkyResult.error}`);
  }

  // Prüfe ob mindestens eine Quelle erfolgreich war
  const hasData = sources.some(s => s.success);
  if (!hasData) {
    throw new Error('Keine Wetterdaten verfügbar - beide APIs fehlgeschlagen');
  }

  return {
    openMeteo: openMeteoResult.error ? null : openMeteoResult.data,
    brightSky: brightSkyResult.error ? null : brightSkyResult.data,
    sources
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
    weatherDisplay.showSourcesComparison(appState?.renderData?.openMeteo ? appState.renderData.openMeteo : null,
                                          appState?.renderData?.brightSky ? appState.renderData.brightSky : null,
                                          sources);
  } catch (e) {
    // ignore
  }

  // Zeige Open-Meteo Daten
  if (openMeteo) {
    // Prefer renderData (converted & feels-like included) if available
    const rd = appState?.renderData?.openMeteo?.hourly;
    const hourlyData = rd && rd.length ? rd.slice(0,24) : openMeteoAPI.formatHourlyData(openMeteo, 24);
    weatherDisplay.displayHourly(hourlyData, 'Open-Meteo');

    // Zeige aktuellen Wert (uses converted renderData when present)
    if (hourlyData.length > 0) {
      weatherDisplay.updateCurrentValues({
        temp: hourlyData[0].temperature,
        windSpeed: hourlyData[0].windSpeed,
        humidity: hourlyData[0].humidity,
        feelsLike: hourlyData[0].feelsLike ?? hourlyData[0].feels_like,
        emoji: hourlyData[0].emoji,
        description: hourlyData[0].description || ''
      });
    }

    // Zeige 5-Tage Vorhersage
    const dailyData = openMeteoAPI.formatDailyData(openMeteo, 5);
    weatherDisplay.displayForecast(dailyData);
  }

  // Zeige BrightSky Daten als Alternative
  if (brightSky) {
    const formattedData = brightSkyAPI.formatWeatherData(brightSky, 24);
    console.log('BrightSky Daten verfügbar:', formattedData.length);
  }
}

/**
 * Hauptfunktion: Wetter laden und anzeigen
 */
async function loadWeather(city) {
  try {
    // Zeige Loading-State
    weatherDisplay.showLoading();
    searchComponent.setLoading(true);
    errorHandler.clearAll();

    // Suche Ort
    const location = await searchLocation(city);
    appState.currentCity = location.city;
    appState.currentCoordinates = { lat: location.lat, lon: location.lon };

    // Lade Wetterdaten
    const weatherData = await fetchWeatherData(location.lat, location.lon);

    // Speichere WeatherData im globalen State und bereite renderbare Daten vor
    try {
      appState.weatherData = weatherData;
      appState.renderData = buildRenderData(weatherData, appState.units || { temperature: 'C', wind: 'km/h' });
    } catch (e) { /* ignore */ }

    // Zeige Ergebnisse (verwende die konvertierten renderData für Anzeige)
    try {
      weatherDisplay.displayCurrent(appState.renderData, location.city);
    } catch (e) {
      // Fallback: falls renderData fehlt, zeige rohe Daten
      weatherDisplay.displayCurrent(weatherData, location.city);
    }
    displayWeatherResults(location, weatherData);

    // Speichere im Cache
    weatherCache.setGeo(city, {
      city: location.city,
      lat: location.lat,
      lon: location.lon
    });

    showSuccess(`✅ Wetter für ${location.city} geladen`);
  } catch (error) {
    console.error('❌ Fehler beim Laden:', error);
    weatherDisplay.showError(error.message);
    errorHandler.showWithRetry(error.message, () => loadWeather(city));
  } finally {
    searchComponent.setLoading(false);
  }
}

/**
 * Theme wechseln
 */
function toggleDarkMode() {
  appState.isDarkMode = !appState.isDarkMode;
  document.body.classList.toggle('dark-mode', appState.isDarkMode);
  
  try {
    localStorage.setItem('wetter_dark_mode', appState.isDarkMode);
  } catch (e) {
    console.warn('Fehler beim Speichern des Themes:', e);
  }

  const btn = document.getElementById('modeToggle');
  if (btn) {
    btn.textContent = appState.isDarkMode ? '☀️ Light Mode' : '🌙 Dark Mode';
  }
}

/**
 * Initialisierung
 */
function initApp() {
  console.log('🚀 Initialisiere Wetter-App...');

  // Initialisiere Components
  initErrorHandler('#error-container');
  
  searchComponent = new SearchInputComponent('#cityInput', '#searchBtn', '#recent-cities');
  weatherDisplay = new WeatherDisplayComponent('current-weather', 'forecast-container');

  // Globale State
  appState = new AppState();

  // Render Favorites initial
  try {
    renderFavorites();
  } catch (e) {
    console.warn('Favoriten rendern fehlgeschlagen:', e);
  }

  // Event-Listener
  window.addEventListener('search', (e) => {
    loadWeather(e.detail.city);
  });

  document.getElementById('modeToggle')?.addEventListener('click', toggleDarkMode);

  // Settings Button - Toggle Modal
  const settingsBtn = document.getElementById('settingsBtn');
  const settingsModal = document.getElementById('settings-modal');
  const modalOverlay = document.getElementById('modal-overlay');
  
  if (settingsBtn && settingsModal) {
    settingsBtn.addEventListener('click', () => {
      settingsModal.classList.add('active');
      settingsModal.setAttribute('aria-hidden', 'false');
      modalOverlay.classList.add('active');
      document.body.style.overflow = 'hidden';
    });
  }

  // Modal Close Handlers
  const closeModalBtns = document.querySelectorAll('.modal-close');
  closeModalBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const modalId = btn.dataset.close;
      const modal = document.getElementById(modalId);
      if (modal) {
        modal.classList.remove('active');
        modal.setAttribute('aria-hidden', 'true');
        modalOverlay.classList.remove('active');
        document.body.style.overflow = '';
      }
    });
  });

  // Close modal on overlay click
  if (modalOverlay) {
    modalOverlay.addEventListener('click', () => {
      document.querySelectorAll('.modal.active').forEach(modal => {
        modal.classList.remove('active');
        modal.setAttribute('aria-hidden', 'true');
      });
      modalOverlay.classList.remove('active');
      document.body.style.overflow = '';
    });
  }

  // Tab Switching for Extra Features
  const tabButtons = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');
  
  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const tabName = btn.dataset.tab;
      
      // Remove active from all
      tabButtons.forEach(b => b.classList.remove('active'));
      tabContents.forEach(c => {
        c.classList.remove('active');
        c.style.display = 'none';
      });
      
      // Add active to clicked
      btn.classList.add('active');
      const targetContent = document.querySelector(`[data-tab-content="${tabName}"]`);
      if (targetContent) {
        targetContent.classList.add('active');
        targetContent.style.display = 'block';
      }
    });
  });

  // Units selects initial state and handlers
  const tempSelect = document.getElementById('temp-unit-select');
  const windSelect = document.getElementById('wind-unit-select');
  // Load persisted units if present
  try {
    const savedTemp = localStorage.getItem('wetter_unit_temp');
    const savedWind = localStorage.getItem('wetter_unit_wind');
    if (savedTemp) appState.units.temperature = savedTemp;
    if (savedWind) appState.units.wind = savedWind;
  } catch (e) { /* ignore */ }

  if (tempSelect) {
    tempSelect.value = appState.units.temperature || tempSelect.value;
    tempSelect.addEventListener('change', (e) => {
      appState.units.temperature = e.target.value;
      try { localStorage.setItem('wetter_unit_temp', e.target.value); } catch (err) {}
      // Rebuild renderData and re-render
      try {
        if (appState.weatherData) {
          appState.renderData = buildRenderData(appState.weatherData, appState.units);
          renderFromRenderData();
        }
      } catch (err) { console.warn('Unit change render failed', err); }
    });
  }

  if (windSelect) {
    windSelect.value = appState.units.wind || windSelect.value;
    windSelect.addEventListener('change', (e) => {
      appState.units.wind = e.target.value;
      try { localStorage.setItem('wetter_unit_wind', e.target.value); } catch (err) {}
      try {
        if (appState.weatherData) {
          appState.renderData = buildRenderData(appState.weatherData, appState.units);
          renderFromRenderData();
        }
      } catch (err) { console.warn('Unit change render failed', err); }
    });
  }

  // Setze initiales Theme
  if (appState.isDarkMode) {
    document.body.classList.add('dark-mode');
  }

  // Favoriten Toggle: Delegierter Klick-Handler (für den Stern-Button im aktuellen View)
  document.addEventListener('click', (e) => {
    const favToggle = e.target.closest && e.target.closest('#favoriteToggle');
    if (favToggle) {
      const city = favToggle.dataset.city;
      if (!city) return;

      if (appState.isFavorite(city)) {
        appState.removeFavorite(city);
        favToggle.textContent = '☆';
        favToggle.title = 'Zu Favoriten hinzufügen';
        showInfo(`${city} aus Favoriten entfernt`);
      } else {
        appState.saveFavorite(city, appState.currentCoordinates || null);
        favToggle.textContent = '⭐';
        favToggle.title = 'Aus Favoriten entfernen';
        showSuccess(`${city} zu Favoriten hinzugefügt`);
      }

      // Update Favoriten-Liste
      try { renderFavorites(); } catch (err) { console.warn(err); }
    }
  });

  // Starte Cache-Cleanup
  setCacheInvalidation();

  // Push toggle handler (subscribe/unsubscribe)
  const pushBtn = document.getElementById('pushToggle');
  if (pushBtn) {
    pushBtn.addEventListener('click', async () => {
      try {
        const enabled = localStorage.getItem('wetter_push_enabled') === 'true';
        if (enabled) {
          await unsubscribeFromPush();
          pushBtn.textContent = '🔔';
          pushBtn.title = 'Push-Benachrichtigungen aktivieren';
          showInfo('Push-Benachrichtigungen deaktiviert');
        } else {
          const ok = await subscribeToPush();
          if (ok) {
            pushBtn.textContent = '🔕';
            pushBtn.title = 'Push-Benachrichtigungen deaktivieren';
            showSuccess('Push-Benachrichtigungen aktiviert (Subscription gespeichert)');
          }
        }
      } catch (e) {
        console.warn('Push toggle error', e);
        showWarning('Push konnte nicht umgeschaltet werden: '+(e && e.message));
      }
    });
  }

  // VAPID Save button
  const saveVapidBtn = document.getElementById('saveVapidBtn');
  if (saveVapidBtn) {
    saveVapidBtn.addEventListener('click', () => {
      const v = document.getElementById('vapidKeyInput')?.value || '';
      try { localStorage.setItem('wetter_vapid_public', v.trim()); showSuccess('VAPID key gespeichert.'); } catch (e) { showWarning('Konnte VAPID key nicht speichern'); }
    });
  }

  // Fetch VAPID from local server button
  const fetchVapidBtn = document.getElementById('fetchVapidBtn');
  if (fetchVapidBtn) {
    fetchVapidBtn.addEventListener('click', async () => {
      try {
        const key = await fetchVapidFromServer();
        if (key) {
          document.getElementById('vapidKeyInput').value = key;
          localStorage.setItem('wetter_vapid_public', key);
          showSuccess('VAPID key vom lokalen Server geladen');
        } else {
          showWarning('Konnte VAPID key nicht vom lokalen Server laden');
        }
      } catch (e) {
        showWarning('Fehler beim Laden des VAPID keys: '+(e && e.message));
      }
    });
  }

  // AUTO-FETCH VAPID on app init (fixes push notification issue)
  (async () => {
    try {
      const existingKey = localStorage.getItem('wetter_vapid_public');
      if (!existingKey || existingKey.length < 20) {
        console.log('🔑 Lade VAPID Key automatisch vom Server...');
        const key = await fetchVapidFromServer();
        if (key) {
          localStorage.setItem('wetter_vapid_public', key);
          const vapidInput = document.getElementById('vapidKeyInput');
          if (vapidInput) vapidInput.value = key;
          console.log('✅ VAPID Key automatisch geladen');
        }
      } else {
        console.log('✅ VAPID Key bereits vorhanden');
        const vapidInput = document.getElementById('vapidKeyInput');
        if (vapidInput) vapidInput.value = existingKey;
      }
    } catch (e) {
      console.warn('⚠️ VAPID Auto-Fetch fehlgeschlagen:', e.message);
    }
  })();

  // Test: Zeige empty state
  weatherDisplay.showEmpty();

  // Expose a simple smoke-test callable from console
  window.runSmokeTest = runSmokeTest;

  console.log('✅ App initialisiert');
}

// Globale Komponenten-Instanzen
let appState;
let searchComponent;
let weatherDisplay;

// Starte App wenn DOM bereit
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}

// === Stundenanzeige mit Endlosschleife & sanftem Drag ===
function renderHourly(containerId, times, temps, weatherCodes = [], useIcons = false) {
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
    results.push({ok: !!window.searchComponent, msg: 'searchComponent vorhanden'});
    results.push({ok: !!window.weatherDisplay, msg: 'weatherDisplay vorhanden'});
    results.push({ok: !!window.appState, msg: 'appState vorhanden'});

    // Versuch Favoriten zu rendern
    try {
      renderFavorites();
      results.push({ok: true, msg: 'renderFavorites() erfolgreich ausgeführt'});
    } catch (e) {
      results.push({ok: false, msg: 'renderFavorites() fehlgeschlagen: '+e.message});
    }

    // Loading/empty view
    try {
      weatherDisplay.showEmpty();
      results.push({ok: true, msg: 'weatherDisplay.showEmpty() OK'});
    } catch (e) {
      results.push({ok: false, msg: 'weatherDisplay.showEmpty() failed: '+e.message});
    }
  } catch (err) {
    results.push({ok:false, msg: 'Smoke test exception: '+err.message});
  }

  console.group('Smoke Test Results');
  results.forEach(r => console[r.ok ? 'log' : 'error']((r.ok? 'PASS':'FAIL')+' - '+r.msg));
  console.groupEnd();
  return results;
}

/**
 * Subscribe to Push (best-effort). Stores subscription JSON in localStorage.
 * Note: For production you should pass a VAPID public key (applicationServerKey).
 */
async function subscribeToPush() {
  if (!('serviceWorker' in navigator)) throw new Error('Service Worker nicht unterstützt');
  const reg = await navigator.serviceWorker.ready;
  try {
    // Versuche VAPID key aus localStorage oder Input zu lesen
      let stored = (localStorage.getItem('wetter_vapid_public') || document.getElementById('vapidKeyInput')?.value || '').trim();
      // If missing, attempt to fetch from local push-server /keys
      if (!stored || stored.length < 20) {
        try {
          const fetched = await fetchVapidFromServer();
          if (fetched) {
            stored = fetched;
            localStorage.setItem('wetter_vapid_public', stored);
            showInfo('VAPID public key automatisch vom lokalen Push-Server geladen');
          }
        } catch (e) {
          // ignore - handled below
        }
      }
      if (!stored || stored.length < 20) {
        throw new Error('Missing VAPID public key. Bitte füge in den Einstellungen deinen VAPID Public Key (Base64 URL-safe) ein oder starte den lokalen Push-Server und klicke "Fetch VAPID".');
      }
      const options = { userVisibleOnly: true };
      try {
        options.applicationServerKey = urlBase64ToUint8Array(stored);
      } catch (e) {
        throw new Error('Ungültiges VAPID Key Format. Bitte überprüfe den Public Key.');
      }

      const sub = await reg.pushManager.subscribe(options);
      // try to send subscription to local push server if reachable
      try {
        await sendSubscriptionToServer(sub);
        showSuccess('Push-Subscription an lokalen Server übermittelt');
      } catch (e) {
        console.warn('Could not send subscription to local server', e);
      }
      localStorage.setItem('wetter_push_subscription', JSON.stringify(sub));
      localStorage.setItem('wetter_push_enabled', 'true');
      console.log('Push Subscription:', sub);
      return true;
  } catch (err) {
    console.warn('Push subscription failed', err);
    throw err;
  }
}

/**
 * Fetch VAPID public key from local push server (/keys)
 */
async function fetchVapidFromServer() {
  try {
    const res = await fetch('http://localhost:3030/keys');
    if (!res.ok) throw new Error('Local push server not available');
    const json = await res.json();
    return json.publicKey || null;
  } catch (e) {
    console.warn('fetchVapidFromServer failed', e);
    return null;
  }
}

/**
 * Send subscription object to local push server /subscribe
 */
async function sendSubscriptionToServer(subscription) {
  try {
    const res = await fetch('http://localhost:3030/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(subscription)
    });
    if (!res.ok) throw new Error('Server returned ' + res.status);
    return await res.json();
  } catch (e) {
    console.warn('sendSubscriptionToServer failed', e);
    throw e;
  }
}

/**
 * Helper: converts a URL-safe base64 string to Uint8Array (for VAPID key)
 */
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

async function unsubscribeFromPush() {
  if (!('serviceWorker' in navigator)) throw new Error('Service Worker nicht unterstützt');
  const reg = await navigator.serviceWorker.ready;
  const subs = await reg.pushManager.getSubscription();
  if (subs) {
    await subs.unsubscribe();
  }
  localStorage.removeItem('wetter_push_subscription');
  localStorage.setItem('wetter_push_enabled', 'false');
  return true;
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
    const walk = (x - startX);
    container.scrollLeft = scrollLeft - walk;
  };

  // Maus
  container.addEventListener("mousedown", (e) => startDrag(e.pageX));
  container.addEventListener("mousemove", (e) => moveDrag(e.pageX));
  window.addEventListener("mouseup", endDrag);

  // Touch
  container.addEventListener("touchstart", (e) => startDrag(e.touches[0].pageX));
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
  document.getElementById("modeToggle").innerText = isDark ? "☀️ Light Mode" : "🌙 Dark Mode";
}
