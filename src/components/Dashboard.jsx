import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, signOut } from '../firebase';
import SettingsModal from './SettingsModal';
import './Dashboard.css';

function Dashboard() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('home');
  const [immediateFocus, setImmediateFocus] = useState([]);
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [newBudget, setNewBudget] = useState('');
  const [streakData, setStreakData] = useState({
    currentStreak: 0,
    longestStreak: 0,
    todayCompleted: 0,
    totalCompleted: 0
  });
  
  // Task completion data
  const [taskData, setTaskData] = useState({
    totalTasks: 0,
    completedTasks: 0,
    pendingTasks: 0,
    completionPercentage: 0
  });
  
  const [dashboardData, setDashboardData] = useState({
    finance: {
      monthlyBudget: 0,
      spent: 0,
      percentageUsed: 0,
      remaining: 0,
      isOverBudget: false
    },
    systemAlerts: []
  });
  
  const navigate = useNavigate();

  // Helper function to get user-specific localStorage key
  const getUserKey = (userId, key) => {
    return `user_${userId}_${key}`;
  };

  // Load all user data
  const loadAllUserData = (userId) => {
    loadBudgetFromStorage(userId);
    loadFinancialData(userId);
    loadImmediateFocus(userId);
    updateSystemAlerts(userId);
    calculateStreak(userId);
    calculateTaskCompletion(userId);
  };

  // Calculate task completion from todos
  const calculateTaskCompletion = (userId) => {
    try {
      const todosKey = getUserKey(userId, 'todos');
      const savedTodos = localStorage.getItem(todosKey);
      
      if (savedTodos) {
        const todos = JSON.parse(savedTodos);
        const total = todos.length;
        const completed = todos.filter(todo => todo.completed).length;
        const pending = total - completed;
        const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

        setTaskData({
          totalTasks: total,
          completedTasks: completed,
          pendingTasks: pending,
          completionPercentage: percentage
        });
      } else {
        setTaskData({
          totalTasks: 0,
          completedTasks: 0,
          pendingTasks: 0,
          completionPercentage: 0
        });
      }
    } catch (error) {
      console.error('Error calculating task completion:', error);
    }
  };

  // Calculate streak from completed tasks
  const calculateStreak = (userId) => {
    try {
      const tasksKey = getUserKey(userId, 'tasksByDay');
      const todosKey = getUserKey(userId, 'todos');
      const savedTasks = localStorage.getItem(tasksKey);
      const savedTodos = localStorage.getItem(todosKey);
      
      let completedToday = 0;
      let totalCompleted = 0;
      let streak = 0;
      let longestStreak = 0;

      if (savedTasks) {
        const tasksByDay = JSON.parse(savedTasks);
        // Count completed tasks across all days
        Object.values(tasksByDay).forEach(dayTasks => {
          dayTasks.forEach(task => {
            if (task.completed) {
              totalCompleted++;
            }
          });
        });
        streak = Math.floor(totalCompleted / 3);
        longestStreak = Math.max(longestStreak, streak);
      }

      if (savedTodos) {
        const todos = JSON.parse(savedTodos);
        todos.forEach(todo => {
          if (todo.completed) {
            totalCompleted++;
          }
        });
      }

      setStreakData({
        currentStreak: streak,
        longestStreak: longestStreak,
        todayCompleted: completedToday,
        totalCompleted
      });

    } catch (error) {
      console.error('Error calculating streak:', error);
    }
  };

  // Load budget from localStorage
  const loadBudgetFromStorage = (userId) => {
    const budgetKey = getUserKey(userId, 'monthlyBudget');
    const savedBudget = localStorage.getItem(budgetKey);
    if (savedBudget) {
      setDashboardData(prev => ({
        ...prev,
        finance: {
          ...prev.finance,
          monthlyBudget: parseFloat(savedBudget)
        }
      }));
    }
  };

  // Load financial data from Financial Tracking page
  const loadFinancialData = (userId) => {
    try {
      const financeKey = getUserKey(userId, 'financialData');
      const savedFinance = localStorage.getItem(financeKey);
      
      if (savedFinance) {
        const finance = JSON.parse(savedFinance);
        const currentMonth = new Date().toLocaleString('default', { month: 'short' });
        const monthlySpent = finance.monthlyData?.[currentMonth] || 0;
        
        setDashboardData(prev => {
          const monthlyBudget = prev.finance.monthlyBudget || 0;
          const percentageUsed = monthlyBudget > 0 ? (monthlySpent / monthlyBudget) * 100 : 0;
          const remaining = monthlyBudget - monthlySpent;
          const isOverBudget = monthlySpent > monthlyBudget;

          return {
            ...prev,
            finance: {
              ...prev.finance,
              spent: monthlySpent,
              percentageUsed: Math.min(percentageUsed, 100),
              remaining: remaining,
              isOverBudget
            }
          };
        });
      }
    } catch (error) {
      console.error('Error loading financial data:', error);
    }
  };

  // Load data from localStorage for Immediate Focus (TASKS ONLY)
  const loadImmediateFocus = (userId) => {
    try {
      const tasksKey = getUserKey(userId, 'tasksByDay');
      const savedTasks = localStorage.getItem(tasksKey);

      const focusItems = [];

      // Check tasks for today - ONLY for Immediate Focus
      if (savedTasks) {
        const tasksByDay = JSON.parse(savedTasks);
        const today = new Date();
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const todayName = days[today.getDay()];
        
        // Get today's tasks that aren't completed
        const todayTasks = tasksByDay[todayName]?.filter(task => !task.completed) || [];

        if (todayTasks.length > 0) {
          // Add a single reminder for today's tasks
          focusItems.push({
            type: 'task-reminder',
            title: `Task Reminder`,
            description: `You have ${todayTasks.length} task${todayTasks.length > 1 ? 's' : ''} scheduled for today`,
            priority: todayTasks.length > 2 ? 'high' : 'medium'
          });
        }

        // Check for upcoming tasks (next 2 days)
        const upcomingTasks = [];
        for (let i = 1; i <= 2; i++) {
          const nextDate = new Date();
          nextDate.setDate(nextDate.getDate() + i);
          const nextDayName = days[nextDate.getDay()];
          const nextDayTasks = tasksByDay[nextDayName]?.filter(task => !task.completed) || [];
          if (nextDayTasks.length > 0) {
            upcomingTasks.push({
              day: nextDayName,
              count: nextDayTasks.length
            });
          }
        }

        if (upcomingTasks.length > 0) {
          focusItems.push({
            type: 'upcoming',
            title: 'Upcoming Tasks',
            description: upcomingTasks.map(t => `${t.count} on ${t.day}`).join(', '),
            deadline: 'Soon',
            priority: 'low'
          });
        }
      }

      // Sort focus items by priority
      const sortedFocus = focusItems.sort((a, b) => {
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      });

      setImmediateFocus(sortedFocus.slice(0, 3)); // Show top 3 items
      
    } catch (error) {
      console.error('Error loading focus items:', error);
    }
  };

  const updateSystemAlerts = (userId) => {
    const alerts = [];
    
    // Check for pending tasks
    if (taskData.pendingTasks > 0) {
      alerts.push({ type: 'warning', message: `${taskData.pendingTasks} pending task${taskData.pendingTasks > 1 ? 's' : ''}` });
    }

    // Check for budget alerts
    if (dashboardData.finance.isOverBudget) {
      const overAmount = Math.abs(dashboardData.finance.remaining);
      alerts.push({ type: 'error', message: `Over budget by R${overAmount.toLocaleString()}!` });
    } else if (dashboardData.finance.percentageUsed > 80) {
      alerts.push({ type: 'warning', message: `${Math.round(dashboardData.finance.percentageUsed)}% of budget used` });
    }

    // Check for active daily activity - ONLY for System Alerts
    try {
      const dailyKey = getUserKey(userId, 'dailyActivity');
      const savedDailyActivity = localStorage.getItem(dailyKey);
      
      if (savedDailyActivity) {
        const dailyActivity = JSON.parse(savedDailyActivity);
        if (dailyActivity.isActive && dailyActivity.name) {
          const now = new Date();
          const [startHour, startMin] = dailyActivity.startTime.split(':').map(Number);
          const [endHour, endMin] = dailyActivity.endTime.split(':').map(Number);
          
          const todayStart = new Date();
          todayStart.setHours(startHour, startMin, 0, 0);
          
          const todayEnd = new Date();
          todayEnd.setHours(endHour, endMin, 0, 0);
          
          if (endHour < startHour || (endHour === startHour && endMin < startMin)) {
            todayEnd.setDate(todayEnd.getDate() + 1);
          }
          
          if (now >= todayStart && now < todayEnd) {
            // Activity is in progress
            alerts.push({ 
              type: 'success', 
              message: ` ${dailyActivity.name} is in progress!` 
            });
          } else if (now < todayStart) {
            const diffMs = todayStart - now;
            const hours = Math.floor(diffMs / (1000 * 60 * 60));
            const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
            alerts.push({ 
              type: 'info', 
              message: ` ${dailyActivity.name} starts in ${hours}h ${mins}m` 
            });
          }
        }
      }
    } catch (error) {
      console.error('Error checking daily activity:', error);
    }

    // Add streak alert
    if (streakData.currentStreak > 0) {
      alerts.push({ type: 'success', message: `${streakData.currentStreak}-day productivity streak!` });
    }

    setDashboardData(prev => ({
      ...prev,
      systemAlerts: alerts.slice(0, 3) // Show top 3 alerts
    }));
  };

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        setUser(user);
        loadAllUserData(user.uid);
      } else {
        navigate('/login');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (!user) return;

    loadAllUserData(user.uid);

    const handleFocus = () => {
      loadAllUserData(user.uid);
    };

    window.addEventListener('focus', handleFocus);

    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, [user]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error.message);
    }
  };

  const handleNavigation = (tab) => {
    setActiveTab(tab);
    if (tab === 'home') {
      navigate('/dashboard');
    } else if (tab === 'activity') {
      navigate('/activity');
    } else if (tab === 'financial') {
      navigate('/financial');
    }
  };

  const openBudgetModal = () => {
    setNewBudget(dashboardData.finance.monthlyBudget.toString() || '');
    setShowBudgetModal(true);
  };

  const closeBudgetModal = () => {
    setShowBudgetModal(false);
    setNewBudget('');
  };

  const handleBudgetChange = (e) => {
    setNewBudget(e.target.value);
  };

  const handleSaveBudget = () => {
    if (newBudget && !isNaN(newBudget) && parseFloat(newBudget) > 0 && user) {
      const budgetAmount = parseFloat(newBudget);
      
      const budgetKey = getUserKey(user.uid, 'monthlyBudget');
      localStorage.setItem(budgetKey, budgetAmount.toString());
      
      setDashboardData(prev => {
        const percentageUsed = budgetAmount > 0 ? (prev.finance.spent / budgetAmount) * 100 : 0;
        const remaining = budgetAmount - prev.finance.spent;
        const isOverBudget = prev.finance.spent > budgetAmount;

        return {
          ...prev,
          finance: {
            ...prev.finance,
            monthlyBudget: budgetAmount,
            percentageUsed: Math.min(percentageUsed, 100),
            remaining: remaining,
            isOverBudget
          }
        };
      });

      closeBudgetModal();
    }
  };

  useEffect(() => {
    if (!user) return;
    
    const interval = setInterval(() => {
      loadAllUserData(user.uid);
    }, 30000); // Check every 30 seconds for more responsive alerts
    
    return () => clearInterval(interval);
  }, [user]);

  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="loading">Loading...</div>
      </div>
    );
  }

  const displayName = user?.displayName || user?.email?.split('@')[0] || 'User';
  const firstName = displayName.split(' ')[0];

  const getBudgetStatus = () => {
    const { isOverBudget, percentageUsed, remaining, monthlyBudget } = dashboardData.finance;
    
    if (monthlyBudget === 0) {
      return { color: 'var(--text-secondary)', message: 'Set monthly budget' };
    }
    if (isOverBudget) {
      const overAmount = Math.abs(remaining);
      return { color: 'var(--danger-color)', message: `Over by R${overAmount.toLocaleString()}` };
    }
    if (percentageUsed > 80) {
      return { color: 'var(--warning-color)', message: `${Math.round(percentageUsed)}% used` };
    }
    return { color: 'var(--success-color)', message: `R${remaining.toLocaleString()} remaining` };
  };

  const budgetStatus = getBudgetStatus();

  return (
    <div className="dashboard-container">
      {/* Left Sidebar */}
      <div className="sidebar">
        <div className="sidebar-header">
          <h2 className="sidebar-logo">LIFELEADGER</h2>
        </div>
        
        <div className="sidebar-menu">
          <div 
            className={`menu-item ${activeTab === 'home' ? 'active' : ''}`}
            onClick={() => handleNavigation('home')}
          >
            <span className="menu-text">Home</span>
            <span className="menu-indicator"></span>
          </div>
          
          <div 
            className={`menu-item ${activeTab === 'activity' ? 'active' : ''}`}
            onClick={() => handleNavigation('activity')}
          >
            <span className="menu-text">Activity Tracking</span>
            <span className="menu-indicator"></span>
          </div>
          
          <div 
            className={`menu-item ${activeTab === 'financial' ? 'active' : ''}`}
            onClick={() => handleNavigation('financial')}
          >
            <span className="menu-text">Financial Tracking</span>
            <span className="menu-indicator"></span>
          </div>
        </div>

        <div className="sidebar-footer">
          <button className="logout-btn" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="dashboard-main-content">
        <div className="content-wrapper">
          {/* Welcome Header with Settings */}
          <div className="welcome-header">
            <div className="welcome-header-top">
              <div>
                <h1 className="welcome-title">
                  WELCOME BACK, {firstName.toUpperCase()}
                </h1>
                <p className="welcome-subtitle">Here's your progress overview</p>
              </div>
              <button 
                className="settings-btn"
                onClick={() => setShowSettings(true)}
                title="Settings"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="2" fill="none"/>
                  <circle cx="12" cy="12" r="2" fill="currentColor"/>
                  <line x1="4" y1="4" x2="8" y2="8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  <line x1="20" y1="4" x2="16" y2="8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  <line x1="4" y1="20" x2="8" y2="16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  <line x1="20" y1="20" x2="16" y2="16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </button>
            </div>
          </div>

          {/* Stats Cards Grid */}
          <div className="stats-grid">
            {/* Tasks Card */}
            <div className="stat-card">
              <h3 className="stat-title">Tasks</h3>
              {taskData.totalTasks > 0 ? (
                <>
                  <div className="stat-main">
                    <span className="stat-value">{taskData.completedTasks}</span>
                    <span className="stat-total">/{taskData.totalTasks}</span>
                  </div>
                  <div className="task-breakdown">
                    <div className="task-stat">
                      <span className="task-stat-label">COMPLETED</span>
                      <span className="task-stat-value complete">{taskData.completedTasks}</span>
                    </div>
                    <div className="task-stat">
                      <span className="task-stat-label">PENDING</span>
                      <span className="task-stat-value pending">{taskData.pendingTasks}</span>
                    </div>
                  </div>
                  <div className="stat-footer">
                    <span className="stat-message">
                      {taskData.completionPercentage}% complete
                    </span>
                  </div>
                  <div className="progress-bar">
                    <div 
                      className="progress-fill" 
                      style={{ width: `${taskData.completionPercentage}%` }}
                    ></div>
                  </div>
                </>
              ) : (
                <div className="stat-empty">
                  <p className="stat-message">No tasks yet</p>
                  <span className="add-icon-small">+</span>
                </div>
              )}
            </div>

            {/* Finance Card */}
            <div className="stat-card finance-card" onClick={openBudgetModal} style={{ cursor: 'pointer' }}>
              <h3 className="stat-title">Finance</h3>
              {dashboardData.finance.monthlyBudget > 0 ? (
                <>
                  <div className="stat-main">
                    <span className="stat-value" style={{ color: budgetStatus.color }}>
                      {Math.round(dashboardData.finance.percentageUsed)}%
                    </span>
                    <span className="stat-label">of R{dashboardData.finance.monthlyBudget.toLocaleString()}</span>
                  </div>
                  <div className="stat-details">
                    <span className="stat-message">
                      Spent R{dashboardData.finance.spent.toLocaleString()}
                    </span>
                  </div>
                  <div className="stat-footer">
                    <span className="stat-message" style={{ color: budgetStatus.color }}>
                      {budgetStatus.message}
                    </span>
                  </div>
                  <div className="progress-bar">
                    <div 
                      className="progress-fill" 
                      style={{ 
                        width: `${Math.min(dashboardData.finance.percentageUsed, 100)}%`,
                        background: dashboardData.finance.isOverBudget 
                          ? 'linear-gradient(90deg, var(--danger-color), #ff0000)'
                          : dashboardData.finance.percentageUsed > 80
                          ? 'linear-gradient(90deg, var(--warning-color), #ff9800)'
                          : 'linear-gradient(90deg, var(--accent-color), #10b981)'
                      }}
                    ></div>
                  </div>
                </>
              ) : (
                <div className="stat-empty">
                  <p className="stat-message">Click to set monthly budget</p>
                  <span className="add-icon-small">+</span>
                </div>
              )}
            </div>

            {/* Personal Card */}
            <div className="stat-card">
              <h3 className="stat-title">Personal</h3>
              <div className="streak-container">
                <div className="streak-main">
                  <span className="streak-value">{streakData.currentStreak}</span>
                  <span className="streak-label">day streak</span>
                </div>
                <div className="streak-details">
                  <div className="streak-stat">
                    <span className="streak-stat-label">TODAY</span>
                    <span className="streak-stat-value">{streakData.todayCompleted}</span>
                  </div>
                  <div className="streak-stat">
                    <span className="streak-stat-label">LONGEST</span>
                    <span className="streak-stat-value">{streakData.longestStreak}</span>
                  </div>
                  <div className="streak-stat">
                    <span className="streak-stat-label">TOTAL</span>
                    <span className="streak-stat-value">{streakData.totalCompleted}</span>
                  </div>
                </div>
              </div>
              <div className="streak-message">
                {streakData.currentStreak > 0 ? (
                  <span className="streak-active">🔥 Keep it up!</span>
                ) : (
                  <span className="streak-inactive">Complete tasks to start a streak</span>
                )}
              </div>
            </div>
          </div>

          {/* Bottom Section */}
          <div className="dashboard-bottom">
            {/* Immediate Focus Card - TASKS ONLY */}
            <div className="focus-card">
              <h3 className="focus-title">Immediate Focus</h3>
              <div className="focus-content">
                {immediateFocus.length > 0 ? (
                  immediateFocus.map((item, index) => (
                    <div key={index} className={`focus-item ${item.priority}`}>
                      <span className="focus-icon">{item.icon}</span>
                      <div className="focus-details">
                        <span className="focus-task">{item.title}</span>
                        <span className="focus-description">{item.description}</span>
                        <span className="focus-deadline">{item.deadline}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="focus-empty">
                    <p>No tasks scheduled</p>
                    <p className="focus-subtext">Add tasks in Activity Tracking</p>
                  </div>
                )}
              </div>
            </div>

            {/* System Alerts Card - DAILY ACTIVITY ONLY + other alerts */}
            <div className="alerts-card">
              <h3 className="alerts-title">System Alerts</h3>
              <div className="alerts-list">
                {dashboardData.systemAlerts.length > 0 ? (
                  dashboardData.systemAlerts.map((alert, index) => (
                    <div key={index} className={`alert-item ${alert.type}`}>
                      <span className="alert-icon">
                        {alert.type === 'error' && '🔴'}
                        {alert.type === 'warning' && '⚪'}
                        {alert.type === 'success' && '🟢'}
                        {alert.type === 'info' && '🔵'}
                      </span>
                      <span className="alert-message">{alert.message}</span>
                    </div>
                  ))
                ) : (
                  <div className="alert-empty">
                    <p>No alerts</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Budget Modal */}
      {showBudgetModal && (
        <div className="modal-overlay" onClick={closeBudgetModal}>
          <div className="modal-content budget-modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">Set Monthly Budget |</h3>
            
            <div className="modal-body">
              <div className="budget-input-group">
                <label className="budget-label">Monthly Budget (R)</label>
                <input
                  type="number"
                  className="budget-input"
                  placeholder="Enter your monthly budget"
                  value={newBudget}
                  onChange={handleBudgetChange}
                  min="0"
                  step="100"
                  autoFocus
                />
              </div>

              {dashboardData.finance.spent > 0 && (
                <div className="budget-preview">
                  <p className="preview-text">
                    Current spending: <span className="preview-amount">R{dashboardData.finance.spent.toLocaleString()}</span>
                  </p>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button className="modal-btn exit-btn" onClick={closeBudgetModal}>
                Cancel
              </button>
              <button 
                className="modal-btn add-btn" 
                onClick={handleSaveBudget}
                disabled={!newBudget || parseFloat(newBudget) <= 0}
              >
                Save Budget
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      <SettingsModal 
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        user={user}
      />
    </div>
  );
}

export default Dashboard;