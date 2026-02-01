/**
 * NonMobileOverlay.js - Overlay für nicht-unterstützte Geräte (Tablets, Desktop)
 * Zeigt eine informative Nachricht und wichtige Links/Modals aus "Über Calchas"
 */
(function (global) {
  const ICONS = {
    license: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="10"/></svg>`,
    email: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M22 6l-10 7L2 6"/></svg>`,
    code: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>`,
    bug: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 2l0 6m0 8l0 6m8-10l-6 0m-8 0l-6 0M18 6l-4 4m-4 4l-4 4m12-8l-4-4m-4 4l-4-4"/></svg>`,
    heart: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M20.8 4.6c-1.7-1.7-4.5-1.7-6.2 0L12 7.2 9.4 4.6c-1.7-1.7-4.5-1.7-6.2 0-1.7 1.7-1.7 4.5 0 6.2l8.8 8.8 8.8-8.8c1.7-1.7 1.7-4.5 0-6.2z"/></svg>`,
    discord: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9.5 9.5h.01M14.5 9.5h.01M21 10a5 5 0 00-5-5h-8a5 5 0 00-5 5v6a5 5 0 005 5h8a5 5 0 005-5v-6z" stroke-linejoin="round"/><path d="M8 14c.5 1 1.5 2 4 2s3.5-1 4-2"/></svg>`,
    thirdparty: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></svg>`,
    terms: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6M16 13H8m8 4H8m2-8H8"/></svg>`,
    privacy: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>`,
    website: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>`,
    refresh: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 12a9 9 0 0113.8-7.6M21 12a9 9 0 01-13.8 7.6M3 4v8h8M21 20v-8h-8"/></svg>`,
  };

  const GITHUB_REPO = "wetter-app-bfsit/wetter-app";
  const GITHUB_URL = "https://github.com/BFS-IT-AB/calchas.git";
  const DISCORD_URL = "https://discord.gg/KaeDPazvck";
  const WEBSITE_URL = "https://calchas.dev";

  /**
   * Erstellt und zeigt das Non-Mobile Overlay an
   */
  function showNonMobileOverlay() {
    console.log("[NonMobileOverlay] Zeige Non-Mobile Overlay an...");

    const deviceType = window.DeviceDetection?.getDeviceType() || "unknown";
    const deviceName =
      deviceType === "tablet"
        ? "Tablets"
        : deviceType === "desktop"
          ? "Desktop-Geräte"
          : "dieses Gerät";

    console.log("[NonMobileOverlay] Gerätetyp:", deviceType);

    const latestRelease = window.CHANGELOG?.[0];
    const version = latestRelease
      ? latestRelease.version
      : window.APP_VERSION || "0.7.0-alpha";

    console.log("[NonMobileOverlay] Version:", version);

    const overlayHTML = `
      <div id="non-mobile-overlay" class="non-mobile-overlay">
        <div class="non-mobile-overlay__content">
          <!-- Header mit Logo und Version -->
          <div class="non-mobile-header">
            <div class="non-mobile-header__logo">
              <img src="assets/logo.png" alt="Calchas Logo" onerror="this.src='assets/google-weather-icons/weather/sunny.svg'"/>
            </div>
            <div class="non-mobile-header__info">
              <h1 class="non-mobile-header__name">Calchas</h1>
              <div class="non-mobile-header__badges">
                <span class="non-mobile-badge non-mobile-badge--version">v${version}</span>
                <button class="non-mobile-badge non-mobile-badge--changelog" type="button" data-action="changelog">
                  Was ist neu
                </button>
              </div>
            </div>
          </div>

          <!-- Info-Box -->
          <div class="non-mobile-info">
            <div class="non-mobile-info__icon">📱</div>
            <h2 class="non-mobile-info__title">Nur für Smartphones optimiert</h2>
            <p class="non-mobile-info__text">
              Calchas ist aktuell nur für Smartphones verfügbar. Die Unterstützung für ${deviceName} befindet sich noch in der Entwicklung.
            </p>
            <p class="non-mobile-info__hint">
              Bitte besuche uns von deinem Smartphone aus oder nutze die untenstehenden Links für weitere Informationen.
            </p>
          </div>

          <!-- Links Grid -->
          <div class="non-mobile-links">
            ${renderActionCard("license", "Lizenz", "MIT License", "#5c6bc0")}
            ${renderActionCard("email", "E-Mail", "team@calchas.dev", "#5c6bc0")}
            ${renderActionCard("website", "Website", "calchas.dev", "#5c6bc0")}
            ${renderActionCard("code", "Quellcode", "Auf GitHub", "#5c6bc0")}
            ${renderActionCard("bug", "Problem melden", "Auf GitHub", "#5c6bc0")}
            ${renderActionCard("heart", "Mitwirkende", "Unser Team", "#5c6bc0")}
            ${renderActionCard("discord", "Discord", "Community beitreten", "#5865f2")}
            ${renderActionCard("thirdparty", "Drittanbieter-Lizenzen", null, "#5c6bc0")}
            ${renderActionCard("terms", "Nutzungsbedingungen", null, "#5c6bc0")}
            ${renderActionCard("privacy", "Datenschutzerklärung", null, "#5c6bc0")}
          </div>

          <!-- Footer -->
          <div class="non-mobile-footer">
            <p>© 2025 Calchas Team • Open Source PWA</p>
          </div>
        </div>
      </div>
    `;

    // Overlay in DOM einfügen
    document.body.insertAdjacentHTML("beforeend", overlayHTML);
    console.log("[NonMobileOverlay] Overlay HTML eingefügt");

    // Prüfe ob AboutSheet verfügbar ist
    if (window.AboutSheet) {
      console.log("[NonMobileOverlay] ✅ AboutSheet verfügbar");
      const methods = [
        "showLicenseModal",
        "showChangelog",
        "showContributorsModal",
        "showThirdPartyModal",
        "showTermsModal",
        "showPrivacyModal",
        "createModal",
      ];
      methods.forEach((method) => {
        const available = typeof window.AboutSheet[method] === "function";
        console.log(
          `[NonMobileOverlay] AboutSheet.${method}: ${available ? "✅" : "❌"}`,
        );
      });
    } else {
      console.error("[NonMobileOverlay] ❌ AboutSheet NICHT verfügbar!");
    }

    // Event Listener hinzufügen
    attachOverlayEventListeners();
    console.log("[NonMobileOverlay] Overlay vollständig initialisiert");
  }

  /**
   * Rendert eine Action-Karte
   */
  function renderActionCard(iconKey, title, subtitle, color) {
    const icon = ICONS[iconKey] || "";
    const subtitleHTML = subtitle ? `<p>${subtitle}</p>` : "";

    return `
      <button class="non-mobile-card" data-action="${iconKey}" style="--card-color: ${color}">
        <div class="non-mobile-card__icon">${icon}</div>
        <div class="non-mobile-card__content">
          <h3>${title}</h3>
          ${subtitleHTML}
        </div>
      </button>
    `;
  }

  /**
   * Event Listener für Overlay-Actions
   */
  function attachOverlayEventListeners() {
    const overlay = document.getElementById("non-mobile-overlay");
    if (!overlay) {
      console.error("[NonMobileOverlay] Overlay Element nicht gefunden!");
      return;
    }

    console.log("[NonMobileOverlay] Event Listeners werden hinzugefügt...");

    // Zähle Buttons
    const buttons = overlay.querySelectorAll("[data-action]");
    console.log(
      `[NonMobileOverlay] ${buttons.length} Buttons mit data-action gefunden`,
    );

    // Event Delegation für Karten-Clicks
    overlay.addEventListener("click", (e) => {
      console.log("[NonMobileOverlay] Click Event:", {
        target: e.target.tagName,
        className: e.target.className,
        currentTarget: e.currentTarget.id,
      });

      const card = e.target.closest("[data-action]");
      if (!card) {
        console.log(
          "[NonMobileOverlay] ⚠️ Kein Button mit data-action gefunden",
        );
        return;
      }

      const action = card.getAttribute("data-action");
      console.log("[NonMobileOverlay] ✅ Action erkannt:", action);

      handleOverlayAction(action);
    });

    console.log(
      "[NonMobileOverlay] ✅ Event Listeners erfolgreich hinzugefügt",
    );
  }

  /**
   * Verarbeitet Overlay-Actions
   */
  function handleOverlayAction(action) {
    console.log("[NonMobileOverlay] Verarbeite Action:", action);

    // Prüfe AboutSheet-Verfügbarkeit bei jedem Aufruf
    if (!window.AboutSheet) {
      console.error("[NonMobileOverlay] ❌ AboutSheet nicht verfügbar!");
      return;
    }

    console.log("[NonMobileOverlay] ✅ AboutSheet gefunden");

    switch (action) {
      case "license":
        console.log("[NonMobileOverlay] Öffne Lizenz Modal");
        if (typeof window.AboutSheet.showLicenseModal === "function") {
          window.AboutSheet.showLicenseModal();
        } else {
          console.error(
            "[NonMobileOverlay] AboutSheet.showLicenseModal nicht verfügbar",
          );
        }
        break;
      case "email":
        console.log("[NonMobileOverlay] Öffne E-Mail Modal");
        showEmailModal();
        break;
      case "website":
        console.log("[NonMobileOverlay] Öffne Website");
        window.open(WEBSITE_URL, "_blank", "noopener,noreferrer");
        break;
      case "code":
        console.log("[NonMobileOverlay] Öffne Quellcode");
        window.open(GITHUB_URL, "_blank", "noopener,noreferrer");
        break;
      case "bug":
        console.log("[NonMobileOverlay] Öffne Bug Report");
        window.open(
          `https://github.com/${GITHUB_REPO}/issues`,
          "_blank",
          "noopener,noreferrer",
        );
        break;
      case "heart":
        console.log("[NonMobileOverlay] Öffne Mitwirkende Modal");
        if (typeof window.AboutSheet.showContributorsModal === "function") {
          window.AboutSheet.showContributorsModal();
        } else {
          console.error(
            "[NonMobileOverlay] AboutSheet.showContributorsModal nicht verfügbar",
          );
        }
        break;
      case "discord":
        console.log("[NonMobileOverlay] Öffne Discord Modal");
        showDiscordModal();
        break;
      case "thirdparty":
        console.log("[NonMobileOverlay] Öffne Drittanbieter Modal");
        if (typeof window.AboutSheet.showThirdPartyModal === "function") {
          window.AboutSheet.showThirdPartyModal();
        } else {
          console.error(
            "[NonMobileOverlay] AboutSheet.showThirdPartyModal nicht verfügbar",
          );
        }
        break;
      case "terms":
        console.log("[NonMobileOverlay] Öffne Nutzungsbedingungen Modal");
        if (typeof window.AboutSheet.showTermsModal === "function") {
          window.AboutSheet.showTermsModal();
        } else {
          console.error(
            "[NonMobileOverlay] AboutSheet.showTermsModal nicht verfügbar",
          );
        }
        break;
      case "privacy":
        console.log("[NonMobileOverlay] Öffne Datenschutz Modal");
        if (typeof window.AboutSheet.showPrivacyModal === "function") {
          window.AboutSheet.showPrivacyModal();
        } else {
          console.error(
            "[NonMobileOverlay] AboutSheet.showPrivacyModal nicht verfügbar",
          );
        }
        break;
      case "changelog":
        console.log("[NonMobileOverlay] Öffne Changelog Modal");
        if (typeof window.AboutSheet.showChangelog === "function") {
          window.AboutSheet.showChangelog();
        } else {
          console.error(
            "[NonMobileOverlay] AboutSheet.showChangelog nicht verfügbar",
          );
        }
        break;
      default:
        console.warn(`[NonMobileOverlay] Unbekannte Action: ${action}`);
    }
  }

  /**
   * Email Modal
   */
  function showEmailModal() {
    const content = `
      <div class="email-modal__content">
        <div class="email-modal__dev-badge">
          <span class="material-symbols-outlined">construction</span>
          <span>In Entwicklung</span>
        </div>
        <p>Unsere E-Mail-Adresse ist bereits registriert:</p>
        <div class="email-modal__address">
          <a href="mailto:team@calchas.dev">team@calchas.dev</a>
        </div>
        <p class="email-modal__hint">⚠️ Der E-Mail-Server befindet sich noch im Aufbau – Nachrichten können aktuell nicht empfangen werden.</p>
      </div>
    `;

    if (window.AboutSheet?.createModal) {
      window.AboutSheet.createModal(
        "overlay-email-modal",
        "Kontakt – Calchas Team",
        content,
      );
    }
  }

  /**
   * Discord Modal
   */
  function showDiscordModal() {
    const content = `
      <div class="discord-modal__content">
        <div class="discord-modal__dev-badge">
          <span class="material-symbols-outlined">construction</span>
          <span>In Entwicklung</span>
        </div>
        <p>Du kannst unserem Discord-Server bereits beitreten:</p>
        <div class="discord-modal__link">
          <a href="${DISCORD_URL}" target="_blank" rel="noopener noreferrer">
            <span class="material-symbols-outlined">open_in_new</span>
            Discord-Server beitreten
          </a>
        </div>
        <p class="discord-modal__hint">⚠️ Der Server befindet sich noch im Aufbau – aktuell ist dort noch nicht viel los.</p>
      </div>
    `;

    if (window.AboutSheet?.createModal) {
      window.AboutSheet.createModal(
        "overlay-discord-modal",
        "Discord Community",
        content,
      );
    }
  }

  // Export
  global.NonMobileOverlay = {
    showNonMobileOverlay,
  };
})(window);
