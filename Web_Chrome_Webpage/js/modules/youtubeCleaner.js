export class YouTubeCleaner {
  /**
   * Close YouTube tabs except the currently playing one and the most recently active
   */
  static async clean(options = {}) {
    try { alert('YouTubeCleaner.clean() invoked'); } catch {}
    // Guard for local dev or missing permissions; fallback to background message
    if (typeof chrome === 'undefined' || !chrome.tabs || !chrome.tabs.query) {
      console.warn('YouTubeCleaner: Chrome tabs API is unavailable in this context. Trying background...');
      try { alert('YouTubeCleaner: tabs API unavailable here. Trying background...'); } catch {}
      try {
        if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
          await new Promise((resolve) => {
            chrome.runtime.sendMessage({ type: 'YT_CLEAN', mode: options.mode || 'default' }, () => resolve());
          });
        }
      } catch {}
      return;
    }

    // If mode is close_left, close YT tabs to the left of the active tab in current window
    if (options.mode === 'close_left') {
      const [activeTab] = await new Promise((resolve) => {
        chrome.tabs.query({ active: true, currentWindow: true }, resolve);
      });
      if (!activeTab) { try { alert('No active tab detected'); } catch {} return; }

      const ytTabsInWindow = await new Promise((resolve) => {
        chrome.tabs.query({ windowId: activeTab.windowId, url: ['*://*.youtube.com/*', '*://youtube.com/*'] }, resolve);
      });

      const toClose = ytTabsInWindow.filter(t => typeof t.index === 'number' && t.index < activeTab.index);
      if (!toClose.length) { try { alert('No YouTube tabs to the left'); } catch {} return; }
      await new Promise((resolve) => chrome.tabs.remove(toClose.map(t => t.id), resolve));
      try { alert('Closed ' + toClose.length + ' YouTube tabs to the left'); } catch {}
      return;
    }

    // Default: Query all YouTube tabs across all windows
    const allYouTubeTabs = await new Promise((resolve) => {
      chrome.tabs.query({ url: ['*://*.youtube.com/*', '*://youtube.com/*'] }, resolve);
    });

    if (!allYouTubeTabs || allYouTubeTabs.length <= 1) { try { alert('No extra YT tabs to close'); } catch {} return; }

    // Determine: playing tabs, pinned tabs, and most-recent YouTube tab per window
    const playingTabs = allYouTubeTabs.filter(tab => tab.audible && !(tab.mutedInfo && tab.mutedInfo.muted));
    const pinnedTabs = allYouTubeTabs.filter(tab => tab.pinned);

    // Group tabs by windowId
    const windowIdToTabs = new Map();
    for (const tab of allYouTubeTabs) {
      const arr = windowIdToTabs.get(tab.windowId) || [];
      arr.push(tab);
      windowIdToTabs.set(tab.windowId, arr);
    }

    // For each window, keep the active YouTube tab if present, otherwise the most recently accessed
    const mostRecentPerWindow = [];
    for (const [, tabs] of windowIdToTabs) {
      const activeTab = tabs.find(t => t.active);
      if (activeTab) {
        mostRecentPerWindow.push(activeTab);
        continue;
      }
      const mostRecent = [...tabs].sort((a, b) => (b.lastAccessed || 0) - (a.lastAccessed || 0))[0];
      if (mostRecent) mostRecentPerWindow.push(mostRecent);
    }

    // Build set of tab ids to keep
    const tabsToKeepIds = new Set([
      ...playingTabs.map(t => t.id),
      ...pinnedTabs.map(t => t.id),
      ...mostRecentPerWindow.map(t => t.id)
    ]);

    // Compute tabs to close, excluding keepers
    const tabsToClose = allYouTubeTabs.filter(t => !tabsToKeepIds.has(t.id));
    if (tabsToClose.length === 0) { try { alert('Nothing to close (all are keepers)'); } catch {} return; }

    await new Promise((resolve) => {
      try {
        chrome.tabs.remove(tabsToClose.map(t => t.id), () => {
          // Swallow errors like tabs already closed
          void chrome.runtime?.lastError;
          resolve();
        });
      } catch {
        resolve();
      }
    });
    try { alert('YouTubeCleaner.clean() completed'); } catch {}
  }
}


