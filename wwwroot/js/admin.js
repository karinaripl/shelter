let employees = [];
let positions = [];
let editingEmployeeId = null;
let currentUser = null;

async function extractError(response) {
    let msg = 'Не удалось сохранить данные. Попробуйте ещё раз.';
    try {
        const d = await response.json();
        if (d.error) return d.error;
        if (d.errors) {
            const msgs = Object.values(d.errors).flat();
            return msgs.join('; ') || msg;
        }
        if (d.message) return d.message;
        if (d.title && d.title !== 'One or more validation errors occurred.') return d.title;
        if (typeof d === 'string') return d;
    } catch (_) {}
    return msg;
}

// Загрузка списка должностей
async function loadPositions() {
    try {
        const response = await fetch(`${API_BASE}/position`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        positions = await response.json();

        const select = document.getElementById('empPosition');
        if (select) {
            select.innerHTML = '<option value="">-- Выберите должность --</option>';
            positions.forEach(pos => {
                const option = document.createElement('option');
                option.value = pos.position_name;
                option.textContent = pos.position_name;
                select.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Ошибка загрузки должностей:', error);
        showToast('Ошибка загрузки списка должностей', true);
    }
}

function validatePhone(phone) {
    if (!phone) return true;
    return /^8[0-9]{10}$/.test(phone);
}

function validateEmail(email) {
    if (!email) return true;
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
}

function validatePassport(series, number) {
    if (!series && !number) return true;
    if (!series || !number) return false;
    return /^[0-9]{4}$/.test(series) && /^[0-9]{6}$/.test(number);
}

function showFieldError(fieldId, message) {
    const errorDiv = document.getElementById(`error${fieldId}`);
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.style.color = '#e74c3c';
    }
    const input = document.getElementById(`emp${fieldId}`);
    if (input) input.classList.add('error');
}

function clearFormErrors() {
    document.querySelectorAll('.error-text').forEach(el => el.textContent = '');
    document.querySelectorAll('.form-group input, .form-group select').forEach(el => el.classList.remove('error'));
}

function validateForm(formData, isEditing) {
    let isValid = true;
    clearFormErrors();

    // ФИО
    if (!formData.lastName) { showFieldError('LastName', 'Фамилия обязательна'); isValid = false; }
    if (!formData.firstName) { showFieldError('FirstName', 'Имя обязательно'); isValid = false; }

    // Должность
    if (!formData.position) { showFieldError('Position', 'Должность обязательна'); isValid = false; }

    // Телефон
    if (document.getElementById('empPhone').value.trim() && !validatePhone(formData.phone)) {
        showFieldError('Phone', 'Введите номер в формате 8XXXXXXXXXX, +7XXXXXXXXXX или 10 цифр');
        isValid = false;
    }

    // Email
    if (formData.email && !validateEmail(formData.email)) {
        showFieldError('Email', 'Неверный формат — например: ivanova@mail.ru');
        isValid = false;
    }

    // Паспорт
    if (formData.passportSeries || formData.passportNumber) {
        if (formData.passportSeries.length !== 4) {
            showFieldError('PassportSeries', 'Серия: ровно 4 цифры');
            isValid = false;
        }
        if (formData.passportNumber.length !== 6) {
            showFieldError('PassportNumber', 'Номер: ровно 6 цифр');
            isValid = false;
        }
    }

    // Дата рождения (не может быть в будущем)
    if (formData.birthDate && new Date(formData.birthDate) > new Date()) {
        showFieldError('BirthDate', 'Дата рождения не может быть в будущем');
        isValid = false;
    }

    // Дата приёма
    if (!formData.hireDate) {
        showFieldError('HireDate', 'Дата приёма обязательна');
        isValid = false;
    }

    // Дата увольнения (должна быть после даты приёма)
    if (formData.terminationDate && formData.hireDate && new Date(formData.terminationDate) < new Date(formData.hireDate)) {
        showFieldError('TerminationDate', 'Дата увольнения не может быть раньше даты приёма');
        isValid = false;
    }

    // Логин
    if (!formData.login) { showFieldError('Login', 'Логин обязателен'); isValid = false; }

    // Пароль
    if (!isEditing && !formData.password) {
        showFieldError('Password', 'Пароль обязателен для нового сотрудника');
        isValid = false;
    }
    if (formData.password && formData.password.length < 3) {
        showFieldError('Password', 'Пароль должен быть не менее 3 символов');
        isValid = false;
    }

    // Рабочие часы
    if (formData.workHours && (parseInt(formData.workHours) < 0 || isNaN(parseInt(formData.workHours)))) {
        showFieldError('WorkHours', 'Рабочие часы должны быть положительным числом');
        isValid = false;
    }

    return isValid;
}

function seedEmployeeAvatars(empList) {
    // Перемешанный порядок — чтобы соседние ID получали визуально разные аватары
    const order = ['av3','av8','av11','av2','av7','av12','av5','av1','av9','av4','av10','av6'];
    empList.forEach(emp => {
        const key = `emp_avatar_${emp.employee_id}`;
        if (!localStorage.getItem(key)) {
            localStorage.setItem(key, order[(emp.employee_id - 1) % order.length]);
        }
    });
}

async function loadEmployees() {
    const tbody = document.getElementById('employeesTableBody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="8" class="loading-text">Загрузка...</td></tr>';

    try {
        const response = await fetch(`${API_BASE}/employee`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        employees = await response.json();
        renderTable();
        updateStats();
    } catch (error) {
        tbody.innerHTML = `<tr><td colspan="8" class="loading-text" style="color:var(--red)">Не удалось загрузить список сотрудников. Обновите страницу.</td></tr>`;
    }
}

function renderTable() {
    const tbody = document.getElementById('employeesTableBody');
    if (!tbody) return;

    const searchQuery = document.getElementById('employeeSearch')?.value.toLowerCase() || '';

    const filtered = employees.filter(emp =>
        (emp.full_name?.toLowerCase() || '').includes(searchQuery) ||
        (emp.position_name?.toLowerCase() || '').includes(searchQuery)
    );

    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="loading-text">Нет данных</td></tr>';
        return;
    }

    tbody.innerHTML = filtered.map(emp => {
        const isFired = emp.termination_date;
        const status = isFired ? '❌ Уволен' : '✅ Работает';
        const statusClass = isFired ? 'status-fired' : 'status-active';

        return `
            <tr class="${isFired ? 'fired-row' : ''}">
                <td>${employeeAvatarHtml(emp.employee_id, emp.full_name)}</td>
                <td>${emp.full_name || '-'}</td>
                <td>${emp.position_name || '-'}</td>
                <td>${emp.phone || '-'}</td>
                <td>${emp.email || '-'}</td>
                <td>${emp.hire_date ? new Date(emp.hire_date).toLocaleDateString() : '-'}</td>
                <td class="${statusClass}">${status}</td>
                <td>
                    <button class="btn-edit" onclick="openEditModal(${emp.employee_id})">✏️ Редактировать</button>
                    ${!isFired ? `<button class="btn-fire" onclick="fireEmployee(${emp.employee_id})">📋 Уволить</button>` : ''}
                </td>
            </tr>
        `;
    }).join('');
}

async function updateStats() {
    const active = employees.filter(e => !e.termination_date).length;
    const fired = employees.filter(e => e.termination_date).length;

    const activeStat = document.getElementById('activeEmployeesStat');
    const firedStat = document.getElementById('firedEmployeesStat');
    if (activeStat) activeStat.textContent = active;
    if (firedStat) firedStat.textContent = fired;
}

function openAddModal() {
    editingEmployeeId = null;
    document.getElementById('modalTitle').textContent = 'Добавить сотрудника';
    document.getElementById('employeeForm').reset();
    document.getElementById('empPassword').required = true;
    document.getElementById('empPassword').value = '';
    document.getElementById('passwordHint').style.display = 'none';
    document.getElementById('passwordRequiredHint').style.display = 'inline';
    document.getElementById('empWorkHours').value = 40;

    // Сбрасываем выбор должности
    const positionSelect = document.getElementById('empPosition');
    if (positionSelect) positionSelect.value = '';

    clearFormErrors();
    document.getElementById('employeeModal').classList.add('show');
}

async function openEditModal(id) {
    editingEmployeeId = id;
    document.getElementById('modalTitle').textContent = 'Редактировать сотрудника';
    clearFormErrors();

    try {
        const response = await fetch(`${API_BASE}/employee/${id}`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const emp = await response.json();

        const nameParts = (emp.full_name || '').split(' ');
        document.getElementById('empLastName').value = nameParts[0] || '';
        document.getElementById('empFirstName').value = nameParts[1] || '';
        document.getElementById('empMiddleName').value = nameParts[2] || '';

        // Устанавливаем выбранную должность
        const positionSelect = document.getElementById('empPosition');
        if (positionSelect) positionSelect.value = emp.position_name || '';

        document.getElementById('empPhone').value = emp.phone || '';
        document.getElementById('empEmail').value = emp.email || '';
        document.getElementById('empAddress').value = emp.address || '';
        document.getElementById('empPassportSeries').value = emp.passport_series || '';
        document.getElementById('empPassportNumber').value = emp.passport_number || '';
        document.getElementById('empBirthDate').value = emp.birth_date || '';
        document.getElementById('empHireDate').value = emp.hire_date || '';
        document.getElementById('empTerminationDate').value = emp.termination_date || '';
        document.getElementById('empWorkHours').value = emp.work_hours || 40;
        document.getElementById('empLogin').value = emp.login || '';
        document.getElementById('empPassword').value = '';
        document.getElementById('empPassword').required = false;
        document.getElementById('passwordHint').style.display = 'inline';
        document.getElementById('passwordRequiredHint').style.display = 'none';

        document.getElementById('employeeModal').classList.add('show');
    } catch (error) {
        showToast(error.message, true);
    }
}

function closeModal() {
    document.getElementById('employeeModal').classList.remove('show');
    editingEmployeeId = null;
    clearFormErrors();
}

function buildFullName(lastName, firstName, middleName) {
    let fullName = lastName + ' ' + firstName;
    if (middleName) fullName += ' ' + middleName;
    return fullName;
}

async function saveEmployee(formData, isEditing) {
    const fullName = buildFullName(formData.lastName, formData.firstName, formData.middleName);

    let url = `${API_BASE}/employee`;
    let method = 'POST';

    if (isEditing) {
        // Для обновления используем UpdateDto с employee_id
        const updateData = {
            employee_id: editingEmployeeId,
            full_name: fullName,
            position_name: formData.position,
            phone: formData.phone || null,
            email: formData.email || null,
            address: formData.address || null,
            passport_series: formData.passportSeries || null,
            passport_number: formData.passportNumber || null,
            birth_date: formData.birthDate || null,
            hire_date: formData.hireDate,
            termination_date: formData.terminationDate || null,
            work_hours: parseInt(formData.workHours) || 0,
            login: formData.login
        };

        // Добавляем пароль только если он указан
        if (formData.password && formData.password.trim() !== '') {
            updateData.password = formData.password;
        }

        url = `${API_BASE}/employee/${editingEmployeeId}`;
        method = 'PUT';

        try {
            const response = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updateData)
            });

            if (!response.ok) {
                throw new Error(await extractError(response));
            }

            showToast('Сотрудник обновлён');
            closeModal();
            await loadEmployees();
        } catch (error) {
            showToast(error.message, true);
        }
    } else {
        // Для создания используем CreateDto
        const createData = {
            full_name: fullName,
            position_name: formData.position,
            phone: formData.phone || null,
            email: formData.email || null,
            address: formData.address || null,
            passport_series: formData.passportSeries || null,
            passport_number: formData.passportNumber || null,
            birth_date: formData.birthDate || null,
            hire_date: formData.hireDate,
            termination_date: formData.terminationDate || null,
            work_hours: parseInt(formData.workHours) || 0,
            login: formData.login,
            password: formData.password
        };

        try {
            const response = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(createData)
            });

            if (!response.ok) {
                throw new Error(await extractError(response));
            }

            showToast('Сотрудник добавлен');
            closeModal();
            await loadEmployees();
        } catch (error) {
            showToast(error.message, true);
        }
    }
}

async function fireEmployee(id) {
    if (!confirm('Уволить сотрудника?')) return;

    try {
        const getResponse = await fetch(`${API_BASE}/employee/${id}`);
        if (!getResponse.ok) throw new Error('Сотрудник не найден');
        const emp = await getResponse.json();

        emp.termination_date = new Date().toISOString().split('T')[0];

        const response = await fetch(`${API_BASE}/employee/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(emp)
        });

        if (!response.ok) throw new Error('Не удалось уволить сотрудника. Попробуйте ещё раз.');

        showToast('Сотрудник уволен');
        await loadEmployees();
    } catch (error) {
        showToast(error.message, true);
    }
}
async function loadStats() {
    try {
        console.log('🔄 Загрузка статистики...');
        const response = await fetch(`${API_BASE}/Stats`);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const stats = await response.json();
        console.log('✅ Статистика получена:', stats);

        // Обновляем элементы
        const elements = {
            statCatsInShelter: stats.catsInShelter,
            statFreeCages: stats.freeCages,
            statFoodConsumption: Math.round(stats.foodConsumption ?? 0),
            statMonthlyIncome: `${Math.round(stats.monthlyIncome ?? 0).toLocaleString()} ₽`,
            statWeeklyProcedures: stats.weeklyProcedures,
            statActiveVolunteers: stats.activeVolunteers,
            statTotalVolunteers: stats.totalVolunteers
        };

        for (const [id, value] of Object.entries(elements)) {
            const el = document.getElementById(id);
            if (el) el.textContent = value;
        }

    } catch (error) {
        console.error('❌ Ошибка загрузки статистики:', error);
    }
}

// ===== ФИНАНСЫ =====
let donations = [], salaries = [], benefactors = [], donProductsList = [], supplyExpenses = [];
const MONTHS_RU = ['Январь','Февраль','Март','Апрель','Май','Июнь',
                   'Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];

function fmtMoney(v) {
    if (!v && v !== 0) return '—';
    return Number(v).toLocaleString('ru-RU', { minimumFractionDigits: 0, maximumFractionDigits: 2 }) + ' ₽';
}

function donationTypeBadge(type) {
    const map = {
        'денежное':    { cls: 'badge-green',  icon: '💵' },
        'натуральное': { cls: 'badge-orange', icon: '📦' },
    };
    const m = map[type?.toLowerCase()] || { cls: 'badge-grey', icon: '📝' };
    return `<span class="fin-badge ${m.cls}">${m.icon} ${type || '—'}</span>`;
}

function buildMonthYearSelects(monthId, yearId, defaultMonth, defaultYear) {
    const mSel = document.getElementById(monthId);
    const ySel = document.getElementById(yearId);
    if (!mSel || !ySel) return;
    mSel.innerHTML = MONTHS_RU.map((n, i) =>
        `<option value="${i+1}" ${i+1===defaultMonth?'selected':''}>${n}</option>`).join('');
    const curY = new Date().getFullYear();
    ySel.innerHTML = '';
    for (let y = curY + 1; y >= curY - 5; y--)
        ySel.innerHTML += `<option value="${y}" ${y===defaultYear?'selected':''}>${y}</option>`;
}

async function loadFinance() {
    try {
        const [summary, dons, sals, bens, supExp] = await Promise.all([
            api('/Finance/summary'),
            api('/Finance/donations'),
            api('/Finance/salaries'),
            api('/Finance/benefactors'),
            api('/Finance/supply-expenses'),
        ]);
        donations      = dons;
        salaries       = sals;
        benefactors    = bens;
        supplyExpenses = supExp;
        renderFinanceSummary(summary);
        renderDonations();
        renderSalaries();
        renderBenefactors();
        renderSupplyExpenses();
        populateBenefactorSelect();
    } catch (e) {
        showToast('Не удалось загрузить финансовые данные. Обновите страницу.', true);
    }
}

async function loadDonProducts() {
    try {
        donProductsList = await api('/Finance/products');
    } catch (_) {
        donProductsList = [];
    }
}

function renderFinanceSummary(s) {
    document.getElementById('finIncome').textContent   = fmtMoney(s.total_income);
    document.getElementById('finSalaries').textContent = fmtMoney(s.total_salaries);
    document.getElementById('finSupply').textContent   = fmtMoney(s.total_supply_expenses);
    const balEl = document.getElementById('finBalance');
    balEl.textContent = fmtMoney(s.balance);
    balEl.style.color = s.balance >= 0 ? 'var(--green)' : 'var(--red)';
    document.getElementById('finBenefactors').textContent = s.benefactors_count;
}

function renderSupplyExpenses() {
    const tbody = document.getElementById('supplyExpBody');
    if (!tbody) return;
    if (!supplyExpenses.length) {
        tbody.innerHTML = '<tr><td colspan="3" class="loading-text">Нет записей о закупках</td></tr>';
        return;
    }
    const total = supplyExpenses.reduce((s, r) => s + (r.amount || 0), 0);
    tbody.innerHTML = supplyExpenses.map(r => `
        <tr>
            <td>${fmtDateOnly(r.date)}</td>
            <td>${r.purpose || '—'}</td>
            <td style="font-weight:700;color:var(--orange)">${fmtMoney(r.amount)}</td>
        </tr>`).join('') + `
        <tr style="border-top:1px solid var(--border2);font-weight:700">
            <td colspan="2" style="color:var(--text2);font-size:12px;text-transform:uppercase;letter-spacing:.4px">Итого</td>
            <td style="color:var(--orange)">${fmtMoney(total)}</td>
        </tr>`;
}

function renderDonations() {
    const q = document.getElementById('donationSearch')?.value.toLowerCase() || '';
    const tbody = document.getElementById('donationsBody');
    const filtered = donations.filter(d =>
        (d.benefactor_name?.toLowerCase() || '').includes(q) ||
        (d.donation_type?.toLowerCase()   || '').includes(q)
    );
    if (!filtered.length) {
        tbody.innerHTML = '<tr><td colspan="5" class="loading-text">Нет записей</td></tr>';
        return;
    }
    tbody.innerHTML = filtered.map(d => {
        let valueCell;
        if (d.donation_type === 'денежное') {
            valueCell = `<span style="font-weight:700;color:var(--green)">${d.amount != null ? fmtMoney(d.amount) : '—'}</span>`;
        } else if (d.products && d.products.length) {
            const tags = d.products.map(p =>
                `<span class="don-prod-tag">📦 ${p.product_name} ${p.quantity} ${p.unit || ''}</span>`
            ).join('');
            valueCell = `<div class="don-prod-tags">${tags}</div>`;
        } else {
            valueCell = '<span style="color:var(--text3)">—</span>';
        }
        return `
        <tr>
            <td>${fmtDateOnly(d.donation_date)}</td>
            <td>
                <div style="font-weight:600">${d.benefactor_name || '—'}</div>
                ${d.benefactor_phone ? `<div style="font-size:11px;color:var(--text3)">${d.benefactor_phone}</div>` : ''}
            </td>
            <td>${donationTypeBadge(d.donation_type)}</td>
            <td>${valueCell}</td>
            <td>${d.can_delete
                ? `<button class="btn-delete" onclick="deleteDonation(${d.source_id})" title="Удалить">🗑</button>`
                : `<span class="fin-badge badge-grey" title="${d.donation_type === 'денежное'
                    ? 'Нельзя удалить — деньги уже учтены в расходах'
                    : 'Нельзя удалить — товары уже израсходованы'}" style="cursor:default">🔒</span>`
            }</td>
        </tr>`;
    }).join('');
}

function renderSalaries() {
    const mSel = document.getElementById('salMonthSel');
    const ySel = document.getElementById('salYearSel');
    const month = mSel ? parseInt(mSel.value) : 0;
    const year  = ySel ? parseInt(ySel.value) : 0;
    const tbody = document.getElementById('salariesBody');

    let filtered = salaries;
    if (month && year) {
        filtered = salaries.filter(s => {
            const d = s.payment_date;
            if (!d) return false;
            const parts = typeof d === 'string' ? d.split('-') : [];
            return parts.length >= 2 && parseInt(parts[0]) === year && parseInt(parts[1]) === month;
        });
    }

    if (!filtered.length) {
        tbody.innerHTML = '<tr><td colspan="4" class="loading-text">Нет выплат за этот период</td></tr>';
        return;
    }
    tbody.innerHTML = filtered.map(s => `
        <tr>
            <td>${fmtDateOnly(s.payment_date)}</td>
            <td style="font-weight:600">${s.employee_name || '—'}</td>
            <td style="color:var(--text2);font-size:12px">${s.position_name || ''}</td>
            <td style="font-weight:700;color:var(--red)">${fmtMoney(s.amount)}</td>
        </tr>`).join('');
}

function renderBenefactors() {
    const tbody = document.getElementById('benefactorsBody');
    if (!benefactors.length) {
        tbody.innerHTML = '<tr><td colspan="5" class="loading-text">Нет жертвователей</td></tr>';
        return;
    }
    tbody.innerHTML = benefactors.map(b => `
        <tr>
            <td style="font-weight:600">${b.full_name}</td>
            <td>${b.phone || '—'}</td>
            <td>${b.email || '—'}</td>
            <td style="text-align:center">${b.donations_count}</td>
            <td style="font-weight:700;color:var(--green)">${fmtMoney(b.total_donated)}</td>
        </tr>`).join('');
}

function populateBenefactorSelect() {
    const sel = document.getElementById('donBenefactorSel');
    if (!sel) return;
    sel.innerHTML = '<option value="">— Новый жертвователь —</option>' +
        benefactors.map(b => `<option value="${b.benefactor_id}">${b.full_name}</option>`).join('');
}

function initFinanceTabs() {
    const now = new Date();
    buildMonthYearSelects('salMonthSel', 'salYearSel', now.getMonth()+1, now.getFullYear());

    document.querySelectorAll('.fin-tab-btn[data-fin]').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.fin-tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.fin-tab-content').forEach(t => t.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById(btn.dataset.fin).classList.add('active');
            const tab = btn.dataset.fin;
            document.getElementById('addDonationBtn').style.display = tab === 'fin-donations' ? '' : 'none';
            document.getElementById('paySalBtn').style.display      = tab === 'fin-salaries'  ? '' : 'none';
        });
    });

    document.getElementById('salFilterBtn')?.addEventListener('click', renderSalaries);
}

// ─── DONATION MODAL ─────────────────────────────────────────────────────────
const DON_FIELDS = ['donName','donPhone','donEmail','donDate','donAmount'];
let donProductRows = [];

function donFieldErr(id, msg) {
    const input = document.getElementById(id);
    const errEl = document.getElementById('err' + id.charAt(0).toUpperCase() + id.slice(1));
    if (msg) {
        input?.classList.add('error');
        if (errEl) errEl.textContent = msg;
    } else {
        input?.classList.remove('error');
        if (errEl) errEl.textContent = '';
    }
}

function clearDonErrors() {
    DON_FIELDS.forEach(id => donFieldErr(id, ''));
    const errP = document.getElementById('errDonProducts');
    if (errP) errP.textContent = '';
    document.querySelectorAll('.don-prod-sel,.don-prod-qty').forEach(el => el.classList.remove('error'));
}

function toggleDonType() {
    const type = document.getElementById('donType').value;
    const money = document.getElementById('donMoneySection');
    const prods = document.getElementById('donProductsSection');
    if (type === 'натуральное') {
        if (money) money.style.display = 'none';
        if (prods) prods.style.display = '';
    } else {
        if (money) money.style.display = '';
        if (prods) prods.style.display = 'none';
    }
}

function renderDonProductRows() {
    const container = document.getElementById('donProductRows');
    if (!container) return;
    if (!donProductRows.length) {
        container.innerHTML = '<div class="don-prod-empty">Нажмите «+ Добавить товар» чтобы добавить товар</div>';
        return;
    }
    const options = donProductsList.map(p =>
        `<option value="${p.product_id}">${p.name}${p.unit_of_measure ? ' (' + p.unit_of_measure + ')' : ''}</option>`
    ).join('');
    container.innerHTML = donProductRows.map(row => `
        <div class="don-prod-row" data-row-id="${row.id}">
            <select class="don-prod-sel" data-row="${row.id}">
                <option value="">— Выберите товар —</option>
                ${options}
            </select>
            <input type="number" class="don-prod-qty" data-row="${row.id}"
                   placeholder="Кол-во" min="0.001" step="0.001">
            <button type="button" class="don-prod-del" onclick="removeDonProductRow(${row.id})">✕</button>
        </div>`).join('');
}

function addDonProductRow() {
    donProductRows.push({ id: Date.now() });
    renderDonProductRows();
}

function removeDonProductRow(rowId) {
    donProductRows = donProductRows.filter(r => r.id !== rowId);
    renderDonProductRows();
}

function collectDonProductRows() {
    return Array.from(document.querySelectorAll('#donProductRows .don-prod-row')).map(row => ({
        rowEl: row,
        selEl: row.querySelector('.don-prod-sel'),
        qtyEl: row.querySelector('.don-prod-qty'),
        product_id: parseInt(row.querySelector('.don-prod-sel')?.value) || 0,
        quantity:   parseFloat(row.querySelector('.don-prod-qty')?.value) || 0
    }));
}

function openDonationModal() {
    document.getElementById('donDate').value   = new Date().toISOString().split('T')[0];
    document.getElementById('donName').value   = '';
    document.getElementById('donPhone').value  = '';
    document.getElementById('donEmail').value  = '';
    document.getElementById('donAmount').value = '';
    document.getElementById('donType').value   = 'денежное';
    document.getElementById('donBenefactorSel').value = '';
    document.getElementById('donNewBenefactorBlock').style.display = '';
    donProductRows = [];
    renderDonProductRows();
    toggleDonType();
    clearDonErrors();
    document.getElementById('donationModal').classList.add('show');
}
function closeDonationModal() { document.getElementById('donationModal').classList.remove('show'); }

async function saveDonation(e) {
    e.preventDefault();
    clearDonErrors();

    const type  = document.getElementById('donType').value;
    const selId = document.getElementById('donBenefactorSel').value;
    const name  = document.getElementById('donName').value.trim();
    const phone = document.getElementById('donPhone').value.trim();
    const email = document.getElementById('donEmail').value.trim();
    const date  = document.getElementById('donDate').value;
    let valid   = true;

    if (!selId) {
        if (!name) { donFieldErr('donName', 'Укажите ФИО жертвователя'); valid = false; }
        if (phone && !/^[87]\d{10}$/.test(phone.replace(/[\s\-\(\)\+]/g, ''))) {
            donFieldErr('donPhone', 'Формат: 89991234567 или +79991234567 (11 цифр)'); valid = false;
        }
        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
            donFieldErr('donEmail', 'Неверный формат — например: ivan@mail.ru'); valid = false;
        }
    }
    if (!date) { donFieldErr('donDate', 'Укажите дату пожертвования'); valid = false; }

    let amount = null;
    let products = null;

    if (type === 'денежное') {
        const amountRaw = document.getElementById('donAmount').value;
        amount = parseFloat(amountRaw);
        if (!amountRaw || isNaN(amount) || amount <= 0) {
            donFieldErr('donAmount', 'Укажите сумму больше нуля'); valid = false;
        }
    } else {
        const rows = collectDonProductRows();
        if (!rows.length) {
            document.getElementById('errDonProducts').textContent = 'Добавьте хотя бы один товар';
            valid = false;
        } else {
            let rowsOk = true;
            rows.forEach(r => {
                if (!r.product_id) { r.selEl?.classList.add('error'); rowsOk = false; }
                if (!r.quantity || r.quantity <= 0) { r.qtyEl?.classList.add('error'); rowsOk = false; }
            });
            if (!rowsOk) {
                document.getElementById('errDonProducts').textContent =
                    'Выберите товар и укажите количество больше нуля для каждой строки';
                valid = false;
            } else {
                products = rows.map(r => ({ product_id: r.product_id, quantity: r.quantity }));
            }
        }
    }

    if (!valid) return;

    const payload = {
        benefactor_id:   selId ? parseInt(selId) : null,
        benefactor_name: selId ? null : name,
        phone:           selId ? null : (phone || null),
        email:           selId ? null : (email || null),
        donation_date:   date,
        donation_type:   type,
        amount:          type === 'денежное' ? amount : null,
        products:        type === 'натуральное' ? products : null
    };

    const btn = document.querySelector('#donationForm .btn-save');
    try {
        btn.textContent = '⏳...'; btn.disabled = true;
        const created = await api('/Finance/donations', 'POST', payload);
        donations.unshift(created);
        if (!selId) {
            benefactors.push({
                benefactor_id: created.benefactor_id, full_name: created.benefactor_name,
                phone: created.benefactor_phone, email: null,
                donations_count: 1, total_donated: created.amount || 0
            });
            benefactors.sort((a,b) => b.total_donated - a.total_donated);
            populateBenefactorSelect();
        }
        renderDonations(); renderBenefactors(); loadFinance();
        closeDonationModal();
        showToast('Пожертвование добавлено ✓');
    } catch (err) { showToast(err.message, true); }
    finally { btn.textContent = 'Сохранить'; btn.disabled = false; }
}

async function deleteDonation(sourceId) {
    if (!confirm('Удалить запись о пожертвовании?')) return;
    try {
        await api(`/Finance/donations/${sourceId}`, 'DELETE');
        donations = donations.filter(d => d.source_id !== sourceId);
        renderDonations(); loadFinance();
        showToast('Запись удалена');
    } catch (err) { showToast(err.message, true); }
}

// ─── SALARY MODAL ────────────────────────────────────────────────────────────
let salaryPreviewData = null;

function openSalaryModal() {
    const now = new Date();
    buildMonthYearSelects('salPayMonth', 'salPayYear', now.getMonth()+1, now.getFullYear());
    document.getElementById('salPreviewArea').innerHTML = '';
    document.getElementById('salConfirmBtn').style.display = 'none';
    salaryPreviewData = null;
    document.getElementById('salaryModal').classList.add('show');
}
function closeSalaryModal() { document.getElementById('salaryModal').classList.remove('show'); }

async function loadSalaryPreview() {
    const year  = parseInt(document.getElementById('salPayYear').value);
    const month = parseInt(document.getElementById('salPayMonth').value);
    const area  = document.getElementById('salPreviewArea');
    const btn   = document.getElementById('salPreviewBtn');
    btn.textContent = '⏳...'; btn.disabled = true;
    try {
        salaryPreviewData = await api(`/Finance/salary-preview?year=${year}&month=${month}`);
        const d = salaryPreviewData;
        const monthName = MONTHS_RU[month - 1];
        const unpaid = d.employees.filter(e => !e.already_paid);
        const allPaid = unpaid.length === 0;

        area.innerHTML = `
            <div class="sal-preview-title">${monthName} ${year}</div>
            <table class="employees-table" style="margin-bottom:14px">
                <thead><tr>
                    <th>Сотрудник</th><th>Должность</th><th>Оклад</th><th>Часы</th><th>К выплате</th><th>Статус</th>
                </tr></thead>
                <tbody>
                ${d.employees.map(e => `
                    <tr class="${e.already_paid ? 'fired-row' : ''}">
                        <td style="font-weight:600">${e.full_name}</td>
                        <td style="color:var(--text2);font-size:12px">${e.position_name}</td>
                        <td>${fmtMoney(e.salary_rate)}</td>
                        <td style="text-align:center">${e.work_hours} ч</td>
                        <td style="font-weight:700">${fmtMoney(e.calculated)}</td>
                        <td>${e.already_paid
                            ? '<span class="fin-badge badge-green">✓ Оплачено</span>'
                            : '<span class="fin-badge badge-orange">Ожидает</span>'}</td>
                    </tr>`).join('')}
                </tbody>
            </table>
            ${allPaid
                ? '<div class="sal-all-paid">✅ Все сотрудники уже получили зарплату за этот период</div>'
                : `<div class="sal-total-row">Итого к начислению: <strong>${fmtMoney(d.total_to_pay)}</strong>
                   (${unpaid.length} чел.)</div>`}`;

        document.getElementById('salConfirmBtn').style.display = allPaid ? 'none' : '';
    } catch (e) {
        area.innerHTML = `<div style="color:var(--red);padding:12px">${e.message}</div>`;
    } finally {
        btn.textContent = 'Рассчитать'; btn.disabled = false;
    }
}

async function confirmPaySalaries() {
    if (!salaryPreviewData) return;
    const year  = parseInt(document.getElementById('salPayYear').value);
    const month = parseInt(document.getElementById('salPayMonth').value);
    const btn   = document.getElementById('salConfirmBtn');
    btn.textContent = '⏳ Начисляю...'; btn.disabled = true;
    try {
        const res = await api('/Finance/pay-salaries', 'POST', { year, month });
        showToast(res.message + ' ✓');
        closeSalaryModal();
        await loadFinance();
    } catch (e) { showToast(e.message, true); }
    finally { btn.textContent = '✅ Начислить'; btn.disabled = false; }
}

async function handleFormSubmit(event) {
    event.preventDefault();
    const isEditing = editingEmployeeId !== null;

    const formData = {
        lastName: capitalizeName(document.getElementById('empLastName').value),
        firstName: capitalizeName(document.getElementById('empFirstName').value),
        middleName: capitalizeName(document.getElementById('empMiddleName').value),
        position: document.getElementById('empPosition').value,
        phone: normalizePhone(document.getElementById('empPhone').value),
        email: document.getElementById('empEmail').value.trim().toLowerCase(),
        address: capitalizeFirst(document.getElementById('empAddress').value),
        passportSeries: digitsOnly(document.getElementById('empPassportSeries').value),
        passportNumber: digitsOnly(document.getElementById('empPassportNumber').value),
        birthDate: document.getElementById('empBirthDate').value,
        hireDate: document.getElementById('empHireDate').value,
        terminationDate: document.getElementById('empTerminationDate').value || null,
        workHours: document.getElementById('empWorkHours').value,
        login: document.getElementById('empLogin').value.trim().toLowerCase(),
        password: document.getElementById('empPassword').value
    };

    const valid = validateForm(formData, isEditing);
    if (!valid) {
        const firstErr = document.querySelector('.error-text:not(:empty)');
        if (firstErr) showToast(firstErr.textContent, true);
        return;
    }
    await saveEmployee(formData, isEditing);
}

// Инициализация
document.addEventListener('DOMContentLoaded', async () => {
    currentUser = checkAuth();
    if (!currentUser) return;

    if (currentUser.type !== 'admin') {
        window.location.href = '/employee.html';
        return;
    }

    document.getElementById('adminUserName').textContent = currentUser.name || 'Администратор';
    initProfile();

    // Загружаем список должностей
    await loadPositions();

    document.getElementById('addEmployeeBtn')?.addEventListener('click', openAddModal);
    document.querySelectorAll('.modal-close, .btn-cancel').forEach(btn => btn.addEventListener('click', closeModal));
    document.getElementById('employeeForm')?.addEventListener('submit', handleFormSubmit);
    document.getElementById('employeeSearch')?.addEventListener('input', () => renderTable());
    document.getElementById('logoutBtn')?.addEventListener('click', logout);

    document.getElementById('switchToEmployeeBtn')?.addEventListener('click', () => {
        window.location.href = '/employee.html';
    });

    await loadEmployees();
    seedEmployeeAvatars(employees);
    renderTable();
    await loadStats();

    // Финансы
    initFinanceTabs();
    document.getElementById('addDonationBtn')?.addEventListener('click', openDonationModal);
    document.getElementById('donationModalClose')?.addEventListener('click', closeDonationModal);
    document.getElementById('donationModalCancel')?.addEventListener('click', closeDonationModal);
    document.getElementById('donationModal')?.addEventListener('click', e => { if (e.target === document.getElementById('donationModal')) closeDonationModal(); });
    document.getElementById('donationForm')?.addEventListener('submit', saveDonation);
    document.getElementById('donationSearch')?.addEventListener('input', renderDonations);
    document.getElementById('donBenefactorSel')?.addEventListener('change', function() {
        document.getElementById('donNewBenefactorBlock').style.display = this.value ? 'none' : '';
        clearDonErrors();
    });
    document.getElementById('donType')?.addEventListener('change', toggleDonType);
    document.getElementById('addProductRowBtn')?.addEventListener('click', addDonProductRow);
    DON_FIELDS.forEach(id => {
        document.getElementById(id)?.addEventListener('input', () => donFieldErr(id, ''));
    });

    document.getElementById('paySalBtn')?.addEventListener('click', openSalaryModal);
    document.getElementById('salaryModalClose')?.addEventListener('click', closeSalaryModal);
    document.getElementById('salaryModalCancel')?.addEventListener('click', closeSalaryModal);
    document.getElementById('salaryModal')?.addEventListener('click', e => { if (e.target === document.getElementById('salaryModal')) closeSalaryModal(); });
    document.getElementById('salPreviewBtn')?.addEventListener('click', loadSalaryPreview);
    document.getElementById('salConfirmBtn')?.addEventListener('click', confirmPaySalaries);

    await loadDonProducts();
    await loadFinance();
});