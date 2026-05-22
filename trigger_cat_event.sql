-- Триггер: добавление кошки в мероприятие разрешено только в день его проведения,
-- и только если кошка не выбыла до этого дня.


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

    -- Добавлять можно только в день мероприятия
    IF CURRENT_DATE != ev_date THEN
        RAISE EXCEPTION
            'Кошек можно добавлять только в день проведения мероприятия (%). Сегодня — %.',
            to_char(ev_date,       'DD.MM.YYYY'),
            to_char(CURRENT_DATE,  'DD.MM.YYYY');
    END IF;

    -- Кошка не должна была выбыть до дня мероприятия
    SELECT departure_date, name INTO dep_date, cat_name_val
    FROM cat
    WHERE cat_id = NEW.cat_id;

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
