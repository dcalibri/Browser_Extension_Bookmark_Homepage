/**
 * Website Icon Loader
 * Loads real website favicons first, fallback to Google API, then default
 */
import { siteChecker } from './siteChecker.js';

export class FaviconLoader {
  constructor() {
    this.iconCache = new Map();
    this.failedHosts = new Set();
    this.defaultIcon = 'icons/default-favicon.png'; // pakai file lokal default
    this.observer = null;
  }

  initialize() {
    if (this.observer) this.observer.disconnect();

    this.observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const iconElement = entry.target;
          if (iconElement.dataset.loaded !== 'true' && iconElement.dataset.hostname) {
            this.loadIcon(iconElement, iconElement.dataset.hostname);
          } else {
            this.observer.unobserve(iconElement);
          }
        }
      });
    }, { rootMargin: '100px' });

    document.querySelectorAll('.bookmark-icon').forEach(icon => {
      if (icon.dataset.loaded !== 'true') {
        this.observer.observe(icon);
      }
    });

    return this;
  }

  /**
   * Load icon
   */
  async loadIcon(iconElement, hostname) {
    if (this.iconCache.has(hostname)) {
      this.updateIconWithCache(iconElement, hostname);
      return;
    }

    try {
      const iconUrl = await this.tryLoadIcon(hostname);
      if (iconUrl) {
        this.iconCache.set(hostname, iconUrl);
        this.updateIconStatus(iconElement, true, iconUrl);
        return;
      }

      // If no icon found → default
      this.updateIconStatus(iconElement, false, this.defaultIcon);

    } catch (err) {
      console.error(`Favicon load failed for ${hostname}`, err);
      this.updateIconStatus(iconElement, false, this.defaultIcon);
    }
  }

  /**
   * Try to load icon from actual website first, then Google, then default
   */
  async tryLoadIcon(hostname) {
    const urls = [
      `https://${hostname}/favicon.ico`,
      `https://${hostname}/apple-touch-icon.png`,
    ];

    // Test real site favicon first
    for (const url of urls) {
      if (await this.checkImageAvailable(url)) {
        return url;
      }
    }

    // Fallback: Google favicon service
    const googleUrl = `https://www.google.com/s2/favicons?sz=64&domain=${hostname}`;
    if (await this.checkImageAvailable(googleUrl)) {
      return googleUrl;
    }

    // No luck → return null
    return null;
  }

  checkImageAvailable(url) {
    return new Promise((resolve) => {
      const img = new Image();
      let done = false;

      img.onload = () => { if (!done) { done = true; resolve(true); } };
      img.onerror = () => { if (!done) { done = true; resolve(false); } };
      img.src = url;

      setTimeout(() => { if (!done) resolve(false); }, 3000);
    });
  }

  updateIconStatus(element, ok, iconUrl) {
    element.src = iconUrl;
    element.dataset.loaded = 'true';
    const bookmarkItem = element.closest('.bookmark-item');
    if (bookmarkItem) {
      bookmarkItem.dataset.siteStatus = ok ? 'available' : 'unavailable';
    }
    this.observer.unobserve(element);
  }

  updateIconWithCache(element, hostname) {
    const iconUrl = this.iconCache.get(hostname) || this.defaultIcon;
    this.updateIconStatus(element, true, iconUrl);
  }

  prepareIconElement(icon, url) {
    try {
      const domain = new URL(url).hostname;
      icon.dataset.hostname = domain;
      icon.classList.add('bookmark-icon');
      icon.src = this.defaultIcon; // sementara default
    } catch {
      icon.src = this.defaultIcon;
    }
  }

  destroy() {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
  }
}

export const faviconLoader = new FaviconLoader();
