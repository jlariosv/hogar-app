/**
 * Validation utilities for form inputs
 */

import { VALIDATION_RULES } from '../config.js';

export class ValidationError extends Error {
  constructor(field, message) {
    super(message);
    this.field = field;
    this.name = 'ValidationError';
  }
}

/**
 * Validate a single field
 */
export function validateField(fieldName, value, customRules = null) {
  const rules = customRules || VALIDATION_RULES[fieldName];
  
  if (!rules) {
    return { valid: true };
  }

  // Required check
  if (rules.required && (value === null || value === undefined || value === '')) {
    return { 
      valid: false, 
      error: `${fieldName} es requerido` 
    };
  }

  if (!value) return { valid: true };

  // String validations
  if (rules.minLength && value.length < rules.minLength) {
    return { 
      valid: false, 
      error: `${fieldName} debe tener al menos ${rules.minLength} caracteres` 
    };
  }

  if (rules.maxLength && value.length > rules.maxLength) {
    return { 
      valid: false, 
      error: `${fieldName} no debe exceder ${rules.maxLength} caracteres` 
    };
  }

  if (rules.pattern && !rules.pattern.test(value)) {
    return { 
      valid: false, 
      error: rules.message || `${fieldName} tiene un formato inválido` 
    };
  }

  // Numeric validations
  if (rules.min !== undefined) {
    const num = parseFloat(value);
    if (isNaN(num) || num < rules.min) {
      return { 
        valid: false, 
        error: `${fieldName} debe ser mayor o igual a ${rules.min}` 
      };
    }
  }

  if (rules.max !== undefined) {
    const num = parseFloat(value);
    if (isNaN(num) || num > rules.max) {
      return { 
        valid: false, 
        error: `${fieldName} debe ser menor o igual a ${rules.max}` 
      };
    }
  }

  // Email validation
  if (rules.email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      return { 
        valid: false, 
        error: 'Correo electrónico inválido' 
      };
    }
  }

  // Date validation
  if (rules.type === 'date') {
    const date = new Date(value);
    if (isNaN(date.getTime())) {
      return { 
        valid: false, 
        error: 'Fecha inválida' 
      };
    }
  }

  return { valid: true };
}

/**
 * Validate entire form object
 */
export function validateForm(data, schema) {
  const errors = {};
  let isValid = true;

  for (const [field, rules] of Object.entries(schema)) {
    const validation = validateField(field, data[field], rules);
    
    if (!validation.valid) {
      errors[field] = validation.error;
      isValid = false;
    }
  }

  return { isValid, errors };
}

/**
 * Sanitize user input to prevent XSS
 */
export function sanitizeInput(input) {
  if (typeof input !== 'string') return input;
  
  const div = document.createElement('div');
  div.textContent = input;
  return div.innerHTML;
}

/**
 * Validate inventory item
 */
export function validateInventoryItem(item) {
  const schema = {
    name: VALIDATION_RULES.name,
    quantity: VALIDATION_RULES.quantity,
    category: { required: true },
    unit: { required: true }
  };

  return validateForm(item, schema);
}

/**
 * Validate admin item
 */
export function validateAdminItem(item) {
  const schema = {
    name: VALIDATION_RULES.name,
    amount: VALIDATION_RULES.amount,
    category: { required: true },
    date: { required: false }
  };

  return validateForm(item, schema);
}

/**
 * Validate celular item
 */
export function validateCelularItem(item) {
  const schema = {
    name: VALIDATION_RULES.name,
    amount: VALIDATION_RULES.amount,
    category: { required: true },
    carrier: { required: false }
  };

  return validateForm(item, schema);
}

/**
 * Validate service item
 */
export function validateServiceItem(item) {
  const schema = {
    name: VALIDATION_RULES.name,
    category: { required: true },
    unit: { required: false }
  };

  return validateForm(item, schema);
}
