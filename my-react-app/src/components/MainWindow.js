import React, { useState, useEffect } from 'react';
import './MainWindow.css';
import HelpModal from './HelpModal/HelpModal';
import ConfirmModal from './ConfirmModal/ConfirmModal';
import DoctorChat from './DoctorChat/DoctorChat';
import PatientsTable from './Patients/PatientsTable';
import PatientForm from './Patients/PatientForm';
import api from '../api/api';
import { useNavigate, useLocation } from 'react-router-dom';
import { Link } from 'react-router-dom';
import Skeleton from './Skeleton/Skeleton';

const MainWindow = ({ initialTab = 0 }) => {
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [username, setUsername] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState(null);
  const [chatExists, setChatExists] = useState(false);
  const [activeTab, setActiveTab] = useState(initialTab);
  const [isPatientFormOpen, setIsPatientFormOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [workplace, setWorkplace] = useState('');
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    // Устанавливаем активную вкладку на основе URL
    if (location.pathname === '/patients') {
      setActiveTab('patients');
    } else {
      setActiveTab('main');
    }
  }, [location.pathname]);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await api.get('/api/auth/check/');
        console.log('Полные данные пользователя:', response.data);
        if (response.data.user) {
          const userData = response.data.user;
          console.log('Данные пользователя для отображения чата:', {
            username: userData.username,
            isAdmin: userData.is_admin,
            userId: userData.id,
            role: userData.role,
            isDoctor: userData.is_doctor
          });
          
          setUsername(userData.username);
          setIsAdmin(userData.is_admin || false);
          setUserId(userData.id);

          // Получаем информацию о месте работы ТОЛЬКО если пользователь врач
          if (userData.id && userData.is_doctor && !userData.is_admin) {
            try {
              const doctorProfileResponse = await api.get('/api/doctor-profile/profiles/');
              if (doctorProfileResponse.data && doctorProfileResponse.data.length > 0) {
                const doctorProfile = doctorProfileResponse.data[0];
                if (doctorProfile?.workplace) {
                  setWorkplace(doctorProfile.workplace);
                }
              }
            } catch (error) {
              console.error('Error fetching doctor profile:', error);
            }
          } else {
            // Если пользователь не врач или админ, очищаем поле workplace
            setWorkplace('');
          }
          
          // Если пользователь не админ, сразу проверяем существование чата
          if (!userData.is_admin && userData.id) {
            console.log('Запуск начальной проверки чата для пользователя:', userData.id);
            checkChatExists();
          }
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchUser();
  }, []);

  const checkChatExists = async () => {
    if (!userId || isAdmin) {
      console.log('Пропуск проверки чата:', { userId, isAdmin });
      setChatExists(false);
      return;
    }
    
    console.log('Проверка существования чата для пользователя:', userId);
    try {
      const response = await api.get(`/api/chat/check-question/${userId}/`);
      console.log('Ответ сервера о существовании чата:', response.data);
      
      if (response.data.error) {
        console.error('Ошибка от сервера:', response.data.error);
        setChatExists(false);
        return;
      }
      
      const exists = Boolean(response.data.exists);
      const messageCount = response.data.message_count || 0;
      console.log('Чат существует:', exists, 'количество сообщений:', messageCount);
      
      setChatExists(exists);
      
      if (exists) {
        console.log('Чат найден, отображаем компонент DoctorChat');
      } else {
        console.log('Чат не найден, скрываем компонент DoctorChat');
      }
    } catch (error) {
      console.error('Ошибка при проверке существования чата:', error);
      setChatExists(false);
    }
  };

  useEffect(() => {
    console.log('Эффект проверки чата сработал:', { 
      userId, 
      isAdmin, 
      currentChatExists: chatExists,
      shouldCheckChat: !isAdmin && userId 
    });
    
    if (!isAdmin && userId) {
      checkChatExists();
    }
  }, [userId, isAdmin]);

  const handleLogout = async () => {
    try {
      await api.post('/api/auth/logout/');
      // Очищаем все данные сессии
      document.cookie.split(";").forEach(function(c) { 
        document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
      });
      // Очищаем localStorage
      localStorage.removeItem('username');
      localStorage.removeItem('password');
      // Перенаправляем на страницу входа
      navigate('/login');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const openHelpModal = () => {
    setIsHelpModalOpen(true);
  };

  const handleHelpModalClose = () => {
    console.log('Закрытие модального окна помощи');
    setIsHelpModalOpen(false);
    // Проверяем существование чата после закрытия модального окна
    if (userId && !isAdmin) {
      console.log('Запуск проверки чата после закрытия модального окна');
      checkChatExists();
    }
  };

  const openLogoutModal = () => {
    setIsLogoutModalOpen(true);
  };

  const closeLogoutModal = () => {
    setIsLogoutModalOpen(false);
  };

  const handleAddPatient = () => {
    setSelectedPatient(null);
    setIsPatientFormOpen(true);
  };

  const handleEditPatient = (patient) => {
    setSelectedPatient(patient);
    setIsPatientFormOpen(true);
  };

  const handlePatientFormClose = () => {
    setIsPatientFormOpen(false);
    setSelectedPatient(null);
  };

  const handlePatientSave = () => {
    handlePatientFormClose();
  };

  const renderContent = () => {
    if (activeTab === 'patients') {
      return (
        <div className="content-grid">
          <div className="content-card">
            <PatientsTable
              onAddPatient={handleAddPatient}
              onEditPatient={handleEditPatient}
            />
          </div>
        </div>
      );
    }

    return (
      <div className="content-grid">
        <div className="content-card">
          <h2 className="card-title">Добро пожаловать в медицинскую систему</h2>
          <p className="card-content">
            Выберите раздел в меню выше для начала работы с системой.
          </p>
        </div>
        <div className="content-card">
          <h2 className="card-title">Быстрый доступ</h2>
          <div className="card-content">
            {workplace && (
              <div style={{ marginBottom: '15px', color: '#666' }}>
                {workplace}
              </div>
            )}
            <p style={{ marginBottom: '15px' }}>
              Вы можете посмотреть список пациентов или добавить нового пациента
            </p>
            <button 
              className="button button-primary" 
              style={{ marginRight: '10px' }}
              onClick={() => navigate('/patients')}
            >
              Список пациентов
            </button>
            <button 
              className="button button-secondary"
              onClick={handleAddPatient}
            >
              Добавить пациента
            </button>
          </div>
        </div>
        <div className="content-card help-card">
          <h2 className="card-title">Возникли проблемы?</h2>
          <p className="card-content">
            Если у вас возникли трудности при работе с системой, нажмите кнопку "Помощь" ниже.
            Наши специалисты готовы помочь вам в любое время.
          </p>
          <div className="card-footer">
            <button className="button button-primary" onClick={openHelpModal}>
              Помощь
            </button>
          </div>
        </div>
        <div className="content-card telegram-card">
          <h2 className="card-title">Ускорьте процесс диспансеризации</h2>
          <p className="card-content">
            Перешлите пациентам нашего телеграм бота для быстрого прохождения диспансеризации
            <span className="quote">(для всеобщей диспансеризации)</span>
          </p>
          <div className="card-footer">
            <a 
              href="https://t.me/MedicalAssistantTherapistBot" 
              target="_blank" 
              rel="noopener noreferrer"
              className="button button-primary"
            >
              @MedicalAssistantTherapistBot
            </a>
          </div>
        </div>
        <div className="content-card news-card">
          <h2 className="card-title">Новости диспансеризации</h2>
          <p className="card-content">
            Узнайте актуальную информацию о всеобщей диспансеризации, правилах прохождения и необходимых документах
          </p>
          <div className="card-footer">
            <a 
              href="https://krdgp3.ru/meditsinskaya-profilaktika/vseobschaya-dispanserizatsiya/?utm_source=chatgpt.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="button button-primary"
            >
              Подробнее
            </a>
          </div>
        </div>
        {isLoading ? (
          <div className="content-card greeting-card">
            <Skeleton width="100%" height="24px" className="skeleton-text" />
            <Skeleton width="80%" height="16px" className="skeleton-text" />
            <div className="card-footer">
              <Skeleton width="100px" height="36px" className="skeleton-button" />
            </div>
          </div>
        ) : username && (
          <div className="content-card greeting-card">
            <h2 className="card-title">Здравствуйте, {username}!</h2>
            <div className="card-content">
              <p>Вы вошли в аккаунт под именем {username}</p>
              {!isAdmin && workplace && (
                <div style={{ marginTop: '10px', color: '#666' }}>
                  <strong>Место работы:</strong> {workplace}
                </div>
              )}
            </div>
            <div className="card-footer">
              <button className="button button-secondary" onClick={openLogoutModal}>
                Выйти
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="main-window">
      <div className="main-container">
        {renderContent()}
      </div>
      {isHelpModalOpen && <HelpModal onClose={handleHelpModalClose} />}
      <ConfirmModal
        isOpen={isLogoutModalOpen}
        onClose={closeLogoutModal}
        onConfirm={handleLogout}
        title="Подтверждение выхода"
        message="Вы уверены, что хотите выйти из системы?"
      />
      <PatientForm
        open={isPatientFormOpen}
        onClose={handlePatientFormClose}
        patient={selectedPatient}
        onSave={handlePatientSave}
      />
      {!isAdmin && userId && chatExists && (
        <div style={{ 
          position: 'fixed', 
          bottom: '20px', 
          right: '20px', 
          zIndex: 1000,
          display: 'block'
        }}>
          <DoctorChat userId={userId} />
        </div>
      )}
    </div>
  );
};

export default MainWindow;