/**
 * version.js - Version Information Service
 * Holt Version und Build-Info vom Service Worker oder service-worker.js Datei
 */

/**
 * Holt Versions-Informationen - Robuste Implementierung mit mehreren Fallbacks
 * @returns {Promise<{appVersion: string, buildId: string, cacheVersion: string}>}
 */
export async function getVersionInfo() {
  // Methode 1: Service Worker Controller vorhanden
  if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
    try {
      const swVersion = await new Promise((resolve, reject) => {
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
      return swVersion;
    } catch (error) {
      console.warn("[Version] Service Worker Methode fehlgeschlagen:", error);
    }
  }

  // Methode 2: Direkt service-worker.js fetchen und Build-ID extrahieren
  try {
    const swResponse = await fetch(`/service-worker.js?v=${Date.now()}`, {
      cache: "no-store",
      headers: { "Cache-Control": "no-cache" },
    });
    const swText = await swResponse.text();

    // Extrahiere CACHE_NAME aus dem Service Worker Code
    const cacheMatch = swText.match(
      /CACHE_NAME\s*=\s*["']calchas-([^"']+)["']/,
    );
    const versionMatch = swText.match(/APP_VERSION\s*=\s*["']([^"']+)["']/);

    if (cacheMatch && versionMatch) {
      return {
        appVersion: versionMatch[1],
        buildId: cacheMatch[1],
        cacheVersion: `calchas-${cacheMatch[1]}`,
      };
    }
  } catch (error) {
    console.warn(
      "[Version] Service Worker Datei-Methode fehlgeschlagen:",
      error,
    );
  }

  // Methode 3: Nur manifest.json (letzter Fallback)
  try {
    const manifest = await fetch(`/manifest.json?v=${Date.now()}`, {
      cache: "no-store",
    }).then((r) => r.json());
    return {
      appVersion: manifest.version || "unknown",
      buildId: "unknown",
      cacheVersion: "none",
    };
  } catch (error) {
    console.error("[Version] Alle Methoden fehlgeschlagen:", error);
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
export function formatBuildId(buildId) {
  if (!buildId || buildId === "unknown") return "unknown";

  // Format: 2026-02-01-1658 → 01.02.26 16:58
  const match = buildId.match(/(\d{4})-(\d{2})-(\d{2})-(\d{2})(\d{2})/);
  if (match) {
    const [, year, month, day, hour, minute] = match;
    return `${day}.${month}.${year.slice(2)} ${hour}:${minute}`;
  }

  return buildId;
}

/**
 * Gibt Version-String für Anzeige zurück
 * @returns {Promise<string>}
 */
export async function getVersionString() {
  const info = await getVersionInfo();
  const formattedBuild = formatBuildId(info.buildId);
  return `v${info.appVersion} (Build: ${formattedBuild})`;
}
