// ===== STATE =====
let cats = [], catStatuses = [], cages = [];
let medCards = [];
let procTypes = [], procRecords = [];
let volunteers = [], cares = [];
let products = [], batches = [], warehouses = [], remains = [], expenses = [];
let events = [], currentEventId = null, adoptionStats = [], expiringBatches = [];
let employees = [];
let taskWeekOffset = 0;
let catFoodPrefs = {};
let expandedDays = new Set();
let cageOverview = [];

let currentUser = null;
let editingCatId = null;
let editingStatusOnly = false;
const CAT_READONLY_FIELDS = ['catName','catBreed','catColor','catGender','catBirthDate','catSource','catCharacter','catMarks'];
let editingMedCardId = null;
let currentMedCardId = null;
let editingVolunteerId = null;
let editingProcTypeName = null;
let ptRates = []; // нормы расхода в модальном окне типа процедуры
let editingProductId = null;
let currentDetailCatId = null;
let movingCatId = null;
let procToMedCatId = null;

// ===== TABS =====
function initTabs() {
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
        });
    });
    document.querySelectorAll('.sub-tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const panel = btn.closest('.panel');
            panel.querySelectorAll('.sub-tab-btn').forEach(b => b.classList.remove('active'));
            panel.querySelectorAll('.sub-tab-content').forEach(t => t.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById(btn.dataset.sub).classList.add('active');
        });
    });
}

// ===== MODALS =====
function openModal(id) { document.getElementById(id).classList.add('show'); }
function closeModal(id) {
    document.getElementById(id).classList.remove('show');
    if (id === 'catModal') { editingStatusOnly = false; enableCatFormFields(); }
}

function initModals() {
    document.querySelectorAll('.modal-close, .btn-cancel').forEach(btn => {
        const mid = btn.dataset.modal;
        if (mid) btn.addEventListener('click', () => closeModal(mid));
    });
    document.querySelectorAll('.modal').forEach(m => {
        m.addEventListener('click', e => { if (e.target === m) closeModal(m.id); });
    });
}

// ===== HELPERS =====
function today() { return new Date().toISOString().split('T')[0]; }

function fmtDateOnly(d) {
    if (!d) return '—';
    const s = typeof d === 'string' ? d : String(d);
    if (s.includes('-')) {
        const [y, mo, day] = s.split('T')[0].split('-');
        return `${day}.${mo}.${y}`;
    }
    return s;
}

// Отображение кошки в дропдаунах: Кличка — Порода, кл. Номер
function catLabel(cat) {
    const name = cat.name || `#${cat.cat_id}`;
    const parts = [];
    if (cat.breed) parts.push(cat.breed);
    if (cat.cage_number) parts.push(`кл. ${cat.cage_number}`);
    if (cat.color) parts.push(cat.color);
    return parts.length ? `${name} — ${parts.join(', ')}` : name;
}

// Отображение кошки в таблицах: Кличка (Порода, Цвет)
function catInfoText(name, breed, color) {
    const extras = [breed, color].filter(Boolean).join(', ');
    return extras ? `${name || '—'} (${extras})` : (name || '—');
}

function boolBadge(v) {
    return v ? '<span class="badge badge-green">Да</span>' : '<span class="badge badge-grey">Нет</span>';
}

function statusBadge(name) {
    const n = (name || '').toLowerCase();
    if ((n.includes('приют') && !n.includes('передан')) || n.includes('содержи')) return `<span class="badge badge-blue">${name}</span>`;
    if (n.includes('усынов') || n.includes('отдан')) return `<span class="badge badge-green">${name}</span>`;
    if (n.includes('лечен') || n.includes('болен')) return `<span class="badge badge-red">${name}</span>`;
    return `<span class="badge badge-grey">${name || '—'}</span>`;
}

function isActiveStatus(name) {
    const n = (name || '').toLowerCase();
    return (n.includes('приют') && !n.includes('передан')) || n.includes('содержи') || n.includes('лечен') || n.includes('болен') || n.includes('карантин');
}

async function populateCageCatSelect(currentCageId = null) {
    if (!cageOverview.length) {
        try { cageOverview = await api('/Cage/overview'); } catch (_) {}
    }
    const sel = document.getElementById('catCage');
    if (!sel) return;
    sel.innerHTML = '<option value="">-- Выберите клетку --</option>';
    const source = cageOverview.length ? cageOverview : cages.map(c => ({
        cage_id: c.cage_id, number: c.number, capacity: c.capacity,
        cage_type: c.cage_type, current_count: null, available_spots: null
    }));
    source.forEach(cage => {
        const opt = document.createElement('option');
        opt.value = cage.cage_id;
        const isCurrent = cage.cage_id === currentCageId;
        let label = `Кл. ${cage.number}`;
        if (cage.cage_type) label += ` · ${cage.cage_type}`;
        if (cage.current_count !== null) {
            label += ` — ${cage.current_count}/${cage.capacity}`;
            if (isCurrent) label += ' (текущая)';
            else if (cage.available_spots <= 0) { label += ' (заполнена)'; opt.disabled = true; }
            else label += ` (свободно: ${cage.available_spots})`;
        }
        opt.textContent = label;
        sel.appendChild(opt);
    });
}

function populateSelect(id, items, valKey, lblKey) {
    const sel = document.getElementById(id);
    if (!sel) return;
    const first = sel.options[0]?.text || '-- Выберите --';
    sel.innerHTML = `<option value="">${first}</option>`;
    items.forEach(item => {
        const opt = document.createElement('option');
        opt.value = item[valKey];
        opt.textContent = typeof lblKey === 'function' ? lblKey(item) : item[lblKey];
        sel.appendChild(opt);
    });
}

// ===== API =====
async function api(path, method = 'GET', body = null) {
    const opts = { method, headers: { 'Content-Type': 'application/json' } };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(`${API_BASE}${path}`, opts);
    if (!res.ok) {
        let msg = 'Произошла ошибка, попробуйте снова';
        try { const d = await res.json(); msg = d.error || d.message || d.title || (typeof d === 'string' ? d : msg); } catch (_) {}
        throw new Error(msg);
    }
    if (res.status === 204) return null;
    return res.json();
}

async function loadCommonData() {
    [catStatuses, cages, employees] = await Promise.all([api('/CatStatus'), api('/Cage'), api('/Employee')]);
}

// ===== КОШКИ =====
async function loadCats() {
    document.getElementById('catsTableBody').innerHTML = '<tr><td colspan="8" class="loading-text">Загрузка...</td></tr>';
    try {
        cats = await api('/Cat');
        const stSel = document.getElementById('catStatusFilter');
        if (stSel) {
            const cur = stSel.value;
            const statuses = [...new Set(cats.map(c => c.status_name).filter(Boolean))].sort();
            stSel.innerHTML = '<option value="">Все статусы</option>' +
                statuses.map(s => `<option value="${s}"${s === cur ? ' selected' : ''}>${s}</option>`).join('');
        }
        renderCats();
        document.getElementById('statTotal').textContent = cats.length;
        document.getElementById('statInShelter').textContent = cats.filter(c => isActiveStatus(c.status_name)).length;
        document.getElementById('statAdopted').textContent = cats.filter(c => (c.status_name || '').toLowerCase().includes('пристроен')).length;
    } catch (e) {
        document.getElementById('catsTableBody').innerHTML = `<tr><td colspan="8" class="loading-text" style="color:#e74c3c">${e.message}</td></tr>`;
    }
}

function renderCats() {
    const tbody = document.getElementById('catsTableBody');
    const q = (document.getElementById('catSearch')?.value || '').toLowerCase();
    const st = document.getElementById('catStatusFilter')?.value || '';
    const filtered = cats.filter(c =>
        ((c.name || '').toLowerCase().includes(q) || (c.breed || '').toLowerCase().includes(q)) &&
        (!st || c.status_name === st)
    );
    if (!filtered.length) { tbody.innerHTML = '<tr><td colspan="8" class="loading-text">Ничего не найдено</td></tr>'; return; }
    tbody.innerHTML = filtered.map(c => `<tr>
        <td><strong>${c.name || '—'}</strong></td><td>${c.breed || '—'}</td><td>${c.color || '—'}</td>
        <td>${c.gender === 'М' ? '♂ Кот' : c.gender === 'Ж' ? '♀ Кошка' : '—'}</td>
        <td>${statusBadge(c.status_name)}</td><td>${c.cage_number || '—'}</td>
        <td>${fmtDateOnly(c.birth_date)}</td>
        <td>
            <button class="btn-view" onclick="openCatDetail(${c.cat_id})">📂 Карточка</button>
            ${isActiveStatus(c.status_name)
                ? `<button class="btn-edit" onclick="openEditCat(${c.cat_id})">✏️</button>`               : `<button class="btn-edit" onclick="openEditCatStatus(${c.cat_id})">🔄 Статус</button>`}
        </td>
    </tr>`).join('');
}

function updateStatusRequirements(statusId, autoFill = true) {
    const name = catStatuses.find(s => s.status_id === parseInt(statusId))?.name || '';
    const active = isActiveStatus(name);
    const lbl = document.getElementById('catDepartureDateLabel');
    const inp = document.getElementById('catDepartureDate');
    const err = document.getElementById('errCatDepartureDate');
    const cageInp = document.getElementById('catCage');

    if (!active && statusId) {
        if (autoFill) inp.value = today();
        inp.classList.add('field-required');
        if (lbl) lbl.innerHTML = 'Дата выбытия *';
        if (editingStatusOnly) cageInp.disabled = true;
    } else {
        if (autoFill) {
            inp.value = '';
            const occupiedIds = new Set(
                cats.filter(c => isActiveStatus(c.status_name) && c.cat_id !== editingCatId).map(c => c.cage_id)
            );
            const freeCage = cages.find(c => !occupiedIds.has(c.cage_id));
            if (freeCage) cageInp.value = freeCage.cage_id;
        }
        inp.classList.remove('field-required');
        if (lbl) lbl.innerHTML = 'Дата выбытия';
        if (err) err.textContent = '';
        if (editingStatusOnly) cageInp.disabled = false;
    }
}
function enableCatFormFields() {
    CAT_READONLY_FIELDS.forEach(fid => { const el = document.getElementById(fid); if (el) el.disabled = false; });
    document.getElementById('catCage').disabled = false;
}

async function openAddCat() {
    editingCatId = null;
    editingStatusOnly = false;
    enableCatFormFields();
    document.getElementById('catModalTitle').textContent = 'Добавить кошку';
    document.getElementById('catForm').reset();
    populateSelect('catStatus', catStatuses, 'status_id', 'name');
    await populateCageCatSelect();
    updateStatusRequirements('');
    openModal('catModal');
}
async function openEditCat(id) {
    editingCatId = id;
    editingStatusOnly = false;
    enableCatFormFields();
    document.getElementById('catModalTitle').textContent = 'Редактировать кошку';
    populateSelect('catStatus', catStatuses, 'status_id', 'name');
    try {
        const c = await api(`/Cat/${id}`);
        await populateCageCatSelect(c.cage_id);
        document.getElementById('catName').value = c.name || '';
        document.getElementById('catBreed').value = c.breed || '';
        document.getElementById('catColor').value = c.color || '';
        document.getElementById('catGender').value = c.gender || '';
        document.getElementById('catStatus').value = c.status_id || '';
        document.getElementById('catCage').value = c.cage_id || '';
        document.getElementById('catBirthDate').value = c.birth_date || '';
        document.getElementById('catDepartureDate').value = c.departure_date || '';
        document.getElementById('catSource').value = c.source_of_arrival || '';
        document.getElementById('catCharacter').value = c.character || '';
        document.getElementById('catMarks').value = c.special_marks || '';
        openModal('catModal');
        updateStatusRequirements(c.status_id || '', false);
    } catch (e) { showToast(e.message, true); }
}

async function openEditCatStatus(id) {
    editingCatId = id;
    editingStatusOnly = true;
    enableCatFormFields();
    document.getElementById('catModalTitle').textContent = 'Изменить статус';
    populateSelect('catStatus', catStatuses, 'status_id', 'name');
    populateSelect('catCage', cages, 'cage_id', c => `${c.number} (${c.cage_type || 'клетка'}, вмест. ${c.capacity})`);
    try {
        const c = await api(`/Cat/${id}`);
        document.getElementById('catName').value = c.name || '';
        document.getElementById('catBreed').value = c.breed || '';
        document.getElementById('catColor').value = c.color || '';
        document.getElementById('catGender').value = c.gender || '';
        document.getElementById('catStatus').value = c.status_id || '';
        document.getElementById('catCage').value = c.cage_id || '';
        document.getElementById('catBirthDate').value = c.birth_date || '';
        document.getElementById('catDepartureDate').value = c.departure_date || '';
        document.getElementById('catSource').value = c.source_of_arrival || '';
        document.getElementById('catCharacter').value = c.character || '';
        document.getElementById('catMarks').value = c.special_marks || '';
        CAT_READONLY_FIELDS.forEach(fid => { const el = document.getElementById(fid); if (el) el.disabled = true; });
        document.getElementById('catCage').disabled = true;
        openModal('catModal');
        updateStatusRequirements(c.status_id || '', false);
    } catch (e) { showToast(e.message, true); }
}
async function saveCat(e) {
    e.preventDefault();
    const statusId = parseInt(document.getElementById('catStatus').value);
    const cageId = parseInt(document.getElementById('catCage').value) || null;
    const source = document.getElementById('catSource').value.trim();
    const selectedStatusName = catStatuses.find(s => s.status_id === statusId)?.name || '';
    const active = isActiveStatus(selectedStatusName);

    document.getElementById('errCatStatus').textContent = '';
    document.getElementById('errCatCage').textContent = '';
    document.getElementById('errCatSource').textContent = '';
    document.getElementById('errCatDepartureDate').textContent = '';
    let valid = true;
    if (!statusId) { document.getElementById('errCatStatus').textContent = 'Выберите статус'; valid = false; }
    if (active && !cageId) { document.getElementById('errCatCage').textContent = 'Выберите клетку'; valid = false; }
    if (!source) { document.getElementById('errCatSource').textContent = 'Укажите источник'; valid = false; }
    const departureVal = document.getElementById('catDepartureDate').value;
    if (!active && statusId && !departureVal) { document.getElementById('errCatDepartureDate').textContent = 'Укажите дату выбытия'; valid = false; }
    if (!valid) return;

    let departureDate;
    if (active) {
        departureDate = null;
    } else {
        departureDate = departureVal || null;
    }

    const data = {
        cat_id: editingCatId,
        name: capitalizeName(document.getElementById('catName').value) || null,
        breed: capitalizeName(document.getElementById('catBreed').value) || null,
        color: capitalizeFirst(document.getElementById('catColor').value) || null,
        gender: document.getElementById('catGender').value || null,
        birth_date: document.getElementById('catBirthDate').value || null,
        departure_date: departureDate,
        source_of_arrival: source,
        character: capitalizeFirst(document.getElementById('catCharacter').value) || null,
        special_marks: capitalizeFirst(document.getElementById('catMarks').value) || null,
        status_id: statusId, cage_id: active ? cageId : null
    };
    try {
        const catName = data.name || 'Кошка';
        if (editingCatId) { await api(`/Cat/${editingCatId}`, 'PUT', data); showToast(`Данные кошки «${catName}» обновлены`); }
        else { await api('/Cat', 'POST', data); showToast(`Кошка «${catName}» добавлена в приют`); }
        closeModal('catModal');
        await loadCats();
    } catch (e) { showToast(e.message, true); }
}

async function deleteCat(id) {
    const cat = cats.find(c => c.cat_id === id);
    const name = cat?.name || `#${id}`;
    if (!confirm(`Удалить кошку «${name}»? Это необратимо.`)) return;
    try { await api(`/Cat/${id}`, 'DELETE'); showToast(`Кошка «${name}» удалена`); await loadCats(); }
    catch (e) { showToast(e.message, true); }
}

// ===== МЕДКАРТЫ =====
async function loadMedCards() {
    document.getElementById('medCardsTableBody').innerHTML = '<tr><td colspan="7" class="loading-text">Загрузка...</td></tr>';
    try {
        medCards = await api('/MedicalCard');
        renderMedCards();
    } catch (e) {
        document.getElementById('medCardsTableBody').innerHTML = `<tr><td colspan="7" class="loading-text" style="color:#e74c3c">${e.message}</td></tr>`;
    }
}

function renderMedCards() {
    const tbody = document.getElementById('medCardsTableBody');
    const q = (document.getElementById('medSearch')?.value || '').toLowerCase();
    const filtered = medCards.filter(mc =>
        (mc.cat_name || '').toLowerCase().includes(q) ||
        (mc.cat_breed || '').toLowerCase().includes(q) ||
        (mc.cat_color || '').toLowerCase().includes(q)
    );
    if (!filtered.length) { tbody.innerHTML = '<tr><td colspan="7" class="loading-text">Ничего не найдено</td></tr>'; return; }
    tbody.innerHTML = filtered.map(mc => `<tr>
        <td>${catInfoText(mc.cat_name, mc.cat_breed, mc.cat_color)}</td>
        <td>${fmtDateOnly(mc.opening_date)}</td>
        <td>${mc.weight != null ? mc.weight + ' кг' : '—'}</td>
        <td>${boolBadge(mc.is_vaccinated)}</td>
        <td>${boolBadge(mc.is_sterilized)}</td>
        <td>${boolBadge(mc.is_parasite_treated)}</td>
        <td>
            <button class="btn-edit" onclick="openEditMedCard(${mc.medical_card_id})">✏️ Изменить</button>
            <button class="btn-view" onclick="openMedRecords(${mc.medical_card_id},'${(mc.cat_name||'').replace(/'/g,"\\'")}','${(mc.cat_breed||'').replace(/'/g,"\\'")}','${(mc.cat_color||'').replace(/'/g,"\\'")}')">📋 Записи</button>
        </td>
    </tr>`).join('');
}

async function openAddMedCard() {
    editingMedCardId = null;
    document.getElementById('medCardModalTitle').textContent = 'Создать медкарту';
    document.getElementById('medCardForm').reset();
    document.getElementById('medCardCatGroup').style.display = 'block';
    document.getElementById('medCardDateGroup').style.display = 'block';
    document.getElementById('medCardDate').value = today();
    if (!cats.length) await loadCats();
    if (!medCards.length) await loadMedCards();
    const catsNoCard = cats.filter(c => !medCards.some(mc => mc.cat_id === c.cat_id));
    const sel = document.getElementById('medCardCat');
    sel.innerHTML = '<option value="">-- Выберите кошку --</option>';
    if (!catsNoCard.length) {
        const o = document.createElement('option');
        o.disabled = true;
        o.textContent = '— Все кошки уже имеют медкарту —';
        sel.appendChild(o);
    } else {
        catsNoCard.forEach(c => {
            const o = document.createElement('option');
            o.value = c.cat_id;
            o.textContent = catLabel(c);
            sel.appendChild(o);
        });
    }
    openModal('medCardModal');
}

function openEditMedCard(cardId) {
    editingMedCardId = cardId;
    document.getElementById('medCardModalTitle').textContent = 'Редактировать медкарту';
    document.getElementById('medCardCatGroup').style.display = 'none';
    document.getElementById('medCardDateGroup').style.display = 'none';
    const mc = medCards.find(m => m.medical_card_id === cardId);
    if (mc) {
        document.getElementById('medWeight').value = mc.weight || '';
        document.getElementById('medVaccinated').checked = !!mc.is_vaccinated;
        document.getElementById('medSterilized').checked = !!mc.is_sterilized;
        document.getElementById('medParasite').checked = !!mc.is_parasite_treated;
    }
    openModal('medCardModal');
}

async function saveMedCard(e) {
    e.preventDefault();
    try {
        if (editingMedCardId) {
            const mc = medCards.find(m => m.medical_card_id === editingMedCardId);
            const catName = catInfoText(mc?.cat_name, mc?.cat_breed, mc?.cat_color);
            await api(`/MedicalCard/${editingMedCardId}`, 'PUT', {
                medical_card_id: editingMedCardId,
                weight: parseFloat(document.getElementById('medWeight').value) || null,
                is_vaccinated: document.getElementById('medVaccinated').checked,
                is_sterilized: document.getElementById('medSterilized').checked,
                is_parasite_treated: document.getElementById('medParasite').checked
            });
            showToast(`Медкарта кошки «${catName}» обновлена`);
        } else {
            const catId = parseInt(document.getElementById('medCardCat').value);
            if (!catId) { showToast('Выберите кошку', true); return; }
            if (!document.getElementById('medCardDate').value) { showToast('Укажите дату открытия', true); return; }
            const catName = cats.find(c => c.cat_id === catId)?.name || `#${catId}`;
            await api('/MedicalCard', 'POST', {
                cat_id: catId,
                opening_date: document.getElementById('medCardDate').value,
                weight: parseFloat(document.getElementById('medWeight').value) || null,
                is_vaccinated: document.getElementById('medVaccinated').checked,
                is_sterilized: document.getElementById('medSterilized').checked,
                is_parasite_treated: document.getElementById('medParasite').checked
            });
            showToast(`Медкарта кошки «${catName}» создана`);
        }
        closeModal('medCardModal');
        await loadMedCards();
    } catch (e) { showToast(e.message, true); }
}

async function openMedRecords(cardId, catName, catBreed, catColor) {
    currentMedCardId = cardId;
    document.getElementById('medRecordForm').reset();
    document.getElementById('mrDate').value = today();
    document.getElementById('medRecordModalTitle').textContent = `Медкарта: ${catInfoText(catName, catBreed, catColor)}`;
    document.getElementById('medRecordsList').innerHTML = '<div class="loading-text" style="padding:12px">Загрузка...</div>';
    openModal('medRecordModal');
    try {
        const records = await api(`/MedicalCard/${cardId}/records`);
        renderMedRecordsList(records);
    } catch (e) {
        document.getElementById('medRecordsList').innerHTML = `<div class="loading-text" style="color:#e74c3c;padding:12px">${e.message}</div>`;
    }
}

function renderMedRecordsList(records) {
    const list = document.getElementById('medRecordsList');
    if (!records.length) {
        list.innerHTML = '<div class="loading-text" style="padding:12px">Записей пока нет</div>';
        return;
    }
    list.innerHTML = records.map(r => {
        const date = normDate(r.record_date);
        const canDelete = r.employee_id === currentUser?.id;
        return `
        <div class="detail-record-card proc">
            <div class="rec-main">
                <div class="rec-date">${fmtDateOnly(r.record_date)} · 👤 ${r.employee_name || '—'}</div>
                <div class="rec-sub">
                    ${r.diagnosis ? `🩺 <strong>Диагноз:</strong> ${r.diagnosis}<br>` : ''}
                    ${r.prescriptions ? `💊 <strong>Назначения:</strong> ${r.prescriptions}<br>` : ''}
                    ${r.notes ? `📝 ${r.notes}` : ''}
                </div>
            </div>
            <div class="rec-actions">
                ${canDelete ? `<button class="btn-delete" onclick="deleteMedRecord(${r.employee_id},${r.medical_card_id},'${date}')" title="Удалить">🗑</button>` : ''}
            </div>
        </div>`;
    }).join('');
}

async function deleteMedRecord(empId, cardId, date) {
    if (!confirm('Удалить запись из медкарты?')) return;
    try {
        await api(`/MedicalCard/records/${empId}/${cardId}/${date}`, 'DELETE');
        showToast('Запись удалена');
        const records = await api(`/MedicalCard/${cardId}/records`);
        renderMedRecordsList(records);
    } catch (e) { showToast(e.message, true); }
}

async function saveMedRecord(e) {
    e.preventDefault();
    if (!document.getElementById('mrDate').value) { showToast('Укажите дату записи', true); return; }
    try {
        const mc = medCards.find(m => m.medical_card_id === currentMedCardId);
        const catName = catInfoText(mc?.cat_name, mc?.cat_breed, mc?.cat_color);
        await api('/MedicalCard/records', 'POST', {
            employee_id: currentUser.id,
            medical_card_id: currentMedCardId,
            record_date: document.getElementById('mrDate').value,
            diagnosis: document.getElementById('mrDiagnosis').value.trim() || null,
            prescriptions: document.getElementById('mrPrescriptions').value.trim() || null,
            notes: document.getElementById('mrNotes').value.trim() || null
        });
        showToast(`Запись в медкарту кошки «${catName}» добавлена`);
        document.getElementById('medRecordForm').reset();
        document.getElementById('mrDate').value = today();
        // Перезагрузить список записей прямо в модале
        const records = await api(`/MedicalCard/${currentMedCardId}/records`);
        renderMedRecordsList(records);
    } catch (e) { showToast(e.message, true); }
}

// ===== ПРОЦЕДУРЫ =====
async function loadProcedures() {
    try {
        [procTypes, procRecords] = await Promise.all([api('/Procedure/types'), api('/Procedure/records')]);
        renderProcTypes();
        renderProcRecords();
    } catch (e) { showToast('Ошибка загрузки процедур: ' + e.message, true); }
}

function renderProcTypes() {
    const tbody = document.getElementById('procTypesBody');
    const q = (document.getElementById('procTypeSearch')?.value || '').toLowerCase();
    const list = q ? procTypes.filter(t =>
        (t.procedure_type_name || '').toLowerCase().includes(q) ||
        (t.description || '').toLowerCase().includes(q)
    ) : procTypes;
    if (!list.length) { tbody.innerHTML = '<tr><td colspan="4" class="loading-text">Ничего не найдено</td></tr>'; return; }
    tbody.innerHTML = list.map(t => {
        const normsHtml = t.consumption_rates?.length
            ? t.consumption_rates.map(r =>
                `<span class="consumption-norm-item">${r.product_name} × ${r.standard_quantity} ${r.unit || 'ед.'}</span>`
              ).join(' ')
            : '<span style="color:#aaa">—</span>';
        const safeName = t.procedure_type_name.replace(/'/g, "\\'");
        return `<tr>
            <td><strong>${t.procedure_type_name}</strong></td>
            <td>${t.description || '—'}</td>
            <td>${normsHtml}</td>
            <td>
                <button class="btn-edit" onclick="openEditProcType('${safeName}')">✏️</button>
                
            </td>
        </tr>`;
    }).join('');
}

function renderProcRecords() {
    const tbody = document.getElementById('procRecordsBody');
    const q = (document.getElementById('procRecordSearch')?.value || '').toLowerCase();
    const filtered = procRecords.filter(r =>
        (r.cat_name || '').toLowerCase().includes(q) ||
        (r.cat_breed || '').toLowerCase().includes(q) ||
        (r.cat_color || '').toLowerCase().includes(q) ||
        (r.procedure_type_name || '').toLowerCase().includes(q)
    );
    if (!filtered.length) { tbody.innerHTML = '<tr><td colspan="7" class="loading-text">Нет данных</td></tr>'; return; }
    tbody.innerHTML = filtered.map(r => {
        const safeName = (r.procedure_type_name || '').replace(/'/g, "\\'");
        const date = normDate(r.procedure_date);
        const canDelete = r.employee_id === currentUser?.id;
        return `<tr>
        <td>${fmtDateOnly(r.procedure_date)}</td>
        <td>${catInfoText(r.cat_name, r.cat_breed, r.cat_color)}</td>
        <td>${r.procedure_type_name}</td>
        <td>${r.employee_name || '—'}</td>
        <td>${r.result || '—'}</td>
        <td>${r.notes || '—'}</td>
        <td>${canDelete ? `<button class="btn-delete" onclick="deleteProcRecord(${r.employee_id},'${safeName}',${r.cat_id},'${date}')" title="Удалить">🗑</button>` : ''}</td>
    </tr>`;
    }).join('');
}

function renderPtRates() {
    const container = document.getElementById('ptRatesList');
    if (!ptRates.length) {
        container.innerHTML = '<div style="color:#aaa;font-size:13px;padding:4px 0">Нет норм расхода — нажмите «+ Добавить товар»</div>';
        return;
    }
    container.innerHTML = ptRates.map((r, i) => {
        const productOptions = products.filter(p => p.is_active !== false || p.product_id === r.product_id).map(p =>
            `<option value="${p.product_id}" ${r.product_id === p.product_id ? 'selected' : ''}>${p.name}${p.is_active === false ? ' (архив)' : ''}</option>`
        ).join('');
        const unit = products.find(p => p.product_id === r.product_id)?.unit_of_measure || 'ед.';
        return `<div class="pt-rate-row">
            <select onchange="updatePtRateProduct(${i}, parseInt(this.value))">
                <option value="0">-- Выберите товар --</option>
                ${productOptions}
            </select>
            <input type="number" min="1" value="${r.standard_quantity || ''}" placeholder="Кол-во"
                oninput="ptRates[${i}].standard_quantity = parseInt(this.value)||0">
            <span class="pt-rate-unit">${unit}</span>
            <button type="button" class="btn-remove-rate" onclick="removePtRate(${i})">✕</button>
        </div>`;
    }).join('');
}

function addPtRate() {
    ptRates.push({ product_id: 0, standard_quantity: 0 });
    renderPtRates();
}

function removePtRate(idx) {
    ptRates.splice(idx, 1);
    renderPtRates();
}

function updatePtRateProduct(idx, productId) {
    ptRates[idx].product_id = productId;
    renderPtRates();
}

function openAddProcType() {
    editingProcTypeName = null;
    document.getElementById('procTypeModalTitle').textContent = 'Новый тип процедуры';
    document.getElementById('procTypeForm').reset();
    document.getElementById('ptName').disabled = false;
    ptRates = [];
    renderPtRates();
    openModal('procTypeModal');
}

function openEditProcType(name) {
    editingProcTypeName = name;
    document.getElementById('procTypeModalTitle').textContent = 'Редактировать тип';
    const t = procTypes.find(x => x.procedure_type_name === name);
    document.getElementById('ptName').value = name;
    document.getElementById('ptName').disabled = true;
    document.getElementById('ptDesc').value = t?.description || '';
    ptRates = (t?.consumption_rates || []).map(r => ({
        product_id: r.product_id,
        standard_quantity: r.standard_quantity
    }));
    renderPtRates();
    openModal('procTypeModal');
}

async function saveProcType(e) {
    e.preventDefault();
    const name = capitalizeFirst(document.getElementById('ptName').value);
    const desc = capitalizeFirst(document.getElementById('ptDesc').value);
    if (!name) { document.getElementById('errPtName').textContent = 'Введите название'; return; }
    document.getElementById('errPtName').textContent = '';
    const rates = ptRates.filter(r => r.product_id > 0 && r.standard_quantity > 0);
    try {
        if (editingProcTypeName) {
            await api(`/Procedure/types/${encodeURIComponent(editingProcTypeName)}`, 'PUT', { procedure_type_name: name, description: desc, consumption_rates: rates });
            showToast(`Тип процедуры «${name}» обновлён`);
        } else {
            await api('/Procedure/types', 'POST', { procedure_type_name: name, description: desc, consumption_rates: rates });
            showToast(`Тип процедуры «${name}» добавлен`);
        }
        closeModal('procTypeModal');
        await loadProcedures();
    } catch (e) { showToast(e.message, true); }
}

async function deleteProcType(name) {
    if (!confirm(`Удалить тип процедуры «${name}»?`)) return;
    try {
        await api(`/Procedure/types/${encodeURIComponent(name)}`, 'DELETE');
        showToast(`Тип процедуры «${name}» удалён`);
        await loadProcedures();
    } catch (e) { showToast(e.message, true); }
}

function openAddProcRecord() {
    document.getElementById('procRecordForm').reset();
    document.getElementById('prDate').value = today();
    document.getElementById('pr-consumption-block').style.display = 'none';
    populateSelect('prCat', inShelterCats(), 'cat_id', catLabel);
    populateSelect('prType', procTypes, 'procedure_type_name', 'procedure_type_name');
    populateBatchSelect('pr-exp-batch');
    openModal('procRecordModal');
}


function procMatchesType(name) {
    const n = (name || '').toLowerCase();
    return {
        isSterilization: n.includes('стерилизац'),
        isCastration:    n.includes('кастрац'),
        isVaccination:   n.includes('вакцинац'),
        isFleas:         n.includes('блох') || (n.includes('паразит') && n.includes('обработ'))
    };
}

async function updateMedCardAfterProc(catId, typeName) {
    const mc = medCards.find(m => m.cat_id === catId);
    if (!mc) return;
    const t = procMatchesType(typeName);
    let patch = null;
    if ((t.isSterilization || t.isCastration) && !mc.is_sterilized) patch = { is_sterilized: true };
    else if (t.isVaccination && !mc.is_vaccinated)                   patch = { is_vaccinated: true };
    else if (t.isFleas && !mc.is_parasite_treated)                   patch = { is_parasite_treated: true };
    if (!patch) return;
    try {
        await api(`/MedicalCard/${mc.medical_card_id}`, 'PUT', {
            weight: mc.weight,
            is_sterilized:       patch.is_sterilized       ?? mc.is_sterilized,
            is_vaccinated:       patch.is_vaccinated       ?? mc.is_vaccinated,
            is_parasite_treated: patch.is_parasite_treated ?? mc.is_parasite_treated
        });
        await loadMedCards();
    } catch (e) { console.warn('medCard auto-update failed:', e.message); }
}

function validateProcGenderAndSterilized(catId, typeName) {
    const cat = cats.find(c => c.cat_id === catId);
    const gender = cat?.gender || '';
    const t = procMatchesType(typeName);
    if (t.isSterilization && gender === 'М') {
        showToast('Стерилизация проводится только для кошек женского пола', true); return false;
    }
    if (t.isCastration && gender === 'Ж') {
        showToast('Кастрация проводится только для котов мужского пола', true); return false;
    }
    if (t.isSterilization || t.isCastration) {
        const mc = medCards.find(m => m.cat_id === catId);
        if (mc?.is_sterilized) {
            showToast(`Кошка «${cat?.name || ''}» уже стерилизована/кастрирована`, true); return false;
        }
    }
    return true;
}
async function saveProcRecord(e) {
    e.preventDefault();
    const catId = parseInt(document.getElementById('prCat').value);
    const typeName = document.getElementById('prType').value;
    const date = document.getElementById('prDate').value;
    const result = document.getElementById('prResult').value.trim() || null;
    const notes = document.getElementById('prNotes').value.trim() || null;
    const expBatchId = parseInt(document.getElementById('pr-exp-batch').value) || null;
    const expQty = parseFloat(document.getElementById('pr-exp-qty').value) || null;
    if (!catId) { showToast('Выберите кошку', true); return; }
    if (!typeName) { showToast('Выберите тип процедуры', true); return; }
    if (!date) { showToast('Укажите дату процедуры', true); return; }
    if (!validateProcGenderAndSterilized(catId, typeName)) return;
    try {
        const catName = cats.find(c => c.cat_id === catId)?.name || `#${catId}`;
        try {
            await api('/Procedure/records', 'POST', {
                employee_id: currentUser.id,
                procedure_type_name: typeName,
                cat_id: catId,
                procedure_date: date,
                result, notes
            });
            // Записать фактический расход если указан
            if (expBatchId && expQty) {
                const batch = batches.find(b => b.batch_id === expBatchId);
                await api('/Warehouse/expenses', 'POST', {
                    employee_id: currentUser.id,
                    batch_id: expBatchId,
                    cat_id: catId,
                    expense_date: date,
                    quantity: expQty,
                    notes: `Расход при процедуре: ${typeName}`
                });
                showToast(`Процедура «${typeName}» для «${catName}» добавлена · расход ${batch?.product_name || ''} × ${expQty} записан`);
            } else {
                showToast(`Процедура «${typeName}» для кошки «${catName}» добавлена`);
            }
            closeModal('procRecordModal');
            await loadProcedures();
            await updateMedCardAfterProc(catId, typeName);
            if (expBatchId) loadWarehouse();
        } catch (apiErr) {
            const msg = apiErr.message || '';
            if (msg.includes('уже существует')) {
                showToast('Такая процедура уже записана — можно добавить запись в медкарту', false);
                closeModal('procRecordModal');
            } else {
                throw apiErr;
            }
        }
        openProcToMedModal(catId, date, typeName, result, notes);
    } catch (e) { showToast(e.message, true); }
}

async function deleteProcRecord(empId, typeName, catId, date) {
    if (!confirm(`Удалить запись о процедуре «${typeName}»?`)) return;
    try {
        await api(`/Procedure/records/${empId}/${encodeURIComponent(typeName)}/${catId}/${date}`, 'DELETE');
        showToast(`Запись о процедуре «${typeName}» удалена`);
        await loadProcedures();
    } catch (e) { showToast(e.message, true); }
}

// ===== ВОЛОНТЁРЫ =====
async function loadVolunteers() {
    try {
        [volunteers, cares] = await Promise.all([api('/Volunteer'), api('/Volunteer/cares')]);
        renderVolunteers();
        renderCares();
    } catch (e) { showToast('Ошибка загрузки волонтёров: ' + e.message, true); }
}

function renderVolunteers() {
    const tbody = document.getElementById('volunteersTableBody');
    const q = (document.getElementById('volSearch')?.value || '').toLowerCase();
    const filtered = volunteers.filter(v => (v.full_name || '').toLowerCase().includes(q));
    if (!filtered.length) { tbody.innerHTML = '<tr><td colspan="6" class="loading-text">Нет данных</td></tr>'; return; }
    tbody.innerHTML = filtered.map(v => `<tr>
        <td>${v.full_name}</td>
        <td>${v.phone || '—'}</td>
        <td>${v.email || '—'}</td>
        <td>${v.skills || '—'}</td>
        <td>${fmtDateOnly(v.registration_date)}</td>
        <td>
            <button class="btn-edit" onclick="openEditVolunteer(${v.volunteer_id})">✏️</button>
            
        </td>
    </tr>`).join('');
}

function renderCares() {
    const tbody = document.getElementById('caresTableBody');
    if (!cares.length) { tbody.innerHTML = '<tr><td colspan="5" class="loading-text">Нет назначений</td></tr>'; return; }
    tbody.innerHTML = cares.map(c => {
        const active = !c.end_date;
        const statusBtn = active
            ? `<button class="btn-end" onclick="endCare(${c.volunteer_id},${c.cat_id})">⏹ Завершить</button>`
            : `<button class="btn-restore" onclick="openRestoreCare(${c.volunteer_id},${c.cat_id})">▶ Восстановить</button>`;
        return `<tr>
            <td>${c.volunteer_name || '—'}</td>
            <td>${catInfoText(c.cat_name, c.cat_breed, c.cat_color)}</td>
            <td>${fmtDateOnly(c.start_date)}</td>
            <td>${c.end_date ? fmtDateOnly(c.end_date) : '—'}</td>
            <td>${statusBtn}</td>
        </tr>`;
    }).join('');
}
function openAddVolunteer() {
    editingVolunteerId = null;
    document.getElementById('volModalTitle').textContent = 'Добавить волонтёра';
    document.getElementById('volunteerForm').reset();
    document.getElementById('volRegDate').value = today();
    openModal('volunteerModal');
}

function openEditVolunteer(id) {
    editingVolunteerId = id;
    document.getElementById('volModalTitle').textContent = 'Редактировать волонтёра';
    const v = volunteers.find(x => x.volunteer_id === id);
    if (!v) return;
    document.getElementById('volName').value = v.full_name || '';
    document.getElementById('volPhone').value = v.phone || '';
    document.getElementById('volEmail').value = v.email || '';
    document.getElementById('volAddress').value = v.address || '';
    document.getElementById('volPassSeries').value = v.passport_series || '';
    document.getElementById('volPassNumber').value = v.passport_number || '';
    document.getElementById('volBirthDate').value = v.birth_date || '';
    document.getElementById('volRegDate').value = v.registration_date || '';
    document.getElementById('volSkills').value = v.skills || '';
    openModal('volunteerModal');
}

async function saveVolunteer(e) {
    e.preventDefault();
    const name = capitalizeName(document.getElementById('volName').value);
    if (!name) { document.getElementById('errVolName').textContent = 'Введите ФИО'; return; }
    document.getElementById('errVolName').textContent = '';
    const phone = normalizePhone(document.getElementById('volPhone').value);
    if (phone && !/^8\d{10}$/.test(phone)) {
        showToast('Введите телефон в формате 8XXXXXXXXXX, +7XXXXXXXXXX или 10 цифр', true); return;
    }
    const pSeries = digitsOnly(document.getElementById('volPassSeries').value);
    const pNumber = digitsOnly(document.getElementById('volPassNumber').value);
    if (pSeries && pSeries.length !== 4) { showToast('Серия паспорта: ровно 4 цифры', true); return; }
    if (pNumber && pNumber.length !== 6) { showToast('Номер паспорта: ровно 6 цифр', true); return; }
    if ((pSeries && !pNumber) || (!pSeries && pNumber)) { showToast('Заполните оба поля паспорта', true); return; }
    const data = {
        volunteer_id: editingVolunteerId,
        full_name: name,
        phone: phone || null,
        email: document.getElementById('volEmail').value.trim().toLowerCase() || null,
        address: capitalizeFirst(document.getElementById('volAddress').value) || null,
        passport_series: pSeries || null,
        passport_number: pNumber || null,
        birth_date: document.getElementById('volBirthDate').value || null,
        registration_date: document.getElementById('volRegDate').value,
        skills: capitalizeFirst(document.getElementById('volSkills').value) || null
    };
    try {
        if (editingVolunteerId) {
            await api(`/Volunteer/${editingVolunteerId}`, 'PUT', data);
            showToast(`Данные волонтёра «${name}» обновлены`);
        } else {
            await api('/Volunteer', 'POST', data);
            showToast(`Волонтёр «${name}» добавлен`);
        }
        closeModal('volunteerModal');
        await loadVolunteers();
    } catch (e) { showToast(e.message, true); }
}

async function deleteVolunteer(id) {
    const vol = volunteers.find(v => v.volunteer_id === id);
    const name = vol?.full_name || `#${id}`;
    if (!confirm(`Удалить волонтёра «${name}»?`)) return;
    try { await api(`/Volunteer/${id}`, 'DELETE'); showToast(`Волонтёр «${name}» удалён`); await loadVolunteers(); }
    catch (e) { showToast(e.message, true); }
}

function openAddCare() {
    document.getElementById('careForm').reset();
    document.getElementById('careStart').value = today();
    populateSelect('careVolunteer', volunteers, 'volunteer_id', 'full_name');
    populateSelect('careCat', inShelterCats(), 'cat_id', catLabel);
    openModal('careModal');
}

async function endCare(volId, catId) {
    const c = cares.find(x => x.volunteer_id === volId && x.cat_id === catId);
    if (!c) return;
    try {
        await api(`/Volunteer/cares/${volId}/${catId}`, 'PUT', {
            volunteer_id: volId, cat_id: catId,
            start_date: c.start_date, end_date: today()
        });
        showToast(`Уход волонтёра «${c.volunteer_name || ''}» за кошкой «${c.cat_name || ''}» завершён`);
        await loadVolunteers();
    } catch (e) { showToast(e.message, true); }
}

let restoringCare = null;

function openRestoreCare(volId, catId) {
    restoringCare = { volId, catId };
    const inp = document.getElementById('restoreStartDate');
    inp.value = today();
    inp.max = today();
    const c = cares.find(x => x.volunteer_id === volId && x.cat_id === catId);
    document.getElementById('restoreCareName').textContent =
        (c ? `«${c.volunteer_name || ''}» — «${c.cat_name || ''}»` : '');
    openModal('restoreCareModal');
}

async function confirmRestoreCare() {
    if (!restoringCare) return;
    const inp = document.getElementById('restoreStartDate');
    const startDate = inp.value;
    if (!startDate) { document.getElementById('restoreStartErr').textContent = 'Укажите дату'; return; }
    if (startDate > today()) { document.getElementById('restoreStartErr').textContent = 'Дата не может быть позже сегодняшней'; return; }
    document.getElementById('restoreStartErr').textContent = '';
    const { volId, catId } = restoringCare;
    const c = cares.find(x => x.volunteer_id === volId && x.cat_id === catId);
    try {
        await api(`/Volunteer/cares/${volId}/${catId}`, 'PUT', {
            volunteer_id: volId, cat_id: catId,
            start_date: startDate, end_date: null
        });
        showToast(`Уход волонтёра «${c?.volunteer_name || ''}» восстановлен`);
        closeModal('restoreCareModal');
        restoringCare = null;
        await loadVolunteers();
    } catch (e) { showToast(e.message, true); }
}
async function saveCare(e) {
    e.preventDefault();
    const volId = parseInt(document.getElementById('careVolunteer').value);
    const catId = parseInt(document.getElementById('careCat').value);
    const start = document.getElementById('careStart').value;
    if (!volId || !catId || !start) { showToast('Заполните обязательные поля', true); return; }
    try {
        const volName = volunteers.find(v => v.volunteer_id === volId)?.full_name || `#${volId}`;
        const catName = cats.find(c => c.cat_id === catId)?.name || `#${catId}`;
        await api('/Volunteer/cares', 'POST', {
            volunteer_id: volId, cat_id: catId,
            start_date: start,
            end_date: document.getElementById('careEnd').value || null
        });
        showToast(`Волонтёр «${volName}» закреплён за кошкой «${catName}»`);
        closeModal('careModal');
        await loadVolunteers();
    } catch (e) { showToast(e.message, true); }
}

async function deleteCare(volId, catId) {
    const c = cares.find(x => x.volunteer_id === volId && x.cat_id === catId);
    const label = c ? `«${c.volunteer_name}» — «${c.cat_name}»` : '';
    if (!confirm(`Удалить запись об уходе ${label}?`)) return;
    try { await api(`/Volunteer/cares/${volId}/${catId}`, 'DELETE'); showToast(`Запись об уходе ${label} удалена`); await loadVolunteers(); }
    catch (e) { showToast(e.message, true); }
}

// ===== СКЛАД =====
async function loadWarehouse() {
    try {
        [products, batches, warehouses, remains, expenses, expiringBatches] = await Promise.all([
            api('/Warehouse/products'), api('/Warehouse/batches'), api('/Warehouse'),
            api('/Warehouse/remains'), api('/Warehouse/expenses'),
            api('/Warehouse/expiring').catch(() => [])
        ]);
        renderExpiringBanner();
        const whSel = document.getElementById('remainsWarehouseFilter');
        if (whSel && warehouses?.length) {
            const cur = whSel.value;
            whSel.innerHTML = '<option value="">Все склады</option>' +
                warehouses.map(w => `<option value="${w.warehouse_id}"${String(w.warehouse_id)===cur?' selected':''}>${w.warehouse_type || 'Склад #'+w.warehouse_id}</option>`).join('');
        }
        renderProducts();
        renderBatches();
        renderRemains();
        renderExpenses();
    } catch (e) { showToast('Ошибка загрузки склада: ' + e.message, true); }
}

function renderExpiringBanner() {
    const banner = document.getElementById('expiringBanner');
    if (!banner) return;
    if (!expiringBatches.length) { banner.style.display = 'none'; return; }
    const expired  = expiringBatches.filter(b => b.days_left <= 0);
    const critical = expiringBatches.filter(b => b.days_left > 0 && b.days_left <= 7);
    const color = expired.length ? 'var(--red, #e74c3c)' : critical.length ? 'var(--orange, #f39c12)' : '#b7860b';
    banner.style.display = '';
    banner.innerHTML = `<span style="color:${color};font-weight:700">⚠️ Партии с истекающим сроком (${expiringBatches.length})</span>
        ${expired.length ? `<span style="font-size:12px;color:#e74c3c;margin-left:8px">Просроченные нельзя использовать — спишите их</span>` : ''}
        <div style="margin-top:6px;display:flex;flex-wrap:wrap;gap:8px">
        ${expiringBatches.map(b => {
            const urgency = b.days_left <= 0 ? '🔴' : b.days_left <= 7 ? '🟠' : '🟡';
            const label = b.days_left <= 0 ? 'истёк!' : b.days_left === 1 ? '1 день' : `${b.days_left} дн.`;
            const writeOffBtn = b.days_left <= 0
                ? `<button class="writeoff-btn" onclick="writeOffBatch(${b.batch_id}, '${b.product_name.replace(/'/g, "\\'")}')">Списать</button>`
                : '';
            return `<span class="expiring-tag">${urgency} ${b.product_name} — ${b.remaining_quantity} ${b.unit_of_measure || ''} (${label})${writeOffBtn}</span>`;
        }).join('')}
        </div>`;
}

async function writeOffBatch(batchId, productName) {
    if (!confirm(`Списать партию «${productName}»?\n\nОстаток обнулится, партия исчезнет со склада и из баннера.`)) return;
    try {
        await api(`/Warehouse/batches/${batchId}/writeoff`, 'PATCH');
        showToast(`Партия «${productName}» списана`);
        await loadWarehouse();
    } catch (e) { showToast(e.message, true); }
}

function renderRemains() {
    const tbody = document.getElementById('remainsTableBody');
    const q = (document.getElementById('remainsSearch')?.value || '').toLowerCase();
    const wh = document.getElementById('remainsWarehouseFilter')?.value || '';
    const lowOnly = document.getElementById('remainsLowStock')?.checked;

    let list = remains;
    if (q) list = list.filter(r => (r.product_name || '').toLowerCase().includes(q));
    if (wh) list = list.filter(r => String(r.warehouse_id) === wh);
    if (lowOnly) list = list.filter(r => r.quantity < 5);

    if (!list.length) { tbody.innerHTML = '<tr><td colspan="5" class="loading-text">Ничего не найдено</td></tr>'; return; }
    tbody.innerHTML = list.map(r => {
        const low = r.quantity < 5;
        return `<tr>
            <td>${r.product_name}</td><td>${r.unit || '—'}</td>
            <td>${r.warehouse_type || `Склад #${r.warehouse_id}`}</td>
            <td ${low ? 'style="color:#e74c3c;font-weight:600"' : ''}>${parseFloat(r.quantity)}${low ? ' ⚠️' : ''}</td>
            <td>${fmtDateOnly(r.expiration_date)}</td>
        </tr>`;
    }).join('');
}

function renderBatches() {
    const tbody = document.getElementById('batchesTableBody');
    const q = (document.getElementById('batchesSearch')?.value || '').toLowerCase();
    const list = q ? batches.filter(b => (b.product_name || '').toLowerCase().includes(q)) : batches;
    if (!list.length) { tbody.innerHTML = '<tr><td colspan="6" class="loading-text">Ничего не найдено</td></tr>'; return; }
    tbody.innerHTML = list.map(b => {
        const isMine = b.employee_id === currentUser?.id;
        let actionHtml = '';
        if (isMine) {
            if (b.has_expenses) {
                actionHtml = `<span class="badge-grey" title="Нельзя удалить — по этой партии уже есть расходы" style="cursor:default;padding:2px 6px;border-radius:4px;font-size:13px">🔒</span>`;
            } else {
                actionHtml = `<button class="btn-delete" onclick="deleteBatch(${b.batch_id})" title="Удалить">🗑</button>`;
            }
        }
        return `<tr>
            <td>${b.product_name}</td>
            <td>${fmtDateOnly(b.arrival_date)}</td>
            <td>${parseFloat(b.quantity)} ${b.unit || ''}</td>
            <td>${b.purchase_price != null ? b.purchase_price + ' ₽' : '—'}</td>
            <td>${fmtDateOnly(b.expiration_date)}</td>
            <td>${actionHtml}</td>
        </tr>`;
    }).join('');
}

async function deleteBatch(batchId) {
    const b = batches.find(x => x.batch_id === batchId);
    const name = b?.product_name || `#${batchId}`;
    if (!confirm(`Удалить партию «${name}»?`)) return;
    try {
        await api(`/Warehouse/batches/${batchId}`, 'DELETE');
        showToast(`Партия «${name}» удалена`);
        await loadWarehouse();
    } catch (e) { showToast(e.message, true); }
}

function renderProducts() {
    const tbody = document.getElementById('productsTableBody');
    const q = (document.getElementById('productsSearch')?.value || '').toLowerCase();
    const cat = document.getElementById('productsCategoryFilter')?.value || '';
    const activeOnly = document.getElementById('productsActiveOnly')?.checked ?? true;

    let list = products;
    if (q) list = list.filter(p => (p.name || '').toLowerCase().includes(q));
    if (cat) list = list.filter(p => p.category === cat);
    if (activeOnly) list = list.filter(p => p.is_active !== false);

    if (!list.length) { tbody.innerHTML = '<tr><td colspan="4" class="loading-text">Ничего не найдено</td></tr>'; return; }
    tbody.innerHTML = list.map(p => {
        const inactive = p.is_active === false;
        const statusBadge = inactive
            ? '<span class="badge badge-grey" style="margin-left:6px;font-size:11px">Архив</span>'
            : '';
        const toggleBtn = inactive
            ? `<button class="btn-edit" onclick="setProductActive(${p.product_id},true)" title="Восстановить">↩️</button>`
            : `<button class="btn-delete" onclick="setProductActive(${p.product_id},false)" title="Прекратить использование">🚫</button>`;
        return `<tr class="${inactive ? 'fired-row' : ''}">
            <td>${p.name}${statusBadge}</td>
            <td>${p.unit_of_measure || '—'}</td>
            <td>${p.category || '—'}</td>
            <td>
                ${!inactive ? `<button class="btn-edit" onclick="openEditProduct(${p.product_id})">✏️</button>` : ''}
                ${toggleBtn}
            </td>
        </tr>`;
    }).join('');
}

async function setProductActive(id, isActive) {
    const p = products.find(x => x.product_id === id);
    const name = p?.name || `#${id}`;
    const action = isActive ? 'восстановить' : 'прекратить использование';
    if (!confirm(`${isActive ? 'Восстановить' : 'Прекратить использование'} продукта «${name}»?`)) return;
    try {
        await api(`/Warehouse/products/${id}/${isActive ? 'activate' : 'deactivate'}`, 'PATCH');
        showToast(isActive ? `Продукт «${name}» восстановлён` : `Продукт «${name}» переведён в архив`);
        await loadWarehouse();
    } catch (e) { showToast(e.message, true); }
}

function renderExpenses() {
    const tbody = document.getElementById('expensesTableBody');
    const q = (document.getElementById('expensesSearch')?.value || '').toLowerCase();
    const list = q ? expenses.filter(ex =>
        (ex.product_name || '').toLowerCase().includes(q) ||
        (ex.cat_name || '').toLowerCase().includes(q)
    ) : expenses;
    if (!list.length) { tbody.innerHTML = '<tr><td colspan="6" class="loading-text">Ничего не найдено</td></tr>'; return; }
    tbody.innerHTML = list.map(ex => `<tr>
        <td>${fmtDateOnly(ex.expense_date)}</td>
        <td>${ex.product_name}</td><td>${catInfoText(ex.cat_name, ex.cat_breed, ex.cat_color)}</td>
        <td>${parseFloat(ex.quantity)} ${ex.unit || ''}</td>
        <td>${ex.employee_name || '—'}</td><td>${ex.notes || '—'}</td>
    </tr>`).join('');
}

function openAddProduct() {
    editingProductId = null;
    document.getElementById('productModalTitle').textContent = 'Добавить продукт';
    document.getElementById('productForm').reset();
    openModal('productModal');
}

function openEditProduct(id) {
    editingProductId = id;
    document.getElementById('productModalTitle').textContent = 'Редактировать продукт';
    const p = products.find(x => x.product_id === id);
    if (!p) return;
    document.getElementById('prodName').value = p.name;
    const unitSel = document.getElementById('prodUnit');
    unitSel.value = UNITS.includes(p.unit_of_measure) ? p.unit_of_measure : '';
    document.getElementById('prodCategory').value = p.category || 'Корм';
    openModal('productModal');
}

async function saveProduct(e) {
    e.preventDefault();
    const name = capitalizeFirst(document.getElementById('prodName').value);
    if (!name) return;
    const data = { product_id: editingProductId, name, unit_of_measure: document.getElementById('prodUnit').value || null, category: document.getElementById('prodCategory').value };
    try {
        if (editingProductId) { await api(`/Warehouse/products/${editingProductId}`, 'PUT', data); showToast(`Продукт «${name}» обновлён`); }
        else { await api('/Warehouse/products', 'POST', data); showToast(`Продукт «${name}» добавлен`); }
        closeModal('productModal');
        await loadWarehouse();
    } catch (e) { showToast(e.message, true); }
}

async function deleteProduct(id) {
    const p = products.find(x => x.product_id === id);
    const name = p?.name || `#${id}`;
    if (!confirm(`Удалить продукт «${name}»?`)) return;
    try { await api(`/Warehouse/products/${id}`, 'DELETE'); showToast(`Продукт «${name}» удалён`); await loadWarehouse(); }
    catch (e) { showToast(e.message, true); }
}

function openAddBatch() {
    document.getElementById('batchForm').reset();
    document.getElementById('batchArrival').value = today();
    populateSelect('batchProduct', products.filter(p => p.is_active !== false), 'product_id', 'name');
    const sel = document.getElementById('batchWarehouse');
    sel.innerHTML = '<option value="">-- Выберите склад --</option>';
    warehouses.forEach(w => {
        const o = document.createElement('option');
        o.value = w.warehouse_id;
        o.textContent = w.warehouse_type || `Склад #${w.warehouse_id}`;
        sel.appendChild(o);
    });
    openModal('batchModal');
}

async function saveBatch(e) {
    e.preventDefault();
    const prodId = parseInt(document.getElementById('batchProduct').value);
    const whId = parseInt(document.getElementById('batchWarehouse').value);
    const qty = parseFloat(document.getElementById('batchQty').value);
    const arrival = document.getElementById('batchArrival').value;
    if (!prodId) { showToast('Выберите продукт', true); return; }
    if (!whId) { showToast('Выберите склад', true); return; }
    if (!arrival) { showToast('Укажите дату поступления', true); return; }
    if (!qty || qty <= 0) { showToast('Укажите количество больше 0', true); return; }
    try {
        const prodName = products.find(p => p.product_id === prodId)?.name || `#${prodId}`;
        await api('/Warehouse/batches', 'POST', {
            product_id: prodId, employee_id: currentUser.id, warehouse_id: whId, arrival_date: arrival,
            expiration_date: document.getElementById('batchExpiry').value || null,
            quantity: qty,
            purchase_price: parseFloat(document.getElementById('batchPrice').value) || null
        });
        showToast(`Партия «${prodName}» (${qty}) добавлена на склад`);
        closeModal('batchModal');
        await loadWarehouse();
    } catch (e) { showToast(e.message, true); }
}

function openAddExpense() {
    document.getElementById('expenseForm').reset();
    document.getElementById('expDate').value = today();
    const sel = document.getElementById('expBatch');
    sel.innerHTML = '<option value="">-- Выберите партию --</option>';
    batches.filter(b => !b.expiration_date || b.expiration_date >= today()).forEach(b => {
        const o = document.createElement('option');
        o.value = b.batch_id;
        o.textContent = `${b.product_name} (партия #${b.batch_id}, от ${fmtDateOnly(b.arrival_date)})`;
        sel.appendChild(o);
    });
    populateSelect('expCat', inShelterCats(), 'cat_id', catLabel);
    openModal('expenseModal');
}

async function saveExpense(e) {
    e.preventDefault();
    const batchId = parseInt(document.getElementById('expBatch').value);
    const catId = parseInt(document.getElementById('expCat').value);
    const qty = parseFloat(document.getElementById('expQty').value);
    const date = document.getElementById('expDate').value;
    if (!batchId) { showToast('Выберите партию', true); return; }
    if (!catId) { showToast('Выберите кошку', true); return; }
    if (!qty || qty <= 0) { showToast('Укажите количество больше 0', true); return; }
    if (!date) { showToast('Укажите дату', true); return; }
    try {
        const batch = batches.find(b => b.batch_id === batchId);
        const prodName = batch?.product_name || `партия #${batchId}`;
        const catName = cats.find(c => c.cat_id === catId)?.name || `#${catId}`;
        await api('/Warehouse/expenses', 'POST', {
            employee_id: currentUser.id, batch_id: batchId, cat_id: catId,
            expense_date: date, quantity: qty,
            notes: document.getElementById('expNotes').value.trim() || 'Кормление кошки'
        });
        showToast(`Записано кормление кошки «${catName}»: ${prodName} × ${qty}`);
        closeModal('expenseModal');
        await loadWarehouse();
    } catch (e) { showToast(e.message, true); }
}

// ===== ПРОЦЕДУРА → МЕДКАРТА =====
function openProcToMedModal(catId, date, typeName, result, notes) {
    procToMedCatId = catId;
    const mc = medCards.find(m => m.cat_id === catId);

    // Блок с данными процедуры
    const rows = [
        typeName && `<div class="ptm-row"><span class="ptm-lbl">Тип процедуры</span><span class="ptm-val">${typeName}</span></div>`,
        date     && `<div class="ptm-row"><span class="ptm-lbl">Дата</span><span class="ptm-val">${fmtDateOnly(date)}</span></div>`,
        result   && `<div class="ptm-row"><span class="ptm-lbl">Результат</span><span class="ptm-val">${result}</span></div>`,
        notes    && `<div class="ptm-row"><span class="ptm-lbl">Заметки</span><span class="ptm-val">${notes}</span></div>`,
    ].filter(Boolean);
    document.getElementById('ptmProcInfo').innerHTML = rows.length
        ? rows.join('')
        : '<span style="color:#95a5a6;font-size:13px">Результат и заметки не указаны</span>';

    // Форма: показать или скрыть в зависимости от наличия медкарты
    const formSection = document.getElementById('ptmFormSection');
    const noCardMsg = document.getElementById('ptmNoCardMsg');
    if (mc) {
        formSection.style.display = '';
        noCardMsg.style.display = 'none';
        document.getElementById('ptmDate').value = date || today();
        document.getElementById('ptmDiagnosis').value = result || '';
        document.getElementById('ptmPrescriptions').value = '';
        document.getElementById('ptmNotes').value = notes || '';
    } else {
        formSection.style.display = 'none';
        noCardMsg.style.display = '';
    }
    openModal('procToMedModal');
}

async function saveProcToMedRecord() {
    const mc = medCards.find(m => m.cat_id === procToMedCatId);
    if (!mc) { showToast('У кошки нет медкарты', true); closeModal('procToMedModal'); return; }
    const date = document.getElementById('ptmDate').value;
    if (!date) { showToast('Укажите дату', true); return; }
    try {
        await api('/MedicalCard/records', 'POST', {
            employee_id: currentUser.id,
            medical_card_id: mc.medical_card_id,
            record_date: date,
            diagnosis: document.getElementById('ptmDiagnosis').value.trim() || null,
            prescriptions: document.getElementById('ptmPrescriptions').value.trim() || null,
            notes: document.getElementById('ptmNotes').value.trim() || null
        });
        const catName = cats.find(c => c.cat_id === procToMedCatId)?.name || '';
        showToast(`Запись в медкарту кошки «${catName}» добавлена`);
        closeModal('procToMedModal');
        loadMedCards();
        if (currentDetailCatId === procToMedCatId) loadCageOverview();
    } catch (e) { showToast(e.message, true); }
}

// ===== КЛЕТКИ =====
async function loadCageOverview() {
    const container = document.getElementById('cagesOverview');
    if (!container) return;
    container.innerHTML = '<div class="loading-text">Загрузка...</div>';
    try {
        cageOverview = await api('/Cage/overview');
        renderCageOverview();
    } catch (e) {
        container.innerHTML = `<div class="loading-text" style="color:#e74c3c">${e.message}</div>`;
    }
}

function renderCageOverview() {
    const container = document.getElementById('cagesOverview');
    if (!container) return;
    if (!cageOverview.length) {
        container.innerHTML = '<div class="loading-text">Клеток не найдено</div>';
        return;
    }
    container.innerHTML = cageOverview.map(cage => {
        const pct = cage.capacity > 0 ? Math.round(cage.current_count / cage.capacity * 100) : 0;
        const isEmpty = cage.current_count === 0;
        const isFull = cage.available_spots <= 0;
        const barColor = isFull ? '#ff4d6d' : (pct >= 70 ? '#ffb700' : '#39ff14');

        const catsHtml = isEmpty
            ? '<div class="cage-empty-label">🐾 Свободно — ждём жильца</div>'
            : cage.cats.map(cat => {
                const gender = cat.gender === 'М' ? '♂' : cat.gender === 'Ж' ? '♀' : '';
                const details = [gender, cat.breed, cat.color].filter(Boolean).join(' · ');
                const diseaseHtml = cat.diagnosis
                    ? `<div class="disease-badge">🩺 ${cat.diagnosis}</div>`
                    : '';
                return `<div class="cage-cat-item">
                    <div class="cage-cat-info">
                        <span class="cage-cat-name">${cat.name || '—'}</span>
                        ${details ? `<span class="cage-cat-details">${details}</span>` : ''}
                        ${diseaseHtml}
                    </div>
                    <button class="btn-move" onclick="openMoveCat(${cat.cat_id})">↔ Переселить</button>
                </div>`;
            }).join('');

        return `<div class="cage-card${isEmpty ? ' cage-empty' : ''}${isFull ? ' cage-full' : ''}">
            <div class="cage-card-header">
                <div class="cage-card-title">
                    <span class="cage-number">Кл. ${cage.number}</span>
                    ${cage.cage_type ? `<span class="cage-type-label">${cage.cage_type}</span>` : ''}
                    ${isEmpty ? '<span class="badge badge-grey" style="font-size:11px">Пустая</span>' : ''}
                    ${isFull ? '<span class="badge badge-red" style="font-size:11px">Заполнена</span>' : ''}
                </div>
                <div class="cage-capacity-info">
                    <span class="cage-capacity-nums">${cage.current_count} / ${cage.capacity}</span>
                    <span class="cage-spots-label">${cage.available_spots > 0 ? `свободно: ${cage.available_spots}` : 'мест нет'}</span>
                </div>
            </div>
            <div class="cage-progress-wrap">
                <div class="cage-progress-bar" style="width:${pct}%;background:${barColor}"></div>
            </div>
            <div class="cage-cats-list">${catsHtml}</div>
        </div>`;
    }).join('');
}

function openMoveCat(catId) {
    movingCatId = catId;
    let cat = null;
    let currentCage = null;
    for (const cage of cageOverview) {
        const found = cage.cats.find(c => c.cat_id === catId);
        if (found) { cat = found; currentCage = cage; break; }
    }
    if (!cat || !currentCage) return;

    document.getElementById('moveCatTitle').textContent = `Переселить: ${cat.name || '#' + catId}`;
    const details = [cat.breed, cat.color].filter(Boolean).join(', ');
    document.getElementById('moveCatInfo').textContent = `${cat.name || '—'}${details ? ' (' + details + ')' : ''}`;
    document.getElementById('moveFromCage').textContent =
        `Кл. ${currentCage.number} — ${currentCage.current_count}/${currentCage.capacity}${currentCage.cage_type ? ' · ' + currentCage.cage_type : ''}`;
    document.getElementById('errMoveToCage').textContent = '';

    const sel = document.getElementById('moveToCage');
    sel.innerHTML = '<option value="">-- Выберите клетку --</option>';
    cageOverview.forEach(cage => {
        if (cage.cage_id === currentCage.cage_id) return;
        const opt = document.createElement('option');
        opt.value = cage.cage_id;
        const avail = cage.available_spots;
        const full = avail <= 0;
        opt.textContent = `Кл. ${cage.number}${cage.cage_type ? ' · ' + cage.cage_type : ''} — ${cage.current_count}/${cage.capacity}${full ? ' (заполнена)' : ' (свободно: ' + avail + ')'}`;
        if (full) opt.disabled = true;
        sel.appendChild(opt);
    });

    openModal('moveCatModal');
}

async function confirmMoveCat() {
    const newCageId = parseInt(document.getElementById('moveToCage').value);
    if (!newCageId) { document.getElementById('errMoveToCage').textContent = 'Выберите клетку'; return; }
    document.getElementById('errMoveToCage').textContent = '';
    try {
        let catName = `#${movingCatId}`;
        for (const cage of cageOverview) {
            const found = cage.cats.find(c => c.cat_id === movingCatId);
            if (found) { catName = found.name || catName; break; }
        }
        const targetCage = cageOverview.find(c => c.cage_id === newCageId);
        await api('/Cage/move', 'POST', { cat_id: movingCatId, new_cage_id: newCageId });
        showToast(`Кошка «${catName}» переселена в клетку №${targetCage?.number || newCageId}`);
        closeModal('moveCatModal');
        await Promise.all([loadCageOverview(), loadCats()]);
    } catch (e) { showToast(e.message, true); }
}

// ===== ===== КАРТОЧКА КОШКИ ===== =====

function switchDetailTab(tabId, btn) {
    document.querySelectorAll('.detail-tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.detail-content').forEach(c => c.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(tabId).classList.add('active');
}

function inShelterCats() {
    return cats.filter(c => isActiveStatus(c.status_name));
}

function populateBatchSelect(selId, categories = null) {
    const sel = document.getElementById(selId);
    sel.innerHTML = '<option value="">-- Выберите партию --</option>';
    let list = categories ? batches.filter(b => categories.includes(b.category)) : batches;
    list = list.filter(b => b.product_is_active !== false);
    list = list.filter(b => !b.expiration_date || b.expiration_date >= today());
    list.forEach(b => {
        const o = document.createElement('option');
        o.value = b.batch_id;
        o.textContent = `${b.product_name} (партия #${b.batch_id}, от ${fmtDateOnly(b.arrival_date)})`;
        sel.appendChild(o);
    });
}

function fillConsumptionBlock(typeName, blockId, normInfoId, expBatchId, expQtyId) {
    const block = document.getElementById(blockId);
    const normInfo = document.getElementById(normInfoId);
    const expBatch = document.getElementById(expBatchId);

    if (!typeName) { block.style.display = 'none'; return; }
    const type = procTypes.find(t => t.procedure_type_name === typeName);
    const rates = type?.consumption_rates || [];
    if (!rates.length) { block.style.display = 'none'; return; }

    block.style.display = 'block';
    normInfo.innerHTML = '📊 Норма расхода: ' + rates.map(r =>
        `<span class="consumption-norm-item">${r.product_name} — ${r.standard_quantity} ${r.unit || 'ед.'}</span>`
    ).join(' · ');

    expBatch.innerHTML = '<option value="">-- Партия (необязательно) --</option>';
    rates.forEach(r => {
        const matching = batches.filter(b => b.product_id === r.product_id && b.product_is_active !== false && (!b.expiration_date || b.expiration_date >= today()));
        matching.forEach(b => {
            const o = document.createElement('option');
            o.value = b.batch_id;
            o.dataset.normQty = r.standard_quantity;
            o.textContent = `${b.product_name} (партия #${b.batch_id}, от ${fmtDateOnly(b.arrival_date)})`;
            expBatch.appendChild(o);
        });
    });
    expBatch.onchange = () => {
        const opt = expBatch.selectedOptions[0];
        if (opt?.dataset.normQty) document.getElementById(expQtyId).value = opt.dataset.normQty;
    };
}

function onProcTypeChange() {
    fillConsumptionBlock(
        document.getElementById('dp-type').value,
        'dp-consumption-block', 'dp-norm-info', 'dp-exp-batch', 'dp-exp-qty'
    );
}

function onProcTypeChangePR() {
    fillConsumptionBlock(
        document.getElementById('prType').value,
        'pr-consumption-block', 'pr-norm-info', 'pr-exp-batch', 'pr-exp-qty'
    );
}

async function openCatDetail(catId) {
    currentDetailCatId = catId;
    const cat = cats.find(c => c.cat_id === catId);
    if (!cat) return;

    // Заголовок и информационная строка
    document.getElementById('catDetailTitle').textContent = cat.name || `Кошка #${catId}`;
    const gender = cat.gender === 'М' ? '♂ Кот' : cat.gender === 'Ж' ? '♀ Кошка' : '';
    document.getElementById('catInfoBar').innerHTML = [
        cat.breed && `<span>🐾 ${cat.breed}</span>`,
        gender && `<span>${gender}</span>`,
        cat.color && `<span>🎨 ${cat.color}</span>`,
        cat.cage_number && `<span>🏠 Кл. ${cat.cage_number}</span>`,
        cat.status_name && `<span>${statusBadge(cat.status_name)}</span>`,
        cat.birth_date && `<span>🗓 ${fmtDateOnly(cat.birth_date)}</span>`
    ].filter(Boolean).join('');

    // Сбросить на первый таб
    document.querySelectorAll('.detail-tab-btn').forEach((b, i) => b.classList.toggle('active', i === 0));
    document.querySelectorAll('.detail-content').forEach((c, i) => c.classList.toggle('active', i === 0));

    // Проверка: кошка в приюте?
    const inShelter = isActiveStatus(cat.status_name);
    document.getElementById('detProcForm').style.display = inShelter ? '' : 'none';
    document.getElementById('detProcLocked').style.display = inShelter ? 'none' : '';
    document.getElementById('detFeedForm').style.display = inShelter ? '' : 'none';
    document.getElementById('detFeedLocked').style.display = inShelter ? 'none' : '';
    document.getElementById('detInvForm').style.display = inShelter ? '' : 'none';
    document.getElementById('detInvLocked').style.display = inShelter ? 'none' : '';
    document.getElementById('detVolForm').style.display = inShelter ? '' : 'none';
    document.getElementById('detVolLocked').style.display = inShelter ? 'none' : '';

    if (inShelter) {
        // Сброс форм
        document.getElementById('dp-date').value = today();
        document.getElementById('df-date').value = today();
        document.getElementById('dv-start').value = today();
        document.getElementById('dp-type').value = '';
        document.getElementById('dp-result').value = '';
        document.getElementById('dp-notes').value = '';
        document.getElementById('df-notes').value = '';
        document.getElementById('df-qty').value = '';
        document.getElementById('di-type').value = '';
        document.getElementById('di-qty').value = '';
        document.getElementById('di-notes').value = '';
        document.getElementById('di-date').value = today();
        document.getElementById('dv-end').value = '';
        document.getElementById('dp-consumption-block').style.display = 'none';

        populateSelect('dp-type', procTypes, 'procedure_type_name', 'procedure_type_name');
        populateBatchSelect('df-batch', ['Корм', 'Лакомство']);
        populateBatchSelect('di-batch', ['Наполнитель', 'Инвентарь']);
        populateBatchSelect('dp-exp-batch');

        // Волонтёры — убрать уже активно закреплённых
        const assignedVolIds = new Set(
            cares.filter(c => c.cat_id === catId && !c.end_date).map(c => c.volunteer_id)
        );
        const availVols = volunteers.filter(v => !assignedVolIds.has(v.volunteer_id));
        populateSelect('dv-volunteer', availVols, 'volunteer_id', 'full_name');
    }

    // Рендер существующих записей
    renderDetailProc(catId);
    renderDetailFeed(catId);
    renderDetailInventory(catId);
    renderDetailVols(catId);

    openModal('catDetailModal');
}

function renderDetailProc(catId) {
    const list = document.getElementById('detProcList');
    const recs = procRecords.filter(r => r.cat_id === catId);
    if (!recs.length) {
        list.innerHTML = '<div class="loading-text" style="padding:16px">Процедур пока нет</div>';
        return;
    }
    list.innerHTML = recs.map(r => {
        const safeName = (r.procedure_type_name || '').replace(/'/g, "\\'");
        const date = normDate(r.procedure_date);
        const canDelete = r.employee_id === currentUser?.id;
        return `
        <div class="detail-record-card proc">
            <div class="rec-main">
                <div class="rec-date">${fmtDateOnly(r.procedure_date)} · ${r.procedure_type_name}</div>
                <div class="rec-sub">
                    👤 ${r.employee_name || '—'}
                    ${r.result ? ` · Результат: ${r.result}` : ''}
                    ${r.notes ? `<br>📝 ${r.notes}` : ''}
                </div>
            </div>
            <div class="rec-actions">
                ${canDelete ? `<button class="btn-delete" onclick="deleteDetailProc(${r.employee_id},'${safeName}',${r.cat_id},'${date}')" title="Удалить">🗑</button>` : ''}
            </div>
        </div>`;
    }).join('');
}

const FOOD_CATEGORIES = ['Корм', 'Лакомство'];
const INV_CATEGORIES = ['Наполнитель', 'Инвентарь'];

function getBatchCategory(batchId) {
    return batches.find(b => b.batch_id === batchId)?.category || null;
}

function renderDetailFeed(catId) {
    const list = document.getElementById('detFeedList');
    const recs = expenses.filter(e => {
        if (e.cat_id !== catId) return false;
        return FOOD_CATEGORIES.includes(getBatchCategory(e.batch_id));
    });
    if (!recs.length) {
        list.innerHTML = '<div class="loading-text" style="padding:16px">Записей о кормлении пока нет</div>';
        return;
    }
    list.innerHTML = recs.map(e => {
        const date = normDate(e.expense_date);
        const canDelete = e.employee_id === currentUser?.id;
        return `
        <div class="detail-record-card feed">
            <div class="rec-main">
                <div class="rec-date">${fmtDateOnly(e.expense_date)} · ${e.product_name}</div>
                <div class="rec-sub">
                    📦 ${parseFloat(e.quantity)} ${e.unit || ''}
                    · 👤 ${e.employee_name || '—'}
                    ${e.notes ? `<br>📝 ${e.notes}` : ''}
                </div>
            </div>
            <div class="rec-actions">
                ${canDelete ? `<button class="btn-delete" onclick="deleteDetailExpense(${e.employee_id},${e.batch_id},${e.cat_id},'${date}')" title="Удалить">🗑</button>` : ''}
            </div>
        </div>`;
    }).join('');
}

function renderDetailInventory(catId) {
    const list = document.getElementById('detInvList');
    const recs = expenses.filter(e => {
        if (e.cat_id !== catId) return false;
        const cat = getBatchCategory(e.batch_id);
        return cat && INV_CATEGORIES.includes(cat);
    });
    if (!recs.length) {
        list.innerHTML = '<div class="loading-text" style="padding:16px">Записей об инвентаре пока нет</div>';
        return;
    }
    list.innerHTML = recs.map(e => {
        const isReplace = e.notes && e.notes.startsWith('Замена:');
        const badge = isReplace
            ? '<span class="badge badge-orange" style="margin-left:6px">Замена</span>'
            : '<span class="badge badge-green" style="margin-left:6px">Выдача</span>';
        const notes = isReplace ? (e.notes.replace(/^Замена:\s*/, '') || null) : e.notes;
        const date = normDate(e.expense_date);
        const canDelete = e.employee_id === currentUser?.id;
        return `
        <div class="detail-record-card feed">
            <div class="rec-main">
                <div class="rec-date">${fmtDateOnly(e.expense_date)} · ${e.product_name}${badge}</div>
                <div class="rec-sub">
                    📦 ${parseFloat(e.quantity)} ${e.unit || ''}
                    · 👤 ${e.employee_name || '—'}
                    ${notes ? `<br>📝 ${notes}` : ''}
                </div>
            </div>
            <div class="rec-actions">
                ${canDelete ? `<button class="btn-delete" onclick="deleteDetailExpense(${e.employee_id},${e.batch_id},${e.cat_id},'${date}')" title="Удалить">🗑</button>` : ''}
            </div>
        </div>`;
    }).join('');
}

function renderDetailVols(catId) {
    const list = document.getElementById('detVolList');
    const recs = cares.filter(c => c.cat_id === catId);
    if (!recs.length) {
        list.innerHTML = '<div class="loading-text" style="padding:16px">Волонтёры не закреплены</div>';
        return;
    }
    list.innerHTML = recs.map(c => {
        const active = !c.end_date;
        return `
        <div class="detail-record-card vol ${active ? '' : 'ended'}">
            <div class="rec-main">
                <div class="rec-date">
                    🤝 ${c.volunteer_name || '—'}
                    ${active ? '<span class="badge badge-green" style="margin-left:6px">Активен</span>' : '<span class="badge badge-grey" style="margin-left:6px">Завершён</span>'}
                </div>
                <div class="rec-sub">
                    С ${fmtDateOnly(c.start_date)}
                    ${c.end_date ? ` по ${fmtDateOnly(c.end_date)}` : ' (по настоящее время)'}
                </div>
            </div>
            <div class="rec-actions">
                ${active ? `<button class="btn-xs btn-xs-orange"
                    onclick="endDetailCare(${c.volunteer_id},${c.cat_id})">Завершить</button>` : ''}
                
            </div>
        </div>`;
    }).join('');
}

async function addDetailProcedure() {
    const typeName = document.getElementById('dp-type').value;
    const date = document.getElementById('dp-date').value;
    if (!typeName || !date) { showToast('Выберите тип и дату', true); return; }
    if (!validateProcGenderAndSterilized(currentDetailCatId, typeName)) return;
    const result = document.getElementById('dp-result').value.trim() || null;
    const notes = document.getElementById('dp-notes').value.trim() || null;
    const expBatchId = parseInt(document.getElementById('dp-exp-batch').value) || null;
    const expQty = parseFloat(document.getElementById('dp-exp-qty').value) || null;
    try {
        const cat = cats.find(c => c.cat_id === currentDetailCatId);
        await api('/Procedure/records', 'POST', {
            employee_id: currentUser.id,
            procedure_type_name: typeName,
            cat_id: currentDetailCatId,
            procedure_date: date,
            result, notes
        });
        // Записать фактический расход если указан
        if (expBatchId && expQty) {
            const batch = batches.find(b => b.batch_id === expBatchId);
            await api('/Warehouse/expenses', 'POST', {
                employee_id: currentUser.id,
                batch_id: expBatchId,
                cat_id: currentDetailCatId,
                expense_date: date,
                quantity: expQty,
                notes: `Расход при процедуре: ${typeName}`
            });
            showToast(`Процедура «${typeName}» добавлена кошке «${cat?.name || ''}» · расход ${batch?.product_name || ''} × ${expQty} записан`);
        } else {
            showToast(`Процедура «${typeName}» добавлена кошке «${cat?.name || ''}»`);
        }
        // Оптимистичный рендер — сразу показать запись
        procRecords.unshift({
            employee_id: currentUser.id, employee_name: currentUser.name,
            procedure_type_name: typeName, cat_id: currentDetailCatId,
            procedure_date: date, result, notes
        });
        renderDetailProc(currentDetailCatId);
        // Сброс формы
        document.getElementById('dp-type').value = '';
        document.getElementById('dp-result').value = '';
        document.getElementById('dp-notes').value = '';
        document.getElementById('dp-exp-batch').value = '';
        document.getElementById('dp-exp-qty').value = '';
        document.getElementById('dp-consumption-block').style.display = 'none';
        // Предложить добавить запись в медкарту
        openProcToMedModal(currentDetailCatId, date, typeName, result, notes);
        updateMedCardAfterProc(currentDetailCatId, typeName);
        // Фоновая синхронизация
        loadProcedures().then(() => renderDetailProc(currentDetailCatId));
        if (expBatchId) loadWarehouse();
    } catch (e) { showToast(e.message, true); }
}

async function addDetailExpense() {
    const batchId = parseInt(document.getElementById('df-batch').value);
    const qty = parseFloat(document.getElementById('df-qty').value);
    const date = document.getElementById('df-date').value;
    if (!batchId || !qty || !date) { showToast('Заполните обязательные поля', true); return; }
    const notes = document.getElementById('df-notes').value.trim() || 'Кормление кошки';
    try {
        const cat = cats.find(c => c.cat_id === currentDetailCatId);
        const batch = batches.find(b => b.batch_id === batchId);
        await api('/Warehouse/expenses', 'POST', {
            employee_id: currentUser.id, batch_id: batchId,
            cat_id: currentDetailCatId, expense_date: date, quantity: qty, notes
        });
        showToast(`Кормление кошки «${cat?.name || ''}»: ${batch?.product_name || ''} × ${qty} записано`);
        // Оптимистичный рендер
        expenses.unshift({
            employee_id: currentUser.id, employee_name: currentUser.name,
            batch_id: batchId, product_name: batch?.product_name || '',
            unit: batch?.unit || '', cat_id: currentDetailCatId,
            cat_name: cat?.name || '', cat_breed: cat?.breed || '', cat_color: cat?.color || '',
            expense_date: date, quantity: qty, notes
        });
        renderDetailFeed(currentDetailCatId);
        // Сброс формы
        document.getElementById('df-qty').value = '';
        document.getElementById('df-notes').value = '';
        // Фоновая синхронизация
        loadWarehouse().then(() => renderDetailFeed(currentDetailCatId));
    } catch (e) { showToast(e.message, true); }
}

async function addDetailInventory() {
    const batchId = parseInt(document.getElementById('di-batch').value);
    const qty = parseFloat(document.getElementById('di-qty').value);
    const date = document.getElementById('di-date').value;
    if (!batchId || !qty || !date) { showToast('Заполните обязательные поля', true); return; }
    const action = document.getElementById('di-type').value;
    const rawNotes = document.getElementById('di-notes').value.trim();
    const notes = action === 'Замена' ? `Замена:${rawNotes ? ' ' + rawNotes : ''}` : rawNotes || null;
    try {
        const cat = cats.find(c => c.cat_id === currentDetailCatId);
        const batch = batches.find(b => b.batch_id === batchId);
        await api('/Warehouse/expenses', 'POST', {
            employee_id: currentUser.id, batch_id: batchId,
            cat_id: currentDetailCatId, expense_date: date, quantity: qty, notes
        });
        const label = action === 'Замена' ? 'Замена' : 'Выдача';
        showToast(`${label}: ${batch?.product_name || ''} × ${qty} для кошки «${cat?.name || ''}» записана`);
        expenses.unshift({
            employee_id: currentUser.id, employee_name: currentUser.name,
            batch_id: batchId, product_name: batch?.product_name || '',
            unit: batch?.unit || '', cat_id: currentDetailCatId,
            cat_name: cat?.name || '', cat_breed: cat?.breed || '', cat_color: cat?.color || '',
            expense_date: date, quantity: qty, notes
        });
        renderDetailInventory(currentDetailCatId);
        document.getElementById('di-qty').value = '';
        document.getElementById('di-notes').value = '';
        document.getElementById('di-type').value = '';
        loadWarehouse().then(() => renderDetailInventory(currentDetailCatId));
    } catch (e) { showToast(e.message, true); }
}

async function addDetailVolunteer() {
    const volId = parseInt(document.getElementById('dv-volunteer').value);
    const start = document.getElementById('dv-start').value;
    const endDate = document.getElementById('dv-end').value || null;
    if (!volId || !start) { showToast('Выберите волонтёра и дату начала', true); return; }
    try {
        const cat = cats.find(c => c.cat_id === currentDetailCatId);
        const vol = volunteers.find(v => v.volunteer_id === volId);
        await api('/Volunteer/cares', 'POST', {
            volunteer_id: volId, cat_id: currentDetailCatId,
            start_date: start, end_date: endDate
        });
        showToast(`Волонтёр «${vol?.full_name || ''}» закреплён за кошкой «${cat?.name || ''}»`);
        // Оптимистичный рендер
        cares.push({
            volunteer_id: volId, volunteer_name: vol?.full_name || '',
            cat_id: currentDetailCatId, cat_name: cat?.name || '',
            start_date: start, end_date: endDate
        });
        renderDetailVols(currentDetailCatId);
        // Убрать волонтёра из дропдауна
        const sel = document.getElementById('dv-volunteer');
        const opt = sel.querySelector(`option[value="${volId}"]`);
        if (opt) opt.remove();
        sel.value = '';
        document.getElementById('dv-end').value = '';
        // Фоновая синхронизация
        loadVolunteers().then(() => {
            const assignedVolIds = new Set(
                cares.filter(c => c.cat_id === currentDetailCatId && !c.end_date).map(c => c.volunteer_id)
            );
            const availVols = volunteers.filter(v => !assignedVolIds.has(v.volunteer_id));
            populateSelect('dv-volunteer', availVols, 'volunteer_id', 'full_name');
            renderDetailVols(currentDetailCatId);
        });
    } catch (e) { showToast(e.message, true); }
}

async function deleteDetailProc(empId, typeName, catId, date) {
    if (!confirm(`Удалить запись о процедуре «${typeName}»?`)) return;
    try {
        await api(`/Procedure/records/${empId}/${encodeURIComponent(typeName)}/${catId}/${date}`, 'DELETE');
        showToast(`Запись о процедуре «${typeName}» удалена`);
        await loadProcedures();
        renderDetailProc(currentDetailCatId);
    } catch (e) { showToast(e.message, true); }
}

async function deleteDetailExpense(empId, batchId, catId, date) {
    if (!confirm('Удалить запись о расходе?')) return;
    try {
        await api(`/Warehouse/expenses/${empId}/${batchId}/${catId}/${date}`, 'DELETE');
        await loadWarehouse();
        renderDetailFeed(catId);
        renderDetailInventory(catId);
        showToast('Запись удалена');
    } catch (e) { showToast(e.message, true); }
}

async function endDetailCare(volId, catId) {
    const c = cares.find(x => x.volunteer_id === volId && x.cat_id === catId);
    if (!c) return;
    const volName = c.volunteer_name || '';
    const catNameStr = c.cat_name || '';
    try {
        await api(`/Volunteer/cares/${volId}/${catId}`, 'PUT', {
            volunteer_id: volId, cat_id: catId,
            start_date: c.start_date, end_date: today()
        });
        showToast(`Уход волонтёра «${volName}» за кошкой «${catNameStr}» завершён`);
        await loadVolunteers();
        renderDetailVols(currentDetailCatId);
        // Обновить список доступных волонтёров
        const assignedVolIds = new Set(
            cares.filter(c => c.cat_id === currentDetailCatId && !c.end_date).map(c => c.volunteer_id)
        );
        const availVols = volunteers.filter(v => !assignedVolIds.has(v.volunteer_id));
        populateSelect('dv-volunteer', availVols, 'volunteer_id', 'full_name');
    } catch (e) { showToast(e.message, true); }
}

async function deleteDetailCare(volId, catId) {
    const c = cares.find(x => x.volunteer_id === volId && x.cat_id === catId);
    const label = c ? `«${c.volunteer_name}» — «${c.cat_name}»` : '';
    if (!confirm(`Удалить запись об уходе ${label}?`)) return;
    try {
        await api(`/Volunteer/cares/${volId}/${catId}`, 'DELETE');
        showToast(`Запись об уходе ${label} удалена`);
        await loadVolunteers();
        renderDetailVols(currentDetailCatId);
    } catch (e) { showToast(e.message, true); }
}

// ===== ЗАДАЧИ =====

const MONTH_SHORT = ['янв','фев','мар','апр','мая','июн','июл','авг','сен','окт','ноя','дек'];
const DAY_SHORT   = ['Вс','Пн','Вт','Ср','Чт','Пт','Сб'];

function normDate(d) { return d ? String(d).split('T')[0] : ''; }

function getWeekDates(offset = 0) {
    const now = new Date();
    const dow = now.getDay();
    const monday = new Date(now);
    monday.setDate(now.getDate() - (dow === 0 ? 6 : dow - 1) + offset * 7);
    return Array.from({length: 7}, (_, i) => {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        return d.toISOString().split('T')[0];
    });
}

function getWeekLabel(dates) {
    const f = s => { const d = new Date(s + 'T12:00:00'); return `${d.getDate()} ${MONTH_SHORT[d.getMonth()]}`; };
    return `${f(dates[0])} — ${f(dates[6])} ${new Date(dates[0] + 'T12:00:00').getFullYear()}`;
}

function prevWeek() { taskWeekOffset--; expandedDays.clear(); renderTasksBoard(); }
function nextWeek() { taskWeekOffset++; expandedDays.clear(); renderTasksBoard(); }

function loadCatFoodPrefs() {
    try { catFoodPrefs = JSON.parse(localStorage.getItem('shelter_catFoodPrefs') || '{}'); }
    catch { catFoodPrefs = {}; }
}
function saveCatFoodPrefs() {
    localStorage.setItem('shelter_catFoodPrefs', JSON.stringify(catFoodPrefs));
}

function getLitterBatchId() {
    const saved = parseInt(localStorage.getItem('shelter_litterBatchId') || '0');
    if (saved && batches.find(b => b.batch_id === saved && (!b.expiration_date || b.expiration_date >= today()))) return saved;
    return batches.find(b => b.category === 'Наполнитель' && (!b.expiration_date || b.expiration_date >= today()))?.batch_id || null;
}
function saveLitterBatch(val) {
    localStorage.setItem('shelter_litterBatchId', val || '0');
}
function populateLitterBatchSelect() {
    const sel = document.getElementById('litterBatchSel');
    if (!sel) return;
    const current = getLitterBatchId();
    sel.innerHTML = '<option value="">— выберите партию —</option>' +
        batches.filter(b => b.category === 'Наполнитель' && (!b.expiration_date || b.expiration_date >= today()))
               .map(b => `<option value="${b.batch_id}"${b.batch_id === current ? ' selected' : ''}>${b.product_name} (пар. #${b.batch_id})</option>`).join('');
}
function getCatFoodBatchId(catId) {
    const pref = catFoodPrefs[catId];
    if (pref?.batchId && batches.find(b => b.batch_id === pref.batchId)) return pref.batchId;
    return batches.find(b => FOOD_CATEGORIES.includes(b.category))?.batch_id || null;
}
function getCatFoodQty(catId) {
    return catFoodPrefs[catId]?.qty ?? 0.3;
}
function updateCatFoodPref(catId, batchId, qty) {
    if (!catFoodPrefs[catId]) catFoodPrefs[catId] = { batchId: null, qty: 0.3 };
    if (batchId != null) catFoodPrefs[catId].batchId = batchId;
    if (qty   != null) catFoodPrefs[catId].qty = qty;
    saveCatFoodPrefs();
}

// --- Status checks ---
function isInspectedThisWeek(catId, weekDates) {
    return procRecords.some(r =>
        r.cat_id === catId &&
        r.procedure_type_name === 'Осмотр' &&
        weekDates.includes(normDate(r.procedure_date))
    );
}
function isLitterChangedThisWeek(catId, weekDates) {
    return expenses.some(e =>
        e.cat_id === catId &&
        weekDates.includes(normDate(e.expense_date)) &&
        e.notes === 'Замена наполнителя'
    );
}
function isFedOnDate(catId, date) {
    return expenses.some(e =>
        e.cat_id === catId &&
        normDate(e.expense_date) === date &&
        FOOD_CATEGORIES.includes(getBatchCategory(e.batch_id))
    );
}

// --- Render ---
function renderTasksBoard() {
    const weekDates = getWeekDates(taskWeekOffset);
    document.getElementById('weekLabel').textContent = getWeekLabel(weekDates);
    const inShelter = cats.filter(c => isActiveStatus(c.status_name));
    populateLitterBatchSelect();
    renderWeeklyInspection(inShelter, weekDates);
    renderWeeklyLitter(inShelter, weekDates);
    renderDailyFeeding(inShelter, weekDates);
}

function renderWeeklyInspection(catsList, weekDates) {
    const done = catsList.filter(c => isInspectedThisWeek(c.cat_id, weekDates)).length;
    document.getElementById('inspectionProgress').textContent = `${done}/${catsList.length}`;
    document.getElementById('inspectionProgress').className =
        'task-progress-badge' + (done === catsList.length && catsList.length > 0 ? ' progress-done' : '');

    const el = document.getElementById('inspectionList');
    if (!catsList.length) { el.innerHTML = '<div class="task-empty">Нет кошек в приюте</div>'; return; }
    el.innerHTML = catsList.map(cat => {
        const done = isInspectedThisWeek(cat.cat_id, weekDates);
        const rec = done ? procRecords.find(r =>
            r.cat_id === cat.cat_id && r.procedure_type_name === 'Осмотр' &&
            weekDates.includes(normDate(r.procedure_date))) : null;
        const isOther = done && rec && rec.employee_id !== currentUser?.id;
        return `<div class="task-item ${done ? 'task-done' : ''}">
            <label class="task-check-label">
                <input type="checkbox" class="task-checkbox" ${done ? 'checked' : ''}
                    ${isOther ? 'disabled title="Поставлено другим сотрудником"' : `onchange="toggleInspection(${cat.cat_id}, this)"`}>
                <span class="task-cat-name">${catInfoText(cat.name, cat.breed, cat.color)}</span>
            </label>
            ${rec ? `<button class="task-med-btn" title="Добавить в медкарту"
                onclick="openProcToMedModal(${cat.cat_id},'${normDate(rec.procedure_date)}','Осмотр',null,'Еженедельный осмотр')">📋</button>` : ''}
        </div>`;
    }).join('');
}

function renderWeeklyLitter(catsList, weekDates) {
    const done = catsList.filter(c => isLitterChangedThisWeek(c.cat_id, weekDates)).length;
    document.getElementById('litterProgress').textContent = `${done}/${catsList.length}`;
    document.getElementById('litterProgress').className =
        'task-progress-badge' + (done === catsList.length && catsList.length > 0 ? ' progress-done' : '');

    const el = document.getElementById('litterList');
    if (!catsList.length) { el.innerHTML = '<div class="task-empty">Нет кошек в приюте</div>'; return; }
    el.innerHTML = catsList.map(cat => {
        const done = isLitterChangedThisWeek(cat.cat_id, weekDates);
        const exp = done ? expenses.find(e =>
            e.cat_id === cat.cat_id && weekDates.includes(normDate(e.expense_date)) &&
            e.notes === 'Замена наполнителя') : null;
        const isOther = done && exp && exp.employee_id !== currentUser?.id;
        return `<div class="task-item ${done ? 'task-done' : ''}">
            <label class="task-check-label">
                <input type="checkbox" class="task-checkbox" ${done ? 'checked' : ''}
                    ${isOther ? 'disabled title="Поставлено другим сотрудником"' : `onchange="toggleLitter(${cat.cat_id}, this)"`}>
                <span class="task-cat-name">${catInfoText(cat.name, cat.breed, cat.color)}</span>
            </label>
        </div>`;
    }).join('');
}

function renderDailyFeeding(catsList, weekDates) {
    const el = document.getElementById('dailyFeedingList');
    const catIds = catsList.map(c => c.cat_id);
    el.innerHTML = weekDates.map(date => {
        const d = new Date(date + 'T12:00:00');
        const dayName = `${DAY_SHORT[d.getDay()]}, ${d.getDate()} ${MONTH_SHORT[d.getMonth()]}`;
        const fedCount = catIds.filter(id => isFedOnDate(id, date)).length;
        const allFed = catsList.length > 0 && fedCount === catsList.length;
        const isExpanded = expandedDays.has(date);
        const isToday = date === today();
        return `
        <div class="daily-day-card${isToday ? ' day-today' : ''}${allFed ? ' day-all-fed' : ''}">
            <div class="daily-day-header" onclick="toggleDay('${date}')">
                <div class="daily-day-left">
                    <span class="daily-day-name">${dayName}</span>
                    ${isToday ? '<span class="badge badge-purple" style="margin-left:8px;font-size:10px">сегодня</span>' : ''}
                </div>
                <div class="daily-day-right">
                    <span class="daily-feed-count ${allFed ? 'count-all' : ''}">${fedCount}/${catsList.length} покормлено</span>
                    ${allFed ? '<span class="day-done-mark">✓</span>' : ''}
                    <span class="expand-icon">${isExpanded ? '▲' : '▼'}</span>
                </div>
            </div>
            ${isExpanded ? renderDayFeedingBody(catsList, date) : ''}
        </div>`;
    }).join('');
}

function renderDayFeedingBody(catsList, date) {
    if (!catsList.length) return '<div class="task-empty" style="padding:16px">Нет кошек в приюте</div>';
    const foodBatches = batches.filter(b => FOOD_CATEGORIES.includes(b.category) && (!b.expiration_date || b.expiration_date >= today()));
    return `<div class="day-feeding-body">
        <div class="day-feeding-thead">
            <span>Кошка</span><span>Корм</span><span>Кол-во</span><span>Покормлена</span>
        </div>
        ${catsList.map(cat => {
            const fed = isFedOnDate(cat.cat_id, date);
            const feedExp = fed ? expenses.find(e =>
                e.cat_id === cat.cat_id && normDate(e.expense_date) === date &&
                FOOD_CATEGORIES.includes(getBatchCategory(e.batch_id))) : null;
            const isOther = fed && feedExp && feedExp.employee_id !== currentUser?.id;
            const prefBatch = getCatFoodBatchId(cat.cat_id);
            const prefQty   = getCatFoodQty(cat.cat_id);
            const opts = foodBatches.map(b =>
                `<option value="${b.batch_id}"${b.batch_id === prefBatch ? ' selected' : ''}>${b.product_name}</option>`
            ).join('');
            return `<div class="day-feeding-row${fed ? ' row-fed' : ''}">
                <span class="feed-cat-name">🐱 ${catInfoText(cat.name, cat.breed, cat.color)}</span>
                <select class="feed-batch-sel" onchange="updateCatFoodPref(${cat.cat_id},parseInt(this.value),null)">
                    ${opts || '<option value="">— нет корма —</option>'}
                </select>
                <div class="feed-qty-wrap">
                    <input type="number" class="feed-qty-input" value="${prefQty}"
                        step="0.1" min="0.1" onchange="updateCatFoodPref(${cat.cat_id},null,parseFloat(this.value))">
                    <span class="feed-qty-unit">кг</span>
                </div>
                <label class="task-check-label">
                    <input type="checkbox" class="task-checkbox"${fed ? ' checked' : ''}
                        ${isOther ? 'disabled title="Поставлено другим сотрудником"' : `onchange="toggleFeeding(${cat.cat_id},'${date}',this)"`}>
                </label>
            </div>`;
        }).join('')}
    </div>`;
}

function toggleDay(date) {
    if (expandedDays.has(date)) expandedDays.delete(date);
    else expandedDays.add(date);
    renderTasksBoard();
}

// --- Toggle actions ---
async function toggleInspection(catId, checkbox) {
    const weekDates = getWeekDates(taskWeekOffset);
    const catName = cats.find(c => c.cat_id === catId)?.name || `#${catId}`;
    if (checkbox.checked) {
        try {
            if (!procTypes.find(t => t.procedure_type_name === 'Осмотр')) {
                await api('/Procedure/types', 'POST', { procedure_type_name: 'Осмотр', description: 'Базовый еженедельный осмотр' });
                procTypes.push({ procedure_type_name: 'Осмотр', description: '', consumption_rates: [] });
            }
            const date = today();
            await api('/Procedure/records', 'POST', {
                employee_id: currentUser.id, procedure_type_name: 'Осмотр',
                cat_id: catId, procedure_date: date, result: null, notes: 'Еженедельный осмотр'
            });
            procRecords.unshift({ employee_id: currentUser.id, employee_name: currentUser.name,
                procedure_type_name: 'Осмотр', cat_id: catId, procedure_date: date,
                result: null, notes: 'Еженедельный осмотр' });
            showToast(`Осмотр «${catName}» отмечен ✓`);
            renderTasksBoard();
            openProcToMedModal(catId, date, 'Осмотр', null, 'Еженедельный осмотр');
        } catch (err) {
            if (err.message?.includes('уже существует')) {
                showToast('Осмотр уже был отмечен ранее', false);
            } else {
                checkbox.checked = false;
                showToast(err.message, true);
            }
            renderTasksBoard();
        }
    } else {
        const rec = procRecords.find(r =>
            r.cat_id === catId && r.procedure_type_name === 'Осмотр' &&
            weekDates.includes(normDate(r.procedure_date)));
        if (!rec) { renderTasksBoard(); return; }
        if (rec.employee_id !== currentUser?.id) {
            checkbox.checked = true;
            showToast('Нельзя снять отметку — она поставлена другим сотрудником', true);
            return;
        }
        try {
            await api(`/Procedure/records/${rec.employee_id}/${encodeURIComponent('Осмотр')}/${catId}/${normDate(rec.procedure_date)}`, 'DELETE');
            procRecords.splice(procRecords.indexOf(rec), 1);
            showToast(`Осмотр «${catName}» снят`);
            renderTasksBoard();
        } catch (err) { checkbox.checked = true; showToast(err.message, true); }
    }
}

async function toggleLitter(catId, checkbox) {
    const weekDates = getWeekDates(taskWeekOffset);
    const litterCat = cats.find(c => c.cat_id === catId);
    const catName = litterCat?.name || `#${catId}`;
    if (checkbox.checked) {
        const selVal = parseInt(document.getElementById('litterBatchSel')?.value || '0') || getLitterBatchId();
        const lb = selVal ? batches.find(b => b.batch_id === selVal) : null;
        if (!lb) { checkbox.checked = false; showToast('Выберите партию наполнителя в выпадающем списке выше', true); return; }
        const date = today();
        try {
            await api('/Warehouse/expenses', 'POST', {
                employee_id: currentUser.id, batch_id: lb.batch_id, cat_id: catId,
                expense_date: date, quantity: 1, notes: 'Замена наполнителя'
            });
            expenses.unshift({ employee_id: currentUser.id, employee_name: currentUser.name,
                batch_id: lb.batch_id, product_name: lb.product_name, unit: lb.unit,
                cat_id: catId, cat_name: catName, cat_breed: litterCat?.breed || '', cat_color: litterCat?.color || '',
                expense_date: date, quantity: 1, notes: 'Замена наполнителя' });
            showToast(`Наполнитель «${catName}» заменён — расход записан`);
            renderTasksBoard();
            renderExpenses();
        } catch (err) {
            if (err.message?.includes('уже существует')) { renderTasksBoard(); }
            else { checkbox.checked = false; showToast(err.message, true); }
        }
    } else {
        const exp = expenses.find(e =>
            e.cat_id === catId && weekDates.includes(normDate(e.expense_date)) &&
            e.notes === 'Замена наполнителя');
        if (!exp) { renderTasksBoard(); return; }
        if (exp.employee_id !== currentUser?.id) {
            checkbox.checked = true;
            showToast('Нельзя снять отметку — она поставлена другим сотрудником', true);
            return;
        }
        try {
            await api(`/Warehouse/expenses/${exp.employee_id}/${exp.batch_id}/${catId}/${normDate(exp.expense_date)}`, 'DELETE');
            expenses.splice(expenses.indexOf(exp), 1);
            showToast(`Замена наполнителя «${catName}» отменена`);
            renderTasksBoard();
            renderExpenses();
        } catch (err) { checkbox.checked = true; showToast(err.message, true); }
    }
}

async function toggleFeeding(catId, date, checkbox) {
    const feedCat = cats.find(c => c.cat_id === catId);
    const catName = feedCat?.name || `#${catId}`;
    if (checkbox.checked) {
        const batchId = getCatFoodBatchId(catId);
        const qty = getCatFoodQty(catId);
        if (!batchId) { checkbox.checked = false; showToast('Выберите корм для кошки', true); return; }
        const batch = batches.find(b => b.batch_id === batchId);
        try {
            await api('/Warehouse/expenses', 'POST', {
                employee_id: currentUser.id, batch_id: batchId, cat_id: catId,
                expense_date: date, quantity: qty, notes: 'Кормление кошки'
            });
            expenses.unshift({ employee_id: currentUser.id, employee_name: currentUser.name,
                batch_id: batchId, product_name: batch?.product_name || '', unit: batch?.unit || '',
                cat_id: catId, cat_name: catName, cat_breed: feedCat?.breed || '', cat_color: feedCat?.color || '',
                expense_date: date, quantity: qty, notes: 'Кормление кошки' });
            showToast(`«${catName}» покормлена ✓`);
            renderTasksBoard();
            renderExpenses();
        } catch (err) {
            if (err.message?.includes('уже существует')) { renderTasksBoard(); }
            else { checkbox.checked = false; showToast(err.message, true); }
        }
    } else {
        const exp = expenses.find(e =>
            e.cat_id === catId && normDate(e.expense_date) === date &&
            FOOD_CATEGORIES.includes(getBatchCategory(e.batch_id)));
        if (!exp) { renderTasksBoard(); return; }
        if (exp.employee_id !== currentUser?.id) {
            checkbox.checked = true;
            showToast('Нельзя снять отметку — она поставлена другим сотрудником', true);
            return;
        }
        try {
            await api(`/Warehouse/expenses/${exp.employee_id}/${exp.batch_id}/${catId}/${date}`, 'DELETE');
            expenses.splice(expenses.indexOf(exp), 1);
            renderTasksBoard();
            renderExpenses();
        } catch (err) { checkbox.checked = true; showToast(err.message, true); }
    }
}

// ===== МЕРОПРИЯТИЯ =====

async function loadEvents() {
    [events, adoptionStats] = await Promise.all([
        api('/Event'),
        api('/Event/adoption-stats').catch(() => [])
    ]);
    renderEvents();
}

function renderEvents() {
    const todayStr = today();
    const upcoming = events.filter(e => e.event_date >= todayStr);
    const past = events.filter(e => e.event_date < todayStr);

    const makeCard = (e) => {
        const d = new Date(e.event_date + 'T12:00:00');
        const dayNum = d.getDate();
        const monthName = MONTH_SHORT[d.getMonth()];
        const yearNum = d.getFullYear();
        const isToday = e.event_date === todayStr;
        const isPast = e.event_date < todayStr;
        const stat = adoptionStats.find(s => s.event_id === e.event_id);
        const adoptionBadge = isPast && stat && stat.total_cats > 0
            ? `<span class="ev-adoption-badge${stat.adopted_after > 0 ? ' ev-adoption-good' : ''}">
                🏠 ${stat.adopted_after}/${stat.total_cats} пристроено (${stat.adoption_rate_pct}%)
               </span>`
            : '';
        return `<div class="event-card${isToday ? ' event-card-today' : ''}">
            <div class="ev-card-date">
                <span class="ev-card-day">${dayNum}</span>
                <span class="ev-card-month">${monthName} ${yearNum}</span>
                ${isToday ? '<span class="badge badge-purple" style="font-size:10px;margin-top:4px">сегодня</span>' : ''}
            </div>
            <div class="ev-card-body">
                <div class="ev-card-name">${e.name}</div>
                <div class="ev-card-meta">
                    ${e.location ? `<span>📍 ${e.location}</span>` : ''}
                    <span>👤 ${e.employee_name || '—'}</span>
                    <span>🐱 ${e.cat_count} кошек</span>
                </div>
                ${adoptionBadge}
                ${e.notes ? `<div class="ev-card-notes">📝 ${e.notes}</div>` : ''}
            </div>
            <div class="ev-card-actions">
                <button class="btn-xs btn-xs-blue" onclick="openEventDetail(${e.event_id})">📂 Подробнее</button>
                <button class="btn-xs" onclick="openEditEvent(${e.event_id})">✏️</button>
            </div>
        </div>`;
    };

    const upEl = document.getElementById('eventsUpcoming');
    const pastEl = document.getElementById('eventsPast');
    if (upEl) upEl.innerHTML = upcoming.length
        ? upcoming.map(makeCard).join('')
        : '<div class="loading-text">Нет предстоящих мероприятий</div>';
    if (pastEl) pastEl.innerHTML = past.length
        ? past.map(makeCard).join('')
        : '<div class="loading-text" style="padding:8px 0">Нет прошедших мероприятий</div>';

    const pastSec = document.getElementById('eventsPastSection');
    if (pastSec) pastSec.style.display = past.length ? '' : 'none';
}

let editingEventId = null;

function openAddEvent() {
    editingEventId = null;
    document.getElementById('eventModalTitle').textContent = 'Новое мероприятие';
    document.getElementById('eventForm').reset();
    document.getElementById('evDate').value = today();
    document.getElementById('evNotes').value = '';
    populateSelect('evEmployee', employees, 'employee_id', 'full_name');
    openModal('eventModal');
}

function openEditEvent(id) {
    editingEventId = id;
    const ev = events.find(e => e.event_id === id);
    if (!ev) return;
    document.getElementById('eventModalTitle').textContent = 'Редактировать мероприятие';
    document.getElementById('evName').value = ev.name;
    document.getElementById('evDate').value = ev.event_date;
    document.getElementById('evLocation').value = ev.location || '';
    document.getElementById('evNotes').value = ev.notes || '';
    populateSelect('evEmployee', employees, 'employee_id', 'full_name');
    document.getElementById('evEmployee').value = ev.employee_id;
    openModal('eventModal');
}

async function saveEvent(e) {
    e.preventDefault();
    const name = capitalizeFirst(document.getElementById('evName').value);
    const date = document.getElementById('evDate').value;
    const location = capitalizeFirst(document.getElementById('evLocation').value) || null;
    const notes = document.getElementById('evNotes').value.trim() || null;
    const employeeId = parseInt(document.getElementById('evEmployee').value);
    if (!name || !date || !employeeId) { showToast('Заполните обязательные поля', true); return; }
    const data = { name, event_date: date, location, notes, employee_id: employeeId };
    try {
        if (editingEventId) {
            await api(`/Event/${editingEventId}`, 'PUT', data);
            showToast(`Мероприятие «${name}» обновлено`);
        } else {
            await api('/Event', 'POST', data);
            showToast(`Мероприятие «${name}» добавлено`);
        }
        closeModal('eventModal');
        await loadEvents();
    } catch (err) { showToast(err.message, true); }
}

async function deleteEvent(id) {
    const ev = events.find(e => e.event_id === id);
    if (!confirm(`Удалить мероприятие «${ev?.name || ''}»?`)) return;
    try {
        await api(`/Event/${id}`, 'DELETE');
        showToast('Мероприятие удалено');
        await loadEvents();
    } catch (err) { showToast(err.message, true); }
}

let eventParticipations = [];

async function openEventDetail(id) {
    currentEventId = id;
    const ev = events.find(e => e.event_id === id);
    if (!ev) return;
    document.getElementById('evDetailName').textContent = ev.name;
    document.getElementById('evDetailInfo').textContent =
        `${fmtDateOnly(ev.event_date)}${ev.location ? ' · ' + ev.location : ''} · Ответственный: ${ev.employee_name}`;
    const notesBlock = document.getElementById('evDetailNotesBlock');
    const notesText = document.getElementById('evDetailNotes');
    if (ev.notes) {
        notesText.textContent = ev.notes;
        notesBlock.style.display = '';
    } else {
        notesBlock.style.display = 'none';
    }
    document.getElementById('evAddCat').value = '';
    document.getElementById('evAddCondition').value = '';

    const isToday = ev.event_date === today();
    const addSection = document.getElementById('evAddCatSection');
    if (addSection) addSection.style.display = isToday ? '' : 'none';
    const dateNotice = document.getElementById('evDateNotice');
    if (dateNotice) dateNotice.style.display = isToday ? 'none' : '';

    // Заполняем список кошек (только те что ещё не участвуют — подгрузим после)
    eventParticipations = await api(`/Event/${id}/cats`);
    renderEventCats();

    if (isToday) {
        const participatingIds = new Set(eventParticipations.map(p => p.cat_id));
        const availCats = cats.filter(c =>
            !participatingIds.has(c.cat_id) &&
            (!c.departure_date || c.departure_date >= ev.event_date)
        );
        populateSelect('evAddCat', availCats, 'cat_id', 'name');
    }

    openModal('eventDetailModal');
}

function renderEventCats() {
    const list = document.getElementById('evCatsList');
    if (!eventParticipations.length) {
        list.innerHTML = '<div class="loading-text" style="padding:16px">Кошек пока нет — добавьте выше</div>';
        return;
    }
    const conditionBadge = c => {
        if (!c) return '';
        const map = { 'Отличное': 'badge-green', 'Хорошее': 'badge-green', 'Удовлетворительное': 'badge-blue', 'Стресс': 'badge-orange', 'Плохое': 'badge-red' };
        return `<span class="badge ${map[c] || 'badge-grey'}" style="margin-left:6px">${c}</span>`;
    };
    const isAdopted = s => s && s.toLowerCase().includes('пристро');
    list.innerHTML = eventParticipations.map(p => {
        const adopted = isAdopted(p.cat_status);
        return `<div class="detail-record-card proc${adopted ? ' ev-cat-adopted' : ''}">
            <div class="rec-main">
                <div class="rec-date">🐱 ${catInfoText(p.cat_name, p.cat_breed, p.cat_color)}
                    ${conditionBadge(p.condition_after)}
                    ${adopted ? '<span class="badge badge-green" style="margin-left:6px">🏠 Пристроена</span>' : ''}
                </div>
                ${!p.condition_after ? '<div class="rec-sub">Самочувствие не указано</div>' : ''}
            </div>
            <div class="rec-actions">
                <select class="inline-condition-select" onchange="updateCatCondition(${p.cat_id}, this.value)">
                    <option value="">Изменить самочувствие...</option>
                    <option value="Отличное">Отличное</option>
                    <option value="Хорошее">Хорошее</option>
                    <option value="Удовлетворительное">Удовлетворительное</option>
                    <option value="Стресс">Стресс</option>
                    <option value="Плохое">Плохое</option>
                </select>
                <button class="btn-xs btn-xs-red" onclick="removeCatFromEvent(${p.cat_id})">🗑</button>
            </div>
        </div>`;
    }).join('');
}

async function addCatToEvent() {
    const catId = parseInt(document.getElementById('evAddCat').value);
    const condition = document.getElementById('evAddCondition').value || null;
    if (!catId) { showToast('Выберите кошку', true); return; }
    try {
        await api(`/Event/${currentEventId}/cats`, 'POST', { cat_id: catId, condition_after: condition });
        const cat = cats.find(c => c.cat_id === catId);
        showToast(`Кошка «${cat?.name || ''}» добавлена в мероприятие`);
        eventParticipations.push({ cat_id: catId, cat_name: cat?.name || '', condition_after: condition });
        renderEventCats();
        // Убрать добавленную кошку из дропдауна
        const opt = document.getElementById('evAddCat').querySelector(`option[value="${catId}"]`);
        if (opt) opt.remove();
        document.getElementById('evAddCat').value = '';
        document.getElementById('evAddCondition').value = '';
        // Обновить счётчик в таблице
        const ev = events.find(e => e.event_id === currentEventId);
        if (ev) { ev.cat_count = (ev.cat_count || 0) + 1; renderEvents(); }
    } catch (err) { showToast(err.message, true); }
}

async function updateCatCondition(catId, condition) {
    if (!condition) return;
    try {
        await api(`/Event/${currentEventId}/cats/${catId}`, 'PUT', { cat_id: catId, condition_after: condition });
        const p = eventParticipations.find(x => x.cat_id === catId);
        if (p) p.condition_after = condition;
        renderEventCats();
        showToast('Самочувствие обновлено');
    } catch (err) { showToast(err.message, true); }
}

async function removeCatFromEvent(catId) {
    const p = eventParticipations.find(x => x.cat_id === catId);
    if (!confirm(`Убрать кошку «${p?.cat_name || ''}» из мероприятия?`)) return;
    try {
        await api(`/Event/${currentEventId}/cats/${catId}`, 'DELETE');
        eventParticipations = eventParticipations.filter(x => x.cat_id !== catId);
        renderEventCats();
        // Вернуть кошку в дропдаун
        const cat = cats.find(c => c.cat_id === catId);
        if (cat) {
            const opt = document.createElement('option');
            opt.value = catId;
            opt.textContent = cat.name;
            document.getElementById('evAddCat').appendChild(opt);
        }
        const ev = events.find(e => e.event_id === currentEventId);
        if (ev) { ev.cat_count = Math.max(0, (ev.cat_count || 1) - 1); renderEvents(); }
        showToast('Кошка убрана из мероприятия');
    } catch (err) { showToast(err.message, true); }
}


// ===== INIT =====
document.addEventListener('DOMContentLoaded', async () => {
    currentUser = checkAuth();
    if (!currentUser) return;

    document.getElementById('empUserName').textContent = currentUser.name || 'Сотрудник';
    initProfile();

    if (currentUser.type === 'admin') {
        const adminBtn = document.getElementById('switchToAdminBtn');
        adminBtn.style.display = 'inline-block';
        adminBtn.addEventListener('click', () => { window.location.href = '/admin.html'; });
    }

    document.getElementById('logoutBtn').addEventListener('click', logout);

    initTabs();
    initModals();

    document.getElementById('catForm').addEventListener('submit', saveCat);
    document.getElementById('catStatus').addEventListener('change', function() { updateStatusRequirements(this.value); });
    document.getElementById('medCardForm').addEventListener('submit', saveMedCard);
    document.getElementById('medRecordForm').addEventListener('submit', saveMedRecord);
    document.getElementById('volunteerForm').addEventListener('submit', saveVolunteer);
    document.getElementById('careForm').addEventListener('submit', saveCare);
    document.getElementById('procTypeForm').addEventListener('submit', saveProcType);
    document.getElementById('procRecordForm').addEventListener('submit', saveProcRecord);
    document.getElementById('productForm').addEventListener('submit', saveProduct);
    document.getElementById('batchForm').addEventListener('submit', saveBatch);
    document.getElementById('expenseForm').addEventListener('submit', saveExpense);

    document.getElementById('addCatBtn').addEventListener('click', openAddCat);
    document.getElementById('addMedCardBtn').addEventListener('click', openAddMedCard);
    document.getElementById('addVolunteerBtn').addEventListener('click', openAddVolunteer);
    document.getElementById('addCareBtn').addEventListener('click', openAddCare);
    document.getElementById('addProcTypeBtn').addEventListener('click', openAddProcType);
    document.getElementById('addProcRecordBtn').addEventListener('click', openAddProcRecord);
    document.getElementById('addProductBtn').addEventListener('click', openAddProduct);
    document.getElementById('addBatchBtn').addEventListener('click', openAddBatch);
    document.getElementById('addExpenseBtn').addEventListener('click', openAddExpense);
    document.getElementById('refreshRemainsBtn').addEventListener('click', loadWarehouse);
    document.getElementById('addEventBtn').addEventListener('click', openAddEvent);
    document.getElementById('eventForm').addEventListener('submit', saveEvent);

    // Tasks tab — render board when tab clicked
    document.querySelectorAll('.nav-btn').forEach(btn => {
        if (btn.dataset.tab === 'tasks') btn.addEventListener('click', () => {
            loadCatFoodPrefs();
            renderTasksBoard();
        });
    });

    document.getElementById('catSearch').addEventListener('input', renderCats);
    document.getElementById('catStatusFilter')?.addEventListener('change', renderCats);
    document.getElementById('procTypeSearch')?.addEventListener('input', renderProcTypes);
    document.getElementById('medSearch').addEventListener('input', renderMedCards);
    document.getElementById('volSearch').addEventListener('input', renderVolunteers);
    document.getElementById('procRecordSearch').addEventListener('input', renderProcRecords);

    document.getElementById('remainsSearch')?.addEventListener('input', renderRemains);
    document.getElementById('remainsWarehouseFilter')?.addEventListener('change', renderRemains);
    document.getElementById('remainsLowStock')?.addEventListener('change', renderRemains);
    document.getElementById('batchesSearch')?.addEventListener('input', renderBatches);
    document.getElementById('productsSearch')?.addEventListener('input', renderProducts);
    document.getElementById('productsCategoryFilter')?.addEventListener('change', renderProducts);
    document.getElementById('productsActiveOnly')?.addEventListener('change', renderProducts);
    document.getElementById('expensesSearch')?.addEventListener('input', renderExpenses);

    document.getElementById('refreshCagesBtn').addEventListener('click', loadCageOverview);
    document.getElementById('cagesTabBtn').addEventListener('click', loadCageOverview);

    await loadCommonData();
    await Promise.all([loadCats(), loadMedCards(), loadProcedures(), loadVolunteers(), loadWarehouse(), loadEvents()]);
});
