/**
 * Bookmark Manager Class
 * Handles all operations related to Chrome Bookmarks API
 */
export class BookmarkManager {
  constructor() {
    this.bookmarkTree = null; // Cache
    this.changeListener = null;
    this.removeListener = null;

    // Keep refs so we can remove listeners
    this._handlers = {
      created: this.handleBookmarkCreated.bind(this),
      moved: this.handleBookmarkMoved.bind(this),
      changed: this.handleBookmarkChanged.bind(this),
      removed: this.handleBookmarkRemoved.bind(this)
    };
  }

  /**
   * Initialize bookmark change listeners
   */
  initializeChangeListener() {
    // Remove old listeners first (avoid double binding)
    chrome.bookmarks.onCreated.removeListener(this._handlers.created);
    chrome.bookmarks.onMoved.removeListener(this._handlers.moved);
    chrome.bookmarks.onChanged.removeListener(this._handlers.changed);
    chrome.bookmarks.onRemoved.removeListener(this._handlers.removed);

    // Add fresh ones
    chrome.bookmarks.onCreated.addListener(this._handlers.created);
    chrome.bookmarks.onMoved.addListener(this._handlers.moved);
    chrome.bookmarks.onChanged.addListener(this._handlers.changed);
    chrome.bookmarks.onRemoved.addListener(this._handlers.removed);
  }

  /* ---------- EVENT HANDLERS ---------- */

  handleBookmarkCreated(id, node) {
    this.refreshBookmarkTree(); // Always refresh cache
  }

  handleBookmarkMoved(id, moveInfo) {
    this.refreshBookmarkTree();
  }

  handleBookmarkChanged(id, changeInfo) {
    this.refreshBookmarkTree();
  }

  handleBookmarkRemoved(id, removeInfo) {
    this.refreshBookmarkTree();
    if (this.removeListener) this.removeListener(id);
  }

  /* ---------- CORE API WRAPPERS ---------- */

  async refreshBookmarkTree() {
    try {
      const tree = await this.getBookmarkTree();
      this.bookmarkTree = tree;
      if (this.changeListener) this.changeListener();
    } catch (e) {
      console.error('Failed to refresh bookmark tree:', e);
    }
  }

  getBookmarkTree() {
    if (typeof chrome === 'undefined' || !chrome.bookmarks?.getTree) {
      return Promise.resolve(this._getMockTree());
    }

    return new Promise((resolve) => {
      chrome.bookmarks.getTree((tree) => {
        if (chrome.runtime?.lastError) {
          console.error('chrome.bookmarks.getTree error:', chrome.runtime.lastError);
          resolve(this._getMockTree());
        } else {
          resolve(tree);
        }
      });
    });
  }

  _getMockTree() {
    return [
      {
        id: '0',
        title: '',
        children: [
          {
            id: '1',
            title: 'Bookmarks Bar',
            children: [
              { id: '10', title: 'Frontend', children: [
                { id: '101', title: 'MDN Web Docs', url: 'https://developer.mozilla.org/' },
                { id: '102', title: 'React', url: 'https://react.dev/' }
              ]},
              { id: '11', title: 'Backend', children: [
                { id: '111', title: 'Node.js', url: 'https://nodejs.org/' },
                { id: '112', title: 'Express', url: 'https://expressjs.com/' }
              ]},
              { id: '120', title: 'Cursor', url: 'https://cursor.sh/' },
              { id: '121', title: 'GitHub', url: 'https://github.com/' }
            ]
          },
          { id: '2', title: 'Other Bookmarks', children: [
            { id: '201', title: 'YouTube', url: 'https://www.youtube.com/' }
          ] },
          { id: '3', title: 'Mobile Bookmarks', children: [] }
        ]
      }
    ];
  }

  async getBookmarkBarContents() {
    const tree = await this.getBookmarkTree();
    const bar = tree[0].children.find(c => c.id === '1');
    return bar ? bar.children : [];
  }

  moveBookmark(id, destination) {
    return new Promise((resolve, reject) => {
      chrome.bookmarks.move(id, destination, (res) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          this.refreshBookmarkTree();
          resolve(res);
        }
      });
    });
  }

  updateBookmark(id, changes) {
    return new Promise((resolve, reject) => {
      chrome.bookmarks.update(id, changes, (res) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          this.refreshBookmarkTree();
          resolve(res);
        }
      });
    });
  }

  deleteBookmark(id) {
    return new Promise((resolve, reject) => {
      chrome.bookmarks.remove(id, () => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          this.refreshBookmarkTree();
          resolve();
        }
      });
    });
  }

  createBookmark(bookmark) {
    return new Promise((resolve, reject) => {
      chrome.bookmarks.create(bookmark, (res) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          this.refreshBookmarkTree();
          resolve(res);
        }
      });
    });
  }

  async createFolder(parentId, title) {
    const folder = await this.createBookmark({ parentId, title });
    await this.refreshBookmarkTree();
    return folder;
  }

  async getFolders() {
    const tree = await this.getBookmarkTree();
    const folders = [];
    const walk = (node) => {
      if (node.children) {
        folders.push({ id: node.id, title: node.title, parentId: node.parentId });
        node.children.forEach(walk);
      }
    };
    tree.forEach(walk);
    return folders;
  }

  /* ---------- LISTENER SETTERS ---------- */

  setChangeListener(cb) {
    this.changeListener = cb;
  }

  setRemoveListener(cb) {
    this.removeListener = cb;
  }
}
