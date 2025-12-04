(function (global) {
  // Korrekter Pfad relativ zur index.html im src-Verzeichnis
  const FROG_BASE_PATH = "assets/froggie/hubui";

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

    if (hour >= 5 && hour < 11) return "morning";
    if (hour >= 11 && hour < 17) return "day";
    if (hour >= 17 && hour < 21) return "sunset";
    return "night";
  }

  function getCondition(current) {
    const code = current && (current.weatherCode ?? current.code);
    if (code == null) return "cloudy"; // Default für bedeckt

    const rainy = [51, 53, 55, 61, 63, 65, 80, 81, 82];
    const snowy = [71, 73, 75, 77, 85, 86];
    const hazy = [45, 48, 95, 96, 99];
    const cloudy = [2, 3]; // Teilweise bewölkt, bedeckt

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
    return `mushroom_${tod}_${cond}`;
  }

  function buildBackgroundUrl(sceneKey) {
    return `${FROG_BASE_PATH}/${sceneKey}_bg.webp`;
  }

  function applyBackground(sceneKey) {
    const pond = document.getElementById("frog-hero-pond");
    if (!pond) {
      console.warn("[FrogHero] frog-hero-pond nicht gefunden");
      return;
    }
    const url = buildBackgroundUrl(sceneKey);
    console.log("[FrogHero] Setze Hintergrund:", url);
    pond.style.backgroundImage = `url("${url}")`;
    pond.style.backgroundSize = "cover";
    pond.style.backgroundPosition = "center bottom";
    pond.style.backgroundRepeat = "no-repeat";
    pond.style.minHeight = "180px";
  }

  function renderFrogHero(current) {
    const sceneKey = buildSceneKey(current || {});
    console.log("[FrogHero] Scene Key:", sceneKey, "Current:", current);
    applyBackground(sceneKey);
  }

  global.FrogHeroPlayer = {
    renderFrogHero,
    buildSceneKey,
    getTimeOfDay,
    getCondition,
  };
})(window);
