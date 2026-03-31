-- ============================================================
-- Luxe Auto Resort — Database Schema
-- Updated for availability system
-- ============================================================

CREATE DATABASE IF NOT EXISTS luxe_auto_resort
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE luxe_auto_resort;

-- ─────────────────────────────────────────────────────────────
-- USERS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
    id         INT AUTO_INCREMENT PRIMARY KEY,
    email      VARCHAR(255) NOT NULL UNIQUE,
    password   VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name  VARCHAR(100) NOT NULL,
    phone      VARCHAR(20),
    role       ENUM('admin', 'client') DEFAULT 'client',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_email (email),
    INDEX idx_role  (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ─────────────────────────────────────────────────────────────
-- CARS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cars (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    brand         VARCHAR(100) NOT NULL,
    model         VARCHAR(100) NOT NULL,
    year          INT          NOT NULL,
    color         VARCHAR(50),
    license_plate VARCHAR(20) UNIQUE,
    price_per_day DECIMAL(10,2) NOT NULL,
    type          ENUM('sedan','suv','coupe','minivan','truck','sport') DEFAULT 'sedan',
    seats         INT DEFAULT 5,
    transmission  ENUM('manual','automatic') DEFAULT 'automatic',
    fuel_type     ENUM('petrol','diesel','electric','hybrid') DEFAULT 'petrol',
    mileage       INT DEFAULT 0,
    image_url     VARCHAR(500),
    description   TEXT,
    available     BOOLEAN DEFAULT TRUE,   -- FALSE = under maintenance / inactive
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_brand     (brand),
    INDEX idx_model     (model),
    INDEX idx_price     (price_per_day),
    INDEX idx_available (available),
    INDEX idx_type      (type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ─────────────────────────────────────────────────────────────
-- TEMPLATES / PACKAGES
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS templates (
    id               INT AUTO_INCREMENT PRIMARY KEY,
    name             VARCHAR(100) NOT NULL,
    description      TEXT,
    duration_days    INT          NOT NULL,
    discount_percent DECIMAL(5,2) DEFAULT 0,
    is_active        BOOLEAN DEFAULT TRUE,
    created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ─────────────────────────────────────────────────────────────
-- TEMPLATE OPTIONS / EXTRAS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS template_options (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    template_id INT          NOT NULL,
    name        VARCHAR(100) NOT NULL,
    price       DECIMAL(10,2),
    is_included BOOLEAN DEFAULT FALSE,

    FOREIGN KEY (template_id) REFERENCES templates(id) ON DELETE CASCADE,
    INDEX idx_template (template_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ─────────────────────────────────────────────────────────────
-- RENTAL REQUESTS
-- Indexes tuned for the availability overlap query:
--   WHERE status IN ('pending','approved')
--     AND start_date < :requested_end
--     AND end_date   > :requested_start
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS rental_requests (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    user_id     INT          NOT NULL,
    template_id INT,
    start_date  DATE         NOT NULL,
    end_date    DATE         NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    status      ENUM('pending','approved','rejected','completed','cancelled') DEFAULT 'pending',
    notes       TEXT,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id)     REFERENCES users(id)     ON DELETE CASCADE,
    FOREIGN KEY (template_id) REFERENCES templates(id) ON DELETE SET NULL,

    -- General-purpose indexes (existing)
    INDEX idx_user    (user_id),
    INDEX idx_status  (status),
    INDEX idx_dates   (start_date, end_date),
    INDEX idx_created (created_at),

    -- NEW: composite index for the availability overlap lookup
    -- Covers: status IN (...) + start_date < ? + end_date > ?
    INDEX idx_availability_lookup (status, start_date, end_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ─────────────────────────────────────────────────────────────
-- REQUEST ↔ CAR (many-to-many)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS request_cars (
    id         INT AUTO_INCREMENT PRIMARY KEY,
    request_id INT NOT NULL,
    car_id     INT NOT NULL,

    FOREIGN KEY (request_id) REFERENCES rental_requests(id) ON DELETE CASCADE,
    FOREIGN KEY (car_id)     REFERENCES cars(id)            ON DELETE CASCADE,

    UNIQUE KEY  unique_request_car  (request_id, car_id),
    INDEX       idx_request         (request_id),

    -- NEW: lets getUnavailableCarIds() look up by car_id fast
    INDEX       idx_car_availability (car_id, request_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ─────────────────────────────────────────────────────────────
-- CONTACT MESSAGES
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS contact_messages (
    id         INT AUTO_INCREMENT PRIMARY KEY,
    name       VARCHAR(100) NOT NULL,
    email      VARCHAR(255) NOT NULL,
    subject    VARCHAR(200),
    message    TEXT         NOT NULL,
    is_read    BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_read    (is_read),
    INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ─────────────────────────────────────────────────────────────
-- PLATFORM COMMENTS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS platform_comments (
    id         INT AUTO_INCREMENT PRIMARY KEY,
    user_id    INT,
    guest_name VARCHAR(100),
    content    TEXT NOT NULL,
    rating     INT CHECK (rating >= 1 AND rating <= 5),
    status     ENUM('pending','approved','rejected') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_user   (user_id),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ─────────────────────────────────────────────────────────────
-- TEMPLATE COMMENTS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS template_comments (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    user_id     INT NOT NULL,
    template_id INT NOT NULL,
    content     TEXT NOT NULL,
    rating      INT CHECK (rating >= 1 AND rating <= 5),
    status      ENUM('pending','approved','rejected') DEFAULT 'pending',
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id)     REFERENCES users(id)     ON DELETE CASCADE,
    FOREIGN KEY (template_id) REFERENCES templates(id) ON DELETE CASCADE,
    INDEX idx_template (template_id),
    INDEX idx_status   (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
