// Удалите строку const API_BASE = 'https://localhost:7099/api'; из этого файла
// API_BASE уже объявлен в common.js

async function handleLogin(event) {
    event.preventDefault();

    const login = document.getElementById('login').value;
    const password = document.getElementById('password').value;
    const errorDiv = document.getElementById('error-message');
    const submitBtn = event.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;

    submitBtn.textContent = 'Вход...';
    submitBtn.disabled = true;

    try {
        const response = await fetch(`${API_BASE}/Auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ login, password })
        });

        const result = await response.json();

        if (result.success) {
            localStorage.setItem('user', JSON.stringify({
                id: result.employeeId,
                name: result.fullName,
                type: result.userType,
                position: result.positionName
            }));

            if (result.userType === 'admin') {
                window.location.href = '/admin.html';
            } else {
                window.location.href = '/employee.html';
            }
        } else {
            errorDiv.textContent = result.message || 'Неверный логин или пароль';
            errorDiv.classList.remove('hidden');
        }
    } catch (error) {
        console.error('Login error:', error);
        errorDiv.textContent = 'Ошибка соединения с сервером';
        errorDiv.classList.remove('hidden');
    } finally {
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }
}

function checkAuthAndRedirect() {
    const user = localStorage.getItem('user');
    if (user) {
        const userData = JSON.parse(user);
        if (userData.type === 'admin') {
            window.location.href = '/admin.html';
        } else {
            window.location.href = '/employee.html';
        }
    }
}

checkAuthAndRedirect();