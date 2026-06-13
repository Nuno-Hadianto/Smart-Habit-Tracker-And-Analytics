const Badges = {
  earnedBadges: [],
  allBadges: [],

  init() {
    this.loadBadges();
  },

  async loadBadges() {
    try {
      const response = await API.getBadges();
      this.earnedBadges = response.earnedBadges;
      this.allBadges = response.allBadges;
      this.renderBadges();
    } catch (error) {
      console.error('Load badges error:', error);
    }
  },

  renderBadges() {
    this.renderEarnedBadges();
    this.renderAllBadges();
  },

  renderEarnedBadges() {
    const container = document.getElementById('earned-badges');

    if (this.earnedBadges.length === 0) {
      container.innerHTML = `
        <div class="empty-state" style="grid-column: 1 / -1;">
          <div class="empty-state-icon">🏆</div>
          <p>No badges earned yet. Keep tracking your habits to earn badges!</p>
        </div>
      `;
      return;
    }

    container.innerHTML = this.earnedBadges.map(badge => this.renderBadgeCard(badge, true)).join('');
  },

  renderAllBadges() {
    const container = document.getElementById('all-badges');
    
    const earnedIds = new Set(this.earnedBadges.map(b => b.id));
    const unearned = this.allBadges.filter(b => !earnedIds.has(b.id));

    if (unearned.length === 0) {
      container.innerHTML = `
        <div class="empty-state" style="grid-column: 1 / -1;">
          <div class="empty-state-icon">🎉</div>
          <p>Congratulations! You've earned all available badges!</p>
        </div>
      `;
      return;
    }

    container.innerHTML = unearned.map(badge => this.renderBadgeCard(badge, false)).join('');
  },

  renderBadgeCard(badge, isEarned) {
    const requirementText = this.getRequirementText(badge);

    return `
      <div class="badge-card ${!isEarned ? 'locked' : ''}">
        <div class="badge-icon">${badge.icon}</div>
        <div class="badge-name">${badge.name}</div>
        <div class="badge-description">${badge.description}</div>
        ${isEarned ? `
          <div class="badge-earned">
            ✓ Earned ${this.formatDate(badge.earned_at)}
            ${badge.habit_name ? `<br><small>for ${badge.habit_name}</small>` : ''}
          </div>
        ` : `
          <div class="badge-requirement" style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.5rem;">
            ${requirementText}
          </div>
        `}
      </div>
    `;
  },

  getRequirementText(badge) {
    switch (badge.requirement_type) {
      case 'streak':
        return `Maintain a ${badge.requirement_value}-day streak`;
      case 'total_completions':
        return `Complete ${badge.requirement_value} habit check-ins`;
      case 'habits_created':
        return `Create ${badge.requirement_value} habits`;
      case 'perfect_day':
        return `Complete all habits in a day`;
      default:
        return '';
    }
  },

  formatDate(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }
};

window.Badges = Badges;