import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, signOut } from '../firebase';
import './ActivityTracking.css';
import './MobileSidebar.css';

function ActivityTracking() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('activity');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Todo State
  const [todoItems, setTodoItems] = useState([]);
  const [showAddTaskModal, setShowAddTaskModal] = useState(false);
  const [newTask, setNewTask] = useState('');
  const [modalTasks, setModalTasks] = useState([]);
  
  // Daily Activity State
  const [showDailyActivityModal, setShowDailyActivityModal] = useState(false);
  const [dailyActivity, setDailyActivity] = useState({
    name: '',
    startTime: '',
    endTime: '',
    isActive: false
  });
  const [timeRemaining, setTimeRemaining] = useState('');
  const [timerStatus, setTimerStatus] = useState('inactive');
  const [timerInterval, setTimerInterval] = useState(null);

  // Tasks State - WITH DATE-SPECIFIC TASKS
  const [tasksByDay, setTasksByDay] = useState({
    Monday: [],
    Tuesday: [],
    Wednesday: [],
    Thursday: [],
    Friday: [],
    Saturday: [],
    Sunday: []
  });
  
  // Date-specific reminders/tasks
  const [dateSpecificTasks, setDateSpecificTasks] = useState([]);
  
  const [currentDay, setCurrentDay] = useState(() => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const today = new Date().getDay();
    return days[today];
  });
  
  const [currentDate, setCurrentDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0]; // YYYY-MM-DD format
  });
  
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showDateTaskModal, setShowDateTaskModal] = useState(false);
  const [newTaskItem, setNewTaskItem] = useState({
    name: '',
    description: '',
    priority: 'medium',
    type: 'weekly' // 'weekly' or 'date-specific'
  });
  
  const [newDateTaskItem, setNewDateTaskItem] = useState({
    name: '',
    description: '',
    priority: 'medium',
    date: new Date().toISOString().split('T')[0],
    time: ''
  });

  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  
  const navigate = useNavigate();

  // Helper function to get user-specific localStorage key
  const getUserKey = (userId, key) => {
    return `user_${userId}_${key}`;
  };

  // Priority sorting function
  const sortTasksByPriority = (tasks) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return [...tasks].sort((a, b) => {
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return a.name.localeCompare(b.name);
    });
  };

  // Sort date-specific tasks by date
  const sortDateTasksByDate = (tasks) => {
    return [...tasks].sort((a, b) => {
      if (a.date < b.date) return -1;
      if (a.date > b.date) return 1;
      return a.name.localeCompare(b.name);
    });
  };

  // Load all user data
  const loadUserData = (userId) => {
    // Load todos
    const todosKey = getUserKey(userId, 'todos');
    const savedTodos = localStorage.getItem(todosKey);
    if (savedTodos) {
      setTodoItems(JSON.parse(savedTodos));
    }

    // Load daily activity
    const dailyKey = getUserKey(userId, 'dailyActivity');
    const savedDaily = localStorage.getItem(dailyKey);
    if (savedDaily) {
      setDailyActivity(JSON.parse(savedDaily));
    }

    // Load weekly tasks
    const tasksKey = getUserKey(userId, 'tasksByDay');
    const savedTasks = localStorage.getItem(tasksKey);
    if (savedTasks) {
      const loadedTasks = JSON.parse(savedTasks);
      Object.keys(loadedTasks).forEach(day => {
        loadedTasks[day] = sortTasksByPriority(loadedTasks[day]);
      });
      setTasksByDay(loadedTasks);
    }

    // Load date-specific tasks
    const dateTasksKey = getUserKey(userId, 'dateSpecificTasks');
    const savedDateTasks = localStorage.getItem(dateTasksKey);
    if (savedDateTasks) {
      setDateSpecificTasks(sortDateTasksByDate(JSON.parse(savedDateTasks)));
    }
  };

  // Save todos to localStorage
  const saveTodos = (userId, todos) => {
    const todosKey = getUserKey(userId, 'todos');
    localStorage.setItem(todosKey, JSON.stringify(todos));
  };

  // Save daily activity to localStorage
  const saveDailyActivity = (userId, activity) => {
    const dailyKey = getUserKey(userId, 'dailyActivity');
    localStorage.setItem(dailyKey, JSON.stringify(activity));
  };

  // Save weekly tasks to localStorage
  const saveTasksByDay = (userId, tasks) => {
    const tasksKey = getUserKey(userId, 'tasksByDay');
    localStorage.setItem(tasksKey, JSON.stringify(tasks));
  };

  // Save date-specific tasks to localStorage
  const saveDateSpecificTasks = (userId, tasks) => {
    const dateTasksKey = getUserKey(userId, 'dateSpecificTasks');
    localStorage.setItem(dateTasksKey, JSON.stringify(tasks));
  };

  // Auth state observer
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        setUser(user);
        loadUserData(user.uid);
        setLoading(false);
      } else {
        navigate('/login');
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  // Timer effect for daily activity
  useEffect(() => {
    if (dailyActivity.isActive && dailyActivity.startTime && dailyActivity.endTime) {
      if (timerInterval) {
        clearInterval(timerInterval);
      }

      const updateTimer = () => {
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
        
        if (now < todayStart) {
          const diffMs = todayStart - now;
          const hours = Math.floor(diffMs / (1000 * 60 * 60));
          const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
          const secs = Math.floor((diffMs % (1000 * 60)) / 1000);
          
          setTimeRemaining(`${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')} until start`);
          setTimerStatus('waiting');
        } 
        else if (now >= todayStart && now < todayEnd) {
          const diffMs = todayEnd - now;
          const hours = Math.floor(diffMs / (1000 * 60 * 60));
          const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
          const secs = Math.floor((diffMs % (1000 * 60)) / 1000);
          
          setTimeRemaining(`${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')} remaining`);
          setTimerStatus('active');
        } 
        else {
          const tomorrowStart = new Date(todayStart);
          tomorrowStart.setDate(tomorrowStart.getDate() + 1);
          
          const diffMs = tomorrowStart - now;
          const hours = Math.floor(diffMs / (1000 * 60 * 60));
          const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
          const secs = Math.floor((diffMs % (1000 * 60)) / 1000);
          
          setTimeRemaining(`${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')} until next`);
          setTimerStatus('completed');
        }
      };

      updateTimer();
      const interval = setInterval(updateTimer, 1000);
      setTimerInterval(interval);

      return () => {
        if (interval) {
          clearInterval(interval);
        }
      };
    } else {
      if (timerInterval) {
        clearInterval(timerInterval);
        setTimerInterval(null);
      }
      setTimeRemaining('');
      setTimerStatus('inactive');
    }
  }, [dailyActivity.isActive, dailyActivity.startTime, dailyActivity.endTime]);

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
  } else if (tab === 'health') {
    navigate('/health');
  }
};

  // Todo functions
  const toggleTodoComplete = async (id) => {
    if (!user) return;
    const updatedTodos = todoItems.map(item => 
      item.id === id ? { ...item, completed: !item.completed } : item
    );
    setTodoItems(updatedTodos);
    saveTodos(user.uid, updatedTodos);
  };

  const removeTodoItem = async (id, e) => {
    e.stopPropagation();
    if (!user) return;
    const updatedTodos = todoItems.filter(item => item.id !== id);
    setTodoItems(updatedTodos);
    saveTodos(user.uid, updatedTodos);
  };

  // Weekly Task functions
  const navigateDay = (direction) => {
    const currentIndex = daysOfWeek.indexOf(currentDay);
    if (direction === 'next') {
      const nextIndex = (currentIndex + 1) % 7;
      setCurrentDay(daysOfWeek[nextIndex]);
    } else {
      const prevIndex = (currentIndex - 1 + 7) % 7;
      setCurrentDay(daysOfWeek[prevIndex]);
    }
  };

  const toggleTaskComplete = async (day, taskId) => {
    if (!user) return;
    const updatedTasks = { ...tasksByDay };
    const taskIndex = updatedTasks[day].findIndex(task => task.id === taskId);
    if (taskIndex !== -1) {
      updatedTasks[day][taskIndex].completed = !updatedTasks[day][taskIndex].completed;
      setTasksByDay(updatedTasks);
      saveTasksByDay(user.uid, updatedTasks);
    }
  };

  const removeTask = async (day, taskId, e) => {
    e.stopPropagation();
    if (!user) return;
    const updatedTasks = { ...tasksByDay };
    updatedTasks[day] = updatedTasks[day].filter(task => task.id !== taskId);
    setTasksByDay(updatedTasks);
    saveTasksByDay(user.uid, updatedTasks);
  };

  // Date-specific Task functions
  const toggleDateTaskComplete = async (taskId) => {
    if (!user) return;
    const updatedTasks = dateSpecificTasks.map(task => 
      task.id === taskId ? { ...task, completed: !task.completed } : task
    );
    setDateSpecificTasks(updatedTasks);
    saveDateSpecificTasks(user.uid, updatedTasks);
  };

  const removeDateTask = async (taskId, e) => {
    e.stopPropagation();
    if (!user) return;
    const updatedTasks = dateSpecificTasks.filter(task => task.id !== taskId);
    setDateSpecificTasks(updatedTasks);
    saveDateSpecificTasks(user.uid, updatedTasks);
  };

  // Get tasks for current date
  const getTasksForCurrentDate = () => {
    return dateSpecificTasks.filter(task => task.date === currentDate);
  };

  // Get upcoming tasks (future dates)
  const getUpcomingTasks = () => {
    const today = new Date().toISOString().split('T')[0];
    return dateSpecificTasks.filter(task => task.date > today && !task.completed).slice(0, 3);
  };

  // Task Modal Functions
  const openTaskModal = () => {
    setShowTaskModal(true);
    setNewTaskItem({
      name: '',
      description: '',
      priority: 'medium',
      type: 'weekly'
    });
  };

  const closeTaskModal = () => {
    setShowTaskModal(false);
  };

  const handleTaskInputChange = (e) => {
    const { name, value } = e.target;
    setNewTaskItem(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAddTaskItem = async () => {
    if (!user) return;
    if (newTaskItem.name.trim() && newTaskItem.description.trim()) {
      const task = {
        id: Date.now(),
        name: newTaskItem.name.trim(),
        description: newTaskItem.description.trim(),
        priority: newTaskItem.priority || 'medium',
        completed: false
      };
      
      const updatedTasks = { ...tasksByDay };
      updatedTasks[currentDay] = [...updatedTasks[currentDay], task];
      updatedTasks[currentDay] = sortTasksByPriority(updatedTasks[currentDay]);
      
      setTasksByDay(updatedTasks);
      saveTasksByDay(user.uid, updatedTasks);
      setShowTaskModal(false);
    }
  };

  // Date-specific Task Modal Functions
  const openDateTaskModal = () => {
    setShowDateTaskModal(true);
    setNewDateTaskItem({
      name: '',
      description: '',
      priority: 'medium',
      date: new Date().toISOString().split('T')[0],
      time: ''
    });
  };

  const closeDateTaskModal = () => {
    setShowDateTaskModal(false);
  };

  const handleDateTaskInputChange = (e) => {
    const { name, value } = e.target;
    setNewDateTaskItem(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAddDateTaskItem = async () => {
    if (!user) return;
    if (newDateTaskItem.name.trim() && newDateTaskItem.description.trim()) {
      const task = {
        id: Date.now(),
        name: newDateTaskItem.name.trim(),
        description: newDateTaskItem.description.trim(),
        priority: newDateTaskItem.priority || 'medium',
        date: newDateTaskItem.date,
        time: newDateTaskItem.time,
        completed: false
      };
      
      const updatedTasks = [...dateSpecificTasks, task];
      setDateSpecificTasks(sortDateTasksByDate(updatedTasks));
      saveDateSpecificTasks(user.uid, sortDateTasksByDate(updatedTasks));
      setShowDateTaskModal(false);
    }
  };

  // Todo Modal Functions
  const openAddTaskModal = () => {
    setShowAddTaskModal(true);
    setNewTask('');
    setModalTasks([]);
  };

  const closeAddTaskModal = () => {
    setShowAddTaskModal(false);
    setNewTask('');
    setModalTasks([]);
  };

  const handleAddTask = () => {
    if (newTask.trim()) {
      const newModalTask = {
        id: Date.now(),
        text: newTask.trim().toUpperCase()
      };
      setModalTasks([...modalTasks, newModalTask]);
      setNewTask('');
    }
  };

  const removeModalTask = (id, e) => {
    e.stopPropagation();
    setModalTasks(modalTasks.filter(task => task.id !== id));
  };

  const handleExit = async () => {
    if (!user) return;
    if (modalTasks.length > 0) {
      const newTodoItems = modalTasks.map(task => ({
        id: Date.now() + task.id,
        text: task.text,
        completed: false
      }));
      
      const updatedTodos = [...todoItems, ...newTodoItems];
      setTodoItems(updatedTodos);
      saveTodos(user.uid, updatedTodos);
    }
    closeAddTaskModal();
  };

  // Daily Activity Modal Functions
  const openDailyActivityModal = () => {
    setShowDailyActivityModal(true);
  };

  const closeDailyActivityModal = () => {
    setShowDailyActivityModal(false);
  };

  const handleDailyActivityChange = (e) => {
    const { name, value } = e.target;
    setDailyActivity(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAddDailyActivity = async () => {
    if (!user) return;
    if (dailyActivity.name && dailyActivity.startTime && dailyActivity.endTime) {
      const updatedActivity = {
        ...dailyActivity,
        isActive: true
      };
      setDailyActivity(updatedActivity);
      saveDailyActivity(user.uid, updatedActivity);
      setShowDailyActivityModal(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleAddTask();
    }
  };

  // Get timer color based on status
  const getTimerColor = () => {
    switch(timerStatus) {
      case 'active':
        return 'var(--accent-color)';
      case 'completed':
        return 'var(--text-secondary)';
      case 'waiting':
        return 'var(--warning-color)';
      default:
        return 'var(--text-secondary)';
    }
  };

  // Format date for display
  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  if (loading) {
    return (
      <div className="activity-container">
        <div className="loading">Loading...</div>
      </div>
    );
  }

  const todayTasks = getTasksForCurrentDate();
  const upcomingTasks = getUpcomingTasks();

  const handleMobileNav = (tab) => {
    handleNavigation(tab);
    setSidebarOpen(false);
  };

  return (
    <div className="activity-container">
      {/* Mobile Header */}
      <div className="mobile-header">
        <button 
          className={`hamburger-btn ${sidebarOpen ? 'open' : ''}`}
          onClick={() => setSidebarOpen(!sidebarOpen)}
          aria-label="Toggle menu"
        >
          <span></span><span></span><span></span>
        </button>
        <span className="mobile-header-logo">LIFELEADGER</span>
        <div className="mobile-header-actions"></div>
      </div>

      {sidebarOpen && (
        <div className="sidebar-overlay visible" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Left Sidebar */}
      <div className={`sidebar ${sidebarOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-header">
          <h2 className="sidebar-logo">LIFELEADGER</h2>
        </div>
        
        <div className="sidebar-menu">
          <div className={`menu-item ${activeTab === 'home' ? 'active' : ''}`} onClick={() => handleMobileNav('home')}>
            <span className="menu-text">Home</span>
            <span className="menu-indicator"></span>
          </div>
          <div className={`menu-item ${activeTab === 'activity' ? 'active' : ''}`} onClick={() => handleMobileNav('activity')}>
            <span className="menu-text">Activity Tracking</span>
            <span className="menu-indicator"></span>
          </div>
          <div className={`menu-item ${activeTab === 'financial' ? 'active' : ''}`} onClick={() => handleMobileNav('financial')}>
            <span className="menu-text">Financial Tracking</span>
            <span className="menu-indicator"></span>
          </div>
          <div className={`menu-item ${activeTab === 'health' ? 'active' : ''}`} onClick={() => handleMobileNav('health')}>
            <span className="menu-text">Health & Fitness</span>
            <span className="menu-indicator"></span>
          </div>
        </div>

        <div className="sidebar-footer">
          <button className="logout-btn" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </div>

      {/* Mobile Bottom Nav */}
      <nav className="mobile-bottom-nav">
        <div className="mobile-bottom-nav-items">
          <div className={`mobile-nav-item ${activeTab === 'home' ? 'active' : ''}`} onClick={() => handleMobileNav('home')}>
            <span className="mobile-nav-icon">🏠</span>
            <span className="mobile-nav-label">Home</span>
          </div>
          <div className={`mobile-nav-item ${activeTab === 'activity' ? 'active' : ''}`} onClick={() => handleMobileNav('activity')}>
            <span className="mobile-nav-icon">✅</span>
            <span className="mobile-nav-label">Activity</span>
          </div>
          <div className={`mobile-nav-item ${activeTab === 'financial' ? 'active' : ''}`} onClick={() => handleMobileNav('financial')}>
            <span className="mobile-nav-icon">💰</span>
            <span className="mobile-nav-label">Finance</span>
          </div>
          <div className={`mobile-nav-item ${activeTab === 'health' ? 'active' : ''}`} onClick={() => handleMobileNav('health')}>
            <span className="mobile-nav-icon">💪</span>
            <span className="mobile-nav-label">Health</span>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="activity-main-content">
        <div className="content-wrapper">
          <h1 className="page-title">ACTIVITY TRACKING</h1>

          {/* Activity Grid */}
          <div className="activity-grid">
            {/* Todo List Section */}
            <div className="activity-card todo-card" onClick={openAddTaskModal}>
              <h2 className="card-title">TODOLIST</h2>
              {todoItems.length === 0 ? (
                <div className="empty-todo">
                  <p className="empty-message">Click to add tasks</p>
                  <span className="add-icon">+</span>
                </div>
              ) : (
                <ul className="todo-list">
                  {todoItems.map(item => (
                    <li 
                      key={item.id} 
                      className={`todo-item ${item.completed ? 'completed' : ''}`}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <span className="checkbox" onClick={(e) => {
                        e.stopPropagation();
                        toggleTodoComplete(item.id);
                      }}>
                        {item.completed ? '✓' : '○'}
                      </span>
                      <span className="todo-text">{item.text}</span>
                      <span className="remove-task" onClick={(e) => removeTodoItem(item.id, e)}>✕</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Daily Activity Section */}
            <div className="activity-card daily-card" onClick={openDailyActivityModal}>
              <h2 className="card-title">DAILY ACTIVITY</h2>
              {!dailyActivity.isActive ? (
                <div className="empty-daily">
                  <p className="empty-message">Click to set daily activity</p>
                  <span className="add-icon">+</span>
                </div>
              ) : (
                <div className="daily-activity">
                  <div className="activity-time">
                    <span className="activity-name">{dailyActivity.name}</span>
                    <span className="time-range">{dailyActivity.startTime} - {dailyActivity.endTime}</span>
                  </div>
                  <div className="time-remaining">
                    <span className="remaining-label">Time Remaining</span>
                    <span 
                      className="remaining-value" 
                      style={{ 
                        color: getTimerColor(),
                        transition: 'color 0.3s ease'
                      }}
                    >
                      {timeRemaining}
                    </span>
                  </div>
                  {timerStatus === 'active' && (
                    <div className="activity-status active-status">
                      Activity in progress 
                    </div>
                  )}
                  {timerStatus === 'waiting' && (
                    <div className="activity-status waiting-status">
                      Getting ready to start
                    </div>
                  )}
                  {timerStatus === 'completed' && (
                    <div className="activity-status completed-status">
                      Resets tomorrow at {dailyActivity.startTime}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Tasks Section - Split into Weekly and Date-Specific */}
            <div className="activity-card tasks-card">
              <div className="tasks-header">
                <h2 className="card-title">TASKS & REMINDERS</h2>
                <div className="task-buttons">
                  <button className="add-task-btn weekly" onClick={openTaskModal} title="Add weekly task">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2" fill="none"/>
                      <line x1="8" y1="2" x2="8" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                      <line x1="16" y1="2" x2="16" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                      <line x1="3" y1="8" x2="21" y2="8" stroke="currentColor" strokeWidth="2"/>
                      <circle cx="12" cy="14" r="1.5" fill="currentColor"/>
                      <circle cx="17" cy="14" r="1.5" fill="currentColor"/>
                    </svg>
                  </button>
                  <button className="add-task-btn date" onClick={openDateTaskModal} title="Add date-specific reminder">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" fill="none"/>
                      <line x1="12" y1="8" x2="12" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                      <line x1="12" y1="16" x2="12.01" y2="16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                  </button>
                </div>
              </div>
              
              {/* Weekly Tasks Section */}
              <div className="weekly-tasks-section">
                <div className="section-header">
                  <h3 className="section-title">WEEKLY TASKS</h3>
                  <div className="day-navigator mini">
                    <button className="nav-arrow mini" onClick={() => navigateDay('prev')}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </button>
                    <span className="current-day mini">{currentDay}</span>
                    <button className="nav-arrow mini" onClick={() => navigateDay('next')}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M9 18L15 12L9 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </button>
                  </div>
                </div>

                <div className="day-tasks">
                  {tasksByDay[currentDay] && tasksByDay[currentDay].length > 0 ? (
                    tasksByDay[currentDay].map(item => (
                      <div 
                        key={item.id} 
                        className={`task-item priority-${item.priority || 'medium'} ${item.completed ? 'completed' : ''}`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <span className="checkbox" onClick={(e) => {
                          e.stopPropagation();
                          toggleTaskComplete(currentDay, item.id);
                        }}>
                          {item.completed ? '✓' : '○'}
                        </span>
                        <div className="task-content">
                          <div className="task-header">
                            <span className="task-name">{item.name}</span>
                          </div>
                          <p className="task-description">{item.description}</p>
                        </div>
                        <span className="remove-task" onClick={(e) => removeTask(currentDay, item.id, e)}>✕</span>
                      </div>
                    ))
                  ) : (
                    <div className="empty-mini" onClick={openTaskModal}>
                      <p>No tasks for {currentDay}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Date-Specific Tasks Section */}
              <div className="date-tasks-section">
                <h3 className="section-title">TODAY'S REMINDERS</h3>
                <div className="current-date-display">
                  {formatDate(currentDate)}
                </div>
                
                <div className="date-tasks">
                  {todayTasks.length > 0 ? (
                    todayTasks.map(item => (
                      <div 
                        key={item.id} 
                        className={`task-item priority-${item.priority || 'medium'} ${item.completed ? 'completed' : ''}`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <span className="checkbox" onClick={(e) => {
                          e.stopPropagation();
                          toggleDateTaskComplete(item.id);
                        }}>
                          {item.completed ? '✓' : '○'}
                        </span>
                        <div className="task-content">
                          <div className="task-header">
                            <span className="task-name">{item.name}</span>
                            {item.time && <span className="task-time">{item.time}</span>}
                          </div>
                          <p className="task-description">{item.description}</p>
                        </div>
                        <span className="remove-task" onClick={(e) => removeDateTask(item.id, e)}>✕</span>
                      </div>
                    ))
                  ) : (
                    <div className="empty-mini no-hover">
                      <p>No reminders for today</p>
                    </div>
                  )}
                </div>

                {/* Upcoming Tasks */}
                {upcomingTasks.length > 0 && (
                  <div className="upcoming-tasks">
                    <h4 className="upcoming-title">UPCOMING</h4>
                    {upcomingTasks.map(item => (
                      <div key={item.id} className="upcoming-item">
                        <span className={`priority-dot mini ${item.priority}`}></span>
                        <span className="upcoming-name">{item.name}</span>
                        <span className="upcoming-date">{formatDate(item.date)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add Task Modal */}
      {showAddTaskModal && (
        <div className="modal-overlay" onClick={closeAddTaskModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">add task |</h3>
            
            <div className="modal-body">
              {modalTasks.length > 0 && (
                <div className="modal-tasks-list">
                  {modalTasks.map(task => (
                    <div key={task.id} className="modal-task-item">
                      <span className="modal-task-text">- {task.text}</span>
                      <span className="remove-modal-task" onClick={(e) => removeModalTask(task.id, e)}>✕</span>
                    </div>
                  ))}
                </div>
              )}
              
              <div className="input-section">
                <input
                  type="text"
                  className="task-input"
                  placeholder="Enter your task..."
                  value={newTask}
                  onChange={(e) => setNewTask(e.target.value)}
                  onKeyPress={handleKeyPress}
                  autoFocus
                />
              </div>
            </div>

            <div className="modal-footer">
              <button className="modal-btn exit-btn" onClick={closeAddTaskModal}>
                Cancel
              </button>
              <button className="modal-btn add-btn" onClick={handleAddTask}>
                + Add Task
              </button>
              {modalTasks.length > 0 && (
                <button className="modal-btn add-btn" onClick={handleExit}>
                  Save All
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Daily Activity Modal */}
      {showDailyActivityModal && (
        <div className="modal-overlay" onClick={closeDailyActivityModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">daily activity |</h3>
            
            <div className="modal-body">
              <div className="daily-input-group">
                <label className="daily-label">Name of activity</label>
                <input
                  type="text"
                  name="name"
                  className="daily-input"
                  placeholder="e.g., STUDY, WORKOUT, READING"
                  value={dailyActivity.name}
                  onChange={handleDailyActivityChange}
                  autoFocus
                />
              </div>

              <div className="time-input-group">
                <div className="time-field">
                  <label className="time-label">Start</label>
                  <input
                    type="time"
                    name="startTime"
                    className="time-input"
                    value={dailyActivity.startTime}
                    onChange={handleDailyActivityChange}
                  />
                </div>
                <div className="time-field">
                  <label className="time-label">End</label>
                  <input
                    type="time"
                    name="endTime"
                    className="time-input"
                    value={dailyActivity.endTime}
                    onChange={handleDailyActivityChange}
                  />
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="modal-btn exit-btn" onClick={closeDailyActivityModal}>
                Cancel
              </button>
              <button 
                className="modal-btn add-btn" 
                onClick={handleAddDailyActivity}
                disabled={!dailyActivity.name || !dailyActivity.startTime || !dailyActivity.endTime}
              >
                Add Activity
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Weekly Task Modal */}
      {showTaskModal && (
        <div className="modal-overlay" onClick={closeTaskModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">add weekly task for {currentDay} |</h3>
            
            <div className="modal-body">
              <div className="task-input-group">
                <label className="task-label">Task</label>
                <input
                  type="text"
                  name="name"
                  className="task-field-input"
                  placeholder="Enter task name..."
                  value={newTaskItem.name}
                  onChange={handleTaskInputChange}
                  autoFocus
                />
              </div>

              <div className="task-input-group">
                <label className="task-label">Description</label>
                <textarea
                  name="description"
                  className="task-textarea"
                  placeholder="Enter task description or notes..."
                  value={newTaskItem.description}
                  onChange={handleTaskInputChange}
                  rows="3"
                />
              </div>

              {/* Priority Selection */}
              <div className="task-input-group">
                <label className="task-label">Priority</label>
                <div className="priority-selector">
                  <label className={`priority-option high ${newTaskItem.priority === 'high' ? 'selected' : ''}`}>
                    <input
                      type="radio"
                      name="priority"
                      value="high"
                      checked={newTaskItem.priority === 'high'}
                      onChange={handleTaskInputChange}
                    />
                    <span className="priority-dot high"></span>
                    <span>High</span>
                  </label>
                  
                  <label className={`priority-option medium ${newTaskItem.priority === 'medium' ? 'selected' : ''}`}>
                    <input
                      type="radio"
                      name="priority"
                      value="medium"
                      checked={newTaskItem.priority === 'medium'}
                      onChange={handleTaskInputChange}
                    />
                    <span className="priority-dot medium"></span>
                    <span>Medium</span>
                  </label>
                  
                  <label className={`priority-option low ${newTaskItem.priority === 'low' ? 'selected' : ''}`}>
                    <input
                      type="radio"
                      name="priority"
                      value="low"
                      checked={newTaskItem.priority === 'low'}
                      onChange={handleTaskInputChange}
                    />
                    <span className="priority-dot low"></span>
                    <span>Low</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="modal-btn exit-btn" onClick={closeTaskModal}>
                Cancel
              </button>
              <button 
                className="modal-btn add-btn" 
                onClick={handleAddTaskItem}
                disabled={!newTaskItem.name || !newTaskItem.description}
              >
                Add Task
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Date-Specific Task Modal */}
      {showDateTaskModal && (
        <div className="modal-overlay" onClick={closeDateTaskModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">add reminder |</h3>
            
            <div className="modal-body">
              <div className="task-input-group">
                <label className="task-label">Reminder</label>
                <input
                  type="text"
                  name="name"
                  className="task-field-input"
                  placeholder="Enter reminder name..."
                  value={newDateTaskItem.name}
                  onChange={handleDateTaskInputChange}
                  autoFocus
                />
              </div>

              <div className="task-input-group">
                <label className="task-label">Description</label>
                <textarea
                  name="description"
                  className="task-textarea"
                  placeholder="Enter description..."
                  value={newDateTaskItem.description}
                  onChange={handleDateTaskInputChange}
                  rows="2"
                />
              </div>

              <div className="date-time-group">
                <div className="task-input-group half">
                  <label className="task-label">Date</label>
                  <input
                    type="date"
                    name="date"
                    className="task-field-input"
                    value={newDateTaskItem.date}
                    onChange={handleDateTaskInputChange}
                  />
                </div>

                <div className="task-input-group half">
                  <label className="task-label">Time (optional)</label>
                  <input
                    type="time"
                    name="time"
                    className="task-field-input"
                    value={newDateTaskItem.time}
                    onChange={handleDateTaskInputChange}
                  />
                </div>
              </div>

              {/* Priority Selection */}
              <div className="task-input-group">
                <label className="task-label">Priority</label>
                <div className="priority-selector">
                  <label className={`priority-option high ${newDateTaskItem.priority === 'high' ? 'selected' : ''}`}>
                    <input
                      type="radio"
                      name="priority"
                      value="high"
                      checked={newDateTaskItem.priority === 'high'}
                      onChange={handleDateTaskInputChange}
                    />
                    <span className="priority-dot high"></span>
                    <span>High</span>
                  </label>
                  
                  <label className={`priority-option medium ${newDateTaskItem.priority === 'medium' ? 'selected' : ''}`}>
                    <input
                      type="radio"
                      name="priority"
                      value="medium"
                      checked={newDateTaskItem.priority === 'medium'}
                      onChange={handleDateTaskInputChange}
                    />
                    <span className="priority-dot medium"></span>
                    <span>Medium</span>
                  </label>
                  
                  <label className={`priority-option low ${newDateTaskItem.priority === 'low' ? 'selected' : ''}`}>
                    <input
                      type="radio"
                      name="priority"
                      value="low"
                      checked={newDateTaskItem.priority === 'low'}
                      onChange={handleDateTaskInputChange}
                    />
                    <span className="priority-dot low"></span>
                    <span>Low</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="modal-btn exit-btn" onClick={closeDateTaskModal}>
                Cancel
              </button>
              <button 
                className="modal-btn add-btn" 
                onClick={handleAddDateTaskItem}
                disabled={!newDateTaskItem.name || !newDateTaskItem.description}
              >
                Add Reminder
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ActivityTracking;