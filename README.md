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
- [Utilities](#utilities)

## 📖 Overview
This application enables users to browse a catalog of high-end vehicles, view rental packages (templates), and make reservation requests. Administrators have full control over the fleet, rental templates, and can approve or reject booking requests via a dedicated dashboard.

## ✨ Features

### 👤 Client Features
- **User Authentication**: Secure registration and login (JWT-based).
- **Vehicle Catalog**: Browse luxury cars with filters for brand, type, and price.
- **Rental Templates**: Choose from pre-configured packages (e.g., Weekend Special, Business).
- **Request Management**: Create, view, and cancel rental requests.
- **Responsive UI**: Optimized for desktop and mobile devices.

### 🛡️ Admin Features
- **Dashboard**: View key metrics (Revenue, Top Cars, Request Status).
- **Fleet Management**: Add, edit, and remove vehicles.
- **Request Processing**: Workflow to Approve/Reject/Complete rental requests.
- **Template Control**: Manage rental packages and discounts.

## 🛠 Tech Stack
- **Backend**: Node.js, Express.js
- **Database**: MySQL
- **Frontend**: HTML5, CSS3, JavaScript (Vanilla)
- **Security**: bcrypt (hashing), jsonwebtoken (auth), cors

```bash
cd backend
HOST=0.0.0.0 PORT=3000 npm start
```

The server will be accessible at:
- Local: `http://localhost:3000`
- LAN: `http://YOUR_IP_ADDRESS:3000`

Пример: `http://192.168.1.100:3000`
Example: `http://192.168.1.100:3000`

2.  **Database Configuration**
    - Create a MySQL database named `luxe_auto_resort`.
    - Run the schema script to create tables:
      ```bash
      mysql -u root -p luxe_auto_resort < database/schema.sql
      ```
    - Ensure `backend/config/database.js` contains your correct DB credentials.

3.  **Backend Dependencies**
    ```bash
    cd backend
    npm install
    ```

4.  **Start the Application**
    ```bash
    node server.js
    ```
    The server will start on port **3000**.
    - **App URL**: `http://localhost:3000`
    - **API Base**: `http://localhost:3000/api`

## 🧑‍💻 Demo Accounts

The database is seeded with the following accounts for testing purposes. The passwords are provided here for convenience, but are stored securely hashed in the database.

| Role          | Email             | Password  |
|---------------|-------------------|-----------|
| Administrator | admin@luxeauto.bg | admin123  |
| Client        | ivan@abv.bg       | ivan123   |
| Client        | maria@abv.bg      | mariya123 |


## 🔧 Utilities

### Image Normalization
A script is available to standardize image filenames (format: `brand-model-year-id.ext`) and update the database references.

```bash
node backend/scripts/rename_images.js
```
*⚠️ **Warning**: Back up your database and images folder before running this script.*
