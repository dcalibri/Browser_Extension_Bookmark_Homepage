// js/newtab.js
import { AppCoordinator } from './AppCoordinator.js';
import { YouTubeCleaner } from './modules/youtubeCleaner.js';
import { themeManager } from './modules/themeManager.js';
import { displayManager } from './modules/displayManager.js';

console.log('Bookmark Kanban newtab.js loaded');

// Initialize the application
document.addEventListener('DOMContentLoaded', async () => {
  console.log('DOM loaded');
  
  try {
    // Wire YT clean button ASAP so earlier errors don't block it
    try {
      const ytBtnEarly = document.getElementById('yt-clean-button');
      if (ytBtnEarly) {
        ytBtnEarly.addEventListener('click', () => {
          alert('yt-clean-button clicked');
          YouTubeCleaner.clean({ mode: 'close_left' });
        });
      } else {
        // Don't alert here repeatedly; just log to console to avoid noise
        console.warn('yt-clean-button not found at DOMContentLoaded');
      }
    } catch (e) {
      console.error('Failed to wire yt-clean-button early:', e);
    }

    // Initialize theme manager
    console.log('Initializing theme manager...');
    await themeManager.initializeTheme();
    console.log('Theme manager initialized, current theme:', themeManager.getCurrentTheme());
    
    // Initialize display mode manager
    console.log('Initializing display mode manager...');
    await displayManager.initializeDisplayMode();
    console.log('Display mode manager initialized, current mode:', displayManager.getCurrentDisplayMode());
    
    // Initialize the application
    const app = new AppCoordinator();
    await app.initialize();

    // Re-wire in case DOM changed later
    try {
      const ytBtn = document.getElementById('yt-clean-button');
      if (ytBtn && !ytBtn._ytCleanWired) {
        ytBtn.addEventListener('click', () => {
          alert('yt-clean-button clicked');
          YouTubeCleaner.clean({ mode: 'close_left' });
        });
        ytBtn._ytCleanWired = true;
      }
      const gcBtn = document.getElementById('gc-collect-button');
      if (gcBtn && !gcBtn._gcCollectWired) {
        gcBtn.addEventListener('click', async () => {
          try {
            const result = await new Promise(resolve => {
              chrome.runtime.sendMessage({ type: 'GC_COLLECT' }, resolve);
            });
            alert(result && result.summary ? result.summary : 'GC collection done');
          } catch (e) {
            alert('GC collect failed');
          }
        });
        gcBtn._gcCollectWired = true;
      }
    } catch (e) {
      console.error('Failed to wire yt-clean-button after init:', e);
    }
  } catch (error) {
    console.error('Initialization failed:', error);
  }
});