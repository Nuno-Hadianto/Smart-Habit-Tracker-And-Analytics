const Calendar = {
  currentYear: new Date().getFullYear(),
  currentMonth: new Date().getMonth() + 1,
  calendarData: {},

  init() {
    this.bindEvents();
    this.updateMonthDisplay();
    this.loadCalendar();
  },

  bindEvents() {
    const prevBtn = document.getElementById('prev-month');
    if (prevBtn.dataset.bound === 'true') {
      return;
    }

    prevBtn.addEventListener('click', () => {
      this.changeMonth(-1);
    });

    document.getElementById('next-month').addEventListener('click', () => {
      this.changeMonth(1);
    });

    prevBtn.dataset.bound = 'true';
  },

  updateMonthDisplay() {
    const date = new Date(this.currentYear, this.currentMonth - 1, 1);
    const monthName = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    document.getElementById('current-month').textContent = monthName;
  },

  changeMonth(delta) {
    this.currentMonth += delta;
    
    if (this.currentMonth > 12) {
      this.currentMonth = 1;
      this.currentYear++;
    } else if (this.currentMonth < 1) {
      this.currentMonth = 12;
      this.currentYear--;
    }

    this.updateMonthDisplay();
    this.loadCalendar();
  },

  async loadCalendar() {
    try {
      const response = await API.getCalendar(this.currentYear, this.currentMonth);
      this.calendarData = response.calendar;
      this.renderCalendar();
    } catch (error) {
      console.error('Load calendar error:', error);
    }
  },

  renderCalendar() {
    const container = document.getElementById('calendar-grid');
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    let html = days.map(day => `<div class="calendar-header">${day}</div>`).join('');

    const firstDay = new Date(this.currentYear, this.currentMonth - 1, 1);
    const lastDay = new Date(this.currentYear, this.currentMonth, 0);
    const startingDay = firstDay.getDay();
    const totalDays = lastDay.getDate();

    const prevMonthLastDay = new Date(this.currentYear, this.currentMonth - 1, 0).getDate();
    for (let i = startingDay - 1; i >= 0; i--) {
      const day = prevMonthLastDay - i;
      html += `<div class="calendar-day other-month">${day}</div>`;
    }

    const today = new Date();
    for (let day = 1; day <= totalDays; day++) {
      const dateStr = `${this.currentYear}-${String(this.currentMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const data = this.calendarData[dateStr];
      const isToday = today.getFullYear() === this.currentYear && 
                      today.getMonth() + 1 === this.currentMonth && 
                      today.getDate() === day;

      let className = 'calendar-day';
      let dotClass = '';

      if (isToday) className += ' today';
      
      if (data) {
        className += ' has-data';
        if (data.completed === data.total && data.total > 0) {
          className += ' complete';
          dotClass = 'complete';
        } else if (data.completed > 0) {
          className += ' partial';
          dotClass = 'partial';
        } else {
          dotClass = 'none';
        }
      }

      html += `
        <div class="${className}" data-date="${dateStr}" onclick="Calendar.selectDay('${dateStr}')">
          ${day}
          ${dotClass ? `<div class="completion-dot ${dotClass}"></div>` : ''}
        </div>
      `;
    }

    const remainingCells = 42 - (startingDay + totalDays);
    for (let day = 1; day <= remainingCells; day++) {
      html += `<div class="calendar-day other-month">${day}</div>`;
    }

    container.innerHTML = html;
  },

  selectDay(dateStr) {
    const data = this.calendarData[dateStr];
    const detailsContainer = document.getElementById('day-details');
    const listContainer = document.getElementById('day-habits-list');
    
    document.getElementById('selected-date').textContent = new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric'
    });

    if (!data || !data.habits || data.habits.length === 0) {
      listContainer.innerHTML = '<p class="loading">No habit data for this day</p>';
    } else {
      listContainer.innerHTML = data.habits.map(habit => `
        <div class="day-habit-item">
          <div class="day-habit-status ${habit.completed ? 'completed' : 'incomplete'}">
            ${habit.completed ? '✓' : ''}
          </div>
          <span>${habit.icon} ${habit.name}</span>
        </div>
      `).join('');
    }

    detailsContainer.classList.remove('hidden');
  }
};

window.Calendar = Calendar;