import React from 'react';
import styles from './QuetionCard.module.css';
import { FaRegFileAlt } from 'react-icons/fa';

const QuestionCard = ({ doctorName, clinicName, question, attachmentUrl, datetime, onReply }) => {
  const getFileUrl = (url) => {
    if (!url) {
      console.log('URL is empty');
      return null;
    }

    try {
      console.log('Original URL:', url);

      // Если URL уже содержит полный путь, извлекаем только имя файла
      let fileName;
      if (url.includes('/')) {
        fileName = url.split('/').pop();
      } else {
        fileName = url;
      }

      console.log('Extracted filename:', fileName);
      
      // Формируем новый URL с правильным путем к медиа-файлам
      const newUrl = `http://127.0.0.1:8000/media/questions/${fileName}`;
      console.log('New URL:', newUrl);
      
      return newUrl;
    } catch (error) {
      console.error('Error processing URL:', error);
      return null;
    }
  };

  const handleDownload = async (e) => {
    e.preventDefault();
    const url = getFileUrl(attachmentUrl);
    console.log('Download URL:', url);
    
    if (!url) {
      console.error('No URL provided for download');
      return;
    }

    try {
      // Создаем временную ссылку для скачивания
      const link = document.createElement('a');
      link.href = url;
      link.download = attachmentUrl.split('/').pop(); // Устанавливаем имя файла для скачивания
      link.target = '_blank'; // Открываем в новой вкладке
      link.rel = 'noopener noreferrer';
      
      // Добавляем ссылку в DOM
      document.body.appendChild(link);
      
      // Программно кликаем по ссылке
      link.click();
      
      // Удаляем ссылку из DOM
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error downloading file:', error);
    }
  };

  const fileUrl = getFileUrl(attachmentUrl);
  console.log('Original URL:', attachmentUrl);
  console.log('Processed URL:', fileUrl);

  return (
    <div className={styles.card}>
      <div className={styles.card_item}>
        <div className={styles.header}>
          <h3>{doctorName}</h3>
          <p>{clinicName}</p>
        </div>
        <div className={styles.body}>
          <p>{question}</p>
          <div className={styles.attachment}>
            {attachmentUrl ? (
              <>
                <img 
                  src={fileUrl} 
                  alt="Прикрепленное изображение" 
                  className={styles.image}
                  crossOrigin="anonymous"
                  onError={(e) => {
                    console.error('Error loading image:', e);
                    console.error('Failed URL:', e.target.src);
                    e.target.style.display = 'none';
                  }}
                  onLoad={(e) => {
                    console.log('Image loaded successfully:', e.target.src);
                  }}
                />
                <button 
                  onClick={handleDownload}
                  className={styles.link}
                >
                  Скачать файл
                </button>
              </>
            ) : (
              <div className={styles.noAttachment}>
                <FaRegFileAlt className={styles.noAttachmentIcon} />
                <span className={styles.noAttachmentText}>Файл не прикреплен</span>
              </div>
            )}
          </div>
        </div>
        <div className={styles.footer}>
          <span className={styles.datetime}>{datetime}</span>
          <button className={styles.button} onClick={onReply}>
            Ответить
          </button>
        </div>
      </div>
    </div>
  );
};

export default QuestionCard;