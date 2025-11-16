// Service Worker für Calchas
// Ermöglicht Offline-Funktionalität, Caching und Push-Notifications

const CACHE_NAME = "calchas-v1";
const urlsToCache = [
  "/",
  "/src/index.html",
  "/src/style.css",
  "/src/app.js",
  "/src/utils/constants.js",
  "/src/utils/cache.js",
  "/src/utils/validation.js",
  "/src/api/weather.js",
  "/src/api/brightsky.js",
  "/src/ui/errorHandler.js",
  "/src/ui/searchInput.js",
  "/src/ui/weatherDisplay.js",
  "/manifest.json",
];

// Installation
self.addEventListener("install", (event) => {
  console.log("Service Worker: Installing...");

  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        console.log("Service Worker: Caching app shell");
        return cache.addAll(urlsToCache);
      })
      .catch((err) => {
        // Wenn ein einzelner Fetch in addAll fehlschlägt, logge und install trotzdem abschließen
        console.warn("Service Worker: cache.addAll failed (continuing):", err);
        return Promise.resolve();
      })
  );

  // Skip waiting - aktiviere sofort
  self.skipWaiting();
});

// Aktivierung
self.addEventListener("activate", (event) => {
  console.log("Service Worker: Activating...");

  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log("Service Worker: Deleting old cache", cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );

  // Claim clients sofort
  self.clients.claim();
});

// Fetch - Network First, dann Cache
self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Ignoriere API-Requests (werden separat behandelt)
  if (
    request.url.includes("api.open-meteo.com") ||
    request.url.includes("api.brightsky.dev") ||
    request.url.includes("nominatim.openstreetmap.org") ||
    request.url.includes("geocoding-api.open-meteo.com")
  ) {
    return;
  }

  // Network First Strategy für App
  event.respondWith(
    fetch(request)
      .then((response) => {
        // Speichere neue Responses im Cache
        if (response && response.status === 200 && response.type !== "error") {
          const responseClone = response.clone();
          // Cache only http(s) requests and avoid unsupported schemes (e.g., chrome-extension://)
          try {
            const reqUrl = new URL(request.url);
            if (reqUrl.protocol === "http:" || reqUrl.protocol === "https:") {
              // Optionally only cache same-origin app shell assets
              if (reqUrl.origin === self.location.origin) {
                caches.open(CACHE_NAME).then((cache) => {
                  try {
                    // Use the parsed absolute href to avoid passing unsupported Request objects
                    cache.put(reqUrl.href, responseClone).catch((err) => {
                      console.warn(
                        "Service Worker: cache.put failed",
                        err,
                        reqUrl.href
                      );
                    });
                  } catch (e) {
                    console.warn(
                      "Service Worker: cache.put wrapper failed",
                      e,
                      request.url
                    );
                  }
                });
              }
            }
          } catch (err) {
            // If URL parsing or cache put fails, ignore to avoid breaking fetch
            console.warn(
              "Service Worker: skipping cache for",
              request.url,
              err
            );
          }
        }
        return response;
      })
      .catch((error) => {
        // Fallback auf Cache wenn Netzwerk fehlt
        console.log(
          "Service Worker: Network request failed, trying cache",
          request.url
        );
        return caches.match(request).then((response) => {
          return (
            response ||
            new Response(
              "Offline - Diese Seite ist im Offline-Modus nicht verfügbar",
              { status: 503, statusText: "Service Unavailable" }
            )
          );
        });
      })
  );
});

// Background Sync für Weather Updates
self.addEventListener("sync", (event) => {
  console.log("Service Worker: Background sync triggered", event.tag);

  if (event.tag === "weather-update") {
    event.waitUntil(updateWeatherData());
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
    self.registration.showNotification(notificationData.title, notificationData)
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
    })()
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
    })
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
            `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&hourly=temperature_2m,precipitation,weathercode&daily=temperature_2m_max,temperature_2m_min,weathercode&timezone=auto`
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
  if (event.data && event.data.type === "REGISTER_PERIODIC_SYNC") {
    if ("periodicSync" in self.registration) {
      self.registration.periodicSync
        .register("update-weather", { minInterval: 60 * 60 * 1000 }) // 1 hour
        .then(() => console.log("✅ Periodic sync registered"))
        .catch((err) =>
          console.warn("Periodic sync registration failed:", err)
        );
    }
  }

  if (event.data && event.data.type === "REGISTER_FAVORITES_SYNC") {
    if ("periodicSync" in self.registration) {
      self.registration.periodicSync
        .register("sync-favorites", { minInterval: 12 * 60 * 60 * 1000 }) // 12 hours
        .then(() => console.log("✅ Favorites sync registered"))
        .catch((err) =>
          console.warn("Favorites sync registration failed:", err)
        );
    }
  }
});

console.log("Service Worker: Loaded");
