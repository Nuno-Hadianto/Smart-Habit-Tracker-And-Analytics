const Profile = {
  init() {
    this.bindEvents();
    this.loadProfile();
  },

  bindEvents() {
    const form = document.getElementById('profile-form');
    const passwordForm = document.getElementById('password-form');
    if (form.dataset.bound === 'true') {
      return;
    }

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleUpdateProfile(e.target);
    });

    passwordForm.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleChangePassword(e.target);
    });

    form.dataset.bound = 'true';
  },

  loadProfile() {
    const user = Auth.currentUser;
    if (!user) return;

    document.getElementById('profile-name').value = user.name || '';
    document.getElementById('profile-email').value = user.email || '';
    document.getElementById('profile-bio').value = user.bio || '';

    this.loadAccountStats();
  },

  async loadAccountStats() {
    try {
      const user = Auth.currentUser;
      
      if (user.created_at) {
        const date = new Date(user.created_at);
        document.getElementById('member-since').textContent = date.toLocaleDateString('en-US', {
          month: 'long',
          day: 'numeric',
          year: 'numeric'
        });
      }

      const overview = await API.getOverview();
      document.getElementById('total-habits-created').textContent = overview.totalHabits;
      document.getElementById('total-checkins').textContent = overview.totalCompletions;
      document.getElementById('total-badges').textContent = overview.badgesCount;
    } catch (error) {
      console.error('Load account stats error:', error);
    }
  },

  async handleUpdateProfile(form) {
    const data = {
      name: form.name.value,
      bio: form.bio.value,
      avatar: '' 
    };

    try {
      const response = await API.updateProfile(data);
      Auth.currentUser = response.user;
      Toast.show('Profile updated successfully', 'success');
    } catch (error) {
      Toast.show(error.message, 'error');
    }
  },

  async handleChangePassword(form) {
    const currentPassword = form.currentPassword.value;
    const newPassword = form.newPassword.value;

    try {
      await API.changePassword(currentPassword, newPassword);
      form.reset();
      Toast.show('Password changed successfully', 'success');
    } catch (error) {
      Toast.show(error.message, 'error');
    }
  }
};

window.Profile = Profile;