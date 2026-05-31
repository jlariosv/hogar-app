/**
 * Database service layer
 * Handles data persistence with fallback to IndexedDB for offline support
 */

import { db } from '../db/indexeddb.js';
import { authManager } from './auth.js';
import { showError } from './notification.js';
import { retry } from '../utils/helpers.js';

const SHEET_ID = '1XI6pIg1VhUhYUfIKS45o1uNYfe25ntapU2ilE_VN7Rc';

class DatabaseService {
  constructor() {
    this.isOnline = navigator.onLine;
    this.syncQueue = [];
    this.listeners = new Set();
    
    // Setup online/offline handlers
    window.addEventListener('online', () => this.onOnline());
    window.addEventListener('offline', () => this.onOffline());
  }

  /**
   * Check if online
   */
  onOnline() {
    this.isOnline = true;
    this.notifyListeners('online');
    this.syncQueue.length > 0 && this.processSyncQueue();
  }

  /**
   * Handle going offline
   */
  onOffline() {
    this.isOnline = false;
    this.notifyListeners('offline');
  }

  /**
   * Get sheet range
   */
  async getSheetRange(range) {
    if (!authManager.isAuthenticated()) {
      throw new Error('Not authenticated');
    }

    return retry(
      () => this.fetchSheetData(range),
      {
        maxAttempts: 3,
        delayMs: 1000,
        onError: (error, attempt) => {
          console.warn(`Retry attempt ${attempt} for range ${range}:`, error);
        }
      }
    );
  }

  /**
   * Fetch sheet data from Google Sheets API
   */
  async fetchSheetData(range) {
    const token = authManager.getToken();
    if (!token) throw new Error('No access token');

    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent(range)}`,
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch sheet: ${response.statusText}`);
    }

    const data = await response.json();
    return data.values || [];
  }

  /**
   * Append to sheet
   */
  async appendToSheet(sheetName, values) {
    if (!authManager.isAuthenticated()) {
      await db.queueSync({ type: 'append', sheetName, values });
      return;
    }

    const token = authManager.getToken();
    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent(sheetName)}!A1:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ values })
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to append to sheet: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Update sheet range
   */
  async updateSheet(range, values) {
    if (!authManager.isAuthenticated()) {
      await db.queueSync({ type: 'update', range, values });
      return;
    }

    const token = authManager.getToken();
    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent(range)}?valueInputOption=RAW`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ values })
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to update sheet: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Clear sheet range
   */
  async clearSheet(range) {
    if (!authManager.isAuthenticated()) {
      await db.queueSync({ type: 'clear', range });
      return;
    }

    const token = authManager.getToken();
    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent(range)}:clear`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to clear sheet: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Ensure sheet exists
   */
  async ensureSheet(sheetName, headers) {
    if (!authManager.isAuthenticated()) return;

    try {
      const token = authManager.getToken();
      
      // Get spreadsheet metadata
      const metaResponse = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const metadata = await metaResponse.json();
      const sheetExists = metadata.sheets?.some(s => s.properties.title === sheetName);

      if (!sheetExists) {
        // Create new sheet
        const createResponse = await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}:batchUpdate`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              requests: [{ addSheet: { properties: { title: sheetName } } }]
            })
          }
        );

        if (!createResponse.ok) {
          throw new Error('Failed to create sheet');
        }

        // Add headers
        await this.appendToSheet(sheetName, [headers]);
      }
    } catch (error) {
      showError(`Error al asegurar hoja: ${error.message}`);
      throw error;
    }
  }

  /**
   * Process sync queue
   */
  async processSyncQueue() {
    if (!this.isOnline || !authManager.isAuthenticated()) return;

    const queue = await db.getSyncQueue();
    
    for (const item of queue) {
      try {
        switch (item.type) {
          case 'append':
            await this.appendToSheet(item.sheetName, item.values);
            break;
          case 'update':
            await this.updateSheet(item.range, item.values);
            break;
          case 'clear':
            await this.clearSheet(item.range);
            break;
        }
        await db.removeSyncQueue(item.id);
      } catch (error) {
        console.error('Sync error:', error);
        showError('Error al sincronizar datos');
      }
    }
  }

  /**
   * Subscribe to connectivity changes
   */
  onConnectivityChange(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Notify listeners
   */
  notifyListeners(status) {
    this.listeners.forEach(listener => {
      try {
        listener(status);
      } catch (error) {
        console.error('Listener error:', error);
      }
    });
  }
}

export const dbService = new DatabaseService();