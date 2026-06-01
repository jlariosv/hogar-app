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
      await db.init();
      console.log('✓ IndexedDB inicializado');

      const authReady = await authManager.init();
      console.log('✓ Autenticación inicializada');

      this.setupAuthListener();
      this.setupConnectivityListener();
      this.setupStateListener();

      if (authManager.isAuthenticated()) {
        this.showApp();
        await this.loadData();
      } else {
        this.showAuthScreen();
      }

      this.registerEventHandlers();
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
    const appEl = document.getElementById('app');
    
    if (authScreen) authScreen.style.display = 'none';
    if (appEl) appEl.classList.add('visible');
  }

  /**
   * Show auth screen
   */
  showAuthScreen() {
    const authScreen = document.getElementById('auth-screen');
    const appEl = document.getElementById('app');
    
    if (authScreen) authScreen.style.display = 'flex';
    if (appEl) appEl.classList.remove('visible');
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
      showSuccess('Datos sincronizados');
      appState.setState({ lastSync: getCurrentTimestamp() });
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
  handleSearch(query) {
    appState.setState({ searchQuery: query });
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

    this.attachModalListeners(tab);
  }

  /**
   * Close modal
   */
  closeModal() {
    const overlay = document.getElementById('modal-overlay');
    if (overlay) overlay.classList.remove('open');
    this.currentEditingItem = null;
  }

  /**
   * Render modal content
   */
  renderModal(mode, tab, item) {
    const meta = CATEGORIES[tab];
    if (!meta) return '';

    const isEdit = mode === 'edit';
    const title = isEdit ? 'Editar' : 'Agregar';

    let html = `
      <div class="modal-handle"></div>
      <div class="modal-header">
        <h2 class="modal-title">${title} ${meta.label}</h2>
      </div>
      <div class="modal-body">
    `;

    if (meta.type === 'inventory') {
      html += this.renderInventoryForm(item, meta);
    } else if (meta.type === 'admin') {
      html += this.renderAdminForm(item, meta);
    } else if (meta.type === 'celular') {
      html += this.renderCelularForm(item, meta);
    } else if (meta.type === 'servicios') {
      html += this.renderServiceForm(item, meta);
    }

    html += `
        <div class="modal-footer">
          <button class="btn btn-secondary modal-cancel">Cancelar</button>
          <button class="btn btn-primary modal-save">Guardar</button>
        </div>
      </div>
    `;

    if (isEdit) {
      html += `<button class="btn btn-error modal-delete" data-id="${item.id}">Eliminar</button>`;
    }

    return html;
  }

  /**
   * Render inventory form
   */
  renderInventoryForm(item, meta) {
    const name = item?.name || '';
    const category = item?.category || '';
    const location = item?.location || '';
    const quantity = item?.quantity || '';
    const unit = item?.unit || 'unidades';
    const available = item?.available !== false;

    return `
      <div class="form-group">
        <label>Nombre *</label>
        <input type="text" class="form-input" name="name" value="${name}" required>
      </div>
      <div class="form-group">
        <label>Categoría *</label>
        <select class="form-input" name="category" required>
          <option value="">Seleccionar...</option>
          ${meta.cats.map(c => `<option value="${c}" ${c === category ? 'selected' : ''}>${c}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label>Ubicación</label>
        <select class="form-input" name="location">
          <option value="">Seleccionar...</option>
          ${meta.locs.map(l => `<option value="${l}" ${l === location ? 'selected' : ''}>${l}</option>`).join('')}
        </select>
      </div>
      <div class="row2">
        <div class="form-group">
          <label>Cantidad *</label>
          <input type="number" class="form-input" name="quantity" value="${quantity}" min="0" required>
        </div>
        <div class="form-group">
          <label>Unidad *</label>
          <select class="form-input" name="unit" required>
            ${meta.units.map(u => `<option value="${u}" ${u === unit ? 'selected' : ''}>${u}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="form-group">
        <label>
          <input type="checkbox" name="available" ${available ? 'checked' : ''}>
          Disponible
        </label>
      </div>
    `;
  }

  /**
   * Render admin form
   */
  renderAdminForm(item, meta) {
    const name = item?.name || '';
    const category = item?.category || '';
    const amount = item?.amount || '';
    const date = item?.date || '';
    const status = item?.status || 'paid';

    return `
      <div class="form-group">
        <label>Concepto *</label>
        <input type="text" class="form-input" name="name" value="${name}" required>
      </div>
      <div class="form-group">
        <label>Categoría *</label>
        <select class="form-input" name="category" required>
          <option value="">Seleccionar...</option>
          ${meta.cats.map(c => `<option value="${c}" ${c === category ? 'selected' : ''}>${c}</option>`).join('')}
        </select>
      </div>
      <div class="row2">
        <div class="form-group">
          <label>Valor *</label>
          <input type="number" class="form-input" name="amount" value="${amount}" min="0" required>
        </div>
        <div class="form-group">
          <label>Fecha</label>
          <input type="date" class="form-input" name="date" value="${date}">
        </div>
      </div>
      <div class="form-group">
        <label>Estado</label>
        <select class="form-input" name="status">
          <option value="paid" ${status === 'paid' ? 'selected' : ''}>Pagado</option>
          <option value="pending" ${status === 'pending' ? 'selected' : ''}>Pendiente</option>
        </select>
      </div>
    `;
  }

  /**
   * Render celular form
   */
  renderCelularForm(item, meta) {
    const name = item?.name || '';
    const category = item?.category || '';
    const carrier = item?.carrier || '';
    const amount = item?.amount || '';
    const dataplan = item?.dataplan || '';
    const dueDate = item?.dueDate || '';
    const status = item?.status || 'active';

    return `
      <div class="form-group">
        <label>Propietario *</label>
        <input type="text" class="form-input" name="name" value="${name}" required>
      </div>
      <div class="form-group">
        <label>Tipo *</label>
        <select class="form-input" name="category" required>
          ${meta.cats.map(c => `<option value="${c}" ${c === category ? 'selected' : ''}>${c}</option>`).join('')}
        </select>
      </div>
      <div class="row2">
        <div class="form-group">
          <label>Valor</label>
          <input type="number" class="form-input" name="amount" value="${amount}" min="0">
        </div>
        <div class="form-group">
          <label>Plan de datos</label>
          <input type="text" class="form-input" name="dataplan" value="${dataplan}" placeholder="ej: 10GB">
        </div>
      </div>
      <div class="row2">
        <div class="form-group">
          <label>Operador</label>
          <input type="text" class="form-input" name="carrier" value="${carrier}">
        </div>
        <div class="form-group">
          <label>Fecha pago</label>
          <input type="date" class="form-input" name="dueDate" value="${dueDate}">
        </div>
      </div>
      <div class="form-group">
        <label>Estado</label>
        <select class="form-input" name="status">
          <option value="active" ${status === 'active' ? 'selected' : ''}>Activo</option>
          <option value="inactive" ${status === 'inactive' ? 'selected' : ''}>Inactivo</option>
        </select>
      </div>
    `;
  }

  /**
   * Render service form
   */
  renderServiceForm(item, meta) {
    const name = item?.name || '';
    const category = item?.category || '';
    const unit = item?.unit || '';

    return `
      <div class="form-group">
        <label>Servicio *</label>
        <input type="text" class="form-input" name="name" value="${name}" required>
      </div>
      <div class="form-group">
        <label>Tipo *</label>
        <select class="form-input" name="category" required>
          ${meta.cats.map(c => `<option value="${c}" ${c === category ? 'selected' : ''}>${c}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label>Unidad</label>
        <input type="text" class="form-input" name="unit" value="${unit}" placeholder="ej: kWh, m3">
      </div>
    `;
  }

  /**
   * Attach modal event listeners
   */
  attachModalListeners(tab) {
    const cancelBtn = document.querySelector('.modal-cancel');
    const saveBtn = document.querySelector('.modal-save');
    const deleteBtn = document.querySelector('.modal-delete');

    if (cancelBtn) cancelBtn.addEventListener('click', () => this.closeModal());
    if (saveBtn) saveBtn.addEventListener('click', () => this.handleSaveItem(tab));
    if (deleteBtn) {
      deleteBtn.addEventListener('click', () => this.handleDeleteItem(tab, deleteBtn.dataset.id));
    }
  }

  /**
   * Handle save item
   */
  async handleSaveItem(tab) {
    const formInputs = document.querySelectorAll('.form-input');
    const item = {};

    formInputs.forEach(input => {
      if (input.type === 'checkbox') {
        item[input.name] = input.checked;
      } else {
        item[input.name] = input.value;
      }
    });

    if (this.currentEditingItem?.id) {
      item.id = this.currentEditingItem.id;
    }

    try {
      const saveBtn = document.querySelector('.modal-save');
      saveBtn.disabled = true;
      saveBtn.innerHTML = '<span class="spinner"></span>';

      const saved = await dataRepository.saveInventoryItem(tab, item);
      
      if (this.currentEditingItem?.id) {
        appState.updateItem(tab, saved.id, saved);
        showSuccess('Item actualizado');
      } else {
        appState.addItem(tab, saved);
        showSuccess('Item agregado');
      }

      this.closeModal();
    } catch (error) {
      showError(error.message);
    } finally {
      const saveBtn = document.querySelector('.modal-save');
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.innerHTML = 'Guardar';
      }
    }
  }

  /**
   * Handle delete item with confirmation
   */
  handleDeleteItem(tab, itemId) {
    const item = appState.getTabData(tab).find(i => i.id === itemId);
    if (!item) return;

    const confirmed = confirm(`¿Eliminar "${item.name}"? Esta acción no se puede deshacer.`);
    
    if (confirmed) {
      this.deleteItem(tab, itemId);
    }
  }

  /**
   * Delete item
   */
  async deleteItem(tab, itemId) {
    try {
      const allItems = appState.getTabData(tab);
      await dataRepository.deleteInventoryItem(tab, itemId, allItems);
      appState.removeItem(tab, itemId);
      showSuccess('Item eliminado');
      this.closeModal();
    } catch (error) {
      showError('Error al eliminar: ' + error.message);
    }
  }

  /**
   * Render current tab
   */
  renderCurrentTab() {
    const state = appState.getState();
    const tab = state.currentTab;
    const content = document.getElementById('content');
    
    if (!content) return;

    if (tab === 'dashboard') {
      content.innerHTML = this.renderDashboard();
    } else {
      content.innerHTML = this.renderTabView();
    }
  }

  /**
   * Render dashboard
   */
  renderDashboard() {
    const state = appState.getState();
    let html = '<div class="dashboard">';

    html += `
      <div class="stats-row">
        <div class="stat-card">
          <div class="stat-label">Total Items</div>
          <div class="stat-value">${state.data.despensa.length + state.data.aseo_hogar.length + state.data.aseo_personal.length}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Servicios</div>
          <div class="stat-value">${state.data.servicios.length}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Administración</div>
          <div class="stat-value">${state.data.admin.length}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Celulares</div>
          <div class="stat-value">${state.data.celular.length}</div>
        </div>
      </div>
    `;

    html += '</div>';
    return html;
  }

  /**
   * Render tab view
   */
  renderTabView() {
    const state = appState.getState();
    const tab = state.currentTab;
    const items = state.data[tab];
    const meta = CATEGORIES[tab];
    
    if (!meta) return '<p>Tab no encontrado</p>';

    let html = `
      <div class="tab-view">
        <div class="search-bar-container">
          <input type="text" class="search-bar" placeholder="Buscar..." value="${state.searchQuery}">
        </div>
    `;

    if (items.length === 0) {
      html += '<div class="empty"><div class="empty-icon">📭</div><p>No hay items</p></div>';
    } else {
      html += '<div class="items-list">';
      items.forEach(item => {
        html += this.renderItemRow(tab, item, meta);
      });
      html += '</div>';
    }

    html += '</div>';
    return html;
  }

  /**
   * Render item row
   */
  renderItemRow(tab, item, meta) {
    const icon = CATEGORY_ICONS[item.category] || '📦';
    
    return `
      <div class="item-row" onclick="window.app.openEditModal('${tab}', '${item.id}')">
        <span class="item-icon">${icon}</span>
        <div class="item-info">
          <div class="item-name">${item.name}</div>
          <div class="item-meta">${item.category}${item.quantity ? ' • ' + item.quantity + ' ' + item.unit : ''}</div>
        </div>
      </div>
    `;
  }

  /**
   * Register event handlers
   */
  registerEventHandlers() {
    document.querySelectorAll('[data-tab]').forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.dataset.tab;
        this.switchTab(tab);
      });
    });
  }
}

export const app = new HogarApp();
