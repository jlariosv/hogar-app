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
   * Load tasks from storage
   */
  async loadTasks() {
    try {
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
  addTask(title, description = '', priority = CONSTANTS.TASKS.PRIORITY.MEDIUM) {
    if (!title || title.trim().length === 0) {
      this.app.ui.showError('El título de la tarea es requerido');
      return false;
    }
    
    const task = {
      id: 'task_' + Date.now(),
      title: title.trim(),
      description: description.trim(),
      status: CONSTANTS.TASKS.STATUS.PENDING,
      priority: priority,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      completedAt: null,
    };
    
    this.app.state.tasks.push(task);
    this.saveTasks();
    this.renderTasks();
    this.app.ui.showToast('Tarea creada', 'success');
    return true;
  }

  /**
   * Delete task
   */
  deleteTask(taskId) {
    const index = this.app.state.tasks.findIndex(t => t.id === taskId);
    if (index > -1) {
      this.app.state.tasks.splice(index, 1);
      this.saveTasks();
      this.renderTasks();
      this.app.ui.showToast('Tarea eliminada', 'success');
    }
  }

  /**
   * Update task status
   */
  updateTaskStatus(taskId, status) {
    const task = this.app.state.tasks.find(t => t.id === taskId);
    if (task) {
      task.status = status;
      task.updatedAt = Date.now();
      if (status === CONSTANTS.TASKS.STATUS.COMPLETED) {
        task.completedAt = Date.now();
      }
      this.saveTasks();
      this.renderTasks();
    }
  }

  /**
   * Save tasks to storage
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
              ${status !== 'completed' ? `<button class="task-btn" onclick="window.app.tasks.updateTaskStatus('${task.id}', 'completed')">✓ Completar</button>` : ''}
              <button class="task-btn danger" onclick="window.app.tasks.deleteTask('${task.id}')">🗑️ Eliminar</button>
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
   * Sync tasks (for future cloud sync implementation)
   */
  async syncTasks() {
    // TODO: Implement cloud sync
    console.log('Syncing tasks...');
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
