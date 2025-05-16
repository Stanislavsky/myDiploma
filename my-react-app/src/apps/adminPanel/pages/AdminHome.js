import React, { useState, useEffect } from 'react';
import QuestionCard from '../../../components/QuetionCard/QuetionCard'
import Chat from '../../../components/Chat/Chat'; 
import { AnimatedDiv, cardAnimation, chatAnimation } from '../../../components/Animations/Animations';
import { FaBell } from 'react-icons/fa';
import styles from '../AdminPanel.module.css';
import api from '../../../api/api';

export default function AdminHome() {
  const [openChats, setOpenChats] = useState({});
  const [searchDoctor, setSearchDoctor] = useState('');
  const [searchClinic, setSearchClinic] = useState('');
  const [notifications] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchQuestions();
  }, []);

  const fetchQuestions = async () => {
    try {
      const response = await api.get('/api/doctor-profile/questions/');
      console.log('Полученные вопросы:', response.data);
      // Преобразуем URL файла, если он есть
      const questionsWithFileUrls = response.data.map(question => ({
        ...question,
        attached_file: question.attached_file ? `http://localhost:8000${question.attached_file}` : null
      }));
      setQuestions(questionsWithFileUrls);
      setLoading(false);
    } catch (err) {
      console.error('Полная ошибка:', err);
      setError('Ошибка при загрузке вопросов');
      setLoading(false);
    }
  };

  const handleQuestionDeleted = (questionId) => {
    setQuestions(prevQuestions => prevQuestions.filter(q => q.id !== questionId));
  };

  const now = new Date();
  const formattedDate = now.toLocaleDateString('ru-RU');
  const formattedTime = now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  const createdAt = `${formattedDate} ${formattedTime}`;

  const handleReplyClick = (id) => {
    setOpenChats(prev => ({
      ...prev,
      [id]: { isOpen: true, openedAt: `${formattedDate} ${formattedTime}`, userId: id },
    }));
  };

  const handleCloseChat = (id) => {
    setOpenChats(prev => ({
      ...prev,
      [id]: { ...prev[id], isOpen: false },
    }));
  };

  const handleRedirect = (userId) => {
    console.log(`Перенаправить вопрос пользователю с ID: ${userId}`);
  };

  const filteredQuestions = questions.filter(question => {
    console.log('Обработка вопроса:', question);
    const doctorMatch = question.doctor?.full_name?.toLowerCase().includes(searchDoctor.toLowerCase()) || '';
    const clinicMatch = question.doctor?.clinic_name?.toLowerCase().includes(searchClinic.toLowerCase()) || '';
    return doctorMatch && clinicMatch;
  });

  console.log('Отфильтрованные вопросы:', filteredQuestions);

  const activeChat = Object.entries(openChats).find(([_, chat]) => chat.isOpen);

  if (loading) {
    return <div className={styles.loading}>Загрузка вопросов...</div>;
  }

  if (error) {
    return <div className={styles.error}>{error}</div>;
  }

  return (
    <div className={styles.adminPanel}>
      <div className={styles.searchPanel}>
        <h2 className={styles.searchTitle}>Поиск</h2>
        <div>
          <label className={styles.searchLabel}>Поиск по ФИО врача</label>
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Введите ФИО врача"
            value={searchDoctor}
            onChange={(e) => setSearchDoctor(e.target.value)}
          />
        </div>
        <div>
          <label className={styles.searchLabel}>Поиск по учреждению</label>
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Введите название"
            value={searchClinic}
            onChange={(e) => setSearchClinic(e.target.value)}
          />
        </div>
        <div className={styles.notificationsPanel}>
          <div className={styles.notificationsContent}>
            <FaBell className={styles.bellIcon} />
            <p className={styles.notificationsText}>Всего вопросов: {questions.length}</p>
          </div>
        </div>
      </div>

      <div className={styles.container}>
        {filteredQuestions.length === 0 ? (
          <div className={styles.noQuestions}>Нет доступных вопросов</div>
        ) : (
          filteredQuestions.map(question => {
            console.log('Рендеринг вопроса:', question);
            return (
              <div key={question.id}>
                <AnimatedDiv animation={cardAnimation}>
                  <QuestionCard 
                    doctorName={question.doctor?.full_name || 'Неизвестный врач'}
                    clinicName={question.doctor?.clinic_name || 'Неизвестная клиника'}
                    question={question.question_text}
                    datetime={new Date(question.created_at).toLocaleString('ru-RU')}
                    attachmentUrl={question.attached_file}
                    onReply={() => handleReplyClick(question.id)}
                  />
                </AnimatedDiv>
              </div>
            );
          })
        )}
      </div>
      {activeChat && (
        <div className={styles.overlay}>
          <div className={styles.chatModal}>
            <AnimatedDiv animation={chatAnimation}>
              <Chat 
                doctorName={questions.find(q => q.id === parseInt(activeChat[0]))?.doctor?.full_name || 'Неизвестный врач'}
                openedAt={activeChat[1].openedAt}
                userId={activeChat[1].userId}
                onClose={() => handleCloseChat(activeChat[0])}
                onRedirect={handleRedirect}
                onQuestionDeleted={() => handleQuestionDeleted(parseInt(activeChat[0]))}
              />
            </AnimatedDiv>
          </div>
        </div>
      )}
    </div>
  );
}