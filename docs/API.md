# Luxe Auto Resort - API Documentation 📡

## Base URL
`http://localhost:3000/api`

## Error Handling
Responses follow a standard format. In case of error:
```json
{
  "success": false,
  "error": {
    "message": "Error description",
    "code": "ERROR_CODE",
    "details": []
  }
}
```

## Endpoints

### 🔐 Authentication (`/auth`)

| Method | Endpoint    | Description                     | Access |
|--------|-------------|---------------------------------|--------|
| POST   | `/register` | Register a new client           | Public |
| POST   | `/login`    | Login to receive JWT token      | Public |
| GET    | `/me`       | Get current logged-in user info | User   |

### 🚗 Cars (`/cars`)

| Method | Endpoint | Description                      | Access |
|--------|----------|----------------------------------|--------|
| GET    | `/`      | List all cars (filters avail.)   | Public |
| GET    | `/:id`   | Get specific car details         | Public |
| POST   | `/`      | Create a new car entry           | Admin  |
| PUT    | `/:id`   | Update car details               | Admin  |
| DELETE | `/:id`   | Delete a car                     | Admin  |

**Query Parameters (GET /):**
- `brand`: Filter by brand
- `type`: Filter by type (sedan, suv, coupe, etc.)
- `min_price` / `max_price`: Price range
- `available`: `true` (only available cars)
- `sort`: `price_asc`, `price_desc`, `year_desc`

### 📝 Rental Requests (`/requests`)

| Method | Endpoint      | Description                      | Access |
|--------|---------------|----------------------------------|--------|
| POST   | `/`           | Submit a new rental request      | User   |
| GET    | `/my`         | Get current user's requests      | User   |
| GET    | `/`           | Get all requests (admin view)    | Admin  |
| GET    | `/:id`        | Get request details              | User*  |
| PATCH  | `/:id/status` | Update status (approve/reject)   | Admin  |
| POST   | `/:id/cancel` | Cancel a pending request         | User   |

*\*User can only view their own requests unless Admin.*

**Request Body (POST /):**
```json
{
  "car_ids": [1, 2],
  "start_date": "2023-12-01",
  "end_date": "2023-12-05",
  "template_id": 1, // Optional
  "notes": "Late pick-up"
}
```

### 📦 Templates (`/templates`)

| Method | Endpoint | Description           | Access |
|--------|----------|-----------------------|--------|
| GET    | `/`      | List all templates    | Public |
| GET    | `/:id`   | Get template details  | Public |
| POST   | `/`      | Create template       | Admin  |
| PUT    | `/:id`   | Update template       | Admin  |
| DELETE | `/:id`   | Delete template       | Admin  |

### 📊 Admin Dashboard (`/admin`)

| Method | Endpoint     | Description                     | Access |
|--------|--------------|---------------------------------|--------|
| GET    | `/dashboard` | Get platform statistics         | Admin  |

**Dashboard Response Includes:**
- `status_counts`: Rentals by status
- `top_cars`: Most rented vehicles
- `total_stats`: Revenue, client count, etc.