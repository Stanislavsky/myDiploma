import React, { useState, useEffect } from 'react';
import styles from './HelpModal.module.css';
import { FaTimes, FaPaperclip, FaCheck } from 'react-icons/fa';
import axios from 'axios';

// Создаем экземпляр axios с базовыми настройками
const api = axios.create({
  baseURL: 'http://localhost:8000',  // Add base URL for Django backend
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  }
});

// Добавляем перехватчик для автоматического добавления CSRF токена
api.interceptors.request.use(function (config) {
  // Получаем CSRF токен из cookie
  const csrfToken = document.cookie.split('; ')
    .find(row => row.startsWith('csrftoken='))
    ?.split('=')[1];
  
  if (csrfToken) {
    config.headers['X-CSRFToken'] = csrfToken;
  }
  
  return config;
});

const HelpModal = ({ onClose }) => {
  const [message, setMessage] = useState('');
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // Генерируем событие открытия модального окна
    document.dispatchEvent(new Event('modalOpen'));
    
    return () => {
      // Генерируем событие закрытия модального окна
      document.dispatchEvent(new Event('modalClose'));
    };
  }, []);

  // Получаем CSRF токен при монтировании компонента
  useEffect(() => {
    const getCsrfToken = async () => {
      try {
        const response = await axios.get('/api/csrf-token/', { 
          withCredentials: true,
          headers: {
            'Accept': 'application/json',
          }
        });
        console.log('CSRF token response:', response);
      } catch (error) {
        console.error('Ошибка при получении CSRF токена:', error);
      }
    };
    getCsrfToken();
  }, []);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setFileName(e.target.files[0].name);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!message.trim()) {
      setError('Пожалуйста, введите ваш вопрос');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Check authentication first
      const authResponse = await api.get('/api/auth/check/');
      console.log('Auth response:', authResponse.data);
      
      if (!authResponse.data.user || !authResponse.data.user.is_doctor) {
        throw new Error('Пользователь не аутентифицирован как врач');
      }

      // Send the question
      console.log('Sending question:', { question_text: message });
      const response = await api.post('/api/doctor-profile/questions/', 
        { question_text: message }
      );
      console.log('Question response:', response.data);

      if (response.data) {
        setMessage('');
        setFile(null);
        setFileName('');
        setIsSuccess(true);
        setTimeout(() => {
          onClose();
        }, 1000);
      }
    } catch (error) {
      console.error('Error submitting question:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        headers: error.config?.headers,
        requestData: error.config?.data,
        url: error.config?.url
      });
      setError(error.response?.data?.detail || error.response?.data?.text?.[0] || error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>Центр помощи</h2>
          <button className={styles.closeButton} onClick={onClose}>
            <FaTimes />
          </button>
        </div>
        <div className={styles.content}>
          {error && <div className={styles.error}>{error}</div>}
          {isSuccess ? (
            <div className={styles.success}>
              <FaCheck className={styles.successIcon} />
              <p>Вопрос успешно отправлен! Ожидайте ответа.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className={styles.formGroup}>
                <label htmlFor="message" className={styles.label}>
                  Опишите вашу проблему
                </label>
                <textarea
                  id="message"
                  className={styles.textarea}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Пожалуйста, подробно опишите проблему, с которой вы столкнулись..."
                  required
                />
              </div>
              
              <div className={styles.fileUpload}>
                <label htmlFor="file" className={styles.fileLabel}>
                  <FaPaperclip className={styles.fileIcon} />
                  Прикрепить файл
                </label>
                <input
                  type="file"
                  id="file"
                  className={styles.fileInput}
                  onChange={handleFileChange}
                />
                {fileName && (
                  <div className={styles.fileName}>
                    Выбран файл: {fileName}
                  </div>
                )}
              </div>
              
              <div className={styles.formActions}>
                <button type="submit" className={styles.submitButton} disabled={isSubmitting}>
                  Отправить
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default HelpModal; 