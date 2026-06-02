/**
 * Configuration module
 * Contains all app constants and settings
 */

export const CONFIG = {
  // Authentication
  AUTH_CODE: '123456', // Código de acceso (cambiar en producción)
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
