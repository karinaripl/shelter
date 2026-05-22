-- =============================================================
--  ПРИЮТ ДЛЯ КОШЕК — ПРИМЕРЫ ОБЪЕКТОВ БД
--  Файл содержит:
--    1. Пользовательские типы данных (DOMAIN / TYPE)
--    2. Правила корректности (CHECK-ограничения)
--    3. Умолчания (DEFAULT)
--    4. Триггеры
--    5. Представления (VIEW)
-- =============================================================


-- =============================================================
--  1. ПОЛЬЗОВАТЕЛЬСКИЕ ТИПЫ ДАННЫХ
-- =============================================================

-- -------------------------------------------------------------
--  gender_type
--  Разрешает только значения 'М' и 'Ж'.
--  Используется для поля gender в таблице cat.
-- -------------------------------------------------------------
CREATE DOMAIN gender_type AS CHAR(1)
    CHECK (VALUE IN ('М', 'Ж'));

-- -------------------------------------------------------------
--  donation_type_enum
--  Вид пожертвования: денежное или натуральное.
--  Используется в таблице donation.
-- -------------------------------------------------------------
CREATE TYPE donation_kind AS ENUM ('денежное', 'натуральное');

-- -------------------------------------------------------------
--  positive_money
--  Денежная сумма — не может быть отрицательной.
--  Применяется к колонкам amount в финансовых таблицах.
-- -------------------------------------------------------------
CREATE DOMAIN positive_money AS NUMERIC(12, 2)
    CHECK (VALUE >= 0);

-- -------------------------------------------------------------
--  phone_ru
--  Российский номер телефона — 11 цифр, начинается с 8.
--  Используется в таблицах employee, volunteer, benefactor.
-- -------------------------------------------------------------
CREATE DOMAIN phone_ru AS VARCHAR(20)
    CHECK (VALUE ~ '^8[0-9]{10}$');

-- -------------------------------------------------------------
--  source_kind
--  Способ поступления кошки в приют.
--  Используется в поле source_of_arrival таблицы cat.
-- -------------------------------------------------------------
CREATE DOMAIN source_kind AS VARCHAR(50)
    CHECK (VALUE IN (
        'улица', 'подброшен', 'от_хозяина',
        'другой_приют', 'родился_в_приюте', 'неизвестно'
    ));


-- =============================================================
--  2. ПРАВИЛА КОРРЕКТНОСТИ (CHECK-ОГРАНИЧЕНИЯ)
-- =============================================================

-- -------------------------------------------------------------
--  chk_departure_date — таблица cat
--  Дата выбытия не может быть в будущем.
-- -------------------------------------------------------------
-- CONSTRAINT chk_departure_date
--     CHECK (departure_date IS NULL OR departure_date <= CURRENT_DATE)

-- -------------------------------------------------------------
--  chk_care_dates — таблица volunteer_care
--  Дата окончания ухода не может быть раньше даты начала.
-- -------------------------------------------------------------
-- CONSTRAINT chk_care_dates
--     CHECK (end_date IS NULL OR end_date >= start_date)

-- -------------------------------------------------------------
--  chk_passport_employee — таблица employee
--  Паспорт либо заполнен полностью (4+6 цифр), либо не указан совсем.
-- -------------------------------------------------------------
-- CONSTRAINT chk_passport_employee
--     CHECK (
--         LENGTH(COALESCE(passport_series,'') || COALESCE(passport_number,'')) = 10
--         OR (passport_series IS NULL AND passport_number IS NULL)
--     )

-- -------------------------------------------------------------
--  Ограничение на положительное количество товара — таблица product_batch
-- -------------------------------------------------------------
-- quantity INTEGER NOT NULL CHECK (quantity >= 0)

-- -------------------------------------------------------------
--  Ограничение на вместимость клетки — таблица cage
-- -------------------------------------------------------------
-- capacity INTEGER NOT NULL CHECK (capacity > 0)

-- -------------------------------------------------------------
--  Пример: добавить ограничение корректности к существующей таблице
--  (изменение стандартной нормы расхода — разрешить 0)
-- -------------------------------------------------------------
ALTER TABLE procedure_consumption_rate
    DROP CONSTRAINT IF EXISTS procedure_consumption_rate_standard_quantity_check;
ALTER TABLE procedure_consumption_rate
    ADD CONSTRAINT procedure_consumption_rate_standard_quantity_check
    CHECK (standard_quantity >= 0);


-- =============================================================
--  3. УМОЛЧАНИЯ (DEFAULT)
-- =============================================================

-- -------------------------------------------------------------
--  Дата поступления партии товара — по умолчанию сегодня.
--  Сотрудник не должен вручную вводить дату если принимает товар сейчас.
-- -------------------------------------------------------------
-- arrival_date DATE NOT NULL DEFAULT CURRENT_DATE

-- -------------------------------------------------------------
--  Дата открытия медкарты — автоматически текущая дата.
-- -------------------------------------------------------------
-- opening_date DATE NOT NULL DEFAULT CURRENT_DATE

-- -------------------------------------------------------------
--  Флаги вакцинации, стерилизации, обработки от паразитов —
--  по умолчанию FALSE (кошка ещё не обработана).
-- -------------------------------------------------------------
-- is_sterilized      BOOLEAN DEFAULT FALSE
-- is_vaccinated      BOOLEAN DEFAULT FALSE
-- is_parasite_treated BOOLEAN DEFAULT FALSE

-- -------------------------------------------------------------
--  Дата регистрации волонтёра — текущая дата.
-- -------------------------------------------------------------
-- registration_date DATE NOT NULL DEFAULT CURRENT_DATE

-- -------------------------------------------------------------
--  Дата операции по счёту — текущая дата.
-- -------------------------------------------------------------
-- date DATE NOT NULL DEFAULT CURRENT_DATE

-- -------------------------------------------------------------
--  Рабочие часы сотрудника — 0 при создании.
-- -------------------------------------------------------------
-- work_hours INTEGER DEFAULT 0

-- -------------------------------------------------------------
--  Пример: добавить DEFAULT к существующей колонке
-- -------------------------------------------------------------
ALTER TABLE product ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE product ADD COLUMN IF NOT EXISTS category  VARCHAR(50) DEFAULT 'Корм';
ALTER TABLE account ADD COLUMN IF NOT EXISTS batch_id  INTEGER REFERENCES product_batch(batch_id) ON DELETE SET NULL;
ALTER TABLE "event" ADD COLUMN IF NOT EXISTS notes     TEXT;


-- =============================================================
--  4. ТРИГГЕРЫ
-- =============================================================

-- -------------------------------------------------------------
--  trg_check_batch_expiry
--  BEFORE INSERT ON product_expense
--  Запрещает расход товара из просроченной партии.
-- -------------------------------------------------------------
CREATE OR REPLACE FUNCTION check_batch_expiry()
RETURNS TRIGGER AS $$
DECLARE
    batch_expiry DATE;
BEGIN
    SELECT expiration_date INTO batch_expiry
    FROM product_batch
    WHERE batch_id = NEW.batch_id;

    IF batch_expiry IS NOT NULL AND batch_expiry < CURRENT_DATE THEN
        RAISE EXCEPTION 'Партия товара с ID % просрочена!', NEW.batch_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_check_batch_expiry
BEFORE INSERT ON product_expense
FOR EACH ROW EXECUTE FUNCTION check_batch_expiry();


-- -------------------------------------------------------------
--  trg_cat_event_date
--  BEFORE INSERT ON event_participation
--  Кошку можно добавить в мероприятие только в день его
--  проведения, и только если она не выбыла раньше этой даты.
-- -------------------------------------------------------------
CREATE OR REPLACE FUNCTION check_cat_event_date()
RETURNS TRIGGER AS $$
DECLARE
    ev_date      DATE;
    dep_date     DATE;
    cat_name_val VARCHAR;
BEGIN
    SELECT event_date INTO ev_date
    FROM "event"
    WHERE event_id = NEW.event_id;

    IF CURRENT_DATE != ev_date THEN
        RAISE EXCEPTION
            'Кошек можно добавлять только в день проведения мероприятия (%). Сегодня — %.',
            to_char(ev_date,      'DD.MM.YYYY'),
            to_char(CURRENT_DATE, 'DD.MM.YYYY');
    END IF;

    SELECT departure_date, name INTO dep_date, cat_name_val
    FROM cat WHERE cat_id = NEW.cat_id;

    IF dep_date IS NOT NULL AND dep_date < ev_date THEN
        RAISE EXCEPTION
            'Кошка «%» выбыла % — раньше даты мероприятия %. Добавить её нельзя.',
            cat_name_val,
            to_char(dep_date, 'DD.MM.YYYY'),
            to_char(ev_date,  'DD.MM.YYYY');
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_cat_event_date ON event_participation;
CREATE TRIGGER trg_cat_event_date
BEFORE INSERT ON event_participation
FOR EACH ROW EXECUTE FUNCTION check_cat_event_date();


-- -------------------------------------------------------------
--  trg_cat_departure  (курсорный триггер)
--  AFTER UPDATE OF departure_date ON cat
--  При выбытии кошки курсор обходит все будущие мероприятия
--  где она числилась участником и удаляет её из них.
-- -------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_cat_departure()
RETURNS TRIGGER AS $$
DECLARE
    rec         RECORD;
    cur_events  CURSOR FOR
        SELECT ep.event_id, e.name AS event_name, e.event_date
        FROM event_participation ep
        JOIN "event" e ON e.event_id = ep.event_id
        WHERE ep.cat_id   = NEW.cat_id
          AND e.event_date > NEW.departure_date;
BEGIN
    IF NEW.departure_date IS NOT NULL
       AND (OLD.departure_date IS NULL OR OLD.departure_date <> NEW.departure_date)
    THEN
        FOR rec IN cur_events LOOP
            DELETE FROM event_participation
            WHERE cat_id   = NEW.cat_id
              AND event_id = rec.event_id;

            RAISE NOTICE
                'Кошка #% удалена из мероприятия «%» (%) — она выбыла %.',
                NEW.cat_id,
                rec.event_name,
                to_char(rec.event_date,     'DD.MM.YYYY'),
                to_char(NEW.departure_date, 'DD.MM.YYYY');
        END LOOP;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_cat_departure ON cat;
CREATE TRIGGER trg_cat_departure
AFTER UPDATE OF departure_date ON cat
FOR EACH ROW EXECUTE FUNCTION fn_cat_departure();


-- -------------------------------------------------------------
--  trg_event_date_change  (курсорный триггер)
--  AFTER UPDATE OF event_date ON event
--  При переносе даты мероприятия курсор обходит всех участниц
--  и удаляет тех, кто к новой дате уже выбыл.
-- -------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_event_date_change()
RETURNS TRIGGER AS $$
DECLARE
    rec      RECORD;
    cur_cats CURSOR FOR
        SELECT ep.cat_id, c.name AS cat_name, c.departure_date
        FROM event_participation ep
        JOIN cat c ON c.cat_id = ep.cat_id
        WHERE ep.event_id       = NEW.event_id
          AND c.departure_date  IS NOT NULL
          AND c.departure_date   < NEW.event_date;
BEGIN
    IF NEW.event_date <> OLD.event_date THEN
        FOR rec IN cur_cats LOOP
            DELETE FROM event_participation
            WHERE event_id = NEW.event_id
              AND cat_id   = rec.cat_id;

            RAISE NOTICE
                'Кошка «%» удалена из мероприятия #% — выбыла %, новая дата %.',
                rec.cat_name,
                NEW.event_id,
                to_char(rec.departure_date, 'DD.MM.YYYY'),
                to_char(NEW.event_date,     'DD.MM.YYYY');
        END LOOP;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_event_date_change ON "event";
CREATE TRIGGER trg_event_date_change
AFTER UPDATE OF event_date ON "event"
FOR EACH ROW EXECUTE FUNCTION fn_event_date_change();


-- -------------------------------------------------------------
--  trg_expense_remains_check  (курсорный триггер)
--  BEFORE INSERT ON product_expense
--  Курсор суммирует остатки по всем складам для данной партии.
--  Если запрошенный расход превышает суммарный остаток —
--  откатывает транзакцию с понятной ошибкой.
-- -------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_expense_remains_check()
RETURNS TRIGGER AS $$
DECLARE
    rec          RECORD;
    total_avail  NUMERIC := 0;
    cur_remains  CURSOR FOR
        SELECT wr.quantity, w.warehouse_type
        FROM warehouse_remains wr
        JOIN warehouse w ON w.warehouse_id = wr.warehouse_id
        WHERE wr.batch_id = NEW.batch_id;
BEGIN
    FOR rec IN cur_remains LOOP
        total_avail := total_avail + rec.quantity;
    END LOOP;

    IF total_avail <= 0 THEN
        RAISE EXCEPTION
            'Партия #% полностью израсходована — остаток равен нулю.',
            NEW.batch_id;
    END IF;

    IF NEW.quantity > total_avail THEN
        RAISE EXCEPTION
            'Недостаточно остатков по партии #%: запрошено %, доступно %.',
            NEW.batch_id, NEW.quantity, total_avail;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_expense_remains_check ON product_expense;
CREATE TRIGGER trg_expense_remains_check
BEFORE INSERT ON product_expense
FOR EACH ROW EXECUTE FUNCTION fn_expense_remains_check();


-- =============================================================
--  5. ПРЕДСТАВЛЕНИЯ (VIEW)
-- =============================================================

-- -------------------------------------------------------------
--  v_warehouse_stock
--  Сводные остатки по каждому продукту: суммарное количество
--  по всем партиям и складам, ближайший срок годности,
--  признак «истекает ли в течение 30 дней».
--  Используй: SELECT * FROM v_warehouse_stock WHERE is_active = TRUE;
-- -------------------------------------------------------------
CREATE OR REPLACE VIEW v_warehouse_stock AS
SELECT
    p.product_id,
    p.name                              AS product_name,
    p.unit_of_measure,
    p.category,
    p.is_active,
    COUNT(DISTINCT pb.batch_id)         AS batch_count,
    COALESCE(SUM(wr.quantity), 0)       AS total_quantity,
    MIN(pb.expiration_date)             AS nearest_expiration,
    CASE
        WHEN MIN(pb.expiration_date) IS NOT NULL
             AND MIN(pb.expiration_date) <= CURRENT_DATE + INTERVAL '30 days'
        THEN TRUE ELSE FALSE
    END                                 AS expiring_soon
FROM product p
JOIN product_batch pb      ON pb.product_id  = p.product_id
JOIN warehouse_remains wr  ON wr.batch_id    = pb.batch_id
WHERE wr.quantity > 0
GROUP BY p.product_id, p.name, p.unit_of_measure, p.category, p.is_active;


-- -------------------------------------------------------------
--  v_expiring_batches
--  Партии у которых срок годности истекает в течение 30 дней
--  и на которых ещё есть остаток. Сортировка — ближайшие первые.
--  Используй: SELECT * FROM v_expiring_batches;
-- -------------------------------------------------------------
CREATE OR REPLACE VIEW v_expiring_batches AS
SELECT
    pb.batch_id,
    p.name                                      AS product_name,
    p.unit_of_measure,
    p.category,
    pb.expiration_date,
    (pb.expiration_date - CURRENT_DATE)         AS days_left,
    wr.quantity                                 AS remaining_quantity,
    w.warehouse_type
FROM product_batch pb
JOIN product p            ON p.product_id   = pb.product_id
JOIN warehouse_remains wr ON wr.batch_id    = pb.batch_id
JOIN warehouse w          ON w.warehouse_id = wr.warehouse_id
WHERE pb.expiration_date IS NOT NULL
  AND pb.expiration_date <= CURRENT_DATE + INTERVAL '30 days'
  AND wr.quantity > 0
ORDER BY pb.expiration_date;


-- -------------------------------------------------------------
--  v_finance_balance
--  Финансовый баланс приюта одной строкой:
--  все пожертвования − зарплаты − закупки = остаток.
--  Используй: SELECT balance FROM v_finance_balance;
-- -------------------------------------------------------------
CREATE OR REPLACE VIEW v_finance_balance AS
SELECT
    COALESCE((SELECT SUM(amount) FROM monetary_donation), 0)
        AS total_income,
    COALESCE((SELECT SUM(amount) FROM salary_payment), 0)
        AS total_salaries,
    COALESCE((SELECT SUM(amount) FROM account WHERE operation_type = 'Закупка'), 0)
        AS total_purchases,
    COALESCE((SELECT SUM(amount) FROM monetary_donation), 0)
    - COALESCE((SELECT SUM(amount) FROM salary_payment), 0)
    - COALESCE((SELECT SUM(amount) FROM account WHERE operation_type = 'Закупка'), 0)
        AS balance;


-- -------------------------------------------------------------
--  v_event_adoption_rate
--  Эффективность каждого мероприятия: сколько кошек участвовало
--  и сколько из них впоследствии пристроено. Процент рассчитывается
--  автоматически.
--  Используй: SELECT * FROM v_event_adoption_rate ORDER BY event_date DESC;
-- -------------------------------------------------------------
CREATE OR REPLACE VIEW v_event_adoption_rate AS
SELECT
    e.event_id,
    e.name                                          AS event_name,
    e.event_date,
    e.location,
    emp.full_name                                   AS responsible,
    COUNT(ep.cat_id)                                AS total_cats,
    COUNT(CASE WHEN cs.name ILIKE '%пристро%' THEN 1 END)
                                                    AS adopted_after,
    ROUND(
        CASE
            WHEN COUNT(ep.cat_id) > 0
            THEN COUNT(CASE WHEN cs.name ILIKE '%пристро%' THEN 1 END)
                 * 100.0 / COUNT(ep.cat_id)
            ELSE 0
        END, 1
    )                                               AS adoption_rate_pct
FROM "event" e
JOIN employee emp              ON emp.employee_id = e.employee_id
LEFT JOIN event_participation ep ON ep.event_id  = e.event_id
LEFT JOIN cat c                ON c.cat_id        = ep.cat_id
LEFT JOIN cat_status cs        ON cs.status_id    = c.status_id
GROUP BY e.event_id, e.name, e.event_date, e.location, emp.full_name
ORDER BY e.event_date DESC;


-- -------------------------------------------------------------
--  v_donations_full
--  Полная информация о пожертвованиях: жертвователь, сумма,
--  тип пожертвования, связанный счёт (для денежных) или
--  партия товара на складе (для натуральных).
--  Используй: SELECT * FROM v_donations_full WHERE donation_type = 'денежное';
-- -------------------------------------------------------------
CREATE OR REPLACE VIEW v_donations_full AS
SELECT
    d.source_id,
    d.donation_date,
    d.donation_type,
    b.benefactor_id,
    b.full_name     AS benefactor_name,
    b.phone         AS benefactor_phone,
    md.amount       AS money_amount,
    a.account_id,
    a.operation_type,
    a.purpose,
    pb.batch_id,
    p.name          AS product_name,
    pb.quantity     AS batch_quantity,
    p.unit_of_measure,
    pb.arrival_date,
    wr.warehouse_id,
    w.warehouse_type,
    wr.quantity     AS remains_quantity
FROM donation d
JOIN source_of_arrival  sa  ON sa.source_id   = d.source_id
JOIN benefactor          b  ON b.benefactor_id = d.benefactor_id
LEFT JOIN monetary_donation md ON md.source_id  = d.source_id
LEFT JOIN account            a  ON a.account_id  = md.account_id
LEFT JOIN product_batch pb ON pb.source_id   = sa.source_id
LEFT JOIN product        p  ON p.product_id   = pb.product_id
LEFT JOIN warehouse_remains wr ON wr.batch_id  = pb.batch_id
LEFT JOIN warehouse        w  ON w.warehouse_id = wr.warehouse_id
ORDER BY d.donation_date DESC, d.source_id, pb.batch_id;
