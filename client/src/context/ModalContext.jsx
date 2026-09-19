import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';

const ModalContext = createContext(null);

export function ModalProvider({ children }) {
  const [modalState, setModalState] = useState({
    isOpen: false,
    type: 'confirm', // 'confirm' | 'alert'
    title: '',
    message: '',
    icon: '💬',
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    variant: 'primary', // 'primary' | 'danger' | 'warning'
  });

  const resolverRef = useRef(null);

  const showConfirm = useCallback(
    ({
      title = 'Are you sure?',
      message = '',
      icon = '⚠️',
      confirmText = 'Confirm',
      cancelText = 'Cancel',
      variant = 'primary',
    } = {}) => {
      return new Promise((resolve) => {
        resolverRef.current = resolve;
        setModalState({
          isOpen: true,
          type: 'confirm',
          title,
          message,
          icon,
          confirmText,
          cancelText,
          variant,
        });
      });
    },
    []
  );

  const showAlert = useCallback(
    ({
      title = 'Notice',
      message = '',
      icon = 'ℹ️',
      confirmText = 'OK',
      variant = 'primary',
    } = {}) => {
      return new Promise((resolve) => {
        resolverRef.current = resolve;
        setModalState({
          isOpen: true,
          type: 'alert',
          title,
          message,
          icon,
          confirmText,
          cancelText: '',
          variant,
        });
      });
    },
    []
  );

  const handleConfirm = useCallback(() => {
    setModalState((prev) => ({ ...prev, isOpen: false }));
    if (resolverRef.current) {
      resolverRef.current(true);
      resolverRef.current = null;
    }
  }, []);

  const handleCancel = useCallback(() => {
    setModalState((prev) => ({ ...prev, isOpen: false }));
    if (resolverRef.current) {
      resolverRef.current(false);
      resolverRef.current = null;
    }
  }, []);

  // Listen for custom in-app alerts dispatched from global window events
  useEffect(() => {
    function onCustomAlert(e) {
      if (e.detail?.message) {
        showAlert({
          title: e.detail.title || 'Notification',
          message: e.detail.message,
          icon: e.detail.icon || 'ℹ️',
        });
      }
    }
    window.addEventListener('in-app-alert', onCustomAlert);
    return () => window.removeEventListener('in-app-alert', onCustomAlert);
  }, [showAlert]);

  return (
    <ModalContext.Provider
      value={{
        showConfirm,
        showAlert,
        modalState,
        handleConfirm,
        handleCancel,
      }}
    >
      {children}
    </ModalContext.Provider>
  );
}

export function useInAppModal() {
  const ctx = useContext(ModalContext);
  if (!ctx) {
    throw new Error('useInAppModal must be used within a ModalProvider');
  }
  return ctx;
}
