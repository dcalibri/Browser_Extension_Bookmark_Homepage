// js/modules/dragManager.js
import { storageManager } from './storageManager.js';

export class DragManager {
  constructor(bookmarkManager, uiManager) {
    this.bookmarkManager = bookmarkManager;
    this.uiManager = uiManager;
    this.sortableInstances = new Map();
    this.isDragging = false;
  }

  initialize() {
    // Bersihin instance lama biar gak dobel
    this.destroy();

    // Pastikan DOM sudah render
    setTimeout(() => {
      this.initializeColumnDrag();
      this.initializeBookmarkDrag();
    }, 100);
  }

  /* =========================
   * COLUMN DRAG (reorder columns)
   * ========================= */
  initializeColumnDrag() {
    const kanbanBoard = document.querySelector('.kanban-board');
    if (!kanbanBoard) return;

    if (typeof Sortable === 'undefined') {
      console.error('Sortable library not loaded!');
      return;
    }

    const columnSortable = Sortable.create(kanbanBoard, {
      animation: 150,
      draggable: '.kanban-column',
      handle: '.column-header',
      ghostClass: 'column-ghost',
      chosenClass: 'column-chosen',
      dragClass: 'column-drag',
      forceFallback: true,
      fallbackOnBody: true,

      onStart: () => { this.isDragging = true; },
      onEnd: () => {
        this.isDragging = false;
        this.saveColumnOrder();
      }
    });

    this.sortableInstances.set('board', columnSortable);
  }

  /* =========================
   * BOOKMARK DRAG (within/between columns & subfolders)
   * ========================= */
  initializeBookmarkDrag() {
    // Ambil SEMUA container yang bisa berisi bookmark
    const containers = document.querySelectorAll(
      '.bookmark-list, .folder-item-list, .subfolder-content'
    );

    containers.forEach(container => {
      const instance = Sortable.create(container, {
        animation: 150,
        group: { name: 'bookmarks', pull: true, put: true }, // cross column/subfolder OK
        draggable: '.bookmark-item',                         // pastikan elemen bookmark punya class ini
        handle: '.bookmark-item',                            // drag di kartu bookmark
        filter: '.bookmark-action, .bookmark-action *, .subfolder-toggle-btn', // klik tombol = bukan drag
        preventOnFilter: true,
        ghostClass: 'bookmark-ghost',
        chosenClass: 'bookmark-chosen',
        dragClass: 'bookmark-drag',
        forceFallback: true,
        fallbackOnBody: true,
        swapThreshold: 0.65,
        emptyInsertThreshold: 8,

        onStart: () => { this.isDragging = true; },

        onEnd: async (evt) => {
          this.isDragging = false;

          // Abaikan jika bukan bookmark (shouldn't happen karena draggable di-limit)
          const el = evt.item;
          const bookmarkId = el?.dataset?.bookmarkId;
          if (!bookmarkId) {
            // kalau yang di-drag bukan .bookmark-item, biarin
            return;
          }

          try {
            await this.handleBookmarkMove(evt);
            this.saveBookmarkOrder();
          } catch (e) {
            console.error('Move failed:', e);
            // re-render dari source of truth
            await this.uiManager.renderKanban();
          }
        }
      });

      // Simpan instance untuk cleanup
      const parentColumn = container.closest('.kanban-column');
      const fid = parentColumn?.dataset?.folderId;
      const key = fid ? `list-${fid}-${this.sortableInstances.size}` : `list-${this.sortableInstances.size}`;
      this.sortableInstances.set(key, instance);
    });
  }

  /**
   * Pindahin bookmark sesuai destinasi (column root / subfolder)
   */
  async handleBookmarkMove(evt) {
    const el = evt.item;
    const bookmarkId = el.dataset.bookmarkId;
    const destList = evt.to;
    const destColumn = destList.closest('.kanban-column');
    if (!destColumn) return;

    let parentId;
    const newIndex = evt.newIndex;

    if (destList.classList.contains('subfolder-content')) {
      // Dropped ke dalam subfolder
      const subHeader = destList.previousElementSibling; // .subfolder-header
      parentId = subHeader?.getAttribute('data-folder-id');
    } else {
      // Dropped ke root column
      const type = destColumn.dataset.columnType;
      if (type === 'uncategorized') {
        // contoh: kamu map ke Bookmarks Bar id '1'
        parentId = '1';
      } else {
        parentId = destColumn.dataset.folderId;
      }
    }

    if (!parentId) {
      // kalau gak ketemu parent, re-render biar aman
      await this.uiManager.renderKanban();
      return;
    }

    // Pindahin di Chrome Bookmarks
    await this.bookmarkManager.moveBookmark(bookmarkId, {
      parentId,
      index: newIndex
    });
  }

  /* =========================
   * SAVE ORDERS
   * ========================= */
  saveColumnOrder() {
    const columns = document.querySelectorAll('.kanban-board > .kanban-column');
    if (columns.length === 0) return;
    storageManager.saveColumnOrder(columns);
  }

  saveBookmarkOrder() {
    const orders = storageManager.collectBookmarkOrderFromDOM();
    storageManager.saveBookmarkOrder(orders);
  }

  /* =========================
   * CLEANUP & REINIT
   * ========================= */
  destroy() {
    this.sortableInstances.forEach((inst) => {
      try { inst?.destroy?.(); } catch {}
    });
    this.sortableInstances.clear();
    this.isDragging = false;
  }

  reinitialize() {
    this.destroy();
    setTimeout(() => this.initialize(), 100);
  }
}
