import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import './App.css';
import LoginPage from './components/LoginPage';
import RegisterPage from './components/RegisterPage';
import Dashboard from './components/Dashboard';
import ActivityTracking from './components/ActivityTracking';
import FinancialTracking from './components/FinancialTracking';
import HealthFitness from './components/HealthFitness';

function App() {
  return (
    <Router>
      <ThemeProvider>
        <div className="App">
          <Routes>
            <Route path="/" element={<LoginPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/activity" element={<ActivityTracking />} />
            <Route path="/financial" element={<FinancialTracking />} />
            <Route path="/health" element={<HealthFitness />} />
          </Routes>
        </div>
      </ThemeProvider>
    </Router>
  );
}

export default App;