/**
 * History Cache Service
 *
 * Centralized caching for historical weather data with:
 * - LocalStorage persistence
 * - 30-minute TTL
 * - Metric-specific cache keys
 * - Multi-source data tracking
 */

class HistoryCacheService {
  constructor() {
    this.TTL = 30 * 60 * 1000; // 30 minutes in milliseconds
    this.storagePrefix = "wetter_history_cache_";
    this.metadataKey = "wetter_history_cache_metadata";
  }

  /**
   * Generate cache key for historical data request
   * @param {string} metric - Metric name (temperature, precipitation, wind, humidity, sunshine)
   * @param {string} startDate - Start date (YYYY-MM-DD)
   * @param {string} endDate - End date (YYYY-MM-DD)
   * @param {number} lat - Latitude
   * @param {number} lon - Longitude
   * @param {string} granularity - Data granularity (hourly, daily)
   * @returns {string} Cache key
   */
  generateKey(metric, startDate, endDate, lat, lon, granularity = "daily") {
    return `${metric}_${granularity}_${startDate}_${endDate}_${lat.toFixed(4)}_${lon.toFixed(4)}`;
  }

  /**
   * Get cached data if valid (not expired)
   * @param {string} key - Cache key
   * @returns {object|null} Cached data or null if expired/missing
   */
  get(key) {
    try {
      const fullKey = this.storagePrefix + key;
      const cached = localStorage.getItem(fullKey);

      if (!cached) {
        return null;
      }

      const parsed = JSON.parse(cached);
      const now = Date.now();

      // Check if expired
      if (now > parsed.expiresAt) {
        console.log(`[HistoryCache] Cache expired for ${key}`);
        this.delete(key);
        return null;
      }

      console.log(
        `[HistoryCache] Cache hit for ${key} (age: ${Math.round((now - parsed.cachedAt) / 1000)}s)`,
      );
      return parsed.data;
    } catch (error) {
      console.warn(`[HistoryCache] Error reading cache for ${key}:`, error);
      return null;
    }
  }

  /**
   * Store data in cache with TTL
   * @param {string} key - Cache key
   * @param {any} data - Data to cache
   * @param {number} ttl - Optional custom TTL in milliseconds (default: 30 min)
   */
  set(key, data, ttl = this.TTL) {
    try {
      const fullKey = this.storagePrefix + key;
      const now = Date.now();

      const cacheEntry = {
        data,
        cachedAt: now,
        expiresAt: now + ttl,
        key,
      };

      localStorage.setItem(fullKey, JSON.stringify(cacheEntry));
      this._updateMetadata(key, now, now + ttl);

      console.log(
        `[HistoryCache] Cached ${key} (TTL: ${Math.round(ttl / 1000)}s)`,
      );
    } catch (error) {
      console.warn(`[HistoryCache] Error writing cache for ${key}:`, error);
      // If quota exceeded, try to clear old entries
      if (error.name === "QuotaExceededError") {
        this.clearExpired();
        // Try again
        try {
          const fullKey = this.storagePrefix + key;
          const now = Date.now();
          const cacheEntry = {
            data,
            cachedAt: now,
            expiresAt: now + ttl,
            key,
          };
          localStorage.setItem(fullKey, JSON.stringify(cacheEntry));
        } catch (retryError) {
          console.error(
            "[HistoryCache] Failed to cache after cleanup:",
            retryError,
          );
        }
      }
    }
  }

  /**
   * Delete specific cache entry
   * @param {string} key - Cache key
   */
  delete(key) {
    try {
      const fullKey = this.storagePrefix + key;
      localStorage.removeItem(fullKey);
      this._removeFromMetadata(key);
      console.log(`[HistoryCache] Deleted cache entry: ${key}`);
    } catch (error) {
      console.warn(`[HistoryCache] Error deleting cache for ${key}:`, error);
    }
  }

  /**
   * Clear all expired cache entries
   * @returns {number} Number of entries cleared
   */
  clearExpired() {
    try {
      const metadata = this._getMetadata();
      const now = Date.now();
      let cleared = 0;

      Object.entries(metadata).forEach(([key, entry]) => {
        if (now > entry.expiresAt) {
          this.delete(key);
          cleared++;
        }
      });

      console.log(`[HistoryCache] Cleared ${cleared} expired entries`);
      return cleared;
    } catch (error) {
      console.warn("[HistoryCache] Error clearing expired entries:", error);
      return 0;
    }
  }

  /**
   * Clear all cache entries
   */
  clearAll() {
    try {
      const keys = Object.keys(localStorage);
      let cleared = 0;

      keys.forEach((key) => {
        if (key.startsWith(this.storagePrefix)) {
          localStorage.removeItem(key);
          cleared++;
        }
      });

      localStorage.removeItem(this.metadataKey);
      console.log(`[HistoryCache] Cleared all cache (${cleared} entries)`);
    } catch (error) {
      console.warn("[HistoryCache] Error clearing all cache:", error);
    }
  }

  /**
   * Get cache statistics
   * @returns {object} Cache stats
   */
  getStats() {
    try {
      const metadata = this._getMetadata();
      const now = Date.now();
      let total = 0;
      let expired = 0;
      let valid = 0;
      let totalSize = 0;

      Object.entries(metadata).forEach(([key, entry]) => {
        total++;
        if (now > entry.expiresAt) {
          expired++;
        } else {
          valid++;
        }

        // Estimate size
        const fullKey = this.storagePrefix + key;
        const item = localStorage.getItem(fullKey);
        if (item) {
          totalSize += item.length;
        }
      });

      return {
        total,
        valid,
        expired,
        sizeKB: Math.round(totalSize / 1024),
        ttlMinutes: this.TTL / 60000,
      };
    } catch (error) {
      console.warn("[HistoryCache] Error getting stats:", error);
      return {
        total: 0,
        valid: 0,
        expired: 0,
        sizeKB: 0,
        ttlMinutes: this.TTL / 60000,
      };
    }
  }

  /**
   * Update metadata index
   * @private
   */
  _updateMetadata(key, cachedAt, expiresAt) {
    try {
      const metadata = this._getMetadata();
      metadata[key] = { cachedAt, expiresAt };
      localStorage.setItem(this.metadataKey, JSON.stringify(metadata));
    } catch (error) {
      console.warn("[HistoryCache] Error updating metadata:", error);
    }
  }

  /**
   * Remove key from metadata
   * @private
   */
  _removeFromMetadata(key) {
    try {
      const metadata = this._getMetadata();
      delete metadata[key];
      localStorage.setItem(this.metadataKey, JSON.stringify(metadata));
    } catch (error) {
      console.warn("[HistoryCache] Error removing from metadata:", error);
    }
  }

  /**
   * Get metadata index
   * @private
   */
  _getMetadata() {
    try {
      const metadata = localStorage.getItem(this.metadataKey);
      return metadata ? JSON.parse(metadata) : {};
    } catch (error) {
      console.warn("[HistoryCache] Error reading metadata:", error);
      return {};
    }
  }
}

// Export singleton instance
const historyCacheService = new HistoryCacheService();

// Auto-cleanup expired entries on load
historyCacheService.clearExpired();

export default historyCacheService;
export { HistoryCacheService };
