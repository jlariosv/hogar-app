/**
 * UI Manager Module
 * Handles all user interface updates and interactions
 */

import { CONFIG } from '../config.js';

export class UIManager {
  constructor(app) {
    this.app = app;
    this.toasts = [];
  }

  /**
   * Show authentication screen
   */
  showAuth() {
    const authScreen = document.getElementById('auth-screen');
    const appContainer = document.getElementById('app');
    const authCode = document.getElementById('auth-code');
    
    if (authScreen) authScreen.classList.remove('hidden');
    if (appContainer) appContainer.classList.remove('visible');
    if (authCode) authCode.value = ''; // Clear input
  }

  /**
   * Show main app
   */
  showApp() {
    const authScreen = document.getElementById('auth-screen');
    const appContainer = document.getElementById('app');
    
    if (authScreen) authScreen.classList.add('hidden');
    if (appContainer) appContainer.classList.add('visible');
  }

  /**
   * Show toast notification
   */
  showToast(message, type = 'info', duration = CONFIG.TOAST_DURATION) {
    const container = document.getElementById('toast-container');
    if (!container) return;
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    // Add icon based on type
    const icons = {
      success: '✅',
      error: '❌',
      info: 'ℹ️',
      warning: '⚠️',
    };
    
    toast.textContent = `${icons[type] || ''} ${message}`;
    container.appendChild(toast);
    
    // Auto remove
    setTimeout(() => {
      toast.remove();
    }, duration);
  }

  /**
   * Show error message
   */
  showError(message) {
    this.showToast(message, 'error');
  }

  /**
   * Toggle theme (light/dark)
   */
  toggleTheme() {
    const html = document.documentElement;
    const isDark = html.getAttribute('data-theme') === 'dark';
    const newTheme = isDark ? 'light' : 'dark';
    
    html.setAttribute('data-theme', newTheme);
    this.app.state.settings.theme = newTheme;
    this.app.storage.setItem('theme', newTheme);
    
    this.showToast(`Tema ${newTheme === 'dark' ? 'oscuro' : 'claro'}`, 'info');
  }

  /**
   * Show modal
   */
  showModal(title, content, actions = []) {
    const overlay = document.getElementById('modal-overlay');
    const modalContent = document.getElementById('modal-content');
    
    if (!overlay || !modalContent) return;
    
    let html = `<div class="modal-header">${title}</div><div class="modal-body">${content}</div>`;
    
    if (actions.length > 0) {
      html += '<div class="modal-footer">';
      actions.forEach(action => {
        html += `<button class="btn btn-${action.style || 'secondary'}" data-action="${action.id}">${action.label}</button>`;
      });
      html += '</div>';
    }
    
    modalContent.innerHTML = html;
    overlay.classList.add('show');
    
    // Add event listeners to action buttons
    actions.forEach(action => {
      const btn = modalContent.querySelector(`[data-action="${action.id}"]`);
      if (btn && action.callback) {
        btn.addEventListener('click', () => {
          action.callback();
          this.closeModal();
        });
      }
    });
  }

  /**
   * Close modal
   */
  closeModal() {
    const overlay = document.getElementById('modal-overlay');
    if (overlay) overlay.classList.remove('show');
  }

  /**
   * Update main content
   */
  updateContent(html) {
    const mainContent = document.getElementById('main-content');
    if (mainContent) {
      mainContent.innerHTML = html;
    }
  }

  /**
   * Show loading state
   */
  showLoading() {
    const mainContent = document.getElementById('main-content');
    if (mainContent) {
      mainContent.innerHTML = '<div class="empty-state"><div class="spinner">⏳</div></div>';
    }
  }

  /**
   * Show empty state
   */
  showEmpty(icon = '📋', title = 'Sin tareas', subtitle = 'Crea una nueva tarea para comenzar') {
    const mainContent = document.getElementById('main-content');
    if (mainContent) {
      mainContent.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">${icon}</div>
          <div class="empty-text">${title}</div>
          <div class="empty-sub">${subtitle}</div>
        </div>
      `;
    }
  }
}
