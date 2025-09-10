import { formatDateTime, formatDateTimeInZone } from '../utils.js';
import { BookmarkRenderer } from './BookmarkRenderer.js';
import { ColumnManager } from './ColumnManager.js';
import { KanbanRenderer } from './KanbanRenderer.js';
import { NotificationService } from './NotificationService.js';
import { UIStateManager } from './UIStateManager.js';

export class UIManager {
  constructor(bookmarkManager) {
    this.bookmarkManager = bookmarkManager;
    this.container = document.getElementById('kanban-container');
    
    // Initialize services
    this.notificationService = new NotificationService();
    this.uiStateManager = new UIStateManager(this.container);
    
    // Initialize renderers in correct order
    this.bookmarkRenderer = new BookmarkRenderer();
    this.columnManager = new ColumnManager(this.bookmarkManager, this.notificationService);
    this.columnManager.setBookmarkRenderer(this.bookmarkRenderer);
    
    // Initialize kanban renderer with all required dependencies
    this.kanbanRenderer = new KanbanRenderer(
      this.bookmarkManager,
      this.columnManager,
      this.bookmarkRenderer
    );
    
    // Initialize UI components
    this.initializeTimeUpdate();
  }

  /**
   * Initialize time update
   */
  initializeTimeUpdate() {
    const timeLocalFmt = new Intl.DateTimeFormat([], {
      hour: '2-digit', minute: '2-digit', hour12: false
    });
    const timeTzFmt = (tz) => new Intl.DateTimeFormat([], {
      hour: '2-digit', minute: '2-digit', hour12: false, timeZone: tz
    });
    // Pakai formatter tanggal yang sudah ada di project-mu kalau mau
    const dateLocalFmt = new Intl.DateTimeFormat([], {
      weekday: 'short', day: '2-digit', month: 'short', year: 'numeric'
    });
    const dateTzFmt = (tz) => new Intl.DateTimeFormat([], {
      weekday: 'short', day: '2-digit', month: 'short', year: 'numeric', timeZone: tz
    });

    const updateDateTime = () => {
      const now = new Date();

      // Lokal: HH:mm saja
      const ct = document.getElementById('current-time');
      if (ct) ct.textContent = timeLocalFmt.format(now);

      // Tanggal lokal (tetap seperti biasa)
      const cd = document.getElementById('current-date');
      if (cd) cd.textContent = dateLocalFmt.format(now);

      // Zona lain: HH:mm saja
      const setZone = (prefix, tz) => {
        const t = document.getElementById(`${prefix}-time`);
        const d = document.getElementById(`${prefix}-date`);
        if (t) t.textContent = timeTzFmt(tz).format(now);
        if (d) d.textContent = dateTzFmt(tz).format(now);
      };

      setZone('tokyo',  'Asia/Tokyo');
      setZone('riyadh', 'Asia/Riyadh');
      // Tambahkan kalau ada kota lain:
      // setZone('jakarta', 'Asia/Jakarta');
    };

    updateDateTime();
    setInterval(updateDateTime, 1000);
  }


  /**
   * Render the kanban board
   */
  async renderKanban() {
    try {
      // Clear container
      this.container.innerHTML = '';
      
      // Get bookmark tree
      const bookmarkTree = await this.bookmarkManager.getBookmarkTree();
      
      // Render board
      await this.kanbanRenderer.renderBoard(this.container, bookmarkTree);
      
    } catch (error) {
      console.error('Failed to render kanban:', error);
      this.uiStateManager.showError('Failed to load bookmarks');
    }
  }

  /**
   * Show loading state
   */
  showLoading() {
    this.uiStateManager.showLoading();
  }

  /**
   * Show error message
   */
  showErrorMessage() {
    this.uiStateManager.showError('An error occurred while loading bookmarks');
  }

  /**
   * Show disabled message
   */
  showDisabledMessage() {
    this.uiStateManager.showDisabledMessage();
  }

  /**
   * Remove a bookmark item from the UI
   * @param {string} bookmarkId Bookmark ID to remove
   */
  removeBookmarkItem(bookmarkId) {
    this.bookmarkRenderer.removeBookmarkItem(bookmarkId);
  }

  /**
   * Update a bookmark item in the UI
   * @param {Object} bookmark Bookmark data
   */
  updateBookmarkItem(bookmark) {
    this.bookmarkRenderer.updateBookmarkItem(bookmark);
  }

  /**
   * Show drag guide for new users
   */
  showDragGuide() {
    this.uiStateManager.showDragGuide();
  }
} 