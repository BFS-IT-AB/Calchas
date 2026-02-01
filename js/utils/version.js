/**
 * version.js - Version Information Service
 * Holt Version und Build-Info vom Service Worker oder Manifest
 */

/**
 * Holt Versions-Informationen vom Service Worker
 * @returns {Promise<{appVersion: string, buildId: string, cacheVersion: string}>}
 */
export async function getVersionInfo() {
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
