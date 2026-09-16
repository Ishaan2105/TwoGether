import { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import api from '../services/api.js';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [welcome, setWelcome] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [checkingUsername, setCheckingUsername] = useState(false);

  const checkDebounceRef = useRef(null);

  const update = (field) => (e) => {
    const val = e.target.value;
    setForm((prev) => ({ ...prev, [field]: val }));
    setError('');

    if (field === 'username') {
      if (checkDebounceRef.current) clearTimeout(checkDebounceRef.current);
      if (val.trim().length >= 3) {
        checkDebounceRef.current = setTimeout(async () => {
          try {
            setCheckingUsername(true);
            const res = await api.get(`/auth/check-username?username=${encodeURIComponent(val.trim())}`);
            if (res.data.available === false) {
              setSuggestions(res.data.suggestions || []);
              setError(res.data.message);
            } else {
              setSuggestions([]);
            }
          } catch {
            // Ignore background check errors
          } finally {
            setCheckingUsername(false);
          }
        }, 350);
      } else {
        setSuggestions([]);
      }
    }
  };

  const handleSelectSuggestion = (suggestedName) => {
    setForm((prev) => ({ ...prev, username: suggestedName }));
    setSuggestions([]);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setSubmitting(true);
    try {
      const user = await register(form);
      setWelcome(user);
    } catch (err) {
      const serverMsg = err.response?.data?.message || 'Something went wrong. Please try again.';
      setError(serverMsg);
      if (err.response?.data?.suggestions) {
        setSuggestions(err.response.data.suggestions);
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (welcome) {
    return (
      <div className="auth-page">
        <div className="auth-card welcome-card">
          <div className="welcome-card__emoji" aria-hidden="true">
            <img src="/tg-logo.png" alt="TwoGether" style={{ width: 52, height: 52, borderRadius: 12 }} />
          </div>
          <h1>Account created!</h1>
          <p>
            Welcome, <strong>{welcome.username}</strong>. This is your personal Duo code — share it
            with your partner to pair up.
          </p>
          <div className="duo-code" aria-label="Your Duo invite code">
            <span className="duo-code__label">YOUR DUO CODE</span>
            <span className="duo-code__value">{welcome.duoInviteCode}</span>
          </div>
          <button
            type="button"
            className="btn btn--primary btn--block"
            onClick={() => navigate('/dashboard')}
          >
            GO TO DASHBOARD
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <Link to="/" className="auth-card__brand">
          <img src="/tg-logo.png" alt="TwoGether" className="auth-brand-img" /> TwoGether
        </Link>
        <h1>Create your account</h1>
        <p className="auth-card__sub">Every great Duo starts with one person.</p>

        {error && (
          <div className="alert alert--error" role="alert">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <div className="form-label-row">
              <label htmlFor="username">Username</label>
              {checkingUsername && <span className="checking-text">Checking…</span>}
            </div>
            <input
              id="username"
              type="text"
              autoComplete="username"
              value={form.username}
              onChange={update('username')}
              placeholder="e.g. duo_warrior or warrior!"
              minLength={3}
              maxLength={20}
              pattern="[a-zA-Z0-9_!#.-]+"
              required
            />
            <span className="form-hint">Tip: You can use !, #, _, and numbers to make your name unique and cool!</span>

            {/* Cool Username Suggestions */}
            {suggestions.length > 0 && (
              <div className="username-suggestions-box">
                <div className="username-suggestions-title">
                  <span>⚡ Try adding <strong>!</strong> or <strong>#</strong>, or tap a suggestion:</span>
                </div>
                <div className="username-suggestions-pills">
                  {suggestions.map((sug) => (
                    <button
                      key={sug}
                      type="button"
                      className="username-suggestion-pill"
                      onClick={() => handleSelectSuggestion(sug)}
                    >
                      <span className="sug-plus">✨</span> {sug}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={form.email}
              onChange={update('email')}
              placeholder="you@example.com"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <div className="password-input-wrapper">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                value={form.password}
                onChange={update('password')}
                placeholder="At least 8 characters"
                minLength={8}
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

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm password</label>
            <div className="password-input-wrapper">
              <input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                autoComplete="new-password"
                value={form.confirmPassword}
                onChange={update('confirmPassword')}
                placeholder="Repeat your password"
                minLength={8}
                required
              />
              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => setShowConfirmPassword((prev) => !prev)}
                aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                title={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
              >
                {showConfirmPassword ? (
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
            {submitting ? 'Creating account…' : 'CREATE ACCOUNT'}
          </button>
        </form>

        <p className="auth-card__footer">
          Already have an account? <Link to="/login">Log in</Link>
        </p>
      </div>
    </div>
  );
}