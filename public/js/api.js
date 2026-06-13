const API = {
  baseUrl: '/api',

  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      credentials: 'include',
      ...options
    };

    if (options.body && typeof options.body === 'object') {
      config.body = JSON.stringify(options.body);
    }

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Something went wrong');
      }

      return data;
    } catch (error) {
      console.error(`API Error (${endpoint}):`, error);
      throw error;
    }
  },

  async login(email, password) {
    return this.request('/auth/login', {
      method: 'POST',
      body: { email, password }
    });
  },

  async register(name, email, password) {
    return this.request('/auth/register', {
      method: 'POST',
      body: { name, email, password }
    });
  },

  async logout() {
    return this.request('/auth/logout', { method: 'POST' });
  },

  async getMe() {
    return this.request('/auth/me');
  },

  async updateProfile(data) {
    return this.request('/auth/profile', {
      method: 'PUT',
      body: data
    });
  },

  async changePassword(currentPassword, newPassword) {
    return this.request('/auth/password', {
      method: 'PUT',
      body: { currentPassword, newPassword }
    });
  },

  async getHabits() {
    return this.request('/habits');
  },

  async getHabit(id) {
    return this.request(`/habits/${id}`);
  },

  async createHabit(data) {
    return this.request('/habits', {
      method: 'POST',
      body: data
    });
  },

  async updateHabit(id, data) {
    return this.request(`/habits/${id}`, {
      method: 'PUT',
      body: data
    });
  },

  async deleteHabit(id) {
    return this.request(`/habits/${id}`, {
      method: 'DELETE'
    });
  },

  async getCategories() {
    return this.request('/habits/meta/categories');
  },

  async getTrackingByDate(date) {
    return this.request(`/tracking/date/${date}`);
  },

  async getTrackingByHabit(habitId, startDate, endDate) {
    let url = `/tracking/habit/${habitId}`;
    if (startDate && endDate) {
      url += `?startDate=${startDate}&endDate=${endDate}`;
    }
    return this.request(url);
  },

  async trackHabit(data) {
    return this.request('/tracking', {
      method: 'POST',
      body: data
    });
  },

  async getBadges() {
    return this.request('/tracking/badges');
  },

  async getCalendar(year, month) {
    return this.request(`/tracking/calendar/${year}/${month}`);
  },

  async getOverview() {
    return this.request('/analytics/overview');
  },

  async getWeeklyData() {
    return this.request('/analytics/weekly');
  },

  async getMonthlyData() {
    return this.request('/analytics/monthly');
  },

  async getHabitsPerformance() {
    return this.request('/analytics/habits-performance');
  },

  async getHeatmap() {
    return this.request('/analytics/heatmap');
  },

  async getCategoryBreakdown() {
    return this.request('/analytics/categories');
  },

  async getInsights() {
    return this.request('/analytics/insights');
  }
};

window.API = API;