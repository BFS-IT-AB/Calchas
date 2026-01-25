/**
 * templates.js - UI Skeleton & Loading Templates
 * Provides loading states and skeleton layouts for health components
 * @module ui/templates
 */

(function (global) {
  "use strict";

  const Templates = {
    /**
     * Health Section Skeleton Layout
     * Displayed while API data is being processed by healthDataTransformer
     */
    healthSectionSkeleton() {
      return `
        <div class="health-section health-section--loading" aria-busy="true" aria-label="Lade Gesundheitsdaten">
          <!-- Outdoor Quality Card Skeleton -->
          <section class="health-card health-card--skeleton health-card--outdoor">
            <div class="health-card__header">
              <div class="skeleton-line skeleton-line--short"></div>
              <div class="skeleton-line skeleton-line--tiny"></div>
            </div>
            <div class="health-skeleton-content">
              <div class="skeleton-circle"></div>
              <div class="skeleton-timeline">
                ${Array(12)
                  .fill(0)
                  .map(
                    () => `
                  <div class="skeleton-bar"></div>
                `,
                  )
                  .join("")}
              </div>
            </div>
            <div class="skeleton-line skeleton-line--medium"></div>
          </section>

          <!-- Quick Check Grid Skeleton -->
          <section class="health-section__quick-checks health-section--skeleton">
            <div class="health-section__header">
              <div class="skeleton-line skeleton-line--short"></div>
            </div>
            <div class="quick-check-grid">
              ${Array(4)
                .fill(0)
                .map(
                  () => `
                <div class="quick-check-card health-card health-card--skeleton">
                  <div class="skeleton-icon"></div>
                  <div class="skeleton-content">
                    <div class="skeleton-line skeleton-line--medium"></div>
                    <div class="skeleton-line skeleton-line--short"></div>
                    <div class="skeleton-line skeleton-line--tiny"></div>
                  </div>
                </div>
              `,
                )
                .join("")}
            </div>
          </section>

          <!-- Bio Insights Skeleton -->
          <section class="health-section__bio-insights health-section--skeleton">
            <div class="health-section__header">
              <div class="skeleton-line skeleton-line--short"></div>
            </div>
            <div class="bio-insights-grid">
              ${Array(2)
                .fill(0)
                .map(
                  () => `
                <div class="bio-card health-card health-card--skeleton">
                  <div class="skeleton-line skeleton-line--short"></div>
                  <div class="skeleton-line skeleton-line--medium"></div>
                  <div class="skeleton-line skeleton-line--tiny"></div>
                </div>
              `,
                )
                .join("")}
            </div>
          </section>

          <!-- Safety Alerts Skeleton -->
          <section class="health-section__safety health-card health-card--skeleton">
            <div class="skeleton-line skeleton-line--full"></div>
          </section>

          <!-- Loading indicator -->
          <div class="health-loading-overlay">
            <div class="health-loading-spinner"></div>
            <span class="health-loading-text">Analysiere Wetterdaten...</span>
          </div>
        </div>
      `;
    },

    /**
     * Individual card skeleton
     */
    cardSkeleton(type = "default") {
      return `
        <div class="health-card health-card--skeleton health-card--${type}">
          <div class="skeleton-line skeleton-line--short"></div>
          <div class="skeleton-line skeleton-line--medium"></div>
          <div class="skeleton-line skeleton-line--full"></div>
        </div>
      `;
    },

    /**
     * Error state template
     */
    healthErrorState(message, retryCallback) {
      const errorMessage = message || "Daten konnten nicht geladen werden";
      return `
        <div class="health-section health-section--error">
          <div class="health-error-state">
            <span class="health-error-icon">⚠️</span>
            <h3 class="health-error-title">Fehler beim Laden</h3>
            <p class="health-error-message">${errorMessage}</p>
            <button class="health-error-retry" onclick="${retryCallback || "window.location.reload()"}">
              🔄 Erneut versuchen
            </button>
          </div>
        </div>
      `;
    },

    /**
     * Empty state when no data available
     */
    healthEmptyState() {
      return `
        <div class="health-section health-section--empty">
          <div class="health-empty-state">
            <span class="health-empty-icon">📊</span>
            <h3>Keine Gesundheitsdaten</h3>
            <p>Bitte wähle zuerst einen Standort aus, um Gesundheitsempfehlungen zu erhalten.</p>
          </div>
        </div>
      `;
    },

    /**
     * Offline banner
     */
    offlineBanner() {
      return `
        <div class="health-offline-banner">
          <span class="offline-icon">📴</span>
          <span class="offline-text">Offline-Modus – Zeige gespeicherte Daten</span>
        </div>
      `;
    },

    /**
     * CSS for skeleton animations
     */
    skeletonStyles() {
      return `
        /* Skeleton Base Styles */
        .health-section--loading {
          position: relative;
          overflow: hidden;
        }

        .health-card--skeleton {
          pointer-events: none;
        }

        /* Skeleton Lines */
        .skeleton-line {
          height: 14px;
          background: linear-gradient(
            90deg,
            rgba(255, 255, 255, 0.05) 25%,
            rgba(255, 255, 255, 0.12) 50%,
            rgba(255, 255, 255, 0.05) 75%
          );
          background-size: 200% 100%;
          animation: skeleton-shimmer 1.5s infinite ease-in-out;
          border-radius: 4px;
          margin-bottom: 8px;
        }

        .skeleton-line--tiny { width: 40%; height: 10px; }
        .skeleton-line--short { width: 60%; }
        .skeleton-line--medium { width: 80%; }
        .skeleton-line--full { width: 100%; }

        /* Skeleton Circle (for score) */
        .skeleton-circle {
          width: 100px;
          height: 100px;
          border-radius: 50%;
          background: linear-gradient(
            90deg,
            rgba(255, 255, 255, 0.05) 25%,
            rgba(255, 255, 255, 0.12) 50%,
            rgba(255, 255, 255, 0.05) 75%
          );
          background-size: 200% 100%;
          animation: skeleton-shimmer 1.5s infinite ease-in-out;
          margin: 16px auto;
        }

        /* Skeleton Icon */
        .skeleton-icon {
          width: 40px;
          height: 40px;
          border-radius: 12px;
          background: linear-gradient(
            90deg,
            rgba(255, 255, 255, 0.05) 25%,
            rgba(255, 255, 255, 0.12) 50%,
            rgba(255, 255, 255, 0.05) 75%
          );
          background-size: 200% 100%;
          animation: skeleton-shimmer 1.5s infinite ease-in-out;
        }

        /* Skeleton Timeline */
        .skeleton-timeline {
          display: flex;
          gap: 4px;
          height: 80px;
          align-items: flex-end;
          padding: 16px 0;
        }

        .skeleton-bar {
          flex: 1;
          height: var(--bar-height, 50%);
          background: linear-gradient(
            90deg,
            rgba(255, 255, 255, 0.05) 25%,
            rgba(255, 255, 255, 0.12) 50%,
            rgba(255, 255, 255, 0.05) 75%
          );
          background-size: 200% 100%;
          animation: skeleton-shimmer 1.5s infinite ease-in-out;
          border-radius: 4px 4px 0 0;
        }

        .skeleton-bar:nth-child(1) { --bar-height: 40%; }
        .skeleton-bar:nth-child(2) { --bar-height: 55%; }
        .skeleton-bar:nth-child(3) { --bar-height: 70%; }
        .skeleton-bar:nth-child(4) { --bar-height: 85%; }
        .skeleton-bar:nth-child(5) { --bar-height: 75%; }
        .skeleton-bar:nth-child(6) { --bar-height: 90%; }
        .skeleton-bar:nth-child(7) { --bar-height: 80%; }
        .skeleton-bar:nth-child(8) { --bar-height: 65%; }
        .skeleton-bar:nth-child(9) { --bar-height: 55%; }
        .skeleton-bar:nth-child(10) { --bar-height: 45%; }
        .skeleton-bar:nth-child(11) { --bar-height: 35%; }
        .skeleton-bar:nth-child(12) { --bar-height: 30%; }

        /* Skeleton Content */
        .skeleton-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .health-skeleton-content {
          display: flex;
          gap: 24px;
          padding: 16px;
        }

        /* Loading Overlay */
        .health-loading-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 12px;
          background: rgba(0, 0, 0, 0.3);
          backdrop-filter: blur(4px);
          border-radius: inherit;
          opacity: 0;
          animation: fade-in 0.3s ease forwards 0.2s;
        }

        .health-loading-spinner {
          width: 40px;
          height: 40px;
          border: 3px solid rgba(255, 255, 255, 0.1);
          border-top-color: var(--health-accent-green, #4ade80);
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        .health-loading-text {
          font-size: 14px;
          color: rgba(255, 255, 255, 0.8);
          font-weight: 500;
        }

        /* Error State */
        .health-error-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 48px 24px;
          text-align: center;
        }

        .health-error-icon {
          font-size: 48px;
          margin-bottom: 16px;
        }

        .health-error-title {
          font-size: 18px;
          font-weight: 600;
          margin-bottom: 8px;
          color: rgba(255, 255, 255, 0.9);
        }

        .health-error-message {
          font-size: 14px;
          color: rgba(255, 255, 255, 0.6);
          margin-bottom: 24px;
        }

        .health-error-retry {
          background: var(--health-glass-bg, rgba(255, 255, 255, 0.1));
          border: 1px solid rgba(255, 255, 255, 0.15);
          color: white;
          padding: 10px 20px;
          border-radius: 8px;
          cursor: pointer;
          font-size: 14px;
          transition: all 0.2s ease;
        }

        .health-error-retry:hover {
          background: rgba(255, 255, 255, 0.15);
          transform: translateY(-2px);
        }

        /* Empty State */
        .health-empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 48px 24px;
          text-align: center;
        }

        .health-empty-icon {
          font-size: 48px;
          margin-bottom: 16px;
          opacity: 0.6;
        }

        /* Offline Banner */
        .health-offline-banner {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 10px 16px;
          background: rgba(255, 152, 0, 0.15);
          border: 1px solid rgba(255, 152, 0, 0.3);
          border-radius: 8px;
          margin-bottom: 16px;
          font-size: 13px;
          color: #ffc107;
        }

        /* Animations */
        @keyframes skeleton-shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        @keyframes fade-in {
          to { opacity: 1; }
        }

        /* Reduced motion */
        @media (prefers-reduced-motion: reduce) {
          .skeleton-line,
          .skeleton-circle,
          .skeleton-icon,
          .skeleton-bar,
          .health-loading-spinner {
            animation: none;
          }

          .health-loading-overlay {
            animation: none;
            opacity: 1;
          }
        }
      `;
    },
  };

  // Inject skeleton styles on load
  if (typeof document !== "undefined") {
    const styleTag = document.createElement("style");
    styleTag.id = "health-skeleton-styles";
    styleTag.textContent = Templates.skeletonStyles();

    if (!document.getElementById("health-skeleton-styles")) {
      document.head.appendChild(styleTag);
    }
  }

  // Export
  global.HealthTemplates = Templates;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = Templates;
  }
})(typeof window !== "undefined" ? window : global);
