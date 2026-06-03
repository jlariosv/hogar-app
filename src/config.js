/**
 * Configuration module
 * Contains all app constants and settings
 */

// Firebase Configuration
export const FIREBASE_CONFIG = {
  apiKey: "AIzaSyBrl3i8DjjinGAomcrx_Uh0SxKQ5le5jgs",
  authDomain: "hogar-app-725df.firebaseapp.com",
  projectId: "hogar-app-725df",
  storageBucket: "hogar-app-725df.firebasestorage.app",
  messagingSenderId: "232601561952",
  appId: "1:232601561952:web:f6421ffec4d18ad4098c05",
  measurementId: "G-7VZQ6EZ0YT"
};

export const CONFIG = {
  // Authentication
  AUTH_CODE: '030405', // Código de acceso
  SESSION_KEY: 'hogar_session',
  SESSION_TIMEOUT: 24 * 60 * 60 * 1000, // 24 horas

  // API
  API_TIMEOUT: 10000, // 10 segundos
  
  // Storage
  STORAGE_PREFIX: 'hogar_',
  MAX_STORAGE_SIZE: 5242880, // 5MB
  
  // UI
  TOAST_DURATION: 3000, // 3 segundos
  ANIMATION_DURATION: 300, // 300ms
  
  // Features
  ENABLE_PWA: true,
  ENABLE_OFFLINE: true,
  ENABLE_NOTIFICATIONS: true,
  ENABLE_FIREBASE: true,
  
  // Validation
  MIN_TITLE_LENGTH: 1,
  MAX_TITLE_LENGTH: 100,
  MAX_DESCRIPTION_LENGTH: 500,
};

/**
 * App constants
 */
export const CONSTANTS = {
  TASKS: {
    STATUS: {
      PENDING: 'pending',
      IN_PROGRESS: 'in_progress',
      COMPLETED: 'completed',
      CANCELLED: 'cancelled',
    },
    PRIORITY: {
      LOW: 'low',
      MEDIUM: 'medium',
      HIGH: 'high',
    },
  },
  STORAGE: {
    TASKS: 'tasks',
    USER: 'user',
    SETTINGS: 'settings',
  },
};

/**
 * Default app state
 */
export const DEFAULT_STATE = {
  user: null,
  tasks: [],
  settings: {
    theme: 'light',
    notifications: true,
    language: 'es',
  },
};

export default CONFIG;
