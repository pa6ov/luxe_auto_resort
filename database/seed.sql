-- Luxe Auto Resort Seed Data
USE luxe_auto_resort;

-- Admin акаунт (email: admin@luxeauto.bg, password: admin123)
INSERT INTO users (email, password, first_name, last_name, phone, role) VALUES 
('admin@luxeauto.bg', '$2b$10$t8yhxLNYXGOkujUAjiSU..u.u80tHwiLSWSgn6IhvscfXbeUy6/1S', 'Админ', 'Админов', '+359888111111', 'admin');

-- Клиент 1 (email: ivan@abv.bg, password: ivan123)
INSERT INTO users (email, password, first_name, last_name, phone, role) VALUES 
('ivan@abv.bg', '$2b$10$Ia3O2Ltiq24Rzn3XSKQDlOhWYszJnzLAHb0GdfiPzrO1PsWI/ceDe', 'Иван', 'Иванов', '+359888222222', 'client');

-- Клиент 2 (email: mariya@abv.bg, password: mariya123)
INSERT INTO users (email, password, first_name, last_name, phone, role) VALUES 
('maria@abv.bg', '$2b$10$YoluDOIBxMR95VOhrgDdGeH7hlPYVzOdgVRasrGCZWCk1vrwkJ5oS', 'Мария', 'Петрова', '+359888333333', 'client');

-- Автомобили - Premium Fleet с детайлна информация и цени в евро
INSERT INTO cars (brand, model, year, color, license_plate, price_per_day, type, seats, transmission, fuel_type, mileage, image_url, description, available) VALUES
-- Economy Class
('Renault', 'Clio', 2015, 'Син', 'B1234AA', 45.00, 'sedan', 5, 'automatic', 'diesel', 180000, 'images/11741896793875800_7f0d8fc7.webp', 'Икономичен хечбек с автоматик. Перфектен за града с нисък разход на гориво. Включва климатик, ел. стъкла и централно заключване.', TRUE),
('Opel', 'Corsa', 2014, 'Бял', 'B2345BB', 40.00, 'sedan', 5, 'automatic', 'petrol', 173000, 'images/11747340815117162_f28cd7f8.webp', 'Компактен и маневрен автомобил за града. Идеален за начинаещи шофьори. Икономичен бензинов двигател 1.4L.', TRUE),
('Fiat', 'Bravo', 2011, 'Черен', 'B3456CC', 35.00, 'sedan', 5, 'automatic', 'petrol', 215181, 'images/11769433357495676_67762196.webp', 'Спортен хечбек с динамичен дизайн. Мощен 120 к.с. двигател и спортно окачване.', TRUE),
('VW', 'Golf', 2009, 'Сив', 'B4567DD', 38.00, 'sedan', 5, 'automatic', 'petrol', 149000, 'images/11768843057849742_2a156c46.webp', 'Класическият Golf - надежден и комфортен. Перфектното съчетание между качество и цена.', TRUE),
('VW', 'Golf', 2009, 'Черен', 'B5678EE', 38.00, 'sedan', 5, 'automatic', 'petrol', 216000, 'images/11770919017649407_6b15a336.webp', 'VW Golf с автоматична скоростна кутия. Просторен интериор и отлично пътно поведение.', TRUE),
('Citroen', 'C4', 2008, 'Сив', 'B6789FF', 35.00, 'sedan', 7, 'automatic', 'petrol', 197000, 'images/11771051193837966_065c8e40.webp', 'Просторен семеен автомобил с 7 места. Идеален за семейни пътувания.', TRUE),
('Citroen', 'C4', 2012, 'Бял', 'B7890GG', 42.00, 'sedan', 5, 'automatic', 'diesel', 148000, 'images/11769281703109235_bddc7dd4.webp', 'Елегантен седан с икономичен дизелов двигатель. Ниски експлоатационни разходи.', TRUE),

-- Compact Class
('VW', 'Passat', 2010, 'Тъмно син', 'B8901HH', 55.00, 'sedan', 5, 'automatic', 'diesel', 160000, 'images/11747168559650588_94ba9fe5.webp', 'Бизнес клас седан с луксозен интериор. Просторен салон, кожени седалки и модерна мултимедия.', TRUE),
('VW', 'Golf', 2015, 'Бял', 'B9012II', 55.00, 'sedan', 5, 'automatic', 'diesel', 146000, 'images/11763066054524690_7f8fbe08.webp', 'Седмо поколение Golf с TDI двигател. Спортен дизайн и висoka икономичност.', TRUE),
('VW', 'Golf', 2017, 'Черен', 'B0123JJ', 58.00, 'sedan', 5, 'automatic', 'diesel', 201464, 'images/11760546872307924_e2403508.webp', 'Най-новото поколение Golf с иновативни технологии. Асистенти за безопасност и комфорт.', TRUE),
('Toyota', 'Auris', 2016, 'Бял', 'B1234KK', 70.00, 'sedan', 5, 'automatic', 'hybrid', 132000, 'images/11747163949178061_6cc7d5ac.webp', 'Хибриден автомобил с изключителна икономичност. Перфектен за екологично съзнателни шофьори.', TRUE),
('Toyota', 'Yaris', 2015, 'Червено', 'B2345LL', 60.00, 'sedan', 5, 'automatic', 'petrol', 189000, 'images/11770058354257611_1dfe05a7.webp', 'Компактен хечбек с богат асортимент от функции. Лесен за паркиране в града.', TRUE),
('Toyota', 'Prius', 2010, 'Сребърен', 'B3456MM', 55.00, 'sedan', 5, 'automatic', 'hybrid', 184000, 'images/11763799620991369_a345eaf0.webp', 'Пионерът сред хибридите. Изключително нисък разход - до 4л/100км.', TRUE),
('BMW', '320', 2013, 'Черен', 'B4567NN', 75.00, 'sedan', 5, 'automatic', 'petrol', 164000, 'images/11770056338427690_703d0944.webp', 'BMW 3 серия с спортни характеристики. 184 к.с. двигател и динамично управление.', TRUE),
('Audi', 'A1', 2015, 'Бял', 'B5678OO', 65.00, 'sedan', 5, 'automatic', 'diesel', 155000, 'images/11755275510614796_a8a2c773.webp', 'Компактен премиум хечбек. Луксозен интериор и прецизно германско качество.', TRUE),
('Peugeot', '508', 2017, 'Черен', 'B6789PP', 60.00, 'sedan', 5, 'automatic', 'diesel', 191000, 'images/11769279673744827_c8c2fc91.webp', 'Елегантен френски седан с премиум оборудване. Панорамен покрив и кожени седалки.', TRUE),
('Alfa Romeo', 'Giulietta', 2020, 'Червено', 'B7890QQ', 85.00, 'sedan', 5, 'automatic', 'diesel', 116000, 'images/11770750587980101_e042a6b6.webp', 'Италианска страст и стил. Спортен характер с 150 к.с. дизелов двигател.', TRUE),

-- Mercedes-Benz Class
('Mercedes-Benz', 'E-Class', 2011, 'Черен', 'B8901RR', 70.00, 'sedan', 5, 'automatic', 'diesel', 111000, 'images/11736864787951073_1dbd5bf4.webp', 'Бизнес клас с класическа елегантност. Комфортни седалки с електрическо управление.', TRUE),
('Mercedes-Benz', 'C-Class', 2008, 'Сив', 'B9012SS', 55.00, 'sedan', 5, 'automatic', 'diesel', 179000, 'images/11747167798633783_723d83e5.webp', 'Компактен представител на Mercedes. Луксозен интериор и безупречно качество.', TRUE),
('Mercedes-Benz', 'C-Class', 2010, 'Черен', 'B0123TT', 60.00, 'sedan', 5, 'automatic', 'diesel', 219000, 'images/11747338254836052_520794af.webp', 'Модернизиран C-Class с подобрена икономичност. Система COMAND с навигация.', TRUE),
('Mercedes-Benz', 'A-Class', 2014, 'Бял', 'B1234UU', 65.00, 'sedan', 5, 'automatic', 'petrol', 227000, 'images/11763796099832176_ba045263.webp', 'Младежки и спорттен хечбек. 7G-DCT автоматик и динамичен дизайн.', TRUE),
('Mercedes-Benz', 'A-Class', 2015, 'Черен', 'B2345VV', 75.00, 'sedan', 5, 'automatic', 'petrol', 150000, 'images/11770467787817946_ed6ca8ca.webp', 'Ново поколение A-Class с най-новите технологии. MBUX мултимедийна система.', TRUE),
('Mercedes-Benz', 'A-Class', 2017, 'Бял', 'B3456WW', 80.00, 'sedan', 5, 'automatic', 'petrol', 189000, 'images/11759603782732891_436c7ed8.webp', 'Най-новото поколение A-Class. Спортни линии и премиум комфорт.', TRUE),
('Mercedes-Benz', 'CLC', 2008, 'Син', 'B4567XX', 50.00, 'sedan', 5, 'automatic', 'diesel', 168000, 'images/11758430753324593_33ff2e59.webp', 'Спортен купе с динамичен характер. Характерна решетка и спортно окачване.', TRUE),
('Mercedes-Benz', 'Viano', 2008, 'Сребърен', 'B5678YY', 70.00, 'minivan', 7, 'automatic', 'petrol', 250000, 'images/11764744258581642_e29b89fd.webp', 'Просторен ван за семейни пътувания. 7 места и багажно пространство за всички багажи.', TRUE),

-- SUV & Crossover
('Toyota', 'Land Cruiser', 2025, 'Бял', 'B6789ZZ', 220.00, 'suv', 5, 'automatic', 'petrol', 154000, 'images/21733497466542942_f44a8d64.webp', 'Легендарният офроудър. Непревземаем в терен. Пълен задвижване и устойчивост.', TRUE),
('BMW', 'X3', 2025, 'Черен', 'B7890AAA', 130.00, 'suv', 5, 'automatic', 'petrol', 228000, 'images/21747166135878644_eb5d6470.webp', 'Компактен SUV с премиум качество. Спортно пътно поведение и просторен интериор.', TRUE),
('BMW', 'X5', 2025, 'Син', 'B8901BBB', 150.00, 'suv', 5, 'automatic', 'petrol', 150000, 'images/21755199629110726_aa694bf9.webp', 'Луксозен SUV с три реда седалки. XDrive задвижване и максимален комфорт.', TRUE),
('BMW', 'X5', 2025, 'Бял', 'B9012CCC', 145.00, 'suv', 7, 'automatic', 'petrol', 211000, 'images/21756360851826701_d3e16a8c.webp', 'Просторен семей SUV с 7 места. Идеален за дълги пътувания с цялото семейство.', TRUE),
('Audi', 'Q5', 2025, 'Черен', 'B0123DDD', 180.00, 'suv', 5, 'automatic', 'electric', 95000, 'images/21758646518403135_7ad34c0a.webp', 'Премиум електрически SUV. 0 до 100 км/ч за 5 секунди. Пробег до 500км.', TRUE),
('Nissan', 'Qashqai', 2025, 'Бял', 'B1234EEE', 85.00, 'suv', 5, 'automatic', 'diesel', 164000, 'images/21747506956917521_51dfc401.webp', 'Най-продаваният кросоувър в Европа. Перфектен баланс между размер и практичност.', TRUE),
('Nissan', 'Qashqai', 2026, 'Черен', 'B2345FFF', 80.00, 'suv', 5, 'automatic', 'diesel', 178000, 'images/21770752332333518_0c50bda4.webp', 'Ново поколение Qashqai с хибридна технология. ProPILOT асистент за шофиране.', TRUE),
('Nissan', 'Qashqai', 2026, 'Сив', 'B3456GGG', 75.00, 'suv', 5, 'automatic', 'diesel', 186000, 'images/21768997783787374_73a116b9.webp', 'Обновен дизайн и подобрени технологии. Безопасност на най-високо ниво.', TRUE),
('Nissan', 'X-Trail', 2025, 'Бял', 'B4567HHH', 90.00, 'suv', 5, 'automatic', 'petrol', 170000, 'images/21764442300727718_121a7930.webp', 'Семеен SUV с 4x4 задвижване. Просторен интериор за 5+2 места.', TRUE),
('VW', 'Tiguan', 2025, 'Черен', 'B5678III', 95.00, 'suv', 5, 'automatic', 'diesel', 177000, 'images/21761548571382772_1a6e0261.webp', 'Компактен SUV с VW качество. Просторен и практичен за всякакви условия.', TRUE),
('Skoda', 'Yeti', 2025, 'Оранжев', 'B6789JJJ', 65.00, 'suv', 5, 'automatic', 'diesel', 180000, 'images/21749625262359134_3c08b125.webp', 'Практичен кросоувър с кубичен дизайн. Голямо багажно пространство.', TRUE),
('Volvo', 'XC60', 2026, 'Бял', 'B7890KKK', 120.00, 'suv', 5, 'automatic', 'petrol', 236000, 'images/21768325529169556_eee839bc.webp', 'Шведски луксус и безопасност. City Safety система и премиум материали.', TRUE),
('Mazda', 'CX-5', 2025, 'Червено', 'B8901LLL', 85.00, 'suv', 5, 'automatic', 'petrol', 153000, 'images/21757052392990670_3343e2d6.webp', 'Японско качество със спортна душа. KODO дизайн и SkyActiv технология.', TRUE),

-- Minivan / Van
('Fiat', 'Scudo', 2006, 'Бял', 'B9012MMM', 40.00, 'minivan', 6, 'automatic', 'petrol', 200000, 'images/11745326028716829_fd8acb33.webp', 'Товарен ван с 6 места. Идеален за транспорт на екип или оборудване.', TRUE),
('Citroen', 'Grand C4 Picasso', 2011, 'Сив', 'B0123NNN', 45.00, 'minivan', 7, 'automatic', 'diesel', 158000, 'images/11760895872012717_d967966c.webp', 'Семеен ван с 7 места. Панорамен покрив и развлекателна система за деца.', TRUE),
('Citroen', 'Grand C4', 2011, 'Бял', 'B1234OOO', 40.00, 'minivan', 7, 'automatic', 'electric', 183000, 'images/11769711139006778_37af15d7.webp', 'Електрическа версия на семейния ван. 0 вредни емисии и тихо шофиране.', TRUE),
('Toyota', 'Verso', 2010, 'Син', 'B2345PPP', 48.00, 'minivan', 5, 'automatic', 'diesel', 217000, 'images/11765434610460251_39b2d5a2.webp', 'Семеен автомобил с гъвкав layout. Сгъваеми седалки за повече багаж.', TRUE),
('Peugeot', 'Partner', 2018, 'Бял', 'B3456QQQ', 55.00, 'minivan', 5, 'automatic', 'diesel', 194000, 'images/11747506247577852_c194dfe1.webp', 'Компактен ван с нисък разход. Перфектен за градска дистрибуция.', TRUE),
('Renault', 'Kangoo', 2016, 'Зелен', 'B4567RRR', 50.00, 'minivan', 5, 'automatic', 'diesel', 47000, 'images/11764273779407582_c115b495.webp', 'Компактен товарен ван с нисък пробег. Идеален за бизнес или семеен транспорт.', TRUE),

-- Additional Models
('Citroen', 'C4', 2012, 'Сив', 'B5678SSS', 45.00, 'sedan', 5, 'automatic', 'diesel', 208000, 'images/11760035905338535_8702ac21.webp', 'Френски седан с комфортно окачване. Ниски експлоатационни разходи.', TRUE),
('Citroen', 'C4', 2016, 'Бял', 'B6789TTT', 55.00, 'sedan', 5, 'automatic', 'diesel', 161000, 'images/11764097014455051_c2e9aec9.webp', 'Модерен хечбек с авангарден дизайн. Технологичен интериор с Touch Drive.', TRUE),
('Mercedes-Benz', 'C-Class', 2010, 'Черен', 'B7890UUU', 50.00, 'sedan', 5, 'automatic', 'diesel', 219000, 'images/11747338254836052_520794af.webp', 'Класически Mercedes с доказана надеждност. Комфорт и престиж.', TRUE),
('Mini', 'Countryman', 2025, 'Червено', 'B8901VVV', 85.00, 'suv', 5, 'automatic', 'petrol', 216000, 'images/21764273269838357_582eb06c.webp', 'Спортен кросоувър с Mini DNА. Динамичен и забавен за шофиране.', TRUE);

-- Templates/Packages
INSERT INTO templates (name, description, duration_days, discount_percent, is_active) VALUES
('Уикенд', 'Идеален за кратка почивка. Включва неограничен пробег и пълна застраховка.', 3, 10.00, TRUE),
('Седмичен', 'Отличен избор за седмична почивка или бизнес пътуване.', 7, 15.00, TRUE),
('Бизнес', 'Професионален пакет с включено GPS и детско столче.', 30, 25.00, TRUE);

-- Template Options
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

-- Sample Requests
INSERT INTO rental_requests (user_id, template_id, start_date, end_date, total_price, status, notes) VALUES
(2, 1, '2024-12-20', '2024-12-23', 486.00, 'approved', 'Искам Mercedes-Benz E-Class'),
(3, 2, '2024-12-25', '2025-01-01', 1428.00, 'pending', 'Предпочитам BMW X5 или Audi Q5');

-- Sample Platform Comments
INSERT INTO platform_comments (user_id, guest_name, content, rating, status) VALUES
(1, NULL, 'Отлично обслужване! Препоръчвам на всички.', 5, 'approved'),
(NULL, 'Георги', 'Много добър избор от коли и лесно резервиране.', 4, 'approved'),
(2, NULL, 'Страхотно преживяване с BMW X5!', 5, 'approved');

-- Sample Contact Messages
INSERT INTO contact_messages (name, email, subject, message, is_read) VALUES
('Светoslav', 'svetoslav@email.com', 'Въпрос за наем', 'Имате ли свободни коли за Нова година?', FALSE),
('Елена', 'elena@email.com', 'Корпоративен клиент', 'Интересуваме се от корпоративни условия.', TRUE);

