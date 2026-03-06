// Luxe Auto Resort - Main JavaScript

// API Configuration - Dynamic for LAN access
const API_BASE = (() => {
  const hostname = window.location.hostname;
  const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';
  const port = isLocalhost ? '3000' : window.location.port || '3000';
  return `http://${hostname}:${port}/api`;
})();

// Debug info (remove in production)
console.log(`API Base URL: ${API_BASE}`);
console.log(`Accessing from: ${window.location.href}`);

// Auth State
const auth = {
  token: localStorage.getItem('token'),
  user: JSON.parse(localStorage.getItem('user') || 'null'),
  
  isLoggedIn() {
    return !!this.token;
  },
  
  isAdmin() {
    return this.user?.role === 'admin';
  },
  
  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    this.token = null;
    this.user = null;
    window.location.href = 'index.html';
  }
};

// API Helper with Error Handling
const api = {
  async request(endpoint, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };
    
    if (auth.token) {
      headers['Authorization'] = `Bearer ${auth.token}`;
    }
    
    try {
      const response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers,
        credentials: 'include'
      });
      
      // Handle non-JSON responses
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('Non-JSON response:', text);
        throw new Error('Сървърът върна неочакван отговор');
      }
      
      const data = await response.json();
      
      if (!response.ok) {
        // Handle specific error codes
        if (response.status === 401) {
          auth.logout();
          throw new Error('Моля, влезте отново');
        }
        if (response.status === 403) {
          throw new Error('Нямате права за това действие');
        }
        if (response.status === 404) {
          throw new Error('Ресурсът не е намерен');
        }
        if (response.status >= 500) {
          throw new Error('Грешка на сървъра. Моля, опитайте по-късно');
        }
        throw new Error(data.error || 'Възникна грешка');
      }
      
      return data;
    } catch (error) {
      // Network error handling
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        console.error('Network error:', error);
        throw new Error('Няма връзка със сървъра. Проверете дали backend-ът работи.');
      }
      console.error('API Error:', error);
      throw error;
    }
  },
  
  get(endpoint) {
    console.log(`GET: ${API_BASE}${endpoint}`);
    return this.request(endpoint);
  },
  
  post(endpoint, body) {
    console.log(`POST: ${API_BASE}${endpoint}`);
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(body)
    });
  },
  
  put(endpoint, body) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(body)
    });
  },
  
  patch(endpoint, body) {
    return this.request(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(body)
    });
  },
  
  delete(endpoint) {
    return this.request(endpoint, {
      method: 'DELETE'
    });
  }
};

// UI Helpers
const ui = {
  showLoading(element) {
    element.innerHTML = '<div class="loading">Зареждане...</div>';
  },
  
  showError(element, message) {
    element.innerHTML = `<div class="alert alert-error">${message}</div>`;
  },
  
  showSuccess(element, message) {
    element.innerHTML = `<div class="alert alert-success">${message}</div>`;
  },
  
  clearAlerts(element) {
    element.innerHTML = '';
  },
  
  formatDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('bg-BG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  },
  
  formatPrice(price) {
    return `${parseFloat(price).toFixed(2)} лв.`;
  },
  
  getStatusBadge(status) {
    const statusMap = {
      'pending': { text: 'Чакаща', class: 'status-pending' },
      'approved': { text: 'Одобрена', class: 'status-approved' },
      'rejected': { text: 'Отказана', class: 'status-rejected' },
      'completed': { text: 'Приключена', class: 'status-completed' },
      'cancelled': { text: 'Отменена', class: 'status-cancelled' }
    };
    
    const s = statusMap[status] || { text: status, class: '' };
    return `<span class="status ${s.class}">${s.text}</span>`;
  },
  
  getCarTypeBg(type) {
    const types = {
      'sedan': '🚗',
      'suv': '🚙',
      'coupe': '🏎️',
      'minivan': '🚐',
      'truck': '🛻',
      'sport': '🏁'
    };
    return types[type] || '🚗';
  },
  
  generateStars(rating) {
    let html = '<div class="rating">';
    for (let i = 1; i <= 5; i++) {
      html += `<span class="${i <= rating ? 'active' : ''}">★</span>`;
    }
    html += '</div>';
    return html;
  }
};

// Mobile Menu Toggle - Touch-friendly
function toggleMobileMenu() {
  const nav = document.querySelector('nav ul');
  if (nav) {
    nav.classList.toggle('active');
    
    // Prevent body scroll when menu is open
    if (nav.classList.contains('active')) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
  }
}

// Close mobile menu when clicking outside
document.addEventListener('click', (e) => {
  const nav = document.querySelector('nav ul');
  const menuBtn = document.querySelector('.mobile-menu-btn');
  
  if (nav && nav.classList.contains('active')) {
    if (!nav.contains(e.target) && !menuBtn.contains(e.target)) {
      nav.classList.remove('active');
      document.body.style.overflow = '';
    }
  }
});

// Close mobile menu when pressing Escape
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    const nav = document.querySelector('nav ul');
    if (nav && nav.classList.contains('active')) {
      nav.classList.remove('active');
      document.body.style.overflow = '';
    }
  }
});

// Header Update (for logged in users)
function updateHeaderForAuth() {
  const nav = document.querySelector('nav ul');
  if (!nav) return;
  
  if (auth.isLoggedIn()) {
    const userLi = document.createElement('li');
    userLi.innerHTML = `<span>Здравей, ${auth.user.first_name}!</span>`;
    
    const profileLi = document.createElement('li');
    profileLi.innerHTML = `<a href="my-requests.html">Моите заявки</a>`;
    
    const logoutLi = document.createElement('li');
    logoutLi.innerHTML = `<a href="#" id="logoutBtn">Изход</a>`;
    logoutLi.querySelector('#logoutBtn').addEventListener('click', (e) => {
      e.preventDefault();
      auth.logout();
    });
    
    nav.appendChild(userLi);
    nav.appendChild(profileLi);
    nav.appendChild(logoutLi);
    
    // Add admin link if admin
    if (auth.isAdmin()) {
      const adminLi = document.createElement('li');
      adminLi.innerHTML = `<a href="admin.html">Админ Панел</a>`;
      nav.insertBefore(adminLi, nav.firstChild);
    }
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
    
    if (rule.required && !value) {
      errors[field] = rule.message || 'Това поле е задължително';
    }
    
    if (rule.minLength && value && value.length < rule.minLength) {
      errors[field] = rule.message || `Минимум ${rule.minLength} символа`;
    }
    
    if (rule.email && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      errors[field] = rule.message || 'Невалиден имейл адрес';
    }
    
    if (rule.passwordMatch && value !== formData[rule.passwordMatch]) {
      errors[field] = rule.message || 'Паролите не съвпадат';
    }
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
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
    </div>
  `;
}

// Template Card HTML Generator
function createTemplateCard(template) {
  const icons = {
    'Уикенд': '🏖️',
    'Седмичен': '📅',
    'Бизнес': '💼'
  };
  
  return `
    <div class="template-card">
      <div class="template-icon">${icons[template.name] || '📦'}</div>
      <h3 class="template-name">${template.name}</h3>
      <p class="template-duration">${template.duration_days} дни</p>
      <div class="template-discount">${template.discount_percent}% отстъпка</div>
      <p class="template-description">${template.description || 'Описание не е налично'}</p>
      <a href="create-request.html?template=${template.id}" class="btn btn-primary">Избери</a>
    </div>
  `;
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
    </div>
  `;
}

// Export for use in other scripts
window.LuxeAuto = {
  auth,
  api,
  ui,
  validateForm,
  createCarCard,
  createTemplateCard,
  createCommentHTML
};

