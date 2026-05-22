-- Скрипт создания базы данных
-- =====================================================
-- 1. Справочные таблицы (словари)
-- =====================================================

-- Статус кота
CREATE TABLE cat_status (
    status_id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE
);

-- Должность сотрудника
CREATE TABLE position (
    position_name VARCHAR(50) PRIMARY KEY,
    salary DECIMAL(10, 2) CHECK (salary >= 0)
);

-- Вид процедуры
CREATE TABLE procedure_type (
    procedure_type_name VARCHAR(50) PRIMARY KEY,
    description TEXT
);

-- =====================================================
-- 2. Основные сущности
-- =====================================================

-- Клетка
CREATE TABLE cage (
    cage_id SERIAL PRIMARY KEY,
    number VARCHAR(10) NOT NULL UNIQUE,
    capacity INTEGER NOT NULL CHECK (capacity > 0),
    cage_type VARCHAR(50)
);

-- Кот (с источником поступления)
CREATE TABLE cat (
    cat_id SERIAL PRIMARY KEY,
    status_id INTEGER NOT NULL REFERENCES cat_status(status_id),
    cage_id INTEGER NOT NULL REFERENCES cage(cage_id),
    source_of_arrival VARCHAR(50) NOT NULL CHECK (source_of_arrival IN ('улица', 'подброшен', 'от_хозяина', 'другой_приют', 'родился_в_приюте', 'неизвестно')),
    departure_date DATE,
    name VARCHAR(100),
    gender CHAR(1) CHECK (gender IN ('М', 'Ж')),
    birth_date DATE,
    color VARCHAR(50),
    breed VARCHAR(50),
    character TEXT,
    special_marks TEXT,
    CONSTRAINT chk_departure_date CHECK (departure_date IS NULL OR departure_date <= CURRENT_DATE)
);

-- Сотрудник
CREATE TABLE employee (
    employee_id SERIAL PRIMARY KEY,
    position_name VARCHAR(50) NOT NULL REFERENCES position(position_name),
    full_name VARCHAR(150) NOT NULL,
    phone VARCHAR(20) CHECK (phone ~ '^8[0-9]{10}$'),
    address TEXT,
    email VARCHAR(100) CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    birth_date DATE,
    hire_date DATE NOT NULL DEFAULT CURRENT_DATE,
    termination_date DATE,
    work_hours INTEGER DEFAULT 0 CHECK (work_hours >= 0),
    passport_series VARCHAR(4),
    passport_number VARCHAR(6),
    login VARCHAR(50),
    password VARCHAR(255),
    CONSTRAINT unique_passport_employee UNIQUE (passport_series, passport_number),
    CONSTRAINT chk_passport_employee CHECK (LENGTH(COALESCE(passport_series,'') || COALESCE(passport_number,'')) = 10 OR (passport_series IS NULL AND passport_number IS NULL))
);

-- Волонтёр
CREATE TABLE volunteer (
    volunteer_id SERIAL PRIMARY KEY,
    full_name VARCHAR(150) NOT NULL,
    phone VARCHAR(20) CHECK (phone ~ '^8[0-9]{10}$'),
    address TEXT,
    passport_series VARCHAR(4),
    passport_number VARCHAR(6),
    email VARCHAR(100) CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    birth_date DATE,
    registration_date DATE NOT NULL DEFAULT CURRENT_DATE,
    skills TEXT,
    CONSTRAINT unique_passport_volunteer UNIQUE (passport_series, passport_number),
    CONSTRAINT chk_passport_volunteer CHECK (LENGTH(COALESCE(passport_series,'') || COALESCE(passport_number,'')) = 10 OR (passport_series IS NULL AND passport_number IS NULL))
);

-- Благотворитель
CREATE TABLE benefactor (
    benefactor_id SERIAL PRIMARY KEY,
    full_name VARCHAR(150) NOT NULL,
    phone VARCHAR(20) CHECK (phone ~ '^8[0-9]{10}$'),
    email VARCHAR(100)
);

-- Поставщик
CREATE TABLE supplier (
    supplier_id SERIAL PRIMARY KEY,
    phone VARCHAR(20),
    address TEXT
);

-- Товар
CREATE TABLE product (
    product_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    unit_of_measure VARCHAR(20)
);

-- Склад
CREATE TABLE warehouse (
    warehouse_id SERIAL PRIMARY KEY,
    warehouse_type VARCHAR(50),
    capacity INTEGER CHECK (capacity > 0)
);

-- Счёт
CREATE TABLE account (
    account_id SERIAL PRIMARY KEY,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    amount DECIMAL(12, 2) CHECK (amount >= 0),
    operation_type VARCHAR(50),
    purpose TEXT
);

-- Источник поступления (обобщающая сущность)
CREATE TABLE source_of_arrival (
    source_id SERIAL PRIMARY KEY
);

-- Поставка (подтип источника поступления)
CREATE TABLE supply (
    source_id INTEGER PRIMARY KEY REFERENCES source_of_arrival(source_id),
    supplier_id INTEGER NOT NULL REFERENCES supplier(supplier_id),
    account_id INTEGER REFERENCES account(account_id),
    delivery_date DATE NOT NULL DEFAULT CURRENT_DATE
);

-- Пожертвование (подтип источника поступления)
CREATE TABLE donation (
    source_id INTEGER PRIMARY KEY REFERENCES source_of_arrival(source_id),
    benefactor_id INTEGER NOT NULL REFERENCES benefactor(benefactor_id),
    donation_date DATE NOT NULL DEFAULT CURRENT_DATE,
    amount DECIMAL(12, 2),
    donation_type VARCHAR(20) CHECK (donation_type IN ('денежное', 'натуральное'))
);

-- Партия товара
CREATE TABLE product_batch (
    batch_id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL REFERENCES product(product_id),
    source_id INTEGER NOT NULL REFERENCES source_of_arrival(source_id),
    arrival_date DATE NOT NULL DEFAULT CURRENT_DATE,
    expiration_date DATE,
    quantity INTEGER NOT NULL CHECK (quantity >= 0),
    purchase_price DECIMAL(10, 2) CHECK (purchase_price >= 0)
);

-- Медицинская карта
CREATE TABLE medical_card (
    medical_card_id SERIAL PRIMARY KEY,
    cat_id INTEGER NOT NULL UNIQUE REFERENCES cat(cat_id),
    opening_date DATE NOT NULL DEFAULT CURRENT_DATE,
    weight DECIMAL(5, 2),
    is_sterilized BOOLEAN DEFAULT FALSE,
    is_vaccinated BOOLEAN DEFAULT FALSE,
    is_parasite_treated BOOLEAN DEFAULT FALSE
);

-- Мероприятие
CREATE TABLE event (
    event_id SERIAL PRIMARY KEY,
    employee_id INTEGER NOT NULL REFERENCES employee(employee_id),
    name VARCHAR(100) NOT NULL,
    event_date DATE NOT NULL,
    location VARCHAR(200)
);

-- =====================================================
-- 3. Таблицы-связи
-- =====================================================

-- Остатки (хранится на складе) - заменяет старую таблицу Расход
CREATE TABLE warehouse_remains (
    batch_id INTEGER NOT NULL REFERENCES product_batch(batch_id),
    warehouse_id INTEGER NOT NULL REFERENCES warehouse(warehouse_id),
    quantity INTEGER NOT NULL CHECK (quantity >= 0),
    PRIMARY KEY (batch_id, warehouse_id)
);

-- Уход волонтёра за котом
CREATE TABLE volunteer_care (
    volunteer_id INTEGER NOT NULL REFERENCES volunteer(volunteer_id),
    cat_id INTEGER NOT NULL REFERENCES cat(cat_id),
    start_date DATE NOT NULL,
    end_date DATE,
    PRIMARY KEY (volunteer_id, cat_id),
    CONSTRAINT chk_care_dates CHECK (end_date IS NULL OR end_date >= start_date)
);

-- Процедура (сотрудник проводит процедуру коту)
CREATE TABLE procedure_record (
    employee_id INTEGER NOT NULL REFERENCES employee(employee_id),
    procedure_type_name VARCHAR(50) NOT NULL REFERENCES procedure_type(procedure_type_name),
    cat_id INTEGER NOT NULL REFERENCES cat(cat_id),
    procedure_date DATE NOT NULL DEFAULT CURRENT_DATE,
    result TEXT,
    notes TEXT,
    PRIMARY KEY (employee_id, procedure_type_name, cat_id, procedure_date)
);

-- Расход товара (сотрудник расходует партию товара для кота)
CREATE TABLE product_expense (
    employee_id INTEGER NOT NULL REFERENCES employee(employee_id),
    batch_id INTEGER NOT NULL REFERENCES product_batch(batch_id),
    cat_id INTEGER NOT NULL REFERENCES cat(cat_id),
    expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    notes TEXT,
    PRIMARY KEY (employee_id, batch_id, cat_id, expense_date)
);

-- Запись в медкарте
CREATE TABLE medical_record (
    employee_id INTEGER NOT NULL REFERENCES employee(employee_id),
    medical_card_id INTEGER NOT NULL REFERENCES medical_card(medical_card_id),
    record_date DATE NOT NULL DEFAULT CURRENT_DATE,
    diagnosis TEXT,
    prescriptions TEXT,
    notes TEXT,
    PRIMARY KEY (employee_id, medical_card_id, record_date)
);

-- Участие кота в мероприятии
CREATE TABLE event_participation (
    cat_id INTEGER NOT NULL REFERENCES cat(cat_id),
    event_id INTEGER NOT NULL REFERENCES event(event_id),
    condition_after TEXT,
    PRIMARY KEY (cat_id, event_id)
);

-- Выплата зарплаты
CREATE TABLE salary_payment (
    employee_id INTEGER NOT NULL REFERENCES employee(employee_id),
    account_id INTEGER NOT NULL REFERENCES account(account_id),
    amount DECIMAL(10, 2) NOT NULL CHECK (amount > 0),
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    PRIMARY KEY (employee_id, account_id)
);

-- Денежное пожертвование (поступает на счёт)
CREATE TABLE monetary_donation (
    source_id INTEGER NOT NULL REFERENCES donation(source_id),
    account_id INTEGER NOT NULL REFERENCES account(account_id),
    amount DECIMAL(12, 2) NOT NULL CHECK (amount > 0),
    PRIMARY KEY (source_id, account_id)
);

-- Норма расхода на процедуру (вид процедуры требует товар)
CREATE TABLE procedure_consumption_rate (
    procedure_type_name VARCHAR(50) NOT NULL REFERENCES procedure_type(procedure_type_name),
    product_id INTEGER NOT NULL REFERENCES product(product_id),
    standard_quantity INTEGER NOT NULL CHECK (standard_quantity > 0),
    notes TEXT,
    PRIMARY KEY (procedure_type_name, product_id)
);

-- =====================================================
-- 5. Триггеры
-- Остатки на складе уменьшает/восстанавливает C# код (WarehouseService).
-- В БД оставлены только проверочные триггеры из db_views_and_triggers.sql:
--   trg_expense_remains_check — проверяет остаток курсором перед записью расхода
--   trg_check_batch_expiry   — проверяет срок годности перед записью расхода
--   trg_cat_event_date       — запрещает добавление кошки в мероприятие не в день события
--   trg_cat_departure        — убирает кошку из будущих мероприятий при выбытии
--   trg_event_date_change    — убирает выбывших кошек при переносе мероприятия
-- Все пять триггеров находятся в файлах db_views_and_triggers.sql
-- и trigger_cat_event.sql — выполни их после этого скрипта.
-- =====================================================

-- =====================================================
-- 9. Начальные данные (статусы)
-- =====================================================

INSERT INTO cat_status (name) VALUES
('в приюте'),
('на передержке'),
('пристроен'),
('умер'),
('сбежал'),
('передан_в_другой_приют');

-- Изменить ограничение, чтобы разрешить 0
ALTER TABLE procedure_consumption_rate DROP CONSTRAINT procedure_consumption_rate_standard_quantity_check;
ALTER TABLE procedure_consumption_rate ADD CONSTRAINT procedure_consumption_rate_standard_quantity_check CHECK (standard_quantity >= 0);
