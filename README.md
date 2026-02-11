# Luxe Auto Resort

Луксозно уеб приложение за наемане на автомобили - дипломен проект.

## 🚀 Технологии

- **Frontend**: HTML, CSS, JavaScript (Vanilla)
- **Backend**: Node.js, Express
- **База данни**: MySQL
- **Автентикация**: JWT + bcrypt

## 📋 Изисквания

- Node.js (v14+)
- MySQL (v5.7+)

## 🖥️ LAN Достъп (за тестване от телефон)

### Стартиране за LAN достъп

```bash
cd backend
HOST=0.0.0.0 PORT=3000 npm start
```

Сървърът ще бъде достъпен на:
- Локално: `http://localhost:3000`
- В LAN: `http://YOUR_IP_ADDRESS:3000`

Пример: `http://192.168.1.100:3000`

### Автоматично откриване на IP

Ако не знаете вашия IP адрес, може да го откриете с:

**macOS:**
```bash
ipconfig getifaddr en0
```

**Linux/Windows:**
```bash
hostname -I
```

## 🔧 Отстраняване на проблеми

### API не работи през LAN

1. **Проверете CORS настройките** - уверете се, че `FRONTEND_URL` е правилно конфигуриран
2. **Проверете HOST** - сървърът трябва да слуша на `0.0.0.0`, не само на `localhost`
3. **Firewall** - уверете се, че порт 3000 е отворен

### Проблеми със зареждане на данни

1. **Отворете DevTools** (F12) и проверете Console за грешки
2. **Проверете Network tab** за неуспешни API заявки
3. **Уверете се**, че backend сървърът работи

### Мобилни устройства

- Използвайте **Chrome DevTools** с **Device Mode** за тестване
- Или тествайте директно от вашия телефон в същата WiFi мрежа

## 📱 Мобилна поддръжка

Проектът включва:
- Пълна mobile responsiveness
- Touch-friendly бутони (min 48px height)
- Хамбургер меню за навигация
- Адаптивни таблици и карти
- Поддръжка на жестове

### 1. Инсталиране на зависимости

```bash
cd backend
npm install
```

### 2. Настройка на база данни

Създайте база данни в MySQL:
```sql
CREATE DATABASE luxe_auto_resort;
```

Импортирайте схемата и seed данните:
```bash
# Ако използвате MySQL клиент
mysql -u root -p luxe_auto_resort < database/schema.sql
mysql -u root -p luxe_auto_resort < database/seed.sql

# Или чрез phpMyAdmin/XAMPP
# Импортирайте файловете ръчно
```

### 3. Конфигурация

Създайте `.env` файл в `/backend` папката (по избор):
```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=luxe_auto_resort
JWT_SECRET=your_secret_key
PORT=3000
```

### 4. Стартиране

```bash
cd backend
npm start
```

Сървърът ще стартира на `http://localhost:3000`

## 🔐 Тестови акаунти

| Роля | Имейл | Парола |
|------|-------|--------|
| Администратор | admin@luxeauto.bg | admin123 |
| Клиент | ivan@abv.bg | ivan123 |
| Клиент | maria@abv.bg | mariya123 |

## 📁 Структура на проекта

```
lar/
├── backend/
│   ├── config/
│   │   └── database.js
│   ├── middleware/
│   │   └── auth.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── cars.js
│   │   ├── templates.js
│   │   ├── requests.js
│   │   ├── costs.js
│   │   ├── contacts.js
│   │   └── comments.js
│   ├── server.js
│   └── package.json
├── database/
│   ├── schema.sql
│   └── seed.sql
├── frontend/
│   ├── css/
│   │   └── style.css
│   ├── js/
│   │   └── main.js
│   ├── index.html
│   ├── cars.html
│   ├── car-details.html
│   ├── templates.html
│   ├── login.html
│   ├── register.html
│   ├── create-request.html
│   ├── my-requests.html
│   ├── contacts.html
│   ├── comments.html
│   └── admin.html
├── docs/
│   └── Diploma_Documentation.md
├── README.md
└── TODO.md
```

## 🌐 API Endpoints

### Автентикация
| Метод | Endpoint | Описание |
|-------|----------|----------|
| POST | `/api/auth/register` | Регистрация на клиент |
| POST | `/api/auth/login` | Вход в системата |
| GET | `/api/auth/me` | Текущ потребител |
| POST | `/api/auth/logout` | Изход |

### Автомобили
| Метод | Endpoint | Описание |
|-------|----------|----------|
| GET | `/api/cars` | Всички автомобили (филтри) |
| GET | `/api/cars/:id` | Детайли за автомобил |
| POST | `/api/cars` | Добавяне (админ) |
| PUT | `/api/cars/:id` | Редактиране (админ) |
| DELETE | `/api/cars/:id` | Изтриване (админ) |

### Шаблони
| Метод | Endpoint | Описание |
|-------|----------|----------|
| GET | `/api/templates` | Всички шаблони |
| GET | `/api/templates/:id` | Детайли за шаблон |
| POST | `/api/templates` | Създаване (админ) |
| PUT | `/api/templates/:id` | Редактиране (админ) |
| DELETE | `/api/templates/:id` | Изтриване (админ) |

### Заявки
| Метод | Endpoint | Описание |
|-------|----------|----------|
| POST | `/api/requests` | Създаване на заявка |
| GET | `/api/requests/my` | Моите заявки |
| GET | `/api/requests` | Всички заявки (админ) |
| PATCH | `/api/requests/:id/status` | Промяна на статус |
| POST | `/api/requests/:id/cancel` | Отмяна на заявка |

### Разходи
| Метод | Endpoint | Описание |
|-------|----------|----------|
| GET | `/api/costs/my` | Моите разходи |
| GET | `/api/costs/clients` | Разходи по клиенти (админ) |

### Контакти
| Метод | Endpoint | Описание |
|-------|----------|----------|
| POST | `/api/contacts` | Изпращане на съобщение |
| GET | `/api/contacts` | Всички съобщения (админ) |

### Коментари
| Метод | Endpoint | Описание |
|-------|----------|----------|
| GET | `/api/comments/platform` | Коментари за платформата |
| POST | `/api/comments/platform` | Добавяне на коментар |
| GET | `/api/comments/templates/:id` | Коментари за шаблон |
| POST | `/api/comments/templates/:id` | Добавяне за шаблон |
| GET | `/api/comments/pending` | Чакащи коментари (админ) |
| PATCH | `/api/comments/:id/approve` | Одобряване (админ) |
| DELETE | `/api/comments/:id` | Изтриване (админ) |

## 📱 Функционалности

- ✅ Регистрация и вход
- ✅ Преглед на автомобили с филтри
- ✅ Създаване на заявки за наем
- ✅ Множествен избор на автомобили
- ✅ Изчисляване на цена с отстъпки
- ✅ Админ панел
- ✅ Управление на автомобили
- ✅ Модерация на коментари
- ✅ Преглед на контактни съобщения

## 🎨 Дизайн

Цветова палитра:
- **Фон**: #171614
- **Акцент**: #4B88A2
- **Карти**: #ECE5F0
- **CTA**: #E98A15

## 📄 Документация

Пълната дипломна документация е налична в `/docs/Diploma_Documentation.md`

## 📝 License

Този проект е създаден за образователни цели.

