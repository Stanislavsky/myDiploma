import axios from 'axios';

// Функция для получения CSRF токена
const getCSRFToken = async () => {
    try {
        console.log('Запрос CSRF токена...');
        const response = await axios.get('http://localhost:8000/api/csrf-token/', {
            withCredentials: true
        });
        // Получаем токен из куки
        const csrfToken = document.cookie.split('; ')
            .find(row => row.startsWith('csrftoken='))
            ?.split('=')[1];
        console.log('CSRF токен получен из куки:', csrfToken);
        return csrfToken;
    } catch (error) {
        console.error('Ошибка при получении CSRF токена:', error);
        if (error.response) {
            console.error('Статус ответа:', error.response.status);
            console.error('Данные ответа:', error.response.data);
        }
        throw error;
    }
};

// Создаем экземпляр axios с базовыми настройками
const api = axios.create({
    baseURL: 'http://localhost:8000',
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
    }
});

// Добавляем перехватчик для получения CSRF токена
api.interceptors.request.use(async (config) => {
    // Получаем CSRF токен из cookie
    const csrfToken = document.cookie.split('; ')
        .find(row => row.startsWith('csrftoken='))
        ?.split('=')[1];

    if (csrfToken) {
        config.headers['X-CSRFToken'] = csrfToken;
    }
    return config;
});

// Обработка ошибок
api.interceptors.response.use(
    response => response,
    error => {
        if (error.response && error.response.status === 403) {
            console.error('403 Forbidden - возможно, проблема с CSRF токеном');
            // Попробуем получить новый CSRF токен
            getCSRFToken().catch(console.error);
        }
        return Promise.reject(error);
    }
);

export default api; 