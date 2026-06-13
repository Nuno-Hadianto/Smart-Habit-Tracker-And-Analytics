const App = {
  currentPage: 'dashboard',

  init() {
    this.bindEvents();
    this.updateGreeting();
    this.navigateTo('dashboard');
    
    Habits.init();
    Tracking.init();
    Calendar.init();
    Analytics.init();
    Badges.init();
    Profile.init();
    Dashboard.init();
  },

  bindEvents() {
    document.querySelectorAll('.nav-item[data-page]').forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        this.navigateTo(item.dataset.page);
      });
    });

    document.querySelectorAll('[data-page]').forEach(item => {
      if (!item.classList.contains('nav-item')) {
        item.addEventListener('click', (e) => {
          e.preventDefault();
          this.navigateTo(item.dataset.page);
        });
      }
    });

    document.getElementById('mobile-menu-btn').addEventListener('click', () => {
      this.toggleMobileMenu();
    });

    document.getElementById('mobile-nav-overlay').addEventListener('click', () => {
      this.closeMobileMenu();
    });

    document.getElementById('mobile-profile-btn').addEventListener('click', () => {
      this.navigateTo('profile');
    });
  },

  navigateTo(page) {
    this.currentPage = page;

    document.querySelectorAll('.nav-item').forEach(item => {
      item.classList.toggle('active', item.dataset.page === page);
    });

    document.querySelectorAll('.page').forEach(p => {
      p.classList.toggle('active', p.id === `page-${page}`);
    });

    switch (page) {
      case 'dashboard':
        Dashboard.loadData();
        break;
      case 'habits':
        Habits.loadHabits();
        break;
      case 'tracking':
        Tracking.loadTracking();
        break;
      case 'calendar':
        Calendar.loadCalendar();
        break;
      case 'analytics':
        Analytics.loadAllData();
        break;
      case 'badges':
        Badges.loadBadges();
        break;
      case 'profile':
        Profile.loadProfile();
        break;
    }

    this.closeMobileMenu();
  },

  toggleMobileMenu() {
    document.querySelector('.sidebar').classList.toggle('open');
    document.getElementById('mobile-nav-overlay').classList.toggle('hidden');
  },

  closeMobileMenu() {
    document.querySelector('.sidebar').classList.remove('open');
    document.getElementById('mobile-nav-overlay').classList.add('hidden');
  },

  updateGreeting() {
    const hour = new Date().getHours();
    let greeting = 'Good evening';
    
    if (hour < 12) {
      greeting = 'Good morning';
    } else if (hour < 18) {
      greeting = 'Good afternoon';
    }

    const userName = Auth.currentUser?.name || '';
    document.getElementById('greeting').textContent = `${greeting}${userName ? ', ' + userName : ''}! 👋`;
  }
};

const Dashboard = {
  init() {
    this.loadData();
  },

  async loadData() {
    await Promise.all([
      this.loadOverview(),
      this.loadWeeklyChart(),
      this.loadInsights(),
      this.loadTodayHabits()
    ]);
  },

  async loadOverview() {
    try {
      const data = await API.getOverview();
      
      document.getElementById('stat-habits').textContent = data.totalHabits;
      document.getElementById('stat-today').textContent = data.todayCompletions;
      document.getElementById('stat-streak').textContent = data.bestStreak;
      document.getElementById('stat-rate').textContent = `${data.completionRate}%`;
    } catch (error) {
      console.error('Load overview error:', error);
    }
  },

  async loadWeeklyChart() {
    const container = document.getElementById('weekly-chart');
    
    try {
      const response = await API.getWeeklyData();
      const data = response.weeklyData;

      let html = '<div class="bar-chart">';
      
      data.forEach(item => {
        const height = (item.rate / 100) * 120;
        const color = this.getColorForRate(item.rate);
        
        html += `
          <div class="bar-item">
            <span class="bar-value">${item.rate}%</span>
            <div class="bar" style="height: ${Math.max(height, 4)}px; background: ${color}"></div>
            <span class="bar-label">${item.day}</span>
          </div>
        `;
      });
      
      html += '</div>';
      container.innerHTML = html;
    } catch (error) {
      container.innerHTML = '<p class="loading">Failed to load chart</p>';
    }
  },

  async loadInsights() {
    const container = document.getElementById('insights-list');
    
    try {
      const response = await API.getInsights();
      const insights = response.insights;

      if (insights.length === 0) {
        container.innerHTML = '<p class="loading">Start tracking habits to get personalized insights!</p>';
        return;
      }

      container.innerHTML = insights.map(insight => `
        <div class="insight-item ${insight.type}">
          <span class="insight-icon">${insight.icon}</span>
          <div class="insight-content">
            <h4>${insight.title}</h4>
            <p>${insight.message}</p>
          </div>
        </div>
      `).join('');
    } catch (error) {
      container.innerHTML = '<p class="loading">Failed to load insights</p>';
    }
  },

  async loadTodayHabits() {
    const container = document.getElementById('today-habits-list');
    const today = new Date().toISOString().split('T')[0];
    
    try {
      const response = await API.getTrackingByDate(today);
      const entries = response.entries;

      if (entries.length === 0) {
        container.innerHTML = '<p class="loading">No habits yet. Create some habits to start tracking!</p>';
        return;
      }

      container.innerHTML = entries.map(entry => `
        <div class="habit-quick-item ${entry.completed ? 'completed' : ''}" 
             onclick="Dashboard.quickToggle('${entry.habit_id}', ${!entry.completed})">
          <span class="icon">${entry.habit_icon || '📌'}</span>
          <span>${this.escapeHtml(entry.habit_name)}</span>
          <span class="check">${entry.completed ? '✓' : ''}</span>
        </div>
      `).join('');
    } catch (error) {
      container.innerHTML = '<p class="loading">Failed to load habits</p>';
    }
  },

  async quickToggle(habitId, completed) {
    const today = new Date().toISOString().split('T')[0];
    
    try {
      const response = await API.trackHabit({
        habit_id: habitId,
        date: today,
        completed: completed
      });

      if (response.newBadges && response.newBadges.length > 0) {
        response.newBadges.forEach(badge => {
          Tracking.showBadgeNotification(badge);
        });
      }

      await this.loadData();
      Toast.show(completed ? 'Habit completed! 🎉' : 'Habit unmarked', completed ? 'success' : 'info');
    } catch (error) {
      Toast.show(error.message, 'error');
    }
  },

  getColorForRate(rate) {
    if (rate >= 75) return '#22c55e';
    if (rate >= 50) return '#eab308';
    if (rate >= 25) return '#f97316';
    return '#6366f1';
  },

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
};

const Toast = {
  show(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icons = {
      success: '✓',
      error: '✕',
      warning: '⚠',
      info: 'ℹ'
    };

    toast.innerHTML = `
      <span class="toast-icon">${icons[type] || icons.info}</span>
      <span class="toast-message">${message}</span>
      <button class="toast-close" onclick="this.parentElement.remove()">×</button>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      if (toast.parentElement) {
        toast.remove();
      }
    }, 4000);
  }
};

window.App = App;
window.Dashboard = Dashboard;
window.Toast = Toast;

document.addEventListener('DOMContentLoaded', () => {
  Auth.init();
});
