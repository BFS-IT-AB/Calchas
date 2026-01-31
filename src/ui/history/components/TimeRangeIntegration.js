/**
 * ZEITRAUM-SYSTEM INTEGRATION GUIDE
 *
 * Dieses Dokument beschreibt die Integration des neuen TimeRangeSystem.js
 * in die bestehende History-Funktionalität.
 */

// ============================================
// SCHRITT 1: Script in index.html einbinden
// ============================================
/*
Fügen Sie vor HistoryStats.js hinzu:
<script src="src/ui/history/components/TimeRangeSystem.js"></script>
*/

// ============================================
// SCHRITT 2: HistoryStats.js erweitern
// ============================================

// Fügen Sie diese neue Funktion in HistoryStats.js ein (nach Zeile 3010):

function renderAdvancedPeriodModal(
  periodType,
  currentPeriod,
  selectedGranularity = "month",
) {
  const TRS = window.TimeRangeSystem;
  if (!TRS) {
    // Fallback auf alte Implementierung
    return renderPeriodSelectorModal([], currentPeriod, periodType);
  }

  const granularityConfig = TRS.GRANULARITY_CONFIG[selectedGranularity];
  const presets = TRS.generateTimeRangePresets();

  // Generiere Perioden basierend auf Granularität
  const periods = generatePeriodsForGranularity(
    selectedGranularity,
    periodType,
  );

  return `
    <div class="history-modal__content history-modal__content--period history-modal__content--advanced">
      <div class="swipe-handle"></div>
      <button class="history-modal__close" data-action="close" aria-label="Schließen">
        <span class="material-symbols-outlined">close</span>
      </button>

      <header class="history-modal__header">
        <div class="period-modal__title-group">
          <span class="material-symbols-outlined">${granularityConfig?.icon || "calendar_month"}</span>
          <div>
            <h3>Zeitraum ${periodType} wählen</h3>
            <p class="history-modal__subtitle">${granularityConfig?.label || "Zeitraum"} vergleichen</p>
          </div>
        </div>
      </header>

      <!-- Granularitäts-Switcher -->
      <div class="granularity-selector">
        <div class="granularity-tabs">
          ${Object.keys(TRS.GRANULARITY_CONFIG)
            .map((key) => {
              const config = TRS.GRANULARITY_CONFIG[key];
              return `
                  <button class="granularity-tab ${key === selectedGranularity ? "granularity-tab--active" : ""}"
                          data-granularity="${key}"
                          data-period-type="${periodType}">
                    <span class="material-symbols-outlined">${config.icon}</span>
                    <span class="granularity-tab__label">${config.label}</span>
                  </button>
                `;
            })
            .join("")}
        </div>
      </div>

      <!-- Schnellauswahl -->
      <div class="period-presets">
        <h4 class="period-section-title">Schnellauswahl</h4>
        <div class="period-preset-grid">
          ${presets
            .filter((p) => p.granularity === selectedGranularity)
            .map(
              (preset) => `
            <button class="period-preset-btn" data-preset-id="${preset.id}">
              <span class="material-symbols-outlined">bolt</span>
              <span>${preset.label}</span>
            </button>
          `,
            )
            .join("")}
        </div>
      </div>

      <!-- Periodenliste -->
      <div class="history-modal__body">
        <h4 class="period-section-title">Verfügbare Zeiträume</h4>
        <div class="period-list period-list--advanced" id="period-list-container">
          ${periods
            .map((p) => {
              const isActive = p.id === currentPeriod;
              return `
                <button class="period-item period-item--enhanced ${isActive ? "period-item--active" : ""}"
                        data-period-id="${p.id}"
                        data-period-type="${periodType}"
                        data-granularity="${selectedGranularity}">
                  <div class="period-item__indicator"></div>
                  <div class="period-item__content">
                    <span class="period-item__name">${p.label}</span>
                    ${p.subtitle ? `<span class="period-item__subtitle">${p.subtitle}</span>` : ""}
                    ${p.dataPoints ? `<span class="period-item__meta">${p.dataPoints} ${granularityConfig.label}</span>` : ""}
                  </div>
                  ${isActive ? '<span class="material-symbols-outlined period-item__check">check_circle</span>' : ""}
                </button>
              `;
            })
            .join("")}
        </div>
      </div>

      <!-- Custom Range -->
      <div class="period-custom-section">
        <button class="period-custom-btn" data-action="custom-range">
          <span class="material-symbols-outlined">edit_calendar</span>
          <span>Benutzerdefinierter Zeitraum</span>
          <span class="material-symbols-outlined">arrow_forward</span>
        </button>
      </div>
    </div>
  `;
}

// Helper-Funktion für Perioden-Generierung
function generatePeriodsForGranularity(granularity, periodType) {
  const TRS = window.TimeRangeSystem;
  const now = new Date();
  const periods = [];
  const config = TRS.GRANULARITY_CONFIG[granularity];

  if (!config) return [];

  // Generiere letzte N Perioden basierend auf Granularität
  const count = Math.min(config.maxDataPoints, 12); // Max 12 Einträge

  for (let i = 0; i < count; i++) {
    const date = config.getPrevious(
      i === 0 ? now : config.getPrevious(new Date(periods[i - 1].startDate)),
    );

    const endDate = config.getNext(date);

    periods.push({
      id: `${granularity}-${i}`,
      label: config.formatFull(date),
      subtitle: TRS.generateTimeRangeLabel(date, endDate, granularity),
      startDate: date.toISOString(),
      endDate: endDate.toISOString(),
      granularity: granularity,
      dataPoints: 1,
    });
  }

  return periods;
}

// ============================================
// SCHRITT 3: HistoryCharts.js anpassen
// ============================================

// Erweitern Sie getComparisonChartConfig um dynamische Anpassung:

function getComparisonChartConfigDynamic(
  dataA,
  dataB,
  labelA,
  labelB,
  granularity = "day",
) {
  const TRS = window.TimeRangeSystem;
  const config = TRS?.GRANULARITY_CONFIG[granularity];

  // Aggregiere Daten wenn nötig
  const aggregatedA = TRS
    ? TRS.aggregateDataByGranularity(dataA, granularity)
    : dataA;
  const aggregatedB = TRS
    ? TRS.aggregateDataByGranularity(dataB, granularity)
    : dataB;

  const maxLen = Math.max(aggregatedA.length, aggregatedB.length);
  const labels = aggregatedA.map((d, i) => {
    return config ? config.formatLabel(new Date(d.date)) : i + 1;
  });

  // ... rest der Chart-Config mit dynamischen Labels

  return {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: labelA,
          data: aggregatedA.map((d) => d.temp_avg),
          // ... styling
        },
        {
          label: labelB,
          data: aggregatedB.map((d) => d.temp_avg),
          // ... styling
        },
      ],
    },
    options: {
      // ... base options
      plugins: {
        tooltip: {
          callbacks: {
            title: (items) => {
              const index = items[0].dataIndex;
              const dayData = aggregatedA[index] || aggregatedB[index];
              if (config && dayData?.date) {
                return config.formatFull(new Date(dayData.date));
              }
              return `${config?.singular || "Datenpunkt"} ${items[0].label}`;
            },
          },
        },
      },
    },
  };
}

// ============================================
// SCHRITT 4: CSS Styles hinzufügen
// ============================================

/*
Fügen Sie diese Styles in history.css ein:
*/

const ADVANCED_PERIOD_MODAL_STYLES = `
/* Granularitäts-Tabs */
.granularity-selector {
  padding: 0 var(--history-spacing-lg);
  margin-bottom: var(--history-spacing-lg);
}

.granularity-tabs {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(80px, 1fr));
  gap: var(--history-spacing-xs);
  background: var(--history-surface);
  padding: 6px;
  border-radius: var(--history-radius-lg);
}

.granularity-tab {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: var(--history-spacing-sm);
  background: transparent;
  border: none;
  border-radius: var(--history-radius-md);
  color: var(--history-text-secondary);
  cursor: pointer;
  transition: all var(--history-transition-fast);
  font-size: 11px;
  font-weight: 500;
}

.granularity-tab .material-symbols-outlined {
  font-size: 20px;
}

.granularity-tab--active {
  background: var(--history-accent);
  color: #0a0f1a;
  font-weight: 600;
}

.granularity-tab:hover:not(.granularity-tab--active) {
  background: var(--history-surface-raised);
  color: var(--history-text-primary);
}

/* Period Presets */
.period-presets {
  padding: 0 var(--history-spacing-lg);
  margin-bottom: var(--history-spacing-lg);
}

.period-section-title {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  color: var(--history-text-secondary);
  margin: 0 0 var(--history-spacing-sm) 0;
  display: flex;
  align-items: center;
  gap: 6px;
}

.period-section-title::before {
  content: "";
  width: 3px;
  height: 12px;
  background: var(--history-accent);
  border-radius: 2px;
}

.period-preset-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: var(--history-spacing-sm);
}

.period-preset-btn {
  display: flex;
  align-items: center;
  gap: var(--history-spacing-xs);
  padding: var(--history-spacing-sm) var(--history-spacing-md);
  background: var(--history-surface);
  border: 1px solid var(--history-border);
  border-radius: var(--history-radius-md);
  color: var(--history-text-primary);
  cursor: pointer;
  transition: all var(--history-transition-fast);
  font-size: 13px;
  font-weight: 500;
}

.period-preset-btn .material-symbols-outlined {
  font-size: 18px;
  color: var(--history-accent);
}

.period-preset-btn:hover {
  background: var(--history-surface-raised);
  border-color: var(--history-accent);
  transform: translateY(-1px);
}

/* Enhanced Period Items */
.period-item--enhanced {
  display: flex;
  align-items: center;
  gap: var(--history-spacing-md);
  padding: var(--history-spacing-md);
  background: var(--history-surface);
  border: 1px solid var(--history-border);
  border-radius: var(--history-radius-md);
  cursor: pointer;
  transition: all var(--history-transition-fast);
  position: relative;
  overflow: hidden;
}

.period-item__indicator {
  width: 3px;
  height: 100%;
  position: absolute;
  left: 0;
  top: 0;
  background: transparent;
  transition: background var(--history-transition-fast);
}

.period-item--enhanced.period-item--active .period-item__indicator {
  background: var(--history-accent);
}

.period-item__content {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
  text-align: left;
}

.period-item__name {
  font-size: 15px;
  font-weight: 600;
  color: var(--history-text-primary);
}

.period-item__subtitle {
  font-size: 12px;
  color: var(--history-text-secondary);
}

.period-item__meta {
  font-size: 11px;
  color: var(--history-text-tertiary);
  margin-top: 2px;
}

.period-item__check {
  font-size: 22px;
  color: var(--history-accent);
}

/* Custom Range */
.period-custom-section {
  padding: var(--history-spacing-lg);
  border-top: 1px solid var(--history-border);
  margin-top: var(--history-spacing-lg);
}

.period-custom-btn {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: var(--history-spacing-md);
  background: var(--history-accent-dim);
  border: 1px solid var(--history-border-active);
  border-radius: var(--history-radius-md);
  color: var(--history-accent);
  cursor: pointer;
  transition: all var(--history-transition-fast);
  font-size: 14px;
  font-weight: 600;
}

.period-custom-btn:hover {
  background: var(--history-accent);
  color: #0a0f1a;
  transform: translateY(-1px);
}

.period-modal__title-group {
  display: flex;
  align-items: center;
  gap: var(--history-spacing-md);
}

.period-modal__title-group .material-symbols-outlined {
  font-size: 32px;
  color: var(--history-accent);
}
`;

// ============================================
// SCHRITT 5: Event-Handler registrieren
// ============================================

// In HistoryController.js:
/*
// Granularitäts-Wechsel
document.addEventListener('click', (e) => {
  const tab = e.target.closest('.granularity-tab');
  if (tab) {
    const granularity = tab.dataset.granularity;
    const periodType = tab.dataset.periodType;
    // Reload modal mit neuer Granularität
    this._reloadPeriodModal(periodType, granularity);
  }
});

// Preset-Selection
document.addEventListener('click', (e) => {
  const preset = e.target.closest('.period-preset-btn');
  if (preset) {
    const presetId = preset.dataset.presetId;
    // Lade Preset-Daten
    this._applyPreset(presetId);
  }
});
*/

module.exports = {
  renderAdvancedPeriodModal,
  generatePeriodsForGranularity,
  ADVANCED_PERIOD_MODAL_STYLES,
};
