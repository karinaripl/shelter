# 🐾 Shelter — система управления приютом для кошек

Веб-приложение для сотрудников приюта: учёт кошек, медкарты, процедуры, волонтёры, склад и мероприятия.

## Стек технологий

| Слой | Технология |
|---|---|
| Backend | ASP.NET Core 8 Web API |
| ORM | Entity Framework Core 8 + Npgsql |
| База данных | PostgreSQL 15+ |
| Frontend | HTML + CSS + Vanilla JS (без фреймворков) |
| Маппинг | AutoMapper 12 |
| API-документация | Swagger / OpenAPI |

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
| 👥 Сотрудники | (только admin) реестр, создание аккаунтов, должности |

---

## Требования

Перед установкой убедитесь, что установлены:

- **[.NET 8 SDK](https://dotnet.microsoft.com/download/dotnet/8.0)** — проверьте командой `dotnet --version` (нужна версия 8.x)
- **[PostgreSQL 15+](https://www.postgresql.org/download/)** — при установке запомните пароль пользователя `postgres`
- **Браузер** — Chrome, Edge или Firefox

---

## Пошаговая установка и запуск

### Шаг 1 — Клонировать репозиторий

```bash
git clone https://github.com/karinaripl/shelter.git
cd shelter
```

### Шаг 2 — Создать базу данных

Откройте терминал и выполните:

```bash
# Создать БД с именем catbd
createdb -U postgres catbd
```

Или через pgAdmin: правая кнопка на **Databases → Create → Database**, имя `catbd`.

### Шаг 3 — Выполнить SQL-скрипты

Скрипты выполнять строго по порядку:

```bash
# 1. Создать все таблицы и начальные данные
psql -U postgres -d catbd -f db_create.sql

# 2. Создать представления и триггеры (курсорные проверки)
psql -U postgres -d catbd -f db_views_and_triggers.sql

# 3. Триггер проверки даты при добавлении кошки в мероприятие
psql -U postgres -d catbd -f trigger_cat_event.sql

# 4. Связи пожертвований
psql -U postgres -d catbd -f donation_relations.sql
```

Через pgAdmin: откройте Query Tool (Tools → Query Tool), вставьте содержимое каждого файла и нажмите **F5**.

### Шаг 4 — Настроить строку подключения

Откройте файл `appsettings.json` и замените `YOUR_PASSWORD` на ваш пароль PostgreSQL:

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Host=localhost;Port=5432;Database=catbd;Username=postgres;Password=ВАШ_ПАРОЛЬ;Include Error Detail=true"
  }
}
```

### Шаг 5 — Создать первого администратора

До запуска приложения добавьте первого сотрудника с правами администратора прямо в БД.
Откройте Query Tool в pgAdmin или psql и выполните:

```sql
-- Создать должность администратора
INSERT INTO position (position_name, salary) VALUES ('Администратор', 0);

-- Создать аккаунт администратора
INSERT INTO employee (position_name, full_name, hire_date, login, password)
VALUES ('Администратор', 'Главный Администратор', CURRENT_DATE, 'admin', 'admin123');
```

> Логин и пароль можно изменить после первого входа через настройки профиля.

### Шаг 6 — Запустить приложение

```bash
dotnet run --launch-profile https
```

Приложение запустится и откроет браузер на `https://localhost:7099`.

> Если браузер показывает предупреждение о сертификате — нажмите «Дополнительно → Перейти на сайт». Это нормально для локальной разработки.

Альтернативно — через HTTP без сертификата:

```bash
dotnet run --launch-profile http
# Адрес: http://localhost:5248
```

### Шаг 7 — Войти в систему

Откройте `https://localhost:7099` — вы увидите страницу входа.

| Поле | Значение |
|---|---|
| Логин | `admin` |
| Пароль | `admin123` |

После входа:
- **Администратор** попадает на страницу `admin.html` — управление сотрудниками, должностями, финансами
- **Сотрудник** попадает на страницу `employee.html` — кошки, медкарты, склад, мероприятия

---

## Структура проекта

```
shelter/
├── Controllers/        # REST-контроллеры (один на каждую сущность)
├── DTOs/               # Data Transfer Objects для запросов/ответов
├── Models/             # EF Core модели + CatDbContext
├── Services/           # Бизнес-логика (интерфейс + реализация)
├── wwwroot/
│   ├── index.html      # Страница входа
│   ├── employee.html   # Интерфейс сотрудника
│   ├── admin.html      # Интерфейс администратора
│   ├── dashboard.html  # Дашборд со статистикой
│   ├── css/            # Стили (login.css, employee.css, admin.css)
│   ├── js/             # Скрипты (login.js, employee.js, admin.js, common.js)
│   └── img/avatars/    # SVG-аватары сотрудников
├── db_create.sql            # Создание всех таблиц + начальные данные
├── db_views_and_triggers.sql # Представления и триггеры с курсорами
├── trigger_cat_event.sql    # Триггер проверки даты мероприятия
├── donation_relations.sql   # Связи пожертвований
├── db_examples.sql          # Примеры типов, CHECK, DEFAULT, триггеров, VIEW
├── appsettings.json         # Строка подключения к БД
├── Program.cs               # Точка входа, DI, middleware
└── shelter2.csproj          # NuGet-зависимости
```

---

## Структура БД

Ключевые таблицы: `cat`, `cat_status`, `cage`, `medical_card`, `medical_record`, `procedure_type`, `procedure_record`, `volunteer`, `volunteer_care`, `product`, `product_batch`, `warehouse`, `warehouse_remain`, `product_expense`, `employee`, `position`, `event`, `event_participation`, `account`, `salary_payment`, `monetary_donation`.

### Представления PostgreSQL

| Представление | Описание |
|---|---|
| `v_warehouse_stock` | Сводные остатки по продуктам |
| `v_expiring_batches` | Партии с истекающим сроком (≤ 30 дней) |
| `v_finance_balance` | Финансовый баланс приюта |
| `v_event_adoption_rate` | Эффективность мероприятий (% усыновлений) |

### Триггеры PostgreSQL

| Триггер | Описание |
|---|---|
| `trg_cat_departure` | При выбытии кошки — убирает её из будущих мероприятий |
| `trg_event_date_change` | При изменении даты мероприятия — убирает выбывших кошек |
| `trg_expense_remains_check` | Запрещает расход больше остатка на складе (курсор по складам) |
| `trg_check_batch_expiry` | Запрещает расход просроченной партии |
| `trg_cat_event_date` | Кошек можно добавлять в мероприятие только в день его проведения |

---

## Бизнес-правила

- Просроченные партии нельзя использовать — только списать через кнопку в баннере склада
- Задачи (осмотр, наполнитель, кормление) другого сотрудника нельзя снять — только своя галочка
- Кошку нельзя добавить в мероприятие заранее — только в день проведения
- Вес кошки в медкарте должен быть больше 0

---

## Swagger / API

В режиме разработки API доступно по адресу:

```
https://localhost:7099/swagger
```

Все эндпоинты сгруппированы по контроллерам (Cat, Employee, MedicalCard, Warehouse и др.).

---

## Частые ошибки при запуске

| Ошибка | Причина | Решение |
|---|---|---|
| `password authentication failed` | Неверный пароль в `appsettings.json` | Проверьте пароль PostgreSQL |
| `database "catbd" does not exist` | БД не создана | Выполните `createdb -U postgres catbd` |
| `relation "cat_status" does not exist` | Скрипты не выполнены | Выполните все 4 SQL-скрипта из Шага 3 |
| `certificate error` в браузере | Самоподписанный HTTPS-сертификат | Нажмите «Перейти на сайт» или используйте HTTP-профиль |
| `dotnet: command not found` | .NET SDK не установлен | Установите .NET 8 SDK |
