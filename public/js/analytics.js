const Analytics = {
  init() {
    this.loadAllData();
  },

  async loadAllData() {
    await Promise.all([
      this.loadMonthlyChart(),
      this.loadPerformanceChart(),
      this.loadHeatmap(),
      this.loadCategoryChart()
    ]);
  },

  async loadMonthlyChart() {
    const container = document.getElementById('monthly-chart');
    
    try {
      const response = await API.getMonthlyData();
      const data = response.monthlyData;

      const maxRate = Math.max(...data.map(d => d.rate), 1);
      
      let html = '<div class="bar-chart">';
      
      const displayData = data.filter((_, i) => i % 3 === 0 || i === data.length - 1);
      
      displayData.forEach(item => {
        const height = (item.rate / 100) * 150;
        const date = new Date(item.date);
        const label = `${date.getMonth() + 1}/${date.getDate()}`;
        
        html += `
          <div class="bar-item">
            <span class="bar-value">${item.rate}%</span>
            <div class="bar" style="height: ${Math.max(height, 4)}px; background: ${this.getColorForRate(item.rate)}"></div>
            <span class="bar-label">${label}</span>
          </div>
        `;
      });
      
      html += '</div>';
      container.innerHTML = html;
    } catch (error) {
      container.innerHTML = '<p class="loading">Failed to load chart data</p>';
    }
  },

  async loadPerformanceChart() {
    const container = document.getElementById('performance-chart');
    
    try {
      const response = await API.getHabitsPerformance();
      const data = response.performance;

      if (data.length === 0) {
        container.innerHTML = '<p class="loading">No habit data available</p>';
        return;
      }

      let html = '<div class="performance-list">';
      
      data.forEach(habit => {
        html += `
          <div class="performance-item">
            <div class="performance-header">
              <span class="performance-name">
                <span>${habit.icon}</span>
                ${this.escapeHtml(habit.name)}
              </span>
              <span class="performance-value">${habit.completionRate}%</span>
            </div>
            <div class="performance-bar">
              <div class="performance-fill" style="width: ${habit.completionRate}%; background: ${habit.color}"></div>
            </div>
          </div>
        `;
      });
      
      html += '</div>';
      container.innerHTML = html;
    } catch (error) {
      container.innerHTML = '<p class="loading">Failed to load performance data</p>';
    }
  },

  async loadHeatmap() {
    const container = document.getElementById('heatmap');
    
    try {
      const response = await API.getHeatmap();
      const data = response.heatmap;

      const weeks = [];
      const today = new Date();
      
      for (let i = 364; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = API.getLocalDateString(date);
        const dayOfWeek = date.getDay();
        const weekIndex = Math.floor((364 - i + today.getDay()) / 7);
        
        if (!weeks[weekIndex]) {
          weeks[weekIndex] = [];
        }
        
        const entry = data[dateStr];
        let level = 0;
        if (entry) {
          if (entry.rate >= 75) level = 4;
          else if (entry.rate >= 50) level = 3;
          else if (entry.rate >= 25) level = 2;
          else if (entry.rate > 0) level = 1;
        }
        
        weeks[weekIndex][dayOfWeek] = { date: dateStr, level };
      }

      const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      
      let html = '<div class="heatmap">';
      
      for (let day = 0; day < 7; day++) {
        html += `<div class="heatmap-row">`;
        html += `<span class="heatmap-label">${day % 2 === 1 ? dayLabels[day] : ''}</span>`;
        
        weeks.forEach(week => {
          const cell = week[day];
          if (cell) {
            html += `<div class="heatmap-cell level-${cell.level}" title="${cell.date}"></div>`;
          } else {
            html += `<div class="heatmap-cell"></div>`;
          }
        });
        
        html += `</div>`;
      }
      
      html += '</div>';
      html += `
        <div class="heatmap-legend">
          <span>Less</span>
          <div class="heatmap-cell"></div>
          <div class="heatmap-cell level-1"></div>
          <div class="heatmap-cell level-2"></div>
          <div class="heatmap-cell level-3"></div>
          <div class="heatmap-cell level-4"></div>
          <span>More</span>
        </div>
      `;
      
      container.innerHTML = html;
    } catch (error) {
      container.innerHTML = '<p class="loading">Failed to load heatmap</p>';
    }
  },

  async loadCategoryChart() {
    const container = document.getElementById('category-chart');
    
    try {
      const response = await API.getCategoryBreakdown();
      const data = response.breakdown;

      if (data.length === 0) {
        container.innerHTML = '<p class="loading">No category data available</p>';
        return;
      }

      const categoryColors = {
        health: '#22c55e',
        productivity: '#3b82f6',
        learning: '#a855f7',
        mindfulness: '#14b8a6',
        social: '#f97316',
        finance: '#eab308',
        creativity: '#ec4899',
        other: '#6b7280'
      };

      let html = '<div class="category-list">';
      
      data.forEach(cat => {
        const color = categoryColors[cat.category] || '#6b7280';
        html += `
          <div class="category-item">
            <div class="category-color" style="background: ${color}"></div>
            <span class="category-name">${cat.category}</span>
            <span class="category-value">${cat.habitCount} habits · ${cat.completionRate}%</span>
          </div>
        `;
      });
      
      html += '</div>';
      container.innerHTML = html;
    } catch (error) {
      container.innerHTML = '<p class="loading">Failed to load category data</p>';
    }
  },

  getColorForRate(rate) {
    if (rate >= 75) return '#22c55e';
    if (rate >= 50) return '#eab308';
    if (rate >= 25) return '#f97316';
    return '#ef4444';
  },

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
};

window.Analytics = Analytics;