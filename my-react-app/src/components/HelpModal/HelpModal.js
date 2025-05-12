import React, { useState, useEffect } from 'react';
import styles from './HelpModal.module.css';
import { FaTimes, FaPaperclip, FaCheck } from 'react-icons/fa';
import axios from 'axios';

// Создаем экземпляр axios с базовыми настройками
const api = axios.create({
  withCredentials: true,
  headers: {
    'Content-Type': 'multipart/form-data',
  }
});

const HelpModal = ({ onClose }) => {
  const [message, setMessage] = useState('');
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState(null);
  const [isSuccess, setIsSuccess] = useState(false);

  // Получаем CSRF токен при монтировании компонента
  useEffect(() => {
    const getCsrfToken = async () => {
      try {
        await axios.get('/api/csrf-token/', { withCredentials: true });
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
    setError(null);

    try {
      const formData = new FormData();
      formData.append('question_text', message);

      if (file) {
        formData.append('attached_file', file);
      }

      // Получаем CSRF токен из cookie
      const csrfToken = document.cookie.split('; ')
        .find(row => row.startsWith('csrftoken='))
        ?.split('=')[1];

      const response = await axios.post('/api/doctor-profile/questions/', formData, {
        headers: {
          'X-CSRFToken': csrfToken,
          'Content-Type': 'multipart/form-data',
        },
        withCredentials: true
      });

      if (response.status === 201) {
        setIsSuccess(true);
        // Закрываем модальное окно через 1 секунду
        setTimeout(() => {
          onClose();
        }, 1000);
      } else {
        setError('Произошла ошибка при отправке вопроса');
      }
    } catch (error) {
      console.error('Ошибка при отправке вопроса:', error);
      if (error.response) {
        setError(error.response.data.detail || 'Произошла ошибка при отправке вопроса');
      } else {
        setError('Произошла ошибка при отправке вопроса');
      }
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
                <button type="submit" className={styles.submitButton}>
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