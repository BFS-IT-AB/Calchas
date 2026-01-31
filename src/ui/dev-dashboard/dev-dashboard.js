/**
 * Developer Dashboard Controller
 * Provides debugging and monitoring functionality for Calchas
 */

(function () {
  "use strict";

  console.log("🔧 [DevDashboard] Initializing...");

  // ============================================
  // INITIALIZATION
  // ============================================
  function init() {
    updateSystemStatus();
    setupEventListeners();
    console.log("✅ [DevDashboard] Ready");
  }

  // ============================================
  // STATUS MONITORING
  // ============================================
  function updateSystemStatus() {
    // Check WeatherDataService
    const wdsStatus = document.getElementById("wdsStatus");
    if (wdsStatus) {
      if (window.weatherDataService) {
        wdsStatus.textContent = "✅ Loaded";
        wdsStatus.style.color = "#10b981";
      } else {
        wdsStatus.textContent = "❌ Not Found";
        wdsStatus.style.color = "#ef4444";
      }
    }

    // Check Cache Service
    const cacheStatus = document.getElementById("cacheStatus");
    if (cacheStatus) {
      if (window.historyCacheService) {
        cacheStatus.textContent = "✅ Active";
        cacheStatus.style.color = "#10b981";
      } else {
        cacheStatus.textContent = "❌ Not Available";
        cacheStatus.style.color = "#ef4444";
      }
    }

    // Check API Key Manager
    const apiKeyStatus = document.getElementById("apiKeyStatus");
    if (apiKeyStatus) {
      if (window.apiKeyManager) {
        const keyCount = countAPIKeys();
        apiKeyStatus.textContent = `✅ ${keyCount} keys loaded`;
        apiKeyStatus.style.color = "#10b981";
      } else {
        apiKeyStatus.textContent = "❌ Not Available";
        apiKeyStatus.style.color = "#ef4444";
      }
    }

    // Count loaded modules
    const moduleCount = document.getElementById("moduleCount");
    if (moduleCount) {
      const count = countLoadedModules();
      moduleCount.textContent = `${count} modules`;
      moduleCount.style.color = "#60a5fa";
    }

    // Update system status indicator
    updateStatusIndicator();
  }

  function countAPIKeys() {
    if (!window.apiKeyManager) return 0;
    let count = 0;
    const providers = [
      "openweathermap",
      "visualcrossing",
      "meteostat",
      "openmeteo",
    ];
    providers.forEach((provider) => {
      if (
        window.apiKeyManager.hasKey &&
        window.apiKeyManager.hasKey(provider)
      ) {
        count++;
      }
    });
    return count;
  }

  function countLoadedModules() {
    let count = 0;
    const modules = [
      "weatherDataService",
      "historyCacheService",
      "apiKeyManager",
      "MasterUIController",
      "HistoryController",
      "HealthComponent",
    ];
    modules.forEach((module) => {
      if (window[module]) count++;
    });
    return count;
  }

  function updateStatusIndicator() {
    const statusDot = document.getElementById("systemStatus");
    const statusText = document.getElementById("statusText");

    if (!statusDot || !statusText) return;

    const wdsOK = !!window.weatherDataService;
    const cacheOK = !!window.historyCacheService;

    if (wdsOK && cacheOK) {
      statusDot.style.background = "#10b981";
      statusDot.style.boxShadow = "0 0 10px rgba(16, 185, 129, 0.5)";
      statusText.textContent = "System OK";
    } else if (wdsOK || cacheOK) {
      statusDot.style.background = "#fbbf24";
      statusDot.style.boxShadow = "0 0 10px rgba(251, 191, 36, 0.5)";
      statusText.textContent = "Partial";
    } else {
      statusDot.style.background = "#ef4444";
      statusDot.style.boxShadow = "0 0 10px rgba(239, 68, 68, 0.5)";
      statusText.textContent = "Error";
    }
  }

  // ============================================
  // QUICK ACTIONS
  // ============================================
  window.clearAllCaches = function () {
    if (
      !confirm(
        "Möchten Sie wirklich alle Caches leeren? Dies kann die Ladezeit vorübergehend erhöhen.",
      )
    ) {
      return;
    }

    try {
      // Clear historyCacheService
      if (window.historyCacheService && window.historyCacheService.clear) {
        window.historyCacheService.clear();
        console.log("✅ HistoryCacheService cleared");
      }

      // Clear localStorage
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (
          key &&
          (key.startsWith("weather_") ||
            key.startsWith("cache_") ||
            key.startsWith("history_"))
        ) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((key) => localStorage.removeItem(key));
      console.log(`✅ Removed ${keysToRemove.length} localStorage entries`);

      alert(
        `Cache erfolgreich geleert! (${keysToRemove.length} Einträge entfernt)`,
      );
      updateSystemStatus();
    } catch (err) {
      console.error("❌ Error clearing cache:", err);
      alert("Fehler beim Leeren des Caches: " + err.message);
    }
  };

  window.testAllAPIs = async function () {
    console.log("🧪 [DevDashboard] Testing all APIs...");
    alert(
      "API-Tests werden in der Konsole ausgeführt. Öffnen Sie die Browser-Konsole (F12) für Details.",
    );

    const testLat = 52.52;
    const testLon = 13.405;
    const results = [];

    // Test WeatherDataService
    if (window.weatherDataService) {
      try {
        console.log("Testing WeatherDataService.loadCurrentWeather...");
        const data = await window.weatherDataService.loadCurrentWeather(
          testLat,
          testLon,
        );
        console.log("✅ WeatherDataService:", data);
        results.push({ service: "WeatherDataService", status: "✅ OK", data });
      } catch (err) {
        console.error("❌ WeatherDataService failed:", err);
        results.push({
          service: "WeatherDataService",
          status: "❌ Error",
          error: err.message,
        });
      }
    }

    // Log results
    console.table(results);
    alert(
      `API-Tests abgeschlossen. ${results.length} Tests durchgeführt. Details in der Konsole.`,
    );
  };

  window.exportLogs = function () {
    try {
      // Collect recent console logs (if available via custom logger)
      const logs = [];
      logs.push("=== Calchas Developer Logs ===");
      logs.push("Timestamp: " + new Date().toISOString());
      logs.push("\n=== System Status ===");
      logs.push("WeatherDataService: " + !!window.weatherDataService);
      logs.push("HistoryCacheService: " + !!window.historyCacheService);
      logs.push("APIKeyManager: " + !!window.apiKeyManager);

      logs.push("\n=== LocalStorage Contents ===");
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          logs.push(
            `${key}: ${localStorage.getItem(key)?.substring(0, 100)}...`,
          );
        }
      }

      const blob = new Blob([logs.join("\n")], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `calchas-logs-${Date.now()}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      alert("Logs wurden exportiert!");
    } catch (err) {
      console.error("❌ Error exporting logs:", err);
      alert("Fehler beim Exportieren der Logs: " + err.message);
    }
  };

  window.resetSettings = function () {
    if (
      !confirm("WARNUNG: Dies setzt ALLE App-Einstellungen zurück! Fortfahren?")
    ) {
      return;
    }

    try {
      const settingsKeys = [
        "app_settings",
        "user_preferences",
        "api_keys",
        "theme",
      ];
      settingsKeys.forEach((key) => localStorage.removeItem(key));

      alert(
        "Einstellungen wurden zurückgesetzt. Bitte laden Sie die Seite neu.",
      );
      console.log("✅ Settings reset");
    } catch (err) {
      console.error("❌ Error resetting settings:", err);
      alert("Fehler beim Zurücksetzen: " + err.message);
    }
  };

  // ============================================
  // EVENT LISTENERS
  // ============================================
  function setupEventListeners() {
    // Refresh status every 5 seconds
    setInterval(updateSystemStatus, 5000);

    // Keyboard shortcuts
    document.addEventListener("keydown", (e) => {
      // Ctrl+Shift+D = Open/Close Dashboard
      if (e.ctrlKey && e.shiftKey && e.key === "D") {
        console.log("🔧 Dev Dashboard toggled via shortcut");
      }
    });
  }

  // ============================================
  // AUTO-INIT
  // ============================================
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
