/**
 * Authentication Module
 * Handles user authentication and session management
 */

import { CONFIG, CONSTANTS } from '../config.js';

export class AuthManager {
  constructor(app) {
    this.app = app;
  }

  /**
   * Handle user login
   */
  async handleLogin() {
    const codeInput = document.getElementById('auth-code');
    const errorDiv = document.getElementById('auth-error');
    const loadingDiv = document.getElementById('auth-loading');
    const authBtn = document.getElementById('auth-btn');
    
    if (!codeInput) return;
    
    const code = codeInput.value.trim();
    
    // Clear previous errors
    if (errorDiv) errorDiv.classList.remove('show');
    if (loadingDiv) loadingDiv.classList.remove('show');
    
    // Validate input
    if (!code || code.length !== 6) {
      this.showError('El código debe tener 6 dígitos');
      return;
    }
    
    try {
      // Show loading
      if (loadingDiv) loadingDiv.classList.add('show');
      if (authBtn) authBtn.disabled = true;
      
      // Verify code
      await this.verifyCode(code);
      
      // Success
      this.app.state.user = {
        id: 'user_' + Date.now(),
        authenticated: true,
        loginTime: Date.now(),
      };
      
      // Save session
      this.app.storage.setItem(CONFIG.SESSION_KEY, {
        user: this.app.state.user,
        timestamp: Date.now(),
      });
      
      // Initialize Firebase real-time listener
      if (this.app.firebase) {
        await this.app.firebase.loadTasksRealtime((tasks) => {
          this.app.state.tasks = tasks;
          this.app.tasks.renderTasks();
        });
      }
      
      // Show app
      this.app.ui.showApp();
      this.app.ui.showToast('¡Bienvenido!', 'success');
      
      // Load tasks
      await this.app.tasks.loadTasks();
    } catch (error) {
      console.error('Login error:', error);
      this.showError(error.message || 'Error de autenticación');
    } finally {
      if (loadingDiv) loadingDiv.classList.remove('show');
      if (authBtn) authBtn.disabled = false;
    }
  }

  /**
   * Verify authentication code
   */
  async verifyCode(code) {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (code === CONFIG.AUTH_CODE) {
          resolve(true);
        } else {
          reject(new Error('Código de acceso incorrecto'));
        }
      }, 500); // Simulate network delay
    });
  }

  /**
   * Handle user logout
   */
  handleLogout() {
    if (confirm('¿Estás seguro de que deseas cerrar sesión?')) {
      // Unsubscribe from Firebase updates
      if (this.app.firebase) {
        this.app.firebase.unsubscribeFromUpdates();
      }
      
      // Clear state
      this.app.state.user = null;
      this.app.state.tasks = [];
      
      // Clear storage
      this.app.storage.removeItem(CONFIG.SESSION_KEY);
      
      // Show auth screen
      this.app.ui.showAuth();
      this.app.ui.showToast('Sesión cerrada', 'info');
    }
  }

  /**
   * Show error message
   */
  showError(message) {
    const errorDiv = document.getElementById('auth-error');
    if (errorDiv) {
      errorDiv.textContent = message;
      errorDiv.classList.add('show');
    }
  }
}
