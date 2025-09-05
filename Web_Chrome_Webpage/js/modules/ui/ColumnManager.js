import { createElement } from '../utils.js';

export class ColumnManager {
  constructor(bookmarkManager, notificationService) {
    this.bookmarkManager = bookmarkManager;
    this.notificationService = notificationService;
    this.bookmarkRenderer = null; // Will be set later via setter
  }

  /**
   * Set the bookmark renderer
   * @param {BookmarkRenderer} renderer The bookmark renderer instance
   */
  setBookmarkRenderer(renderer) {
    this.bookmarkRenderer = renderer;
  }

  /**
   * Render a folder column
   * @param {Object} folder Folder data
   * @param {HTMLElement} container Container to append to
   * @param {Object} savedBookmarkOrder Saved bookmark order
   */
  renderFolderColumn(folder, container, savedBookmarkOrder) {
    const column = createElement('div', 'kanban-column');
    column.dataset.columnType = 'folder';
    column.dataset.folderId = folder.id;
    
    // Create header
    const header = this.createColumnHeader(folder.title, this.countBookmarksInFolder(folder));
    column.appendChild(header);
    
    // Add double-click event handling for title editing
    this.setupTitleEditHandling(header, column);
    
    // Create bookmark list
    const bookmarkList = createElement('div', 'bookmark-list');
    
    if (folder.children) {
      // Check if there's saved bookmark order
      if (savedBookmarkOrder && savedBookmarkOrder[folder.id]) {
        // Arrange bookmarks according to saved order
        this.renderOrderedBookmarks(folder.children, bookmarkList, savedBookmarkOrder[folder.id]);
      } else {
        // Render bookmarks in original order
        folder.children.forEach(child => {
          if (child.url) {
            const bookmarkItem = this.bookmarkRenderer.createBookmarkItem(child);
            bookmarkList.appendChild(bookmarkItem);
          }
        });
      }
    }
    
    column.appendChild(bookmarkList);
    container.appendChild(column);
  }
  
  /**
   * Render a special column (uncategorized or system folder)
   * @param {string} title Column title
   * @param {Array} bookmarks Bookmarks array
   * @param {HTMLElement} container Container to append to
   * @param {string} folderId Folder ID (null for uncategorized)
   * @param {string} type Column type ('uncategorized' or 'special')
   * @param {Object} savedBookmarkOrder Saved bookmark order
   */
  renderSpecialColumn(title, bookmarks, container, folderId, type, savedBookmarkOrder) {
    const column = createElement('div', 'kanban-column');
    column.dataset.columnType = type;
    column.dataset.folderId = folderId;
    
    // Create header
    const header = this.createColumnHeader(title, bookmarks.length);
    column.appendChild(header);
    
    // Add double-click event handling for title editing
    this.setupTitleEditHandling(header, column);
    
    // Create bookmark list
    const bookmarkList = createElement('div', 'bookmark-list');
    
    // Determine the correct column ID for storage
    const columnStorageId = column.dataset.columnType === 'uncategorized' ? 
      'uncategorized' : folderId;
    
    // If there's saved bookmark order, render in order
    if (columnStorageId && savedBookmarkOrder && savedBookmarkOrder[columnStorageId]) {
      // Filter out direct bookmarks (not in subfolders)
      const directBookmarks = bookmarks.filter(bookmark => bookmark.url);
      this.renderOrderedBookmarks(directBookmarks, bookmarkList, savedBookmarkOrder[columnStorageId]);
      
      // Render subfolders
      bookmarks.forEach(bookmark => {
        if (bookmark.children) {
          this.renderSubfolderGroup(bookmark, bookmarkList, savedBookmarkOrder);
        }
      });
    } else {
      // Render in original order
      bookmarks.forEach(bookmark => {
        if (bookmark.url) {
          const bookmarkItem = this.bookmarkRenderer.createBookmarkItem(bookmark);
          bookmarkList.appendChild(bookmarkItem);
        } else if (bookmark.children) {
          this.renderSubfolderGroup(bookmark, bookmarkList, savedBookmarkOrder);
        }
      });
    }
    
    column.appendChild(bookmarkList);
    container.appendChild(column);
  }
  
  /**
   * Create column header with title and count
   * @param {string} title Column title
   * @param {number} count Item count
   * @returns {HTMLElement} Header element
   */
  createColumnHeader(title, count) {
    const header = createElement('div', 'column-header');
    
    // Add drag handle
    const dragHandle = createElement('div', 'column-drag-handle');
    dragHandle.innerHTML = '⠿';
    dragHandle.title = 'Drag to reorder';
    header.appendChild(dragHandle);
    
    // Add title
    const titleElement = createElement('div', 'column-title');
    titleElement.textContent = title;
    
    // Add count
    const countElement = createElement('div', 'column-count');
    countElement.textContent = count;
    
    // Actions
    const actions = createElement('div', 'column-actions');
    const addSubfolderBtn = createElement('button', 'column-action add-subfolder-btn');
    addSubfolderBtn.textContent = '+';
    addSubfolderBtn.title = 'Add Subfolder';
    addSubfolderBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const column = e.currentTarget.closest('.kanban-column');
      const folderId = column?.dataset?.folderId;
      if (!folderId) return;
      const name = prompt('Subfolder name');
      if (!name) return;
      this.bookmarkManager.createFolder(folderId, name).then(() => {
        this.notificationService.showToast('Subfolder created', 'success');
      }).catch(() => {
        this.notificationService.showToast('Failed to create subfolder', 'error');
      });
    });
    actions.appendChild(addSubfolderBtn);

    header.appendChild(titleElement);
    header.appendChild(countElement);
    header.appendChild(actions);
    
    return header;
  }
  
  /**
   * Set up double-click handler for title editing
   * @param {HTMLElement} header Header element
   * @param {HTMLElement} column Column element
   */
  setupTitleEditHandling(header, column) {
    header.addEventListener('dblclick', (e) => {
      // Ensure click is on title, not drag handle or count
      if (e.target.classList.contains('column-title') ||
          e.target.closest('.column-title')) {
        this.handleColumnTitleEdit(column);
      }
    });
  }
  
  /**
   * Handle column title edit
   * @param {HTMLElement} columnElement Column element
   */
  handleColumnTitleEdit(columnElement) {
    // Get column type and ID
    const columnType = columnElement.dataset.columnType;
    const folderId = columnElement.dataset.folderId;
    const titleElement = columnElement.querySelector('.column-title');
    const originalTitle = titleElement.textContent;
    
    // Check if it's a special column
    if (columnType === 'uncategorized') {
      this.notificationService.showToast(
        'Uncategorized column cannot be renamed. You can drag these bookmarks to other columns to organize them.',
        'info',
        5000
      );
      return;
    }
    
    // Check if it's a Chrome special folder
    if (folderId === '2' || folderId === '3') {
      const folderName = folderId === '2' ? 'Other Bookmarks' : 'Mobile Bookmarks';
      this.notificationService.showToast(
        `"${folderName}" is a Chrome special folder and cannot be renamed directly. Consider creating a new folder and organizing these bookmarks into more meaningful categories.`,
        'info',
        5000
      );
      return;
    }
    
    // Create edit input box
    const inputElement = document.createElement('input');
    inputElement.type = 'text';
    inputElement.className = 'column-title-edit';
    inputElement.value = originalTitle;
    inputElement.style.width = '100%';
    inputElement.style.padding = '4px';
    inputElement.style.border = '1px solid var(--primary-color)';
    inputElement.style.borderRadius = 'var(--border-radius)';
    inputElement.style.fontSize = titleElement.style.fontSize || '1.2rem';
    
    // Replace title element with input box
    titleElement.style.display = 'none';
    titleElement.parentNode.insertBefore(inputElement, titleElement.nextSibling);
    
    // Focus input box and select all text
    inputElement.focus();
    inputElement.select();
    
    // Handle input box events
    inputElement.addEventListener('keydown', async (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const newTitle = inputElement.value.trim();
        
        // Validate new title
        if (!newTitle) {
          inputElement.style.borderColor = 'var(--danger-color)';
          return;
        }
        
        // Save changes
        await this.saveColumnTitle(folderId, newTitle, titleElement);
        
        // Restore UI
        this.finishTitleEdit(inputElement, titleElement);
      } else if (e.key === 'Escape') {
        // Cancel edit
        this.finishTitleEdit(inputElement, titleElement);
      }
    });
    
    // Handle blur event
    inputElement.addEventListener('blur', () => {
      // Simple delay to allow Enter key event to process first
      setTimeout(() => {
        if (document.body.contains(inputElement)) {
          this.finishTitleEdit(inputElement, titleElement);
        }
      }, 100);
    });
  }
  
  /**
   * Complete title editing
   * @param {HTMLInputElement} inputElement Input element
   * @param {HTMLElement} titleElement Title element
   */
  finishTitleEdit(inputElement, titleElement) {
    titleElement.style.display = '';
    if (inputElement.parentNode) {
      inputElement.parentNode.removeChild(inputElement);
    }
  }
  
  /**
   * Save column title
   * @param {string} folderId Folder ID
   * @param {string} newTitle New title
   * @param {HTMLElement} titleElement Title element
   */
  async saveColumnTitle(folderId, newTitle, titleElement) {
    try {
      // Update bookmark folder title using Chrome API
      const result = await chrome.bookmarks.update(folderId, { title: newTitle });
      
      // Update UI
      titleElement.textContent = result.title;
      
      // Show success message
      this.notificationService.showToast(`Column title updated to "${newTitle}"`, 'success');
      
      return true;
    } catch (error) {
      console.error('Failed to update column title:', error);
      this.notificationService.showToast('Failed to update column title', 'error');
      return false;
    }
  }
  
  /**
   * Render bookmarks according to saved order
   * @param {Array} bookmarks Bookmarks array
   * @param {HTMLElement} container Container to render into
   * @param {Array} savedOrder Saved order array of bookmark IDs
   */
  renderOrderedBookmarks(bookmarks, container, savedOrder) {
    // Create a bookmark map for quick lookup by id
    const bookmarkMap = {};
    bookmarks.forEach(bookmark => {
      if (bookmark.url) {
        bookmarkMap[bookmark.id] = bookmark;
      }
    });
    
    // Add bookmarks in saved order
    savedOrder.forEach(bookmarkId => {
      if (bookmarkMap[bookmarkId]) {
        const bookmarkItem = this.bookmarkRenderer.createBookmarkItem(bookmarkMap[bookmarkId]);
        container.appendChild(bookmarkItem);
        // Remove from map to avoid duplicate addition
        delete bookmarkMap[bookmarkId];
      }
    });
    
    // Add any bookmarks not in saved order
    Object.values(bookmarkMap).forEach(bookmark => {
      const bookmarkItem = this.bookmarkRenderer.createBookmarkItem(bookmark);
      container.appendChild(bookmarkItem);
    });
  }
  
  /**
   * Render subfolder group
   * @param {Object} folder Subfolder data
   * @param {HTMLElement} container Container to append to
   * @param {Object} savedBookmarkOrder Saved bookmark order
   */
  renderSubfolderGroup(folder, container, savedBookmarkOrder) {
    // Render even if empty to show the subfolder placeholder
    
    const subfolderGroup = createElement('div', 'subfolder-group');
    
    const subfolderTitle = createElement('div', 'subfolder-title');
    subfolderTitle.textContent = folder.title;
    subfolderGroup.appendChild(subfolderTitle);
    
    // If there's saved subfolder bookmark order, render in order
    const subfolderKey = `subfolder-${folder.id}`;
    if (savedBookmarkOrder && savedBookmarkOrder[subfolderKey]) {
      this.renderOrderedBookmarks(folder.children, subfolderGroup, savedBookmarkOrder[subfolderKey]);
    } else if (folder.children && folder.children.length) {
      // Render bookmarks in subfolder in original order
      folder.children.forEach(child => {
        if (child.url) {
          const bookmarkItem = this.bookmarkRenderer.createBookmarkItem(child);
          subfolderGroup.appendChild(bookmarkItem);
        }
      });
    } else {
      const empty = createElement('div', 'subfolder-empty');
      empty.textContent = '(Empty)';
      subfolderGroup.appendChild(empty);
    }
    
    container.appendChild(subfolderGroup);
  }
  
  /**
   * Count bookmarks in folder (recursively)
   * @param {Object} folder Folder object
   * @returns {number} Total bookmark count
   */
  countBookmarksInFolder(folder) {
    let count = 0;
    if (folder.children) {
      folder.children.forEach(child => {
        if (child.url) {
          count++;
        } else if (child.children) {
          count += this.countBookmarksInFolder(child);
        }
      });
    }
    return count;
  }
  
  /**
   * Update column bookmark count
   * @param {string} columnId Column ID
   */
  updateColumnCount(columnId) {
    const column = document.querySelector(`.kanban-column[data-folder-id="${columnId}"]`);
    if (column) {
      const bookmarkList = column.querySelector('.bookmark-list');
      const count = column.querySelector('.column-count');
      count.textContent = bookmarkList.children.length;
    }
  }
} 