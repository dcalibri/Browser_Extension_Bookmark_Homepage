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
    // Column folder icon
    const folderIcon = document.createElement('span');
    folderIcon.className = 'column-folder-icon';
    folderIcon.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7V5a2 2 0 0 1 2-2h3.5a2 2 0 0 1 1.6.8l1.7 2.4H19a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z"/></svg>';
    // Or use emoji: folderIcon.textContent = '📂';
    // Insert icon before header
    const header = this.createColumnHeader(folder.title, this.countBookmarksInFolder(folder));
    header.insertBefore(folderIcon, header.firstChild);
    column.appendChild(header);
    // Add double-click event handling for title editing
    this.setupTitleEditHandling(header, column);
    // Create a sortable container for all items in Chrome order
    const itemList = createElement('div', 'folder-item-list');
    itemList.classList.add('sortable-folder-list');
    if (folder.children) {
      folder.children.forEach(child => {
        if (child.url) {
          // Direct bookmark: show as Kanban card, draggable
          const bookmarkItem = this.bookmarkRenderer.createBookmarkItem(child);
          bookmarkItem.classList.add('sortable-item');
          itemList.appendChild(bookmarkItem);
        } else if (child.children) {
          // Subfolder: show as collapsible group, keep position
          const subfolderContainer = document.createElement('div');
          subfolderContainer.className = 'subfolder-container sortable-item';
          subfolderContainer.setAttribute('data-folder-id', child.id);
          this.renderSubfolderGroup(child, subfolderContainer, savedBookmarkOrder);
          itemList.appendChild(subfolderContainer);
        }
      });
    }
    column.appendChild(itemList);
    container.appendChild(column);
    // Initialize drag-and-drop for both bookmarks and subfolders, across columns and into subfolders
    if (window.Sortable) {
      Sortable.create(itemList, {
        animation: 150,
        group: 'folder-items',
        draggable: '.sortable-item',
        handle: '.bookmark-item, .subfolder-header',
        onStart: (evt) => {
          console.log('[DragStart]', evt);
        },
        onEnd: async (evt) => {
          const draggedEl = evt.item;
          const bookmarkId = draggedEl.classList.contains('bookmark-item') ? draggedEl.getAttribute('data-bookmark-id') : null;
          if (!bookmarkId) return;
          // Determine drop target
          let targetParentId = column.dataset.folderId;
          let targetIndex = evt.newIndex;
          let dropType = 'column-root';
          let dropTargetName = header.querySelector('.column-title')?.textContent || '';
          // Drop on subfolder header
          const nextEl = itemList.children[targetIndex];
          if (nextEl && nextEl.classList.contains('subfolder-container')) {
            targetParentId = nextEl.getAttribute('data-folder-id');
            targetIndex = 0;
            dropType = 'subfolder-header';
            dropTargetName = nextEl.querySelector('.subfolder-title')?.textContent || '';
          } else if (nextEl && nextEl.classList.contains('bookmark-item')) {
            // Drop between items
            targetParentId = nextEl.parentNode.classList.contains('subfolder-content')
              ? nextEl.parentNode.parentNode.querySelector('.subfolder-header').getAttribute('data-folder-id')
              : column.dataset.folderId;
            dropType = 'between-items';
            dropTargetName = nextEl.querySelector('.bookmark-title')?.textContent || '';
          }
          // Prevent self-drop
          if (bookmarkId === targetParentId) {
            this.notificationService.showToast('Cannot drop on itself', 'info');
            return;
          }
          // Get source info
          const sourceParentId = draggedEl.parentNode.classList.contains('subfolder-content')
            ? draggedEl.parentNode.parentNode.querySelector('.subfolder-header').getAttribute('data-folder-id')
            : column.dataset.folderId;
          const sourceIndex = Array.from(draggedEl.parentNode.children).indexOf(draggedEl);
          // No-op if unchanged
          if (sourceParentId === targetParentId && sourceIndex === targetIndex) {
            this.notificationService.showToast('No change in position', 'info');
            return;
          }
          // Logging
          console.log('[DropTarget]', {bookmarkId, sourceParentId, targetParentId, targetIndex, dropType, dropTargetName});
          // Move via Chrome API
          try {
            await chrome.bookmarks.move(bookmarkId, { parentId: targetParentId, index: targetIndex });
            this.notificationService.showToast(`Moved to "${dropTargetName}"`, 'success');
            // Update cached order arrays (chrome.storage.sync)
            // ...existing code for updating order arrays...
          } catch (err) {
            const errorMsg = chrome.runtime?.lastError?.message || err?.message || 'Move failed';
            this.notificationService.showToast(errorMsg, 'error');
            // Roll back DOM (optional: re-fetch container)
            // ...existing code for rollback...
            console.error('[MoveError]', errorMsg);
          }
        }
      });
    }
    // Helper to check descendant
    function isDescendant(folderId, targetId) {
      if (folderId === targetId) return true;
      // Traverse Chrome bookmarks tree if needed
      // For now, block only direct self-move
      return false;
    }
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
    // Subfolder group
    const subfolderGroup = createElement('div', 'subfolder-group');
    // Subfolder header with toggle
    const subfolderHeader = createElement('div', 'subfolder-header');
    subfolderHeader.setAttribute('data-folder-id', folder.id);
    // Folder icon (SVG or emoji)
    const folderIcon = document.createElement('span');
    folderIcon.className = 'subfolder-folder-icon';
    folderIcon.textContent = '📁';
    subfolderHeader.appendChild(folderIcon);
    const subfolderToggle = createElement('button', 'subfolder-toggle-btn');
    subfolderToggle.textContent = '▼';
    subfolderToggle.title = 'Expand/Collapse';
    const subfolderTitle = createElement('div', 'subfolder-title');
    subfolderTitle.textContent = folder.title;
    subfolderHeader.appendChild(subfolderToggle);
    subfolderHeader.appendChild(subfolderTitle);
    subfolderGroup.appendChild(subfolderHeader);
    // Double-click to rename subfolder
    subfolderTitle.addEventListener('dblclick', async (e) => {
      e.stopPropagation();
      const originalTitle = subfolderTitle.textContent;
      const input = document.createElement('input');
      input.type = 'text';
      input.value = originalTitle;
      input.className = 'subfolder-title-edit';
      input.style.width = '80%';
      subfolderTitle.style.display = 'none';
      subfolderHeader.appendChild(input);
      input.focus();
      input.select();
      input.addEventListener('keydown', async (ev) => {
        if (ev.key === 'Enter') {
          const newTitle = input.value.trim();
          if (newTitle && newTitle !== originalTitle) {
            try {
              await chrome.bookmarks.update(folder.id, { title: newTitle });
              subfolderTitle.textContent = newTitle;
            } catch (err) {
              alert('Failed to rename subfolder');
            }
          }
          input.remove();
          subfolderTitle.style.display = '';
        } else if (ev.key === 'Escape') {
          input.remove();
          subfolderTitle.style.display = '';
        }
      });
      input.addEventListener('blur', () => {
        input.remove();
        subfolderTitle.style.display = '';
      });
    });
    // Subfolder content container
    const subfolderContent = createElement('div', 'subfolder-content');
    const subfolderKey = `subfolder-${folder.id}`;
    if (savedBookmarkOrder && savedBookmarkOrder[subfolderKey]) {
      this.renderOrderedBookmarks(folder.children, subfolderContent, savedBookmarkOrder[subfolderKey]);
    } else if (folder.children && folder.children.length) {
      folder.children.forEach(child => {
        if (child.url) {
          const bookmarkItem = this.bookmarkRenderer.createBookmarkItem(child);
          subfolderContent.appendChild(bookmarkItem);
        }
      });
    } else {
      const empty = createElement('div', 'subfolder-empty');
      empty.textContent = '(Empty)';
      subfolderContent.appendChild(empty);
    }
    subfolderGroup.appendChild(subfolderContent);
    container.appendChild(subfolderGroup);
    // Toggle logic for subfolder
    subfolderToggle.addEventListener('click', () => {
      if (subfolderContent.style.display === 'none') {
        subfolderContent.style.display = '';
        subfolderToggle.textContent = '▼';
      } else {
        subfolderContent.style.display = 'none';
        subfolderToggle.textContent = '►';
      }
    });
    // Make bookmarks inside subfolder sortable and allow cross-subfolder drag
    if (window.Sortable) {
      Sortable.create(subfolderContent, {
        animation: 150,
        group: 'folder-items', // Allow cross-subfolder drag
        draggable: '.bookmark-item',
        onEnd: async (evt) => {
          const draggedEl = evt.item;
          const parentFolderId = folder.id;
          const newIndex = evt.newIndex;
          const id = draggedEl.getAttribute('data-bookmark-id');
          // Prevent redundant move
          const currentParentId = draggedEl.parentNode.parentNode.querySelector('.subfolder-header').getAttribute('data-folder-id');
          const currentIndex = Array.from(draggedEl.parentNode.children).indexOf(draggedEl);
          if (currentParentId === parentFolderId && currentIndex === newIndex) {
            this.notificationService.showToast('No change in position', 'info');
            return;
          }
          try {
            await chrome.bookmarks.move(id, { parentId: parentFolderId, index: newIndex });
            this.notificationService.showToast('Moved successfully', 'success');
          } catch (err) {
            this.notificationService.showToast('Move failed', 'error');
          }
        }
      });
    }
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

