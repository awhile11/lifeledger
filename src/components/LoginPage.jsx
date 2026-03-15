import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, signInWithEmailAndPassword } from '../firebase';
import './LoginPage.css';

function LoginPage() {
  const [email,         setEmail]         = useState('');
  const [password,      setPassword]      = useState('');
  const [error,         setError]         = useState('');
  const [loading,       setLoading]       = useState(false);
  const [showComingSoon, setShowComingSoon] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate('/dashboard');
    } catch (err) {
      switch (err.code) {
        case 'auth/invalid-email':
          setError('Invalid email address'); break;
        case 'auth/user-disabled':
          setError('This account has been disabled'); break;
        case 'auth/user-not-found':
        case 'auth/wrong-password':
        case 'auth/invalid-credential':
          setError('Incorrect email or password'); break;
        case 'auth/too-many-requests':
          setError('Too many failed attempts. Please try again later.'); break;
        default:
          setError('Failed to login. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = (e) => {
    e.preventDefault();
    setShowComingSoon(true);
    setTimeout(() => setShowComingSoon(false), 3000);
  };

  return (
    <div className="login-container">
      <div className="split-layout">

        {/* Left – Branding */}
        <div className="brand-side">
          <div className="circles-container">
            <div className="circle circle-1" />
            <div className="circle circle-2" />
            <div className="circle circle-3" />
          </div>
          <div className="brand-content">
            <h1 className="brand-title">LIFELEADGER</h1>
            <div className="brand-slogan">
              <p>CONTROL YOUR TIME</p>
              <p>UNDERSTAND YOUR HABITS</p>
              <p>BUILD THE LIFE YOU ACTUALLY WANT</p>
            </div>
          </div>
        </div>

        {/* Right – Login Form */}
        <div className="form-side">
          <div className="login-box">
            {error && <div className="error-message">{error}</div>}

            <form onSubmit={handleLogin} noValidate>
              <div className="input-group">
                <input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  disabled={loading}
                  required
                  autoComplete="email"
                />
              </div>

              <div className="input-group">
                <input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  disabled={loading}
                  required
                  autoComplete="current-password"
                />
              </div>

              <div className="button-group">
                <button
                  type="button"
                  className="btn signup-btn"
                  onClick={() => navigate('/register')}
                  disabled={loading}
                >
                  SIGNUP
                </button>
                <button type="submit" className="btn login-btn" disabled={loading}>
                  {loading ? 'LOGGING IN...' : 'LOGIN'}
                </button>
              </div>
            </form>

            <div className="forgot-password">
              <a href="#" onClick={handleForgotPassword}>
                Forgot Password?
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Coming Soon Toast */}
      {showComingSoon && (
        <div className="coming-soon-toast">
          <span className="toast-icon">🔧</span>
          <span className="toast-text">Password reset coming soon!</span>
        </div>
      )}
    </div>
  );
}

export default LoginPage;