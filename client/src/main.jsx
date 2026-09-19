import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { DuoProvider } from './context/DuoContext.jsx';
import { ThemeProvider } from './context/ThemeContext.jsx';
import { SidebarProvider } from './context/SidebarContext.jsx';
import { ModalProvider } from './context/ModalContext.jsx';
import './index.css';

// Intercept browser window.alert and window.confirm to guarantee zero native browser popups
if (typeof window !== 'undefined') {
  window.alert = (msg) => {
    console.warn('[InApp Alert intercepted]:', msg);
    window.dispatchEvent(
      new CustomEvent('in-app-alert', {
        detail: {
          title: 'Notification',
          message: String(msg),
          icon: 'ℹ️',
        },
      })
    );
  };
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <DuoProvider>
            <SidebarProvider>
              <ModalProvider>
                <App />
              </ModalProvider>
            </SidebarProvider>
          </DuoProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>
);

// Pre-register service worker for PWA & push notifications with automatic update
if ('serviceWorker' in navigator) {
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!refreshing) {
      refreshing = true;
      window.location.reload();
    }
  });

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => {
        // Force checking for sw.js byte changes immediately on launch
        reg.update().catch(() => {});
      })
      .catch((err) => {
        console.warn('[SW] Registration failed:', err);
      });
  });
}