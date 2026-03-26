# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Luxe Auto Resort** is a premium car rental management platform with a Node.js/Express backend API and vanilla JavaScript frontend. It supports JWT-based authentication, role-based access control (client/admin), rental request workflows, and an admin dashboard.

## Development Commands

All commands should be run from the repository root unless specified otherwise.

### Backend

```bash
# Install dependencies
cd backend && npm install

# Start the server (port 3000)
cd backend && npm start
# OR
cd backend && node server.js

# Start with LAN access (accessible from other devices on network)
cd backend && HOST=0.0.0.0 PORT=3000 npm start
```

The server provides keyboard shortcuts when running:
- `r` - Restart server
- `x` - Exit

### Database

```bash
# Create database and tables
mysql -u root -p luxe_auto_resort < database/schema.sql

# Seed with demo data (includes admin and test client accounts)
mysql -u root -p luxe_auto_resort < database/seed.sql
```

### Utilities

```bash
# Normalize image filenames (format: brand-model-year-id.ext)
# WARNING: Backup database and images before running
node backend/scripts/rename_images.js
```

## Architecture

### Backend Structure (`backend/`)

```
backend/
├── server.js              # Express app entry point, route mounting, dashboard endpoint
├── config/
│   └── database.js        # MySQL connection pool (mysql2/promise)
├── middleware/
│   └── auth.js            # JWT verification, requireAuth, requireAdmin
├── routes/
│   ├── auth.js            # POST /register, POST /login, GET /me
│   ├── cars.js            # CRUD for vehicles with filtering/sorting
│   ├── requests.js        # Rental request lifecycle (create, approve, reject, complete)
│   ├── templates.js       # Rental package templates with options
│   ├── costs.js           # Additional cost management
│   ├── contacts.js        # Contact form submissions
│   └── comments.js        # Platform and template comments/reviews
├── utils/
│   └── errors.js          # Custom error classes, asyncHandler, validators
└── scripts/
    └── rename_images.js   # Image normalization utility
```

### Frontend Structure (`frontend/`)

Vanilla JavaScript SPA-like architecture with HTML pages:

```
frontend/
├── index.html             # Landing page
├── cars.html              # Vehicle catalog with filters
├── car-details.html       # Single car view
├── templates.html         # Rental package display
├── create-request.html    # Booking form (requires auth)
├── my-requests.html       # User's rental history (requires auth)
├── comments.html          # Platform reviews
├── contacts.html          # Contact form
├── login.html / register.html
├── admin.html             # Admin dashboard (admin only)
├── css/
│   └── style.css
├── js/
│   └── main.js            # API client, auth state, shared utilities
└── images/                # Vehicle images (brand-model-year-id.jpg)
```

### Database Schema

**Key Tables:**
- `users` - Clients and admins (role: 'client' | 'admin')
- `cars` - Vehicle fleet with specs, pricing, availability
- `templates` - Pre-configured rental packages (duration, discount)
- `template_options` - Add-ons for templates
- `rental_requests` - Booking records with status workflow
- `request_cars` - Many-to-many linking requests to cars
- `contact_messages` - Contact form submissions
- `platform_comments` / `template_comments` - Review system

**Request Status Workflow:**
`pending` → `approved` | `rejected` → `completed` (or `cancelled`)

## API Architecture

### Base URL
```
http://localhost:3000/api
```

### Authentication
JWT tokens passed in `Authorization: Bearer <token>` header. Token contains `{ userId, email, role }`.

### Error Response Format
All errors follow a standardized format:
```json
{
  "success": false,
  "error": {
    "message": "Human readable message",
    "code": "ERROR_CODE",
    "details": [] // Optional field-level errors
  }
}
```

Error codes defined in `backend/utils/errors.js`:
- Auth: `INVALID_CREDENTIALS`, `EMAIL_ALREADY_EXISTS`, `TOKEN_EXPIRED`, `UNAUTHORIZED`, `FORBIDDEN`
- Validation: `VALIDATION_ERROR`, `REQUIRED_FIELD`, `INVALID_DATE`, `DATE_IN_PAST`
- Resource: `NOT_FOUND`, `ALREADY_EXISTS`
- Server: `DATABASE_ERROR`, `INTERNAL_ERROR`

### Route Patterns

**Public Routes:**
- `GET /api/cars` - List with query filters (brand, type, min_price, max_price, available, sort)
- `GET /api/cars/:id` - Single car details
- `GET /api/templates` - List active templates
- `POST /api/auth/register` / `POST /api/auth/login`
- `POST /api/contacts` - Submit contact message

**Authenticated Routes** (requireAuth middleware):
- `POST /api/requests` - Create rental request
- `GET /api/requests/my` - Get current user's requests
- `POST /api/requests/:id/cancel` - Cancel pending request
- `GET /api/auth/me` - Current user info

**Admin Routes** (requireAuth + requireAdmin):
- `POST/PUT/DELETE /api/cars` - Fleet management
- `GET /api/requests` - All requests (admin view)
- `PATCH /api/requests/:id/status` - Approve/reject/complete
- `POST/PUT/DELETE /api/templates` - Template management
- `GET /api/admin/dashboard` - Statistics endpoint

## Key Implementation Details

### Frontend API Client (`frontend/js/main.js`)

The `api` object handles all fetch requests with automatic JWT injection:
```javascript
api.request(endpoint, options)     // Base fetch wrapper
api.get(endpoint)
api.post(endpoint, body)
api.put(endpoint, body)
api.patch(endpoint, body)
api.delete(endpoint)
```

Auth state is stored in localStorage (`token`, `user`) and exposed via global `auth` object.

### Validation Pattern

Routes use `asyncHandler` wrapper to eliminate try-catch boilerplate:
```javascript
const { asyncHandler, ValidationError, ErrorCodes } = require('../utils/errors');

router.post('/', requireAuth, asyncHandler(async (req, res) => {
  // Validation throws AppError subclasses
  if (!req.body.name) {
    throw new ValidationError('Name is required', { field: 'name' });
  }
  // ... handler logic
}));
```

### Database Queries

Uses mysql2/promise with connection pooling. Common pattern:
```javascript
const [rows] = await pool.query('SELECT * FROM cars WHERE id = ?', [id]);
```

## Demo Accounts

After running seed.sql:

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@luxeauto.bg | admin123 |
| Client | ivan@abv.bg | ivan123 |
| Client | maria@abv.bg | mariya123 |

## Environment Configuration

Database connection can be configured via environment variables (see `backend/config/database.js`):
- `DB_HOST` (default: localhost)
- `DB_USER` (default: root)
- `DB_PASSWORD` (default: root)
- `DB_NAME` (default: luxe_auto_resort)
- `JWT_SECRET` (default: luxe_auto_resort_secret_key_2024)
- `FRONTEND_URL` (default: http://localhost:3000)

## File Naming Conventions

- Vehicle images: `brand-model-year-id.jpg` (lowercase, hyphen-separated)
- Database tables: snake_case
- API responses: camelCase keys
- Frontend: kebab-case HTML files
