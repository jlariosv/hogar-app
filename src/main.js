/**
 * Application Entry Point
 * Initializes and starts the Hogar App
 */

import { app } from './app.js';
import './styles/theme.css';

// Make app globally available for inline onclick handlers
window.app = app;

/**
 * Initialize app when DOM is ready
 */
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
  });
} else {
  initializeApp();
}

async function initializeApp() {
  console.log('🚀 Hogar App starting...');
  const success = await app.init();
  
  if (!success) {
    console.error('❌ Failed to initialize app');
  } else {
    console.log('✅ App initialized successfully');
  }
}
