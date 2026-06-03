/**
 * Firebase Module
 * Handles all Firebase operations
 */

import { FIREBASE_CONFIG, CONFIG, CONSTANTS } from '../config.js';
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js';
import { getFirestore, collection, addDoc, updateDoc, deleteDoc, doc, getDocs, query, where, onSnapshot } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js';

let db = null;
let unsubscribeTasks = null;

export class FirebaseManager {
  constructor(app) {
    this.app = app;
    this.initialized = false;
  }

  /**
   * Initialize Firebase
   */
  async init() {
    try {
      if (!CONFIG.ENABLE_FIREBASE) return;
      
      // Initialize Firebase
      const firebaseApp = initializeApp(FIREBASE_CONFIG);
      db = getFirestore(firebaseApp);
      
      this.initialized = true;
      console.log('✅ Firebase inicializado');
      return true;
    } catch (error) {
      console.error('❌ Error inicializando Firebase:', error);
      return false;
    }
  }

  /**
   * Add task to Firestore
   */
  async addTask(task) {
    if (!this.initialized || !db) return null;
    
    try {
      const docRef = await addDoc(collection(db, 'tasks'), {
        ...task,
        userId: this.app.state.user?.id || 'anonymous',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      
      console.log('✅ Tarea guardada en Firestore:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('❌ Error guardando tarea:', error);
      throw error;
    }
  }

  /**
   * Update task in Firestore
   */
  async updateTask(taskId, updates) {
    if (!this.initialized || !db) return false;
    
    try {
      await updateDoc(doc(db, 'tasks', taskId), {
        ...updates,
        updatedAt: new Date(),
      });
      
      console.log('✅ Tarea actualizada en Firestore:', taskId);
      return true;
    } catch (error) {
      console.error('❌ Error actualizando tarea:', error);
      throw error;
    }
  }

  /**
   * Delete task from Firestore
   */
  async deleteTask(taskId) {
    if (!this.initialized || !db) return false;
    
    try {
      await deleteDoc(doc(db, 'tasks', taskId));
      
      console.log('✅ Tarea eliminada de Firestore:', taskId);
      return true;
    } catch (error) {
      console.error('❌ Error eliminando tarea:', error);
      throw error;
    }
  }

  /**
   * Load tasks from Firestore with real-time listener
   */
  async loadTasksRealtime(callback) {
    if (!this.initialized || !db) return;
    
    try {
      // Unsubscribe from previous listener
      if (unsubscribeTasks) {
        unsubscribeTasks();
      }
      
      // Create query
      const q = query(
        collection(db, 'tasks'),
        where('userId', '==', this.app.state.user?.id || 'anonymous')
      );
      
      // Subscribe to real-time updates
      unsubscribeTasks = onSnapshot(q, (snapshot) => {
        const tasks = [];
        snapshot.forEach((doc) => {
          tasks.push({
            firebaseId: doc.id,
            ...doc.data(),
            // Convert Firestore timestamps
            createdAt: doc.data().createdAt?.toMillis?.() || Date.now(),
            updatedAt: doc.data().updatedAt?.toMillis?.() || Date.now(),
          });
        });
        
        console.log(`✅ Cargadas ${tasks.length} tareas de Firestore`);
        if (callback) callback(tasks);
      }, (error) => {
        console.error('❌ Error cargando tareas en tiempo real:', error);
      });
    } catch (error) {
      console.error('❌ Error en loadTasksRealtime:', error);
    }
  }

  /**
   * Load tasks once (no listener)
   */
  async loadTasksOnce() {
    if (!this.initialized || !db) return [];
    
    try {
      const q = query(
        collection(db, 'tasks'),
        where('userId', '==', this.app.state.user?.id || 'anonymous')
      );
      
      const snapshot = await getDocs(q);
      const tasks = [];
      snapshot.forEach((doc) => {
        tasks.push({
          firebaseId: doc.id,
          ...doc.data(),
        });
      });
      
      return tasks;
    } catch (error) {
      console.error('❌ Error cargando tareas:', error);
      return [];
    }
  }

  /**
   * Unsubscribe from real-time updates
   */
  unsubscribeFromUpdates() {
    if (unsubscribeTasks) {
      unsubscribeTasks();
      unsubscribeTasks = null;
      console.log('✅ Desuscrito de actualizaciones en tiempo real');
    }
  }
}
