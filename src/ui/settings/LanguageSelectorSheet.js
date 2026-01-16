/**
 * LanguageSelectorSheet.js - Sprach-Auswahl
 * Design inspiriert von WeatherMaster App
 */
(function (global) {
  // Toast notification helper
  function showToast(message, isError) {
    var existing = document.querySelector(".settings-toast");
    if (existing) existing.remove();

    var toast = document.createElement("div");
    toast.className =
      "settings-toast" + (isError ? " settings-toast--error" : "");
    toast.textContent = message;
    document.body.appendChild(toast);

    requestAnimationFrame(function () {
      toast.classList.add("settings-toast--visible");
    });

    setTimeout(function () {
      toast.classList.remove("settings-toast--visible");
      setTimeout(function () {
        toast.remove();
      }, 300);
    }, 2500);
  }

  var LANGUAGE_OPTIONS = [
    { value: "de", flag: "🇩🇪", title: "Deutsch" },
    { value: "en", flag: "🇬🇧", title: "English" },
  ];

  function getCurrentLanguage() {
    // Try multiple sources
    if (global.i18n && global.i18n.getLanguage) {
      return global.i18n.getLanguage();
    }
    try {
      return localStorage.getItem("app-language") || "de";
    } catch (e) {
      return "de";
    }
  }

  function renderLanguageSheet(appState) {
    var container = document.getElementById("settings-language-body");
    if (!container) {
      console.warn("[LanguageSelectorSheet] Container nicht gefunden");
      return;
    }

    var current = getCurrentLanguage();

    var html =
      '<div class="language-settings">' +
      '<div class="settings-info-card">' +
      '<span class="settings-info-card__icon">🌐</span>' +
      '<div class="settings-info-card__content">' +
      '<p class="settings-info-card__title">App-Sprache wählen</p>' +
      '<p class="settings-info-card__text">Ändere die Sprache der App-Oberfläche. Wetterdaten werden automatisch angepasst.</p>' +
      "</div>" +
      "</div>" +
      '<div class="language-options">';

    LANGUAGE_OPTIONS.forEach(function (opt) {
      var isActive = current === opt.value;
      html +=
        '<button type="button" class="language-option' +
        (isActive ? " language-option--active" : "") +
        '" data-lang="' +
        opt.value +
        '">' +
        '<span class="language-option__flag">' +
        opt.flag +
        "</span>" +
        '<span class="language-option__title">' +
        opt.title +
        "</span>" +
        (isActive ? '<span class="language-option__check">✓</span>' : "") +
        "</button>";
    });

    html += "</div></div>";

    container.innerHTML = html;

    // Add event listeners
    container.querySelectorAll("[data-lang]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var lang = btn.getAttribute("data-lang");
        var option = LANGUAGE_OPTIONS.find(function (o) {
          return o.value === lang;
        });
        applyLanguage(appState, lang);
        showToast(
          "✓ Sprache auf " + (option ? option.title : lang) + " geändert"
        );
        renderLanguageSheet(appState);

        // Re-render settings home if available
        if (global.SettingsHome && global.SettingsHome.renderSettingsHome) {
          global.SettingsHome.renderSettingsHome(appState);
        }
      });
    });
  }

  function applyLanguage(appState, lang) {
    if (!appState) appState = {};
    if (!appState.settings) appState.settings = {};
    appState.settings.locale = lang;
    appState.locale = lang;

    try {
      localStorage.setItem("app-language", lang);
    } catch (e) {
      console.warn("[LanguageSelectorSheet] LocalStorage nicht verfügbar");
    }

    // Update i18n if available
    if (global.i18n && global.i18n.setLanguage) {
      global.i18n.setLanguage(lang);
    }

    // Update TextReplacer for automatic text replacement
    if (global.TextReplacer && global.TextReplacer.updateLanguage) {
      global.TextReplacer.updateLanguage(lang);
    }
    
    // Dispatch event for other components
    try {
      document.dispatchEvent(
        new CustomEvent("language-changed", { detail: { lang: lang } })
      );
    } catch (e) {}
  }

  global.LanguageSelectorSheet = { renderLanguageSheet: renderLanguageSheet };
})(window);
