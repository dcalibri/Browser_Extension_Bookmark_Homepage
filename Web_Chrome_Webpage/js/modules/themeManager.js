// js/modules/themeManager.js

/**
 * Theme Manager Class
 * Handles theme switching and persistence
 */
export class ThemeManager {
  constructor() {
    this.STORAGE_KEY = 'bookmark_board_theme';
    this.DEFAULT_THEME = 'default';
    this.availableThemes = ['default', 'dark', 'green', 'purple', 'high-contrast'];
    this.currentTheme = this.DEFAULT_THEME;
    this.initializeTheme();
  }

  /**
   * Initialize theme settings
   */
  async initializeTheme() {
    try {
      // Get saved theme settings
      const savedTheme = await this.getSavedTheme();
      
      // Apply theme
      if (savedTheme && this.availableThemes.includes(savedTheme)) {
        this.currentTheme = savedTheme;
      } else {
        // Check system preference
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        this.currentTheme = prefersDark ? 'dark' : 'default';
      }
      
      this.applyTheme(this.currentTheme);
      
      // Set up system theme change listener
      this.setupSystemThemeListener();
    } catch (error) {
      console.error('Failed to initialize theme:', error);
      // In case of error, apply default theme
      this.applyTheme(this.DEFAULT_THEME);
    }
  }

  /**
   * Get saved theme settings
   */
  getSavedTheme() {
    return new Promise((resolve) => {
      chrome.storage.sync.get([this.STORAGE_KEY], (result) => {
        if (chrome.runtime.lastError) {
          console.error('Failed to get theme settings:', chrome.runtime.lastError);
          resolve(null);
        } else {
          resolve(result[this.STORAGE_KEY] || null);
        }
      });
    });
  }

  /**
   * Save theme settings
   * @param {string} theme  Theme name
   */
  saveTheme(theme) {
    return new Promise((resolve, reject) => {
      chrome.storage.sync.set({ [this.STORAGE_KEY]: theme }, () => {
        if (chrome.runtime.lastError) {
          console.error('Failed to save theme settings:', chrome.runtime.lastError);
          reject(chrome.runtime.lastError);
        } else {
          console.log('Theme settings saved:', theme);
          resolve();
        }
      });
    });
  }

  /**
   * Apply theme
   * @param {string} theme  Theme name
   */
  applyTheme(theme) {
    if (!this.availableThemes.includes(theme)) {
      console.warn(`Unknown theme: ${theme}, using default theme`);
      theme = this.DEFAULT_THEME;
    }
    
    // Ensure applied to document.documentElement (i.e., <html> element)
    document.documentElement.removeAttribute('data-theme');
    
    if (theme !== 'default') {
      document.documentElement.setAttribute('data-theme', theme);
    }
    
    this.currentTheme = theme;
    console.log(`Applied theme: ${theme}`); // Add debug log
  }

  /**
   * Switch theme
   * @param {string} theme  Theme name
   */
  async switchTheme(theme) {
    try {
      this.applyTheme(theme);
      await this.saveTheme(theme);
      return true;
    } catch (error) {
      console.error('Failed to switch theme:', error);
      return false;
    }
  }

  /**
   * Set up system theme change listener
   */
  setupSystemThemeListener() {
    if (window.matchMedia) {
      const darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      
      const handleThemeChange = (e) => {
        // Respond to system theme change only when user hasn't manually set theme
        this.getSavedTheme().then(savedTheme => {
          if (!savedTheme) {
            this.applyTheme(e.matches ? 'dark' : 'default');
          }
        });
      };
      
      // Use new addEventListener method (if available)
      if (darkModeMediaQuery.addEventListener) {
        darkModeMediaQuery.addEventListener('change', handleThemeChange);
      } else {
        // Fallback to old addListener method
        darkModeMediaQuery.addListener(handleThemeChange);
      }
    }
  }

  /**
   * Get current theme
   * @returns {string} Current theme name
   */
  getCurrentTheme() {
    return this.currentTheme;
  }

  /**
   * Get available themes list
   * @returns {Array} Available themes array
   */
  getAvailableThemes() {
    return [...this.availableThemes];
  }
}

// Export singleton
export const themeManager = new ThemeManager();
