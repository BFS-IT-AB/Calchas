/**
 * tests/analytics.test.js
 * Unit tests for Analytics Module
 */

describe('Analytics', () => {
  let analytics;

  beforeEach(() => {
    localStorage.clear();
    if (typeof Analytics !== 'undefined') {
      analytics = new Analytics();
    }
  });

  test('should create analytics instance', () => {
    expect(typeof Analytics).toBe('function');
  });

  test('should enable/disable analytics', () => {
    if (!analytics) return;
    
    analytics.disable();
    expect(analytics.enabled).toBe(false);
    
    analytics.enable();
    expect(analytics.enabled).toBe(true);
  });

  test('should log events', () => {
    if (!analytics) return;
    
    analytics.enable();
    analytics.logEvent('test-event', { data: 'value' });
    
    const events = analytics.getEvents();
    expect(events.length).toBeGreaterThan(0);
    expect(events[events.length - 1].eventName).toBe('test-event');
  });

  test('should log search events', () => {
    if (!analytics) return;
    
    analytics.enable();
    analytics.logSearch('Berlin', 5, 120);
    
    const searchEvents = analytics.getEventsByName('search');
    expect(searchEvents.length).toBeGreaterThan(0);
  });

  test('should log favorite actions', () => {
    if (!analytics) return;
    
    analytics.enable();
    analytics.logFavorite('added', 'Berlin');
    
    const events = analytics.getEventsByName('favorite-added');
    expect(events.length).toBeGreaterThan(0);
  });

  test('should get analytics summary', () => {
    if (!analytics) return;
    
    analytics.enable();
    analytics.logSearch('Berlin', 5, 100);
    analytics.logFavorite('added', 'Munich');
    
    const summary = analytics.getSummary();
    expect(summary).toHaveProperty('totalEvents');
    expect(summary).toHaveProperty('eventCounts');
    expect(summary.totalEvents).toBeGreaterThan(0);
  });

  test('should not log events when disabled', () => {
    if (!analytics) return;
    
    analytics.disable();
    const initialCount = analytics.getEvents().length;
    
    analytics.logEvent('test', {});
    
    expect(analytics.getEvents().length).toBe(initialCount);
  });

  test('should export analytics data as JSON', () => {
    if (!analytics) return;
    
    analytics.enable();
    analytics.logEvent('test', {});
    
    const json = analytics.exportJSON();
    expect(typeof json).toBe('string');
    
    const parsed = JSON.parse(json);
    expect(parsed).toHaveProperty('sessionId');
    expect(parsed).toHaveProperty('events');
    expect(parsed).toHaveProperty('exportDate');
  });

  test('should clear analytics data', () => {
    if (!analytics) return;
    
    analytics.enable();
    analytics.logEvent('test', {});
    expect(analytics.getEvents().length).toBeGreaterThan(0);
    
    analytics.clear();
    expect(analytics.getEvents().length).toBe(0);
  });
});
