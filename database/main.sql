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


-- ============================================================
-- Luxe Auto Resort — Seed Data
-- Updated for availability system
--
-- Date strategy (all relative to "today"):
--   Requests use concrete future dates so the overlap query
--   returns meaningful results when you demo the date picker.
--   Adjust the literal dates below if you run this much later
--   than mid-2025; everything else stays the same.
--
--   APPROVED / PENDING  → treated as "booked" by the overlap query
--   COMPLETED / REJECTED / CANCELLED → treated as "free"
-- ============================================================

USE luxe_auto_resort;

-- ─────────────────────────────────────────────────────────────
-- USERS
-- Passwords (bcrypt, cost 10):
--   admin123  → admin@luxeauto.bg
--   ivan123   → ivan@abv.bg
--   mariya123 → maria@abv.bg
-- ─────────────────────────────────────────────────────────────
INSERT INTO users (email, password, first_name, last_name, phone, role) VALUES
('admin@luxeauto.bg',
 '$2b$10$t8yhxLNYXGOkujUAjiSU..u.u80tHwiLSWSgn6IhvscfXbeUy6/1S',
 'Админ', 'Админов', '+359888111111', 'admin'),

('ivan@abv.bg',
 '$2b$10$Ia3O2Ltiq24Rzn3XSKQDlOhWYszJnzLAHb0GdfiPzrO1PsWI/ceDe',
 'Иван', 'Иванов', '+359888222222', 'client'),

('maria@abv.bg',
 '$2b$10$YoluDOIBxMR95VOhrgDdGeH7hlPYVzOdgVRasrGCZWCk1vrwkJ5oS',
 'Мария', 'Петрова', '+359888333333', 'client');


-- ─────────────────────────────────────────────────────────────
-- CARS  (50 vehicles, same fleet as before)
-- available = FALSE means under maintenance, never shown as
-- free regardless of date filter.
-- ─────────────────────────────────────────────────────────────
INSERT INTO cars (brand, model, year, color, license_plate, price_per_day, type, seats, transmission, fuel_type, mileage, image_url, description, available) VALUES
-- Economy class
('Renault',  'Clio',        2015, 'Син',       'B1234AA',  45.00, 'sedan',   5, 'automatic', 'diesel',   180000, 'images/renault-clio-2015-1.webp',              'Икономичен хечбек с автоматик. Перфектен за града с нисък разход на гориво. Включва климатик, ел. стъкла и централно заключване.', TRUE),
('Opel',     'Corsa',       2014, 'Бял',       'B2345BB',  40.00, 'sedan',   5, 'automatic', 'petrol',   173000, 'images/opel-corsa-2014-2.webp',                'Компактен и маневрен автомобил за града. Идеален за начинаещи шофьори. Икономичен бензинов двигател 1.4L.', TRUE),
('Fiat',     'Bravo',       2011, 'Черен',     'B3456CC',  35.00, 'sedan',   5, 'automatic', 'petrol',   215181, 'images/fiat-bravo-2011-3.webp',                'Спортен хечбек с динамичен дизайн. Мощен 120 к.с. двигател и спортно окачване.', TRUE),
('VW',       'Golf',        2009, 'Сив',       'B4567DD',  38.00, 'sedan',   5, 'automatic', 'petrol',   149000, 'images/vw-golf-2009-4.webp',                   'Класическият Golf — надежден и комфортен. Перфектното съчетание между качество и цена.', TRUE),
('VW',       'Golf',        2009, 'Черен',     'B5678EE',  38.00, 'sedan',   5, 'automatic', 'petrol',   216000, 'images/vw-golf-2009-5.webp',                   'VW Golf с автоматична скоростна кутия. Просторен интериор и отлично пътно поведение.', TRUE),
('Citroen',  'C4',          2008, 'Сив',       'B6789FF',  35.00, 'sedan',   7, 'automatic', 'petrol',   197000, 'images/citroen-c4-2008-6.webp',                'Просторен семеен автомобил с 7 места. Идеален за семейни пътувания.', TRUE),
('Citroen',  'C4',          2012, 'Бял',       'B7890GG',  42.00, 'sedan',   5, 'automatic', 'diesel',   148000, 'images/citroen-c4-2012-7.webp',                'Елегантен седан с икономичен дизелов двигател. Ниски експлоатационни разходи.', TRUE),

-- Compact / business class
('VW',       'Passat',      2010, 'Тъмно син', 'B8901HH',  55.00, 'sedan',   5, 'automatic', 'diesel',   160000, 'images/vw-passat-2010-8.webp',                 'Бизнес клас седан с луксозен интериор. Просторен салон, кожени седалки и модерна мултимедия.', TRUE),
('VW',       'Golf',        2015, 'Бял',       'B9012II',  55.00, 'sedan',   5, 'automatic', 'diesel',   146000, 'images/vw-golf-2015-9.webp',                   'Седмо поколение Golf с TDI двигател. Спортен дизайн и висока икономичност.', TRUE),
('VW',       'Golf',        2017, 'Черен',     'B0123JJ',  58.00, 'sedan',   5, 'automatic', 'diesel',   201464, 'images/vw-golf-2017-10.webp',                  'Най-новото поколение Golf с иновативни технологии. Асистенти за безопасност и комфорт.', TRUE),
('Toyota',   'Auris',       2016, 'Бял',       'B1234KK',  70.00, 'sedan',   5, 'automatic', 'hybrid',   132000, 'images/toyota-auris-2016-11.webp',              'Хибриден автомобил с изключителна икономичност. Перфектен за екологично съзнателни шофьори.', TRUE),
('Toyota',   'Yaris',       2015, 'Червено',   'B2345LL',  60.00, 'sedan',   5, 'automatic', 'petrol',   189000, 'images/toyota-yaris-2015-12.webp',              'Компактен хечбек с богат асортимент от функции. Лесен за паркиране в града.', TRUE),
('Toyota',   'Prius',       2010, 'Сребърен',  'B3456MM',  55.00, 'sedan',   5, 'automatic', 'hybrid',   184000, 'images/toyota-prius-2010-13.webp',              'Пионерът сред хибридите. Изключително нисък разход — до 4л/100км.', TRUE),
('BMW',      '320',         2013, 'Черен',     'B4567NN',  75.00, 'sedan',   5, 'automatic', 'petrol',   164000, 'images/bmw-320-2013-14.webp',                  'BMW 3 серия с спортни характеристики. 184 к.с. двигател и динамично управление.', TRUE),
('Audi',     'A1',          2015, 'Бял',       'B5678OO',  65.00, 'sedan',   5, 'automatic', 'diesel',   155000, 'images/audi-a1-2015-15.webp',                  'Компактен премиум хечбек. Луксозен интериор и прецизно германско качество.', TRUE),
('Peugeot',  '508',         2017, 'Черен',     'B6789PP',  60.00, 'sedan',   5, 'automatic', 'diesel',   191000, 'images/peugeot-508-2017-16.webp',               'Елегантен френски седан с премиум оборудване. Панорамен покрив и кожени седалки.', TRUE),
('Alfa Romeo','Giulietta',  2020, 'Червено',   'B7890QQ',  85.00, 'sedan',   5, 'automatic', 'diesel',   116000, 'images/alfa-romeo-giulietta-2020-17.webp',      'Италианска страст и стил. Спортен характер с 150 к.с. дизелов двигател.', TRUE),

-- Mercedes-Benz
('Mercedes-Benz','E-Class', 2011, 'Черен',     'B8901RR',  70.00, 'sedan',   5, 'automatic', 'diesel',   111000, 'images/mercedes-benz-e-class-2011-18.webp',    'Бизнес клас с класическа елегантност. Комфортни седалки с електрическо управление.', TRUE),
('Mercedes-Benz','C-Class', 2008, 'Сив',       'B9012SS',  55.00, 'sedan',   5, 'automatic', 'diesel',   179000, 'images/mercedes-benz-c-class-2008-19.webp',    'Компактен представител на Mercedes. Луксозен интериор и безупречно качество.', TRUE),
('Mercedes-Benz','C-Class', 2010, 'Черен',     'B0123TT',  60.00, 'sedan',   5, 'automatic', 'diesel',   219000, 'images/mercedes-benz-c-class-2010-20.webp',    'Модернизиран C-Class с подобрена икономичност. Система COMAND с навигация.', TRUE),
('Mercedes-Benz','A-Class', 2014, 'Бял',       'B1234UU',  65.00, 'sedan',   5, 'automatic', 'petrol',   227000, 'images/mercedes-benz-a-class-2014-21.webp',    'Младежки и спортен хечбек. 7G-DCT автоматик и динамичен дизайн.', TRUE),
('Mercedes-Benz','A-Class', 2015, 'Черен',     'B2345VV',  75.00, 'sedan',   5, 'automatic', 'petrol',   150000, 'images/mercedes-benz-a-class-2015-22.webp',    'Ново поколение A-Class с най-новите технологии. MBUX мултимедийна система.', TRUE),
('Mercedes-Benz','A-Class', 2017, 'Бял',       'B3456WW',  80.00, 'sedan',   5, 'automatic', 'petrol',   189000, 'images/mercedes-benz-a-class-2017-23.webp',    'Най-новото поколение A-Class. Спортни линии и премиум комфорт.', TRUE),
('Mercedes-Benz','CLC',     2008, 'Син',       'B4567XX',  50.00, 'sedan',   5, 'automatic', 'diesel',   168000, 'images/mercedes-benz-clc-2008-24.webp',        'Спортен купе с динамичен характер. Характерна решетка и спортно окачване.', TRUE),
('Mercedes-Benz','Viano',   2008, 'Сребърен',  'B5678YY',  70.00, 'minivan', 7, 'automatic', 'petrol',   250000, 'images/mercedes-benz-viano-2008-25.webp',      'Просторен ван за семейни пътувания. 7 места и голямо багажно пространство.', TRUE),

-- SUV / Crossover
('Toyota',   'Land Cruiser',2025, 'Бял',       'B6789ZZ', 220.00, 'suv',     5, 'automatic', 'petrol',   154000, 'images/toyota-land-cruiser-2025-26.webp',       'Легендарният офроудър. Непревземаем в терен. Пълен задвижване и устойчивост.', TRUE),
('BMW',      'X3',          2025, 'Черен',     'B7890AAA',130.00, 'suv',     5, 'automatic', 'petrol',   228000, 'images/bmw-x3-2025-27.webp',                   'Компактен SUV с премиум качество. Спортно пътно поведение и просторен интериор.', TRUE),
('BMW',      'X5',          2025, 'Син',       'B8901BBB',150.00, 'suv',     5, 'automatic', 'petrol',   150000, 'images/bmw-x5-2025-28.webp',                   'Луксозен SUV с три реда седалки. XDrive задвижване и максимален комфорт.', TRUE),
('BMW',      'X5',          2025, 'Бял',       'B9012CCC',145.00, 'suv',     7, 'automatic', 'petrol',   211000, 'images/bmw-x5-2025-29.webp',                   'Просторен семеен SUV с 7 места. Идеален за дълги пътувания с цялото семейство.', TRUE),
('Audi',     'Q5',          2025, 'Черен',     'B0123DDD',180.00, 'suv',     5, 'automatic', 'electric',  95000, 'images/audi-q5-2025-30.webp',                  'Премиум електрически SUV. 0 до 100 км/ч за 5 секунди. Пробег до 500км.', TRUE),
('Nissan',   'Qashqai',     2025, 'Бял',       'B1234EEE', 85.00, 'suv',     5, 'automatic', 'diesel',   164000, 'images/nissan-qashqai-2025-31.webp',            'Най-продаваният кросоувър в Европа. Перфектен баланс между размер и практичност.', TRUE),
('Nissan',   'Qashqai',     2026, 'Черен',     'B2345FFF', 80.00, 'suv',     5, 'automatic', 'diesel',   178000, 'images/nissan-qashqai-2026-32.webp',            'Ново поколение Qashqai с хибридна технология. ProPILOT асистент за шофиране.', TRUE),
('Nissan',   'Qashqai',     2026, 'Сив',       'B3456GGG', 75.00, 'suv',     5, 'automatic', 'diesel',   186000, 'images/nissan-qashqai-2026-33.webp',            'Обновен дизайн и подобрени технологии. Безопасност на най-високо ниво.', TRUE),
('Nissan',   'X-Trail',     2025, 'Бял',       'B4567HHH', 90.00, 'suv',     5, 'automatic', 'petrol',   170000, 'images/nissan-x-trail-2025-34.webp',            'Семеен SUV с 4x4 задвижване. Просторен интериор за 5+2 места.', TRUE),
('VW',       'Tiguan',      2025, 'Черен',     'B5678III', 95.00, 'suv',     5, 'automatic', 'diesel',   177000, 'images/vw-tiguan-2025-35.webp',                 'Компактен SUV с VW качество. Просторен и практичен за всякакви условия.', TRUE),
('Skoda',    'Yeti',        2025, 'Оранжев',   'B6789JJJ', 65.00, 'suv',     5, 'automatic', 'diesel',   180000, 'images/skoda-yeti-2025-36.webp',                'Практичен кросоувър с кубичен дизайн. Голямо багажно пространство.', TRUE),
('Volvo',    'XC60',        2026, 'Бял',       'B7890KKK',120.00, 'suv',     5, 'automatic', 'petrol',   236000, 'images/volvo-xc60-2026-37.webp',                'Шведски луксус и безопасност. City Safety система и премиум материали.', TRUE),
('Mazda',    'CX-5',        2025, 'Червено',   'B8901LLL', 85.00, 'suv',     5, 'automatic', 'petrol',   153000, 'images/mazda-cx-5-2025-38.webp',                'Японско качество със спортна душа. KODO дизайн и SkyActiv технология.', TRUE),

-- Minivan / Van
('Fiat',     'Scudo',       2006, 'Бял',       'B9012MMM', 40.00, 'minivan', 6, 'automatic', 'petrol',   200000, 'images/fiat-scudo-2006-39.webp',                'Товарен ван с 6 места. Идеален за транспорт на екип или оборудване.', TRUE),
('Citroen',  'Grand C4 Picasso',2011,'Сив',    'B0123NNN', 45.00, 'minivan', 7, 'automatic', 'diesel',   158000, 'images/citroen-grand-c4-picasso-2011-40.webp', 'Семеен ван с 7 места. Панорамен покрив и развлекателна система за деца.', TRUE),
('Citroen',  'Grand C4',    2011, 'Бял',       'B1234OOO', 40.00, 'minivan', 7, 'automatic', 'electric', 183000, 'images/citroen-grand-c4-2011-41.webp',          'Електрическа версия на семейния ван. 0 вредни емисии и тихо шофиране.', TRUE),
('Toyota',   'Verso',       2010, 'Син',       'B2345PPP', 48.00, 'minivan', 5, 'automatic', 'diesel',   217000, 'images/toyota-verso-2010-42.webp',              'Семеен автомобил с гъвкав layout. Сгъваеми седалки за повече багаж.', TRUE),
('Peugeot',  'Partner',     2018, 'Бял',       'B3456QQQ', 55.00, 'minivan', 5, 'automatic', 'diesel',   194000, 'images/peugeot-partner-2018-43.webp',           'Компактен ван с нисък разход. Перфектен за градска дистрибуция.', TRUE),
('Renault',  'Kangoo',      2016, 'Зелен',     'B4567RRR', 50.00, 'minivan', 5, 'automatic', 'diesel',    47000, 'images/renault-kangoo-2016-44.webp',            'Компактен товарен ван с нисък пробег. Идеален за бизнес или семеен транспорт.', TRUE),

-- Additional sedans
('Citroen',  'C4',          2012, 'Сив',       'B5678SSS', 45.00, 'sedan',   5, 'automatic', 'diesel',   208000, 'images/citroen-c4-2012-45.webp',               'Френски седан с комфортно окачване. Ниски експлоатационни разходи.', TRUE),
('Citroen',  'C4',          2016, 'Бял',       'B6789TTT', 55.00, 'sedan',   5, 'automatic', 'diesel',   161000, 'images/citroen-c4-2016-46.webp',               'Модерен хечбек с авангарден дизайн. Технологичен интериор с Touch Drive.', TRUE),
('Mercedes-Benz','C-Class', 2010, 'Черен',     'B7890UUU', 50.00, 'sedan',   5, 'automatic', 'diesel',   219000, 'images/mercedes-benz-c-class-2010-47.webp',    'Класически Mercedes с доказана надеждност. Комфорт и престиж.', TRUE),
('Mini',     'Countryman',  2025, 'Червено',   'B8901VVV', 85.00, 'suv',     5, 'automatic', 'petrol',   216000, 'images/mini-countryman-2025-48.webp',           'Спортен кросоувър с Mini ДНА. Динамичен и забавен за шофиране.', TRUE);


-- ─────────────────────────────────────────────────────────────
-- TEMPLATES
-- ─────────────────────────────────────────────────────────────
INSERT INTO templates (name, description, duration_days, discount_percent, is_active) VALUES
('Уикенд',   'Идеален за кратка почивка. Включва неограничен пробег и пълна застраховка.', 3,  10.00, TRUE),
('Седмичен', 'Отличен избор за седмична почивка или бизнес пътуване.',                      7,  15.00, TRUE),
('Бизнес',   'Професионален пакет с включено GPS и детско столче.',                         30, 25.00, TRUE);


-- ─────────────────────────────────────────────────────────────
-- TEMPLATE OPTIONS
-- ─────────────────────────────────────────────────────────────
INSERT INTO template_options (template_id, name, price, is_included) VALUES
-- Уикенд (id=1)
(1, 'Детско столче', 10.00, FALSE),
(1, 'GPS навигация',  5.00, FALSE),
-- Седмичен (id=2)
(2, 'Детско столче',  8.00, TRUE),
(2, 'GPS навигация',  0.00, TRUE),
(2, 'Втори шофьор',  15.00, FALSE),
-- Бизнес (id=3)
(3, 'Детско столче',  0.00, TRUE),
(3, 'GPS навигация',  0.00, TRUE),
(3, 'Втори шофьор',   0.00, TRUE),
(3, 'Пълна застраховка', 0.00, TRUE);


-- ─────────────────────────────────────────────────────────────
-- RENTAL REQUESTS
--
-- These requests are spread across the next 60 days so that
-- the availability search returns a realistic mix of free and
-- booked cars when you demo the date picker.
--
-- Booking layout (car_id → dates):
--   car 1  (Renault Clio)       APPROVED  2025-07-10 → 2025-07-13   ← blocks "July 10-13" demo
--   car 2  (Opel Corsa)        APPROVED  2025-07-15 → 2025-07-22   ← blocks "July 15-22" demo
--   car 3  (Fiat Bravo)        PENDING   2025-07-20 → 2025-07-25
--   car 14 (BMW 320)           APPROVED  2025-07-05 → 2025-07-12
--   car 26 (Land Cruiser)      APPROVED  2025-08-01 → 2025-08-15
--   car 27 (BMW X3)            PENDING   2025-07-28 → 2025-08-03
--   Completed / rejected requests → do NOT block availability
-- ─────────────────────────────────────────────────────────────
INSERT INTO rental_requests
  (user_id, template_id, start_date, end_date, total_price, status, notes)
VALUES
-- ── ACTIVE bookings (block availability) ─────────────────────
-- Request 1: Иван books Renault Clio for Weekend package (3 days, 10% off)
-- 45.00 × 3 × 0.90 = 121.50
(2, 1, '2025-07-10', '2025-07-13', 121.50, 'approved',
 'Моля, осигурете GPS навигация.'),

-- Request 2: Мария books Opel Corsa for Weekly package (7 days, 15% off)
-- 40.00 × 7 × 0.85 = 238.00
(3, 2, '2025-07-15', '2025-07-22', 238.00, 'approved',
 'Нужно е детско столче за 3-годишно дете.'),

-- Request 3: Иван books Fiat Bravo (no template, 5 days)
-- 35.00 × 5 = 175.00
(2, NULL, '2025-07-20', '2025-07-25', 175.00, 'pending',
 'Предпочитам кола с ниско гориво.'),

-- Request 4: Мария books BMW 320 (Business package, 7 days, 15% off)
-- 75.00 × 7 × 0.85 = 446.25
(3, 2, '2025-07-05', '2025-07-12', 446.25, 'approved',
 'Бизнес пътуване до Пловдив.'),

-- Request 5: Иван books Land Cruiser for long trip (Business, 14 days, 25% off)
-- 220.00 × 14 × 0.75 = 2310.00
(2, 3, '2025-08-01', '2025-08-15', 2310.00, 'approved',
 'Планинско пътуване. Нужна е пълна офроуд конфигурация.'),

-- Request 6: Мария books BMW X3 (no template, 6 days)
-- 130.00 × 6 = 780.00
(3, NULL, '2025-07-28', '2025-08-03', 780.00, 'pending',
 'Кратка почивка в Банско.'),

-- ── COMPLETED / REJECTED / CANCELLED ─────────────────────────
-- These do NOT block availability — important for testing that
-- the overlap query correctly ignores non-active statuses.

-- Request 7: completed past rental of VW Passat
(2, 1, '2025-06-01', '2025-06-04', 148.50, 'completed',
 'Всичко беше отлично!'),

-- Request 8: rejected request for Audi Q5
(3, NULL, '2025-07-10', '2025-07-17', 1260.00, 'rejected',
 'Не отговаряме на изискванията за тази класа.'),

-- Request 9: cancelled by client
(2, 2, '2025-07-01', '2025-07-08', 357.00, 'cancelled',
 'Промениха ни се плановете.');


-- ─────────────────────────────────────────────────────────────
-- REQUEST ↔ CAR links
-- ─────────────────────────────────────────────────────────────
INSERT INTO request_cars (request_id, car_id) VALUES
(1, 1),   -- Request 1 → Renault Clio (car 1)
(2, 2),   -- Request 2 → Opel Corsa (car 2)
(3, 3),   -- Request 3 → Fiat Bravo (car 3)
(4, 14),  -- Request 4 → BMW 320 (car 14)
(5, 26),  -- Request 5 → Land Cruiser (car 26)
(6, 27),  -- Request 6 → BMW X3 (car 27)
(7, 8),   -- Request 7 (completed) → VW Passat (car 8)
(8, 29),  -- Request 8 (rejected)  → Audi Q5 (car 29)
(9, 9);   -- Request 9 (cancelled) → VW Golf 2015 (car 9)


-- ─────────────────────────────────────────────────────────────
-- PLATFORM COMMENTS
-- ─────────────────────────────────────────────────────────────
INSERT INTO platform_comments (user_id, guest_name, content, rating, status) VALUES
(2, NULL,      'Отлично обслужване! Renault Clio беше в перфектно състояние. Препоръчвам на всички.', 5, 'approved'),
(NULL, 'Георги', 'Много добър избор от коли и лесно резервиране. Сайтът работи много гладко.', 4, 'approved'),
(3, NULL,      'Страхотно преживяване с BMW X3! Колата беше чиста и добре поддържана.', 5, 'approved'),
(NULL, 'Стефан', 'Добра платформа, но бих искал повече опции за филтриране по дата.', 3, 'pending');


-- ─────────────────────────────────────────────────────────────
-- TEMPLATE COMMENTS
-- ─────────────────────────────────────────────────────────────
INSERT INTO template_comments (user_id, template_id, content, rating, status) VALUES
(2, 1, 'Уикенд пакетът е идеален! 10% отстъпка прави разлика при наема на по-скъпи коли.', 5, 'approved'),
(3, 2, 'Седмичният пакет е страхотна стойност. GPS-ът беше включен и спести много нерви.', 4, 'approved'),
(2, 3, 'Бизнес пакетът с 25% отстъпка за 30 дни е изключителна сделка за корпоративни клиенти.', 5, 'pending');


-- ─────────────────────────────────────────────────────────────
-- CONTACT MESSAGES
-- ─────────────────────────────────────────────────────────────
INSERT INTO contact_messages (name, email, subject, message, is_read) VALUES
('Светослав', 'svetoslav@email.com',
 'Въпрос за наем',
 'Имате ли свободни коли за периода 10-17 август? Търсим SUV за 5 човека.',
 FALSE),

('Елена', 'elena@email.com',
 'Корпоративен клиент',
 'Интересуваме се от корпоративни условия за наем на 3 автомобила на месец.',
 TRUE),

('Петър', 'peter@abv.bg',
 'Въпрос за наличност',
 'Проверих сайта — BMW X5 е наличен за август, но не мога да завърша резервацията. Можете ли да помогнете?',
 FALSE);


-- Add three nullable columns to cars
ALTER TABLE cars
  ADD COLUMN unavailable_from   DATE         NULL DEFAULT NULL
    COMMENT 'Start of admin-set maintenance / unavailability window',
  ADD COLUMN unavailable_until  DATE         NULL DEFAULT NULL
    COMMENT 'End of admin-set maintenance / unavailability window (inclusive)',
  ADD COLUMN unavailable_reason VARCHAR(255) NULL DEFAULT NULL
    COMMENT 'Human-readable reason shown to clients (e.g. Техническа поддръжка)';

-- Index so the availability query can filter on the window quickly
ALTER TABLE cars
  ADD INDEX idx_unavail_window (unavailable_from, unavailable_until);

-- Verify
SHOW COLUMNS FROM cars LIKE 'unavailable%';