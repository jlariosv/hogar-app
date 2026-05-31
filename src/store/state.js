/**
 * State management for application data
 */

class AppState {
  constructor() {
    this.state = {
      currentTab: 'dashboard',
      currentFilter: 'all',
      searchQuery: '',
      data: {
        despensa: [],
        aseo_hogar: [],
        aseo_personal: [],
        servicios: [],
        admin: [],
        celular: []
      },
      isLoading: false,
      isSyncing: false,
      error: null,
      lastSync: null
    };

    this.listeners = new Set();
  }

  /**
   * Get state slice
   */
  getState() {
    return this.state;
  }

  /**
   * Update state
   */
  setState(updates) {
    this.state = { ...this.state, ...updates };
    this.notifyListeners();
  }

  /**
   * Update data for a tab
   */
  setTabData(tab, data) {
    this.state.data[tab] = data;
    this.notifyListeners();
  }

  /**
   * Get data for a tab
   */
  getTabData(tab) {
    return this.state.data[tab] || [];
  }

  /**
   * Add item to tab
   */
  addItem(tab, item) {
    const data = [...this.state.data[tab], item];
    this.setTabData(tab, data);
  }

  /**
   * Update item in tab
   */
  updateItem(tab, id, updates) {
    const data = this.state.data[tab].map(item =>
      item.id === id ? { ...item, ...updates } : item
    );
    this.setTabData(tab, data);
  }

  /**
   * Remove item from tab
   */
  removeItem(tab, id) {
    const data = this.state.data[tab].filter(item => item.id !== id);
    this.setTabData(tab, data);
  }

  /**
   * Set loading state
   */
  setLoading(isLoading) {
    this.setState({ isLoading });
  }

  /**
   * Set syncing state
   */
  setSyncing(isSyncing) {
    this.setState({ isSyncing, lastSync: new Date().toISOString() });
  }

  /**
   * Set error
   */
  setError(error) {
    this.setState({ error });
  }

  /**
   * Subscribe to state changes
   */
  onChange(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Notify all listeners
   */
  notifyListeners() {
    this.listeners.forEach(listener => {
      try {
        listener(this.state);
      } catch (error) {
        console.error('Listener error:', error);
      }
    });
  }

  /**
   * Reset state
   */
  reset() {
    this.state = {
      currentTab: 'dashboard',
      currentFilter: 'all',
      searchQuery: '',
      data: {
        despensa: [],
        aseo_hogar: [],
        aseo_personal: [],
        servicios: [],
        admin: [],
        celular: []
      },
      isLoading: false,
      isSyncing: false,
      error: null,
      lastSync: null
    };
    this.notifyListeners();
  }
}

export const appState = new AppState();