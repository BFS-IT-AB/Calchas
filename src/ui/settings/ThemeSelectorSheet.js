import "../../i18n/helper.js";

(function (global) {
  function renderThemeSheet(appState) {
    const container = document.getElementById("settings-theme-body");
    if (!container) return;
    const current = appState?.settings?.theme || "system";

    container.innerHTML = `
      <div class="settings-options">
        ${option("system", "🖥️", "System", "Folgt dem Gerätemodus.", current)}
        ${option(
          "light",
          "🌞",
          "Hell",
          "Helles Layout mit hohem Kontrast.",
          current
        )}
        ${option("dark", "🌙", "Dunkel", "Dunkles Layout für nachts.", current)}
      </div>
    `;

    container.querySelectorAll("[data-theme-value]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const value = btn.getAttribute("data-theme-value");
        applyTheme(appState, value);
        renderThemeSheet(appState);
      });
    });
  }

  function option(value, icon, title, subtitle, current) {
    const active = current === value ? " settings-option--active" : "";
    return `
      <button
        type="button"
        class="settings-option${active}"
        data-theme-value="${value}"
      >
        <span class="settings-option__icon">${icon}</span>
        <span class="settings-option__content">
          <span class="settings-option__title">${title}</span>
          <span class="settings-option__subtitle">${subtitle}</span>
        </span>
      </button>
    `;
  }

  function applyTheme(appState, value) {
    if (!appState.settings) appState.settings = {};
    appState.settings.theme = value;
    try {
      localStorage.setItem("wetter_theme", value);
    } catch (e) {}

    const root = document.documentElement;
    const body = document.body;

    // Entferne alte Theme-Klassen
    body.classList.remove("dark-mode", "light-mode");

    if (value === "system") {
      root.removeAttribute("data-theme");
      // System-Präferenz prüfen
      const prefersDark = window.matchMedia(
        "(prefers-color-scheme: dark)"
      ).matches;
      if (prefersDark) {
        body.classList.add("dark-mode");
      } else {
        body.classList.add("light-mode");
      }
    } else if (value === "dark") {
      root.setAttribute("data-theme", "dark");
      body.classList.add("dark-mode");
    } else if (value === "light") {
      root.setAttribute("data-theme", "light");
      body.classList.add("light-mode");
    }
  }

  global.ThemeSelectorSheet = { renderThemeSheet };
})(window);
