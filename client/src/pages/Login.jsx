import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import api from '../services/api.js';
import { forgotPassword as apiForgotPassword } from '../services/auth.js';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Forgot password modal state
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotMsg, setForgotMsg] = useState('');
  const [forgotErr, setForgotErr] = useState('');

  // Predictions state
  const [predictions, setPredictions] = useState([]);
  const [showPredictions, setShowPredictions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  const passwordInputRef = useRef(null);
  const wrapperRef = useRef(null);
  const debounceTimerRef = useRef(null);

  // Ensure Login page color theme is always Dark Blue (#0a192f / #050f1d)
  useEffect(() => {
    document.documentElement.classList.add('landing-dark-theme');
    document.body.classList.add('landing-dark-theme');
    return () => {
      document.documentElement.classList.remove('landing-dark-theme');
      document.body.classList.remove('landing-dark-theme');
    };
  }, []);

  // Close prediction dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setShowPredictions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Live prediction fetching with debounce
  const handleIdentifierChange = (e) => {
    const val = e.target.value;
    setIdentifier(val);
    setError('');
    setSelectedIndex(-1);

    if (!val || val.trim().length === 0) {
      setPredictions([]);
      setShowPredictions(false);
      return;
    }

    const clean = val.trim().toLowerCase();

    // Check locally saved logins for instant preview
    let localMatches = [];
    try {
      const saved = JSON.parse(localStorage.getItem('twogether_recent_logins') || '[]');
      localMatches = saved
        .filter((item) => item.toLowerCase().startsWith(clean))
        .map((u) => ({ username: u, customTitle: 'Recent on this device' }));
    } catch {
      // Ignore
    }

    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

    debounceTimerRef.current = setTimeout(async () => {
      try {
        const res = await api.get(`/auth/predict-username?q=${encodeURIComponent(clean)}`);
        const serverMatches = res.data.predictions || [];

        // Merge and deduplicate by username
        const seen = new Set();
        const combined = [];

        [...serverMatches, ...localMatches].forEach((item) => {
          const lower = item.username.toLowerCase();
          if (!seen.has(lower)) {
            seen.add(lower);
            combined.push(item);
          }
        });

        setPredictions(combined);
        setShowPredictions(combined.length > 0);
      } catch {
        if (localMatches.length > 0) {
          setPredictions(localMatches);
          setShowPredictions(true);
        }
      }
    }, 120);
  };

  const selectPrediction = (username) => {
    setIdentifier(username);
    setShowPredictions(false);
    setPredictions([]);
    passwordInputRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (!showPredictions || predictions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1 < predictions.length ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 >= 0 ? prev - 1 : predictions.length - 1));
    } else if (e.key === 'Enter' && selectedIndex >= 0) {
      e.preventDefault();
      selectPrediction(predictions[selectedIndex].username);
    } else if (e.key === 'Escape') {
      setShowPredictions(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setShowPredictions(false);
    setSubmitting(true);
    try {
      await login(identifier, password);

      // Save identifier to recent logins for future fast prediction
      try {
        const saved = JSON.parse(localStorage.getItem('twogether_recent_logins') || '[]');
        const updated = [identifier.trim(), ...saved.filter((u) => u.toLowerCase() !== identifier.trim().toLowerCase())].slice(0, 5);
        localStorage.setItem('twogether_recent_logins', JSON.stringify(updated));
      } catch {
        // Ignore
      }

      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid credentials. Please verify and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleForgotPasswordSubmit = async (e) => {
    e.preventDefault();
    if (!forgotEmail) return;
    setForgotLoading(true);
    setForgotErr('');
    setForgotMsg('');
    try {
      const res = await apiForgotPassword(forgotEmail);
      setForgotMsg(res.message || 'Temporary password has been sent to your email.');
      setIdentifier(forgotEmail);
    } catch (err) {
      setForgotErr(err.response?.data?.message || 'Failed to send temporary password. Please try again.');
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <Link to="/" className="auth-card__brand">
          <img src="/tg-logo.png" alt="TwoGether" className="auth-brand-img" /> TwoGether
        </Link>
        <h1>Welcome back</h1>
        <p className="auth-card__sub">Your streak missed you.</p>

        {error && (
          <div className="alert alert--error" role="alert">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group" ref={wrapperRef} style={{ position: 'relative' }}>
            <label htmlFor="identifier">Username</label>
            <input
              id="identifier"
              type="text"
              autoComplete="username"
              value={identifier}
              onChange={handleIdentifierChange}
              onKeyDown={handleKeyDown}
              onFocus={() => predictions.length > 0 && setShowPredictions(true)}
              placeholder="Enter your username..."
              required
            />

            {/* Live Username Prediction Dropdown */}
            {showPredictions && predictions.length > 0 && (
              <div className="login-predictions-dropdown" role="listbox">
                <div className="login-predictions-header">
                  <span>⚡ Predicted Accounts</span>
                  <small>Tap or press ↵</small>
                </div>
                {predictions.map((p, idx) => {
                  const isSelected = idx === selectedIndex;
                  return (
                    <div
                      key={p.username}
                      className={`login-prediction-item ${isSelected ? 'login-prediction-item--active' : ''}`}
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => selectPrediction(p.username)}
                    >
                      <span className="login-prediction-avatar">
                        {(p.username?.[0] || 'U').toUpperCase()}
                      </span>
                      <div className="login-prediction-info">
                        <span className="login-prediction-name">
                          <strong>{p.username.slice(0, identifier.length)}</strong>
                          {p.username.slice(identifier.length)}
                        </span>
                        {p.customTitle && (
                          <span className="login-prediction-badge">{p.customTitle}</span>
                        )}
                      </div>
                      <span className="login-prediction-action">Select ↵</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="form-group">
            <div className="form-label-row">
              <label htmlFor="password">Password</label>
              <button
                type="button"
                className="forgot-password-link"
                onClick={() => {
                  setShowForgotModal(true);
                  setForgotEmail(identifier.includes('@') ? identifier : '');
                  setForgotMsg('');
                  setForgotErr('');
                }}
              >
                Forgot password?
              </button>
            </div>
            <div className="password-input-wrapper">
              <input
                ref={passwordInputRef}
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  /* Eye open icon */
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                ) : (
                  /* Eye off / slashed icon */
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <button type="submit" className="btn btn--primary btn--block" disabled={submitting}>
            {submitting ? 'Logging in…' : 'LOGIN'}
          </button>
        </form>

        <p className="auth-card__footer">
          New to TwoGether? <Link to="/register">Create an account</Link>
        </p>
      </div>

      {/* Forgot Password Recovery Modal */}
      {showForgotModal && (
        <div
          className="modal-backdrop"
          onClick={() => !forgotLoading && setShowForgotModal(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="forgot-modal-title"
        >
          <div className="modal-card modal-card--forgot" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-header__title-group">
                <span className="modal-badge">🔑 ACCOUNT ACCESS</span>
                <h3 id="forgot-modal-title">Reset Password</h3>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setShowForgotModal(false)}
                disabled={forgotLoading}
                aria-label="Close recovery dialog"
              >
                ✕
              </button>
            </div>

            <p className="modal-description">
              Enter your registered email address. We will send you an aesthetic login email containing a secure <strong>temporary password</strong> to immediately sign in and update your credentials.
            </p>

            {forgotErr && (
              <div className="auth-alert auth-alert--error" role="alert">
                {forgotErr}
              </div>
            )}

            {forgotMsg && (
              <div className="auth-alert auth-alert--success" role="status">
                <strong>✓ Check your inbox:</strong> {forgotMsg}
              </div>
            )}

            {!forgotMsg ? (
              <form onSubmit={handleForgotPasswordSubmit} noValidate>
                <div className="form-group">
                  <label htmlFor="forgot-email">Registered Email</label>
                  <input
                    id="forgot-email"
                    type="email"
                    autoComplete="email"
                    value={forgotEmail}
                    onChange={(e) => {
                      setForgotEmail(e.target.value);
                      setForgotErr('');
                    }}
                    placeholder="you@example.com"
                    required
                    autoFocus
                  />
                </div>

                <div className="modal-actions">
                  <button
                    type="button"
                    className="btn btn--secondary"
                    onClick={() => setShowForgotModal(false)}
                    disabled={forgotLoading}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn--primary"
                    disabled={forgotLoading || !forgotEmail}
                  >
                    {forgotLoading ? 'Sending Email…' : 'Send Temporary Password →'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="modal-actions modal-actions--center">
                <button
                  type="button"
                  className="btn btn--primary btn--block"
                  onClick={() => {
                    setShowForgotModal(false);
                    setTimeout(() => {
                      if (passwordInputRef.current) passwordInputRef.current.focus();
                    }, 100);
                  }}
                >
                  Enter Temporary Password & Sign In →
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}