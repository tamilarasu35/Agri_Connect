const Lang = (() => {
  const STORAGE_KEY = 'fps_language';
  // Try multiple paths to handle different serve configurations
  const LANG_PATHS = ['../languages/', 'languages/', './languages/'];
  let currentLang = 'english';
  let strings = {};

  /**
   * Parse a Java-style .properties file into a key→value object
   */
  function parseProperties(text) {
    const result = {};
    const lines = text.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('!')) continue;
      const eqIndex = trimmed.indexOf('=');
      if (eqIndex === -1) continue;
      const key = trimmed.substring(0, eqIndex).trim();
      const value = trimmed.substring(eqIndex + 1).trim();
      result[key] = value;
    }
    return result;
  }

  /**
   * Try fetching from multiple base paths
   */
  async function fetchLangFile(lang) {
    for (const basePath of LANG_PATHS) {
      try {
        const url = `${basePath}${lang}.properties`;
        const response = await fetch(url);
        if (response.ok) {
          return await response.text();
        }
      } catch (e) {
        // Try next path
      }
    }
    throw new Error(`Could not load ${lang}.properties from any path`);
  }

  /**
   * Load a language file and apply translations
   */
  async function load(lang) {
    currentLang = lang;
    localStorage.setItem(STORAGE_KEY, lang);

    try {
      const text = await fetchLangFile(lang);
      strings = parseProperties(text);
      applyTranslations();
      document.documentElement.lang = lang === 'tamil' ? 'ta' : lang === 'hindi' ? 'hi' : 'en';
    } catch (err) {
      console.error('Language load error:', err);
    }
  }

  /**
   * Apply loaded strings to all elements with data-lang attributes
   */
  function applyTranslations() {
    // Text content
    document.querySelectorAll('[data-lang]').forEach(el => {
      const key = el.getAttribute('data-lang');
      if (strings[key]) {
        el.textContent = strings[key];
      }
    });

    // Placeholders
    document.querySelectorAll('[data-lang-placeholder]').forEach(el => {
      const key = el.getAttribute('data-lang-placeholder');
      if (strings[key]) {
        el.placeholder = strings[key];
      }
    });

    // Title attributes
    document.querySelectorAll('[data-lang-title]').forEach(el => {
      const key = el.getAttribute('data-lang-title');
      if (strings[key]) {
        el.title = strings[key];
      }
    });
  }

  /**
   * Get a single translated string by key.
   * Falls back to a human-readable version of the key (strips prefix, capitalizes).
   */
  function get(key) {
    if (strings[key]) return strings[key];
    // Fallback: strip prefix like "crop." or "home." and capitalize
    const parts = key.split('.');
    if (parts.length > 1) {
      const word = parts[parts.length - 1];
      return word.charAt(0).toUpperCase() + word.slice(1).replace(/_/g, ' ');
    }
    return key;
  }

  /**
   * Get the currently loaded language
   */
  function getCurrent() {
    return currentLang;
  }

  /**
   * Get the saved language from localStorage, or default
   */
  function getSaved() {
    return localStorage.getItem(STORAGE_KEY) || 'english';
  }

  return { load, get, getCurrent, getSaved, applyTranslations };
})();

