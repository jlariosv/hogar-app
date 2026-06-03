/**
 * Tasks Manager Module
 * Handles task-related operations
 */

import { CONSTANTS } from '../config.js';

export class TaskManager {
  constructor(app) {
    this.app = app;
  }

  /**
   * Load tasks from storage or Firebase
   */
  async loadTasks() {
    try {
      // If Firebase is available, load from there with real-time listener
      if (this.app.firebase && this.app.firebase.initialized) {
        // Firebase loadTasksRealtime is already set up in auth
        return;
      }
      
      // Fallback: load from local storage
      const tasks = this.app.storage.getItem(CONSTANTS.STORAGE.TASKS) || [];
      this.app.state.tasks = Array.isArray(tasks) ? tasks : [];
      this.renderTasks();
    } catch (error) {
      console.error('Error loading tasks:', error);
      this.app.ui.showError('Error al cargar las tareas');
    }
  }

  /**
   * Add new task
   */
  async addTask(title, description = '', priority = CONSTANTS.TASKS.PRIORITY.MEDIUM) {
    if (!title || title.trim().length === 0) {
      this.app.ui.showError('El título de la tarea es requerido');
      return false;
    }
    
    const task = {
      title: title.trim(),
      description: description.trim(),
      status: CONSTANTS.TASKS.STATUS.PENDING,
      priority: priority,
      completed: false,
    };
    
    try {
      // Save to Firebase
      if (this.app.firebase && this.app.firebase.initialized) {
        await this.app.firebase.addTask(task);
        // Real-time listener will update the UI
      } else {
        // Fallback to local storage
        task.id = 'task_' + Date.now();
        task.createdAt = Date.now();
        task.updatedAt = Date.now();
        this.app.state.tasks.push(task);
        this.saveTasks();
      }
      
      this.renderTasks();
      this.app.ui.showToast('Tarea creada', 'success');
      return true;
    } catch (error) {
      console.error('Error adding task:', error);
      this.app.ui.showError('Error al crear la tarea');
      return false;
    }
  }

  /**
   * Delete task
   */
  async deleteTask(taskId) {
    try {
      // Delete from Firebase
      if (this.app.firebase && this.app.firebase.initialized) {
        await this.app.firebase.deleteTask(taskId);
        // Real-time listener will update the UI
      } else {
        // Fallback to local storage
        const index = this.app.state.tasks.findIndex(t => t.id === taskId || t.firebaseId === taskId);
        if (index > -1) {
          this.app.state.tasks.splice(index, 1);
          this.saveTasks();
        }
      }
      
      this.renderTasks();
      this.app.ui.showToast('Tarea eliminada', 'success');
    } catch (error) {
      console.error('Error deleting task:', error);
      this.app.ui.showError('Error al eliminar la tarea');
    }
  }

  /**
   * Update task status
   */
  async updateTaskStatus(taskId, status) {
    try {
      const task = this.app.state.tasks.find(t => t.id === taskId || t.firebaseId === taskId);
      if (task) {
        const updates = {
          status: status,
          completed: status === CONSTANTS.TASKS.STATUS.COMPLETED,
        };
        
        // Update in Firebase
        if (this.app.firebase && this.app.firebase.initialized) {
          const firebaseId = task.firebaseId || taskId;
          await this.app.firebase.updateTask(firebaseId, updates);
          // Real-time listener will update the UI
        } else {
          // Fallback to local storage
          task.status = status;
          task.updatedAt = Date.now();
          if (status === CONSTANTS.TASKS.STATUS.COMPLETED) {
            task.completedAt = Date.now();
          }
          this.saveTasks();
        }
        
        this.renderTasks();
      }
    } catch (error) {
      console.error('Error updating task status:', error);
      this.app.ui.showError('Error al actualizar la tarea');
    }
  }

  /**
   * Save tasks to local storage (fallback)
   */
  saveTasks() {
    try {
      this.app.storage.setItem(CONSTANTS.STORAGE.TASKS, this.app.state.tasks);
    } catch (error) {
      console.error('Error saving tasks:', error);
      this.app.ui.showError('Error al guardar las tareas');
    }
  }

  /**
   * Render tasks to UI
   */
  renderTasks() {
    const tasks = this.app.state.tasks;
    
    if (tasks.length === 0) {
      this.app.ui.showEmpty('📋', 'Sin tareas', 'Crea una nueva tarea para comenzar');
      return;
    }
    
    let html = '<div class="tasks-list">';
    
    // Group by status
    const byStatus = {};
    tasks.forEach(task => {
      if (!byStatus[task.status]) byStatus[task.status] = [];
      byStatus[task.status].push(task);
    });
    
    // Render each status group
    Object.entries(byStatus).forEach(([status, statusTasks]) => {
      const statusLabel = this.getStatusLabel(status);
      html += `
        <div class="task-group">
          <div class="task-group-title">${statusLabel} (${statusTasks.length})</div>
      `;
      
      statusTasks.forEach(task => {
        const taskId = task.firebaseId || task.id;
        const priorityClass = `priority-${task.priority}`;
        const priorityEmoji = this.getPriorityEmoji(task.priority);
        html += `
          <div class="task-item ${priorityClass}">
            <div class="task-header">
              <span class="task-priority">${priorityEmoji}</span>
              <span class="task-title">${this.escapeHtml(task.title)}</span>
            </div>
            ${task.description ? `<div class="task-desc">${this.escapeHtml(task.description)}</div>` : ''}
            <div class="task-actions">
              ${status !== 'completed' ? `<button class="task-btn" onclick="window.app.tasks.updateTaskStatus('${taskId}', 'completed')">✓ Completar</button>` : ''}
              <button class="task-btn danger" onclick="window.app.tasks.deleteTask('${taskId}')">🗑️ Eliminar</button>
            </div>
          </div>
        `;
      });
      
      html += '</div>';
    });
    
    html += '</div>';
    this.app.ui.updateContent(html);
  }

  /**
   * Open add task modal
   */
  openAddModal() {
    const actions = [
      {
        id: 'save',
        label: 'Guardar',
        style: 'primary',
        callback: () => this.handleSaveTask(),
      },
      {
        id: 'cancel',
        label: 'Cancelar',
        style: 'secondary',
        callback: () => {},
      },
    ];
    
    const content = `
      <div class="form-group">
        <label>Título</label>
        <input type="text" id="task-title" placeholder="Título de la tarea" class="form-input">
      </div>
      <div class="form-group">
        <label>Descripción</label>
        <textarea id="task-desc" placeholder="Descripción" class="form-input"></textarea>
      </div>
      <div class="form-group">
        <label>Prioridad</label>
        <select id="task-priority" class="form-input">
          <option value="low">Baja</option>
          <option value="medium" selected>Media</option>
          <option value="high">Alta</option>
        </select>
      </div>
    `;
    
    this.app.ui.showModal('Nueva Tarea', content, actions);
  }

  /**
   * Handle save task from modal
   */
  handleSaveTask() {
    const title = document.getElementById('task-title')?.value || '';
    const description = document.getElementById('task-desc')?.value || '';
    const priority = document.getElementById('task-priority')?.value || CONSTANTS.TASKS.PRIORITY.MEDIUM;
    
    this.addTask(title, description, priority);
  }

  /**
   * Get status label
   */
  getStatusLabel(status) {
    const labels = {
      pending: '⏳ Pendiente',
      in_progress: '🔄 En Progreso',
      completed: '✅ Completada',
      cancelled: '❌ Cancelada',
    };
    return labels[status] || status;
  }

  /**
   * Get priority emoji
   */
  getPriorityEmoji(priority) {
    const emojis = {
      low: '📗',
      medium: '📙',
      high: '📕',
    };
    return emojis[priority] || '📝';
  }

  /**
   * Escape HTML to prevent XSS
   */
  escapeHtml(text) {
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    };
    return text.replace(/[&<>"']/g, m => map[m]);
  }
}
