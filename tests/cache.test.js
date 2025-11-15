/**
 * tests/cache.test.js
 * Unit tests for Cache Manager
 */

describe('CacheManager', () => {
  let cache;

  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    sessionStorage.clear();
    // Import cache (assuming it's globally available)
    if (typeof WeatherCache === 'undefined') {
      console.warn('WeatherCache not available in test environment');
    }
  });

  test('should create cache instance', () => {
    expect(typeof WeatherCache).toBe('function');
  });

  test('should set and get cache items', () => {
    const cache = new WeatherCache();
    const data = { temp: 20, humidity: 65 };
    
    cache.set('berlin', data, 300);
    const retrieved = cache.get('berlin');
    
    expect(retrieved).toEqual(data);
  });

  test('should return null for expired cache', (done) => {
    const cache = new WeatherCache();
    const data = { temp: 20 };
    
    cache.set('berlin', data, 100); // 100ms TTL
    
    setTimeout(() => {
      const retrieved = cache.get('berlin');
      expect(retrieved).toBeNull();
      done();
    }, 150);
  });

  test('should check if key exists', () => {
    const cache = new WeatherCache();
    cache.set('berlin', { temp: 20 }, 300);
    
    expect(cache.has('berlin')).toBe(true);
    expect(cache.has('nonexistent')).toBe(false);
  });

  test('should delete cache item', () => {
    const cache = new WeatherCache();
    cache.set('berlin', { temp: 20 }, 300);
    
    expect(cache.has('berlin')).toBe(true);
    cache.delete('berlin');
    expect(cache.has('berlin')).toBe(false);
  });

  test('should clear all cache', () => {
    const cache = new WeatherCache();
    cache.set('berlin', { temp: 20 }, 300);
    cache.set('munich', { temp: 25 }, 300);
    
    cache.clear();
    
    expect(cache.has('berlin')).toBe(false);
    expect(cache.has('munich')).toBe(false);
  });
});
