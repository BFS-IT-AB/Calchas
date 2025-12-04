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
    } = data;

    const icon = getWeatherIcon(weatherCode, isDay);
    const weatherDesc = description || getWeatherDescription(weatherCode);

    return `
      <div class="weather-hero__header">
        <div class="weather-hero__left">
          <span class="weather-hero__label">Jetzt</span>
          <div class="weather-hero__temp-display">
            <span class="weather-hero__temp-value">${formatTemperature(
              temp,
              tempUnit
            )}</span>
            <span class="weather-hero__temp-icon">${icon}</span>
          </div>
          <div class="weather-hero__minmax">
            <span>↑${formatTemperature(tempMax, tempUnit)}</span>
            <span>↓${formatTemperature(tempMin, tempUnit)}</span>
          </div>
        </div>
        <div class="weather-hero__right">
          <span class="weather-hero__condition">${weatherDesc}</span>
          <span class="weather-hero__feels">Gefühlt ${formatTemperature(
            feelsLike,
            tempUnit
          )}</span>
          <span class="weather-hero__updated">⏱ ${
            updatedLabel || "jetzt"
          }</span>
        </div>
      </div>

      <div class="weather-hero__scene" aria-hidden="true">
        <div id="frog-hero-pond" class="frog-hero-pond"></div>
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

    // Format updated time
    let updatedLabel = "jetzt";
    if (appState.lastUpdated) {
      try {
        const date = new Date(appState.lastUpdated);
        updatedLabel = date.toLocaleTimeString("de-DE", {
          hour: "2-digit",
          minute: "2-digit",
        });
      } catch (e) {
        updatedLabel = "jetzt";
      }
    }

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
    };

    console.log("[WeatherHero] Rendering with data:", data);
    heroEl.innerHTML = buildHeroHtml(data);

    // Render Frog Background
    if (global.FrogHeroPlayer && global.FrogHeroPlayer.renderFrogHero) {
      try {
        global.FrogHeroPlayer.renderFrogHero(current);
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
