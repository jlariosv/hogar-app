/**
 * Configuration file for Hogar App
 * Contains Firebase config, API endpoints, and app constants
 */

// Firebase Configuration
export const FIREBASE_CONFIG = {
  apiKey: "AIzaSyDfX8zqL2Z5jK9mN4oP7qR1sT2uV3wX4yZ",
  authDomain: "hogar-app-shared.firebaseapp.com",
  databaseURL: "https://hogar-app-shared.firebaseio.com",
  projectId: "hogar-app-shared",
  storageBucket: "hogar-app-shared.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef1234567890"
};

// Google OAuth
export const GOOGLE_CONFIG = {
  CLIENT_ID: '465995137920-il31gii2o0u36ee568ejrlsangod77du.apps.googleusercontent.com'
};

// App Metadata
export const CATEGORIES = {
  despensa: {
    label: 'Despensa',
    icon: '🛒',
    sheet: 'Despensa',
    type: 'inventory',
    cats: ['Lácteos', 'Verduras', 'Frutas', 'Carnes', 'Granos', 'Bebidas', 'Enlatados', 'Panadería', 'Condimentos', 'Otros'],
    locs: ['Bajo mesón', 'Lavadero', 'Nevera', 'Congelador', 'Despensa', 'Otros'],
    units: ['unidades', 'kg', 'l', 'ml', 'porciones', 'latas']
  },
  aseo_hogar: {
    label: 'Aseo Hogar',
    icon: '🧹',
    sheet: 'AseoHogar',
    type: 'inventory',
    cats: ['Limpieza', 'Desinfección', 'Lavandería', 'Cocina', 'Baño', 'Otros'],
    locs: ['Bajo mesón', 'Lavadero', 'Cocina', 'Baño principal', 'Baño secundario', 'Otros'],
    units: ['unidades', 'ml', 'l', 'porciones']
  },
  aseo_personal: {
    label: 'Aseo Personal',
    icon: '🚿',
    sheet: 'AseoPersonal',
    type: 'inventory',
    cats: ['Cabello', 'Piel', 'Dental', 'Cuerpo', 'Otros'],
    locs: ['Baño principal', 'Baño secundario', 'Dormitorio', 'Otros'],
    units: ['unidades', 'ml', 'l']
  },
  servicios: {
    label: 'Servicios',
    icon: '💡',
    sheet: 'Servicios',
    type: 'servicios',
    cats: ['Energía', 'Agua', 'Gas', 'Internet', 'TV', 'Teléfono']
  },
  admin: {
    label: 'Administración',
    icon: '🏢',
    sheet: 'Admin',
    type: 'admin',
    cats: ['Cuota ordinaria', 'Cuota extraordinaria', 'Multa', 'Seguro', 'Otros']
  },
  celular: {
    label: 'Celular',
    icon: '📱',
    sheet: 'Celular',
    type: 'celular',
    cats: ['Prepago', 'Postpago', 'Datos', 'Mixto']
  }
};

export const CATEGORY_ICONS = {
  // Despensa
  'Lácteos': '🥛',
  'Verduras': '🥦',
  'Frutas': '🍎',
  'Carnes': '🥩',
  'Granos': '🌾',
  'Bebidas': '🧃',
  'Enlatados': '🥫',
  'Panadería': '🍞',
  'Condimentos': '🧂',
  'Otros': '📦',
  // Aseo hogar
  'Limpieza': '🧴',
  'Desinfección': '🦠',
  'Lavandería': '👕',
  'Cocina': '🍳',
  'Baño': '🚽',
  // Aseo personal
  'Cabello': '💆',
  'Piel': '🧴',
  'Dental': '🦷',
  'Cuerpo': '🧼',
  // Servicios
  'Energía': '⚡',
  'Agua': '💧',
  'Gas': '🔥',
  'Internet': '📶',
  'TV': '📺',
  'Teléfono': '☎️',
  // Admin
  'Cuota ordinaria': '🏠',
  'Cuota extraordinaria': '💰',
  'Multa': '⚠️',
  'Seguro': '🛡️',
  // Celular
  'Prepago': '📲',
  'Postpago': '📱',
  'Datos': '📡',
  'Mixto': '🔀'
};

// Validation Rules
export const VALIDATION_RULES = {
  name: {
    required: true,
    minLength: 2,
    maxLength: 100,
    pattern: /^[a-zA-Z0-9\s\-áéíóúÁÉÍÓÚñÑ]+$/,
    message: 'El nombre debe tener entre 2 y 100 caracteres y solo puede contener letras, números y espacios'
  },
  quantity: {
    required: true,
    min: 0,
    max: 999999,
    message: 'La cantidad debe ser un número entre 0 y 999999'
  },
  amount: {
    required: true,
    min: 0,
    max: 999999999,
    message: 'El monto debe ser un número válido'
  },
  date: {
    required: false,
    message: 'Debe ser una fecha válida'
  }
};

// Timezone
export const TIMEZONE = 'America/Bogota';

// Date/Time Formatting
export const DATE_FORMAT_OPTIONS = {
  full: { timeZone: TIMEZONE, year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' },
  date: { timeZone: TIMEZONE, year: 'numeric', month: '2-digit', day: '2-digit' },
  short: { timeZone: TIMEZONE, month: 'short', day: 'numeric' }
};

// Currency Formatting
export const CURRENCY_FORMAT = {
  style: 'currency',
  currency: 'COP',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0
};

// Debounce delays (ms)
export const DEBOUNCE_DELAYS = {
  search: 300,
  save: 500,
  sync: 1000
};

// Toast durations (ms)
export const TOAST_DURATION = 3000;
