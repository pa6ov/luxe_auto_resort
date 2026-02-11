-- Luxe Auto Resort Seed Data
USE luxe_auto_resort;

-- Admin акаунт (email: admin@luxeauto.bg, password: admin123)
INSERT INTO users (email, password, first_name, last_name, phone, role) VALUES 
('admin@luxeauto.bg', '$2b$10$rQZ5Z5Z5Z5Z5Z5Z5Z5Z5Z.5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5', 'Админ', 'Админов', '+359888111111', 'admin');

-- Клиент 1 (email: ivan@abv.bg, password: ivan123)
INSERT INTO users (email, password, first_name, last_name, phone, role) VALUES 
('ivan@abv.bg', '$2b$10$iV5V5V5V5V5V5V5V5V5V5.5V5V5V5V5V5V5V5V5V5V5V5V5V', 'Иван', 'Иванов', '+359888222222', 'client');

-- Клиент 2 (email: mariya@abv.bg, password: mariya123)
INSERT INTO users (email, password, first_name, last_name, phone, role) VALUES 
('maria@abv.bg', '$2b$10$mW5W5W5W5W5W5W5W5W5W5.5W5W5W5W5W5W5W5W5W5W5W5W5W', 'Мария', 'Петрова', '+359888333333', 'client');

-- Автомобили (8+ коли)
INSERT INTO cars (brand, model, year, color, license_plate, price_per_day, type, seats, transmission, fuel_type, mileage, image_url, description, available) VALUES
('Mercedes-Benz', 'E-Class', 2023, 'Черен', 'A1234AA', 180.00, 'sedan', 5, 'automatic', 'petrol', 15000, 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=800', 'Луксозен бизнес седан с пълна оборудване', TRUE),
('BMW', '5 Series', 2022, 'Бял', 'B5678BB', 170.00, 'sedan', 5, 'automatic', 'diesel', 25000, 'https://images.unsplash.com/photo-1555215695-3004980ad54e?w=800', 'Спортен елегантен седан', TRUE),
('Audi', 'Q5', 2023, 'Сив', 'C9012CC', 200.00, 'suv', 5, 'automatic', 'petrol', 12000, 'https://images.unsplash.com/photo-1609521263047-f8f205293f24?w=800', 'Премиум SUV с_quattro', TRUE),
('Tesla', 'Model 3', 2024, 'Червен', 'T3456TT', 220.00, 'sedan', 5, 'automatic', 'electric', 5000, 'https://images.unsplash.com/photo-1560958089-b8a1929cea89?w=800', 'Електрически автомобил с автопилот', TRUE),
('Volkswagen', 'Transporter', 2021, 'Син', 'V7890VV', 150.00, 'minivan', 9, 'manual', 'diesel', 45000, 'https://images.unsplash.com/photo-1588258219511-64eb629cb833?w=800', 'Комби за големи групи', TRUE),
('Porsche', 'Cayenne', 2023, 'Черен', 'P2468PP', 350.00, 'suv', 5, 'automatic', 'petrol', 10000, 'https://images.unsplash.com/photo-1617788138017-80ad40651399?w=800', 'Спортен SUV', TRUE),
('Toyota', 'Camry', 2022, 'Сребърен', 'T1357TT', 120.00, 'sedan', 5, 'automatic', 'hybrid', 30000, 'https://images.unsplash.com/photo-1721322800361-70964377a9b2?w=800', 'Икономичен хибрид', TRUE),
('Ford', 'Mustang', 2021, 'Червен', 'M8642MM', 250.00, 'sport', 4, 'automatic', 'petrol', 20000, 'https://images.unsplash.com/photo-1544636331-e26879cd4d9b?w=800', 'Класически спортен автомобил', TRUE),
('Mercedes-Benz', 'GLE', 2024, 'Черен', 'G9999GG', 300.00, 'suv', 7, 'automatic', 'diesel', 3000, 'https://images.unsplash.com/photo-1609521263047-f8f205293f24?w=800', 'Премиум луксозен SUV', TRUE),
('Lexus', 'RX', 2023, 'Бял', 'L7777LL', 250.00, 'suv', 5, 'automatic', 'hybrid', 15000, 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=800', 'Японски луксозен SUV', TRUE);

-- Шаблони/Пакети
INSERT INTO templates (name, description, duration_days, discount_percent, is_active) VALUES
('Уикенд', 'Идеален за кратка почивка. Включва неограничен пробег и пълна застраховка.', 3, 10.00, TRUE),
('Седмичен', 'Отличен избор за седмична почивка или бизнес пътуване.', 7, 15.00, TRUE),
('Бизнес', 'Професионален пакет с включено GPS и детско столче.', 30, 25.00, TRUE);

-- Опции за шаблони
INSERT INTO template_options (template_id, name, price, is_included) VALUES
(1, 'Детско столче', 10.00, FALSE),
(1, 'GPS навигация', 5.00, FALSE),
(2, 'Детско столче', 8.00, TRUE),
(2, 'GPS навигация', 0.00, TRUE),
(2, 'Втори шофьор', 15.00, FALSE),
(3, 'Детско столче', 0.00, TRUE),
(3, 'GPS навигация', 0.00, TRUE),
(3, 'Втори шофьор', 0.00, TRUE),
(3, 'Пълна застраховка', 0.00, TRUE);

-- Примерни заявки
INSERT INTO rental_requests (user_id, template_id, start_date, end_date, total_price, status, notes) VALUES
(2, 1, '2024-12-20', '2024-12-23', 486.00, 'approved', 'Искам Mercedes-Benz'),
(3, 2, '2024-12-25', '2025-01-01', 1428.00, 'pending', 'Предпочитам Tesla или BMW');

-- Примерни коментари за платформата
INSERT INTO platform_comments (user_id, guest_name, content, rating, status) VALUES
(1, NULL, 'Отлично обслужване! Препоръчвам на всички.', 5, 'approved'),
(NULL, 'Георги', 'Много добър избор от коли и лесно резервиране.', 4, 'approved'),
(2, NULL, 'Страхотно преживяване с Porsche Cayenne!', 5, 'approved');

-- Примерни контактни съобщения
INSERT INTO contact_messages (name, email, subject, message, is_read) VALUES
('Светослав', 'svetoslav@email.com', 'Въпрос за наем', 'Имате ли свободни коли за Нова година?', FALSE),
('Елена', 'elena@email.com', 'Корпоративен клиент', 'Интересуваме се от корпоративни условия.', TRUE);

