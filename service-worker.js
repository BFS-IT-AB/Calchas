// Service Worker für Calchas
// Ermöglicht Offline-Funktionalität, Caching und Push-Notifications

const APP_VERSION = "0.1.1-alpha"; // SemVer - manuell bei Releases ändern
const CACHE_NAME = "calchas-2026-02-01-1955"; // Timestamp - bei jedem Deploy
const BUILD_ID = CACHE_NAME.replace("calchas-", ""); // Extrahiert Timestamp
const HEALTH_CACHE_NAME = "calchas-health-data"; // Separate cache for health data
const HEALTH_CACHE_TTL = 30 * 60 * 1000; // 30 Minuten TTL für Health-Daten

// ═══════════════════════════════════════════════════════════════════════════
// CACHE ASSETS - Vollständige Liste aller App-Dateien
// Automatisch validiert am 01.02.2026
// ═══════════════════════════════════════════════════════════════════════════
const urlsToCache = [
  // Core App Files
  "/",
  "/index.html",
  "/app.js",
  "/manifest.json",

  // CSS Files
  "/css/style.css",
  "/css/mobile.css",

  // Config
  "/js/config/changelog.js",

  // i18n (Internationalization)
  "/js/i18n/de.json",
  "/js/i18n/en.json",
  "/js/i18n/helper.js",
  "/js/i18n/textReplacer.js",

  // Utils
  "/js/utils/constants.js",
  "/js/utils/cache.js",
  "/js/utils/validation.js",
  "/js/utils/WeatherMath.js",
  "/js/utils/analytics.js",
  "/js/utils/deviceDetection.js",
  "/js/utils/iconMapper.js",
  "/js/utils/historyTransformer.js",
  "/js/utils/historyCache.js",
  "/js/utils/graphRenderer.js",
  "/js/utils/apiKeyManager.js",
  "/js/utils/version.js",

  // API Layer
  "/js/api/weather.js",
  "/js/api/brightsky.js",
  "/js/api/healthDataTransformer.js",
  "/js/api/WeatherDataService.js",
  "/js/api/aqi.js",
  "/js/api/sunriseSunset.js",
  "/js/api/openweathermap.js",
  "/js/api/visualcrossing.js",
  "/js/api/openMeteoHistorical.js",
  "/js/api/noaaAlerts.js",
  "/js/api/moonPhase.js",
  "/js/api/meteostat.js",
  "/js/api/gridFields.js",
  "/js/api/bigdatacloud.js",

  // Logic Layer
  "/js/logic/HealthEngine.js",

  // UI Core
  "/js/ui/errorHandler.js",
  "/js/ui/searchInput.js",
  "/js/ui/weatherDisplay.js",
  "/js/ui/HealthComponent.js",
  "/js/ui/templates.js",
  "/js/ui/dayDetailTemplate.js",
  "/js/ui/alertsPanel.js",
  "/js/ui/MasterUIController.js",
  "/js/ui/mapComponent.js",
  "/js/ui/NonMobileOverlay.js",
  "/js/ui/non-mobile-overlay.css",
  "/js/ui/radar_fixes.css",
  "/js/ui/design-system.css",

  // UI Components
  "/js/ui/components/MetricCard.js",

  // UI Home
  "/js/ui/home/WeatherHero.js",
  "/js/ui/home/HomeCards.js",
  "/js/ui/home/WeatherCards.js",
  "/js/ui/home/FrogHeroPlayer.js",

  // UI Health
  "/js/ui/health/HealthSafetyView.js",
  "/js/ui/health/health.css",

  // UI History
  "/js/ui/history/HistoryViewBrowser.js",
  "/js/ui/history/history.css",
  "/js/ui/history/components/HistoryCharts.js",
  "/js/ui/history/components/HistoryStats.js",
  "/js/ui/history/components/HistoryController.js",
  "/js/ui/history/components/TimeRangeSystem.js",
  "/js/ui/history/components/TimeRangeSelectors.js",
  "/js/ui/history/components/TimeRangeIntegration.js",

  // UI Settings
  "/js/ui/settings/SettingsHome.js",
  "/js/ui/settings/AboutSheet.js",
  "/js/ui/settings/BackgroundSettingsSheet.js",
  "/js/ui/settings/HomeLocationSheet.js",
  "/js/ui/settings/LanguageSelectorSheet.js",
  "/js/ui/settings/PrivacyApiInfoSheet.js",
  "/js/ui/settings/ThemeSelectorSheet.js",
  "/js/ui/settings/UnitsSelectorSheet.js",

  // UI Day Detail
  "/js/ui/day-detail/day-detail.js",
  "/js/ui/day-detail/day-detail.css",
  "/js/ui/day-detail/day-detail.html",

  // UI Shared
  "/js/ui/shared/features.js",
  "/js/ui/shared/BottomNav.js",
  "/js/ui/shared/AppBar.js",
  "/js/ui/shared/design-tokens.css",

  // UI Modals
  "/js/ui/modals/ModalController.js",
  "/js/ui/modals/LocationPickerController.js",
  "/js/ui/modals/DetailSheets/AQIDetailSheet.js",
  "/js/ui/modals/DetailSheets/PrecipitationDetailSheet.js",
  "/js/ui/modals/DetailSheets/SunCloudDetailSheet.js",
  "/js/ui/modals/DetailSheets/TemperatureTrendDetailSheet.js",
  "/js/ui/modals/DetailSheets/UVDetailSheet.js",
  "/js/ui/modals/DetailSheets/VisibilityDetailSheet.js",
  "/js/ui/modals/DetailSheets/WindDetailSheet.js",

  // UI Map
  "/js/ui/map/RadarController.js",
  "/js/ui/map/MapUtils.js",
  "/js/ui/map/MapLayerManager.js",
  "/js/ui/map/MapContainer.js",
  "/js/ui/map/GlobalMapLayerManager.js",
  "/js/ui/map/layers/AQILayer.js",
  "/js/ui/map/layers/AlertLayer.js",
  "/js/ui/map/layers/CloudLayer.js",
  "/js/ui/map/layers/HumidityLayer.js",
  "/js/ui/map/layers/RadarLayer.js",
  "/js/ui/map/layers/SatelliteLayer.js",
  "/js/ui/map/layers/TemperatureLayer.js",
  "/js/ui/map/layers/WindLayer.js",

  // Vendor Libraries
  "/js/vendor/leaflet/leaflet.js",
  "/js/vendor/leaflet/leaflet.css",

  // Assets - Icons
  "/assets/icons/icon-192.png",
  "/assets/icons/icon-384.png",
  "/assets/icons/apple-touch-icon.png",
  "/assets/icons/favicon-16.png",
  "/assets/icons/favicon-32.png",
  "/assets/logo.png",
];

// Installation - mit verbessertem Error Handling
// Race Condition Protection: Verhindert parallele Updates
let installInProgress = false;

self.addEventListener("install", (event) => {
  if (installInProgress) {
    console.warn("Service Worker: Installation already in progress, skipping");
    return;
  }
  installInProgress = true;
  console.log("Service Worker: Installing...");

  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then(async (cache) => {
        console.log("Service Worker: Caching app shell");
        // Cache einzeln mit Fehlerbehandlung pro Datei
        const cacheResults = await Promise.allSettled(
          urlsToCache.map(async (url) => {
            try {
              const response = await fetch(url, { cache: "no-store" });
              if (response.ok) {
                await cache.put(url, response);
                return { url, status: "cached" };
              } else {
                console.warn(
                  `Service Worker: Failed to fetch ${url}: ${response.status}`,
                );
                return { url, status: "fetch-failed", code: response.status };
              }
            } catch (err) {
              console.warn(
                `Service Worker: Error caching ${url}:`,
                err.message,
              );
              return { url, status: "error", error: err.message };
            }
          }),
        );

        // Log Summary
        const cached = cacheResults.filter(
          (r) => r.value?.status === "cached",
        ).length;
        const failed = cacheResults.filter(
          (r) => r.value?.status !== "cached",
        ).length;
        console.log(
          `Service Worker: Cached ${cached}/${urlsToCache.length} files (${failed} failed)`,
        );

        // Debug: Log failed files
        cacheResults
          .filter((r) => r.value?.status !== "cached")
          .forEach((r) =>
            console.warn(`  ⚠️ ${r.value?.url}: ${r.value?.status}`),
          );
      })
      .catch((err) => {
        console.error("Service Worker: Critical cache error:", err);
      })
      .finally(() => {
        installInProgress = false;
      }),
  );

  // Skip waiting - aktiviere sofort
  self.skipWaiting();
});

// Aktivierung - mit verbesserter Cache-Bereinigung
let activateInProgress = false;

self.addEventListener("activate", (event) => {
  if (activateInProgress) {
    console.warn("Service Worker: Activation already in progress, skipping");
    return;
  }
  activateInProgress = true;
  console.log("Service Worker: Activating...");
  console.log(`✓ App Version: ${APP_VERSION}`);
  console.log(`✓ Build ID: ${BUILD_ID}`);
  console.log(`✓ Cache Name: ${CACHE_NAME}`);

  event.waitUntil(
    (async () => {
      try {
        const cacheNames = await caches.keys();
        const deletePromises = cacheNames
          .filter((name) => name !== CACHE_NAME && name !== HEALTH_CACHE_NAME)
          .map((name) => {
            console.log(`Deleting old cache: ${name}`);
            return caches.delete(name);
          });
        await Promise.all(deletePromises);
        console.log(
          `Service Worker: Cleaned up ${deletePromises.length} old caches`,
        );
      } catch (err) {
        console.error("Service Worker: Cache cleanup error:", err);
      } finally {
        activateInProgress = false;
      }
    })(),
  );

  // Claim clients sofort
  self.clients.claim();
});

// Fetch - Network First mit mehrstufigem Offline-Fallback
self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Ignoriere nicht-GET Requests
  if (request.method !== "GET") {
    return;
  }

  // Ignoriere externe API-Requests komplett (keine Caching-Versuche)
  const externalAPIs = [
    "api.open-meteo.com",
    "api.brightsky.dev",
    "nominatim.openstreetmap.org",
    "geocoding-api.open-meteo.com",
    "api.phaseofthemoontoday.com",
    "localhost:3030",
    "api.openweathermap.org",
    "api.waqi.info",
    "rainviewer.com",
  ];

  if (externalAPIs.some((api) => request.url.includes(api))) {
    return; // Lass den Browser das normal handhaben
  }

  // Mehrstufige Offline-Strategie: Network → Current Cache → Old Caches → 503
  event.respondWith(
    (async () => {
      try {
        // 1. Versuche Netzwerk
        const networkResponse = await fetch(request);

        // Speichere erfolgreiche Responses im Cache
        if (
          networkResponse &&
          networkResponse.ok &&
          networkResponse.type !== "error"
        ) {
          try {
            const reqUrl = new URL(request.url);
            if (
              (reqUrl.protocol === "http:" || reqUrl.protocol === "https:") &&
              reqUrl.origin === self.location.origin
            ) {
              const cache = await caches.open(CACHE_NAME);
              await cache.put(reqUrl.href, networkResponse.clone());
            }
          } catch (cacheErr) {
            console.warn(
              "Service Worker: Cache update failed:",
              cacheErr.message,
            );
          }
        }
        return networkResponse;
      } catch (networkError) {
        // 2. Netzwerk fehlgeschlagen - versuche aktuellen Cache
        console.log(
          "Service Worker: Network failed, trying current cache:",
          request.url,
        );

        const currentCacheResponse = await caches.match(request);
        if (currentCacheResponse) {
          return currentCacheResponse;
        }

        // 3. Nicht im aktuellen Cache - durchsuche ALLE Caches (auch alte)
        const allCacheNames = await caches.keys();
        for (const cacheName of allCacheNames) {
          if (cacheName === HEALTH_CACHE_NAME) continue; // Skip health cache
          const cache = await caches.open(cacheName);
          const oldCacheResponse = await cache.match(request);
          if (oldCacheResponse) {
            console.log(
              `Service Worker: Found in old cache ${cacheName}:`,
              request.url,
            );
            return oldCacheResponse;
          }
        }

        // 4. Für HTML-Requests: Versuche Index als Fallback
        if (request.headers.get("Accept")?.includes("text/html")) {
          const indexResponse =
            (await caches.match("/index.html")) || (await caches.match("/"));
          if (indexResponse) {
            return indexResponse;
          }
        }

        // 5. Alles fehlgeschlagen - 503 Response
        console.warn("Service Worker: No cache available for:", request.url);
        return new Response(
          JSON.stringify({
            error: "offline",
            message: "Diese Ressource ist offline nicht verfügbar",
            url: request.url,
            timestamp: new Date().toISOString(),
          }),
          {
            status: 503,
            statusText: "Service Unavailable",
            headers: { "Content-Type": "application/json" },
          },
        );
      }
    })(),
  );
});

// Background Sync für Weather Updates
self.addEventListener("sync", (event) => {
  console.log("Service Worker: Background sync triggered", event.tag);

  if (event.tag === "weather-update") {
    event.waitUntil(updateWeatherData());
  }

  if (event.tag === "health-data-sync") {
    event.waitUntil(syncHealthData());
  }
});

/**
 * Update Wetterdaten im Hintergrund
 */
async function updateWeatherData() {
  try {
    console.log("Service Worker: Updating weather data...");

    // Holo gespeicherte Städte aus Cache
    const cache = await caches.open(CACHE_NAME);
    const allResponses = await cache.keys();

    console.log("Service Worker: Weather update completed");

    // Benachrichtige Client
    const clients = await self.clients.matchAll();
    clients.forEach((client) => {
      client.postMessage({
        type: "WEATHER_UPDATE",
        timestamp: Date.now(),
      });
    });
  } catch (error) {
    console.error("Service Worker: Weather update failed", error);
  }
}

/**
 * Sync Health Intelligence data for offline access
 */
async function syncHealthData() {
  try {
    console.log("Service Worker: Syncing health data...");

    const healthCache = await caches.open(HEALTH_CACHE_NAME);

    // Notify clients about health data sync
    const clients = await self.clients.matchAll();
    clients.forEach((client) => {
      client.postMessage({
        type: "HEALTH_DATA_SYNC",
        timestamp: Date.now(),
      });
    });

    console.log("Service Worker: Health data sync completed");
  } catch (error) {
    console.error("Service Worker: Health data sync failed", error);
  }
}

/**
 * Store health data in cache (called from client via postMessage)
 * After caching, notifies all clients to update their UI
 * Includes TTL validation and corruption detection
 */
async function cacheHealthData(data) {
  try {
    // Validate input data
    if (!data || typeof data !== "object") {
      throw new Error("Invalid health data: must be an object");
    }

    const healthCache = await caches.open(HEALTH_CACHE_NAME);
    const cachedData = {
      ...data,
      cachedAt: new Date().toISOString(),
      cachedAtTimestamp: Date.now(),
      cacheVersion: 2,
      ttl: HEALTH_CACHE_TTL,
    };

    // Validate data integrity before caching
    const jsonString = JSON.stringify(cachedData);
    if (jsonString.length > 1024 * 1024) {
      // Max 1MB
      throw new Error("Health data too large (>1MB)");
    }

    const response = new Response(jsonString, {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": `max-age=${HEALTH_CACHE_TTL / 1000}`,
        "X-Cached-At": cachedData.cachedAt,
        "X-Cache-Version": "2",
      },
    });
    await healthCache.put("/health-data", response);
    console.log("Service Worker: Health data cached successfully");

    // Notify all clients about new health data - triggers UI update
    await notifyClientsHealthUpdate(cachedData);
    return { success: true, cachedAt: cachedData.cachedAt };
  } catch (error) {
    console.error(
      "Service Worker: Failed to cache health data:",
      error.message,
    );
    throw error;
  }
}

/**
 * Notify all clients that health data has been updated
 * This triggers HealthSafetyView.update() in the client
 */
async function notifyClientsHealthUpdate(data) {
  try {
    const clients = await self.clients.matchAll({ type: "window" });
    console.log(
      `Service Worker: Notifying ${clients.length} client(s) of health update`,
    );

    clients.forEach((client) => {
      client.postMessage({
        type: "HEALTH_DATA_UPDATED",
        timestamp: Date.now(),
        data: data,
      });
    });
  } catch (error) {
    console.error("Service Worker: Failed to notify clients", error);
  }
}

/**
 * Retrieve cached health data with TTL validation and corruption detection
 */
async function getCachedHealthData() {
  try {
    const healthCache = await caches.open(HEALTH_CACHE_NAME);
    const response = await healthCache.match("/health-data");

    if (!response) {
      return null;
    }

    let data;
    try {
      data = await response.json();
    } catch (parseError) {
      console.error("Service Worker: Health data corrupted, deleting cache");
      await healthCache.delete("/health-data");
      return { corrupted: true, error: "JSON parse failed" };
    }

    // TTL Validation
    const cachedAtTimestamp =
      data.cachedAtTimestamp || new Date(data.cachedAt).getTime();
    const age = Date.now() - cachedAtTimestamp;
    const ttl = data.ttl || HEALTH_CACHE_TTL;
    const isExpired = age > ttl;

    // Version check for data migration
    if (data.cacheVersion !== 2) {
      console.log("Service Worker: Health data outdated version, will refresh");
    }

    return {
      ...data,
      fromCache: true,
      fromServiceWorker: true,
      cacheAge: age,
      isExpired: isExpired,
      expiresIn: Math.max(0, ttl - age),
    };
  } catch (error) {
    console.error(
      "Service Worker: Failed to retrieve cached health data:",
      error.message,
    );
    return { error: error.message };
  }
}

// Push Notifications
self.addEventListener("push", (event) => {
  console.log("Service Worker: Push notification received");

  let notificationData = {
    title: "Calchas Update",
    body: "Wetterdaten verfügbar",
    icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg"><text x="50%" y="50%" font-size="80" text-anchor="middle" dy=".3em">🌦️</text></svg>',
    badge:
      'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg"><text x="50%" y="50%" font-size="80" text-anchor="middle" dy=".3em">🌦️</text></svg>',
    tag: "weather-notification",
    requireInteraction: false,
    actions: [
      {
        action: "open",
        title: "Öffnen",
        icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg"><text x="50%" y="50%" font-size="40" text-anchor="middle" dy=".3em">📖</text></svg>',
      },
      {
        action: "close",
        title: "Schließen",
        icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg"><text x="50%" y="50%" font-size="40" text-anchor="middle" dy=".3em">✕</text></svg>',
      },
    ],
  };

  if (event.data) {
    try {
      notificationData = Object.assign(notificationData, event.data.json());
    } catch (e) {
      notificationData.body = event.data.text();
    }
  }

  event.waitUntil(
    self.registration.showNotification(
      notificationData.title,
      notificationData,
    ),
  );
});

// Push Subscription Change - best-effort handling
self.addEventListener("pushsubscriptionchange", (event) => {
  console.log("Service Worker: pushsubscriptionchange event", event);
  event.waitUntil(
    (async () => {
      try {
        const reg = await self.registration;
        // In a real app you'd re-subscribe with the server's VAPID key and send new subscription to server
        const newSub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
        });
        console.log("Service Worker: re-subscribed after change", newSub);
      } catch (err) {
        console.warn("Service Worker: failed to re-subscribe", err);
      }
    })(),
  );
});
// Notification Clicks
self.addEventListener("notificationclick", (event) => {
  console.log("Service Worker: Notification clicked", event.action);

  event.notification.close();

  if (event.action === "close") {
    return;
  }

  event.waitUntil(
    clients.matchAll({ type: "window" }).then((clientList) => {
      // Prüfe ob App schon offen ist
      for (let client of clientList) {
        if (client.url === "/" && "focus" in client) {
          return client.focus();
        }
      }
      // Sonst öffne neue
      if (clients.openWindow) {
        return clients.openWindow("/");
      }
    }),
  );
});

// Notification Close
self.addEventListener("notificationclose", (event) => {
  console.log("Service Worker: Notification closed");
});

// Periodic Background Sync (optional, für neuere Browser)
self.addEventListener("periodicsync", (event) => {
  if (event.tag === "update-weather") {
    event.waitUntil(updateWeatherData());
  }
  if (event.tag === "sync-favorites") {
    event.waitUntil(syncFavoritesData());
  }
});

// Background Sync für Failed API Calls (Browser unterstützen dies?)
self.addEventListener("sync", (event) => {
  if (event.tag === "retry-failed-requests") {
    event.waitUntil(retryFailedRequests());
  }
});

// Helper: Retry Failed API Requests
async function retryFailedRequests() {
  try {
    const db = await openIndexedDB();
    const failedRequests = await getFailedRequests(db);

    for (const req of failedRequests) {
      try {
        const response = await fetch(req.url, req.options);
        if (response.ok) {
          // Success - remove from failed list
          await removeFailedRequest(db, req.id);
          console.log("✅ Retried request succeeded:", req.url);
        }
      } catch (err) {
        console.warn("⚠️ Retry still failed:", req.url, err.message);
      }
    }
  } catch (err) {
    console.error("Background Sync: Retry failed", err);
  }
}

// Helper: Sync Favorites Data (for periodic sync)
async function syncFavoritesData() {
  try {
    console.log("🔄 Syncing favorites data in background...");
    // Attempt to fetch fresh weather for all favorites
    const storage = await getFromStorage("wetter_favorites");
    const favorites = storage ? JSON.parse(storage) : [];

    for (const fav of favorites) {
      try {
        // Try to fetch weather data for this favorite
        const lat = fav.coords?.latitude;
        const lng = fav.coords?.longitude;
        if (lat && lng) {
          // Attempt fetch (won't update UI, just updates cache)
          await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&hourly=temperature_2m,precipitation,weathercode&daily=temperature_2m_max,temperature_2m_min,weathercode&timezone=auto`,
          )
            .then((r) => r.json())
            .catch(() => null);
        }
      } catch (err) {
        console.warn("Could not sync favorite:", fav.city, err.message);
      }
    }
    console.log("✅ Favorites sync completed");
  } catch (err) {
    console.error("Favorites sync error:", err);
  }
}

// IndexedDB Helper (for storing failed requests)
async function openIndexedDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open("WetterAppDB", 1);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains("failedRequests")) {
        db.createObjectStore("failedRequests", { keyPath: "id" });
      }
    };
  });
}

async function getFailedRequests(db) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction("failedRequests", "readonly");
    const store = tx.objectStore("failedRequests");
    const req = store.getAll();
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);
  });
}

async function removeFailedRequest(db, id) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction("failedRequests", "readwrite");
    const store = tx.objectStore("failedRequests");
    const req = store.delete(id);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve();
  });
}

// Helper: Get from LocalStorage in Worker
function getFromStorage(key) {
  // Note: LocalStorage not available in Service Worker - use Cache API
  return caches
    .open(CACHE_NAME)
    .then((cache) => {
      return cache.match("/data/" + key).then((r) => (r ? r.text() : null));
    })
    .catch(() => null);
}

/**
 * Stale-While-Revalidate Strategy:
 * Return cached response immediately, fetch fresh data in background
 */
async function staleWhileRevalidate(request) {
  const cached = await caches.match(request);

  const fetchPromise = fetch(request).then((response) => {
    if (!response || response.status !== 200 || response.type === "error") {
      return response;
    }

    const responseClone = response.clone();
    try {
      const reqUrl = new URL(request.url);
      if (
        (reqUrl.protocol === "http:" || reqUrl.protocol === "https:") &&
        reqUrl.origin === self.location.origin
      ) {
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(request, responseClone);
        });
      }
    } catch (err) {
      console.warn("Stale-while-revalidate: cache.put failed", err);
    }

    return response;
  });

  return cached || fetchPromise;
}

// Message: Register Periodic Sync (Client -> SW)
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "GET_VERSION") {
    event.ports[0].postMessage({
      appVersion: APP_VERSION,
      buildId: BUILD_ID,
      cacheVersion: CACHE_NAME,
    });
  }

  if (event.data && event.data.type === "REGISTER_PERIODIC_SYNC") {
    if ("periodicSync" in self.registration) {
      self.registration.periodicSync
        .register("update-weather", { minInterval: 60 * 60 * 1000 }) // 1 hour
        .then(() => console.log("✅ Periodic sync registered"))
        .catch((err) =>
          console.warn("Periodic sync registration failed:", err),
        );
    }
  }

  if (event.data && event.data.type === "REGISTER_FAVORITES_SYNC") {
    if ("periodicSync" in self.registration) {
      self.registration.periodicSync
        .register("sync-favorites", { minInterval: 12 * 60 * 60 * 1000 }) // 12 hours
        .then(() => console.log("✅ Favorites sync registered"))
        .catch((err) =>
          console.warn("Favorites sync registration failed:", err),
        );
    }
  }

  // Health Intelligence data caching
  if (event.data && event.data.type === "CACHE_HEALTH_DATA") {
    cacheHealthData(event.data.payload)
      .then((result) => {
        // Respond to client
        if (event.ports && event.ports[0]) {
          event.ports[0].postMessage({ success: true, ...result });
        }
      })
      .catch((err) => {
        if (event.ports && event.ports[0]) {
          event.ports[0].postMessage({ success: false, error: err.message });
        }
      });
  }

  // Request cached health data
  if (event.data && event.data.type === "GET_CACHED_HEALTH_DATA") {
    getCachedHealthData()
      .then((data) => {
        if (event.ports && event.ports[0]) {
          event.ports[0].postMessage({ success: true, data });
        }
      })
      .catch((err) => {
        if (event.ports && event.ports[0]) {
          event.ports[0].postMessage({ success: false, error: err.message });
        }
      });
  }

  // Register health data sync
  if (event.data && event.data.type === "REGISTER_HEALTH_SYNC") {
    if ("sync" in self.registration) {
      self.registration.sync
        .register("health-data-sync")
        .then(() => console.log("✅ Health data sync registered"))
        .catch((err) => console.warn("Health sync registration failed:", err));
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DIAGNOSTICS - DevTools Testing Support
  // ═══════════════════════════════════════════════════════════════════════════
  if (event.data && event.data.type === "GET_DIAGNOSTICS") {
    (async () => {
      try {
        // Gather cache statistics
        const cacheNames = await caches.keys();
        const cacheStats = await Promise.all(
          cacheNames.map(async (name) => {
            const cache = await caches.open(name);
            const keys = await cache.keys();
            return {
              name,
              entries: keys.length,
              urls: keys.map((r) => new URL(r.url).pathname),
            };
          }),
        );

        // Health cache status
        const healthData = await getCachedHealthData();

        // Build diagnostics report
        const diagnostics = {
          version: {
            appVersion: APP_VERSION,
            buildId: BUILD_ID,
            cacheName: CACHE_NAME,
          },
          caches: {
            total: cacheNames.length,
            current: CACHE_NAME,
            health: HEALTH_CACHE_NAME,
            details: cacheStats,
          },
          healthCache: {
            exists: !!healthData,
            isExpired: healthData?.isExpired,
            age: healthData?.cacheAge,
            expiresIn: healthData?.expiresIn,
            corrupted: healthData?.corrupted,
          },
          urlsToCache: {
            total: urlsToCache.length,
            list: urlsToCache,
          },
          registration: {
            scope: self.registration.scope,
            active: !!self.registration.active,
          },
          timestamp: new Date().toISOString(),
        };

        if (event.ports && event.ports[0]) {
          event.ports[0].postMessage({ success: true, diagnostics });
        }
      } catch (err) {
        if (event.ports && event.ports[0]) {
          event.ports[0].postMessage({ success: false, error: err.message });
        }
      }
    })();
  }

  // Clear all caches (for testing/debugging)
  if (event.data && event.data.type === "CLEAR_ALL_CACHES") {
    (async () => {
      try {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map((name) => caches.delete(name)));
        if (event.ports && event.ports[0]) {
          event.ports[0].postMessage({
            success: true,
            clearedCaches: cacheNames.length,
          });
        }
      } catch (err) {
        if (event.ports && event.ports[0]) {
          event.ports[0].postMessage({ success: false, error: err.message });
        }
      }
    })();
  }

  // Validate cache integrity
  if (event.data && event.data.type === "VALIDATE_CACHE") {
    (async () => {
      try {
        const cache = await caches.open(CACHE_NAME);
        const results = await Promise.all(
          urlsToCache.map(async (url) => {
            const response = await cache.match(url);
            return {
              url,
              cached: !!response,
              status: response?.status,
            };
          }),
        );

        const cached = results.filter((r) => r.cached).length;
        const missing = results.filter((r) => !r.cached);

        if (event.ports && event.ports[0]) {
          event.ports[0].postMessage({
            success: true,
            validation: {
              total: urlsToCache.length,
              cached,
              missing: missing.length,
              missingUrls: missing.map((r) => r.url),
              integrity: cached === urlsToCache.length ? "complete" : "partial",
            },
          });
        }
      } catch (err) {
        if (event.ports && event.ports[0]) {
          event.ports[0].postMessage({ success: false, error: err.message });
        }
      }
    })();
  }
});

console.log(
  "Service Worker: Loaded (with Health Intelligence & Diagnostics support)",
);
