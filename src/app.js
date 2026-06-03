/**
 * Main Application Module
 * Orchestrates the entire application
 */

import { CONFIG, CONSTANTS, DEFAULT_STATE } from './config.js';
import { StorageManager } from './utils/storage.js';
import { AuthManager } from './modules/auth.js';
import { UIManager } from './modules/ui.js';
import { TaskManager } from './modules/tasks.js';
import { FirebaseManager } from './modules/firebase.js';

export class App {
  constructor() {
    this.state = { ...DEFAULT_STATE };
    this.storage = new StorageManager();
    this.auth = new AuthManager(this);
    this.ui = new UIManager(this);
    this.tasks = new TaskManager(this);
    this.firebase = new FirebaseManager(this);
  }

  /**
   * Initialize the application
   */
  async init() {
    try {
      console.log('🚀 Inicializando aplicación...');
      
      // Initialize Firebase
      await this.firebase.init();
      
      // Restore session
      const session = this.storage.getItem(CONFIG.SESSION_KEY);
      if (session && !this.isSessionExpired(session)) {
        this.state.user = session.user;
        this.ui.showApp();
        
        // Set up real-time listener for tasks
        if (this.firebase.initialized) {
          await this.firebase.loadTasksRealtime((tasks) => {
            this.state.tasks = tasks;
            this.tasks.renderTasks();
          });
        } else {
          await this.tasks.loadTasks();
        }
        
        console.log('✅ Sesión restaurada');
      } else {
        this.ui.showAuth();
        console.log('📝 Esperando autenticación');
      }
      
      // Setup event listeners
      this.setupEventListeners();
      
      // Register service worker if PWA is enabled
      if (CONFIG.ENABLE_PWA && 'serviceWorker' in navigator) {
        this.registerServiceWorker();
      }
      
      console.log('✅ Aplicación inicializada correctamente');
    } catch (error) {
      console.error('❌ Error inicializando la aplicación:', error);
      this.ui.showError('Error al inicializar la aplicación');
    }
  }

  /**
   * Setup global event listeners
   */
  setupEventListeners() {
    // Auth events
    const authBtn = document.getElementById('auth-btn');
    const authInput = document.getElementById('auth-code');
    
    if (authBtn) {
      authBtn.addEventListener('click', () => this.auth.handleLogin());
    }
    
    if (authInput) {
      authInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') this.auth.handleLogin();
      });
    }
    
    // App events (only when authenticated)
    if (this.state.user) {
      const logoutBtn = document.getElementById('logout-btn');
      const addTaskBtn = document.getElementById('add-task-btn');
      const themeToggle = document.getElementById('theme-toggle');
      
      if (logoutBtn) {
        logoutBtn.addEventListener('click', () => this.auth.handleLogout());
      }
      
      if (addTaskBtn) {
        addTaskBtn.addEventListener('click', () => this.tasks.openAddModal());
      }
      
      if (themeToggle) {
        themeToggle.addEventListener('click', () => this.ui.toggleTheme());
      }
    }
    
    // Window events
    window.addEventListener('beforeunload', () => this.saveState());
    window.addEventListener('online', () => this.handleOnline());
    window.addEventListener('offline', () => this.handleOffline());
  }

  /**
   * Check if session is expired
   */
  isSessionExpired(session) {
    if (!session || !session.timestamp) return true;
    const now = Date.now();
    return now - session.timestamp > CONFIG.SESSION_TIMEOUT;
  }

  /**
   * Save application state
   */
  saveState() {
    try {
      if (this.state.user) {
        this.storage.setItem(CONFIG.SESSION_KEY, {
          user: this.state.user,
          timestamp: Date.now(),
        });
      }
      this.storage.setItem(CONSTANTS.STORAGE.SETTINGS, this.state.settings);
    } catch (error) {
      console.error('Error guardando estado:', error);
    }
  }

  /**
   * Register service worker for PWA
   */
  async registerServiceWorker() {
    try {
      const registration = await navigator.serviceWorker.register('sw.js');
      console.log('✅ Service Worker registrado:', registration);
      
      // Check for updates periodically
      setInterval(() => {
        registration.update().catch(err => console.warn('SW update check failed:', err));
      }, 60000); // Check every minute
    } catch (error) {
      console.warn('⚠️ Error registrando Service Worker:', error);
    }
  }

  /**
   * Handle online event
   */
  handleOnline() {
    console.log('🌐 Conexión en línea');
    this.ui.showToast('En línea', 'success');
    // Sync tasks if needed
    if (this.tasks && typeof this.tasks.loadTasks === 'function') {
      this.tasks.loadTasks().catch(err => console.error('Sync error:', err));
    }
  }

  /**
   * Handle offline event
   */
  handleOffline() {
    console.log('📡 Sin conexión');
    this.ui.showToast('Sin conexión - Trabajando sin conexión', 'warning');
  }
}
