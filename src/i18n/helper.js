// src/i18n/helper.js - Translation helper function

/**
 * Translation helper - loads translation key from current language
 * @param {string} key - Translation key (dot-notation, e.g., 'weather.current')
 * @param {object} params - Optional parameters for interpolation (e.g., { name: 'Berlin' })
 * @returns {string} - Translated string
 */
function t(key, params = {}) {
  const lang = localStorage.getItem('app-language') || 'de';
  const translations = window.translations?.[lang] || {};
  
  let value = translations;
  for (const part of key.split('.')) {
    value = value?.[part];
  }
  
  if (!value) {
    console.warn(`Missing translation key: ${lang}.${key}`);
    return key;
  }
  
  // Simple parameter substitution: {name} -> params.name
  if (typeof value === 'string' && Object.keys(params).length > 0) {
    Object.entries(params).forEach(([k, v]) => {
      value = value.replace(`{${k}}`, v);
    });
  }
  
  return value;
}

/**
 * Set the active language
 * @param {string} lang - Language code ('de', 'en', etc.)
 */
function setLanguage(lang) {
  if (!['de', 'en'].includes(lang)) {
    console.warn(`Unknown language: ${lang}, defaulting to 'de'`);
    lang = 'de';
  }
  localStorage.setItem('app-language', lang);
  // Trigger app re-render (call this after setting language)
  document.dispatchEvent(new CustomEvent('language-changed', { detail: { lang } }));
}

/**
 * Get current language
 * @returns {string} - Current language code
 */
function getLanguage() {
  return localStorage.getItem('app-language') || 'de';
}

// Export for use in app
window.i18n = { t, setLanguage, getLanguage };
