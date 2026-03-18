# Luxe Auto Resort

**Luxe Auto Resort** is a premium car rental management platform designed to provide a seamless booking experience for luxury vehicles. The system features a robust backend API, a dynamic frontend, and a comprehensive admin dashboard for fleet and reservation management.

## 📑 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Installation & Setup](#installation--setup)
- [Project Structure](#project-structure)
- [API Documentation](#api-documentation)
- [Database Schema](#database-schema)
- [Error Handling](#error-handling)
- [Demo Accounts](#demo-accounts)
- [Utilities](#utilities)
- [Deployment](#deployment)

## 📖 Overview

This application enables users to browse a catalog of high-end vehicles, view rental packages (templates), and make reservation requests. Administrators have full control over the fleet, rental templates, and can approve or reject booking requests via a dedicated dashboard.

The platform supports:
- Multi-vehicle selection for a single rental request
- Pre-configured rental templates with discounts
- Real-time availability checking
- Comprehensive admin analytics

## ✨ Features

### 👤 Client Features

- **User Authentication**: Secure registration and login with JWT-based session management
- **Vehicle Catalog**: Browse luxury cars with filters for brand, type, price range, and availability
- **Rental Templates**: Choose from pre-configured packages (e.g., Weekend Special, Business Trip) with automatic discount calculation
- **Multi-Vehicle Requests**: Select multiple vehicles in a single rental request
- **Request Management**: Create, view, track status, and cancel rental requests
- **Comments & Reviews**: Leave feedback about the platform and rental templates
- **Responsive UI**: Optimized for desktop, tablet, and mobile devices

### 🛡️ Admin Features

- **Dashboard**: View key metrics including:
  - Revenue statistics
  - Top rented vehicles
  - Request status distribution
  - Total clients and fleet size
- **Fleet Management**: Add, edit, and remove vehicles with full specifications
- **Request Processing**: Complete workflow to approve, reject, or complete rental requests
- **Template Control**: Manage rental packages, duration, and discount percentages
- **Comment Moderation**: Approve or reject user comments before they appear publicly
- **Contact Messages**: View and manage messages submitted through the contact form

## 🛠 Tech Stack

| Layer | Technology |
|-------|------------|
| **Backend** | Node.js, Express.js |
| **Database** | MySQL 8.0+ (with mysql2/promise) |
| **Frontend** | HTML5, CSS3, Vanilla JavaScript (ES6+) |
| **Authentication** | JWT (jsonwebtoken), bcrypt |
| **Security** | CORS, Input Validation, SQL Injection Protection |

### Dependencies

```json
{
  "express": "^4.18.2",
  "mysql2": "^3.6.5",
  "jsonwebtoken": "^9.0.2",
  "bcrypt": "^5.1.1",
  "cors": "^2.8.5"
}
```

## Prerequisites

Before running this application, ensure you have:

- **Node.js** (v16 or higher)
- **MySQL** (v8.0 or higher)
- **npm** (comes with Node.js)
- A modern web browser

## Installation & Setup

### 1. Clone and Navigate

```bash
git clone <repository-url>
cd luxe-auto-resort
```

### 2. Database Setup

Create the database and import the schema:

```bash
# Create database
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS luxe_auto_resort CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# Import schema
mysql -u root -p luxe_auto_resort < database/schema.sql

# Seed with demo data (optional but recommended)
mysql -u root -p luxe_auto_resort < database/seed.sql
```

### 3. Backend Configuration

```bash
cd backend
npm install
```

Update database credentials in `backend/config/database.js` if needed:

```javascript
const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'your_password',
  database: 'luxe_auto_resort'
});
```

### 4. Start the Application

```bash
# From the backend directory
npm start
# OR
node server.js

# For LAN access (allows other devices on your network to connect)
HOST=0.0.0.0 PORT=3000 npm start
```

The server will start on port **3000**.

**Access URLs:**
- Local: `http://localhost:3000`
- Network: `http://YOUR_IP_ADDRESS:3000`

**Keyboard Shortcuts (when server is running):**
- `r` - Restart server
- `x` - Exit

## Project Structure

```
luxe-auto-resort/
├── backend/
│   ├── config/
│   │   └── database.js          # MySQL connection pool
│   ├── middleware/
│   │   └── auth.js              # JWT verification, role checks
│   ├── routes/
│   │   ├── auth.js              # Authentication endpoints
│   │   ├── cars.js              # Vehicle CRUD + filtering
│   │   ├── requests.js          # Rental request lifecycle
│   │   ├── templates.js         # Rental package management
│   │   ├── costs.js             # Additional costs
│   │   ├── contacts.js          # Contact form handling
│   │   └── comments.js          # Review system
│   ├── utils/
│   │   └── errors.js            # Error classes and validation
│   ├── scripts/
│   │   └── rename_images.js     # Image normalization utility
│   ├── server.js                # Express app entry point
│   └── package.json
│
├── database/
│   ├── schema.sql               # Database structure
│   └── seed.sql                 # Demo data
│
├── frontend/
│   ├── css/
│   │   └── style.css            # Global styles with CSS variables
│   ├── js/
│   │   └── main.js              # API client, auth state, utilities
│   ├── images/                  # Vehicle images
│   ├── index.html               # Landing page
│   ├── cars.html                # Vehicle catalog
│   ├── car-details.html         # Single vehicle view
│   ├── templates.html           # Rental packages
│   ├── create-request.html      # Booking form
│   ├── my-requests.html         # User's rental history
│   ├── login.html / register.html
│   ├── admin.html               # Admin dashboard
│   ├── contacts.html            # Contact form
│   └── comments.html            # Platform reviews
│
├── docs/
│   └── Diploma_Documentation.md  # Full technical documentation (BG)
├── README.md
├── TODO.md                      # Development task tracking
└── CLAUDE.md                    # Claude Code guidance
```

## API Documentation

### Base URL

```
http://localhost:3000/api
```

### Authentication

All protected endpoints require a JWT token in the Authorization header:

```
Authorization: Bearer <token>
```

### Endpoints Overview

#### Authentication (`/auth`)

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| POST | `/register` | Register new client | Public |
| POST | `/login` | Login and receive JWT | Public |
| GET | `/me` | Get current user info | Authenticated |

**Registration Validation:**
- Email: Valid format, unique
- Password: Minimum 6 characters, must contain at least one letter and one number
- First/Last name: 2-50 characters
- Phone: Optional, validated format

#### Cars (`/cars`)

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/` | List all cars with filters | Public |
| GET | `/:id` | Get specific car details | Public |
| POST | `/` | Create new car | Admin |
| PUT | `/:id` | Update car details | Admin |
| DELETE | `/:id` | Delete car | Admin |

**Query Parameters (GET /):**
- `brand` - Filter by brand (e.g., "BMW")
- `type` - Filter by type (sedan, suv, coupe, minivan, truck, sport)
- `min_price` / `max_price` - Price range filters
- `available` - `true` to show only available cars
- `sort` - Sorting: `price_asc`, `price_desc`, `year_desc`

#### Rental Requests (`/requests`)

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| POST | `/` | Create new request | Authenticated |
| GET | `/my` | Get current user's requests | Authenticated |
| GET | `/` | Get all requests (admin view) | Admin |
| GET | `/:id` | Get request details | Owner/Admin |
| PATCH | `/:id/status` | Update status | Admin |
| POST | `/:id/cancel` | Cancel pending request | Owner |

**Request Body (POST /):**
```json
{
  "car_ids": [1, 2],
  "start_date": "2024-12-01",
  "end_date": "2024-12-05",
  "template_id": 1,
  "notes": "Late pick-up requested"
}
```

**Status Workflow:**
```
pending → approved → completed
   ↓
rejected / cancelled
```

#### Templates (`/templates`)

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/` | List all active templates | Public |
| GET | `/:id` | Get template details | Public |
| POST | `/` | Create template | Admin |
| PUT | `/:id` | Update template | Admin |
| DELETE | `/:id` | Delete template | Admin |

#### Admin Dashboard (`/admin`)

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/dashboard` | Get platform statistics | Admin |

**Dashboard Response:**
```json
{
  "success": true,
  "status_counts": [{"status": "approved", "count": 10}],
  "top_cars": [{"id": 1, "brand": "BMW", "rental_count": 5}],
  "total_stats": {
    "total_rentals": 25,
    "total_revenue": 15000.00,
    "total_clients": 10,
    "total_cars": 15
  }
}
```

#### Comments (`/comments`)

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/platform` | Get approved platform comments | Public |
| GET | `/template/:id` | Get approved template comments | Public |
| POST | `/platform` | Create platform comment | Authenticated |
| POST | `/template/:id` | Create template comment | Authenticated |
| GET | `/pending` | Get pending comments (admin) | Admin |
| PATCH | `/:id/status` | Approve/reject comment | Admin |

#### Contacts (`/contacts`)

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| POST | `/` | Submit contact message | Public |
| GET | `/` | Get all messages | Admin |
| PATCH | `/:id/read` | Mark as read | Admin |

### Health Check

```
GET /api/health
```

Returns server status and timestamp.

## Database Schema

### Core Tables

**users** - User accounts
- `id`, `email`, `password` (bcrypt hashed)
- `first_name`, `last_name`, `phone`
- `role` (enum: 'client', 'admin')
- `created_at`, `updated_at`

**cars** - Vehicle fleet
- `id`, `brand`, `model`, `year`
- `color`, `license_plate` (unique)
- `price_per_day` (decimal)
- `type` (enum: sedan, suv, coupe, minivan, truck, sport)
- `seats`, `transmission` (manual/automatic)
- `fuel_type` (petrol, diesel, electric, hybrid)
- `mileage`, `image_url`, `description`
- `available` (boolean)

**templates** - Rental packages
- `id`, `name`, `description`
- `duration_days`, `discount_percent`
- `is_active`

**template_options** - Add-ons for templates
- `id`, `template_id` (FK)
- `name`, `price`, `is_included`

**rental_requests** - Booking records
- `id`, `user_id` (FK), `template_id` (FK, nullable)
- `start_date`, `end_date`
- `total_price` (calculated)
- `status` (pending, approved, rejected, completed, cancelled)
- `notes`

**request_cars** - Many-to-many linking
- `id`, `request_id` (FK), `car_id` (FK)
- Unique constraint on (request_id, car_id)

**contact_messages** - Contact form submissions
- `id`, `name`, `email`, `subject`, `message`
- `is_read`

**platform_comments** / **template_comments** - Review system
- `id`, `user_id` (FK), `content`, `rating` (1-5)
- `status` (pending, approved, rejected)

### Indexes

Performance-optimized indexes on:
- `users`: email, role
- `cars`: brand, price, available, type
- `rental_requests`: user_id, status, dates

## Error Handling

The API uses standardized error responses:

```json
{
  "success": false,
  "error": {
    "message": "Human-readable error message",
    "code": "ERROR_CODE",
    "details": [
      { "field": "email", "message": "Email is required" }
    ]
  }
}
```

### Error Codes

| Code | Description |
|------|-------------|
| `VALIDATION_ERROR` | Input validation failed |
| `INVALID_CREDENTIALS` | Wrong email or password |
| `EMAIL_ALREADY_EXISTS` | Email already registered |
| `TOKEN_EXPIRED` / `TOKEN_INVALID` | JWT issues |
| `UNAUTHORIZED` | Authentication required |
| `FORBIDDEN` | Insufficient permissions |
| `NOT_FOUND` | Resource not found |
| `DATABASE_ERROR` | Database operation failed |

## Demo Accounts

After running `seed.sql`, the following accounts are available:

| Role | Email | Password |
|------|-------|----------|
| Administrator | admin@luxeauto.bg | admin123 |
| Client | ivan@abv.bg | ivan123 |
| Client | maria@abv.bg | mariya123 |

## Utilities

### Image Normalization

Standardizes vehicle image filenames to format: `brand-model-year-id.ext`

```bash
node backend/scripts/rename_images.js
```

⚠️ **Warning**: Back up your database and images folder before running this script.

### Environment Variables

Optional environment variables for configuration:

```bash
# Database
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=luxe_auto_resort

# Security
JWT_SECRET=your_secret_key_here

# CORS
FRONTEND_URL=http://localhost:3000
```

## Deployment

### Production Checklist

1. **Environment Variables**: Move all sensitive data to `.env` file
2. **Node Environment**: Set `NODE_ENV=production`
3. **Process Manager**: Use PM2 for process management
   ```bash
   npm install -g pm2
   pm2 start backend/server.js --name luxe-auto-resort
   ```
4. **Reverse Proxy**: Configure Nginx or Apache
5. **Database**: Use managed MySQL service (AWS RDS, etc.)
6. **SSL/TLS**: Enable HTTPS
7. **Static Files**: Consider CDN for frontend assets

### Security Considerations

- All passwords are hashed with bcrypt (10+ rounds)
- JWT tokens expire after 24 hours
- SQL injection protection via parameterized queries
- CORS configured for specific origins
- Input validation on all endpoints
- Role-based access control for admin operations

## License

This project was developed as a diploma thesis. All rights reserved.

## Documentation

- **Full Technical Documentation**: See `docs/Diploma_Documentation.md` (Bulgarian)
- **Developer Guide**: See `CLAUDE.md`
- **API Reference**: See `backend/API.md`

---

*Developed 2024 - Luxe Auto Resort*
