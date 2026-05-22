# 🐾 Shelter — система управления приютом для кошек

Веб-приложение для сотрудников приюта: учёт кошек, медкарты, процедуры, волонтёры, склад и мероприятия.

## Стек технологий

- **Backend** — ASP.NET Core 8 Web API, Entity Framework Core 8
- **Database** — PostgreSQL 15+
- **Frontend** — HTML + CSS + Vanilla JS (без фреймворков)
- **ORM** — Npgsql / EF Core

## Основные разделы

| Раздел | Функциональность |
|---|---|
| 🐱 Кошки | Карточки кошек, клетки, статусы, фильтр по статусу |
| 🏥 Медкарты | Создание и ведение медицинских карт, записи приёмов |
| 📋 Процедуры | Журнал процедур с нормами расхода, типы процедур |
| 🤝 Волонтёры | Реестр волонтёров, закрепление за кошками |
| 📦 Склад | Партии, остатки, расходы, баннер истекающих партий, списание |
| 🎪 Мероприятия | Карточки мероприятий, статистика усыновлений, участие кошек |
| 🗓 Задачи | Еженедельный осмотр, замена наполнителя, ежедневное кормление |

## Структура БД

Ключевые таблицы: `cat`, `cat_status`, `cage`, `medical_record`, `procedure_type`, `procedure_record`, `volunteer`, `volunteer_care`, `product`, `product_batch`, `warehouse`, `warehouse_remains`, `product_expense`, `employee`, `event`, `event_participation`, `account`, `salary_payment`, `monetary_donation`.

SQL-скрипты в корне проекта:
- `db_create.sql` — полный скрипт создания БД: таблицы, ограничения, начальные данные
- `db_views_and_triggers.sql` — представления и триггеры с курсорами (выполнить при первой настройке)
- `trigger_cat_event.sql` — триггер проверки даты при добавлении кошки в мероприятие
- `donation_relations.sql` — связи пожертвований
- `db_examples.sql` — примеры пользовательских типов, CHECK, DEFAULT, триггеров и представлений

## Быстрый старт

### 1. База данных

```bash
# Создай БД в PostgreSQL
createdb catbd

# Выполни SQL-скрипты (в pgAdmin или psql)
psql -d catbd -f db_create.sql
psql -d catbd -f db_views_and_triggers.sql
psql -d catbd -f trigger_cat_event.sql
psql -d catbd -f donation_relations.sql
```

### 2. Настройка подключения

Открой `appsettings.json` и замени `YOUR_PASSWORD` на свой пароль PostgreSQL:

```json
"DefaultConnection": "Host=localhost;Port=5432;Database=catbd;Username=postgres;Password=YOUR_PASSWORD"
```

### 3. Запуск

```bash
dotnet run --launch-profile https
```

Приложение откроется на `https://localhost:7099`.

## Представления PostgreSQL

| Представление | Описание |
|---|---|
| `v_warehouse_stock` | Сводные остатки по продуктам |
| `v_expiring_batches` | Партии с истекающим сроком (≤ 30 дней) |
| `v_finance_balance` | Финансовый баланс приюта |
| `v_event_adoption_rate` | Эффективность мероприятий (% усыновлений) |

## Триггеры PostgreSQL

| Триггер | Описание |
|---|---|
| `trg_cat_departure` | При выбытии кошки — убирает её из будущих мероприятий |
| `trg_event_date_change` | При изменении даты мероприятия — убирает уже выбывших кошек |
| `trg_expense_remains_check` | Запрещает расход больше остатка на складе (курсор по складам) |
| `trg_check_batch_expiry` | Запрещает расход просроченной партии |
| `trg_cat_event_date` | Кошек можно добавлять в мероприятие только в день его проведения |

## Бизнес-правила

- Просроченные партии нельзя использовать — только списать через кнопку в баннере склада
- Задачи (осмотр, наполнитель, кормление) другого сотрудника нельзя снять — только своя галочка
- Кошку нельзя добавить в мероприятие заранее — только в день проведения

## Требования

- .NET 8 SDK
- PostgreSQL 15+
- Браузер (Chrome / Edge / Firefox)
