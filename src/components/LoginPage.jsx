import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, signInWithEmailAndPassword } from '../firebase';
import './LoginPage.css';

function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await signInWithEmailAndPassword(auth, email, password);
      console.log('Login successful');
      navigate('/dashboard');
    } catch (error) {
      console.error('Login error:', error.message);
      switch (error.code) {
        case 'auth/invalid-email':
          setError('Invalid email address');
          break;
        case 'auth/user-disabled':
          setError('This account has been disabled');
          break;
        case 'auth/user-not-found':
          setError('No account found with this email');
          break;
        case 'auth/wrong-password':
          setError('Incorrect password');
          break;
        default:
          setError('Failed to login. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = (e) => {
    e.preventDefault();
    navigate('/register');
  };

  const handleForgotPassword = (e) => {
    e.preventDefault();
    // You can implement password reset functionality here
    alert('Password reset feature coming soon!');
  };

  return (
    <div className="login-container">
      <div className="split-layout">
        {/* Left Side - Branding with Circles */}
        <div className="brand-side">
          <div className="circles-container">
            <div className="circle circle-1"></div>
            <div className="circle circle-2"></div>
            <div className="circle circle-3"></div>
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

        {/* Right Side - Login Form */}
        <div className="form-side">
          <div className="login-box">
            {error && <div className="error-message">{error}</div>}
            
            <div className="input-group">
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                required
              />
            </div>

            <div className="input-group">
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                required
              />
            </div>

            <div className="button-group">
              <button 
                type="button" 
                className="btn signup-btn" 
                onClick={handleSignUp}
                disabled={loading}
              >
                SIGNUP
              </button>
              <button 
                type="submit" 
                className="btn login-btn" 
                onClick={handleLogin}
                disabled={loading}
              >
                {loading ? 'LOGGING IN...' : 'LOGIN'}
              </button>
            </div>

            <div className="forgot-password">
              <a href="#" onClick={handleForgotPassword}>
                Forgot Password?
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;