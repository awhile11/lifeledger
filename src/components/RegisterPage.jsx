import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, createUserWithEmailAndPassword } from '../firebase';
import { updateProfile } from 'firebase/auth';
import './RegisterPage.css';

function RegisterPage() {
  const [name, setName] = useState('');
  const [surname, setSurname] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  // Helper function to get user-specific localStorage key
  const getUserKey = (userId, key) => {
    return `user_${userId}_${key}`;
  };

  // Initialize user data structure in localStorage
  const initializeUserData = (userId) => {
    // Initialize todos
    const todosKey = getUserKey(userId, 'todos');
    localStorage.setItem(todosKey, JSON.stringify([]));

    // Initialize tasks
    const tasksKey = getUserKey(userId, 'tasks');
    localStorage.setItem(tasksKey, JSON.stringify([]));

    // Initialize daily activity
    const dailyKey = getUserKey(userId, 'dailyActivity');
    localStorage.setItem(dailyKey, JSON.stringify({
      name: '',
      startTime: '',
      endTime: '',
      isActive: false
    }));

    // Initialize financial data
    const financeKey = getUserKey(userId, 'financialData');
    localStorage.setItem(financeKey, JSON.stringify({
      savings: { items: [], total: 0 },
      food: { items: [], total: 0 },
      transport: { items: [], total: 0 },
      entertainment: { items: [], total: 0 },
      home: { items: [], total: 0 },
      shopping: { items: [], total: 0 },
      healthcare: { items: [], total: 0 },
      education: { items: [], total: 0 },
      utilities: { items: [], total: 0 },
      other: { items: [], total: 0 },
      overallSpending: 0,
      monthlyData: {
        Jan: 0, Feb: 0, Mar: 0, Apr: 0, May: 0,
        Jun: 0, Jul: 0, Aug: 0, Sep: 0, Oct: 0, Nov: 0, Dec: 0
      }
    }));

    // Initialize monthly budget
    const budgetKey = getUserKey(userId, 'monthlyBudget');
    localStorage.setItem(budgetKey, '0');

    // Set initialization flag
    const initKey = getUserKey(userId, 'initialized');
    localStorage.setItem(initKey, 'true');

    console.log('User data initialized for:', userId);
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    // Validation
    if (!name.trim() || !surname.trim()) {
      setError('Name and surname are required');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      // Create user with email and password
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Update profile with display name
      await updateProfile(user, {
        displayName: `${name} ${surname}`
      });

      // Initialize user data in localStorage
      initializeUserData(user.uid);

      console.log('Registration successful');
      setSuccess(true);
      
      // Redirect to login after 2 seconds
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (error) {
      console.error('Registration error:', error.message);
      switch (error.code) {
        case 'auth/email-already-in-use':
          setError('An account with this email already exists');
          break;
        case 'auth/invalid-email':
          setError('Invalid email address');
          break;
        case 'auth/weak-password':
          setError('Password is too weak – use at least 6 characters');
          break;
        case 'auth/too-many-requests':
          setError('Too many attempts. Please try again later.');
          break;
        default:
          setError('Failed to register. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = (e) => {
    e.preventDefault();
    navigate('/login');
  };

  return (
    <div className="register-container">
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

        {/* Right Side - Register Form */}
        <div className="form-side">
          <div className="register-box">
            <h2 className="form-title">CREATE ACCOUNT</h2>
            
            {error && <div className="error-message">{error}</div>}
            {success && <div className="success-message">Registration successful! Redirecting to login...</div>}
            
            <form onSubmit={handleRegister}>
              <div className="name-group">
                <div className="input-group half">
                  <input
                    type="text"
                    placeholder="Name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={loading || success}
                    required
                  />
                </div>
                <div className="input-group half">
                  <input
                    type="text"
                    placeholder="Surname"
                    value={surname}
                    onChange={(e) => setSurname(e.target.value)}
                    disabled={loading || success}
                    required
                  />
                </div>
              </div>

              <div className="input-group">
                <input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading || success}
                  required
                />
              </div>

              <div className="input-group">
                <input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading || success}
                  required
                />
              </div>

              <div className="input-group">
                <input
                  type="password"
                  placeholder="Confirm Password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={loading || success}
                  required
                />
              </div>

              <div className="info-text">
                <p>Password must be at least 6 characters long</p>
              </div>

              <div className="button-group">
                <button 
                  type="submit" 
                  className="btn register-btn"
                  disabled={loading || success}
                >
                  {loading ? 'CREATING ACCOUNT...' : 'REGISTER'}
                </button>
              </div>

              <div className="login-link">
                <p>Already have an account? <a href="#" onClick={handleLogin}>Login here</a></p>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default RegisterPage;