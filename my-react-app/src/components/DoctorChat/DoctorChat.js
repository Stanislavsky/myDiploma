import React, { useState, useRef, useEffect } from 'react';
import styles from './DoctorChat.module.css';
import { FaTimes, FaPaperclip, FaComments } from 'react-icons/fa';
import api from '../../api/api';

export default function DoctorChat({ userId, username }) {
  console.log('DoctorChat монтируется:', { userId, username });
  
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);
  const [socket, setSocket] = useState(null);
  const [chatExists, setChatExists] = useState(true);
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState(null);

  // Проверка существования чата
  useEffect(() => {
    console.log('DoctorChat: эффект проверки чата сработал', { userId });
    
    const checkChatExists = async () => {
      try {
        console.log('DoctorChat: запрос к API для проверки чата');
        const response = await api.get(`/api/chat/check-question/${userId}/`);
        console.log('DoctorChat: ответ сервера о существовании чата:', response.data);
        const exists = response.data && response.data.exists;
        console.log('DoctorChat: чат существует:', exists, 'текущее состояние:', chatExists);
        
        if (!exists) {
          console.log('DoctorChat: чат не существует, закрываем окно');
          setIsOpen(false);
          setMessages([]);
        }
        
        setChatExists(exists);
        console.log('DoctorChat: новое состояние chatExists:', exists);
      } catch (error) {
        console.error('DoctorChat: ошибка при проверке существования чата:', error);
        console.log('DoctorChat: устанавливаем chatExists в false из-за ошибки');
        setChatExists(false);
        setIsOpen(false);
        setMessages([]);
      }
    };

    checkChatExists();
    const intervalId = setInterval(checkChatExists, 30000);

    return () => {
      console.log('DoctorChat: очистка интервала проверки чата');
      clearInterval(intervalId);
    };
  }, [userId]);

  // Инициализация WebSocket соединения
  useEffect(() => {
    let socketInstance = null;
    let isComponentMounted = true;

    const connectWebSocket = async () => {
      if (isConnecting || !chatExists) {
        console.log('Пропуск подключения WebSocket:', { isConnecting, chatExists });
        return;
      }

      try {
        setIsConnecting(true);
        setConnectionError(null);
        
        const username = localStorage.getItem('username');
        const password = localStorage.getItem('password');
        
        if (!username || !password) {
          throw new Error('Отсутствуют учетные данные в localStorage');
        }
        
        console.log('Попытка получения токена для пользователя:', username);
        
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
        
        console.log('Токен успешно получен');
        const token = response.data.token;
        
        const ws_scheme = window.location.protocol === "https:" ? "wss" : "ws";
        const ws_path = `${ws_scheme}://localhost:8000/ws/chat/?token=${token}`;
        console.log('Попытка подключения к WebSocket:', ws_path);
        
        const newSocket = new WebSocket(ws_path);
        socketInstance = newSocket;

        newSocket.onopen = () => {
          if (!isComponentMounted) return;
          console.log('WebSocket соединение успешно установлено');
          setSocket(newSocket);
          setIsConnecting(false);
          setConnectionError(null);
        };

        newSocket.onmessage = (event) => {
          if (!isComponentMounted) return;
          console.log('Получено сообщение:', event.data);
          try {
            const data = JSON.parse(event.data);
            
            // Обработка события удаления чата
            if (data.type === 'chat_deleted' && data.userId === userId) {
              console.log('Получено событие удаления чата');
              setChatExists(false);
              setIsOpen(false);
              setMessages([]);
              return;
            }

            // Определяем отправителя на основе роли пользователя
            const isCurrentUser = data.user === userId;
            const newMessage = {
              text: data.message,
              sender: isCurrentUser ? 'doctor' : 'admin',
              timestamp: new Date().toISOString(),
              image: data.image,
              role: data.role
            };
            console.log('Новое сообщение:', {
              text: newMessage.text,
              sender: newMessage.sender,
              role: newMessage.role,
              isCurrentUser
            });
            setMessages(prevMessages => [...prevMessages, newMessage]);
          } catch (error) {
            console.error('Ошибка при обработке сообщения:', error);
          }
        };

        newSocket.onerror = (error) => {
          if (!isComponentMounted) return;
          console.error('Ошибка WebSocket:', error);
          setConnectionError('Ошибка соединения с сервером');
          setIsConnecting(false);
        };

        newSocket.onclose = () => {
          if (!isComponentMounted) return;
          console.log('WebSocket соединение закрыто');
          setSocket(null);
          setIsConnecting(false);
          
          // Пытаемся переподключиться через 3 секунды
          setTimeout(() => {
            if (isComponentMounted && chatExists) {
              console.log('Попытка переподключения...');
              connectWebSocket();
            }
          }, 3000);
        };

      } catch (error) {
        if (!isComponentMounted) return;
        console.error('Ошибка при подключении к WebSocket:', error);
        setConnectionError(error.message || 'Ошибка подключения к серверу');
        setIsConnecting(false);
      }
    };

    if (chatExists) {
      connectWebSocket();
    }

    return () => {
      isComponentMounted = false;
      if (socketInstance && socketInstance.readyState === WebSocket.OPEN) {
        socketInstance.close();
      }
    };
  }, [userId, chatExists]);

  // Загрузка истории сообщений
  useEffect(() => {
    if (isOpen) {
      const fetchMessages = async () => {
        try {
          const response = await api.get('/api/chat/messages/');
          if (response.data && response.data.messages) {
            const formattedMessages = response.data.messages.map(msg => ({
              text: msg.content,
              sender: msg.user === userId ? 'doctor' : 'admin',
              timestamp: msg.timestamp,
              image: msg.image,
              role: msg.role // Добавляем роль отправителя
            }));
            console.log('Загруженные сообщения:', formattedMessages);
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
    }
  }, [isOpen, userId]);

  // Прокрутка вниз при новых сообщениях
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSendMessage = async () => {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      console.error('WebSocket не подключен');
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
          // Отправляем сообщение через WebSocket
          const messageData = {
            message: response.data.message,
            user: userId,
            image: response.data.image_url
          };
          socket.send(JSON.stringify(messageData));
        }
      } else if (message.trim() !== '') {
        // Отправляем текстовое сообщение через WebSocket
        const messageData = {
          message: message.trim(),
          user: userId
        };
        console.log('Отправка сообщения:', messageData);
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

  const toggleChat = () => {
    console.log('DoctorChat: попытка переключения чата', { chatExists, isOpen });
    if (!chatExists) {
      console.log('DoctorChat: чат не существует, переключение отменено');
      return;
    }
    setIsOpen(!isOpen);
    console.log('DoctorChat: новое состояние isOpen будет:', !isOpen);
  };

  console.log('DoctorChat: рендер компонента', { 
    userId, 
    chatExists, 
    isOpen, 
    messagesCount: messages.length,
    socketState: socket ? socket.readyState : 'no socket'
  });

  return (
    <div className={styles.chatWidget} style={{ display: 'block' }}>
      {!isOpen ? (
        <button 
          className={styles.chatButton} 
          onClick={toggleChat}
          disabled={!chatExists}
          title={!chatExists ? "Чат недоступен" : "Чат с администратором"}
          style={{ display: 'flex' }}
        >
          <FaComments />
          <span>{chatExists ? "Чат с администратором" : "Чат недоступен"}</span>
        </button>
      ) : (
        <div className={styles.chatWindow} ref={chatContainerRef} style={{ display: 'flex' }}>
          <div className={styles.chatHeader}>
            <div className={styles.headerLeft}>
              <h3>Чат с администратором</h3>
              {isConnecting && <span className={styles.connectingBadge}>Подключение...</span>}
              {connectionError && <span className={styles.errorBadge}>{connectionError}</span>}
            </div>
            <button className={styles.closeButton} onClick={toggleChat}>
              <FaTimes />
            </button>
          </div>

          <div className={styles.messages} style={{ display: 'flex', flexDirection: 'column' }}>
            {messages.length === 0 ? (
              <div className={styles.emptyChatMessage}>
                <p>Чат пустой. Начните диалог</p>
              </div>
            ) : (
              messages.map((msg, index) => (
                <div key={index} className={styles.messageContainer}>
                  <div 
                    className={`${styles.message} ${
                      msg.sender === 'doctor' ? styles.doctorMessage : styles.adminMessage
                    }`}
                    style={{
                      display: 'block',
                      float: msg.sender === 'doctor' ? 'right' : 'left',
                      clear: 'both'
                    }}
                  >
                    <div className={styles.messageHeader}>
                      <span className={styles.sender}>
                        {msg.sender === 'doctor' ? 'Вы' : 'Администратор'}
                        {msg.role && ` (${msg.role})`}
                      </span>
                      <span className={styles.timestamp}>
                        {new Date(msg.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    {msg.image && (
                      <div className={styles.messageImageContainer}>
                        <img src={msg.image} alt="Отправленное изображение" className={styles.messageImage} />
                      </div>
                    )}
                    {msg.text && <p className={styles.messageText}>{msg.text}</p>}
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className={styles.inputContainer} style={{ display: 'block' }}>
            {selectedImage && (
              <div className={styles.selectedImageContainer}>
                <img src={selectedImage} alt="Выбранное изображение" className={styles.selectedImage} />
                <button onClick={removeSelectedImage} className={styles.removeImageButton}>
                  <FaTimes />
                </button>
              </div>
            )}
            <div className={styles.inputRow} style={{ display: 'flex' }}>
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
        </div>
      )}
    </div>
  );
} 