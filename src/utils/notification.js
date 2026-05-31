/**
 * Notification system for toasts and alerts
 */

import { TOAST_DURATION } from '../config.js';

class NotificationManager {
  constructor() {
    this.activeToasts = new Map();
    this.toastQueue = [];
    this.isProcessingQueue = false;
  }

  /**
   * Show toast notification
   */
  show(message, options = {}) {
    const {
      type = 'info',
      duration = TOAST_DURATION,
      action = null,
      dismissible = true
    } = options;

    const id = `toast-${Date.now()}-${Math.random()}`;
    const toast = { id, message, type, duration, action, dismissible };

    this.toastQueue.push(toast);
    this.processQueue();

    return id;
  }

  /**
   * Show success toast
   */
  success(message, options = {}) {
    return this.show(message, { ...options, type: 'success' });
  }

  /**
   * Show error toast
   */
  error(message, options = {}) {
    return this.show(message, { ...options, type: 'error', duration: TOAST_DURATION * 1.5 });
  }

  /**
   * Show warning toast
   */
  warning(message, options = {}) {
    return this.show(message, { ...options, type: 'warning' });
  }

  /**
   * Show info toast
   */
  info(message, options = {}) {
    return this.show(message, { ...options, type: 'info' });
  }

  /**
   * Process toast queue
   */
  async processQueue() {
    if (this.isProcessingQueue || this.toastQueue.length === 0) return;

    this.isProcessingQueue = true;

    while (this.toastQueue.length > 0) {
      const toast = this.toastQueue.shift();
      await this.displayToast(toast);
    }

    this.isProcessingQueue = false;
  }

  /**
   * Display single toast
   */
  async displayToast(toast) {
    const toastEl = this.createToastElement(toast);
    
    const container = this.getOrCreateContainer();
    container.appendChild(toastEl);
    this.activeToasts.set(toast.id, toastEl);

    requestAnimationFrame(() => {
      toastEl.classList.add('show');
    });

    if (toast.duration > 0) {
      await new Promise(resolve => setTimeout(resolve, toast.duration));
      await this.dismiss(toast.id);
    }
  }

  /**
   * Create toast element
   */
  createToastElement(toast) {
    const el = document.createElement('div');
    el.className = `toast toast-${toast.type}`;
    el.id = toast.id;
    el.setAttribute('role', 'alert');
    el.setAttribute('aria-live', 'polite');

    let html = `
      <div class="toast-content">
        <div class="toast-icon">${this.getIcon(toast.type)}</div>
        <div class="toast-message">${this.escapeHtml(toast.message)}</div>
    `;

    if (toast.action) {
      html += `<button class="toast-action">${toast.action.label}</button>`;
    }

    if (toast.dismissible) {
      html += `<button class="toast-close" aria-label="Cerrar">&times;</button>`;
    }

    html += '</div>';
    el.innerHTML = html;

    const closeBtn = el.querySelector('.toast-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.dismiss(toast.id));
    }

    const actionBtn = el.querySelector('.toast-action');
    if (actionBtn && toast.action?.onClick) {
      actionBtn.addEventListener('click', () => {
        toast.action.onClick();
        this.dismiss(toast.id);
      });
    }

    return el;
  }

  /**
   * Dismiss toast
   */
  async dismiss(id) {
    const el = this.activeToasts.get(id);
    if (!el) return;

    el.classList.remove('show');
    await new Promise(resolve => setTimeout(resolve, 300));
    
    el.remove();
    this.activeToasts.delete(id);
  }

  /**
   * Get toast icon
   */
  getIcon(type) {
    const icons = { success: '✓', error: '✕', warning: '⚠', info: 'ⓘ' };
    return icons[type] || '•';
  }

  /**
   * Escape HTML to prevent XSS
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Get or create toast container
   */
  getOrCreateContainer() {
    let container = document.getElementById('toast-container');
    
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    return container;
  }
}

export const notificationManager = new NotificationManager();
export const showToast = (message, options) => notificationManager.show(message, options);
export const showSuccess = (message, options) => notificationManager.success(message, options);
export const showError = (message, options) => notificationManager.error(message, options);
export const showWarning = (message, options) => notificationManager.warning(message, options);
export const showInfo = (message, options) => notificationManager.info(message, options);