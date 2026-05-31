/**
 * Data repository - Business logic layer
 */

import { dbService } from '../services/database.js';
import { db } from '../db/indexeddb.js';
import { generateUID, getCurrentTimestamp } from '../utils/helpers.js';
import { validateInventoryItem, validateAdminItem, validateCelularItem, validateServiceItem } from '../utils/validation.js';
import { CATEGORIES } from '../config.js';

class DataRepository {
  /**
   * Load all data from sheets
   */
  async loadAllData() {
    const result = {
      despensa: [],
      aseo_hogar: [],
      aseo_personal: [],
      servicios: [],
      admin: [],
      celular: []
    };

    try {
      // Load inventory data
      for (const [tab, meta] of Object.entries(CATEGORIES)) {
        if (meta.type === 'dashboard') continue;

        const headers = this.getHeaders(meta.type);
        await dbService.ensureSheet(meta.sheet, headers);

        const rows = await dbService.getSheetRange(`${meta.sheet}!A2:Z`);
        
        if (meta.type === 'inventory') {
          result[tab] = rows
            .filter(r => r[0])
            .map(r => ({
              id: r[0] || '',
              name: r[1] || '',
              category: r[2] || '',
              location: r[3] || '',
              quantity: r[4] || '0',
              unit: r[5] || 'unidades',
              available: r[6] === 'true',
              updated: r[7] || ''
            }));
        } else if (meta.type === 'servicios') {
          result[tab] = rows
            .filter(r => r[0])
            .map(r => ({
              id: r[0] || '',
              name: r[1] || '',
              category: r[2] || '',
              unit: r[3] || '',
              updated: r[4] || '',
              records: []
            }));

          // Load service records
          for (const service of result[tab]) {
            const recSheet = `Svc_${service.id}`;
            try {
              const recHeaders = ['ID', 'Mes', 'Fecha', 'Consumo', 'Costo'];
              await dbService.ensureSheet(recSheet, recHeaders);
              const recRows = await dbService.getSheetRange(`${recSheet}!A2:E`);
              service.records = recRows
                .filter(r => r[0])
                .map(r => ({
                  id: r[0],
                  month: r[1],
                  date: r[2],
                  consumption: r[3],
                  cost: r[4]
                }));
            } catch (error) {
              console.warn(`Failed to load records for service ${service.id}:`, error);
              service.records = [];
            }
          }
        } else if (meta.type === 'admin') {
          result[tab] = rows
            .filter(r => r[0])
            .map(r => ({
              id: r[0],
              name: r[1],
              category: r[2],
              amount: r[3],
              date: r[4],
              status: r[5] || 'paid',
              updated: r[6]
            }));
        } else if (meta.type === 'celular') {
          result[tab] = rows
            .filter(r => r[0])
            .map(r => ({
              id: r[0],
              name: r[1],
              category: r[2],
              carrier: r[3],
              amount: r[4],
              dataplan: r[5],
              dueDate: r[6],
              status: r[7] || 'active',
              updated: r[8]
            }));
        }
      }

      // Cache in IndexedDB
      for (const [tab, items] of Object.entries(result)) {
        if (items.length > 0) {
          await db.saveBatch('items', items.map(item => ({ ...item, tab })));
        }
      }

      return result;
    } catch (error) {
      console.error('Error loading data:', error);
      throw error;
    }
  }

  /**
   * Save inventory item
   */
  async saveInventoryItem(tab, item) {
    const validation = validateInventoryItem(item);
    if (!validation.isValid) {
      throw new Error(Object.values(validation.errors)[0]);
    }

    const meta = CATEGORIES[tab];
    const id = item.id || generateUID();
    const now = getCurrentTimestamp();
    const row = [id, item.name, item.category, item.location, item.quantity, item.unit, String(item.available), now];

    const idx = item.id ? 1 : -1;

    if (item.id) {
      await dbService.updateSheet(`${meta.sheet}!A${idx + 2}:H${idx + 2}`, [row]);
    } else {
      await dbService.appendToSheet(meta.sheet, [row]);
    }

    return { ...item, id, updated: now };
  }

  /**
   * Delete inventory item
   */
  async deleteInventoryItem(tab, id, allItems) {
    const meta = CATEGORIES[tab];
    const remaining = allItems.filter(i => i.id !== id);

    await dbService.clearSheet(`${meta.sheet}!A2:Z`);
    
    if (remaining.length > 0) {
      const rows = remaining.map(i => [
        i.id, i.name, i.category, i.location || '', i.quantity, i.unit, String(i.available), i.updated || ''
      ]);
      await dbService.appendToSheet(meta.sheet, rows);
    }

    await db.delete('items', id);
  }

  /**
   * Get headers based on type
   */
  getHeaders(type) {
    const headersMap = {
      inventory: ['ID', 'Nombre', 'Categoría', 'Ubicación', 'Cantidad', 'Unidad', 'Disponible', 'Actualizado'],
      servicios: ['ID', 'Nombre', 'Categoría', 'Unidad', 'Actualizado'],
      admin: ['ID', 'Nombre', 'Categoría', 'Valor', 'Fecha', 'Estado', 'Actualizado'],
      celular: ['ID', 'Nombre', 'Categoría', 'Operador', 'Valor', 'Datos', 'FechaPago', 'Estado', 'Actualizado']
    };
    return headersMap[type] || [];
  }
}

export const dataRepository = new DataRepository();