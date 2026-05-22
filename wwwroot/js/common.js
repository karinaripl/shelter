const API_BASE = 'https://localhost:7099/api';

// ===== НОРМАЛИЗАЦИЯ =====
// Каждое слово с заглавной (для ФИО, кличек, пород)
function capitalizeName(str) {
    if (!str) return '';
    return str.trim().replace(/\s+/g, ' ')
        .split(' ')
        .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(' ');
}

// Первая буква заглавная (для названий, описаний)
function capitalizeFirst(str) {
    if (!str) return '';
    const s = str.trim().replace(/\s+/g, ' ');
    return s.charAt(0).toUpperCase() + s.slice(1);
}

// Только цифры
function digitsOnly(str) {
    return (str || '').replace(/\D/g, '');
}

// Нормализация телефона → 8XXXXXXXXXX
function normalizePhone(raw) {
    const d = digitsOnly(raw);
    if (!d) return '';
    if (d.length === 11 && d[0] === '7') return '8' + d.slice(1);
    if (d.length === 11 && d[0] === '8') return d;
    if (d.length === 10) return '8' + d;
    return d;
}

// Допустимые единицы измерения
const UNITS = ['кг', 'г', 'шт', 'л', 'мл', 'уп', 'таб', 'доза', 'мешок', 'пачка', 'пара'];

function unitsSelectOptions(selected) {
    return UNITS.map(u => `<option value="${u}"${u === selected ? ' selected' : ''}>${u}</option>`).join('');
}

function showToast(message, isError = false) {
    const toast = document.getElementById('toastMessage');
    if (!toast) return;
    toast.textContent = message;
    toast.className = `toast ${isError ? 'error' : 'success'}`;
    toast.classList.remove('hidden');
    setTimeout(() => {
        toast.classList.add('hidden');
    }, 3000);
}

function checkAuth() {
    const user = localStorage.getItem('user');
    if (!user) {
        window.location.href = '/index.html';
        return null;
    }
    return JSON.parse(user);
}

function logout() {
    localStorage.removeItem('user');
    window.location.href = '/index.html';
}

async function api(path, method = 'GET', body = null) {
    const opts = { method, headers: { 'Content-Type': 'application/json' } };
    if (body) opts.body = JSON.stringify(body);
    let res;
    try {
        res = await fetch(`${API_BASE}${path}`, opts);
    } catch (_) {
        throw new Error('Нет связи с сервером. Проверьте подключение.');
    }
    if (!res.ok) {
        let msg;
        try {
            const d = await res.json();
            msg = d.error || d.message ||
                  (d.title && d.title !== 'One or more validation errors occurred.' ? d.title : null);
        } catch (_) {}
        if (!msg) {
            if (res.status === 401) msg = 'Сессия истекла. Войдите заново.';
            else if (res.status === 403) msg = 'Недостаточно прав для этого действия.';
            else if (res.status === 404) msg = 'Запрошенные данные не найдены.';
            else msg = 'Ошибка сервера. Попробуйте позже.';
        }
        throw new Error(msg);
    }
    if (res.status === 204) return null;
    return res.json();
}

function fmtDateOnly(d) {
    if (!d) return '—';
    const s = typeof d === 'string' ? d : String(d);
    if (s.includes('-')) {
        const [y, mo, day] = s.split('T')[0].split('-');
        return `${day}.${mo}.${y}`;
    }
    return s;
}