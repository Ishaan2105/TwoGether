import { useEffect } from 'react';
import { useInAppModal } from '../../context/ModalContext.jsx';

export default function InAppConfirmModal() {
  const { modalState, handleConfirm, handleCancel } = useInAppModal();

  useEffect(() => {
    if (!modalState.isOpen) return;

    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        handleCancel();
      } else if (e.key === 'Enter') {
        handleConfirm();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [modalState.isOpen, handleCancel, handleConfirm]);

  if (!modalState.isOpen) return null;

  const isDanger = modalState.variant === 'danger';
  const isWarning = modalState.variant === 'warning';

  return (
    <div className="in-app-modal-backdrop" onClick={handleCancel} role="dialog" aria-modal="true">
      <div
        className={`in-app-modal-card in-app-modal-card--${modalState.variant}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="in-app-modal-icon-badge" aria-hidden="true">
          <span>{modalState.icon}</span>
        </div>

        <div className="in-app-modal-body">
          <h3 className="in-app-modal-title">{modalState.title}</h3>
          <p className="in-app-modal-message">{modalState.message}</p>
        </div>

        <div className="in-app-modal-actions">
          {modalState.type === 'confirm' && (
            <button
              type="button"
              className="btn btn--ghost in-app-modal-btn in-app-modal-btn--cancel"
              onClick={handleCancel}
            >
              {modalState.cancelText || 'Cancel'}
            </button>
          )}
          <button
            type="button"
            className={`btn ${
              isDanger ? 'btn--danger' : isWarning ? 'btn--secondary' : 'btn--primary'
            } in-app-modal-btn in-app-modal-btn--confirm`}
            onClick={handleConfirm}
            autoFocus
          >
            {modalState.confirmText || 'OK'}
          </button>
        </div>
      </div>
    </div>
  );
}
