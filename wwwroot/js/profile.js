// ===== ПРОФИЛЬ И АВАТАРЫ (общий модуль) =====

const AVATARS = [
    { id: 'av1',  label: 'Брюнетка' },
    { id: 'av2',  label: 'Мужчина' },
    { id: 'av3',  label: 'Блондинка' },
    { id: 'av4',  label: 'В очках' },
    { id: 'av5',  label: 'Бабушка' },
    { id: 'av6',  label: 'Дедушка' },
    { id: 'av7',  label: 'Спортсменка' },
    { id: 'av8',  label: 'Деловой' },
    { id: 'av9',  label: 'Шатенка' },
    { id: 'av10', label: 'Хипстер' },
    { id: 'av11', label: 'С пучком' },
    { id: 'av12', label: 'В кепке' },
];

let profileEmployeeData = null;
let profileEditMode = false;

// Ключ в localStorage для аватара текущего пользователя
function getAvatarKey(userId) {
    return `emp_avatar_${userId ?? (typeof currentUser !== 'undefined' ? currentUser?.id : '')}`;
}

// Получить аватар из localStorage для любого сотрудника
function getEmployeeAvatar(employeeId) {
    return localStorage.getItem(`emp_avatar_${employeeId}`) || null;
}

function getSavedAvatar() {
    return getEmployeeAvatar(typeof currentUser !== 'undefined' ? currentUser?.id : null);
}

// Найти кружок аватара в шапке (работает на обеих страницах)
function getHeaderAvatarEl() {
    return document.getElementById('empAvatar') || document.getElementById('adminAvatar');
}

function applyAvatarToHeader(avatarId) {
    const el = getHeaderAvatarEl();
    if (!el) return;
    if (avatarId) {
        el.innerHTML = `<img src="/img/avatars/${avatarId}.svg" style="width:100%;height:100%;object-fit:cover;border-radius:50%" alt="avatar">`;
        el.style.background = 'transparent';
        el.style.boxShadow = '0 0 18px rgba(191,90,242,0.5)';
    } else {
        const user = typeof currentUser !== 'undefined' ? currentUser : null;
        el.innerHTML = (user?.name?.[0] || 'А').toUpperCase();
        el.style.background = '';
        el.style.boxShadow = '';
    }
}

// Получить HTML маленького аватара для таблицы сотрудников
function employeeAvatarHtml(employeeId, name) {
    const av = getEmployeeAvatar(employeeId);
    const initial = (name?.[0] || '?').toUpperCase();
    if (av) {
        return `<div class="emp-table-avatar"><img src="/img/avatars/${av}.svg" alt="avatar"></div>`;
    }
    return `<div class="emp-table-avatar emp-table-avatar-initial">${initial}</div>`;
}

function renderProfileView(emp) {
    document.getElementById('profileName').textContent = emp.full_name || '—';
    document.getElementById('profilePosition').textContent = emp.position_name || '—';
    document.getElementById('profilePhone').textContent = emp.phone || '—';
    document.getElementById('profileEmail').textContent = emp.email || '—';
    document.getElementById('profileBirth').textContent = fmtDateOnly(emp.birth_date);
    document.getElementById('profileHire').textContent = fmtDateOnly(emp.hire_date);
    document.getElementById('profileAddress').textContent = emp.address || '—';
    const ps = emp.passport_series, pn = emp.passport_number;
    document.getElementById('profilePassport').textContent = (ps && pn) ? `${ps} ${pn}` : '—';
    document.getElementById('profileLogin').textContent = emp.login || '—';
    document.getElementById('profileHours').textContent = emp.work_hours ? emp.work_hours + ' ч/нед' : '—';
}

function refreshAvatarPreview() {
    const saved = getSavedAvatar();
    const preview = document.getElementById('profileAvatarPreview');
    if (!preview) return;
    if (saved) {
        preview.innerHTML = `<img src="/img/avatars/${saved}.svg" style="width:100%;height:100%;object-fit:cover" alt="avatar">`;
        preview.style.background = 'transparent';
    } else {
        const user = typeof currentUser !== 'undefined' ? currentUser : null;
        preview.innerHTML = (user?.name?.[0] || 'А').toUpperCase();
        preview.style.background = '';
    }
}

async function openProfile() {
    profileEditMode = false;
    const view = document.getElementById('profileViewPanel');
    const edit = document.getElementById('profileEditPanel');
    if (view) view.style.display = '';
    if (edit) edit.style.display = 'none';
    const toggleBtn = document.getElementById('profileEditToggleBtn');
    if (toggleBtn) toggleBtn.textContent = '✏️ Редактировать';
    const titleEl = document.getElementById('profileModalTitle');
    if (titleEl) titleEl.textContent = '👤 Мой профиль';

    // Открываем модал
    const modal = document.getElementById('profileModal');
    if (modal) modal.classList.add('show');

    // Аватар-превью и имя
    refreshAvatarPreview();
    const user = typeof currentUser !== 'undefined' ? currentUser : null;
    const nameEl = document.getElementById('profileName');
    if (nameEl) nameEl.textContent = user?.name || '—';

    // Сетка аватаров
    const saved = getSavedAvatar();
    const grid = document.getElementById('avatarGrid');
    if (grid) {
        grid.innerHTML = AVATARS.map(av => `
            <div class="avatar-option ${saved === av.id ? 'selected' : ''}"
                 onclick="selectAvatar('${av.id}')" title="${av.label}">
                <img src="/img/avatars/${av.id}.svg" alt="${av.label}">
            </div>`).join('');
    }

    // Данные с сервера
    try {
        profileEmployeeData = await api(`/Employee/${user.id}`);
        renderProfileView(profileEmployeeData);
    } catch (e) {
        if (document.getElementById('profilePosition'))
            document.getElementById('profilePosition').textContent = '—';
    }
}

function closeProfileModal() {
    const modal = document.getElementById('profileModal');
    if (modal) modal.classList.remove('show');
    profileEditMode = false;
}

function toggleProfileEdit() {
    profileEditMode = !profileEditMode;
    document.getElementById('profileViewPanel').style.display = profileEditMode ? 'none' : '';
    document.getElementById('profileEditPanel').style.display = profileEditMode ? '' : 'none';
    document.getElementById('profileEditToggleBtn').textContent = profileEditMode ? '← Назад' : '✏️ Редактировать';
    document.getElementById('profileModalTitle').textContent = profileEditMode ? '✏️ Редактирование профиля' : '👤 Мой профиль';

    if (profileEditMode && profileEmployeeData) {
        const emp = profileEmployeeData;
        document.getElementById('peditName').value = emp.full_name || '';
        document.getElementById('peditPhone').value = emp.phone || '';
        document.getElementById('peditEmail').value = emp.email || '';
        document.getElementById('peditAddress').value = emp.address || '';
        document.getElementById('peditPassSeries').value = emp.passport_series || '';
        document.getElementById('peditPassNumber').value = emp.passport_number || '';
        document.getElementById('peditLogin').value = emp.login || '';
        document.getElementById('peditPassword').value = '';
        document.getElementById('peditPasswordConfirm').value = '';
        ['peditName','peditPhone','peditEmail','peditAddress','peditPassSeries',
         'peditPassNumber','peditLogin','peditPassword','peditPasswordConfirm']
            .forEach(id => { const el = document.getElementById(id); if (el) el.classList.remove('input-ok','input-err'); });
        ['errPeditName','errPeditPhone','errPeditEmail','errPeditAddress',
         'errPeditPassSeries','errPeditPassNumber','errPeditLogin','errPeditPassword','errPeditPasswordConfirm']
            .forEach(id => { const el = document.getElementById(id); if (el) el.textContent = ''; });
        setupProfileLiveValidation();
    }
}

function peditSetState(inputId, errorId, isOk, msg) {
    const inp = document.getElementById(inputId);
    const err = document.getElementById(errorId);
    if (!inp) return;
    inp.classList.toggle('input-ok', isOk && !msg);
    inp.classList.toggle('input-err', !!msg);
    if (err) err.textContent = msg || '';
}

function setupProfileLiveValidation() {
    const rules = [
        { id: 'peditName',            err: 'errPeditName',            fn: validatePeditName },
        { id: 'peditPhone',           err: 'errPeditPhone',           fn: validatePeditPhone },
        { id: 'peditEmail',           err: 'errPeditEmail',           fn: validatePeditEmail },
        { id: 'peditAddress',         err: 'errPeditAddress',         fn: () => '' },
        { id: 'peditPassSeries',      err: 'errPeditPassSeries',      fn: validatePeditPassSeries },
        { id: 'peditPassNumber',      err: 'errPeditPassNumber',      fn: validatePeditPassNumber },
        { id: 'peditLogin',           err: 'errPeditLogin',           fn: validatePeditLogin },
        { id: 'peditPassword',        err: 'errPeditPassword',        fn: validatePeditPassword },
        { id: 'peditPasswordConfirm', err: 'errPeditPasswordConfirm', fn: validatePeditConfirm },
    ];
    rules.forEach(({ id, err, fn }) => {
        const el = document.getElementById(id);
        if (!el) return;
        const newEl = el.cloneNode(true); // снять старые слушатели
        el.parentNode.replaceChild(newEl, el);
        newEl.addEventListener('input', () => {
            const msg = fn();
            peditSetState(id, err, newEl.value.trim().length > 0, msg);
        });
    });
}

function validatePeditName() {
    const v = document.getElementById('peditName').value.trim();
    if (!v) return 'ФИО обязательно';
    if (v.split(/\s+/).length < 2) return 'Введите минимум два слова';
    if (!/^[А-ЯЁA-Z]/.test(v)) return 'Каждое слово — с заглавной буквы';
    return '';
}
function validatePeditPhone() {
    const raw = document.getElementById('peditPhone').value.replace(/\D/g, '');
    if (!raw) return '';
    if (raw.length === 10) return '';
    if (raw.length === 11 && (raw[0] === '7' || raw[0] === '8')) return '';
    return 'Формат: 8XXXXXXXXXX (11 цифр)';
}
function validatePeditEmail() {
    const v = document.getElementById('peditEmail').value.trim();
    if (!v) return '';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) return 'Неверный формат email';
    return '';
}
function validatePeditPassSeries() {
    const v = document.getElementById('peditPassSeries').value.replace(/\D/g, '');
    const vn = document.getElementById('peditPassNumber').value.replace(/\D/g, '');
    if (!v && !vn) return '';
    if (v.length > 0 && v.length !== 4) return 'Серия — ровно 4 цифры';
    return '';
}
function validatePeditPassNumber() {
    const vs = document.getElementById('peditPassSeries').value.replace(/\D/g, '');
    const v = document.getElementById('peditPassNumber').value.replace(/\D/g, '');
    if (!vs && !v) return '';
    if (v.length > 0 && v.length !== 6) return 'Номер — ровно 6 цифр';
    return '';
}
function validatePeditLogin() {
    const v = document.getElementById('peditLogin').value.trim();
    if (!v) return 'Логин обязателен';
    if (v.length < 3) return 'Минимум 3 символа';
    if (/\s/.test(v)) return 'Пробелы недопустимы';
    if (!/^[\w.@-]+$/.test(v)) return 'Только буквы, цифры, _ . @ -';
    return '';
}
function validatePeditPassword() {
    const v = document.getElementById('peditPassword').value;
    if (!v) return '';
    if (v.length < 6) return 'Минимум 6 символов';
    return '';
}
function validatePeditConfirm() {
    const p = document.getElementById('peditPassword').value;
    const c = document.getElementById('peditPasswordConfirm').value;
    if (!p && !c) return '';
    if (p !== c) return 'Пароли не совпадают';
    return '';
}

function togglePassVis(inputId, btn) {
    const inp = document.getElementById(inputId);
    if (!inp) return;
    inp.type = inp.type === 'password' ? 'text' : 'password';
    btn.textContent = inp.type === 'password' ? '👁' : '🙈';
}

async function saveProfileEdit(e) {
    e.preventDefault();
    const checks = [
        { id: 'peditName',            err: 'errPeditName',            fn: validatePeditName },
        { id: 'peditPhone',           err: 'errPeditPhone',           fn: validatePeditPhone },
        { id: 'peditEmail',           err: 'errPeditEmail',           fn: validatePeditEmail },
        { id: 'peditPassSeries',      err: 'errPeditPassSeries',      fn: validatePeditPassSeries },
        { id: 'peditPassNumber',      err: 'errPeditPassNumber',      fn: validatePeditPassNumber },
        { id: 'peditLogin',           err: 'errPeditLogin',           fn: validatePeditLogin },
        { id: 'peditPassword',        err: 'errPeditPassword',        fn: validatePeditPassword },
        { id: 'peditPasswordConfirm', err: 'errPeditPasswordConfirm', fn: validatePeditConfirm },
    ];
    let valid = true;
    checks.forEach(({ id, err, fn }) => {
        const msg = fn();
        const el = document.getElementById(id);
        peditSetState(id, err, (el?.value?.trim()?.length ?? 0) > 0, msg);
        if (msg) valid = false;
    });

    const ps = document.getElementById('peditPassSeries').value.replace(/\D/g, '');
    const pn = document.getElementById('peditPassNumber').value.replace(/\D/g, '');
    if ((ps && !pn) || (!ps && pn)) {
        document.getElementById('errPeditPassSeries').textContent = 'Заполните оба поля или оба оставьте пустыми';
        document.getElementById('errPeditPassNumber').textContent = 'Заполните оба поля или оба оставьте пустыми';
        document.getElementById('peditPassSeries').classList.add('input-err');
        document.getElementById('peditPassNumber').classList.add('input-err');
        valid = false;
    }
    if (!valid) return;

    const emp = profileEmployeeData;
    const nameVal = capitalizeName(document.getElementById('peditName').value.trim());
    const rawPhone = document.getElementById('peditPhone').value.replace(/\D/g, '');
    let phone = null;
    if (rawPhone) {
        phone = rawPhone.length === 10 ? '8' + rawPhone :
                rawPhone.startsWith('7') ? '8' + rawPhone.slice(1) : rawPhone;
    }
    const newPass = document.getElementById('peditPassword').value;

    const payload = {
        employee_id: emp.employee_id,
        full_name: nameVal,
        position_name: emp.position_name,
        phone: phone,
        email: document.getElementById('peditEmail').value.trim().toLowerCase() || null,
        address: capitalizeFirst(document.getElementById('peditAddress').value.trim()) || null,
        passport_series: ps || null,
        passport_number: pn || null,
        birth_date: emp.birth_date,
        hire_date: emp.hire_date,
        termination_date: emp.termination_date,
        work_hours: emp.work_hours,
        login: document.getElementById('peditLogin').value.trim(),
        password: newPass || null,
    };

    const saveBtn = document.querySelector('.btn-save-profile');
    try {
        if (saveBtn) { saveBtn.textContent = '⏳ Сохранение...'; saveBtn.disabled = true; }
        await api(`/Employee/${emp.employee_id}`, 'PUT', payload);
        profileEmployeeData = { ...emp, ...payload };
        // Обновить имя в sharedUser (localStorage)
        if (typeof currentUser !== 'undefined') {
            currentUser.name = nameVal;
            localStorage.setItem('user', JSON.stringify(currentUser));
            const nameHeader = document.getElementById('empUserName') || document.getElementById('adminUserName');
            if (nameHeader) nameHeader.textContent = nameVal;
        }
        renderProfileView(profileEmployeeData);
        showToast('Профиль успешно обновлён ✓');
        toggleProfileEdit();
    } catch (err) {
        showToast(err.message, true);
    } finally {
        if (saveBtn) { saveBtn.textContent = '💾 Сохранить'; saveBtn.disabled = false; }
    }
}

function selectAvatar(avatarId) {
    const user = typeof currentUser !== 'undefined' ? currentUser : null;
    if (!user) return;
    localStorage.setItem(getAvatarKey(user.id), avatarId);
    document.querySelectorAll('.avatar-option').forEach(el => el.classList.remove('selected'));
    document.querySelector(`.avatar-option[onclick*="'${avatarId}'"]`)?.classList.add('selected');
    refreshAvatarPreview();
    applyAvatarToHeader(avatarId);
    showToast('Аватар обновлён ✓');
}

// Инициализация профиля: вешает клик на кружок и применяет сохранённый аватар
function initProfile() {
    applyAvatarToHeader(getSavedAvatar());
    const avatarEl = getHeaderAvatarEl();
    if (avatarEl) {
        avatarEl.style.cursor = 'pointer';
        avatarEl.title = 'Мой профиль';
        avatarEl.onclick = openProfile;
    }
    // Закрытие модала по крестику и фону
    const modal = document.getElementById('profileModal');
    if (modal) {
        modal.addEventListener('click', e => { if (e.target === modal) closeProfileModal(); });
        const closeBtn = modal.querySelector('.modal-close[data-modal="profileModal"]');
        if (closeBtn) closeBtn.addEventListener('click', closeProfileModal);
    }
}
