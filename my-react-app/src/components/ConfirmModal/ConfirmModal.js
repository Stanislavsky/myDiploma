import React, { useEffect } from 'react';
import styles from './ConfirmModal.module.css';

function ConfirmModal({ isOpen, onClose, onConfirm, title, message }) {
  useEffect(() => {
    if (isOpen) {
      document.dispatchEvent(new Event('modalOpen'));
    }
    return () => {
      if (isOpen) {
        document.dispatchEvent(new Event('modalClose'));
      }
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modal}>
        <h2 className={styles.modalTitle}>{title}</h2>
        <p className={styles.modalMessage}>{message}</p>
        <div className={styles.modalButtons}>
          <button className={styles.cancelButton} onClick={onClose}>
            Отмена
          </button>
          <button className={styles.confirmButton} onClick={onConfirm}>
            Подтвердить
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmModal; 