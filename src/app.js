
// === Haupt-JavaScript-Datei - Interaktivität und Logik ===
  /* (API-Calls, Button-Clicks, DOM-Manipulation) */

document.getElementById("searchBtn").addEventListener("click", getWeather);
document.getElementById("modeToggle").addEventListener("click", toggleMode);

const track = document.getElementById("apiTrack");
const boxes = document.querySelectorAll(".api-box");
let currentIndex = 0;

// === Wetter laden ===
async function getWeather() {
  const city = document.getElementById("cityInput").value.trim();
  if (!city) {
    alert("Bitte gib einen Ort ein!");
    return;
  }

  document.getElementById("result").innerText = `🔎 Suche Wetter für ${city}...`;

  try {
    const geoRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${city}`);
    const geoData = await geoRes.json();
    if (!geoData[0]) {
      document.getElementById("result").innerText = "Ort nicht gefunden 😢";
      return;
    }

    const lat = geoData[0].lat;
    const lon = geoData[0].lon;
    document.getElementById("result").innerText = `📍 ${geoData[0].display_name}`;

    // Quelle 1: Open-Meteo
    const meteoRes = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=temperature_2m,weathercode&timezone=auto`
    );
    const meteoData = await meteoRes.json();

    if (meteoData.hourly && meteoData.hourly.temperature_2m) {
      const hours = meteoData.hourly.time.slice(0, 24);
      const temps = meteoData.hourly.temperature_2m.slice(0, 24);
      const codes = meteoData.hourly.weathercode.slice(0, 24);
      renderHourly("api1Result", hours, temps, codes);
    } else {
      document.getElementById("api1Result").innerText = "Keine Daten von Open-Meteo 😕";
    }

    // Quelle 2: BrightSky
    const brightUrl = `https://api.brightsky.dev/weather?lat=${lat}&lon=${lon}&date=${new Date().toISOString().split("T")[0]}`;
    const brightRes = await fetch(brightUrl);
    const brightData = await brightRes.json();

    if (brightData.weather && brightData.weather.length > 0) {
      const hours = brightData.weather.slice(0, 24);
      const times = hours.map(h => h.timestamp);
      const temps = hours.map(h => h.temperature);
      const icons = hours.map(h => h.icon || "");
      renderHourly("api2Result", times, temps, icons, true);
    } else {
      document.getElementById("api2Result").innerText = "Keine BrightSky-Daten 😕";
    }

  } catch (err) {
    console.error("Fehler beim Abrufen:", err);
    document.getElementById("result").innerText = "Fehler beim Laden 😞";
  }
}

// === Stundenanzeige mit Endlosschleife & sanftem Drag ===
function renderHourly(containerId, times, temps, weatherCodes = [], useIcons = false) {
  const container = document.getElementById(containerId);
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
