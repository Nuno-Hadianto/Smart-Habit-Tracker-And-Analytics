const Tracking = {
  currentDate: new Date(),
  entries: [],

  init() {
    this.bindEvents();
    this.updateDateDisplay();
    this.loadTracking();
  },

  bindEvents() {
    const form = document.getElementById('notes-form');
    if (form.dataset.bound === 'true') {
      return;
    }

    document.getElementById('prev-day').addEventListener('click', () => {
      this.changeDate(-1);
    });

    document.getElementById('next-day').addEventListener('click', () => {
      this.changeDate(1);
    });

    document.getElementById('close-notes-modal').addEventListener('click', () => {
      this.closeNotesModal();
    });

    document.getElementById('cancel-notes').addEventListener('click', () => {
      this.closeNotesModal();
    });

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      this.saveNotes();
    });

    document.querySelector('#notes-modal .modal-overlay').addEventListener('click', () => {
      this.closeNotesModal();
    });

    form.dataset.bound = 'true';
  },

  formatDate(date) {
    return API.getLocalDateString(date);
  },

  formatDisplayDate(date) {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
  },

  updateDateDisplay() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const current = new Date(this.currentDate);
    current.setHours(0, 0, 0, 0);

    let displayText = this.formatDisplayDate(this.currentDate);
    
    if (current.getTime() === today.getTime()) {
      displayText = 'Today - ' + displayText;
    } else {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      if (current.getTime() === yesterday.getTime()) {
        displayText = 'Yesterday - ' + displayText;
      }
    }

    document.getElementById('current-date').textContent = displayText;

    const nextBtn = document.getElementById('next-day');
    nextBtn.disabled = current.getTime() >= today.getTime();
  },

  changeDate(delta) {
    this.currentDate.setDate(this.currentDate.getDate() + delta);
    this.updateDateDisplay();
    this.loadTracking();
  },

  async loadTracking() {
    const container = document.getElementById('tracking-list');
    container.innerHTML = '<p class="loading">Loading...</p>';

    try {
      const dateStr = this.formatDate(this.currentDate);
      const response = await API.getTrackingByDate(dateStr);
      this.entries = response.entries;
      this.renderTracking();
    } catch (error) {
      console.error('Load tracking error:', error);
      container.innerHTML = '<p class="loading">Failed to load tracking data</p>';
    }
  },

  renderTracking() {
    const container = document.getElementById('tracking-list');

    if (this.entries.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📋</div>
          <p>No habits to track. Create some habits first!</p>
          <button class="btn btn-primary" onclick="App.navigateTo('habits')">Go to Habits</button>
        </div>
      `;
      return;
    }

    container.innerHTML = this.entries.map(entry => this.renderTrackingItem(entry)).join('');
  },

  renderTrackingItem(entry) {
    const isCompleted = entry.completed === 1;
    const habitId = entry.habit_id;
    const dateStr = this.formatDate(this.currentDate);

    return `
      <div class="tracking-item" data-habit-id="${habitId}">
        <div class="tracking-checkbox ${isCompleted ? 'checked' : ''}" 
             onclick="Tracking.toggleHabit('${habitId}', ${!isCompleted})">
          ${isCompleted ? '✓' : ''}
        </div>
        <div class="tracking-info">
          <div class="tracking-name">
            <span>${entry.habit_icon || '📌'}</span>
            <span>${this.escapeHtml(entry.habit_name)}</span>
          </div>
          <div class="tracking-meta">${entry.category || 'General'}</div>
        </div>
        ${entry.streak > 0 ? `
          <div class="tracking-streak">
            🔥 ${entry.streak || 0}
          </div>
        ` : ''}
        <div class="tracking-actions">
          <button class="tracking-action-btn" onclick="Tracking.openNotesModal('${habitId}', '${dateStr}')" title="Add notes">
            📝
          </button>
        </div>
      </div>
    `;
  },

  async toggleHabit(habitId, completed) {
    const dateStr = this.formatDate(this.currentDate);

    try {
      const response = await API.trackHabit({
        habit_id: habitId,
        date: dateStr,
        completed: completed
      });

      if (response.newBadges && response.newBadges.length > 0) {
        response.newBadges.forEach(badge => {
          this.showBadgeNotification(badge);
        });
      }

      const entryIndex = this.entries.findIndex(e => e.habit_id === habitId);
      if (entryIndex !== -1) {
        this.entries[entryIndex].completed = completed ? 1 : 0;
        this.entries[entryIndex].streak = response.streak;
      }

      this.renderTracking();

      Dashboard.loadData();

      Toast.show(completed ? 'Habit completed! 🎉' : 'Habit unmarked', completed ? 'success' : 'info');
    } catch (error) {
      Toast.show(error.message, 'error');
    }
  },

  openNotesModal(habitId, date) {
    const entry = this.entries.find(e => e.habit_id === habitId);
    const modal = document.getElementById('notes-modal');
    
    document.getElementById('tracking-notes').value = entry?.notes || '';
    document.getElementById('notes-habit-id').value = habitId;
    document.getElementById('notes-date').value = date;
    
    modal.classList.remove('hidden');
  },

  closeNotesModal() {
    document.getElementById('notes-modal').classList.add('hidden');
  },

  async saveNotes() {
    const habitId = document.getElementById('notes-habit-id').value;
    const date = document.getElementById('notes-date').value;
    const notes = document.getElementById('tracking-notes').value;

    const entry = this.entries.find(e => e.habit_id === habitId);

    try {
      await API.trackHabit({
        habit_id: habitId,
        date: date,
        completed: entry?.completed === 1,
        notes: notes
      });

      if (entry) {
        entry.notes = notes;
      }

      this.closeNotesModal();
      Toast.show('Notes saved', 'success');
    } catch (error) {
      Toast.show(error.message, 'error');
    }
  },

  showBadgeNotification(badge) {
    const notification = document.getElementById('badge-notification');
    notification.querySelector('.badge-notification-icon').textContent = badge.icon;
    notification.querySelector('.badge-notification-name').textContent = badge.name;
    notification.classList.remove('hidden');

    setTimeout(() => {
      notification.classList.add('hidden');
    }, 4000);
  },

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
};

window.Tracking = Tracking;