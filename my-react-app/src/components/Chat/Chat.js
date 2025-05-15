// src/components/Chat/Chat.jsx
import React, { useState, useRef, useEffect } from 'react';
import styles from './Chat.module.css'; // Подключаем стили
import { FaTimes, FaPaperclip, FaCheck } from 'react-icons/fa';
import api from '../../api/api';  // Импортируем настроенный экземпляр axios

export default function Chat({ doctorName, openedAt, userId, onClose, onRedirect, onQuestionDeleted }) {
  const [messages, setMessages] = useState([]); // Состояние для хранения сообщений
  const [message, setMessage] = useState(''); // Состояние для текущего сообщения
  const [isTaskSolved, setIsTaskSolved] = useState(false); // Состояние для отслеживания решения задачи
  const [isClosing, setIsClosing] = useState(false);
  const [activeTab, setActiveTab] = useState('doctor'); // Состояние для активной вкладки
  const [showAdminTab, setShowAdminTab] = useState(false); // Состояние для отображения вкладки сопровождающего
  const [selectedImage, setSelectedImage] = useState(null); // Состояние для выбранного изображения
  const [isRedirected, setIsRedirected] = useState(false); // Состояние для отслеживания перенаправления
  const [socket, setSocket] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState(null);
  const reconnectTimeoutRef = useRef(null);
  const fileInputRef = useRef(null); // Ссылка на скрытый input для загрузки файлов
  const messagesEndRef = useRef(null); // Ссылка на конец списка сообщений
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Загружаем состояние перенаправления из localStorage при монтировании компонента
  useEffect(() => {
    const savedRedirected = localStorage.getItem(`chat_redirected_${userId}`);
    if (savedRedirected === 'true') {
      setIsRedirected(true);
      setShowAdminTab(true);
      setActiveTab('admin');
    }
  }, [userId]);

  // Добавляем функцию для определения отправителя
  const determineSender = (messageData, currentUserId) => {
    // Если это сообщение из WebSocket
    if (messageData.message_type === undefined) {
      return messageData.user === currentUserId ? 'admin' : 'doctor';
    }
    // Если это сообщение из истории
    return messageData.message_type === 'admin_to_doctor' ? 'admin' : 'doctor';
  };

  // Определяем функцию connectWebSocket
  const connectWebSocket = async () => {
    try {
      setIsConnecting(true);
      setConnectionError(null);

      const username = localStorage.getItem('username');
      const password = localStorage.getItem('password');
      
      if (!username || !password) {
        throw new Error('Отсутствуют учетные данные в localStorage');
      }
      
      const response = await api.post('/api/auth/token/', {
        username: username,
        password: password
      }, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.data || !response.data.token) {
        throw new Error('Неверный формат ответа от сервера');
      }
      
      const token = response.data.token;
      const ws_scheme = window.location.protocol === "https:" ? "wss" : "ws";
      const ws_path = `${ws_scheme}://localhost:8000/ws/chat/?token=${token}`;
      
      const newSocket = new WebSocket(ws_path);

      newSocket.onopen = () => {
        console.log('WebSocket соединение успешно установлено');
        setSocket(newSocket);
        setIsConnecting(false);
        setConnectionError(null);
      };

      newSocket.onmessage = (event) => {
        console.log('Получено сообщение через WebSocket:', event.data);
        try {
          const data = JSON.parse(event.data);
          
          // Если это сообщение от текущего пользователя, заменяем временное сообщение
          if (data.user === userId) {
            setMessages(prevMessages => {
              return prevMessages.map(msg => {
                // Если нашли временное сообщение с таким же текстом и временем
                if (msg.isTemporary && 
                    msg.text === data.message && 
                    Math.abs(new Date(msg.timestamp) - new Date(data.timestamp)) < 5000) {
                  // Заменяем временное сообщение на постоянное
                  return {
                    ...msg,
                    message_id: data.message_id,
                    isTemporary: false
                  };
                }
                return msg;
              });
            });
            return;
          }

          // Для сообщений от других пользователей
          const newMessage = {
            text: data.message,
            user: data.user,
            timestamp: new Date(data.timestamp).toISOString(),
            image: data.image,
            role: data.role,
            message_id: data.message_id,
            message_type: data.message_type,
            sender: determineSender(data, userId)
          };
          
          setMessages(prevMessages => {
            // Проверяем, нет ли уже такого сообщения
            const isDuplicate = prevMessages.some(msg => 
              msg.message_id === newMessage.message_id ||
              (msg.text === newMessage.text && 
               msg.timestamp === newMessage.timestamp &&
               msg.user === newMessage.user)
            );
            
            if (isDuplicate) {
              console.log('Сообщение уже существует в состоянии:', newMessage);
              return prevMessages;
            }
            
            return [...prevMessages, newMessage];
          });
        } catch (error) {
          console.error('Ошибка при обработке WebSocket сообщения:', error);
        }
      };

      newSocket.onerror = (error) => {
        console.error('Ошибка WebSocket:', error);
        setConnectionError('Ошибка соединения с сервером');
        setIsConnecting(false);
      };

      newSocket.onclose = () => {
        console.log('WebSocket соединение закрыто');
        setSocket(null);
        setIsConnecting(false);
        
        setTimeout(() => {
          connectWebSocket();
        }, 3000);
      };

    } catch (error) {
      console.error('Ошибка при подключении к WebSocket:', error);
      setConnectionError(error.message || 'Ошибка подключения к серверу');
      setIsConnecting(false);
      
      setTimeout(() => {
        connectWebSocket();
      }, 3000);
    }
  };

  // Инициализация WebSocket соединения
  useEffect(() => {
    connectWebSocket();

    return () => {
      if (socket && socket instanceof WebSocket) {
        socket.close();
      }
    };
  }, []);

  // Обновляем загрузку истории сообщений
  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const response = await api.get('/api/chat/messages/');
        if (response.data && response.data.messages) {
          console.log('Полученные сообщения с сервера:', response.data.messages);
          const formattedMessages = response.data.messages.map(msg => {
            const formattedMessage = {
              text: msg.content,
              user: msg.user,
              timestamp: msg.timestamp,
              image: msg.image,
              role: msg.role,
              message_type: msg.message_type,
              sender: determineSender(msg, userId)
            };
            
            console.log('Обработка сообщения из истории:', {
              messageId: msg.id,
              userId: msg.user,
              currentUserId: userId,
              messageType: msg.message_type,
              sender: formattedMessage.sender,
              role: msg.role
            });

            return formattedMessage;
          });
          console.log('Отформатированные сообщения из истории:', formattedMessages);
          setMessages(formattedMessages);
        } else {
          console.error('Неверный формат ответа от сервера:', response.data);
          setMessages([]);
        }
      } catch (error) {
        console.error('Ошибка при загрузке сообщений:', error);
        setMessages([]);
      }
    };

    fetchMessages();
  }, [userId]);

  // Функция для прокрутки вниз
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Прокручиваем вниз при изменении сообщений
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      console.error('WebSocket не подключен');
      if (connectionError) {
        alert(`Ошибка соединения: ${connectionError}`);
      } else if (isConnecting) {
        alert('Идет подключение к серверу, пожалуйста, подождите...');
      } else {
        alert('Нет соединения с сервером. Попытка переподключения...');
        connectWebSocket();
      }
      return;
    }

    try {
      if (selectedImage) {
        // Создаем FormData для отправки изображения
        const formData = new FormData();
        const blob = await fetch(selectedImage).then(r => r.blob());
        formData.append('image', blob, 'image.png');
        formData.append('user', userId);

        // Отправляем изображение через API
        const response = await api.post('/api/chat/upload-image/', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });

        if (response.data && response.data.message) {
          // Создаем временное сообщение для немедленного отображения
          const tempMessage = {
            text: response.data.message,
            user: userId,
            timestamp: new Date().toISOString(),
            image: response.data.image_url,
            role: 'admin',
            message_type: 'admin_to_doctor',
            sender: 'admin',
            isTemporary: true // Флаг для временного сообщения
          };

          // Немедленно добавляем сообщение в состояние
          setMessages(prevMessages => [...prevMessages, tempMessage]);

          // Отправляем сообщение через WebSocket для синхронизации
          const messageData = {
            message: response.data.message,
            user: userId,
            image: response.data.image_url,
            message_type: 'admin_to_doctor',
            timestamp: tempMessage.timestamp
          };
          console.log('Отправка сообщения с изображением через WebSocket:', messageData);
          socket.send(JSON.stringify(messageData));
        }
      } else if (message.trim()) {
        // Создаем временное сообщение для немедленного отображения
        const tempMessage = {
          text: message.trim(),
          user: userId,
          timestamp: new Date().toISOString(),
          role: 'admin',
          message_type: 'admin_to_doctor',
          sender: 'admin',
          isTemporary: true // Флаг для временного сообщения
        };

        // Немедленно добавляем сообщение в состояние
        setMessages(prevMessages => [...prevMessages, tempMessage]);

        // Отправляем текстовое сообщение через WebSocket
        const messageData = {
          message: message.trim(),
          user: userId,
          message_type: 'admin_to_doctor',
          timestamp: tempMessage.timestamp
        };
        console.log('Отправка текстового сообщения:', messageData);
        socket.send(JSON.stringify(messageData));
      }

      // Очищаем поля ввода
      setMessage('');
      setSelectedImage(null);
    } catch (error) {
      console.error('Ошибка при отправке сообщения:', error);
      alert('Не удалось отправить сообщение. Пожалуйста, попробуйте еще раз.');
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(onClose, 300);
  };

  const handleTaskSolved = () => {
    setShowConfirmModal(true);
  };

  const handleRedirect = () => {
    setIsRedirected(true);
    setShowAdminTab(true);
    setActiveTab('admin');
    // Сохраняем состояние перенаправления в localStorage
    localStorage.setItem(`chat_redirected_${userId}`, 'true');
    if (onRedirect) {
      onRedirect(userId);
    }
  };

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeSelectedImage = () => {
    setSelectedImage(null);
  };

  const handleImageDoubleClick = (imageUrl) => {
    // Создаем временную ссылку для скачивания
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = 'image.png'; // Имя файла при скачивании
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setFileName(e.target.files[0].name);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Логика отправки сообщения
  };

  const handleConfirmSolve = async () => {
    try {
      // Сначала удаляем все сообщения чата
      await api.delete(`/api/chat/delete-messages/${userId}/`);

      // Затем удаляем сам вопрос
      await api.delete(`/api/doctor-profile/questions/${userId}/`);
      
      // Отправляем событие удаления чата через WebSocket
      if (socket && socket.readyState === WebSocket.OPEN) {
        const deleteEvent = {
          type: 'chat_deleted',
          userId: userId,
          timestamp: new Date().toISOString(),
          deleteMessages: true // Флаг, указывающий что нужно удалить все сообщения
        };
        socket.send(JSON.stringify(deleteEvent));
      }
      
      setIsTaskSolved(true);
      setShowConfirmModal(false);
      setMessages([]); // Очищаем сообщения локально
      
      // Вызываем функцию для удаления вопроса из списка
      if (onQuestionDeleted) {
        onQuestionDeleted();
      }
      
      // Закрываем чат с небольшой задержкой для анимации
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (error) {
      console.error('Ошибка при удалении чата:', error);
      if (error.response) {
        console.error('Статус ответа:', error.response.status);
        console.error('Данные ответа:', error.response.data);
      }
      alert('Не удалось удалить чат. Пожалуйста, попробуйте еще раз.');
    }
  };

  return (
    <div className={`${styles.chatContainer} ${isClosing ? styles.closing : ''}`}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h3>Чат с врачом: {doctorName}</h3>
          {isTaskSolved && <span className={styles.solvedBadge}>Задача решена</span>}
          {isRedirected && <span className={styles.redirectedBadge}>Перенаправлен</span>}
          {isConnecting && <span className={styles.connectingBadge}>Подключение...</span>}
          {connectionError && <span className={styles.errorBadge}>{connectionError}</span>}
        </div>
        <div className={styles.headerRight}>
          {!isTaskSolved && (
            <button onClick={handleTaskSolved} className={styles.solveButton}>
              Задача решена
            </button>
          )}
          <button onClick={handleClose} className={styles.closeButton}>Закрыть</button>
        </div>
      </div>
      <div className={styles.container}>
        <span 
          className={`${styles.chatTab} ${activeTab === 'doctor' ? styles.active : ''}`}
          onClick={() => setActiveTab('doctor')}
        >
          врач 
        </span>
        {showAdminTab && (
          <span 
            className={`${styles.chatTab} ${activeTab === 'admin' ? styles.active : ''}`}
            onClick={() => setActiveTab('admin')}
          >
            сопровождающий 
          </span>
        )}
      </div>
      
      <div className={styles.messages}>
        {messages.length === 0 ? (
          <div className={styles.emptyChatMessage}>
            <p>Чат пустой. Начните диалог</p>
          </div>
        ) : (
          messages.map((msg, index) => {
            console.log('Рендеринг сообщения:', {
              messageId: msg.id,
              userId: msg.user,
              currentUserId: userId,
              messageType: msg.message_type,
              sender: msg.sender,
              role: msg.role
            });
            return (
              <div 
                key={index} 
                className={`${styles.message} ${
                  msg.sender === 'admin' ? styles.adminMessage : styles.doctorMessage
                }`}
              >
                <div className={styles.messageHeader}>
                  <div className={styles.senderInfo}>
                    <span className={styles.senderLabel}>
                      {msg.sender === 'admin' ? 'Администратор' : 'Врач'}
                    </span>
                    <span className={styles.sender}>
                      {msg.sender === 'admin' ? 'Вы' : doctorName}
                    </span>
                  </div>
                  <span className={styles.timestamp}>
                    {new Date(msg.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                {msg.image && (
                  <div 
                    className={styles.messageImageContainer}
                    onDoubleClick={() => handleImageDoubleClick(msg.image)}
                  >
                    <img src={msg.image} alt="Отправленное изображение" className={styles.messageImage} />
                    <div className={styles.imageHint}>Дважды кликните для скачивания</div>
                  </div>
                )}
                {msg.text && <p className={styles.messageText}>{msg.text}</p>}
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className={styles.inputContainer}>
        {selectedImage && (
          <div className={styles.selectedImageContainer}>
            <img src={selectedImage} alt="Выбранное изображение" className={styles.selectedImage} />
            <button onClick={removeSelectedImage} className={styles.removeImageButton}>
              <FaTimes />
            </button>
          </div>
        )}
        <div className={styles.inputRow}>
          <button 
            onClick={() => fileInputRef.current.click()} 
            className={styles.uploadButton}
            title="Прикрепить изображение"
          >
            <FaPaperclip />
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImageSelect}
            accept="image/*"
            style={{ display: 'none' }}
          />
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Введите сообщение..."
            className={styles.textarea}
          />
          <button 
            onClick={handleSendMessage} 
            className={styles.sendButton}
            disabled={!message.trim() && !selectedImage}
          >
            Отправить
          </button>
        </div>
      </div>

      {onRedirect && !isRedirected && (
        <div className={styles.chatDetails}>
          <p>Чат открыт: {openedAt}</p>
          <button 
            onClick={handleRedirect} 
            className={styles.redirectButton}
          >
            Перенаправить вопрос
          </button>
        </div>
      )}

      {/* Модальное окно подтверждения */}
      {showConfirmModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.confirmModal}>
            <h3>Подтверждение</h3>
            <p>Вы уверены, что задача решена?</p>
            <div className={styles.confirmButtons}>
              <button onClick={handleConfirmSolve} className={styles.confirmButton}>
                <FaCheck style={{marginRight: '8px'}} /> Да
              </button>
              <button onClick={() => setShowConfirmModal(false)} className={styles.cancelButton}>
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}