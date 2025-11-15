/* Wetter-Anzeige Component */

class WeatherDisplayComponent {
  constructor(currentContainerId, forecastContainerId) {
    this.currentContainer = document.getElementById(currentContainerId);
    this.forecastContainer = document.getElementById(forecastContainerId);
    this.currentData = null;
  }

  /**
   * Zeigt aktuelle Wetter-Daten an
   * @param {object} weatherData - Aktuelle Wetterdaten
   * @param {string} city - Stadtname
   */
  displayCurrent(weatherData, city) {
    if (!this.currentContainer) return;

    try {
      const html = `
        <div class="weather-current">
          <div class="location-header">
               <h2 class="location-name">📍 ${this._escapeHtml(city)}</h2>
               <div class="location-controls">
                 <button id="favoriteToggle" class="btn-icon favorite-toggle" data-city="${this._escapeHtml(city)}" aria-label="Favorit hinzufügen">☆</button>
                 <span class="location-time" id="current-time"></span>
               </div>
          </div>

          <div class="current-main">
            <div class="temperature-section">
              <span class="current-emoji" id="current-emoji">☀️</span>
              <span class="current-temp" id="current-temp">--°C</span>
              <span class="current-description" id="current-desc">--</span>
            </div>

            <div class="weather-details">
              <div class="detail-item">
                <span class="detail-label">💨 Wind</span>
                <span class="detail-value" id="wind-speed">-- km/h</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">💧 Luftfeuchtigkeit</span>
                <span class="detail-value" id="humidity">-- %</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">🌡️ Gefühlt wie</span>
                <span class="detail-value" id="feels-like">--°C</span>
              </div>
            </div>
          </div>

          <div class="source-info" id="source-info">
            Daten werden geladen...
          </div>
        </div>
      `;

      this.currentContainer.innerHTML = html;
      this.currentData = weatherData;
      this._updateCurrentTime();

      // Update Zeit alle Sekunde
      setInterval(() => this._updateCurrentTime(), 1000);
         // Setze Favoriten-Button Status falls AppState verfügbar
         try {
           const favBtn = document.getElementById('favoriteToggle');
           if (favBtn) {
             favBtn.dataset.city = city;
             const isFav = window.appState && typeof appState.isFavorite === 'function' && appState.isFavorite(city);
             favBtn.textContent = isFav ? '⭐' : '☆';
             favBtn.title = isFav ? 'Aus Favoriten entfernen' : 'Zu Favoriten hinzufügen';
           }
         } catch (e) {
           // ignore if appState not ready
         }
    } catch (error) {
      console.error('Fehler beim Anzeigen der aktuellen Wetter:', error);
      this.currentContainer.innerHTML = '<p>Fehler beim Laden der Wetterdaten</p>';
    }
  }

  /**
   * Aktualisiert aktuelle Zeit-Anzeige
   * @private
   */
  _updateCurrentTime() {
    const timeEl = document.getElementById('current-time');
    if (timeEl) {
      const now = new Date();
      timeEl.textContent = now.toLocaleTimeString('de-DE', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    }
  }

  /**
   * Zeigt Stundendaten an (horizontal scrollbar)
   * @param {array} hourlyData - Array von Stunden-Objekten
   * @param {string} source - API-Quelle
   */
  displayHourly(hourlyData, source = '') {
    if (!this.currentContainer) return;

    try {
      const hourlyHtml = `
        <div class="hourly-section">
          <h3>⏰ Stundenvorhersage</h3>
          <div class="hourly-scroll">
            ${hourlyData.map((hour, idx) => {
              const date = new Date(hour.time);
              const hourStr = date.getHours().toString().padStart(2, '0');
              // Temperatur und Wind basierend auf eingestellten Einheiten formatieren
              const tempRaw = typeof hour.temperature === 'number' ? hour.temperature : null;
              const windRaw = typeof hour.windSpeed === 'number' ? hour.windSpeed : null; // assume m/s input

              const formatTemp = (c) => {
                const unit = window.appState?.units?.temperature || 'C';
                if (c === null) return '--';
                if (unit === 'F') return `${(c * 9/5 + 32).toFixed(1)}°F`;
                return `${c.toFixed(1)}°C`;
              };

              const formatWind = (mps) => {
                const unit = window.appState?.units?.wind || 'km/h';
                if (mps === null) return '';
                if (unit === 'm/s') return `${mps.toFixed(1)} m/s`;
                // default show km/h
                return `${(mps * 3.6).toFixed(0)} km/h`;
              };

              const tempDisplay = tempRaw === null ? '--' : formatTemp(tempRaw);
              const windDisplay = windRaw === null ? '' : `<small>${formatWind(windRaw)}</small>`;

              return `
                <div class="hourly-item" data-hour="${idx}">
                  <div class="hour-time">${hourStr}:00</div>
                  <div class="hour-emoji">${hour.emoji || '❓'}</div>
                  <div class="hour-temp">${tempDisplay}</div>
                  ${windDisplay}
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `;

      this.currentContainer.innerHTML += hourlyHtml;
      this._setupHourlyScroll();
    } catch (error) {
      console.error('Fehler beim Anzeigen der Stundendaten:', error);
    }
  }

  /**
   * Zeigt mehrtägige Vorhersage an
   * @param {array} dailyData - Array von Tages-Objekten
   */
  displayForecast(dailyData) {
    if (!this.forecastContainer) return;

    try {
      // If appState has byDay grouped hourly data, prefer that for an expanded 7-day view
      const byDay = window.appState?.renderData?.openMeteo?.byDay || null;
      const days = byDay && byDay.length ? byDay : (dailyData || []);

      const dateLabel = (dateStr) => {
        const d = new Date(dateStr);
        return d.toLocaleDateString('de-DE', { weekday: 'short', month: 'short', day: 'numeric' });
      };

      // Temperatures in `byDay` are already converted to the user's units in buildRenderData,
      // so formatting should simply append the unit marker.
      const formatTempDay = (value) => {
        const unit = window.appState?.units?.temperature || 'C';
        if (typeof value !== 'number') return '--';
        return `${Math.round(value)}°${unit}`;
      };

      const forecastHtml = [`<div class="weather-forecast"><h2>📅 7-Tage Vorhersage</h2><div class="forecast-grid">`];

      // If byDay contains objects {date, hours}, use them; else dailyData is used
      if (byDay && byDay.length) {
        // Render up to 7 days
        byDay.slice(0,7).forEach((dayObj, idx) => {
          const dateStr = dateLabel(dayObj.date);
          // For first 3 days include hourly scroller
          let hourlyHtml = '';
          if (idx < 3 && Array.isArray(dayObj.hours)) {
            hourlyHtml = `<div class="forecast-hourly">
                <div class="hourly-scroll small">
                  ${dayObj.hours.map(h => {
                    const hour = new Date(h.time).getHours().toString().padStart(2,'0');
                    const temp = (typeof h.temperature === 'number') ? `${h.temperature.toFixed(0)}°` : '--';
                    return `<div class="hourly-item small"><div class="hour-time">${hour}:00</div><div class="hour-emoji">${h.emoji||'❓'}</div><div class="hour-temp">${temp}</div></div>`;
                  }).join('')}
                </div>
              </div>`;
          }

          // Derive daily min/max from hours if possible
          const temps = dayObj.hours ? dayObj.hours.map(h=> (typeof h.temperature==='number')?h.temperature:null).filter(x=>x!==null) : [];
          const max = temps.length ? Math.max(...temps) : null;
          const min = temps.length ? Math.min(...temps) : null;

          forecastHtml.push(`
            <div class="forecast-item">
              <div class="forecast-date">${dateStr}</div>
              <div class="forecast-emoji">${dayObj.hours && dayObj.hours[6] ? dayObj.hours[6].emoji || '❓' : '❓'}</div>
              <div class="forecast-temps">
                <div class="forecast-max">${formatTempDay(max)}</div>
                <div class="forecast-min">${formatTempDay(min)}</div>
              </div>
              ${hourlyHtml}
            </div>
          `);
        });
      } else {
        // Fallback: render dailyData
        (dailyData || []).slice(0,7).forEach(day => {
          const date = new Date(day.date);
          const dateStr = dateLabel(day.date);
          forecastHtml.push(`
            <div class="forecast-item">
              <div class="forecast-date">${dateStr}</div>
              <div class="forecast-emoji">${day.emoji || '❓'}</div>
              <div class="forecast-temps">
                <div class="forecast-max">${formatTempDay(day.tempMax)}</div>
                <div class="forecast-min">${formatTempDay(day.tempMin)}</div>
              </div>
            </div>
          `);
        });
      }

      forecastHtml.push('</div></div>');
      this.forecastContainer.innerHTML = forecastHtml.join('');

      // Setup small hourly scrolls
      this.forecastContainer.querySelectorAll('.hourly-scroll.small').forEach(el => {
        el.style.display = 'flex'; el.style.overflowX = 'auto'; el.style.gap = '8px';
      });
    } catch (error) {
      console.error('Fehler beim Anzeigen der Vorhersage:', error);
      this.forecastContainer.innerHTML = '<p>Fehler beim Laden der Vorhersage</p>';
    }
  }

  /**
   * Aktualisiert Quellen-Information
   * @param {array} sources - Array von Quellen-Objekten {name, success, duration}
   */
  updateSourceInfo(sources) {
    const sourceInfoEl = document.getElementById('source-info');
    if (!sourceInfoEl) return;

    const html = sources.map(src => {
      const statusIcon = src.success ? '✅' : '❌';
      const duration = src.duration ? ` (${src.duration}ms)` : '';
      return `
        <div class="source-item">
          ${statusIcon} <strong>${src.name}</strong>${duration}
        </div>
      `;
    }).join('');

    sourceInfoEl.innerHTML = `<div class="sources-list">${html}</div>`;
  }

  /**
   * Zeigt detaillierten Vergleich zwischen zwei API-Quellen
   * @param {object|null} openData - Open-Meteo aktuelle Data (first hour) or null
   * @param {object|null} brightData - BrightSky aktuelle Data (first hour) or null
   * @param {array} sources - sources metadata
   */
  showSourcesComparison(openData, brightData, sources = []) {
    try {
      const section = document.getElementById('sources-comparison');
      if (section) {
        if (!openData && !brightData) section.style.display = 'none'; else section.style.display = '';
      }
      const openEl = document.querySelector('#source-openmeteo .source-content');
      const brightEl = document.querySelector('#source-brightsky .source-content');

      const unitTemp = window.appState?.units?.temperature || 'C';
      const unitWind = window.appState?.units?.wind || 'km/h';
      const fmt = (v, unit='') => (v === null || v === undefined) ? '–' : `${v}${unit}`;

      // Helper to extract current metrics
      const extract = (d, sourceName) => {
        if (!d) return { temp: null, wind: null, humidity: null, note: 'keine Daten' };
        // d may be either full API raw or formatted hourly array; try common fields
        let temp = null, wind = null, humidity = null, emoji = '';
        if (Array.isArray(d.hourly) && d.hourly.length) {
          const h = d.hourly[0]; temp = h.temperature; wind = h.windSpeed; humidity = h.humidity; emoji = h.emoji || '';
        } else if (d.temperature !== undefined) {
          temp = d.temperature; wind = d.windSpeed; humidity = d.relativeHumidity || d.humidity || null; emoji = d.emoji || '';
        }
        const srcMeta = sources.find(s => s.name.toLowerCase().includes(sourceName.toLowerCase()));
        const status = srcMeta ? (srcMeta.success ? 'OK' : 'FEHLER') : 'unbekannt';
        const duration = srcMeta && srcMeta.duration ? `${srcMeta.duration}ms` : '';
        return { temp, wind, humidity, emoji, status, duration };
      };

      const o = extract(openData, 'Open-Meteo');
      const b = extract(brightData, 'BrightSky');

      if (openEl) {
        openEl.innerHTML = `
          <div class="source-compare">
            <div><strong>Aktuell:</strong> ${o.emoji || ''} ${fmt(o.temp, unitTemp === 'F' ? '°F' : '°C')}</div>
            <div>Wind: ${fmt(o.wind, unitWind === 'm/s' ? ' m/s' : ' km/h')}</div>
            <div>Luft: ${fmt(o.humidity, '%')}</div>
            <div>Status: ${o.status} ${o.duration ? '('+o.duration+')' : ''}</div>
          </div>
        `;
      }

      if (brightEl) {
        brightEl.innerHTML = `
          <div class="source-compare">
            <div><strong>Aktuell:</strong> ${b.emoji || ''} ${fmt(b.temp, unitTemp === 'F' ? '°F' : '°C')}</div>
            <div>Wind: ${fmt(b.wind, unitWind === 'm/s' ? ' m/s' : ' km/h')}</div>
            <div>Luft: ${fmt(b.humidity, '%')}</div>
            <div>Status: ${b.status} ${b.duration ? '('+b.duration+')' : ''}</div>
          </div>
        `;
      }
    } catch (e) {
      console.warn('showSourcesComparison failed', e);
    }
  }

  /**
   * Aktualisiert aktuelle Wetter-Werte
   * @param {object} data - {temp, windSpeed, humidity, feelsLike, emoji, description}
   */
  updateCurrentValues(data) {
    // Temperatur formatieren (angenommen input in °C)
    if (data.temp !== undefined) {
      const tempEl = document.getElementById('current-temp');
      if (tempEl) {
        const unit = window.appState?.units?.temperature || 'C';
        const t = data.temp;
        tempEl.textContent = unit === 'F' ? `${(t * 9/5 + 32).toFixed(1)}°F` : `${t.toFixed(1)}°C`;
      }
    }

    // Wind formatieren (eingehend angenommen in m/s)
    if (data.windSpeed !== undefined) {
      const windEl = document.getElementById('wind-speed');
      if (windEl) {
        const unit = window.appState?.units?.wind || 'km/h';
        const mps = data.windSpeed;
        if (unit === 'm/s') windEl.textContent = `${mps.toFixed(1)} m/s`;
        else windEl.textContent = `${(mps * 3.6).toFixed(0)} km/h`;
      }
    }

    if (data.humidity !== undefined) {
      const humidityEl = document.getElementById('humidity');
      if (humidityEl) humidityEl.textContent = `${data.humidity}%`;
    }

    if (data.feelsLike !== undefined) {
      const feelsEl = document.getElementById('feels-like');
      if (feelsEl) feelsEl.textContent = `${data.feelsLike.toFixed(1)}°C`;
    }

    if (data.emoji) {
      const emojiEl = document.getElementById('current-emoji');
      if (emojiEl) emojiEl.textContent = data.emoji;
    }

    if (data.description) {
      const descEl = document.getElementById('current-desc');
      if (descEl) descEl.textContent = data.description;
    }
  }

  /**
   * Zeigt Loading-State
   */
  showLoading() {
    if (this.currentContainer) {
      this.currentContainer.innerHTML = `
        <div class="loading-state">
          <div class="spinner">🔄</div>
          <p>Wetterdaten werden geladen...</p>
        </div>
      `;
    }
  }

  /**
   * Setup Horizontales Scrolling für Stundendaten
   * @private
   */
  _setupHourlyScroll() {
    const scrollContainer = this.currentContainer?.querySelector('.hourly-scroll');
    if (!scrollContainer) return;

    let isDown = false;
    let startX;
    let scrollLeft;

    scrollContainer.addEventListener('mousedown', (e) => {
      isDown = true;
      startX = e.pageX - scrollContainer.offsetLeft;
      scrollLeft = scrollContainer.scrollLeft;
    });

    scrollContainer.addEventListener('mouseleave', () => {
      isDown = false;
    });

    scrollContainer.addEventListener('mouseup', () => {
      isDown = false;
    });

    scrollContainer.addEventListener('mousemove', (e) => {
      if (!isDown) return;
      e.preventDefault();
      const x = e.pageX - scrollContainer.offsetLeft;
      const walk = (x - startX) * 1;
      scrollContainer.scrollLeft = scrollLeft - walk;
    });
  }

  /**
   * HTML-Escape für Sicherheit
   * @private
   */
  _escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Zeigt Empty-State
   */
  showEmpty() {
    if (this.currentContainer) {
      this.currentContainer.innerHTML = `
        <div class="empty-state">
          <p>🔍 Geben Sie einen Ort ein um Wetterdaten zu sehen</p>
        </div>
      `;
    }
  }

  /**
   * Zeigt Error-State
   */
  showError(errorMessage) {
    if (this.currentContainer) {
      this.currentContainer.innerHTML = `
        <div class="error-state">
          <p>❌ ${this._escapeHtml(errorMessage)}</p>
        </div>
      `;
    }
  }
}