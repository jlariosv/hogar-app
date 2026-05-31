/**
 * Authentication module
 * Handles Google OAuth authentication and user management
 */

import { GOOGLE_CONFIG } from '../config.js';
import { showError, showSuccess } from './notification.js';
import { getStorage } from './helpers.js';

const storage = getStorage();
const TOKEN_KEY = 'hogar_auth_token';
const PROFILE_KEY = 'hogar_user_profile';

class AuthManager {
  constructor() {
    this.tokenClient = null;
    this.accessToken = null;
    this.profile = null;
    this.listeners = new Set();
  }

  /**
   * Initialize Google API
   */
  async init() {
    try {
      await this.loadGoogleApi();
      this.restoreSession();
      return true;
    } catch (error) {
      console.error('Auth init error:', error);
      return false;
    }
  }

  /**
   * Load Google API script
   */
  loadGoogleApi() {
    return new Promise((resolve, reject) => {
      if (window.google) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://apis.google.com/js/api.js';
      script.onload = () => {
        window.gapi.load('client', async () => {
          try {
            await window.gapi.client.init({
              discoveryDocs: ['https://sheets.googleapis.com/$discovery/rest?version=v4']
            });

            window.google.accounts.oauth2.initTokenClient({
              client_id: GOOGLE_CONFIG.CLIENT_ID,
              scope: 'https://www.googleapis.com/auth/spreadsheets',
              callback: (resp) => this.handleTokenResponse(resp)
            });

            resolve();
          } catch (error) {
            reject(error);
          }
        });
      };
      script.onerror = () => reject(new Error('Failed to load Google API'));
      document.head.appendChild(script);
    });
  }

  /**
   * Handle token response
   */
  async handleTokenResponse(resp) {
    if (resp.error) {
      showError('Error de autenticación: ' + resp.error);
      return false;
    }

    this.accessToken = resp.access_token;
    storage.setItem(TOKEN_KEY, this.accessToken);

    try {
      this.profile = await this.fetchProfile();
      storage.setItem(PROFILE_KEY, JSON.stringify(this.profile));
      this.notifyListeners('authenticated', { profile: this.profile });
      showSuccess('Sesión iniciada correctamente');
      return true;
    } catch (error) {
      showError('Error al obtener perfil de usuario');
      return false;
    }
  }

  /**
   * Fetch user profile from Google
   */
  async fetchProfile() {
    if (!this.accessToken) throw new Error('No access token');

    const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${this.accessToken}` }
    });

    if (!response.ok) throw new Error('Failed to fetch profile');
    return response.json();
  }

  /**
   * Sign in with Google
   */
  signIn() {
    try {
      if (!window.google?.accounts?.oauth2) {
        showError('Google API no está disponible');
        return;
      }

      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CONFIG.CLIENT_ID,
        scope: 'https://www.googleapis.com/auth/spreadsheets',
        callback: (resp) => this.handleTokenResponse(resp)
      });

      client.requestAccessToken({ prompt: 'consent' });
    } catch (error) {
      showError('Error al iniciar sesión');
      console.error('Sign in error:', error);
    }
  }

  /**
   * Sign out
   */
  signOut() {
    this.accessToken = null;
    this.profile = null;
    storage.removeItem(TOKEN_KEY);
    storage.removeItem(PROFILE_KEY);
    
    if (this.accessToken && window.google?.accounts?.oauth2) {
      window.google.accounts.oauth2.revoke(this.accessToken);
    }

    this.notifyListeners('unauthenticated');
    showSuccess('Sesión cerrada');
  }

  /**
   * Restore session from storage
   */
  restoreSession() {
    const token = storage.getItem(TOKEN_KEY);
    const profileStr = storage.getItem(PROFILE_KEY);

    if (token && profileStr) {
      this.accessToken = token;
      try {
        this.profile = JSON.parse(profileStr);
        this.notifyListeners('authenticated', { profile: this.profile });
      } catch (e) {
        this.signOut();
      }
    }
  }

  /**
   * Check if authenticated
   */
  isAuthenticated() {
    return !!this.accessToken && !!this.profile;
  }

  /**
   * Get current profile
   */
  getProfile() {
    return this.profile;
  }

  /**
   * Get access token
   */
  getToken() {
    return this.accessToken;
  }

  /**
   * Subscribe to auth changes
   */
  onAuthChange(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Notify all listeners
   */
  notifyListeners(event, data = {}) {
    this.listeners.forEach(listener => {
      try {
        listener({ event, ...data });
      } catch (error) {
        console.error('Auth listener error:', error);
      }
    });
  }
}

// Export singleton
export const authManager = new AuthManager();