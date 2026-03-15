import React, { useState, useEffect } from 'react';
import { auth } from '../firebase';
import { updateProfile } from 'firebase/auth';
import { useTheme } from '../context/ThemeContext';
import './SettingsModal.css';

function SettingsModal({ isOpen, onClose, user }) {
  const [name, setName] = useState('');
  const [surname, setSurname] = useState('');
  const [email, setEmail] = useState('');
  const [gender, setGender] = useState('male'); // 'male' or 'female'
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const { isDarkMode, setTheme } = useTheme();

  useEffect(() => {
    if (user) {
      const displayName = user.displayName || '';
      const nameParts = displayName.split(' ');
      setName(nameParts[0] || '');
      setSurname(nameParts.slice(1).join(' ') || '');
      setEmail(user.email || '');
      
      // Load saved gender from localStorage
      const savedGender = localStorage.getItem(`user_${user.uid}_gender`);
      if (savedGender) {
        setGender(savedGender);
      }
    }
  }, [user]);

  const handleSaveProfile = async () => {
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      await updateProfile(auth.currentUser, {
        displayName: `${name} ${surname}`.trim()
      });
      
      // Save gender to localStorage
      if (user) {
        localStorage.setItem(`user_${user.uid}_gender`, gender);
      }
      
      setSuccess('Profile updated successfully!');
      setTimeout(() => {
        setSuccess('');
        onClose();
      }, 1500);
    } catch (err) {
      setError('Failed to update profile: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = () => {
    if (window.confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      alert('Account deletion feature coming soon!');
    }
  };

  const handleThemeChange = (mode) => {
    setTheme(mode);
  };

  if (!isOpen) return null;

  return (
    <div className="settings-modal-overlay" onClick={onClose}>
      <div className="settings-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="settings-modal-header">
          <h2>Settings</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="settings-modal-body">
          {/* Profile Section */}
          <div className="settings-section">
            <h3>Profile Information</h3>
            {error && <div className="error-message">{error}</div>}
            {success && <div className="success-message">{success}</div>}
            
            <div className="form-group">
              <label>Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
              />
            </div>

            <div className="form-group">
              <label>Surname</label>
              <input
                type="text"
                value={surname}
                onChange={(e) => setSurname(e.target.value)}
                placeholder="Your surname"
              />
            </div>

            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                value={email}
                disabled
                className="disabled-input"
              />
              <small className="input-note">Email cannot be changed</small>
            </div>

            {/* Gender Selection */}
            <div className="form-group">
              <label>Gender</label>
              <div className="gender-radio-group">
                <label className={`gender-radio ${gender === 'male' ? 'selected' : ''}`}>
                  <input
                    type="radio"
                    name="gender"
                    value="male"
                    checked={gender === 'male'}
                    onChange={(e) => setGender(e.target.value)}
                  />
                  <span className="radio-custom"></span>
                  <span className="gender-label">
                    Male
                  </span>
                </label>
                
                <label className={`gender-radio ${gender === 'female' ? 'selected' : ''}`}>
                  <input
                    type="radio"
                    name="gender"
                    value="female"
                    checked={gender === 'female'}
                    onChange={(e) => setGender(e.target.value)}
                  />
                  <span className="radio-custom"></span>
                  <span className="gender-label">
                    Female
                  </span>
                </label>
              </div>
              <small className="input-note">Used for health calculations (water intake, calories, etc.)</small>
            </div>

            <button 
              className="save-profile-btn"
              onClick={handleSaveProfile}
              disabled={loading}
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>

          {/* Appearance Section with Radio Buttons */}
          <div className="settings-section">
            <h3>Appearance</h3>
            <div className="theme-radio-group">
              <label className={`theme-radio ${!isDarkMode ? 'selected' : ''}`}>
                <input
                  type="radio"
                  name="theme"
                  value="light"
                  checked={!isDarkMode}
                  onChange={() => handleThemeChange('light')}
                />
                <span className="radio-custom"></span>
                <span className="theme-label">
                   Light Mode
                </span>
              </label>
              
              <label className={`theme-radio ${isDarkMode ? 'selected' : ''}`}>
                <input
                  type="radio"
                  name="theme"
                  value="dark"
                  checked={isDarkMode}
                  onChange={() => handleThemeChange('dark')}
                />
                <span className="radio-custom"></span>
                <span className="theme-label">
                   Dark Mode
                </span>
              </label>
            </div>
          </div>

          {/* Account Section */}
          <div className="settings-section">
            <h3>Account</h3>
            <button className="danger-btn" onClick={handleDeleteAccount}>
              Delete Account
            </button>
            <small className="warning-text">This action cannot be undone</small>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SettingsModal;