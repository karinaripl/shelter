--
-- PostgreSQL database dump
--

\restrict UEgfIFA3TZa9F7VyU02fC04IJnyUNwZF4svyz2EnxxKjfGfvBEdYaFYx4rWj7fR

-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

DROP DATABASE catbd;
--
-- Name: catbd; Type: DATABASE; Schema: -; Owner: -
--

CREATE DATABASE catbd WITH TEMPLATE = template0 ENCODING = 'UTF8' LOCALE_PROVIDER = libc LOCALE = 'Russian_Russia.1251';


\unrestrict UEgfIFA3TZa9F7VyU02fC04IJnyUNwZF4svyz2EnxxKjfGfvBEdYaFYx4rWj7fR
\connect catbd
\restrict UEgfIFA3TZa9F7VyU02fC04IJnyUNwZF4svyz2EnxxKjfGfvBEdYaFYx4rWj7fR

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: check_cat_event_date(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_cat_event_date() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
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
$$;


--
-- Name: fn_cat_departure(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_cat_departure() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
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
$$;


--
-- Name: fn_event_date_change(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_event_date_change() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
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
$$;


--
-- Name: fn_expense_remains_check(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_expense_remains_check() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
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
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: account; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.account (
    account_id integer NOT NULL,
    date date DEFAULT CURRENT_DATE NOT NULL,
    amount numeric(12,2),
    operation_type character varying(50),
    purpose text,
    batch_id integer,
    CONSTRAINT account_amount_check CHECK ((amount >= (0)::numeric))
);


--
-- Name: account_account_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.account_account_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: account_account_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.account_account_id_seq OWNED BY public.account.account_id;


--
-- Name: benefactor; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.benefactor (
    benefactor_id integer NOT NULL,
    full_name character varying(150) NOT NULL,
    phone character varying(20),
    email character varying(100),
    CONSTRAINT benefactor_phone_check CHECK (((phone)::text ~ '^8[0-9]{10}$'::text))
);


--
-- Name: benefactor_benefactor_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.benefactor_benefactor_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: benefactor_benefactor_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.benefactor_benefactor_id_seq OWNED BY public.benefactor.benefactor_id;


--
-- Name: cage; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cage (
    cage_id integer NOT NULL,
    number character varying(10) NOT NULL,
    capacity integer NOT NULL,
    cage_type character varying(50),
    CONSTRAINT cage_capacity_check CHECK ((capacity > 0))
);


--
-- Name: cage_cage_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.cage_cage_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: cage_cage_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.cage_cage_id_seq OWNED BY public.cage.cage_id;


--
-- Name: cat; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cat (
    cat_id integer NOT NULL,
    status_id integer NOT NULL,
    cage_id integer NOT NULL,
    source_of_arrival character varying(50) NOT NULL,
    departure_date date,
    name character varying(100),
    gender character(1),
    birth_date date,
    color character varying(50),
    breed character varying(50),
    "character" text,
    special_marks text,
    CONSTRAINT cat_gender_check CHECK ((gender = ANY (ARRAY['М'::bpchar, 'Ж'::bpchar]))),
    CONSTRAINT cat_source_of_arrival_check CHECK (((source_of_arrival)::text = ANY ((ARRAY['улица'::character varying, 'подброшен'::character varying, 'от_хозяина'::character varying, 'другой_приют'::character varying, 'родился_в_приюте'::character varying, 'неизвестно'::character varying])::text[]))),
    CONSTRAINT chk_departure_date CHECK (((departure_date IS NULL) OR (departure_date <= CURRENT_DATE)))
);


--
-- Name: cat_cat_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.cat_cat_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: cat_cat_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.cat_cat_id_seq OWNED BY public.cat.cat_id;


--
-- Name: cat_status; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cat_status (
    status_id integer NOT NULL,
    name character varying(50) NOT NULL
);


--
-- Name: cat_status_status_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.cat_status_status_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: cat_status_status_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.cat_status_status_id_seq OWNED BY public.cat_status.status_id;


--
-- Name: donation; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.donation (
    source_id integer NOT NULL,
    benefactor_id integer NOT NULL,
    donation_date date DEFAULT CURRENT_DATE NOT NULL,
    amount numeric(12,2),
    donation_type character varying(20),
    CONSTRAINT donation_donation_type_check CHECK (((donation_type)::text = ANY ((ARRAY['денежное'::character varying, 'натуральное'::character varying])::text[])))
);


--
-- Name: employee; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.employee (
    employee_id integer NOT NULL,
    position_name character varying(50) NOT NULL,
    full_name character varying(150) NOT NULL,
    phone character varying(20),
    address text,
    email character varying(100),
    birth_date date,
    hire_date date DEFAULT CURRENT_DATE NOT NULL,
    termination_date date,
    work_hours integer DEFAULT 0,
    passport_series character varying(4),
    passport_number character varying(6),
    login character varying(50),
    password character varying(255),
    CONSTRAINT chk_passport_employee CHECK (((length(((COALESCE(passport_series, ''::character varying))::text || (COALESCE(passport_number, ''::character varying))::text)) = 10) OR ((passport_series IS NULL) AND (passport_number IS NULL)))),
    CONSTRAINT employee_email_check CHECK (((email)::text ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'::text)),
    CONSTRAINT employee_phone_check CHECK (((phone)::text ~ '^8[0-9]{10}$'::text)),
    CONSTRAINT employee_work_hours_check CHECK ((work_hours >= 0))
);


--
-- Name: employee_employee_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.employee_employee_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: employee_employee_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.employee_employee_id_seq OWNED BY public.employee.employee_id;


--
-- Name: event; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.event (
    event_id integer NOT NULL,
    employee_id integer NOT NULL,
    name character varying(100) NOT NULL,
    event_date date NOT NULL,
    location character varying(200),
    notes text
);


--
-- Name: event_event_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.event_event_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: event_event_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.event_event_id_seq OWNED BY public.event.event_id;


--
-- Name: event_participation; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.event_participation (
    cat_id integer NOT NULL,
    event_id integer NOT NULL,
    condition_after text
);


--
-- Name: medical_card; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.medical_card (
    medical_card_id integer NOT NULL,
    cat_id integer NOT NULL,
    opening_date date DEFAULT CURRENT_DATE NOT NULL,
    weight numeric(5,2),
    is_sterilized boolean DEFAULT false,
    is_vaccinated boolean DEFAULT false,
    is_parasite_treated boolean DEFAULT false
);


--
-- Name: medical_card_medical_card_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.medical_card_medical_card_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: medical_card_medical_card_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.medical_card_medical_card_id_seq OWNED BY public.medical_card.medical_card_id;


--
-- Name: medical_record; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.medical_record (
    employee_id integer NOT NULL,
    medical_card_id integer NOT NULL,
    record_date date DEFAULT CURRENT_DATE NOT NULL,
    diagnosis text,
    prescriptions text,
    notes text
);


--
-- Name: monetary_donation; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.monetary_donation (
    source_id integer NOT NULL,
    account_id integer NOT NULL,
    amount numeric(12,2) NOT NULL,
    CONSTRAINT monetary_donation_amount_check CHECK ((amount > (0)::numeric))
);


--
-- Name: position; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."position" (
    position_name character varying(50) NOT NULL,
    salary numeric(10,2),
    CONSTRAINT position_salary_check CHECK ((salary >= (0)::numeric))
);


--
-- Name: procedure_consumption_rate; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.procedure_consumption_rate (
    procedure_type_name character varying(50) NOT NULL,
    product_id integer NOT NULL,
    standard_quantity integer NOT NULL,
    notes text,
    CONSTRAINT procedure_consumption_rate_standard_quantity_check CHECK ((standard_quantity >= 0))
);


--
-- Name: procedure_record; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.procedure_record (
    employee_id integer NOT NULL,
    procedure_type_name character varying(50) NOT NULL,
    cat_id integer NOT NULL,
    procedure_date date DEFAULT CURRENT_DATE NOT NULL,
    result text,
    notes text
);


--
-- Name: procedure_type; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.procedure_type (
    procedure_type_name character varying(50) NOT NULL,
    description text
);


--
-- Name: product; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product (
    product_id integer NOT NULL,
    name character varying(100) NOT NULL,
    unit_of_measure character varying(20),
    category character varying(50) DEFAULT 'Корм'::character varying,
    is_active boolean DEFAULT true NOT NULL
);


--
-- Name: product_batch; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_batch (
    batch_id integer NOT NULL,
    product_id integer NOT NULL,
    source_id integer NOT NULL,
    arrival_date date DEFAULT CURRENT_DATE NOT NULL,
    expiration_date date,
    quantity numeric(10,3) NOT NULL,
    purchase_price numeric(10,2),
    employee_id integer,
    CONSTRAINT product_batch_purchase_price_check CHECK ((purchase_price >= (0)::numeric)),
    CONSTRAINT product_batch_quantity_check CHECK ((quantity >= (0)::numeric))
);


--
-- Name: product_batch_batch_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.product_batch_batch_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: product_batch_batch_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.product_batch_batch_id_seq OWNED BY public.product_batch.batch_id;


--
-- Name: product_expense; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_expense (
    employee_id integer NOT NULL,
    batch_id integer NOT NULL,
    cat_id integer NOT NULL,
    expense_date date DEFAULT CURRENT_DATE NOT NULL,
    quantity numeric(10,3) NOT NULL,
    notes text,
    CONSTRAINT product_expense_quantity_check CHECK ((quantity > (0)::numeric))
);


--
-- Name: product_product_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.product_product_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: product_product_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.product_product_id_seq OWNED BY public.product.product_id;


--
-- Name: salary_payment; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.salary_payment (
    employee_id integer NOT NULL,
    account_id integer NOT NULL,
    amount numeric(10,2) NOT NULL,
    payment_date date DEFAULT CURRENT_DATE NOT NULL,
    CONSTRAINT salary_payment_amount_check CHECK ((amount > (0)::numeric))
);


--
-- Name: source_of_arrival; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.source_of_arrival (
    source_id integer NOT NULL
);


--
-- Name: source_of_arrival_source_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.source_of_arrival_source_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: source_of_arrival_source_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.source_of_arrival_source_id_seq OWNED BY public.source_of_arrival.source_id;


--
-- Name: supplier; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.supplier (
    supplier_id integer NOT NULL,
    phone character varying(20),
    address text
);


--
-- Name: supplier_supplier_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.supplier_supplier_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: supplier_supplier_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.supplier_supplier_id_seq OWNED BY public.supplier.supplier_id;


--
-- Name: supply; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.supply (
    source_id integer NOT NULL,
    supplier_id integer NOT NULL,
    account_id integer,
    delivery_date date DEFAULT CURRENT_DATE NOT NULL
);


--
-- Name: v_event_adoption_rate; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_event_adoption_rate AS
 SELECT e.event_id,
    e.name AS event_name,
    e.event_date,
    e.location,
    emp.full_name AS responsible,
    count(ep.cat_id) AS total_cats,
    count(
        CASE
            WHEN ((cs.name)::text ~~* '%пристро%'::text) THEN 1
            ELSE NULL::integer
        END) AS adopted_after,
    round(
        CASE
            WHEN (count(ep.cat_id) > 0) THEN (((count(
            CASE
                WHEN ((cs.name)::text ~~* '%пристро%'::text) THEN 1
                ELSE NULL::integer
            END))::numeric * 100.0) / (count(ep.cat_id))::numeric)
            ELSE (0)::numeric
        END, 1) AS adoption_rate_pct
   FROM ((((public.event e
     JOIN public.employee emp ON ((emp.employee_id = e.employee_id)))
     LEFT JOIN public.event_participation ep ON ((ep.event_id = e.event_id)))
     LEFT JOIN public.cat c ON ((c.cat_id = ep.cat_id)))
     LEFT JOIN public.cat_status cs ON ((cs.status_id = c.status_id)))
  GROUP BY e.event_id, e.name, e.event_date, e.location, emp.full_name
  ORDER BY e.event_date DESC;


--
-- Name: warehouse; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.warehouse (
    warehouse_id integer NOT NULL,
    warehouse_type character varying(50),
    capacity integer,
    CONSTRAINT warehouse_capacity_check CHECK ((capacity > 0))
);


--
-- Name: warehouse_remains; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.warehouse_remains (
    batch_id integer NOT NULL,
    warehouse_id integer NOT NULL,
    quantity numeric(10,3) NOT NULL,
    CONSTRAINT warehouse_remains_quantity_check CHECK ((quantity >= (0)::numeric))
);


--
-- Name: v_expiring_batches; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_expiring_batches AS
 SELECT pb.batch_id,
    p.name AS product_name,
    p.unit_of_measure,
    p.category,
    pb.expiration_date,
    (pb.expiration_date - CURRENT_DATE) AS days_left,
    wr.quantity AS remaining_quantity,
    w.warehouse_type
   FROM (((public.product_batch pb
     JOIN public.product p ON ((p.product_id = pb.product_id)))
     JOIN public.warehouse_remains wr ON ((wr.batch_id = pb.batch_id)))
     JOIN public.warehouse w ON ((w.warehouse_id = wr.warehouse_id)))
  WHERE ((pb.expiration_date IS NOT NULL) AND (pb.expiration_date <= (CURRENT_DATE + '30 days'::interval)) AND (wr.quantity > (0)::numeric))
  ORDER BY pb.expiration_date;


--
-- Name: v_finance_balance; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_finance_balance AS
 SELECT COALESCE(( SELECT sum(monetary_donation.amount) AS sum
           FROM public.monetary_donation), (0)::numeric) AS total_income,
    COALESCE(( SELECT sum(salary_payment.amount) AS sum
           FROM public.salary_payment), (0)::numeric) AS total_salaries,
    COALESCE(( SELECT sum(account.amount) AS sum
           FROM public.account
          WHERE ((account.operation_type)::text = 'Закупка'::text)), (0)::numeric) AS total_purchases,
    ((COALESCE(( SELECT sum(monetary_donation.amount) AS sum
           FROM public.monetary_donation), (0)::numeric) - COALESCE(( SELECT sum(salary_payment.amount) AS sum
           FROM public.salary_payment), (0)::numeric)) - COALESCE(( SELECT sum(account.amount) AS sum
           FROM public.account
          WHERE ((account.operation_type)::text = 'Закупка'::text)), (0)::numeric)) AS balance;


--
-- Name: v_warehouse_stock; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_warehouse_stock AS
 SELECT p.product_id,
    p.name AS product_name,
    p.unit_of_measure,
    p.category,
    p.is_active,
    count(DISTINCT pb.batch_id) AS batch_count,
    COALESCE(sum(wr.quantity), (0)::numeric) AS total_quantity,
    min(pb.expiration_date) AS nearest_expiration,
        CASE
            WHEN ((min(pb.expiration_date) IS NOT NULL) AND (min(pb.expiration_date) <= (CURRENT_DATE + '30 days'::interval))) THEN true
            ELSE false
        END AS expiring_soon
   FROM ((public.product p
     JOIN public.product_batch pb ON ((pb.product_id = p.product_id)))
     JOIN public.warehouse_remains wr ON ((wr.batch_id = pb.batch_id)))
  WHERE (wr.quantity > (0)::numeric)
  GROUP BY p.product_id, p.name, p.unit_of_measure, p.category, p.is_active;


--
-- Name: volunteer; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.volunteer (
    volunteer_id integer NOT NULL,
    full_name character varying(150) NOT NULL,
    phone character varying(20),
    address text,
    passport_series character varying(4),
    passport_number character varying(6),
    email character varying(100),
    birth_date date,
    registration_date date DEFAULT CURRENT_DATE NOT NULL,
    skills text,
    CONSTRAINT chk_passport_volunteer CHECK (((length(((COALESCE(passport_series, ''::character varying))::text || (COALESCE(passport_number, ''::character varying))::text)) = 10) OR ((passport_series IS NULL) AND (passport_number IS NULL)))),
    CONSTRAINT volunteer_email_check CHECK (((email)::text ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'::text)),
    CONSTRAINT volunteer_phone_check CHECK (((phone)::text ~ '^8[0-9]{10}$'::text))
);


--
-- Name: volunteer_care; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.volunteer_care (
    volunteer_id integer NOT NULL,
    cat_id integer NOT NULL,
    start_date date NOT NULL,
    end_date date,
    CONSTRAINT chk_care_dates CHECK (((end_date IS NULL) OR (end_date >= start_date)))
);


--
-- Name: volunteer_volunteer_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.volunteer_volunteer_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: volunteer_volunteer_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.volunteer_volunteer_id_seq OWNED BY public.volunteer.volunteer_id;


--
-- Name: warehouse_warehouse_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.warehouse_warehouse_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: warehouse_warehouse_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.warehouse_warehouse_id_seq OWNED BY public.warehouse.warehouse_id;


--
-- Name: account account_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account ALTER COLUMN account_id SET DEFAULT nextval('public.account_account_id_seq'::regclass);


--
-- Name: benefactor benefactor_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.benefactor ALTER COLUMN benefactor_id SET DEFAULT nextval('public.benefactor_benefactor_id_seq'::regclass);


--
-- Name: cage cage_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cage ALTER COLUMN cage_id SET DEFAULT nextval('public.cage_cage_id_seq'::regclass);


--
-- Name: cat cat_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cat ALTER COLUMN cat_id SET DEFAULT nextval('public.cat_cat_id_seq'::regclass);


--
-- Name: cat_status status_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cat_status ALTER COLUMN status_id SET DEFAULT nextval('public.cat_status_status_id_seq'::regclass);


--
-- Name: employee employee_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee ALTER COLUMN employee_id SET DEFAULT nextval('public.employee_employee_id_seq'::regclass);


--
-- Name: event event_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event ALTER COLUMN event_id SET DEFAULT nextval('public.event_event_id_seq'::regclass);


--
-- Name: medical_card medical_card_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.medical_card ALTER COLUMN medical_card_id SET DEFAULT nextval('public.medical_card_medical_card_id_seq'::regclass);


--
-- Name: product product_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product ALTER COLUMN product_id SET DEFAULT nextval('public.product_product_id_seq'::regclass);


--
-- Name: product_batch batch_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_batch ALTER COLUMN batch_id SET DEFAULT nextval('public.product_batch_batch_id_seq'::regclass);


--
-- Name: source_of_arrival source_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.source_of_arrival ALTER COLUMN source_id SET DEFAULT nextval('public.source_of_arrival_source_id_seq'::regclass);


--
-- Name: supplier supplier_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplier ALTER COLUMN supplier_id SET DEFAULT nextval('public.supplier_supplier_id_seq'::regclass);


--
-- Name: volunteer volunteer_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.volunteer ALTER COLUMN volunteer_id SET DEFAULT nextval('public.volunteer_volunteer_id_seq'::regclass);


--
-- Name: warehouse warehouse_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.warehouse ALTER COLUMN warehouse_id SET DEFAULT nextval('public.warehouse_warehouse_id_seq'::regclass);


--
-- Data for Name: account; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.account (account_id, date, amount, operation_type, purpose, batch_id) FROM stdin;
1	2024-01-15	50000.00	Расход	Зарплата январь	\N
2	2024-01-20	30000.00	Расход	Покупка корма	\N
4	2024-02-15	45000.00	Расход	Вет. препараты	\N
5	2024-03-01	55000.00	Расход	Зарплата февраль	\N
6	2024-03-10	25000.00	Расход	Покупка наполнителя	\N
7	2024-03-15	15000.00	Приход	Пожертвование	\N
8	2024-04-01	55000.00	Расход	Зарплата март	\N
9	2024-04-10	20000.00	Расход	Ремонт клеток	\N
11	2026-05-31	320000.00	Расход	Зарплата Иванова Анна Петровна за 05.2026	\N
12	2026-05-31	220000.00	Расход	Зарплата Петров Сергей Викторович за 05.2026	\N
13	2026-05-31	160000.00	Расход	Зарплата Сидорова Мария Ивановна за 05.2026	\N
14	2026-05-31	90000.00	Расход	Зарплата Кузнецов Владимир Владимирович за 05.2026	\N
15	2026-05-31	180000.00	Расход	Зарплата Смирнова Екатерина Андреевна за 05.2026	\N
16	2026-05-31	200000.00	Расход	Зарплата Новиков Алексей Дмитриевич за 05.2026	\N
17	2026-05-31	140000.00	Расход	Зарплата Морозова Ольга Сергеевна за 05.2026	\N
18	2026-05-31	192000.00	Расход	Зарплата Павлова Татьяна Николаевна за 05.2026	\N
19	2026-05-31	165000.00	Расход	Зарплата Андреева Наталья Владимировна за 05.2026	\N
20	2026-05-31	168000.00	Расход	Зарплата Михайлов Денис Олегович за 05.2026	\N
21	2026-05-31	55000.00	Расход	Зарплата Павлов Павел Игоревич за 05.2026	\N
22	2026-05-31	40000.00	Расход	Зарплата Афонина Ольга Александровна за 05.2026	\N
24	2026-05-21	100000000.00	Приход	Пожертвование от Газпромбанк	\N
25	2026-05-21	1500.00	Закупка	Закупка: Корм для котят — 10 кг	\N
26	2026-05-21	9900.00	Закупка	Закупка: Шприц 5 мл — 99 шт	\N
28	2026-05-21	880000.00	Приход	Пожертвование от Петрова Ольга Ивановна	\N
29	2026-05-22	4900.00	Закупка	Закупка: Игрушка-мышка — 70 шт	\N
30	2026-05-22	3000.00	Закупка	Закупка: Вакцина "Квадрикет" — 10 доза	24
31	2026-05-22	3000.00	Закупка	Закупка: Шприц 5 мл — 30 шт	25
32	2026-05-22	11.00	Закупка	Закупка: Антисептик — 1 мл	26
33	2026-05-08	1.00	Закупка	Закупка: Шприц 5 мл — 1 шт	27
34	2026-05-23	1200000.00	Закупка	Закупка: Героин — 10000 доза	28
\.


--
-- Data for Name: benefactor; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.benefactor (benefactor_id, full_name, phone, email) FROM stdin;
1	Газпромбанк	84951234567	gp@mail.ru
2	Рога и копыта ООО	84957654321	roga@mail.ru
3	Котов и К	84958887766	kotov@mail.ru
4	Сима-ленд	84953334455	sima@mail.ru
5	ОЗОН	84959998877	ozon@mail.ru
6	Иванов Петр Сидорович	89001234568	ivanov@mail.ru
7	Петрова Ольга Ивановна	89007654322	petrova@mail.ru
8	Сидоров Сидор Петрович	89001114456	sidorov@mail.ru
9	Новикова Анна Сергеевна	89005556678	novikova@mail.ru
10	ООО "Мурзик"	84957778899	murzik@mail.ru
11	???? ??????	\N	\N
12	???? ??????	\N	\N
13	Тест	\N	\N
\.


--
-- Data for Name: cage; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.cage (cage_id, number, capacity, cage_type) FROM stdin;
1	A-01	2	Маленькая
2	A-02	2	Маленькая
3	B-01	4	Средняя
4	B-02	4	Средняя
5	C-01	6	Большая
6	C-02	6	Большая
7	D-01	1	Карантин
8	D-02	1	Карантин
9	E-01	3	Средняя
10	F-01	8	Вольер
\.


--
-- Data for Name: cat; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.cat (cat_id, status_id, cage_id, source_of_arrival, departure_date, name, gender, birth_date, color, breed, "character", special_marks) FROM stdin;
8	3	5	от_хозяина	2024-03-15	Рыжик	М	2018-06-10	Рыжий	Абиссинский	Дружелюбный	\N
5	1	3	другой_приют	\N	Маркиза	Ж	2019-11-11	Черная	Персидская	Спокойная	лысая
9	1	1	улица	\N	Васька	М	2015-09-01	Черно-белый	Дворняга	\N	Старый
4	3	2	улица	2026-05-22	Снежок	М	2023-01-01	Белый	Дворняга	Пугливый	Голубые глаза
34	1	6	улица	\N	Маркиза	Ж	2019-11-11	Черная	Персидская	нервная	белая
33	1	4	улица	\N	TestCat	\N	\N	Red	Mix	\N	\N
10	3	6	подброшен	2026-05-22	Бегемот	М	2023-03-03	Серый	Дворняга	Дерзкий	Шрам на ухе
6	1	10	родился_в_приюте	\N	Кекс	М	2024-01-15	Рыжий	Дворняга	Шаловливый	\N
37	1	2	подброшен	\N	\N	\N	2126-12-31	\N	\N	\N	\N
2	6	9	подброшен	\N	Мурка	Ж	2021-08-15	Серая	Британская	Спокойная, ласковая	Зеленые глаза
3	1	8	от_хозяина	\N	Тигр	М	2020-03-20	Полосатый	Сиамский	Активный, любопытный	\N
1	1	7	улица	\N	Барсик	М	2022-05-10	Рыжий	Дворняга	Ласковый, игривый	Белая грудка
7	2	1	улица	\N	Луна	Ж	2022-07-07	Серебристая	Мейн-кун	Ласковая	Кисточки на ушах
\.


--
-- Data for Name: cat_status; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.cat_status (status_id, name) FROM stdin;
1	в приюте
2	на передержке
3	пристроен
4	умер
5	сбежал
6	передан_в_другой_приют
\.


--
-- Data for Name: donation; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.donation (source_id, benefactor_id, donation_date, amount, donation_type) FROM stdin;
9	6	2024-01-20	5000.00	натуральное
10	7	2024-02-05	3000.00	натуральное
35	7	2026-05-21	\N	натуральное
37	1	2026-05-21	\N	натуральное
38	1	2026-05-21	\N	денежное
39	3	2026-05-21	\N	натуральное
43	7	2026-05-21	\N	денежное
\.


--
-- Data for Name: employee; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.employee (employee_id, position_name, full_name, phone, address, email, birth_date, hire_date, termination_date, work_hours, passport_series, passport_number, login, password) FROM stdin;
1	Директор	Иванова Анна Петровна	89001234567	г. Москва, ул. Ленина, д.1	anna@catshelter.ru	1980-05-15	2018-01-10	\N	160	4501	123456	ivanova	pass123
2	Ветеринар	Петров Сергей Викторович	89007654321	г. Москва, ул. Садовая, д.10	sergey@catshelter.ru	1985-08-20	2019-03-01	\N	160	4502	234567	petrov	pass123
3	Администратор	Сидорова Мария Ивановна	89001112233	г. Москва, ул. Лесная, д.5	maria@catshelter.ru	1990-12-01	2020-06-15	\N	160	4503	345678	sidorova	pass123
4	Уборщик	Кузнецов Владимир Владимирович	89004445566	г. Москва, ул. Полевая, д.8	\N	1975-03-10	2018-11-01	\N	120	\N	\N	\N	\N
5	Менеджер по усыновлению	Смирнова Екатерина Андреевна	89007778899	г. Москва, ул. Цветочная, д.15	ekaterina@catshelter.ru	1988-07-25	2021-02-10	\N	160	4504	456789	smirnova	pass123
6	Фандрайзер	Новиков Алексей Дмитриевич	89009990011	г. Москва, ул. Парковая, д.3	alexey@catshelter.ru	1992-09-12	2022-01-20	\N	160	4505	567890	novikov	pass123
7	Волонтер-координатор	Морозова Ольга Сергеевна	89002223344	г. Москва, ул. Речная, д.22	olga@catshelter.ru	1987-04-18	2020-08-01	\N	160	4506	678901	morozova	pass123
8	Бухгалтер	Павлова Татьяна Николаевна	89005556677	г. Москва, ул. Школьная, д.7	tatiana@catshelter.ru	1982-11-30	2019-05-20	\N	160	4507	789012	pavlova	pass123
10	Ветеринар	Андреева Наталья Владимировна	89001239876	г. Москва, ул. Новая, д.4	natalia@catshelter.ru	1989-06-07	2021-10-01	\N	120	4509	901234	andreeva	pass123
9	Кинолог	Михайлов Денис Олегович	89008889900	г. Москва, ул. Спортивная, д.12	denis@catshelter.ru	1995-02-28	2023-01-15	\N	160	4508	890123	mikhailov	pass123
12	Ветеринар	Павлов Павел Игоревич	89009000897	Ленина	afonin@inbox.ru	2010-07-16	2026-05-10	\N	40	4512	333333	qqq	123
11	Администратор	Афонина Ольга Александровна	89009011753	Г. Москва, ул. Ленина, д.1	afoninaaa@inbox.ru	2005-09-07	2026-04-28	\N	40	4512	444444	sss	123
\.


--
-- Data for Name: event; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.event (event_id, employee_id, name, event_date, location, notes) FROM stdin;
1	5	День открытых дверей	2024-03-20	г. Москва, парк Сокольники	\N
2	5	Выставка кошек	2024-04-10	Гостиный двор	\N
3	6	Благотворительный забег	2024-05-01	Воробьевы горы	\N
4	6	Ярмарка вакансий	2024-01-25	ТЦ Авиапарк	\N
5	5	Лекция о кошках	2024-02-15	Библиотека №1	\N
6	5	Фотовыставка	2024-06-01	Арт-центр	\N
7	6	Сбор пожертвований	2024-03-05	Метро	\N
8	3	День кота	2024-08-08	Приют	\N
9	7	Помощь хосписам	2024-04-20	Хоспис №5	\N
10	5	Новогодняя елка	2023-12-25	Приют	\N
11	7	День тестовый	2026-05-10	Узбекистан	\N
13	11	Тест	2026-05-23	Узбекистан	\N
\.


--
-- Data for Name: event_participation; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.event_participation (cat_id, event_id, condition_after) FROM stdin;
1	1	Хорошее
2	1	Хорошее
3	2	Немного напуган
4	2	Хорошее
1	3	Хорошее
5	3	Хорошее
6	3	\N
7	4	Хорошее
8	4	Плохо перенес дорогу
1	5	Отлично
3	11	Отличное
34	11	Отличное
\.


--
-- Data for Name: medical_card; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.medical_card (medical_card_id, cat_id, opening_date, weight, is_sterilized, is_vaccinated, is_parasite_treated) FROM stdin;
3	3	2020-03-25	5.20	f	t	f
5	5	2019-11-15	4.00	t	t	t
6	6	2024-01-20	1.20	f	f	f
7	7	2022-07-10	6.00	f	t	t
8	8	2018-06-15	5.50	t	t	t
9	9	2015-09-05	4.20	t	t	t
10	10	2023-03-06	3.50	f	t	f
11	34	2026-05-07	5.00	t	t	t
1	1	2022-05-15	4.50	t	t	t
4	4	2023-01-05	2.50	f	t	t
2	2	2021-08-20	5.00	t	t	t
\.


--
-- Data for Name: medical_record; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.medical_record (employee_id, medical_card_id, record_date, diagnosis, prescriptions, notes) FROM stdin;
2	1	2024-01-10	Здоров	Плановая вакцинация	\N
2	2	2024-01-15	Здоров	Вакцинация	\N
2	1	2024-02-01	Блохи	Обработка от блох	Найдены блохи
2	3	2024-02-05	Здоров	Осмотр	Вес в норме
5	8	2024-02-10	Стоматит	Антибиотики, диета	Зубной камень
2	4	2024-02-15	Простудный насморк	Капли в нос	Чихание
9	9	2024-02-20	Ожирение	Диета, спорт	Избыточный вес
2	5	2024-02-25	Здоров	Наблюдение	\N
10	10	2024-03-01	Агрессия	Консультация зоопсихолога	Боится людей
2	6	2024-03-05	Здоров	Плановая вакцинация	Маленький котенок
1	1	2026-05-07	тест	тест	\N
11	11	2026-05-07	Здоров	Нет	Тест
11	9	2026-05-06	клещи	обработка	обработать повтороно
11	10	2026-05-07	наклонности к сбеганию	запереть	исцарапал всех
11	3	2026-05-10	короновирус	следить за состоянием	карантин нужен
11	3	2026-05-02	здоров	\N	\N
11	4	2026-05-10	здоров	\N	\N
11	1	2026-05-10	\N	\N	Еженедельный осмотр
11	11	2026-05-10	здоров	\N	\N
11	1	2026-05-13	здоров	\N	\N
\.


--
-- Data for Name: monetary_donation; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.monetary_donation (source_id, account_id, amount) FROM stdin;
38	24	100000000.00
43	28	880000.00
\.


--
-- Data for Name: position; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."position" (position_name, salary) FROM stdin;
Директор	80000.00
Ветеринар	55000.00
Администратор	40000.00
Уборщик	30000.00
Менеджер по усыновлению	45000.00
Фандрайзер	50000.00
Волонтер-координатор	35000.00
Бухгалтер	48000.00
Кинолог	42000.00
Зоопсихолог	47000.00
\.


--
-- Data for Name: procedure_consumption_rate; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.procedure_consumption_rate (procedure_type_name, product_id, standard_quantity, notes) FROM stdin;
Вакцинация	7	1	Шприц на одну вакцинацию
Вакцинация	8	1	Одна доза на кота
Вакцинация	9	1	Дезинфекция места укола
Стерилизация	7	3	3 шприца
Стерилизация	9	10	Антисептик
Чистка ушей	9	2	На ватные палочки
Лечение зубов	7	2	Шприцы для промывания
Стрижка когтей	9	1	Обработка инструмента
Дегельминтизация	10	1	Одна таблетка на 5 кг
Осмотр	7	0	Может не требоваться
\.


--
-- Data for Name: procedure_record; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.procedure_record (employee_id, procedure_type_name, cat_id, procedure_date, result, notes) FROM stdin;
2	Вакцинация	1	2024-01-10	Успешно	Первый раз
2	Вакцинация	2	2024-01-15	Успешно	\N
2	Осмотр	3	2024-01-20	Здоров	План
2	Осмотр	4	2024-02-01	Здоров	Хороший аппетит
2	Стерилизация	5	2024-02-05	Успешно	Восстановление нормально
2	Вакцинация	6	2024-02-10	Успешно	Малыш
2	Осмотр	7	2024-02-15	Нужен спецкорм	\N
4	Чистка ушей	1	2024-02-20	Чисто	\N
4	Стрижка когтей	2	2024-02-25	Готово	\N
2	Лечение зубов	8	2024-03-01	Стоматит	Назначен антибиотик
11	Вакцинация	34	2026-05-07	успешно	\N
11	Вакцинация	6	2026-05-07	успешно	-
11	Вакцинация	7	2026-05-07	успешно	-
11	Кастрация	8	2026-05-07	успешно	нужно следить
11	Чистка ушей	10	2026-05-07	успешно	нужна повторная
11	Стрижка когтей	8	2026-05-07	\N	\N
11	Анализ крови	9	2026-05-07	\N	\N
11	Анализ крови	33	2026-05-07	\N	\N
11	Обработка от блох	33	2026-05-07	\N	\N
11	Осмотр	7	2026-05-07	успешно	здорова
11	Осмотр	34	2026-05-06	\N	\N
11	Лечение зубов	34	2026-05-08	успешно	\N
11	Осмотр	3	2026-05-10	болен	нужен карантин
11	Осмотр	6	2026-05-10	успешно	\N
11	Анализ крови	6	2026-05-10	воспаление	\N
11	Анализ крови	1	2026-05-10	воспаление	\N
11	Осмотр	7	2026-05-10	плохое самочувствие	нужно наблюдать
11	Осмотр	6	2026-05-09	\N	\N
11	Осмотр	2	2026-05-10	плохо	\N
11	Осмотр	3	2026-05-06	здоров	\N
11	Осмотр	6	2026-05-01	здоров	\N
11	Лечение зубов	3	2026-05-10	здоров	\N
11	Лечение зубов	3	2026-05-01	здоров	\N
11	Анализ крови	4	2026-05-01	болен	\N
11	Осмотр	3	2026-05-07	здоров	\N
11	Осмотр	7	2026-05-09	здоров	\N
11	Стрижка когтей	7	2026-05-09	здоров	\N
11	Анализ крови	34	2026-05-07	успешно	\N
11	Анализ крови	3	2026-05-10	успешно	\N
11	базовый осмотр	3	2026-05-10	успешно	\N
11	базовый осмотр	4	2026-05-10	здоров	\N
11	базовый осмотр	2	2026-05-10	здоров	\N
11	Анализ крови	2	2026-05-10	болен	\N
11	Осмотр	1	2026-05-10	\N	Еженедельный осмотр
11	Лечение зубов	1	2026-05-10	здоров	\N
11	Дегельминтизация	34	2026-05-10	здоров	\N
11	Осмотр	4	2026-05-10	\N	Еженедельный осмотр
11	Лечение зубов	10	2026-05-10	здоров	\N
11	Осмотр	10	2026-05-10	\N	Еженедельный осмотр
11	Осмотр	3	2026-05-12	\N	Еженедельный осмотр
11	Обработка от блох	1	2026-05-13	здоров	\N
11	Стерилизация	1	2026-05-13	здоров	\N
11	Кастрация	1	2026-05-13	здоров	\N
11	Вакцинация	4	2026-05-13	здоров	\N
12	Осмотр	10	2026-05-22	\N	Еженедельный осмотр
12	Осмотр	33	2026-05-22	\N	Еженедельный осмотр
12	Осмотр	6	2026-05-22	\N	Еженедельный осмотр
11	Осмотр	34	2026-05-22	\N	Еженедельный осмотр
12	Осмотр	1	2026-05-23	\N	Еженедельный осмотр
11	Осмотр	33	2026-05-28	\N	Еженедельный осмотр
\.


--
-- Data for Name: procedure_type; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.procedure_type (procedure_type_name, description) FROM stdin;
Вакцинация	Плановая прививка от бешенства и инфекций
Осмотр	Ежемесячный профилактический осмотр
Стерилизация	Хирургическая операция
Чистка ушей	Гигиеническая процедура
Стрижка когтей	Гигиеническая процедура
Лечение зубов	Стоматологическая помощь
Анализ крови	Диагностическая процедура
Кастрация	Хирургическая операция
Обработка от блох	Профилактическая обработка
Дегельминтизация	Профилактика глистов
базовый осмотр	Еженедельный профилактический осмотр
\.


--
-- Data for Name: product; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.product (product_id, name, unit_of_measure, category, is_active) FROM stdin;
2	Корм для взрослых	кг	Корм	t
4	Игрушка-мышка	шт	Инвентарь	t
5	Лежанка	шт	Инвентарь	t
6	Когтеточка	шт	Инвентарь	t
7	Шприц 5 мл	шт	Медицина	t
8	Вакцина "Квадрикет"	доза	Медицина	t
9	Антисептик	мл	Медицина	t
10	Глистогонное	таб	Медицина	t
13	Миска	шт	Инвентарь	t
15	Корм лечебный	кг	Корм	t
16	Игрушка-мячик	шт	Инвентарь	t
3	Наполнитель	л	Наполнитель	t
11	TestProduct	кг	Инвентарь	f
1	Корм	кг	Корм	t
\.


--
-- Data for Name: product_batch; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.product_batch (batch_id, product_id, source_id, arrival_date, expiration_date, quantity, purchase_price, employee_id) FROM stdin;
1	1	1	2024-01-18	2027-01-18	100.000	500.00	\N
2	2	2	2024-02-18	2027-02-18	150.000	450.00	\N
3	3	3	2024-03-12	2027-06-12	200.000	300.00	\N
4	4	4	2024-01-25	\N	50.000	150.00	\N
5	5	5	2024-02-20	\N	30.000	800.00	\N
7	7	7	2024-02-05	2028-02-05	500.000	5.00	\N
8	8	8	2024-01-18	2027-07-18	20.000	1200.00	\N
9	9	9	2024-02-18	2028-02-18	10.000	350.00	\N
10	10	10	2024-03-12	2027-09-12	100.000	80.00	\N
11	11	11	2026-05-07	\N	100.000	150.00	\N
12	5	12	2026-05-07	\N	55.000	100.00	\N
13	9	13	2026-05-10	2026-06-30	20.000	350.00	\N
14	13	14	2026-05-10	\N	100.000	400.00	\N
15	15	15	2026-05-10	\N	300.000	340.00	\N
16	1	35	2026-05-21	\N	50.000	\N	\N
17	3	35	2026-05-21	\N	20.000	\N	\N
19	2	37	2026-05-21	\N	30.000	\N	\N
20	16	39	2026-05-21	\N	55.000	\N	\N
21	1	40	2026-05-21	\N	10.000	150.00	\N
22	7	41	2026-05-21	\N	99.000	100.00	\N
24	8	45	2026-05-22	2026-05-31	10.000	300.00	11
25	7	46	2026-05-22	2026-06-21	30.000	100.00	11
26	9	47	2026-05-22	2026-05-23	1.000	11.00	11
27	7	48	2026-05-08	2026-05-15	1.000	1.00	11
28	1	49	2026-05-23	\N	10000.000	120.00	12
\.


--
-- Data for Name: product_expense; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.product_expense (employee_id, batch_id, cat_id, expense_date, quantity, notes) FROM stdin;
2	1	1	2024-01-20	5.000	Сухой корм
2	1	2	2024-01-20	5.000	\N
2	2	3	2024-02-05	10.000	Взрослый корм
2	3	4	2024-02-10	15.000	Наполнитель
3	4	5	2024-02-15	2.000	Лежанки
2	7	1	2024-01-25	10.000	Для вакцинации
2	8	1	2024-01-25	1.000	Доза вакцины
2	7	2	2024-01-30	5.000	\N
2	10	3	2024-02-20	3.000	Таблетки от глистов
2	8	6	2024-02-28	1.000	Вакцина
1	11	3	2026-05-07	5.000	\N
11	11	34	2026-05-07	2.000	тест кормления
11	2	34	2026-05-07	2.000	\N
11	2	34	2026-05-06	2.000	\N
11	1	34	2026-05-07	2.000	\N
11	3	34	2026-05-07	2.000	\N
11	12	10	2026-05-07	55.000	\N
11	12	33	2026-05-07	1.000	\N
11	7	1	2026-05-07	1.000	Расход при процедуре: Осмотр
11	9	3	2026-05-10	5.000	Расход при процедуре: базовый осмотр
11	4	3	2026-05-10	1.000	игрушка
11	13	4	2026-05-10	5.000	Расход при процедуре: базовый осмотр
11	13	2	2026-05-10	5.000	Расход при процедуре: базовый осмотр
11	2	2	2026-05-04	1.000	\N
11	2	2	2026-05-10	1.000	\N
11	3	2	2026-05-10	1.000	Замена наполнителя
11	3	3	2026-05-10	1.000	Замена наполнителя
11	3	4	2026-05-10	1.000	Замена наполнителя
11	3	34	2026-05-10	1.000	Замена наполнителя
11	3	33	2026-05-10	1.000	Замена наполнителя
11	3	6	2026-05-10	1.000	Замена наполнителя
11	3	5	2026-05-10	1.000	Замена наполнителя
11	3	1	2026-05-10	1.000	Замена наполнителя
11	3	7	2026-05-10	1.000	Замена наполнителя
11	2	3	2026-05-04	1.000	\N
11	2	4	2026-05-04	0.300	\N
11	7	1	2026-05-10	3.000	Расход при процедуре: Лечение зубов
11	4	1	2026-05-10	1.000	\N
11	10	34	2026-05-10	1.000	Расход при процедуре: Дегельминтизация
11	3	10	2026-05-10	1.000	Замена наполнителя
11	2	3	2026-05-10	0.300	\N
11	15	4	2026-05-10	0.300	\N
11	15	34	2026-05-10	0.300	\N
11	15	10	2026-05-10	0.300	\N
11	13	3	2026-05-12	1.000	Замена наполнителя
11	15	3	2026-05-17	0.300	\N
11	15	3	2026-05-11	0.300	\N
11	15	9	2026-05-11	0.300	\N
11	15	34	2026-05-11	0.300	\N
11	15	10	2026-05-11	0.300	\N
11	15	33	2026-05-11	0.300	Кормление кошки
11	13	9	2026-05-13	1.000	Замена наполнителя
11	3	3	2026-05-20	1.000	Замена наполнителя
11	16	4	2026-05-18	0.300	Кормление кошки
11	17	1	2026-05-22	1.000	Замена наполнителя
11	17	34	2026-05-22	1.000	Замена наполнителя
11	17	10	2026-05-22	1.000	Замена наполнителя
11	17	33	2026-05-22	1.000	Замена наполнителя
11	17	6	2026-05-22	1.000	Замена наполнителя
11	17	5	2026-05-22	1.000	Замена наполнителя
11	17	4	2026-05-22	1.000	Замена наполнителя
11	17	9	2026-05-22	1.000	Замена наполнителя
12	21	33	2026-05-22	0.300	Кормление кошки
12	21	6	2026-05-22	0.300	Кормление кошки
11	21	5	2026-05-22	0.300	Кормление кошки
11	21	4	2026-05-22	0.300	Кормление кошки
11	26	3	2026-05-22	1.000	Кормление кошки
12	28	6	2026-05-18	1.000	Кормление кошки
12	28	3	2026-05-18	1.000	Кормление кошки
12	28	1	2026-05-18	1.000	Кормление кошки
12	28	34	2026-05-18	1.000	Кормление кошки
12	28	33	2026-05-18	1.000	Кормление кошки
12	28	5	2026-05-18	1.200	Кормление кошки
12	28	37	2026-05-18	1.000	Кормление кошки
12	28	9	2026-05-18	1.000	Кормление кошки
12	28	6	2026-05-20	1.500	Кормление кошки
12	28	3	2026-05-20	1.200	Кормление кошки
\.


--
-- Data for Name: salary_payment; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.salary_payment (employee_id, account_id, amount, payment_date) FROM stdin;
1	1	80000.00	2024-01-20
2	1	55000.00	2024-01-20
3	1	40000.00	2024-01-20
1	5	80000.00	2024-02-20
2	5	55000.00	2024-02-20
3	5	40000.00	2024-02-20
1	8	80000.00	2024-03-20
2	8	55000.00	2024-03-20
3	8	40000.00	2024-03-20
4	1	30000.00	2024-01-20
1	11	320000.00	2026-05-31
2	12	220000.00	2026-05-31
3	13	160000.00	2026-05-31
4	14	90000.00	2026-05-31
5	15	180000.00	2026-05-31
6	16	200000.00	2026-05-31
7	17	140000.00	2026-05-31
8	18	192000.00	2026-05-31
10	19	165000.00	2026-05-31
9	20	168000.00	2026-05-31
12	21	55000.00	2026-05-31
11	22	40000.00	2026-05-31
\.


--
-- Data for Name: source_of_arrival; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.source_of_arrival (source_id) FROM stdin;
1
2
3
4
5
7
8
9
10
11
12
13
14
15
16
17
18
19
20
21
22
23
24
25
29
31
35
37
38
39
40
41
43
45
46
47
48
49
\.


--
-- Data for Name: supplier; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.supplier (supplier_id, phone, address) FROM stdin;
1	84951234567	г. Москва, ул. Промышленная, д.1
2	84957654321	г. Москва, ул. Логистическая, д.5
3	84958887766	г. Москва, ул. Торговая, д.10
4	84953334455	г. Санкт-Петербург, пр. Невский, д.50
5	84959998877	г. Казань, ул. Доставкина, д.7
6	89001234567	г. Москва, ул. Кормовая, д.3
7	89007654321	г. Москва, ул. Ветеринарная, д.8
8	89001112233	г. Москва, ул. Медицинская, д.12
9	89004445566	г. Краснодар, ул. Южная, д.15
10	89007778899	г. Екатеринбург, ул. Северная, д.20
\.


--
-- Data for Name: supply; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.supply (source_id, supplier_id, account_id, delivery_date) FROM stdin;
1	1	2	2024-01-18
2	2	4	2024-02-18
3	3	6	2024-03-12
4	4	2	2024-01-25
5	5	4	2024-02-20
\.


--
-- Data for Name: volunteer; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.volunteer (volunteer_id, full_name, phone, address, passport_series, passport_number, email, birth_date, registration_date, skills) FROM stdin;
1	Алексеев Никита Денисович	89001114455	г. Москва, ул. Строителей, д.2	4510	123456	nikita@mail.ru	2000-05-10	2023-01-10	Кормление, выгул
2	Егорова Ксения Андреевна	89002225566	г. Москва, ул. Зеленая, д.8	4511	234567	ksenia@mail.ru	2001-08-15	2023-02-01	Помощь на мероприятиях
3	Дмитриев Артем Игоревич	89003336677	г. Москва, ул. Рабочая, д.15	4512	345678	artem@mail.ru	1999-11-20	2023-03-12	Транспортировка
4	Козлова Анна Владимировна	89004447788	г. Москва, ул. Мира, д.10	4513	456789	anna@mail.ru	2002-12-05	2023-04-05	Фото котов
5	Соколов Иван Павлович	89005558899	г. Москва, ул. Чапаева, д.3	4514	567890	ivan@mail.ru	2000-02-18	2023-05-20	\N
6	Лебедев Роман Алексеевич	89006669900	г. Москва, ул. Гагарина, д.20	4515	678901	roman@mail.ru	1998-07-22	2023-06-15	Кормление
7	Фомина Елизавета Александровна	89007770011	г. Москва, ул. Пушкина, д.5	4516	789012	elizaveta@mail.ru	2003-03-30	2023-07-01	Уборка клеток
8	Тимофеев Андрей Михайлович	89008881122	г. Москва, ул. Лермонтова, д.12	4517	890123	andrey@mail.ru	1997-09-14	2023-08-10	Выгул
9	Григорьева Марина Дмитриевна	89009992233	г. Москва, ул. Тверская, д.7	4518	901234	marina@mail.ru	2001-01-25	2023-09-18	Помощь ветеринару
10	Назаров Дмитрий Анатольевич	89001001122	г. Москва, ул. Луговая, д.1	4519	123457	dmitry@mail.ru	1996-06-08	2023-10-22	Администрирование
18	иванов иван иванович	89009009090	г. Москва, ул. Ленина, д.1	4512	444444	sss@gmail.com	\N	2026-05-07	нет опыта
19	И В Т	87000000000	Г. Москва, ул. Ленина, д.1	\N	\N	afoninaaa@inbox.ru	2010-07-22	2026-05-10	\N
20	Павлов Павел Игоревич	89009009099	Г. Москва, ул. Ленина, д.1	\N	\N	afoninaaa@inbox.ru	\N	2026-05-10	\N
\.


--
-- Data for Name: volunteer_care; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.volunteer_care (volunteer_id, cat_id, start_date, end_date) FROM stdin;
2	3	2024-02-01	2024-02-28
3	5	2024-01-10	2024-02-10
5	7	2024-01-20	2024-02-20
3	34	2026-05-07	\N
6	9	2026-05-13	\N
2	4	2026-05-13	\N
8	33	2026-05-13	\N
7	10	2026-05-13	\N
1	1	2026-05-13	2026-05-13
5	8	2026-05-13	2026-05-13
4	1	2026-05-13	2026-05-13
1	34	2026-05-13	2026-05-13
3	6	2026-05-13	2026-05-13
3	4	2026-05-13	\N
\.


--
-- Data for Name: warehouse; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.warehouse (warehouse_id, warehouse_type, capacity) FROM stdin;
1	Продуктовый	1000
2	Медицинский	500
3	Зоотовары	800
4	Благотворительный	600
5	Резервный	400
6	Основной	1500
7	Карантинный	200
8	Ближний	700
9	Дальний	900
10	Сезонный	300
\.


--
-- Data for Name: warehouse_remains; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.warehouse_remains (batch_id, warehouse_id, quantity) FROM stdin;
1	4	50.000
5	3	20.000
5	6	10.000
8	2	15.000
8	4	5.000
9	4	2.000
11	1	93.000
1	1	48.000
7	2	299.000
9	2	3.000
4	3	29.000
14	9	100.000
2	5	69.700
7	4	197.000
4	6	19.000
2	1	71.700
12	5	1.000
10	4	39.000
10	2	60.000
15	1	297.300
13	2	8.000
3	3	100.000
3	1	87.000
19	4	30.000
20	4	55.000
22	2	99.000
21	1	8.800
24	2	10.000
25	2	30.000
26	2	0.000
27	2	0.000
28	1	9989.100
\.


--
-- Name: account_account_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.account_account_id_seq', 34, true);


--
-- Name: benefactor_benefactor_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.benefactor_benefactor_id_seq', 14, true);


--
-- Name: cage_cage_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.cage_cage_id_seq', 30, true);


--
-- Name: cat_cat_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.cat_cat_id_seq', 37, true);


--
-- Name: cat_status_status_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.cat_status_status_id_seq', 24, true);


--
-- Name: employee_employee_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.employee_employee_id_seq', 12, true);


--
-- Name: event_event_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.event_event_id_seq', 13, true);


--
-- Name: medical_card_medical_card_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.medical_card_medical_card_id_seq', 11, true);


--
-- Name: product_batch_batch_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.product_batch_batch_id_seq', 28, true);


--
-- Name: product_product_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.product_product_id_seq', 16, true);


--
-- Name: source_of_arrival_source_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.source_of_arrival_source_id_seq', 49, true);


--
-- Name: supplier_supplier_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.supplier_supplier_id_seq', 10, true);


--
-- Name: volunteer_volunteer_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.volunteer_volunteer_id_seq', 20, true);


--
-- Name: warehouse_warehouse_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.warehouse_warehouse_id_seq', 10, true);


--
-- Name: account account_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account
    ADD CONSTRAINT account_pkey PRIMARY KEY (account_id);


--
-- Name: benefactor benefactor_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.benefactor
    ADD CONSTRAINT benefactor_pkey PRIMARY KEY (benefactor_id);


--
-- Name: cage cage_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cage
    ADD CONSTRAINT cage_number_key UNIQUE (number);


--
-- Name: cage cage_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cage
    ADD CONSTRAINT cage_pkey PRIMARY KEY (cage_id);


--
-- Name: cat cat_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cat
    ADD CONSTRAINT cat_pkey PRIMARY KEY (cat_id);


--
-- Name: cat_status cat_status_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cat_status
    ADD CONSTRAINT cat_status_name_key UNIQUE (name);


--
-- Name: cat_status cat_status_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cat_status
    ADD CONSTRAINT cat_status_pkey PRIMARY KEY (status_id);


--
-- Name: donation donation_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.donation
    ADD CONSTRAINT donation_pkey PRIMARY KEY (source_id);


--
-- Name: employee employee_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee
    ADD CONSTRAINT employee_pkey PRIMARY KEY (employee_id);


--
-- Name: event_participation event_participation_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_participation
    ADD CONSTRAINT event_participation_pkey PRIMARY KEY (cat_id, event_id);


--
-- Name: event event_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event
    ADD CONSTRAINT event_pkey PRIMARY KEY (event_id);


--
-- Name: medical_card medical_card_cat_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.medical_card
    ADD CONSTRAINT medical_card_cat_id_key UNIQUE (cat_id);


--
-- Name: medical_card medical_card_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.medical_card
    ADD CONSTRAINT medical_card_pkey PRIMARY KEY (medical_card_id);


--
-- Name: medical_record medical_record_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.medical_record
    ADD CONSTRAINT medical_record_pkey PRIMARY KEY (employee_id, medical_card_id, record_date);


--
-- Name: monetary_donation monetary_donation_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.monetary_donation
    ADD CONSTRAINT monetary_donation_pkey PRIMARY KEY (source_id, account_id);


--
-- Name: position position_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."position"
    ADD CONSTRAINT position_pkey PRIMARY KEY (position_name);


--
-- Name: procedure_consumption_rate procedure_consumption_rate_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.procedure_consumption_rate
    ADD CONSTRAINT procedure_consumption_rate_pkey PRIMARY KEY (procedure_type_name, product_id);


--
-- Name: procedure_record procedure_record_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.procedure_record
    ADD CONSTRAINT procedure_record_pkey PRIMARY KEY (employee_id, procedure_type_name, cat_id, procedure_date);


--
-- Name: procedure_type procedure_type_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.procedure_type
    ADD CONSTRAINT procedure_type_pkey PRIMARY KEY (procedure_type_name);


--
-- Name: product_batch product_batch_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_batch
    ADD CONSTRAINT product_batch_pkey PRIMARY KEY (batch_id);


--
-- Name: product_expense product_expense_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_expense
    ADD CONSTRAINT product_expense_pkey PRIMARY KEY (employee_id, batch_id, cat_id, expense_date);


--
-- Name: product product_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product
    ADD CONSTRAINT product_pkey PRIMARY KEY (product_id);


--
-- Name: salary_payment salary_payment_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.salary_payment
    ADD CONSTRAINT salary_payment_pkey PRIMARY KEY (employee_id, account_id);


--
-- Name: source_of_arrival source_of_arrival_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.source_of_arrival
    ADD CONSTRAINT source_of_arrival_pkey PRIMARY KEY (source_id);


--
-- Name: supplier supplier_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplier
    ADD CONSTRAINT supplier_pkey PRIMARY KEY (supplier_id);


--
-- Name: supply supply_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supply
    ADD CONSTRAINT supply_pkey PRIMARY KEY (source_id);


--
-- Name: employee unique_passport_employee; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee
    ADD CONSTRAINT unique_passport_employee UNIQUE (passport_series, passport_number);


--
-- Name: volunteer unique_passport_volunteer; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.volunteer
    ADD CONSTRAINT unique_passport_volunteer UNIQUE (passport_series, passport_number);


--
-- Name: volunteer_care volunteer_care_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.volunteer_care
    ADD CONSTRAINT volunteer_care_pkey PRIMARY KEY (volunteer_id, cat_id);


--
-- Name: volunteer volunteer_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.volunteer
    ADD CONSTRAINT volunteer_pkey PRIMARY KEY (volunteer_id);


--
-- Name: warehouse warehouse_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.warehouse
    ADD CONSTRAINT warehouse_pkey PRIMARY KEY (warehouse_id);


--
-- Name: warehouse_remains warehouse_remains_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.warehouse_remains
    ADD CONSTRAINT warehouse_remains_pkey PRIMARY KEY (batch_id, warehouse_id);


--
-- Name: cat trg_cat_departure; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_cat_departure AFTER UPDATE OF departure_date ON public.cat FOR EACH ROW EXECUTE FUNCTION public.fn_cat_departure();


--
-- Name: event_participation trg_cat_event_date; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_cat_event_date BEFORE INSERT ON public.event_participation FOR EACH ROW EXECUTE FUNCTION public.check_cat_event_date();


--
-- Name: event trg_event_date_change; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_event_date_change AFTER UPDATE OF event_date ON public.event FOR EACH ROW EXECUTE FUNCTION public.fn_event_date_change();


--
-- Name: product_expense trg_expense_remains_check; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_expense_remains_check BEFORE INSERT ON public.product_expense FOR EACH ROW EXECUTE FUNCTION public.fn_expense_remains_check();


--
-- Name: account account_batch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account
    ADD CONSTRAINT account_batch_id_fkey FOREIGN KEY (batch_id) REFERENCES public.product_batch(batch_id) ON DELETE SET NULL;


--
-- Name: cat cat_cage_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cat
    ADD CONSTRAINT cat_cage_id_fkey FOREIGN KEY (cage_id) REFERENCES public.cage(cage_id);


--
-- Name: cat cat_status_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cat
    ADD CONSTRAINT cat_status_id_fkey FOREIGN KEY (status_id) REFERENCES public.cat_status(status_id);


--
-- Name: donation donation_benefactor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.donation
    ADD CONSTRAINT donation_benefactor_id_fkey FOREIGN KEY (benefactor_id) REFERENCES public.benefactor(benefactor_id);


--
-- Name: donation donation_source_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.donation
    ADD CONSTRAINT donation_source_id_fkey FOREIGN KEY (source_id) REFERENCES public.source_of_arrival(source_id);


--
-- Name: employee employee_position_name_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee
    ADD CONSTRAINT employee_position_name_fkey FOREIGN KEY (position_name) REFERENCES public."position"(position_name);


--
-- Name: event event_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event
    ADD CONSTRAINT event_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employee(employee_id);


--
-- Name: event_participation event_participation_cat_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_participation
    ADD CONSTRAINT event_participation_cat_id_fkey FOREIGN KEY (cat_id) REFERENCES public.cat(cat_id);


--
-- Name: event_participation event_participation_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_participation
    ADD CONSTRAINT event_participation_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.event(event_id);


--
-- Name: medical_card medical_card_cat_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.medical_card
    ADD CONSTRAINT medical_card_cat_id_fkey FOREIGN KEY (cat_id) REFERENCES public.cat(cat_id);


--
-- Name: medical_record medical_record_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.medical_record
    ADD CONSTRAINT medical_record_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employee(employee_id);


--
-- Name: medical_record medical_record_medical_card_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.medical_record
    ADD CONSTRAINT medical_record_medical_card_id_fkey FOREIGN KEY (medical_card_id) REFERENCES public.medical_card(medical_card_id);


--
-- Name: monetary_donation monetary_donation_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.monetary_donation
    ADD CONSTRAINT monetary_donation_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.account(account_id);


--
-- Name: monetary_donation monetary_donation_source_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.monetary_donation
    ADD CONSTRAINT monetary_donation_source_id_fkey FOREIGN KEY (source_id) REFERENCES public.donation(source_id);


--
-- Name: procedure_consumption_rate procedure_consumption_rate_procedure_type_name_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.procedure_consumption_rate
    ADD CONSTRAINT procedure_consumption_rate_procedure_type_name_fkey FOREIGN KEY (procedure_type_name) REFERENCES public.procedure_type(procedure_type_name);


--
-- Name: procedure_consumption_rate procedure_consumption_rate_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.procedure_consumption_rate
    ADD CONSTRAINT procedure_consumption_rate_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.product(product_id);


--
-- Name: procedure_record procedure_record_cat_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.procedure_record
    ADD CONSTRAINT procedure_record_cat_id_fkey FOREIGN KEY (cat_id) REFERENCES public.cat(cat_id);


--
-- Name: procedure_record procedure_record_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.procedure_record
    ADD CONSTRAINT procedure_record_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employee(employee_id);


--
-- Name: procedure_record procedure_record_procedure_type_name_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.procedure_record
    ADD CONSTRAINT procedure_record_procedure_type_name_fkey FOREIGN KEY (procedure_type_name) REFERENCES public.procedure_type(procedure_type_name);


--
-- Name: product_batch product_batch_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_batch
    ADD CONSTRAINT product_batch_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employee(employee_id);


--
-- Name: product_batch product_batch_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_batch
    ADD CONSTRAINT product_batch_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.product(product_id);


--
-- Name: product_batch product_batch_source_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_batch
    ADD CONSTRAINT product_batch_source_id_fkey FOREIGN KEY (source_id) REFERENCES public.source_of_arrival(source_id);


--
-- Name: product_expense product_expense_batch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_expense
    ADD CONSTRAINT product_expense_batch_id_fkey FOREIGN KEY (batch_id) REFERENCES public.product_batch(batch_id);


--
-- Name: product_expense product_expense_cat_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_expense
    ADD CONSTRAINT product_expense_cat_id_fkey FOREIGN KEY (cat_id) REFERENCES public.cat(cat_id);


--
-- Name: product_expense product_expense_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_expense
    ADD CONSTRAINT product_expense_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employee(employee_id);


--
-- Name: salary_payment salary_payment_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.salary_payment
    ADD CONSTRAINT salary_payment_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.account(account_id);


--
-- Name: salary_payment salary_payment_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.salary_payment
    ADD CONSTRAINT salary_payment_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employee(employee_id);


--
-- Name: supply supply_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supply
    ADD CONSTRAINT supply_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.account(account_id);


--
-- Name: supply supply_source_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supply
    ADD CONSTRAINT supply_source_id_fkey FOREIGN KEY (source_id) REFERENCES public.source_of_arrival(source_id);


--
-- Name: supply supply_supplier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supply
    ADD CONSTRAINT supply_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.supplier(supplier_id);


--
-- Name: volunteer_care volunteer_care_cat_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.volunteer_care
    ADD CONSTRAINT volunteer_care_cat_id_fkey FOREIGN KEY (cat_id) REFERENCES public.cat(cat_id);


--
-- Name: volunteer_care volunteer_care_volunteer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.volunteer_care
    ADD CONSTRAINT volunteer_care_volunteer_id_fkey FOREIGN KEY (volunteer_id) REFERENCES public.volunteer(volunteer_id);


--
-- Name: warehouse_remains warehouse_remains_batch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.warehouse_remains
    ADD CONSTRAINT warehouse_remains_batch_id_fkey FOREIGN KEY (batch_id) REFERENCES public.product_batch(batch_id);


--
-- Name: warehouse_remains warehouse_remains_warehouse_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.warehouse_remains
    ADD CONSTRAINT warehouse_remains_warehouse_id_fkey FOREIGN KEY (warehouse_id) REFERENCES public.warehouse(warehouse_id);


--
-- PostgreSQL database dump complete
--

\unrestrict UEgfIFA3TZa9F7VyU02fC04IJnyUNwZF4svyz2EnxxKjfGfvBEdYaFYx4rWj7fR

