import React, { useState, useEffect } from 'react';
import styles from './Login.module.css'; // Импортируем стили
import api from '../../api/api';
import { useNavigate } from 'react-router-dom';

function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // Получаем CSRF токен при монтировании компонента
  useEffect(() => {
    const getCSRFToken = async () => {
      try {
        console.log('Получение CSRF токена...');
        const response = await api.get('/api/csrf-token/');
        console.log('CSRF токен получен:', response.data);
      } catch (error) {
        console.error('Ошибка при получении CSRF токена:', error);
      }
    };
    getCSRFToken();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    try {
      console.log('Попытка входа...');
      const response = await api.post('/api/auth/login/', { 
        username, 
        password 
      });
      
      console.log('Ответ сервера при входе:', response.data);
      
      if (response.data.user) {
        console.log('Вход успешен, сохраняем учетные данные...');
        // Сохраняем учетные данные в localStorage
        localStorage.setItem('username', username);
        localStorage.setItem('password', password);
        
        // Проверяем, что данные сохранились
        const savedUsername = localStorage.getItem('username');
        const savedPassword = localStorage.getItem('password');
        console.log('Сохраненные учетные данные:', {
          username: savedUsername,
          password: savedPassword ? '***' : null
        });
        
        // Проверяем аутентификацию после входа
        console.log('Проверка аутентификации...');
        const authCheck = await api.get('/api/auth/check/');
        console.log('Результат проверки аутентификации:', authCheck.data);
        
        if (authCheck.data.user) {
          console.log('Аутентификация подтверждена, перенаправление на главную...');
          navigate('/', { replace: true });
        } else {
          console.error('Ошибка аутентификации: нет данных пользователя в ответе');
          setError('Ошибка аутентификации');
        }
      }
    } catch (error) {
      console.error('Ошибка при входе:', error);
      if (error.response) {
        console.error('Данные ответа сервера:', error.response.data);
        console.error('Статус ответа:', error.response.status);
      }
      setError('Неверное имя пользователя или пароль');
    }
  };

  return (
    <div className={styles.loginContainer}>
      <form className={styles.loginForm} onSubmit={handleSubmit}>
        <h2>Вход в систему</h2>
        {error && <div className={styles.error}>{error}</div>}
        <div>
          <label htmlFor="username">Имя пользователя:</label>
          <input
            type="text"
            id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </div>
        <div>
          <label htmlFor="password">Пароль:</label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <button type="submit">Войти</button>
      </form>
    </div>
  );
}

export default Login; 