/**
 * Utility helper functions
 */

import { DATE_FORMAT_OPTIONS, CURRENCY_FORMAT, TIMEZONE, DEBOUNCE_DELAYS } from '../config.js';

/**
 * Generate unique ID
 */
export function generateUID() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

/**
 * Get current timestamp
 */
export function getCurrentTimestamp() {
  return new Date().toLocaleString('es-CO', DATE_FORMAT_OPTIONS.full);
}

/**
 * Get current date string (YYYY-MM-DD)
 */
export function getCurrentDateString() {
  const now = new Date();
  return now.toISOString().split('T')[0];
}

/**
 * Format number as currency
 */
export function formatCurrency(amount) {
  return new Intl.NumberFormat('es-CO', CURRENCY_FORMAT).format(parseFloat(amount) || 0);
}

/**
 * Format date for display
 */
export function formatDate(dateString, format = 'date') {
  if (!dateString) return '—';
  
  try {
    const date = new Date(dateString);
    return date.toLocaleString('es-CO', DATE_FORMAT_OPTIONS[format] || DATE_FORMAT_OPTIONS.date);
  } catch {
    return dateString;
  }
}

/**
 * Get month-year string for grouping (YYYY-MM)
 */
export function getMonthKey(dateString) {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    return date.toISOString().slice(0, 7);
  } catch {
    return '';
  }
}

/**
 * Debounce function
 */
export function debounce(func, delay = DEBOUNCE_DELAYS.search) {
  let timeoutId;
  
  return function debounced(...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(this, args), delay);
  };
}

/**
 * Throttle function
 */
export function throttle(func, delay) {
  let lastCallTime = 0;
  let timeoutId;
  
  return function throttled(...args) {
    const now = Date.now();
    const timeSinceLastCall = now - lastCallTime;
    
    if (timeSinceLastCall >= delay) {
      lastCallTime = now;
      func.apply(this, args);
    } else {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        lastCallTime = Date.now();
        func.apply(this, args);
      }, delay - timeSinceLastCall);
    }
  };
}

/**
 * Deep clone object
 */
export function deepClone(obj) {
  if (obj === null || typeof obj !== 'object') return obj;
  
  if (obj instanceof Date) return new Date(obj.getTime());
  if (obj instanceof Array) return obj.map(item => deepClone(item));
  if (obj instanceof Object) {
    const cloned = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        cloned[key] = deepClone(obj[key]);
      }
    }
    return cloned;
  }
}

/**
 * Compare two objects for equality
 */
export function isEqual(obj1, obj2) {
  if (obj1 === obj2) return true;
  if (obj1 == null || obj2 == null) return false;
  if (typeof obj1 !== 'object' || typeof obj2 !== 'object') return false;
  
  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);
  
  if (keys1.length !== keys2.length) return false;
  
  for (const key of keys1) {
    if (!keys2.includes(key)) return false;
    if (!isEqual(obj1[key], obj2[key])) return false;
  }
  
  return true;
}

/**
 * Group array by key
 */
export function groupBy(array, key) {
  return array.reduce((result, item) => {
    const group = item[key];
    if (!result[group]) result[group] = [];
    result[group].push(item);
    return result;
  }, {});
}

/**
 * Filter array by multiple conditions
 */
export function filterByConditions(array, conditions) {
  return array.filter(item => {
    for (const [key, value] of Object.entries(conditions)) {
      if (item[key] !== value) return false;
    }
    return true;
  });
}

/**
 * Search array by multiple fields
 */
export function searchArray(array, query, searchFields) {
  if (!query) return array;
  
  const lowerQuery = query.toLowerCase();
  return array.filter(item => 
    searchFields.some(field => 
      String(item[field] || '').toLowerCase().includes(lowerQuery)
    )
  );
}

/**
 * Sort array by multiple keys with direction
 */
export function sortByKeys(array, sortConfig) {
  return [...array].sort((a, b) => {
    for (const { key, direction } of sortConfig) {
      const aVal = a[key];
      const bVal = b[key];
      
      if (aVal < bVal) return direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return direction === 'asc' ? 1 : -1;
    }
    return 0;
  });
}

/**
 * Parse error message
 */
export function parseError(error) {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  if (error?.message) {
    return error.message;
  }
  return 'Error desconocido';
}

/**
 * Retry function with exponential backoff
 */
export async function retry(fn, options = {}) {
  const {
    maxAttempts = 3,
    delayMs = 1000,
    backoffMultiplier = 2,
    onError = null
  } = options;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxAttempts) {
        throw error;
      }
      
      const delayTime = delayMs * Math.pow(backoffMultiplier, attempt - 1);
      
      if (onError) {
        onError(error, attempt, delayTime);
      }
      
      await new Promise(resolve => setTimeout(resolve, delayTime));
    }
  }
}

/**
 * Check if device is mobile
 */
export function isMobileDevice() {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

/**
 * Check if online
 */
export function isOnline() {
  return navigator.onLine;
}

/**
 * Get browser storage (with fallback)
 */
export function getStorage() {
  try {
    localStorage.setItem('test', 'test');
    localStorage.removeItem('test');
    return localStorage;
  } catch {
    // Fallback to sessionStorage or in-memory storage
    return {
      data: {},
      getItem(key) { return this.data[key] || null; },
      setItem(key, value) { this.data[key] = value; },
      removeItem(key) { delete this.data[key]; },
      clear() { this.data = {}; }
    };
  }
}
