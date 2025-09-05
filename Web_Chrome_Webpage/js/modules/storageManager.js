// js/modules/storageManager.js

/**
 * Storage Manager
 * Handles saving and restoring layout and order
 */
export class StorageManager {
  constructor() {
    this.STORAGE_KEYS = {
      COLUMN_ORDER: 'bookmark_board_column_order',
      BOOKMARK_ORDER: 'bookmark_board_bookmark_order'
    };
    
    // Special column identifiers
    this.SPECIAL_COLUMNS = {
      UNCATEGORIZED: 'uncategorized',
      OTHER_BOOKMARKS: '2',  // Chrome assigns ID '2' to "Other Bookmarks"
      MOBILE_BOOKMARKS: '3'  // Chrome assigns ID '3' to "Mobile Bookmarks"
    };
  }

  /**
   * Save column order
   * @param {Array} columns Column elements array
   */
  saveColumnOrder(columns) {
    const columnOrder = Array.from(columns).map(column => {
      // Check for special column types
      if (column.dataset.columnType === 'uncategorized') {
        return this.SPECIAL_COLUMNS.UNCATEGORIZED;
      }
      
      // Otherwise use the folder ID
      return column.dataset.folderId || null;
    }).filter(id => id !== null); // Filter out any null values
    
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
      chrome.storage.sync.set({ [this.STORAGE_KEYS.COLUMN_ORDER]: columnOrder }, () => {
        if (chrome.runtime.lastError) {
          console.error('Failed to save column order:', chrome.runtime.lastError);
        } else {
          console.log('Column order saved:', columnOrder);
        }
      });
    } else {
      try {
        localStorage.setItem(this.STORAGE_KEYS.COLUMN_ORDER, JSON.stringify(columnOrder));
      } catch (e) {}
    }
  }

  /**
   * Save bookmark order
   * @param {Object} bookmarkOrders Bookmark order object { folderId: [bookmarkId1, bookmarkId2, ...] }
   */
  saveBookmarkOrder(bookmarkOrders) {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
      chrome.storage.sync.set({ [this.STORAGE_KEYS.BOOKMARK_ORDER]: bookmarkOrders }, () => {
        if (chrome.runtime.lastError) {
          console.error('Failed to save bookmark order:', chrome.runtime.lastError);
        } else {
          console.log('Bookmark order saved');
        }
      });
    } else {
      try {
        localStorage.setItem(this.STORAGE_KEYS.BOOKMARK_ORDER, JSON.stringify(bookmarkOrders));
      } catch (e) {}
    }
  }

  /**
   * Get saved column order
   * @returns {Promise<Array>} Column ID array
   */
  getColumnOrder() {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
      return new Promise((resolve) => {
        chrome.storage.sync.get([this.STORAGE_KEYS.COLUMN_ORDER], (result) => {
          if (chrome.runtime.lastError) {
            console.error('Failed to get column order:', chrome.runtime.lastError);
            resolve(null);
          } else {
            resolve(result[this.STORAGE_KEYS.COLUMN_ORDER] || null);
          }
        });
      });
    }
    try {
      const raw = localStorage.getItem(this.STORAGE_KEYS.COLUMN_ORDER);
      return Promise.resolve(raw ? JSON.parse(raw) : null);
    } catch (e) {
      return Promise.resolve(null);
    }
  }

  /**
   * Get saved bookmark order
   * @returns {Promise<Object>} Bookmark order object
   */
  getBookmarkOrder() {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
      return new Promise((resolve) => {
        chrome.storage.sync.get([this.STORAGE_KEYS.BOOKMARK_ORDER], (result) => {
          if (chrome.runtime.lastError) {
            console.error('Failed to get bookmark order:', chrome.runtime.lastError);
            resolve(null);
          } else {
            resolve(result[this.STORAGE_KEYS.BOOKMARK_ORDER] || null);
          }
        });
      });
    }
    try {
      const raw = localStorage.getItem(this.STORAGE_KEYS.BOOKMARK_ORDER);
      return Promise.resolve(raw ? JSON.parse(raw) : null);
    } catch (e) {
      return Promise.resolve(null);
    }
  }

  /**
   * Clear all saved order data
   */
  clearAllOrderData() {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
      chrome.storage.sync.remove([
        this.STORAGE_KEYS.COLUMN_ORDER,
        this.STORAGE_KEYS.BOOKMARK_ORDER
      ], () => {
        if (chrome.runtime.lastError) {
          console.error('Failed to clear order data:', chrome.runtime.lastError);
        } else {
          console.log('All order data cleared');
        }
      });
    } else {
      try {
        localStorage.removeItem(this.STORAGE_KEYS.COLUMN_ORDER);
        localStorage.removeItem(this.STORAGE_KEYS.BOOKMARK_ORDER);
      } catch (e) {}
    }
  }

  /**
   * Collect current bookmark order from DOM
   * @returns {Object} Bookmark order object
   */
  collectBookmarkOrderFromDOM() {
    const bookmarkOrders = {};
    
    // Get all columns
    const columns = document.querySelectorAll('.kanban-column');
    
    columns.forEach(column => {
      // Handle both folder ID and special column types
      let columnId = column.dataset.folderId;
      
      // If it's an uncategorized column, use the special ID
      if (column.dataset.columnType === 'uncategorized') {
        columnId = this.SPECIAL_COLUMNS.UNCATEGORIZED;
      }
      
      if (!columnId) return;
      
      const bookmarkList = column.querySelector('.bookmark-list');
      if (!bookmarkList) return;
      
      // Get all bookmark IDs in the column
      const bookmarkIds = Array.from(
        bookmarkList.querySelectorAll('.bookmark-item')
      ).map(item => item.dataset.bookmarkId);
      
      // Only save if there are bookmarks
      if (bookmarkIds.length > 0) {
        bookmarkOrders[columnId] = bookmarkIds;
      }
    });
    
    return bookmarkOrders;
  }
}

// Export singleton
export const storageManager = new StorageManager();