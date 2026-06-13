const Habits = {
  habits: [],
  currentFilter: 'all',
  editingHabitId: null,

  init() {
    this.bindEvents();
    this.loadHabits();
  },

  bindEvents() {
    const form = document.getElementById('habit-form');
    if (form.dataset.bound === 'true') {
      return;
    }

    document.getElementById('add-habit-btn').addEventListener('click', () => {
      this.openModal();
    });


    form.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleSaveHabit(e.target);
    });

    document.getElementById('close-habit-modal').addEventListener('click', () => {
      this.closeModal();
    });

    document.getElementById('cancel-habit').addEventListener('click', () => {
      this.closeModal();
    });

    document.querySelector('#habit-modal .modal-overlay').addEventListener('click', () => {
      this.closeModal();
    });

    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.setFilter(btn.dataset.category);
      });
    });

    form.dataset.bound = 'true';
  },

  async loadHabits() {
    try {
      const response = await API.getHabits();
      this.habits = response.habits;
      this.renderHabits();
    } catch (error) {
      console.error('Load habits error:', error);
      Toast.show('Failed to load habits', 'error');
    }
  },

  setFilter(category) {
    this.currentFilter = category;
    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.category === category);
    });
    this.renderHabits();
  },

  renderHabits() {
    const container = document.getElementById('habits-list');

    const newContainer = container.cloneNode(false);
    container.parentNode.replaceChild(newContainer, container);
    
    let filteredHabits = this.habits;

    if (this.currentFilter !== 'all') {
      filteredHabits = this.habits.filter(h => h.category === this.currentFilter);
    }

    if (filteredHabits.length === 0) {
      newContainer.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📋</div>
          <p>${this.habits.length === 0 ? 'No habits yet. Create your first habit!' : 'No habits in this category.'}</p>
          ${this.habits.length === 0 ? '<button class="btn btn-primary" onclick="Habits.openModal()">+ Create Habit</button>' : ''}
        </div>
      `;
      return;
    }

    newContainer.innerHTML = filteredHabits.map(habit => this.renderHabitCard(habit)).join('');

    newContainer.addEventListener('click', (e) => {
      if (e.target.closest('.habit-edit-btn')) {
        const habitId = e.target.closest('.habit-edit-btn').dataset.habitId;
        this.editHabit(habitId);
      }
      if (e.target.closest('.habit-delete-btn')) {
        const habitId = e.target.closest('.habit-delete-btn').dataset.habitId;
        this.deleteHabit(habitId);
      }
    });
  },

  renderHabitCard(habit) {
    const categoryIcons = {
      health: '💪',
      productivity: '📈',
      learning: '📚',
      mindfulness: '🧘',
      social: '👥',
      finance: '💰',
      creativity: '🎨',
      other: '📌'
    };

    return `
      <div class="habit-card" data-habit-id="${habit.id}">
        <div class="habit-card-header">
          <div class="habit-info">
            <div class="habit-icon" style="background: ${habit.color}20; color: ${habit.color}">
              ${habit.icon}
            </div>
            <div>
              <div class="habit-name">${this.escapeHtml(habit.name)}</div>
              <div class="habit-category">${categoryIcons[habit.category] || '📌'} ${habit.category}</div>
            </div>
          </div>
          <div class="habit-actions">
            <button class="habit-action-btn delete habit-delete-btn" data-habit-id="${habit.id}" title="Delete">🗑️</button>
          </div>
        </div>
        <div class="habit-stats">
          <div class="habit-stat">
            <span class="habit-stat-value">${habit.frequency || 'Daily'}</span>
            <span class="habit-stat-label">Frequency</span>
          </div>
        </div>
        ${habit.description ? `<p class="habit-description" style="font-size: 0.8125rem; color: var(--text-muted); margin-top: 0.5rem;">${this.escapeHtml(habit.description)}</p>` : ''}
      </div>
    `;
  },

  openModal(habit = null) {
    const modal = document.getElementById('habit-modal');
    const form = document.getElementById('habit-form');
    const title = document.getElementById('habit-modal-title');

    if (habit) {
      title.textContent = 'Edit Habit';
      this.editingHabitId = habit.id;
      form.name.value = habit.name;
      form.description.value = habit.description || '';
      form.category.value = habit.category;
      form.frequency.value = habit.frequency || 'daily';
      form.icon.value = habit.icon || '📌';
      form.color.value = habit.color || '#6366f1';
    } else {
      title.textContent = 'New Habit';
      this.editingHabitId = null;
      form.reset();
      form.color.value = '#6366f1';
    }

    modal.classList.remove('hidden');
  },

  closeModal() {
    document.getElementById('habit-modal').classList.add('hidden');
    this.editingHabitId = null;
  },

  async handleSaveHabit(form) {
    const data = {
      name: form.name.value,
      description: form.description.value,
      category: form.category.value,
      frequency: form.frequency.value,
      icon: form.icon.value,
      color: form.color.value
    };

    try {
      if (this.editingHabitId) {
        await API.updateHabit(this.editingHabitId, data);
        Toast.show('Habit updated successfully', 'success');
      } else {
        await API.createHabit(data);
        Toast.show('Habit created successfully', 'success');
      }

      this.closeModal();
      await this.loadHabits();
    } catch (error) {
      Toast.show(error.message, 'error');
    }
  },

  async editHabit(id) {
    const habit = this.habits.find(h => String(h.id) === String(id));
    if (habit) {
      this.openModal(habit);
      } else {
    console.error('[v0] Habit not found with id:', id);
    Toast.show('Habit not found', 'error');
    }
  },

  async deleteHabit(id) {
    if (!confirm('Are you sure you want to delete this habit? This action cannot be undone.')) {
      return;
    }

    try {
      await API.deleteHabit(id);
      Toast.show('Habit deleted', 'success');
      await this.loadHabits();
      Dashboard.loadData();
    } catch (error) {
      Toast.show(error.message, 'error');
    }
  },

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
};

window.Habits = Habits;