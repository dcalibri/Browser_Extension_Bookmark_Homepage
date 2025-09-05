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
    const updateDateTime = () => {
      const { time, date } = formatDateTime(new Date());
      document.getElementById('current-time').textContent = time;
      document.getElementById('current-date').textContent = date;

      const now = new Date();
      const tokyo = formatDateTimeInZone(now, 'Asia/Tokyo');
      const riyadh = formatDateTimeInZone(now, 'Asia/Riyadh');
      const tokyoTime = document.getElementById('tokyo-time');
      const tokyoDate = document.getElementById('tokyo-date');
      const riyadhTime = document.getElementById('riyadh-time');
      const riyadhDate = document.getElementById('riyadh-date');
      if (tokyoTime) tokyoTime.textContent = tokyo.time;
      if (tokyoDate) tokyoDate.textContent = tokyo.date;
      if (riyadhTime) riyadhTime.textContent = riyadh.time;
      if (riyadhDate) riyadhDate.textContent = riyadh.date;
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