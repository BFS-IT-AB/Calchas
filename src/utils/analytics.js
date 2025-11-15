/**
 * src/utils/analytics.js
 * Lightweight Analytics & Data Collection Module
 * Opt-in analytics logging for searches, favorites, API calls
 */

class Analytics {
  constructor() {
    this.enabled = this._isAnalyticsEnabled();
    this.sessionId = this._generateSessionId();
    this.events = [];
    this.maxEvents = 1000; // Max events to keep in memory
  }

  /**
   * Check if analytics is enabled in localStorage
   * @private
   * @returns {boolean}
   */
  _isAnalyticsEnabled() {
    return localStorage.getItem('analytics-enabled') === 'true';
  }

  /**
   * Generate a unique session ID
   * @private
   * @returns {string}
   */
  _generateSessionId() {
    let sessionId = sessionStorage.getItem('session-id');
    if (!sessionId) {
      sessionId = `session-${Date.now()}-${Math.random().toString(36).substring(7)}`;
      sessionStorage.setItem('session-id', sessionId);
    }
    return sessionId;
  }

  /**
   * Enable analytics
   */
  enable() {
    localStorage.setItem('analytics-enabled', 'true');
    this.enabled = true;
    console.log('📊 Analytics enabled');
  }

  /**
   * Disable analytics
   */
  disable() {
    localStorage.setItem('analytics-enabled', 'false');
    this.enabled = false;
    console.log('📊 Analytics disabled');
  }

  /**
   * Log a custom event
   * @param {string} eventName - Event name (e.g., 'search', 'favorite-added', 'api-call')
   * @param {object} eventData - Event metadata
   */
  logEvent(eventName, eventData = {}) {
    if (!this.enabled) return;

    const event = {
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId,
      eventName,
      eventData,
      userAgent: navigator.userAgent,
    };

    this.events.push(event);

    // Keep array size manageable
    if (this.events.length > this.maxEvents) {
      this.events.shift();
    }

    // Save to localStorage (last 100 events)
    this._saveToLocalStorage();

    console.log(`📊 Event logged: ${eventName}`, eventData);
  }

  /**
   * Log a search event
   * @param {string} query - Search query
   * @param {number} resultCount - Number of results
   * @param {number} durationMs - Duration in milliseconds
   */
  logSearch(query, resultCount, durationMs) {
    this.logEvent('search', {
      query,
      resultCount,
      durationMs,
    });
  }

  /**
   * Log a favorite action
   * @param {string} action - 'added' or 'removed'
   * @param {string} locationName - Location name
   */
  logFavorite(action, locationName) {
    this.logEvent(`favorite-${action}`, {
      locationName,
    });
  }

  /**
   * Log an API call
   * @param {string} apiName - API name (e.g., 'open-meteo', 'brightsky')
   * @param {string} endpoint - API endpoint
   * @param {number} statusCode - HTTP status code
   * @param {number} durationMs - Duration in milliseconds
   * @param {boolean} fromCache - Was result from cache?
   */
  logApiCall(apiName, endpoint, statusCode, durationMs, fromCache = false) {
    this.logEvent('api-call', {
      apiName,
      endpoint,
      statusCode,
      durationMs,
      fromCache,
    });
  }

  /**
   * Log an error
   * @param {string} errorType - Error type (e.g., 'network', 'validation', 'api')
   * @param {string} errorMessage - Error message
   * @param {string} context - Additional context (e.g., 'search', 'favorite')
   */
  logError(errorType, errorMessage, context = '') {
    this.logEvent('error', {
      errorType,
      errorMessage,
      context,
    });
  }

  /**
   * Save events to localStorage
   * @private
   */
  _saveToLocalStorage() {
    try {
      const recentEvents = this.events.slice(-100); // Keep last 100
      localStorage.setItem('analytics-events', JSON.stringify(recentEvents));
    } catch (err) {
      console.warn('Failed to save analytics to localStorage:', err);
    }
  }

  /**
   * Get all logged events
   * @returns {Array}
   */
  getEvents() {
    return this.events;
  }

  /**
   * Get events by name
   * @param {string} eventName - Event name to filter by
   * @returns {Array}
   */
  getEventsByName(eventName) {
    return this.events.filter(e => e.eventName === eventName);
  }

  /**
   * Get analytics summary (stats)
   * @returns {object}
   */
  getSummary() {
    const summary = {
      totalEvents: this.events.length,
      sessionId: this.sessionId,
      eventCounts: {},
      topSearches: {},
      apiCallCount: {},
    };

    for (const event of this.events) {
      // Count events by name
      summary.eventCounts[event.eventName] = (summary.eventCounts[event.eventName] || 0) + 1;

      // Track top searches
      if (event.eventName === 'search') {
        const query = event.eventData.query;
        summary.topSearches[query] = (summary.topSearches[query] || 0) + 1;
      }

      // Track API calls by source
      if (event.eventName === 'api-call') {
        const api = event.eventData.apiName;
        summary.apiCallCount[api] = (summary.apiCallCount[api] || 0) + 1;
      }
    }

    return summary;
  }

  /**
   * Export analytics data as JSON
   * @returns {string}
   */
  exportJSON() {
    return JSON.stringify(
      {
        sessionId: this.sessionId,
        exportDate: new Date().toISOString(),
        events: this.events,
      },
      null,
      2
    );
  }

  /**
   * Clear all analytics data
   */
  clear() {
    this.events = [];
    localStorage.removeItem('analytics-events');
    console.log('📊 Analytics data cleared');
  }
}

// Global singleton
window.analytics = new Analytics();

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Analytics;
}
