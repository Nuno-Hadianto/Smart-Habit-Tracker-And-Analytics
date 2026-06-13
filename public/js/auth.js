const Auth = {
  currentUser: null,

  init() {
    this.bindEvents();
    this.checkAuth();
  },

  bindEvents() {
    document.getElementById('show-register').addEventListener('click', (e) => {
      e.preventDefault();
      this.showRegisterForm();
    });

    document.getElementById('show-login').addEventListener('click', (e) => {
      e.preventDefault();
      this.showLoginForm();
    });

    document.getElementById('login-form').addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleLogin(e.target);
    });

    document.getElementById('register-form').addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleRegister(e.target);
    });

    document.getElementById('logout-btn').addEventListener('click', () => {
      this.handleLogout();
    });
  },

  showRegisterForm() {
    document.getElementById('login-form').classList.add('hidden');
    document.getElementById('register-form').classList.remove('hidden');
    document.getElementById('auth-error').classList.add('hidden');
  },

  showLoginForm() {
    document.getElementById('register-form').classList.add('hidden');
    document.getElementById('login-form').classList.remove('hidden');
    document.getElementById('auth-error').classList.add('hidden');
  },

  showError(message) {
    const errorEl = document.getElementById('auth-error');
    errorEl.textContent = message;
    errorEl.classList.remove('hidden');
  },

  async checkAuth() {
    try {
      const response = await API.getMe();
      this.currentUser = response.user;
      this.showApp();
    } catch (error) {
      this.showAuthSection();
    }
  },

  async handleLogin(form) {
    const email = form.email.value;
    const password = form.password.value;

    try {
      const response = await API.login(email, password);
      this.currentUser = response.user;
      form.reset();
      this.showApp();
      Toast.show('Welcome back!', 'success');
    } catch (error) {
      this.showError(error.message);
    }
  },

  async handleRegister(form) {
    const name = form.name.value;
    const email = form.email.value;
    const password = form.password.value;

    try {
      const response = await API.register(name, email, password);
      this.currentUser = response.user;
      form.reset();
      this.showApp();
      Toast.show('Account created successfully!', 'success');
    } catch (error) {
      this.showError(error.message);
    }
  },

  async handleLogout() {
    try {
      await API.logout();
      this.currentUser = null;
      this.showAuthSection();
      Toast.show('Logged out successfully', 'info');
    } catch (error) {
      console.error('Logout error:', error);
    }
  },

  showAuthSection() {
    document.getElementById('auth-section').classList.remove('hidden');
    document.getElementById('main-app').classList.add('hidden');
  },

  showApp() {
    document.getElementById('auth-section').classList.add('hidden');
    document.getElementById('main-app').classList.remove('hidden');
    App.init();
  }
};

window.Auth = Auth;