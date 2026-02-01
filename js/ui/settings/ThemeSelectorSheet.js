/**
 * ThemeSelectorSheet.js - Theme-Auswahl
 * Design inspiriert von WeatherMaster App
 */
(function (global) {
  const THEME_OPTIONS = [
    {
      value: "dark",
      icon: "🌙",
      title: "Dunkel",
      subtitle: "Dunkles Layout für nachts",
    },
    {
      value: "system",
      icon: "🖥️",
      title: "System",
      subtitle: "Folgt dem Gerätemodus (in Entwicklung)",
      disabled: true,
    },
    {
      value: "light",
      icon: "☀️",
      title: "Hell",
      subtitle: "Helles Layout mit hohem Kontrast (in Entwicklung)",
      disabled: true,
    },
  ];

  // Media query helper for following the system color scheme
  const _systemMediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
  let _systemListenerAttached = false;

  function _attachSystemListener() {
    if (_systemListenerAttached) return;
    const handler = (e) => {
      const stored = localStorage.getItem("wetter_theme") || "system";
      if (stored !== "system") return;
      const isDark = e.matches;
      const root = document.documentElement;
      const body = document.body;
      root.setAttribute("data-theme", isDark ? "dark" : "light");
      body.classList.toggle("dark-mode", isDark);
      body.classList.toggle("light-mode", !isDark);
      try {
        localStorage.setItem("wetter_dark_mode", String(isDark));
      } catch (err) {}
    };

    if (_systemMediaQuery.addEventListener) {
      _systemMediaQuery.addEventListener("change", handler);
    } else if (_systemMediaQuery.addListener) {
      _systemMediaQuery.addListener(handler);
    }

    _systemListenerAttached = true;
  }

  function initTheme() {
    const value = localStorage.getItem("wetter_theme") || "dark";
    const prefersDark = _systemMediaQuery.matches;
    const isDark = value === "dark" || (value === "system" && prefersDark);
    const root = document.documentElement;
    const body = document.body;

    body.classList.remove("dark-mode", "light-mode");

    if (value === "system") {
      root.setAttribute("data-theme", isDark ? "dark" : "light");
      body.classList.add(isDark ? "dark-mode" : "light-mode");
      _attachSystemListener();
    } else if (value === "dark") {
      root.setAttribute("data-theme", "dark");
      body.classList.add("dark-mode");
    } else {
      root.setAttribute("data-theme", "light");
      body.classList.add("light-mode");
    }

    try {
      localStorage.setItem("wetter_dark_mode", String(isDark));
    } catch (e) {}
  }

  function renderThemeSheet(appState) {
    const container = document.getElementById("settings-theme-body");
    if (!container) return;
    const current =
      appState?.settings?.theme ||
      localStorage.getItem("wetter_theme") ||
      "dark";

    container.innerHTML = `
      <div class="theme-settings">
        ${THEME_OPTIONS.map((opt) => renderThemeOption(opt, current)).join("")}
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

  function renderThemeOption(option, current) {
    const isActive = current === option.value;
    const activeClass = isActive ? " theme-option--active" : "";
    const disabledAttr = option.disabled
      ? "disabled style='opacity:0.5;pointer-events:none'"
      : "";
    return `
      <button
        type="button"
        class="theme-option${activeClass}"
        data-theme-value="${option.value}"
        ${disabledAttr}
      >
        <span class="theme-option__icon">${option.icon}</span>
        <span class="theme-option__content">
          <span class="theme-option__title">${option.title}</span>
          <span class="theme-option__subtitle">${option.subtitle}</span>
        </span>
        <span class="theme-option__check">${isActive ? "✓" : ""}</span>
      </button>
    `;
  }

  function applyTheme(appState, value) {
    if (!appState.settings) appState.settings = {};
    appState.settings.theme = value;
    try {
      localStorage.setItem("wetter_theme", value);
    } catch (e) {}

    // Legacy boolean flag for rest of app
    const prefersDark = _systemMediaQuery.matches;
    const isDark = value === "dark" || (value === "system" && prefersDark);
    if (typeof appState.isDarkMode !== "undefined") {
      appState.isDarkMode = isDark;
    }
    try {
      localStorage.setItem("wetter_dark_mode", String(isDark));
    } catch (e) {}

    const root = document.documentElement;
    const body = document.body;

    // Entferne alte Theme-Klassen
    body.classList.remove("dark-mode", "light-mode");

    if (value === "system") {
      // For system theme we set the data-theme to the current system state
      root.setAttribute("data-theme", isDark ? "dark" : "light");
      body.classList.add(isDark ? "dark-mode" : "light-mode");
      // Ensure we follow future system changes
      _attachSystemListener();
    } else if (value === "dark") {
      root.setAttribute("data-theme", "dark");
      body.classList.add("dark-mode");
    } else if (value === "light") {
      root.setAttribute("data-theme", "light");
      body.classList.add("light-mode");
    }
  }

  global.ThemeSelectorSheet = { renderThemeSheet, initTheme };
})(window);
