// Luxe Auto Resort - Main JavaScript

// API Configuration - Dynamic for LAN access
const API_BASE = (() => {
  const hostname = window.location.hostname;
  const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';
  const port = isLocalhost ? '3000' : window.location.port || '3000';
  return `http://${hostname}:${port}/api`;
})();

// Auth State
const auth = {
  token: localStorage.getItem('token'),
  user: JSON.parse(localStorage.getItem('user') || 'null'),

  isLoggedIn() { return !!this.token; },
  isAdmin()    { return this.user?.role === 'admin'; },

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    this.token = null;
    this.user  = null;
    window.location.href = 'index.html';
  }
};

// Error codes for specific handling
const ErrorCodes = {
  VALIDATION_ERROR:    'VALIDATION_ERROR',
  EMAIL_ALREADY_EXISTS:'EMAIL_ALREADY_EXISTS',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  TOKEN_INVALID:       'TOKEN_INVALID',
  TOKEN_EXPIRED:       'TOKEN_EXPIRED',
  FORBIDDEN:           'FORBIDDEN',
  NOT_FOUND:           'NOT_FOUND'
};

// API Helper with Enhanced Error Handling
const api = {
  async request(endpoint, options = {}) {
    const headers = { 'Content-Type': 'application/json', ...options.headers };
    if (auth.token) headers['Authorization'] = `Bearer ${auth.token}`;

    try {
      const response = await fetch(`${API_BASE}${endpoint}`, {
        ...options, headers, credentials: 'include'
      });

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('Non-JSON response:', text);
        throw new Error('Сървърът върна неочакван отговор');
      }

      const data = await response.json();

      if (!response.ok) {
        const errorInfo = data.error || { message: 'Възникна грешка' };
        if (errorInfo.code === ErrorCodes.TOKEN_EXPIRED || errorInfo.code === ErrorCodes.TOKEN_INVALID) {
          auth.logout();
          throw new Error('Сесията ви е изтекла. Моля, влезте отново.');
        }
        if (response.status === 401) { auth.logout(); throw new Error(errorInfo.message || 'Моля, влезте отново'); }
        if (response.status === 403) throw new Error(errorInfo.message || 'Нямате права за това действие');
        if (response.status === 404) throw new Error(errorInfo.message || 'Ресурсът не е намерен');
        if (response.status >= 500)  throw new Error('Грешка на сървъра. Моля, опитайте по-късно');
        if (errorInfo.details && Array.isArray(errorInfo.details)) {
          const v = errorInfo.details.map(e => e.message).join(', ');
          throw new Error(`${errorInfo.message}: ${v}`);
        }
        throw new Error(errorInfo.message || 'Възникна грешка');
      }

      if (data.success === false) {
        const errorInfo = data.error || { message: 'Възникна грешка' };
        if (errorInfo.details && Array.isArray(errorInfo.details)) {
          throw new Error(`${errorInfo.message}: ${errorInfo.details.map(e => e.message).join(', ')}`);
        }
        throw new Error(errorInfo.message || 'Възникна грешка');
      }

      if (data.success === true && data.data !== undefined) return data.data;
      return data;

    } catch (error) {
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        throw new Error('Няма връзка със сървъра. Проверете дали backend-ът работи.');
      }
      throw error;
    }
  },

  get(endpoint)          { return this.request(endpoint); },
  post(endpoint, body)   { return this.request(endpoint, { method: 'POST',   body: JSON.stringify(body) }); },
  put(endpoint, body)    { return this.request(endpoint, { method: 'PUT',    body: JSON.stringify(body) }); },
  patch(endpoint, body)  { return this.request(endpoint, { method: 'PATCH',  body: JSON.stringify(body) }); },
  delete(endpoint)       { return this.request(endpoint, { method: 'DELETE' }); }
};

// UI Helpers
const ui = {
  showLoading(element) { element.innerHTML = '<div class="loading">Зареждане...</div>'; },
  showError(element, message) { element.innerHTML = `<div class="alert alert-error">${message}</div>`; },
  showSuccess(element, message) { element.innerHTML = `<div class="alert alert-success">${message}</div>`; },
  clearAlerts(element) { element.innerHTML = ''; },

  formatDate(dateStr) {
    return new Date(dateStr).toLocaleDateString('bg-BG', {
      year: 'numeric', month: 'long', day: 'numeric'
    });
  },

  formatPrice(price) { return `€${parseFloat(price).toFixed(2)}`; },

  getStatusBadge(status) {
    const map = {
      'pending':   { text: 'Чакаща',    cls: 'status-pending' },
      'approved':  { text: 'Одобрена',  cls: 'status-approved' },
      'rejected':  { text: 'Отказана',  cls: 'status-rejected' },
      'completed': { text: 'Приключена',cls: 'status-completed' },
      'cancelled': { text: 'Отменена',  cls: 'status-cancelled' }
    };
    const s = map[status] || { text: status, cls: '' };
    return `<span class="status ${s.cls}">${s.text}</span>`;
  },

  getCarTypeBg(type) {
    return { sedan:'🚗', suv:'🚙', coupe:'🏎️', minivan:'🚐', truck:'🛻', sport:'🏁' }[type] || '🚗';
  },

  generateStars(rating) {
    let html = '<div class="rating">';
    for (let i = 1; i <= 5; i++) html += `<span class="${i <= rating ? 'active' : ''}">★</span>`;
    html += '</div>';
    return html;
  },

  showFieldErrors(formElement, errors) {
    formElement.querySelectorAll('.field-error').forEach(el => el.remove());
    formElement.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));
    if (!errors || !Array.isArray(errors)) return;
    errors.forEach(error => {
      const field = formElement.querySelector(`[name="${error.field}"]`);
      if (field) {
        field.classList.add('is-invalid');
        const div = document.createElement('div');
        div.className = 'field-error';
        div.style.cssText = 'color:#dc3545;font-size:0.875em;margin-top:4px;';
        div.textContent = error.message;
        field.parentNode.appendChild(div);
      }
    });
  },

  clearFieldErrors(formElement) {
    formElement.querySelectorAll('.field-error').forEach(el => el.remove());
    formElement.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));
  }
};

// Mobile Menu Toggle
function toggleMobileMenu() {
  const nav = document.querySelector('nav ul');
  if (nav) {
    nav.classList.toggle('active');
    document.body.style.overflow = nav.classList.contains('active') ? 'hidden' : '';
  }
}

document.addEventListener('click', (e) => {
  const nav = document.querySelector('nav ul');
  const menuBtn = document.querySelector('.mobile-menu-btn');
  if (nav && nav.classList.contains('active') && !nav.contains(e.target) && menuBtn && !menuBtn.contains(e.target)) {
    nav.classList.remove('active');
    document.body.style.overflow = '';
  }
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    const nav = document.querySelector('nav ul');
    if (nav && nav.classList.contains('active')) {
      nav.classList.remove('active');
      document.body.style.overflow = '';
    }
  }
});

// Header Update
function updateHeaderForAuth() {
  const nav = document.querySelector('nav ul');
  if (!nav) return;

  if (auth.isLoggedIn()) {
    // Admin link (prepend)
    if (auth.isAdmin()) {
      const adminLi = document.createElement('li');
      adminLi.innerHTML = `<a href="admin.html">👑 Админ</a>`;
      nav.insertBefore(adminLi, nav.firstChild);
    }

    // Profile link
    const profileLi = document.createElement('li');
    profileLi.innerHTML = `<a href="profile.html">👤 ${auth.user.first_name}</a>`;
    nav.appendChild(profileLi);

    // My requests link
    const requestsLi = document.createElement('li');
    requestsLi.innerHTML = `<a href="my-requests.html">📋 Заявки</a>`;
    nav.appendChild(requestsLi);

    // Logout
    const logoutLi = document.createElement('li');
    logoutLi.innerHTML = `<a href="#" id="logoutBtn">Изход</a>`;
    logoutLi.querySelector('#logoutBtn').addEventListener('click', (e) => {
      e.preventDefault();
      auth.logout();
    });
    nav.appendChild(logoutLi);

  } else {
    const loginLi = document.createElement('li');
    loginLi.innerHTML = `<a href="login.html">Вход</a>`;
    const registerLi = document.createElement('li');
    registerLi.innerHTML = `<a href="register.html" class="btn btn-sm">Регистрация</a>`;
    nav.appendChild(loginLi);
    nav.appendChild(registerLi);
  }
}

// Form Validation
function validateForm(formData, rules) {
  const errors = {};
  for (const [field, rule] of Object.entries(rules)) {
    const value = formData[field];
    if (rule.required && !value)                                  errors[field] = rule.message || 'Това поле е задължително';
    if (rule.minLength && value && value.length < rule.minLength) errors[field] = rule.message || `Минимум ${rule.minLength} символа`;
    if (rule.email && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) errors[field] = rule.message || 'Невалиден имейл адрес';
    if (rule.passwordMatch && value !== formData[rule.passwordMatch]) errors[field] = rule.message || 'Паролите не съвпадат';
  }
  return { isValid: Object.keys(errors).length === 0, errors };
}

// Car Card HTML Generator
function createCarCard(car) {
  return `
    <div class="car-card" data-id="${car.id}">
      <img src="${car.image_url || 'https://via.placeholder.com/400x300?text=No+Image'}"
           alt="${car.brand} ${car.model}" class="car-image">
      <div class="car-details">
        <h3 class="car-title">${car.brand} <span>${car.model}</span></h3>
        <div class="car-info">
          <span>${ui.getCarTypeBg(car.type)} ${car.type}</span>
          <span>📅 ${car.year}</span>
          <span>🪑 ${car.seats} места</span>
          <span>⚙️ ${car.transmission}</span>
          <span>⛽ ${car.fuel_type}</span>
        </div>
        <p class="car-price">${ui.formatPrice(car.price_per_day)} <span>/ ден</span></p>
        <a href="car-details.html?id=${car.id}" class="btn btn-primary" style="width:100%">Виж детайли</a>
      </div>
    </div>`;
}

// Template Card HTML Generator
function createTemplateCard(template) {
  const icons = { 'Уикенд': '🏖️', 'Седмичен': '📅', 'Бизнес': '💼' };
  return `
    <div class="template-card">
      <div class="template-icon">${icons[template.name] || '📦'}</div>
      <h3 class="template-name">${template.name}</h3>
      <p class="template-duration">${template.duration_days} дни</p>
      <div class="template-discount">${template.discount_percent}% отстъпка</div>
      <p class="template-description">${template.description || 'Описание не е налично'}</p>
      <a href="create-request.html?template=${template.id}" class="btn btn-primary">Избери</a>
    </div>`;
}

// Comment HTML Generator
function createCommentHTML(comment) {
  const author = comment.first_name && comment.last_name
    ? `${comment.first_name} ${comment.last_name}`
    : comment.guest_name || 'Анонимен';
  return `
    <div class="comment">
      <div class="comment-header">
        <span class="comment-author">${author}</span>
        <span class="comment-date">${ui.formatDate(comment.created_at)}</span>
      </div>
      ${comment.rating ? ui.generateStars(comment.rating) : ''}
      <p class="comment-content">${comment.content}</p>
    </div>`;
}

// Export
window.LuxeAuto = { auth, api, ui, validateForm, createCarCard, createTemplateCard, createCommentHTML };
