import { createElement, getDomain } from '../utils.js';

/* ---------- Helpers ---------- */
function chromeFavicon(url, size = 16, dpr = window.devicePixelRatio || 1) {
  // Chrome supports high-DPI variants with @2x
  const scale = dpr >= 1.5 ? '@2x' : '';
  return `chrome://favicon/size/${size}${scale}/${url}`;
}

export class BookmarkRenderer {
  constructor() {
    // Callbacks from outer components
    this.onBookmarkOrderChanged = null;
    // Optional: if you maintain an in-memory map { [id]: bookmark }
    // this.bookmarks = {};
  }
  
  /**
   * Set callback for when bookmark order changes
   * @param {Function} callback Callback function
   */
  setOrderChangedCallback(callback) {
    this.onBookmarkOrderChanged = callback;
  }

  /**
   * Create a bookmark item element
   * @param {Object} bookmark Bookmark data
   * @returns {HTMLElement} Bookmark item element
   */
  createBookmarkItem(bookmark) {
    const item = createElement('div', 'bookmark-item');
    item.setAttribute('data-bookmark-id', bookmark.id);
    item.setAttribute('draggable', 'true');
    item.setAttribute('data-url', bookmark.url);

    const content = createElement('div', 'bookmark-content');

    // --- Favicon from the site via Chrome's built-in service ---
    const favicon = document.createElement('img');
    favicon.className = 'bookmark-favicon';
    favicon.loading = 'lazy';
    favicon.alt = '';
    favicon.src = chromeFavicon(bookmark.url, 16);

    // Fallback: try the origin once, then tiny globe
    favicon.onerror = () => {
      favicon.onerror = () => {
        favicon.onerror = null;
        favicon.src =
          'data:image/svg+xml;utf8,' +
          encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"><text x="0" y="14" font-size="16">🌐</text></svg>');
      };
      try {
        const origin = new URL(bookmark.url).origin;
        favicon.src = chromeFavicon(origin, 16);
      } catch {
        favicon.onerror();
      }
    };


    // Title
    const title = createElement('div', 'bookmark-title');
    title.textContent = bookmark.title || '(Untitled)';
    title.title = bookmark.title || bookmark.url;

    // Domain
    const domain = createElement('div', 'bookmark-domain');
    domain.textContent = getDomain(bookmark.url);

    // Actions
    const actions = createElement('div', 'bookmark-actions');

    // Edit
    const editButton = createElement('button', 'bookmark-action edit-btn');
    editButton.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24">
        <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
      </svg>
    `;
    editButton.title = 'Edit';

    // Delete
    const deleteButton = createElement('button', 'bookmark-action delete-btn');
    deleteButton.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24">
        <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
      </svg>
    `;
    deleteButton.title = 'Delete';

    actions.appendChild(editButton);
    actions.appendChild(deleteButton);

    // Assemble (no double-append)
    content.appendChild(favicon);
    content.appendChild(title);
    content.appendChild(domain);
    item.appendChild(content);
    item.appendChild(actions);

    // Open on click (unless action button)
    item.addEventListener('click', (e) => {
      if (!e.target.closest('.bookmark-action')) {
        window.open(bookmark.url, '_blank');
      }
    });

    return item;
  }
  
  /**
   * Update specific bookmark display
   * @param {Object} bookmark Bookmark data
   */
  updateBookmarkItem(bookmark) {
    const item = document.querySelector(`.bookmark-item[data-bookmark-id="${bookmark.id}"]`);
    if (!item) return;

    const title = item.querySelector('.bookmark-title');
    const favicon = item.querySelector('.bookmark-favicon');

    title.textContent = bookmark.title || getDomain(bookmark.url);
    item.dataset.url = bookmark.url;

    // Re-resolve favicon from Chrome (add cache-buster so Chrome refetches if needed)
    favicon.onerror = () => {
      favicon.onerror = () => {
        favicon.onerror = null;
        favicon.src =
          'data:image/svg+xml;utf8,' +
          encodeURIComponent(
            '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"><text x="0" y="14" font-size="16">🌐</text></svg>'
          );
      };
      try {
        const origin = new URL(bookmark.url).origin;
        favicon.src = chromeFavicon(origin, 16) + `#${Date.now()}`;
      } catch {
        favicon.onerror();
      }
    };
    favicon.src = chromeFavicon(bookmark.url, 16) + `#${Date.now()}`;
  }
  
  /**
   * Remove single bookmark element
   * @param {string} bookmarkId Bookmark ID to remove
   */
  removeBookmarkItem(bookmarkId) {
    const bookmarkItem = document.querySelector(`.bookmark-item[data-bookmark-id="${bookmarkId}"]`);
    if (!bookmarkItem) return;

    bookmarkItem.style.transition = 'opacity 0.3s ease';
    bookmarkItem.style.opacity = '0';
    
    setTimeout(() => {
      bookmarkItem.remove();
      
      const column = bookmarkItem.closest('.kanban-column');
      if (column) {
        const countEl = column.querySelector('.column-count');
        if (countEl) {
          const currentCount = Math.max(0, (parseInt(countEl.textContent, 10) || 1) - 1);
          countEl.textContent = currentCount;
        }

        const bookmarkList = column.querySelector('.bookmark-list');
        if (bookmarkList && bookmarkList.children.length === 0) {
          bookmarkList.innerHTML = '<div class="empty-column">No bookmarks</div>';
        }
      }
      
      // Notify about order change
      if (this.onBookmarkOrderChanged) {
        this.onBookmarkOrderChanged();
      }
    }, 300);
  }
  
  /**
   * Create empty folder message
   * @returns {HTMLElement} Message element
   */
  createEmptyMessage() {
    const empty = createElement('div', 'empty-column');
    empty.textContent = 'This folder is empty';
    return empty;
  }
  
  /**
   * Render subfolder group
   * @param {Object} folder Folder data
   * @param {HTMLElement} container Container element
   * @param {Array} savedBookmarkOrder Saved bookmark order
   */
  renderSubfolderGroup(folder, container, savedBookmarkOrder) {
    const subfolderGroup = createElement('div', 'subfolder-group');

    // Subfolder header with toggle
    const subfolderHeader = this.createSubfolderHeader(folder);
    subfolderHeader.setAttribute('data-folder-id', folder.id);

    const subfolderToggle = createElement('button', 'subfolder-toggle-btn');
    subfolderToggle.textContent = '▼';
    subfolderToggle.title = 'Expand/Collapse';
    subfolderHeader.appendChild(subfolderToggle);

    subfolderGroup.appendChild(subfolderHeader);

    // Bookmarks container
    const bookmarksContainer = createElement('div', 'bookmarks-container');

    // Render bookmarks in folder (assumes this.bookmarks map exists upstream)
    if (Array.isArray(folder.bookmarks)) {
      folder.bookmarks.forEach(bookmarkId => {
        const bookmark = this.bookmarks?.[bookmarkId];
        if (bookmark) {
          const bookmarkItem = this.createBookmarkItem(bookmark);
          bookmarksContainer.appendChild(bookmarkItem);
        }
      });
    }

    subfolderGroup.appendChild(bookmarksContainer);
    container.appendChild(subfolderGroup);
    
    // Toggle subfolder visibility
    subfolderToggle.addEventListener('click', () => {
      const isOpen = subfolderGroup.classList.toggle('open');
      subfolderToggle.textContent = isOpen ? '▲' : '▼';
    });
  }
  
  /**
   * Create subfolder header with folder icon (with larger margins)
   * @param {Object} folder Subfolder data
   * @returns {HTMLElement} Subfolder header element
   */
  createSubfolderHeader(folder) {
    const subfolderHeader = createElement('div', 'subfolder-header');
    subfolderHeader.setAttribute('data-folder-id', folder.id);

    // Larger margin: top right bottom left
    subfolderHeader.style.margin = '8px 0 8px 12px';
    subfolderHeader.style.display = 'flex';
    subfolderHeader.style.alignItems = 'center';

    // Folder icon (SVG)
    const folderIcon = document.createElement('span');
    folderIcon.className = 'subfolder-folder-icon';
    folderIcon.style.marginRight = '8px'; // spacing between icon & title
    folderIcon.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" 
        stroke="currentColor" stroke-width="2" stroke-linecap="round" 
        stroke-linejoin="round">
        <path d="M3 7V5a2 2 0 0 1 2-2h3.5a2 2 0 0 1 1.6.8l1.7 2.4H19a2 2 0 0 1 
          2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z"/>
      </svg>
    `;
    subfolderHeader.appendChild(folderIcon);
    return subfolderHeader;
  }
}
