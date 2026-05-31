/**
 * Main Application Controller
 * Handles UI interactions, data management, and synchronization
 */

import { authManager } from './services/auth.js';
import { dbService } from './services/database.js';
import { appState } from './store/state.js';
import { dataRepository } from './repositories/dataRepository.js';
import { db } from './db/indexeddb.js';
import { showSuccess, showError, showWarning } from './utils/notification.js';
import { debounce, generateUID, getCurrentTimestamp, formatCurrency, formatDate, searchArray } from './utils/helpers.js';
import { CATEGORIES, CATEGORY_ICONS } from './config.js';

class HogarApp {
  constructor() {
    this.currentEditingItem = null;
    this.confirmDeleteCallback = null;
    this.searchDebounced = debounce(this.handleSearch.bind(this), 300);
  }

  /**
   * Initialize application
   */
  async init() {
    console.log('🏠 Iniciando Hogar App...');
    
    try {
      // Initialize IndexedDB
      await db.init();
      console.log('✓ IndexedDB inicializado');

      // Initialize Auth
      const authReady = await authManager.init();
      console.log('✓ Autenticación inicializada');

      // Setup listeners
      this.setupAuthListener();
      this.setupConnectivityListener();
      this.setupStateListener();

      // Check initial auth state
      if (authManager.isAuthenticated()) {
        this.showApp();
        await this.loadData();
      } else {
        this.showAuthScreen();
      }

      return true;
    } catch (error) {
      console.error('Error initializing app:', error);
      showError('Error al inicializar la aplicación');
      return false;
    }
  }

  /**
   * Setup authentication listener
   */
  setupAuthListener() {
    authManager.onAuthChange(({ event, profile }) => {
      if (event === 'authenticated') {
        console.log('✓ Usuario autenticado:', profile?.name);
        this.showApp();
        this.loadData();
        this.updateUserAvatar(profile);
      } else if (event === 'unauthenticated') {
        console.log('✓ Usuario desconectado');
        this.showAuthScreen();
        appState.reset();
      }
    });
  }

  /**
   * Setup connectivity listener
   */
  setupConnectivityListener() {
    dbService.onConnectivityChange((status) => {
      const statusEl = document.getElementById('connectivity-status');
      if (statusEl) {
        if (status === 'online') {
          statusEl.textContent = '🟢 En línea';
          statusEl.style.color = 'var(--success)';
          this.syncData();
        } else {
          statusEl.textContent = '🔴 Sin conexión';
          statusEl.style.color = 'var(--error)';
        }
      }
    });
  }

  /**
   * Setup state listener
   */
  setupStateListener() {
    appState.onChange((state) => {
      this.renderCurrentTab();
    });
  }

  /**
   * Update user avatar
   */
  updateUserAvatar(profile) {
    const avatar = document.getElementById('user-avatar');
    if (!avatar) return;

    if (profile?.picture) {
      avatar.innerHTML = `<img src="${profile.picture}" alt="Avatar">`;
    } else {
      avatar.textContent = (profile?.name || 'U')[0].toUpperCase();
    }
  }

  /**
   * Show app interface
   */
  showApp() {
    const authScreen = document.getElementById('auth-screen');
    const app = document.getElementById('app');
    
    if (authScreen) authScreen.style.display = 'none';
    if (app) app.classList.add('visible');
  }

  /**
   * Show auth screen
   */
  showAuthScreen() {
    const authScreen = document.getElementById('auth-screen');
    const app = document.getElementById('app');
    
    if (authScreen) authScreen.style.display = 'flex';
    if (app) app.classList.remove('visible');
  }

  /**
   * Load data from sheets
   */
  async loadData() {
    appState.setLoading(true);
    
    try {
      const data = await dataRepository.loadAllData();
      
      for (const [tab, items] of Object.entries(data)) {
        appState.setTabData(tab, items);
      }
      
      console.log('✓ Datos cargados exitosamente');
      showSuccess('Datos sincronizados');\n      appState.setState({ lastSync: getCurrentTimestamp() });
    } catch (error) {
      console.error('Error loading data:', error);
      showError('Error al cargar datos: ' + error.message);
      appState.setError(error.message);
    } finally {
      appState.setLoading(false);
    }
  }

  /**
   * Sync data with server
   */
  async syncData() {
    appState.setSyncing(true);
    
    try {
      await dbService.processSyncQueue();
      await this.loadData();
      showSuccess('Datos sincronizados correctamente');
    } catch (error) {
      console.error('Sync error:', error);
      showError('Error al sincronizar');
    } finally {
      appState.setSyncing(false);
    }
  }

  /**
   * Switch tab
   */
  switchTab(tabName) {
    appState.setState({ currentTab: tabName, searchQuery: '', currentFilter: 'all' });
    this.updateTabUI(tabName);
  }

  /**
   * Update tab UI
   */
  updateTabUI(tabName) {
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => item.classList.remove('active'));
    
    const activeItem = document.querySelector(`[data-tab="${tabName}"]`);
    if (activeItem) activeItem.classList.add('active');
  }

  /**
   * Handle search with debounce
   */
  handleSearch(query) {\n    appState.setState({ searchQuery: query });
    this.renderCurrentTab();
  }

  /**
   * Open add item modal
   */
  openAddModal() {
    const tab = appState.getState().currentTab;
    
    if (tab === 'dashboard') {
      showWarning('Use las pestañas específicas para agregar items');
      return;
    }

    this.currentEditingItem = null;
    this.showModal('add', tab);
  }

  /**
   * Open edit modal
   */
  openEditModal(tab, itemId) {
    const items = appState.getTabData(tab);
    const item = items.find(i => i.id === itemId);
    
    if (!item) {
      showError('Item no encontrado');
      return;
    }

    this.currentEditingItem = { ...item, tab };
    this.showModal('edit', tab, item);
  }

  /**
   * Show modal
   */
  showModal(mode, tab, item = null) {
    const overlay = document.getElementById('modal-overlay');
    const body = document.getElementById('modal-body');
    
    if (!overlay || !body) return;

    body.innerHTML = this.renderModal(mode, tab, item);
    overlay.classList.add('open');

    // Attach event listeners
    this.attachModalListeners(tab);
  }

  /**
   * Close modal\n   */\n  closeModal() {\n    const overlay = document.getElementById('modal-overlay');\n    if (overlay) overlay.classList.remove('open');\n    this.currentEditingItem = null;\n  }\n\n  /**\n   * Render modal content\n   */\n  renderModal(mode, tab, item) {\n    const meta = CATEGORIES[tab];\n    if (!meta) return '';\n\n    const isEdit = mode === 'edit';\n    const title = isEdit ? 'Editar' : 'Agregar';\n\n    let html = `\n      <div class=\"modal-handle\"></div>\n      <div class=\"modal-header\">\n        <h2 class=\"modal-title\">${title} ${meta.label}</h2>\n      </div>\n      <div class=\"modal-body\">\n    `;\n\n    if (meta.type === 'inventory') {\n      html += this.renderInventoryForm(item, meta);\n    } else if (meta.type === 'admin') {\n      html += this.renderAdminForm(item, meta);\n    } else if (meta.type === 'celular') {\n      html += this.renderCelularForm(item, meta);\n    } else if (meta.type === 'servicios') {\n      html += this.renderServiceForm(item, meta);\n    }\n\n    html += `\n        <div class=\"modal-footer\">\n          <button class=\"btn btn-secondary modal-cancel\">Cancelar</button>\n          <button class=\"btn btn-primary modal-save\">Guardar</button>\n        </div>\n      </div>\n    `;\n\n    if (isEdit) {\n      html += `<button class=\"btn-delete\" data-id=\"${item.id}\">Eliminar</button>`;\n    }\n\n    return html;\n  }\n\n  /**\n   * Render inventory form\n   */\n  renderInventoryForm(item, meta) {\n    const name = item?.name || '';\n    const category = item?.category || '';\n    const location = item?.location || '';\n    const quantity = item?.quantity || '';\n    const unit = item?.unit || 'unidades';\n    const available = item?.available !== false;\n\n    return `\n      <div class=\"form-group\">\n        <label>Nombre *</label>\n        <input type=\"text\" class=\"form-input\" name=\"name\" value=\"${name}\" required>\n        <div class=\"form-error\" style=\"display:none;\"></div>\n      </div>\n      <div class=\"form-group\">\n        <label>Categoría *</label>\n        <select class=\"form-input\" name=\"category\" required>\n          <option value=\"\">Seleccionar...</option>\n          ${meta.cats.map(c => `<option value=\"${c}\" ${c === category ? 'selected' : ''}>${c}</option>`).join('')}\n        </select>\n      </div>\n      <div class=\"form-group\">\n        <label>Ubicación</label>\n        <select class=\"form-input\" name=\"location\">\n          <option value=\"\">Seleccionar...</option>\n          ${meta.locs.map(l => `<option value=\"${l}\" ${l === location ? 'selected' : ''}>${l}</option>`).join('')}\n        </select>\n      </div>\n      <div class=\"row2\">\n        <div class=\"form-group\">\n          <label>Cantidad *</label>\n          <input type=\"number\" class=\"form-input\" name=\"quantity\" value=\"${quantity}\" min=\"0\" required>\n        </div>\n        <div class=\"form-group\">\n          <label>Unidad *</label>\n          <select class=\"form-input\" name=\"unit\" required>\n            ${meta.units.map(u => `<option value=\"${u}\" ${u === unit ? 'selected' : ''}>${u}</option>`).join('')}\n          </select>\n        </div>\n      </div>\n      <div class=\"form-group\">\n        <label>\n          <input type=\"checkbox\" name=\"available\" ${available ? 'checked' : ''}>\n          Disponible\n        </label>\n      </div>\n    `;\n  }\n\n  /**\n   * Render admin form\n   */\n  renderAdminForm(item, meta) {\n    const name = item?.name || '';\n    const category = item?.category || '';\n    const amount = item?.amount || '';\n    const date = item?.date || '';\n    const status = item?.status || 'paid';\n\n    return `\n      <div class=\"form-group\">\n        <label>Concepto *</label>\n        <input type=\"text\" class=\"form-input\" name=\"name\" value=\"${name}\" required>\n      </div>\n      <div class=\"form-group\">\n        <label>Categoría *</label>\n        <select class=\"form-input\" name=\"category\" required>\n          <option value=\"\">Seleccionar...</option>\n          ${meta.cats.map(c => `<option value=\"${c}\" ${c === category ? 'selected' : ''}>${c}</option>`).join('')}\n        </select>\n      </div>\n      <div class=\"row2\">\n        <div class=\"form-group\">\n          <label>Valor *</label>\n          <input type=\"number\" class=\"form-input\" name=\"amount\" value=\"${amount}\" min=\"0\" required>\n        </div>\n        <div class=\"form-group\">\n          <label>Fecha</label>\n          <input type=\"date\" class=\"form-input\" name=\"date\" value=\"${date}\">\n        </div>\n      </div>\n      <div class=\"form-group\">\n        <label>Estado</label>\n        <select class=\"form-input\" name=\"status\">\n          <option value=\"paid\" ${status === 'paid' ? 'selected' : ''}>Pagado</option>\n          <option value=\"pending\" ${status === 'pending' ? 'selected' : ''}>Pendiente</option>\n        </select>\n      </div>\n    `;\n  }\n\n  /**\n   * Render celular form\n   */\n  renderCelularForm(item, meta) {\n    const name = item?.name || '';\n    const category = item?.category || '';\n    const carrier = item?.carrier || '';\n    const amount = item?.amount || '';\n    const dataplan = item?.dataplan || '';\n    const dueDate = item?.dueDate || '';\n    const status = item?.status || 'active';\n\n    return `\n      <div class=\"form-group\">\n        <label>Propietario *</label>\n        <input type=\"text\" class=\"form-input\" name=\"name\" value=\"${name}\" required>\n      </div>\n      <div class=\"form-group\">\n        <label>Tipo *</label>\n        <select class=\"form-input\" name=\"category\" required>\n          ${meta.cats.map(c => `<option value=\"${c}\" ${c === category ? 'selected' : ''}>${c}</option>`).join('')}\n        </select>\n      </div>\n      <div class=\"row2\">\n        <div class=\"form-group\">\n          <label>Valor</label>\n          <input type=\"number\" class=\"form-input\" name=\"amount\" value=\"${amount}\" min=\"0\">\n        </div>\n        <div class=\"form-group\">\n          <label>Plan de datos</label>\n          <input type=\"text\" class=\"form-input\" name=\"dataplan\" value=\"${dataplan}\" placeholder=\"ej: 10GB\">\n        </div>\n      </div>\n      <div class=\"row2\">\n        <div class=\"form-group\">\n          <label>Operador</label>\n          <input type=\"text\" class=\"form-input\" name=\"carrier\" value=\"${carrier}\">\n        </div>\n        <div class=\"form-group\">\n          <label>Fecha pago</label>\n          <input type=\"date\" class=\"form-input\" name=\"dueDate\" value=\"${dueDate}\">\n        </div>\n      </div>\n      <div class=\"form-group\">\n        <label>Estado</label>\n        <select class=\"form-input\" name=\"status\">\n          <option value=\"active\" ${status === 'active' ? 'selected' : ''}>Activo</option>\n          <option value=\"inactive\" ${status === 'inactive' ? 'selected' : ''}>Inactivo</option>\n        </select>\n      </div>\n    `;\n  }\n\n  /**\n   * Render service form\n   */\n  renderServiceForm(item, meta) {\n    const name = item?.name || '';\n    const category = item?.category || '';\n    const unit = item?.unit || '';\n\n    return `\n      <div class=\"form-group\">\n        <label>Servicio *</label>\n        <input type=\"text\" class=\"form-input\" name=\"name\" value=\"${name}\" required>\n      </div>\n      <div class=\"form-group\">\n        <label>Tipo *</label>\n        <select class=\"form-input\" name=\"category\" required>\n          ${meta.cats.map(c => `<option value=\"${c}\" ${c === category ? 'selected' : ''}>${c}</option>`).join('')}\n        </select>\n      </div>\n      <div class=\"form-group\">\n        <label>Unidad</label>\n        <input type=\"text\" class=\"form-input\" name=\"unit\" value=\"${unit}\" placeholder=\"ej: kWh, m3\">\n      </div>\n    `;\n  }\n\n  /**\n   * Attach modal event listeners\n   */\n  attachModalListeners(tab) {\n    const cancelBtn = document.querySelector('.modal-cancel');\n    const saveBtn = document.querySelector('.modal-save');\n    const deleteBtn = document.querySelector('.btn-delete');\n\n    if (cancelBtn) cancelBtn.addEventListener('click', () => this.closeModal());\n    if (saveBtn) saveBtn.addEventListener('click', () => this.handleSaveItem(tab));\n    if (deleteBtn) {\n      deleteBtn.addEventListener('click', () => this.handleDeleteItem(tab, deleteBtn.dataset.id));\n    }\n  }\n\n  /**\n   * Handle save item\n   */\n  async handleSaveItem(tab) {\n    const formInputs = document.querySelectorAll('.form-input');\n    const item = {};\n\n    formInputs.forEach(input => {\n      if (input.type === 'checkbox') {\n        item[input.name] = input.checked;\n      } else {\n        item[input.name] = input.value;\n      }\n    });\n\n    if (this.currentEditingItem?.id) {\n      item.id = this.currentEditingItem.id;\n    }\n\n    try {\n      // Validate before saving\n      const saveBtn = document.querySelector('.modal-save');\n      saveBtn.disabled = true;\n      saveBtn.innerHTML = '<span class=\"spinner\"></span>';\n\n      const saved = await dataRepository.saveInventoryItem(tab, item);\n      \n      if (this.currentEditingItem?.id) {\n        appState.updateItem(tab, saved.id, saved);\n        showSuccess('Item actualizado');\n      } else {\n        appState.addItem(tab, saved);\n        showSuccess('Item agregado');\n      }\n\n      this.closeModal();\n    } catch (error) {\n      showError(error.message);\n    } finally {\n      const saveBtn = document.querySelector('.modal-save');\n      if (saveBtn) {\n        saveBtn.disabled = false;\n        saveBtn.innerHTML = 'Guardar';\n      }\n    }\n  }\n\n  /**\n   * Handle delete item with confirmation\n   */\n  handleDeleteItem(tab, itemId) {\n    const item = appState.getTabData(tab).find(i => i.id === itemId);\n    if (!item) return;\n\n    const confirmed = confirm(`¿Eliminar \"${item.name}\"? Esta acción no se puede deshacer.`);\n    \n    if (confirmed) {\n      this.deleteItem(tab, itemId);\n    }\n  }\n\n  /**\n   * Delete item\n   */\n  async deleteItem(tab, itemId) {\n    try {\n      const allItems = appState.getTabData(tab);\n      await dataRepository.deleteInventoryItem(tab, itemId, allItems);\n      appState.removeItem(tab, itemId);\n      showSuccess('Item eliminado');\n      this.closeModal();\n    } catch (error) {\n      showError('Error al eliminar: ' + error.message);\n    }\n  }\n\n  /**\n   * Render current tab\n   */\n  renderCurrentTab() {\n    const state = appState.getState();\n    const tab = state.currentTab;\n    const content = document.getElementById('content');\n    \n    if (!content) return;\n\n    if (tab === 'dashboard') {\n      content.innerHTML = this.renderDashboard();\n    } else {\n      content.innerHTML = this.renderTabView();\n    }\n  }\n\n  /**\n   * Render dashboard\n   */\n  renderDashboard() {\n    const state = appState.getState();\n    let html = '<div class=\"dashboard\">';\n\n    // Summary cards\n    html += `\n      <div class=\"stats-row\">\n        <div class=\"stat-card\">\n          <div class=\"stat-label\">Total Items</div>\n          <div class=\"stat-value\">${state.data.despensa.length + state.data.aseo_hogar.length + state.data.aseo_personal.length}</div>\n        </div>\n        <div class=\"stat-card\">\n          <div class=\"stat-label\">Servicios</div>\n          <div class=\"stat-value\">${state.data.servicios.length}</div>\n        </div>\n        <div class=\"stat-card\">\n          <div class=\"stat-label\">Administración</div>\n          <div class=\"stat-value\">${state.data.admin.length}</div>\n        </div>\n        <div class=\"stat-card\">\n          <div class=\"stat-label\">Celulares</div>\n          <div class=\"stat-value\">${state.data.celular.length}</div>\n        </div>\n      </div>\n    `;\n\n    // Quick actions\n    html += `\n      <h3>Acciones rápidas</h3>\n      <div class=\"quick-actions\">\n        ${Object.entries(CATEGORIES).filter(([k, v]) => k !== 'dashboard').map(([key, meta]) => `\n          <button class=\"action-card\" onclick=\"app.switchTab('${key}')\">\n            <span class=\"icon\">${meta.icon}</span>\n            <span class=\"label\">${meta.label}</span>\n          </button>\n        `).join('')}\n      </div>\n    `;\n\n    html += '</div>';\n    return html;\n  }\n\n  /**\n   * Render tab view\n   */\n  renderTabView() {\n    const state = appState.getState();\n    const tab = state.currentTab;\n    const items = state.data[tab];\n    const meta = CATEGORIES[tab];\n    \n    if (!meta) return '<p>Tab no encontrado</p>';\n\n    let html = `\n      <div class=\"tab-view\">\n        <div class=\"search-bar-container\">\n          <input type=\"text\" class=\"search-bar\" placeholder=\"Buscar...\" value=\"${state.searchQuery}\">\n        </div>\n    `;\n\n    // Render items\n    if (items.length === 0) {\n      html += '<div class=\"empty\"><div class=\"empty-icon\">📭</div><p>No hay items</p></div>';\n    } else {\n      html += '<div class=\"items-list\">';\n      items.forEach(item => {\n        html += this.renderItemRow(tab, item, meta);\n      });\n      html += '</div>';\n    }\n\n    html += '</div>';\n    return html;\n  }\n\n  /**\n   * Render item row\n   */\n  renderItemRow(tab, item, meta) {\n    const icon = CATEGORY_ICONS[item.category] || '📦';\n    \n    return `\n      <div class=\"item-row\" onclick=\"app.openEditModal('${tab}', '${item.id}')\">\n        <span class=\"item-icon\">${icon}</span>\n        <div class=\"item-info\">\n          <div class=\"item-name\">${item.name}</div>\n          <div class=\"item-meta\">${item.category}${item.quantity ? ' • ' + item.quantity + ' ' + item.unit : ''}</div>\n        </div>\n      </div>\n    `;\n  }\n\n  /**\n   * Register event handlers\n   */\n  registerEventHandlers() {\n    // Tab switching\n    document.querySelectorAll('[data-tab]').forEach(btn => {\n      btn.addEventListener('click', () => {\n        const tab = btn.dataset.tab;\n        this.switchTab(tab);\n      });\n    });\n\n    // Search with debounce\n    const searchBar = document.querySelector('.search-bar');\n    if (searchBar) {\n      searchBar.addEventListener('input', (e) => {\n        this.searchDebounced(e.target.value);\n      });\n    }\n\n    // FAB button\n    const fab = document.getElementById('fab');\n    if (fab) {\n      fab.addEventListener('click', () => this.openAddModal());\n      fab.style.display = this.appState?.getState()?.currentTab !== 'dashboard' ? 'flex' : 'none';\n    }\n\n    // Auth buttons\n    document.querySelectorAll('[onclick*=\"signIn\"]').forEach(btn => {\n      btn.addEventListener('click', () => authManager.signIn());\n    });\n\n    document.querySelectorAll('[onclick*=\"signOut\"]').forEach(btn => {\n      btn.addEventListener('click', () => authManager.signOut());\n    });\n\n    // Sync button\n    document.querySelectorAll('[onclick*=\"syncAll\"]').forEach(btn => {\n      btn.addEventListener('click', () => this.syncData());\n    });\n  }\n}\n\n// Export singleton\nexport const app = new HogarApp();
