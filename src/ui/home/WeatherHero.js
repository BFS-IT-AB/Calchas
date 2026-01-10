(function (global) {
  function formatTemperature(value, unit) {
    if (value == null || isNaN(value)) return "–";
    const rounded = Math.round(value);
    return `${rounded}°`;
  }

  function getWeatherIcon(code, isDay = true) {
    // Einfache Wetter-Icons basierend auf WMO Weather Code
    const icons = {
      0: isDay ? "☀️" : "🌙", // Clear sky
      1: isDay ? "🌤️" : "🌙", // Mainly clear
      2: "⛅", // Partly cloudy
      3: "☁️", // Overcast
      45: "🌫️",
      48: "🌫️", // Fog
      51: "🌦️",
      53: "🌦️",
      55: "🌧️", // Drizzle
      61: "🌧️",
      63: "🌧️",
      65: "🌧️", // Rain
      71: "🌨️",
      73: "🌨️",
      75: "❄️", // Snow
      80: "🌦️",
      81: "🌧️",
      82: "⛈️", // Rain showers
      95: "⛈️",
      96: "⛈️",
      99: "⛈️", // Thunderstorm
    };
    return icons[code] || "☁️";
  }

  function getWeatherDescription(code) {
    const descriptions = {
      0: "Klar",
      1: "Überwiegend klar",
      2: "Teilweise bewölkt",
      3: "Bedeckt",
      45: "Nebel",
      48: "Nebel mit Reif",
      51: "Leichter Nieselregen",
      53: "Nieselregen",
      55: "Starker Nieselregen",
      61: "Leichter Regen",
      63: "Regen",
      65: "Starker Regen",
      71: "Leichter Schnee",
      73: "Schnee",
      75: "Starker Schnee",
      80: "Leichte Regenschauer",
      81: "Regenschauer",
      82: "Starke Regenschauer",
      95: "Gewitter",
      96: "Gewitter mit Hagel",
      99: "Starkes Gewitter",
    };
    return descriptions[code] || "Bewölkt";
  }

  function formatUpdatedLabel(lastUpdated) {
    if (!lastUpdated) return "jetzt";

    const now = Date.now();
    const diff = now - lastUpdated;
    const minutesAgo = Math.floor(diff / 60000);

    // Wenn weniger als 2 Minuten, zeige "jetzt"
    if (minutesAgo < 2) {
      return "jetzt";
    }

    // Ansonsten zeige die Uhrzeit
    try {
      const date = new Date(lastUpdated);
      return date.toLocaleTimeString("de-DE", {
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (e) {
      return "jetzt";
    }
  }

  function getLocationTime(timezone) {
    if (!timezone) return null;
    try {
      return new Date().toLocaleTimeString("de-DE", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: timezone,
      });
    } catch (e) {
      return null;
    }
  }

  function buildHeroHtml(data) {
    const {
      locationName,
      country,
      description,
      temp,
      feelsLike,
      tempMax,
      tempMin,
      weatherCode,
      isDay,
      updatedLabel,
      tempUnit,
      locationTime,
      precipProb,
      uvIndex,
      windSpeed,
    } = data;

    const icon = getWeatherIcon(weatherCode, isDay);
    const weatherDesc = description || getWeatherDescription(weatherCode);

    // Ortszeit HTML
    const locationTimeHtml = locationTime
      ? `<span class="weather-hero__local-time">🕐 ${locationTime}</span>`
      : "";

    return `
      <div class="weather-hero__widget">
        <div class="weather-hero__main">
          <div class="weather-hero__temp-block">
            <span class="weather-hero__temp-value">${formatTemperature(
              temp,
              tempUnit
            )}</span>
          </div>
          <div class="weather-hero__icon-block">
            <span class="weather-hero__weather-icon">${icon}</span>
          </div>
        </div>

        <div class="weather-hero__condition">${weatherDesc}</div>
        <div class="weather-hero__minmax">
          <span>H:${formatTemperature(tempMax, tempUnit)}</span>
          <span>L:${formatTemperature(tempMin, tempUnit)}</span>
        </div>

        <div class="weather-hero__meta">
          <span class="weather-hero__feels">Gefühlt ${formatTemperature(
            feelsLike,
            tempUnit
          )}</span>
          ${locationTimeHtml}
          <span class="weather-hero__updated">⟳ ${updatedLabel}</span>
        </div>

        <div class="weather-hero__quick-stats">
          <div class="weather-hero__stat">
            <span class="weather-hero__stat-icon">💧</span>
            <span class="weather-hero__stat-value">${
              precipProb != null ? Math.round(precipProb) + "%" : "–"
            }</span>
          </div>
          <div class="weather-hero__stat">
            <span class="weather-hero__stat-icon">☀️</span>
            <span class="weather-hero__stat-value">${
              uvIndex != null ? uvIndex : "–"
            }</span>
          </div>
          <div class="weather-hero__stat">
            <span class="weather-hero__stat-icon">💨</span>
            <span class="weather-hero__stat-value">${
              windSpeed != null ? Math.round(windSpeed) + "km/h" : "–"
            }</span>
          </div>
        </div>
      </div>

      <div class="weather-hero__scene" aria-hidden="true">
        <div class="fields-sky-transition"></div>
        <div id="frog-hero-pond" class="frog-hero-pond"></div>
        <div class="fields-ground-transition"></div>
      </div>
    `;
  }

  function renderWeatherHero(appState, helpers) {
    const heroEl = document.getElementById("weather-hero");
    const barLocationEl = document.getElementById("app-bar-location");
    if (!heroEl) {
      console.warn("[WeatherHero] weather-hero Element nicht gefunden");
      return;
    }

    const current = appState.current || appState.currentWeather || {};
    const daily = (appState.daily && appState.daily[0]) || {};
    const location = appState.location || {};

    const tempUnit = appState.temperatureUnit || "C";

    // Dynamische Aktualisierungsanzeige
    const updatedLabel = formatUpdatedLabel(appState.lastUpdated);

    // Standort-Uhrzeit (falls Timezone verfügbar)
    const locationTime = getLocationTime(
      appState.timezone || location.timezone
    );

    const data = {
      locationName: location.name || location.cityName || "Unbekannt",
      country: location.country || "",
      description: current.description || current.summary,
      temp: current.temperature,
      feelsLike: current.apparentTemperature || current.feelsLike,
      tempMax: daily.temperatureMax || daily.maxTemp,
      tempMin: daily.temperatureMin || daily.minTemp,
      weatherCode: current.weatherCode ?? current.code ?? 3,
      isDay: current.isDay !== false,
      updatedLabel,
      tempUnit,
      locationTime,
      precipProb:
        daily.precipProbMax ||
        daily.precipitationProbabilityMax ||
        current.precipitationProbability,
      uvIndex: daily.uvIndexMax || current.uvIndex,
      windSpeed: current.windSpeed,
    };

    console.log("[WeatherHero] Rendering with data:", data);
    heroEl.innerHTML = buildHeroHtml(data);

    // Render Frog Background - mit Timezone für korrekte Standort-Zeit!
    if (global.FrogHeroPlayer && global.FrogHeroPlayer.renderFrogHero) {
      try {
        // Übergebe vollständigen homeState mit timezone für korrekte Tageszeit-Berechnung
        const frogState = {
          current: {
            ...current,
            weatherCode:
              current.weatherCode ??
              current.code ??
              current.weather_code ??
              data.weatherCode,
            time: current.time || new Date().toISOString(),
          },
          timezone: appState.timezone || location.timezone,
        };
        console.log("[WeatherHero] FrogHero state:", frogState);
        global.FrogHeroPlayer.renderFrogHero(frogState);
      } catch (e) {
        console.warn("FrogHero konnte nicht gerendert werden", e);
      }
    }

    // Update App Bar Location
    if (barLocationEl && data.locationName) {
      barLocationEl.textContent =
        data.locationName + (data.country ? `, ${data.country}` : "");
    }
  }

  global.WeatherHero = { renderWeatherHero };
})(window);
