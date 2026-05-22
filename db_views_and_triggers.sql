-- =============================================================
--  ПРИЮТ — ПРЕДСТАВЛЕНИЯ И ТРИГГЕРЫ С КУРСОРАМИ
-- =============================================================


-- =============================================================
--  ПРЕДСТАВЛЕНИЯ (VIEWS)
-- =============================================================

-- -------------------------------------------------------------
--  v_warehouse_stock
--  Сводные остатки по продуктам: суммарное количество по всем
--  партиям, ближайший срок годности, количество активных партий.
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
--  Текущий финансовый баланс приюта одной строкой:
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
--  и сколько из них впоследствии пристроено (статус содержит
--  «пристро»). Процент рассчитывается автоматически.
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


-- =============================================================
--  ТРИГГЕРЫ С КУРСОРАМИ
-- =============================================================

-- -------------------------------------------------------------
--  trg_cat_departure
--  Срабатывает после того как у кошки заполняется departure_date
--  (статус выбытия). Курсор обходит все мероприятия где кошка
--  числится участницей и дата мероприятия ПОЗЖЕ departure_date —
--  и удаляет её из них. Кошка не может числиться на мероприятии
--  которое произойдёт уже после её выбытия.
-- -------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_cat_departure()
RETURNS TRIGGER AS $$
DECLARE
    rec         RECORD;
    cur_events  CURSOR FOR
        SELECT ep.event_id, e.name AS event_name, e.event_date
        FROM event_participation ep
        JOIN "event" e ON e.event_id = ep.event_id
        WHERE ep.cat_id    = NEW.cat_id
          AND e.event_date  > NEW.departure_date;
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
                to_char(rec.event_date,      'DD.MM.YYYY'),
                to_char(NEW.departure_date,  'DD.MM.YYYY');
        END LOOP;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_cat_departure ON cat;
CREATE TRIGGER trg_cat_departure
AFTER UPDATE OF departure_date ON cat
FOR EACH ROW
EXECUTE FUNCTION fn_cat_departure();


-- -------------------------------------------------------------
--  trg_event_date_change
--  Срабатывает после изменения даты мероприятия. Курсор обходит
--  всех участниц и удаляет тех, у кого departure_date раньше
--  новой даты мероприятия — они к тому времени уже выбыли.
-- -------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_event_date_change()
RETURNS TRIGGER AS $$
DECLARE
    rec       RECORD;
    cur_cats  CURSOR FOR
        SELECT ep.cat_id, c.name AS cat_name, c.departure_date
        FROM event_participation ep
        JOIN cat c ON c.cat_id = ep.cat_id
        WHERE ep.event_id          = NEW.event_id
          AND c.departure_date     IS NOT NULL
          AND c.departure_date      < NEW.event_date;
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
FOR EACH ROW
EXECUTE FUNCTION fn_event_date_change();


-- -------------------------------------------------------------
--  trg_expense_remains_check
--  Срабатывает перед добавлением записи расхода. Курсор обходит
--  все складские остатки для данной партии (партия может лежать
--  на нескольких складах) и суммирует доступное количество.
--  Если запрошенный расход превышает суммарный остаток —
--  транзакция откатывается с понятной ошибкой.
--  Исключает тихое обнуление остатков которое было раньше.
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
FOR EACH ROW
EXECUTE FUNCTION fn_expense_remains_check();
