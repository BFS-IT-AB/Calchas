/**
 * AboutSheet.js - Über Calchas Modal
 * Komplett neu gestaltet nach Design-Vorlage
 */
(function (global) {
  /**
   * Holt Versions-Informationen vom Service Worker
   * @returns {Promise<{appVersion: string, buildId: string, cacheVersion: string}>}
   */
  async function getVersionInfo() {
    if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
      try {
        return await new Promise((resolve, reject) => {
          const messageChannel = new MessageChannel();
          const timeout = setTimeout(() => {
            reject(new Error("Service Worker timeout"));
          }, 2000);

          messageChannel.port1.onmessage = (event) => {
            clearTimeout(timeout);
            resolve(event.data);
          };

          navigator.serviceWorker.controller.postMessage(
            { type: "GET_VERSION" },
            [messageChannel.port2],
          );
        });
      } catch (error) {
        console.warn("[Version] Service Worker nicht erreichbar:", error);
      }
    }

    // Fallback: Lade Version aus manifest.json
    try {
      const manifest = await fetch("/manifest.json").then((r) => r.json());
      return {
        appVersion: manifest.version || "unknown",
        buildId: "unknown",
        cacheVersion: "none",
      };
    } catch (error) {
      console.error("[Version] Konnte Version nicht laden:", error);
      return {
        appVersion: "unknown",
        buildId: "unknown",
        cacheVersion: "none",
      };
    }
  }

  /**
   * Formatiert Build-ID für Anzeige
   * @param {string} buildId
   * @returns {string}
   */
  function formatBuildId(buildId) {
    if (!buildId || buildId === "unknown") return "unknown";

    // Format: 2026-02-01-1658 → 01.02.26 16:58
    const match = buildId.match(/(\d{4})-(\d{2})-(\d{2})-(\d{2})(\d{2})/);
    if (match) {
      const [, year, month, day, hour, minute] = match;
      return `${day}.${month}.${year.slice(2)} ${hour}:${minute}`;
    }

    return buildId;
  }
  // SVG Icons
  const ICONS = {
    license: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="10"/></svg>`,
    email: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M22 6l-10 7L2 6"/></svg>`,
    code: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M16 18l6-6-6-6M8 6l-6 6 6 6"/></svg>`,
    bug: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="3"/><path d="M12 2v4m0 12v4M2 12h4m12 0h4m-2.93-7.07l-2.83 2.83m-4.48 4.48l-2.83 2.83m0-10.14l2.83 2.83m4.48 4.48l2.83 2.83"/></svg>`,
    heart: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>`,
    discord: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 00-.041-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.892.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg>`,
    thirdparty: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>`,
    terms: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/></svg>`,
    privacy: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
    refresh: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/></svg>`,
    website: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>`,
  };

  // GitHub Repo Contributors
  const GITHUB_REPO = "wetter-app-bfsit/wetter-app";
  const GITHUB_URL = "https://github.com/BFS-IT-AB/calchas.git";
  const DISCORD_URL = "https://discord.gg/KaeDPazvck";
  const WEBSITE_URL = "https://calchas.dev";

  async function renderAboutSheet() {
    const container = document.getElementById("settings-about-body");
    if (!container) {
      console.warn("[AboutSheet] Container nicht gefunden");
      return;
    }

    // Lade echte Version vom Service Worker
    const versionInfo = await getVersionInfo();
    const version = versionInfo.appVersion;
    const buildId = formatBuildId(versionInfo.buildId);

    container.innerHTML = `
      <div class="about-settings">
        <!-- App Header -->
        <div class="about-header">
          <div class="about-header__logo">
            <img src="assets/logo.png" alt="Calchas Logo" onerror="this.src='assets/google-weather-icons/weather/sunny.svg'"/>
          </div>
          <div class="about-header__info">
            <h2 class="about-header__name">Calchas</h2>
            <div class="about-header__badges">
              <span class="about-badge about-badge--version" id="version-display">
                v${version}
                <span class="build-id">Build: ${buildId}</span>
              </span>
              <button class="about-badge about-badge--refresh" type="button" data-action="refresh" title="Nach Updates suchen">${
                ICONS.refresh
              }</button>
              <button class="about-badge about-badge--changelog" type="button" data-action="changelog">Was ist neu</button>
            </div>
          </div>
        </div>

        <!-- Main Links Section -->
        <div class="about-links">
          ${renderAboutRow(
            "license",
            "Lizenzen",
            "MIT Licence",
            "#5c6bc0",
            "license",
          )}
          ${renderAboutRow(
            "email",
            "E-Mail",
            "team@calchas.dev",
            "#5c6bc0",
            "email",
          )}
          ${renderAboutRow(
            "website",
            "Website",
            "calchas.dev",
            "#5c6bc0",
            "website",
          )}
          ${renderAboutRow(
            "code",
            "Quellcode",
            "Auf GitHub",
            "#5c6bc0",
            "sourcecode",
          )}
          ${renderAboutRow(
            "bug",
            "Problem melden",
            "Auf GitHub",
            "#5c6bc0",
            "bugreport",
          )}
          ${renderAboutRow(
            "heart",
            "Mitwirkende",
            null,
            "#5c6bc0",
            "contributors",
          )}
          ${renderAboutRow(
            "discord",
            "Discord",
            "Community beitreten",
            "#5865f2",
            "discord",
          )}
        </div>

        <!-- Legal Section -->
        <div class="about-legal">
          ${renderAboutRow(
            "thirdparty",
            "Lizenzen von Drittanbietern",
            null,
            "#5c6bc0",
            "thirdparty",
          )}
          ${renderAboutRow(
            "terms",
            "Nutzungsbedingungen",
            null,
            "#5c6bc0",
            "terms",
          )}
          ${renderAboutRow(
            "privacy",
            "Datenschutzerklärung",
            null,
            "#5c6bc0",
            "privacy",
          )}
        </div>

        <!-- Developer Section (Hidden) -->
        <div class="about-developer">
          ${renderAboutRow(
            "code",
            "🔧 Developer Dashboard",
            "Debug & Monitoring Tools",
            "#a78bfa",
            "devdashboard",
          )}
        </div>
      </div>
    `;

    // Event Listeners
    attachEventListeners(container);
  }

  function renderAboutRow(iconKey, title, subtitle, color, action) {
    const icon = ICONS[iconKey] || "";
    const subtitleHtml = subtitle
      ? `<span class="about-row__subtitle">${subtitle}</span>`
      : "";

    return `
      <button class="about-row" type="button" data-about-action="${action}">
        <span class="about-row__icon" style="background-color: ${color}">${icon}</span>
        <span class="about-row__content">
          <span class="about-row__title">${title}</span>
          ${subtitleHtml}
        </span>
      </button>
    `;
  }

  function attachEventListeners(container) {
    // Changelog button
    container
      .querySelector('[data-action="changelog"]')
      ?.addEventListener("click", showChangelog);

    // Refresh button
    container
      .querySelector('[data-action="refresh"]')
      ?.addEventListener("click", () => {
        window.location.reload();
      });

    // Row actions
    container.querySelectorAll("[data-about-action]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const action = btn.getAttribute("data-about-action");
        handleAction(action);
      });
    });
  }

  function handleAction(action) {
    switch (action) {
      case "license":
        showLicenseModal();
        break;
      case "email":
        showEmailModal();
        break;
        // ============ EMAIL MODAL ============

        function showEmailModal() {
          const content = `
            <div class="email-modal__content">
              <p>Für Kontaktanfragen, Feedback oder Support erreichst du uns unter:</p>
              <div class="email-modal__address">
                <a href="mailto:team@calchas.dev">team@calchas.dev</a>
              </div>
              <p class="email-modal__hint">Wir freuen uns auf deine Nachricht!</p>
            </div>
          `;
          createModal("about-email-modal", "Kontakt – Calchas Team", content);
        }
      case "website":
        window.open(WEBSITE_URL, "_blank", "noopener,noreferrer");
        break;
      case "sourcecode":
        window.open(GITHUB_URL, "_blank", "noopener,noreferrer");
        break;
      case "bugreport":
        window.open(
          "https://github.com/wetter-app-bfsit/wetter-app/issues",
          "_blank",
          "noopener,noreferrer",
        );
        break;
      case "contributors":
        showContributorsModal();
        break;
      case "discord":
        window.open(DISCORD_URL, "_blank", "noopener,noreferrer");
        break;
      case "thirdparty":
        showThirdPartyModal();
        break;
      case "terms":
        showTermsModal();
        break;
      case "privacy":
        showPrivacyModal();
        break;
      case "devdashboard":
        // Close the About modal first (try both: MasterUIController and direct DOM removal)
        let closed = false;
        if (window.MasterUIController?.closeActiveModal) {
          window.MasterUIController.closeActiveModal(true);
          closed = true;
        }
        // Fallback: Remove About modal directly if still present
        setTimeout(
          () => {
            const aboutModal = document.querySelector(".about-modal");
            if (aboutModal) {
              aboutModal.remove();
            }
            if (window.BottomNav) {
              window.BottomNav.addDevDashboardIcon();
              window.BottomNav.setActive("dev-dashboard");
            }
          },
          closed ? 100 : 0,
        );
        break;
    }
  }

  // ============ MODAL HELPERS ============

  function createModal(id, title, content, options = {}) {
    const existingModal = document.getElementById(id);
    if (existingModal) existingModal.remove();

    // Build container classes
    let containerClasses = "about-modal__container";
    if (options.large) containerClasses += " about-modal__container--large";
    if (options.changelog)
      containerClasses += " about-modal__container--changelog";

    const modal = document.createElement("div");
    modal.id = id;
    modal.className = "about-modal";
    modal.innerHTML = `
      <div class="about-modal__backdrop"></div>
      <div class="${containerClasses}">
        <div class="about-modal__header">
          <h3 class="about-modal__title">${title}</h3>
          <button type="button" class="about-modal__close">✕</button>
        </div>
        <div class="about-modal__body">
          ${content}
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    modal
      .querySelector(".about-modal__backdrop")
      .addEventListener("click", () => modal.remove());
    modal
      .querySelector(".about-modal__close")
      .addEventListener("click", () => modal.remove());

    requestAnimationFrame(() => modal.classList.add("about-modal--visible"));

    return modal;
  }

  function showInfoModal(title, message) {
    createModal(
      "about-info-modal",
      title,
      `<p class="about-modal__text">${message}</p>`,
    );
  }

  // ============ LICENSE MODAL ============

  function showLicenseModal() {
    const content = `
      <div class="license-content">
        <div class="license-badge">
          <span class="license-badge__icon">📄</span>
          <span class="license-badge__text">MIT Licence</span>
        </div>

        <div class="license-section">
          <h4>MIT License</h4>
          <p>Copyright (c) 2025 Calchas Team</p>
          <p class="license-text">
            Permission is hereby granted, free of charge, to any person obtaining a copy
            of this software and associated documentation files (the "Software"), to deal
            in the Software without restriction, including without limitation the rights
            to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
            copies of the Software, and to permit persons to whom the Software is
            furnished to do so, subject to the following conditions:
          </p>
          <p class="license-text">
            The above copyright notice and this permission notice shall be included in all
            copies or substantial portions of the Software.
          </p>
          <p class="license-text license-text--muted">
            THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
            IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
            FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
          </p>
        </div>

        <div class="license-section license-section--warning">
          <h4>⚠️ App Store Redistribution Clause</h4>
          <p class="license-text license-text--important">
            <strong>Redistribution as APK on app stores prohibited without consent.</strong>
          </p>
          <p class="license-text">
            Die Weiterverbreitung dieser Anwendung als APK-Datei in App Stores
            (einschließlich Google Play Store, Amazon Appstore und ähnlichen Plattformen)
            ist ohne ausdrückliche schriftliche Genehmigung der Urheber untersagt.
          </p>
        </div>
      </div>
    `;
    createModal("license-modal", "Lizenz", content, { large: true });
  }

  // ============ CHANGELOG MODAL ============

  function showChangelog() {
    let changelog = global.CHANGELOG || [];

    // Fallback if empty
    if (changelog.length === 0) {
      changelog = [
        {
          version: global.APP_VERSION || "1.0.0",
          title: "🎉 Erster Release",
          isLatest: true,
          changes: [
            {
              emoji: "🚀",
              type: "Added",
              text: "Calchas v1.0 wurde veröffentlicht!",
            },
          ],
        },
      ];
    }

    // Render all releases
    const allChangesHtml = changelog
      .map((release) => {
        const changesHtml =
          release.changes
            ?.map(
              (change) => `
      <li class="changelog-item">
        <span class="changelog-item__emoji">${change.emoji}</span>
        <span class="changelog-item__type changelog-item__type--${change.type.toLowerCase()}">${
          change.type
        }</span>
        <span class="changelog-item__text">${change.text}</span>
      </li>
    `,
            )
            .join("") || "";

        return `
        <div class="changelog-release-block">
          <div class="changelog-version-header">
            <div class="changelog-version-badges">
              <span class="changelog-badge changelog-badge--version">v${
                release.version
              }</span>
              ${
                release.isLatest
                  ? '<span class="changelog-badge changelog-badge--latest">Latest</span>'
                  : ""
              }
            </div>
            <span class="changelog-release__date">${release.date || ""}</span>
          </div>
          <h4 class="changelog-title">${release.title}</h4>
          <ul class="changelog-list">
            ${changesHtml}
          </ul>
        </div>
      `;
      })
      .join("");

    const content = `
      <div class="changelog-content">
        ${allChangesHtml}
      </div>
    `;

    createModal("changelog-modal", "Was ist neu", content, {
      changelog: true,
    });
  }

  function showAllChangelog() {
    const changelog = global.CHANGELOG || [];

    const allChangesHtml = changelog
      .map(
        (release) => `
      <div class="changelog-release">
        <div class="changelog-release__header">
          <div class="changelog-version-badges">
            <span class="changelog-badge changelog-badge--version">v${
              release.version
            }</span>
            ${
              release.isLatest
                ? '<span class="changelog-badge changelog-badge--latest">Latest</span>'
                : ""
            }
          </div>
          <span class="changelog-release__date">${release.date || ""}</span>
        </div>
        <h4 class="changelog-release__title">${release.title}</h4>
        <ul class="changelog-list">
          ${
            release.changes
              ?.map(
                (change) => `
            <li class="changelog-item">
              <span class="changelog-item__emoji">${change.emoji}</span>
              <span class="changelog-item__type changelog-item__type--${change.type.toLowerCase()}">${
                change.type
              }:</span>
              <span class="changelog-item__text">${change.text}</span>
            </li>
          `,
              )
              .join("") || ""
          }
        </ul>
      </div>
    `,
      )
      .join("");

    const content = `<div class="changelog-all">${allChangesHtml}</div>`;
    createModal("changelog-all-modal", "Alle Versionen", content, {
      large: true,
      changelog: true,
    });
  }

  // ============ CONTRIBUTORS MODAL ============

  async function showContributorsModal() {
    const content = `
      <div class="contributors-content">
        <div class="contributors-loading">
          <span class="contributors-spinner"></span>
          <p>Lade Mitwirkende von GitHub...</p>
        </div>
      </div>
    `;

    const modal = createModal("contributors-modal", "Mitwirkende", content);

    try {
      // Fetch stats with retry logic (as GitHub API returns 202 while calculating)
      const fetchStats = async () => {
        for (let i = 0; i < 5; i++) {
          try {
            const res = await fetch(
              `https://api.github.com/repos/${GITHUB_REPO}/stats/contributors?t=${Date.now()}`,
            );
            if (res.status === 200) return await res.json();
            if (res.status === 202) {
              await new Promise((r) => setTimeout(r, 1000));
              continue;
            }
            return [];
          } catch (e) {
            return [];
          }
        }
        return [];
      };

      const [contributorsResponse, statsData] = await Promise.all([
        fetch(`https://api.github.com/repos/${GITHUB_REPO}/contributors`),
        fetchStats(),
      ]);

      if (!contributorsResponse.ok) throw new Error("GitHub API Fehler");

      const contributors = await contributorsResponse.json();
      let stats = {};

      if (Array.isArray(statsData)) {
        statsData.forEach((item) => {
          if (item.author && item.weeks) {
            const additions = item.weeks.reduce((acc, w) => acc + w.a, 0);
            const deletions = item.weeks.reduce((acc, w) => acc + w.d, 0);
            stats[item.author.login] = {
              insertions: additions,
              deletions: deletions,
            };
          }
        });
      }

      const contributorsHtml = contributors
        .map((c, index) => {
          const s = stats[c.login] || { insertions: 0, deletions: 0 };
          return `
        <a href="${c.html_url}" target="_blank" rel="noopener noreferrer" class="contributor-card">
          <div class="contributor-card__rank">#${index + 1}</div>
          <img src="${c.avatar_url}" alt="${c.login}" class="contributor-card__avatar" loading="lazy"/>
          <span class="contributor-card__name">${c.login}</span>
          <span class="contributor-card__commits">${c.contributions} Beiträge</span>
          <span class="contributor-card__stats">
            <span class="contributor-card__insertions">+${s.insertions.toLocaleString()} <span class="contributor-card__plus">++</span></span><br>
            <span class="contributor-card__deletions">-${s.deletions.toLocaleString()} <span class="contributor-card__minus">--</span></span>
          </span>
        </a>
      `;
        })
        .join("");

      modal.querySelector(".contributors-content").innerHTML = `
        <p class="contributors-intro">Vielen Dank an alle, die zu Calchas beigetragen haben!</p>
        <div class="contributors-grid">
          ${contributorsHtml}
        </div>
        <a href="https://github.com/${GITHUB_REPO}/graphs/contributors" target="_blank" rel="noopener noreferrer" class="contributors-link">
          Auf GitHub ansehen →
        </a>
      `;
    } catch (error) {
      modal.querySelector(".contributors-content").innerHTML = `
        <p class="contributors-error">Fehler beim Laden der Mitwirkenden.</p>
        <p class="contributors-error-hint">Bitte versuche es später erneut oder besuche GitHub direkt.</p>
        <a href="https://github.com/${GITHUB_REPO}/graphs/contributors" target="_blank" rel="noopener noreferrer" class="contributors-link">
          Auf GitHub ansehen →
        </a>
      `;
    }
  }

  // ============ THIRD PARTY LICENSES ============

  function showThirdPartyModal() {
    const content = `
      <div class="thirdparty-content">
        <p class="thirdparty-intro">Diese App verwendet folgende Open-Source-Bibliotheken und Dienste:</p>

        <div class="thirdparty-section">
          <h4>APIs & Datenquellen</h4>
          <ul class="thirdparty-list">
            <li><strong>Open-Meteo</strong> - Wetterdaten (CC BY 4.0)</li>
            <li><strong>BrightSky</strong> - DWD Wetterdaten (MIT)</li>
            <li><strong>OpenStreetMap / Nominatim</strong> - Geokodierung (ODbL)</li>
            <li><strong>RainViewer</strong> - Radar-Daten</li>
          </ul>
        </div>

        <div class="thirdparty-section">
          <h4>Bibliotheken</h4>
          <ul class="thirdparty-list">
            <li><strong>Leaflet</strong> - Kartenansicht (BSD 2-Clause)</li>
            <li><strong>Chart.js</strong> - Diagramme (MIT)</li>
          </ul>
        </div>

        <div class="thirdparty-section">
          <h4>Icons & Assets</h4>
          <ul class="thirdparty-list">
            <li><strong>Google Weather Icons</strong> - Wettersymbole</li>
            <li><strong>Material Symbols</strong> - UI Icons (Apache 2.0)</li>
          </ul>
        </div>

        <p class="thirdparty-note">Weitere Details findest du in den jeweiligen Projekt-Repositories.</p>
      </div>
    `;
    createModal("thirdparty-modal", "Lizenzen von Drittanbietern", content, {
      large: true,
    });
  }

  // ============ TERMS MODAL ============

  function showTermsModal() {
    const content = `
      <div class="legal-modal-content">
        <p class="legal-date">Stand: 15.11.2025</p>

        <p>Diese Bedingungen regeln die Nutzung von Calchas (Projektarbeit BFS IT).</p>

        <h4>1. Zweck</h4>
        <p>Die App dient ausschließlich Bildungs- und Demonstrationszwecken. Es besteht kein Anspruch auf Verfügbarkeit, Funktionalität oder Datenrichtigkeit.</p>

        <h4>2. Nutzung</h4>
        <ul>
          <li>Die Anwendung ist kostenlos.</li>
          <li>Mit der Nutzung stimmen Sie der lokalen Speicherung von Einstellungen und Favoriten zu.</li>
          <li>Push-Benachrichtigungen und optionale APIs können nur nach expliziter Aktivierung genutzt werden.</li>
        </ul>

        <h4>3. API-Schlüssel</h4>
        <p>Für optionale Datenquellen (OpenWeatherMap, VisualCrossing, Meteostat) bringt der Nutzer eigene API-Keys ein und trägt dafür die volle Verantwortung.</p>

        <h4>4. Haftung</h4>
        <ul>
          <li>Keine Gewähr für permanente Verfügbarkeit oder korrekte Wetterdaten.</li>
          <li>Schadenersatzansprüche sind ausgeschlossen, soweit gesetzlich zulässig.</li>
        </ul>

        <h4>5. Urheberrecht</h4>
        <p>Alle Texte, Code-Dateien und Assets unterliegen der MIT-Lizenz des Projekts. Drittinhalte behalten ihre jeweiligen Rechte.</p>

        <h4>6. Änderungen</h4>
        <p>Das Projektteam kann die App oder diese Bedingungen jederzeit ändern oder einstellen.</p>
      </div>
    `;
    createModal("terms-modal", "Nutzungsbedingungen", content, { large: true });
  }

  // ============ PRIVACY MODAL ============

  function showPrivacyModal() {
    const content = `
      <div class="legal-modal-content">
        <p class="legal-date">Stand: 15.11.2025</p>

        <p>Calchas ist ein reines OpenSource Projekt. Es werden nur die Daten verarbeitet, die für die angefragten Funktionen unbedingt notwendig sind.</p>

        <h4>1. Verantwortlich</h4>
        <p>Projektteam BFS IT - Felix, Robin, Yannik, Max (Schulprojekt)</p>

        <h4>2. Verarbeitete Daten</h4>
        <div class="privacy-table-wrapper">
          <table class="privacy-table">
            <thead>
              <tr>
                <th>Zweck</th>
                <th>Daten</th>
                <th>Speicherort</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Wetterabfrage</td>
                <td>Stadt, Koordinaten</td>
                <td>Nur API-Request</td>
              </tr>
              <tr>
                <td>Favoriten/Verlauf</td>
                <td>Stadtname, Zeitstempel</td>
                <td>LocalStorage</td>
              </tr>
              <tr>
                <td>Push-Benachrichtigungen</td>
                <td>Push-Subscription</td>
                <td>Browser</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h4>3. Datenquellen</h4>
        <ul>
          <li><strong>Primäre APIs:</strong> Open-Meteo, BrightSky</li>
          <li><strong>Optionale APIs:</strong> OpenWeatherMap, VisualCrossing, Meteostat</li>
          <li><strong>Geokodierung:</strong> Nominatim (OpenStreetMap)</li>
        </ul>
        <p>Alle Requests laufen direkt vom Client zur jeweiligen API; es existiert kein eigener Backend-Proxy.</p>

        <h4>4. Rechtsgrundlage</h4>
        <p>Nutzung erfolgt auf freiwilliger Basis (Art. 6 Abs. 1 lit. a DSGVO).</p>

        <h4>5. Betroffenenrechte</h4>
        <p>Sie haben das Recht auf Auskunft, Berichtigung, Löschung und Einschränkung der Verarbeitung. Da keine personenbezogenen Daten serverseitig gespeichert werden, können Sie sämtliche lokal gespeicherten Informationen selbst im Einstellungsdialog löschen.</p>

        <h4>6. Sicherheit</h4>
        <ul>
          <li>HTTPS wird empfohlen</li>
          <li>Lokale Daten bleiben ausschließlich auf Ihrem Gerät</li>
        </ul>
      </div>
    `;
    createModal("privacy-modal", "Datenschutzerklärung", content, {
      large: true,
    });
  }

  global.AboutSheet = {
    renderAboutSheet,
    showLicenseModal,
    showChangelog,
    showAllChangelog,
    showContributorsModal,
    showThirdPartyModal,
    showTermsModal,
    showPrivacyModal,
    createModal,
  };
})(window);
