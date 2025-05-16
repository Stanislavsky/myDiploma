import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import './Header.css';
import api from '../api/api';
import Skeleton from './Skeleton/Skeleton';

const Header = () => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSupport, setIsSupport] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const checkUserRole = async () => {
      try {
        const response = await api.get('/api/auth/check/');
        if (response.data.user) {
          setIsAdmin(response.data.user.is_admin);
          setIsSupport(response.data.user.is_support);
        }
      } catch (error) {
        console.error('Error checking user role:', error);
      } finally {
        setIsLoading(false);
      }
    };
    checkUserRole();
  }, []);

  // Добавляем обработчики для модальных окон
  useEffect(() => {
    const handleModalOpen = () => {
      console.log('Modal opened');
      setIsModalOpen(true);
    };
    const handleModalClose = () => {
      console.log('Modal closed');
      setIsModalOpen(false);
    };

    // Слушаем события открытия/закрытия модальных окон
    document.addEventListener('modalOpen', handleModalOpen);
    document.addEventListener('modalClose', handleModalClose);

    return () => {
      document.removeEventListener('modalOpen', handleModalOpen);
      document.removeEventListener('modalClose', handleModalClose);
    };
  }, []);

  const isActive = (path) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <header className={`header ${isModalOpen ? 'modal-open' : ''}`}>
      <div className="header-container">
        <Link to="/" className="logo">
          Диспанцеризация населения
        </Link>
        
        <nav className="nav-menu">
          <ul className="nav-menu">
            <li className="nav-item">
              <Link 
                to="/" 
                className={`nav-link ${isActive('/') ? 'active' : ''}`}
              >
                Главная
              </Link>
            </li>
            <li className="nav-item">
              <Link 
                to="/patients" 
                className={`nav-link ${isActive('/patients') ? 'active' : ''}`}
              >
                Пациенты
              </Link>
            </li>
            {isLoading ? (
              <li className="nav-item">
                <Skeleton width="120px" height="24px" className="skeleton-button" />
              </li>
            ) : isAdmin && (
              <li className="nav-item">
                <Link 
                  to="/admin" 
                  className={`nav-link ${isActive('/admin') ? 'active' : ''}`}
                >
                  Админ панель
                </Link>
              </li>
            )}
            {isSupport && (
              <li className="nav-item">
                <Link 
                  to="/support" 
                  className={`nav-link ${isActive('/support') ? 'active' : ''}`}
                >
                  Панель сопровождающего
                </Link>
              </li>
            )}
          </ul>
        </nav>

        <div className="user-menu">
          {isLoading ? (
            <Skeleton width="40px" height="40px" className="skeleton-avatar" />
          ) : (
            <img 
              src="/static/images/default-avatar.svg" 
              alt="Avatar" 
              className="user-avatar"
            />
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;