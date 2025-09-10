import { createElement } from '../utils.js';

export class ColumnManager {
  constructor(bookmarkManager, notificationService) {
    this.bookmarkManager = bookmarkManager;
    this.notificationService = notificationService;
    this.bookmarkRenderer = null;
  }

  setBookmarkRenderer(renderer) {
    this.bookmarkRenderer = renderer;
  }

  /**
   * Render a folder column
   */
  renderFolderColumn(folder, container, savedBookmarkOrder) {
    const column = createElement('div', 'kanban-column');
    column.dataset.columnType = 'folder';
    column.dataset.folderId = folder.id;

    const folderIcon = document.createElement('span');
    
    const header = this.createColumnHeader(folder.title, this.countBookmarksInFolder(folder));
    header.insertBefore(folderIcon, header.firstChild);
    column.appendChild(header);

    this.setupTitleEditHandling(header, column);

    const itemList = createElement('div', 'folder-item-list');
    itemList.classList.add('sortable-folder-list');

    if (folder.children) {
      folder.children.forEach(child => {
        if (child.url) {
          const bookmarkItem = this.bookmarkRenderer.createBookmarkItem(child);
          bookmarkItem.classList.add('sortable-item', 'bookmark-item'); // FIX
          itemList.appendChild(bookmarkItem);
        } else if (child.children) {
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

    // Sortable for column
    if (window.Sortable) {
      Sortable.create(itemList, {
        animation: 150,
        group: { name: 'folder-items', pull: true, put: true },
        draggable: '.sortable-item',
        handle: '.bookmark-item, .subfolder-header',
        fallbackOnBody: true,
        swapThreshold: 0.65,
        emptyInsertThreshold: 8,

        onEnd: async (evt) => {
          const draggedEl = evt.item;
          const isBookmark = draggedEl.classList.contains('bookmark-item');
          const isSubfolder = draggedEl.classList.contains('subfolder-container');
          const itemId = isBookmark
            ? draggedEl.getAttribute('data-bookmark-id')
            : isSubfolder
            ? draggedEl.getAttribute('data-folder-id')
            : null;
          if (!itemId) return;

          const destList = evt.to;
          const destColumn = destList.closest('.kanban-column');
          if (!destColumn) {
            await window.app.uiManager.renderKanban();
            return;
          }

          let targetParentId;
          let targetIndex = evt.newIndex;
          let dropTargetName = '';

          if (destList.classList.contains('subfolder-content')) {
            const subHeader = destList.previousElementSibling;
            targetParentId = subHeader?.getAttribute('data-folder-id');
            dropTargetName = subHeader?.querySelector('.subfolder-title')?.textContent || '';
          } else {
            targetParentId = destColumn.dataset.folderId;
            dropTargetName = destColumn.querySelector('.column-title')?.textContent || '';
          }

          if (isSubfolder && itemId === targetParentId) {
            this.notificationService.showToast('Cannot drop folder on itself', 'info');
            return;
          }

          try {
            await chrome.bookmarks.move(itemId, { parentId: targetParentId, index: targetIndex });
            await window.app.uiManager.renderKanban();
            this.notificationService.showToast(`Moved to "${dropTargetName}"`, 'success');
          } catch (err) {
            const errorMsg = chrome.runtime?.lastError?.message || err?.message || 'Move failed';
            this.notificationService.showToast(errorMsg, 'error');
            await window.app.uiManager.renderKanban();
          }
        }
      });
    }
  }

  /**
   * Render a special column (uncategorized/system)
   */
  renderSpecialColumn(title, bookmarks, container, folderId, type, savedBookmarkOrder) {
    const column = createElement('div', 'kanban-column');
    column.dataset.columnType = type;
    column.dataset.folderId = folderId;

    const header = this.createColumnHeader(title, bookmarks.length);
    column.appendChild(header);

    this.setupTitleEditHandling(header, column);

    const bookmarkList = createElement('div', 'bookmark-list');

    const columnStorageId = column.dataset.columnType === 'uncategorized'
      ? 'uncategorized'
      : folderId;

    if (columnStorageId && savedBookmarkOrder && savedBookmarkOrder[columnStorageId]) {
      const directBookmarks = bookmarks.filter(b => b.url);
      this.renderOrderedBookmarks(directBookmarks, bookmarkList, savedBookmarkOrder[columnStorageId]);
      bookmarks.forEach(entry => {
        if (entry.children) {
          this.renderSubfolderGroup(entry, bookmarkList, savedBookmarkOrder);
        }
      });
    } else {
      bookmarks.forEach(entry => {
        if (entry.url) {
          const bookmarkItem = this.bookmarkRenderer.createBookmarkItem(entry);
          bookmarkItem.classList.add('sortable-item', 'bookmark-item'); // FIX
          bookmarkList.appendChild(bookmarkItem);
        } else if (entry.children) {
          this.renderSubfolderGroup(entry, bookmarkList, savedBookmarkOrder);
        }
      });
    }

    column.appendChild(bookmarkList);
    container.appendChild(column);

    if (window.Sortable) {
      Sortable.create(bookmarkList, {
        animation: 150,
        group: { name: 'folder-items', pull: true, put: true },
        draggable: '.sortable-item',
        handle: '.bookmark-item, .subfolder-header',
        fallbackOnBody: true,
        swapThreshold: 0.65,
        emptyInsertThreshold: 8,

        onEnd: async (evt) => {
          const draggedEl = evt.item;
          const isBookmark = draggedEl.classList.contains('bookmark-item');
          const isSubfolder = draggedEl.classList.contains('subfolder-container');
          const itemId = isBookmark
            ? draggedEl.getAttribute('data-bookmark-id')
            : isSubfolder
            ? draggedEl.getAttribute('data-folder-id')
            : null;
          if (!itemId) return;

          const destList = evt.to;
          const destColumn = destList.closest('.kanban-column');
          if (!destColumn) {
            await window.app.uiManager.renderKanban();
            return;
          }

          let targetParentId;
          let targetIndex = evt.newIndex;
          let dropTargetName = '';

          if (destList.classList.contains('subfolder-content')) {
            const subHeader = destList.previousElementSibling;
            targetParentId = subHeader?.getAttribute('data-folder-id');
            dropTargetName = subHeader?.querySelector('.subfolder-title')?.textContent || '';
          } else {
            targetParentId = destColumn.dataset.folderId;
            dropTargetName = destColumn.querySelector('.column-title')?.textContent || '';
          }

          if (isSubfolder && itemId === targetParentId) {
            this.notificationService.showToast('Cannot drop folder on itself', 'info');
            return;
          }

          try {
            await chrome.bookmarks.move(itemId, { parentId: targetParentId, index: targetIndex });
            await window.app.uiManager.renderKanban();
            this.notificationService.showToast(`Moved to "${dropTargetName}"`, 'success');
          } catch (err) {
            this.notificationService.showToast(err?.message || 'Move failed', 'error');
            await window.app.uiManager.renderKanban();
          }
        }
      });
    }
  }

  /**
   * Header creation
   */
  createColumnHeader(title, count) {
    const header = createElement('div', 'column-header');

    const dragHandle = createElement('div', 'column-drag-handle');
    dragHandle.innerHTML = '⠿';
    dragHandle.title = 'Drag to reorder';
    header.appendChild(dragHandle);

    const titleElement = createElement('div', 'column-title');
    titleElement.textContent = title;

    const countElement = createElement('div', 'column-count');
    countElement.textContent = count;

    const actions = createElement('div', 'column-actions');
    const addSubfolderBtn = createElement('button', 'column-action add-subfolder-btn');
    addSubfolderBtn.textContent = '+';
    addSubfolderBtn.title = 'Add Subfolder';
    addSubfolderBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const col = e.currentTarget.closest('.kanban-column');
      const folderId = col?.dataset?.folderId;
      if (!folderId) return;
      const name = prompt('Subfolder name');
      if (!name) return;
      this.bookmarkManager.createFolder(folderId, name)
        .then(() => this.notificationService.showToast('Subfolder created', 'success'))
        .catch(() => this.notificationService.showToast('Failed to create subfolder', 'error'));
    });
    actions.appendChild(addSubfolderBtn);

    header.appendChild(titleElement);
    header.appendChild(countElement);
    header.appendChild(actions);
    return header;
  }

  setupTitleEditHandling(header, column) {
    header.addEventListener('dblclick', (e) => {
      if (e.target.classList.contains('column-title') || e.target.closest('.column-title')) {
        this.handleColumnTitleEdit(column);
      }
    });
  }

  handleColumnTitleEdit(columnElement) {
    const columnType = columnElement.dataset.columnType;
    const folderId = columnElement.dataset.folderId;
    const titleElement = columnElement.querySelector('.column-title');
    const originalTitle = titleElement.textContent;

    if (columnType === 'uncategorized') {
      this.notificationService.showToast(
        'Uncategorized column cannot be renamed. Drag these bookmarks to other columns to organize them.',
        'info', 5000
      );
      return;
    }

    if (folderId === '2' || folderId === '3') {
      const folderName = folderId === '2' ? 'Other Bookmarks' : 'Mobile Bookmarks';
      this.notificationService.showToast(
        `"${folderName}" is a Chrome special folder and cannot be renamed directly.`,
        'info', 5000
      );
      return;
    }

    const inputElement = document.createElement('input');
    inputElement.type = 'text';
    inputElement.className = 'column-title-edit';
    inputElement.value = originalTitle;
    inputElement.style.width = '100%';
    inputElement.style.padding = '4px';
    inputElement.style.border = '1px solid var(--primary-color)';
    inputElement.style.borderRadius = 'var(--border-radius)';
    inputElement.style.fontSize = titleElement.style.fontSize || '1.2rem';

    titleElement.style.display = 'none';
    titleElement.parentNode.insertBefore(inputElement, titleElement.nextSibling);

    inputElement.focus();
    inputElement.select();

    inputElement.addEventListener('keydown', async (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const newTitle = inputElement.value.trim();
        if (!newTitle) {
          inputElement.style.borderColor = 'var(--danger-color)';
          return;
        }
        await this.saveColumnTitle(folderId, newTitle, titleElement);
        this.finishTitleEdit(inputElement, titleElement);
      } else if (e.key === 'Escape') {
        this.finishTitleEdit(inputElement, titleElement);
      }
    });

    inputElement.addEventListener('blur', () => {
      setTimeout(() => {
        if (document.body.contains(inputElement)) {
          this.finishTitleEdit(inputElement, titleElement);
        }
      }, 100);
    });
  }

  async saveSubfolderTitle(folderId, newTitle, titleElement) {
    try {
      const result = await chrome.bookmarks.update(folderId, { title: newTitle });
      titleElement.textContent = result.title;
      this.notificationService.showToast(`Subfolder title updated to "${newTitle}"`, 'success');
      return true;
    } catch (error) {
      this.notificationService.showToast('Failed to update subfolder title', 'error');
      return false;
    }
  }

  finishTitleEdit(inputElement, titleElement) {
    titleElement.style.display = '';
    if (inputElement.parentNode) inputElement.parentNode.removeChild(inputElement);
  }

  handleSubfolderTitleEdit(titleElement, folderId) {
    console.log('Subfolder title edit initiated for folder:', folderId);
    const originalTitle = titleElement.textContent;

    const inputElement = document.createElement('input');
    inputElement.type = 'text';
    inputElement.className = 'subfolder-title-edit';
    inputElement.value = originalTitle;
    inputElement.style.width = '100%';
    inputElement.style.padding = '2px';
    inputElement.style.border = '1px solid var(--primary-color)';
    inputElement.style.borderRadius = 'var(--border-radius)';
    inputElement.style.fontSize = titleElement.style.fontSize || '0.9rem';

    titleElement.style.display = 'none';
    titleElement.parentNode.insertBefore(inputElement, titleElement.nextSibling);

    inputElement.focus();
    inputElement.select();

    inputElement.addEventListener('keydown', async (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const newTitle = inputElement.value.trim();
        if (!newTitle) {
          inputElement.style.borderColor = 'var(--danger-color)';
          return;
        }
        await this.saveSubfolderTitle(folderId, newTitle, titleElement);
        this.finishTitleEdit(inputElement, titleElement);
      } else if (e.key === 'Escape') {
        this.finishTitleEdit(inputElement, titleElement);
      }
    });

    inputElement.addEventListener('blur', () => {
      setTimeout(() => {
        if (document.body.contains(inputElement)) {
          this.finishTitleEdit(inputElement, titleElement);
        }
      }, 100);
    });
  }

  async saveColumnTitle(folderId, newTitle, titleElement) {
    try {
      const result = await chrome.bookmarks.update(folderId, { title: newTitle });
      titleElement.textContent = result.title;
      this.notificationService.showToast(`Column title updated to "${newTitle}"`, 'success');
      return true;
    } catch (error) {
      this.notificationService.showToast('Failed to update column title', 'error');
      return false;
    }
  }

  renderOrderedBookmarks(bookmarks, container, savedOrder) {
    const map = {};
    bookmarks.forEach(b => { if (b.url) map[b.id] = b; });

    savedOrder.forEach(id => {
      if (map[id]) {
        const el = this.bookmarkRenderer.createBookmarkItem(map[id]);
        el.classList.add('sortable-item', 'bookmark-item'); // FIX
        container.appendChild(el);
        delete map[id];
      }
    });

    Object.values(map).forEach(b => {
      const el = this.bookmarkRenderer.createBookmarkItem(b);
      el.classList.add('sortable-item', 'bookmark-item'); // FIX
      container.appendChild(el);
    });
  }

  renderSubfolderGroup(folder, container, savedBookmarkOrder) {
    const subfolderGroup = createElement('div', 'subfolder-group');
    const subfolderHeader = createElement('div', 'subfolder-header');
    subfolderHeader.setAttribute('data-folder-id', folder.id);

    const folderIcon = document.createElement('span');
    folderIcon.className = 'subfolder-folder-icon';
    folderIcon.textContent = '📁';
    subfolderHeader.appendChild(folderIcon);

    const subfolderToggle = createElement('button', 'subfolder-toggle-btn');
    subfolderToggle.textContent = '▼';
    const subfolderTitle = createElement('div', 'subfolder-title');
    subfolderTitle.textContent = folder.title;

    // Add double-click to rename subfolder
    subfolderTitle.addEventListener('dblclick', () => {
      this.handleSubfolderTitleEdit(subfolderTitle, folder.id);
    });

    subfolderHeader.appendChild(subfolderToggle);
    subfolderHeader.appendChild(subfolderTitle);
    subfolderGroup.appendChild(subfolderHeader);

    const subfolderContent = createElement('div', 'subfolder-content');
    const subfolderKey = `subfolder-${folder.id}`;

    if (savedBookmarkOrder && savedBookmarkOrder[subfolderKey]) {
      this.renderOrderedBookmarks(folder.children, subfolderContent, savedBookmarkOrder[subfolderKey]);
    } else if (folder.children && folder.children.length) {
      folder.children.forEach(child => {
        if (child.url) {
          const el = this.bookmarkRenderer.createBookmarkItem(child);
          el.classList.add('sortable-item', 'bookmark-item'); // FIX
          subfolderContent.appendChild(el);
        }
      });
    } else {
      const empty = createElement('div', 'subfolder-empty');
      empty.textContent = '(Empty)';
      subfolderContent.appendChild(empty);
    }

    subfolderGroup.appendChild(subfolderContent);
    container.appendChild(subfolderGroup);

    subfolderToggle.addEventListener('click', () => {
      if (subfolderContent.style.display === 'none') {
        subfolderContent.style.display = '';
        subfolderToggle.textContent = '▼';
      } else {
        subfolderContent.style.display = 'none';
        subfolderToggle.textContent = '►';
      }
    });

    if (window.Sortable) {
      Sortable.create(subfolderContent, {
        animation: 150,
        group: { name: 'folder-items', pull: true, put: true },
        draggable: '.bookmark-item',
        onEnd: async (evt) => {
          const draggedEl = evt.item;
          const id = draggedEl.getAttribute('data-bookmark-id');
          if (!id) return;
          const parentFolderId = folder.id;
          const newIndex = evt.newIndex;
          try {
            await chrome.bookmarks.move(id, { parentId: parentFolderId, index: newIndex });
            this.notificationService.showToast('Moved successfully', 'success');
          } catch (err) {
            this.notificationService.showToast('Move failed', 'error');
            await window.app.uiManager.renderKanban();
          }
        }
      });
    }
  }

  countBookmarksInFolder(folder) {
    let count = 0;
    if (folder.children) {
      folder.children.forEach(child => {
        if (child.url) count++;
        else if (child.children) count += this.countBookmarksInFolder(child);
      });
    }
    return count;
  }

  updateColumnCount(columnId) {
    const column = document.querySelector(`.kanban-column[data-folder-id="${columnId}"]`);
    if (column) {
      const bookmarkList = column.querySelector('.bookmark-list, .folder-item-list');
      const count = column.querySelector('.column-count');
      if (bookmarkList && count) {
        count.textContent = bookmarkList.children.length;
      }
    }
  }
}
