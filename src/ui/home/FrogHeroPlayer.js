(function (global) {
  // Korrekter Pfad relativ zur index.html im src-Verzeichnis
  const FROG_BASE_PATH = "assets/froggie/hubui";

  // Verfügbare Szenen-Typen: fields, hill, mushroom
  const SCENE_TYPE = "fields"; // Landschaft-Szene für dynamisches Wetter

  // Dynamische Himmelfarben basierend auf Wetter und Tageszeit
  const SKY_COLORS = {
    // Morning
    morning_sunny: { top: "#87CEEB", mid: "#B0E0E6", bottom: "#E0F0E0" },
    morning_cloudy: { top: "#6B7B8C", mid: "#8899AA", bottom: "#A0B0A8" },
    morning_rainy: { top: "#4A5568", mid: "#5C6878", bottom: "#6E7E78" },
    morning_snowy: { top: "#B8C6D6", mid: "#C8D6E6", bottom: "#E0E8E8" },
    morning_hazy: { top: "#9CA3AF", mid: "#B0B8C0", bottom: "#C0C8C0" },

    // Day
    day_sunny: { top: "#4A90D9", mid: "#6BA3E0", bottom: "#8CB8E0" },
    day_cloudy: { top: "#5A6A7A", mid: "#6E7E8E", bottom: "#7A8A82" },
    day_rainy: { top: "#3D4852", mid: "#4A5662", bottom: "#5A6A62" },
    day_snowy: { top: "#8899AA", mid: "#99AABB", bottom: "#B0C0B8" },
    day_hazy: { top: "#7A8A9A", mid: "#8A9AA8", bottom: "#9AA8A0" },

    // Sunset
    sunset_sunny: { top: "#FF7E5F", mid: "#FEB47B", bottom: "#FFD89B" },
    sunset_cloudy: { top: "#5D4E6D", mid: "#7E6E8E", bottom: "#9E8E8E" },
    sunset_rainy: { top: "#4A3F5A", mid: "#5A4F6A", bottom: "#6A5F6A" },
    sunset_snowy: { top: "#8E7E9E", mid: "#9E8EAE", bottom: "#AE9EAE" },
    sunset_hazy: { top: "#6E5E7E", mid: "#8E7E8E", bottom: "#AE9E8E" },

    // Night
    night_sunny: { top: "#1a1f3a", mid: "#252a45", bottom: "#2a3040" },
    night_cloudy: { top: "#252a3a", mid: "#303545", bottom: "#353a40" },
    night_rainy: { top: "#1a1f2a", mid: "#252a35", bottom: "#2a2f35" },
    night_snowy: { top: "#2a3040", mid: "#353a4a", bottom: "#3a4045" },
    night_hazy: { top: "#2a2f3a", mid: "#353a45", bottom: "#3a3f42" },
  };

  // Karten-Hintergrundfarbe (für unteren Übergang)
  const CARD_BG_COLOR = "#0f1729";

  function getTimeOfDay(current) {
    if (!current) return "day";

    // Versuche die Stunde aus verschiedenen Quellen zu bekommen
    let hour;
    if (current.time) {
      try {
        hour = new Date(current.time).getHours();
      } catch (e) {
        hour = new Date().getHours();
      }
    } else {
      hour = new Date().getHours();
    }

    if (hour >= 5 && hour < 10) return "morning";
    if (hour >= 10 && hour < 17) return "day";
    if (hour >= 17 && hour < 21) return "sunset";
    return "night";
  }

  function getCondition(current) {
    const code =
      current && (current.weatherCode ?? current.code ?? current.weather_code);
    console.log("[FrogHero] Weather code detected:", code);

    if (code == null) return "cloudy"; // Default für bedeckt

    // Detaillierte Wetter-Codes nach WMO
    const rainy = [51, 53, 55, 61, 63, 65, 80, 81, 82]; // Nieselregen, Regen, Schauer
    const snowy = [71, 73, 75, 77, 85, 86]; // Schneefall
    const hazy = [45, 48]; // Nebel
    const stormy = [95, 96, 99]; // Gewitter
    const cloudy = [2, 3]; // Teilweise bewölkt, bedeckt

    if (stormy.includes(code)) return "rainy"; // Gewitter als rainy
    if (rainy.includes(code)) return "rainy";
    if (snowy.includes(code)) return "snowy";
    if (hazy.includes(code)) return "hazy";
    if (cloudy.includes(code)) return "cloudy";
    if (code === 0 || code === 1) return "sunny";
    return "cloudy";
  }

  function buildSceneKey(current) {
    const tod = getTimeOfDay(current);
    const cond = getCondition(current);
    return `${SCENE_TYPE}_${tod}_${cond}`;
  }

  function buildBackgroundUrl(sceneKey) {
    return `${FROG_BASE_PATH}/${sceneKey}_bg.webp`;
  }

  function getSkyColors(tod, cond) {
    const key = `${tod}_${cond}`;
    return SKY_COLORS[key] || SKY_COLORS.day_cloudy;
  }

  function hexToRgba(hex, alpha) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  function applyDynamicGradients(tod, cond) {
    const colors = getSkyColors(tod, cond);
    const pond = document.getElementById("frog-hero-pond");
    const appShell = document.querySelector(".app-shell");
    const weatherHero = document.querySelector(".weather-hero");

    if (!pond) return;

    // Erstelle dynamischen oberen Gradient - sanfter und länger
    const topGradient = `linear-gradient(to bottom,
      ${colors.top} 0%,
      ${colors.top} 15%,
      ${hexToRgba(colors.top, 0.8)} 35%,
      ${hexToRgba(colors.top, 0.5)} 55%,
      ${hexToRgba(colors.top, 0.2)} 75%,
      transparent 100%)`;

    // Erstelle dynamischen unteren Gradient (für Übergang zu Karten)
    const bottomGradient = `linear-gradient(to top,
      ${CARD_BG_COLOR} 0%,
      ${hexToRgba(CARD_BG_COLOR, 0.7)} 40%,
      ${hexToRgba(CARD_BG_COLOR, 0.3)} 70%,
      transparent 100%)`;

    // Setze CSS Custom Properties global auf document.documentElement
    document.documentElement.style.setProperty("--sky-top", colors.top);
    document.documentElement.style.setProperty("--sky-mid", colors.mid);
    document.documentElement.style.setProperty("--sky-bottom", colors.bottom);
    document.documentElement.style.setProperty("--top-gradient", topGradient);
    document.documentElement.style.setProperty(
      "--bottom-gradient",
      bottomGradient
    );
    document.documentElement.style.setProperty("--card-bg", CARD_BG_COLOR);

    // Auch auf pond für lokale Verwendung
    pond.style.setProperty("--sky-top", colors.top);
    pond.style.setProperty("--sky-mid", colors.mid);
    pond.style.setProperty("--sky-bottom", colors.bottom);
    pond.style.setProperty("--top-gradient", topGradient);
    pond.style.setProperty("--bottom-gradient", bottomGradient);
    pond.style.setProperty("--card-bg", CARD_BG_COLOR);

    // App-shell bekommt den Basis-Hintergrund (Himmelfarbe oben)
    if (appShell) {
      appShell.style.background = colors.top;
    }

    // Weather-hero bekommt den Farbübergang von oben (Himmel) nach unten (Richtung Fields)
    // Dieser Gradient verbindet den oberen Bereich mit dem Fields-Bild
    if (weatherHero) {
      weatherHero.style.background = `linear-gradient(to bottom,
        ${colors.top} 0%,
        ${colors.mid} 50%,
        ${colors.bottom} 100%)`;
    }

    console.log("[FrogHero] Applied sky colors for", tod, cond, ":", colors);
  }

  function applyBackground(sceneKey, current) {
    const pond = document.getElementById("frog-hero-pond");
    if (!pond) {
      console.warn("[FrogHero] frog-hero-pond nicht gefunden");
      return;
    }

    const url = buildBackgroundUrl(sceneKey);
    console.log("[FrogHero] Setze Hintergrund:", url, "für Wetter-Szene");

    pond.style.backgroundImage = `url("${url}")`;
    pond.style.backgroundSize = "cover";
    pond.style.backgroundPosition = "center bottom";
    pond.style.backgroundRepeat = "no-repeat";
    pond.style.minHeight = "220px";

    // Dynamische Gradienten anwenden
    const tod = getTimeOfDay(current);
    const cond = getCondition(current);
    applyDynamicGradients(tod, cond);
  }

  function renderFrogHero(current) {
    const sceneKey = buildSceneKey(current || {});
    console.log("[FrogHero] Scene Key:", sceneKey, "Current:", current);
    applyBackground(sceneKey, current);
  }

  global.FrogHeroPlayer = {
    renderFrogHero,
    buildSceneKey,
    getTimeOfDay,
    getCondition,
    getSkyColors,
    SCENE_TYPE,
    SKY_COLORS,
  };
})(window);
