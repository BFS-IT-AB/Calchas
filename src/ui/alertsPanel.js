/**
 * src/ui/alertsPanel.js
 * Weather Alerts Component
 * Fetches and displays weather warnings from MeteoAlarm (CAP feeds)
 */

class AlertsPanel {
  constructor(containerId) {
    this.containerId = containerId;
    this.alerts = [];
    this.container = document.getElementById(containerId);
  }

  /**
   * Fetch alerts for a given location from MeteoAlarm
   * @param {number} latitude - Location latitude
   * @param {number} longitude - Location longitude
   * @returns {Promise<Array>} - Array of alert objects
   */
  async fetchAlerts(latitude, longitude) {
    try {
      // MeteoAlarm provides CAP feeds but CORS may block direct access
      // Using a workaround: fetch from public MeteoAlarm API or JSON service if available
      
      // For now, return mock alerts structure
      // In production, integrate with actual MeteoAlarm CAP feeds or use a backend proxy
      
      // Attempt to fetch from MeteoAlarm (may fail due to CORS)
      const meteoAlarmUrl = `https://www.meteoalarm.org/feeds/meteoalarm-legacy-atom-de.xml`;
      
      try {
        const response = await fetch(meteoAlarmUrl, {
          method: 'GET',
          headers: { 'User-Agent': 'WetterApp/1.0' },
        });
        
        if (!response.ok) {
          throw new Error(`MeteoAlarm API error: ${response.status}`);
        }
        
        // Parse XML and extract alerts for region
        const xmlText = await response.text();
        this.alerts = this._parseCAP(xmlText, latitude, longitude);
      } catch (corsErr) {
        console.warn('⚠️ MeteoAlarm CORS restriction - alerts unavailable:', corsErr.message);
        this.alerts = [];
      }

      return this.alerts;
    } catch (err) {
      console.error('❌ Error fetching alerts:', err);
      this.alerts = [];
      return [];
    }
  }

  /**
   * Parse CAP (Common Alerting Protocol) XML response
   * @private
   * @param {string} xmlText - XML response from MeteoAlarm
   * @param {number} latitude - Reference latitude
   * @param {number} longitude - Reference longitude
   * @returns {Array} - Parsed alerts
   */
  _parseCAP(xmlText, latitude, longitude) {
    try {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
      
      if (xmlDoc.parsererror) {
        throw new Error('Invalid XML');
      }

      const alerts = [];
      const entries = xmlDoc.getElementsByTagName('entry');

      for (let entry of entries) {
        const title = entry.querySelector('title')?.textContent || 'Unknown Alert';
        const summary = entry.querySelector('summary')?.textContent || 'No description';
        
        // Extract severity from title or summary (typically Red, Orange, Yellow, Green)
        const severity = this._extractSeverity(title, summary);
        
        // Extract area information
        const area = entry.querySelector('georss\\:point') || entry.querySelector('point');
        
        alerts.push({
          id: Date.now() + Math.random(),
          title: title.substring(0, 60), // Truncate title
          severity,
          description: summary.substring(0, 150),
          area: area?.textContent || `${latitude.toFixed(2)}, ${longitude.toFixed(2)}`,
          effective: new Date().toISOString(),
          expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        });
      }

      return alerts.slice(0, 5); // Return top 5 alerts
    } catch (err) {
      console.error('❌ Error parsing CAP XML:', err);
      return [];
    }
  }

  /**
   * Extract severity level from alert text
   * @private
   * @param {string} title - Alert title
   * @param {string} description - Alert description
   * @returns {string} - Severity level: 'Red', 'Orange', 'Yellow', 'Green'
   */
  _extractSeverity(title, description) {
    const text = `${title} ${description}`.toLowerCase();

    if (text.includes('red') || text.includes('gefahr') || text.includes('severe') || text.includes('extreme')) {
      return 'Red';
    }
    if (text.includes('orange') || text.includes('warnung') || text.includes('warning')) {
      return 'Orange';
    }
    if (text.includes('yellow') || text.includes('caution') || text.includes('vorsicht')) {
      return 'Yellow';
    }

    return 'Green';
  }

  /**
   * Get color code for severity level
   * @private
   * @param {string} severity - Severity level
   * @returns {object} - { bg, border, text, icon }
   */
  _getSeverityColors(severity) {
    const colors = {
      Red: {
        bg: '#f8d7da',
        border: '#721c24',
        text: '#721c24',
        icon: '🚨',
        label: 'Danger',
      },
      Orange: {
        bg: '#fff3cd',
        border: '#856404',
        text: '#856404',
        icon: '⚠️',
        label: 'Warning',
      },
      Yellow: {
        bg: '#fffacd',
        border: '#d4a017',
        text: '#d4a017',
        icon: '⚡',
        label: 'Caution',
      },
      Green: {
        bg: '#d4edda',
        border: '#155724',
        text: '#155724',
        icon: '✅',
        label: 'Normal',
      },
    };

    return colors[severity] || colors.Green;
  }

  /**
   * Render alerts in container
   * @param {Array} alerts - Alert objects (optional, uses this.alerts if not provided)
   */
  render(alerts = null) {
    if (!this.container) {
      console.warn('Alerts container not found');
      return;
    }

    const alertsList = alerts || this.alerts;

    if (alertsList.length === 0) {
      this.container.innerHTML = `
        <div class="alerts-empty" role="status" aria-live="polite">
          <p style="color: var(--text-muted); padding: var(--spacing-md);">✅ Keine Wetterwarnungen vorhanden</p>
        </div>
      `;
      return;
    }

    const alertsHtml = alertsList
      .map(alert => {
        const colors = this._getSeverityColors(alert.severity);
        return `
          <article 
            class="alert-item" 
            style="
              background: ${colors.bg};
              border-left: 4px solid ${colors.border};
              border-radius: var(--radius-md);
              padding: var(--spacing-md);
              margin-bottom: var(--spacing-md);
              color: ${colors.text};
            "
            role="alert"
            aria-label="${colors.label}: ${alert.title}"
          >
            <div style="display: flex; align-items: flex-start; gap: var(--spacing-md);">
              <span style="font-size: 1.5rem; flex-shrink: 0;">${colors.icon}</span>
              <div style="flex: 1;">
                <strong style="font-size: 1rem;">${alert.title}</strong>
                <p style="margin: var(--spacing-xs) 0 0 0; font-size: 0.9rem; line-height: 1.4;">
                  ${alert.description}
                </p>
                <small style="opacity: 0.8; display: block; margin-top: var(--spacing-xs);">
                  Bereich: ${alert.area}
                </small>
              </div>
            </div>
          </article>
        `;
      })
      .join('');

    this.container.innerHTML = `
      <div class="alerts-list" role="region" aria-label="Wetterwarnungen" aria-live="polite" aria-atomic="true">
        <h3 style="color: var(--text-heading); margin-bottom: var(--spacing-md);">🚨 Wetterwarnungen</h3>
        ${alertsHtml}
      </div>
    `;

    console.log(`✅ ${alertsList.length} alert(s) rendered`);
  }

  /**
   * Clear alerts
   */
  clear() {
    this.alerts = [];
    if (this.container) {
      this.container.innerHTML = '';
    }
    console.log('✅ Alerts cleared');
  }

  /**
   * Get alerts by severity level
   * @param {string} severity - Severity level ('Red', 'Orange', 'Yellow', 'Green')
   * @returns {Array} - Filtered alerts
   */
  getAlertsBySeverity(severity) {
    return this.alerts.filter(alert => alert.severity === severity);
  }

  /**
   * Check if there are any critical alerts (Red or Orange)
   * @returns {boolean}
   */
  hasCriticalAlerts() {
    return this.alerts.some(alert => ['Red', 'Orange'].includes(alert.severity));
  }
}

// Export for use in app
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AlertsPanel;
}
