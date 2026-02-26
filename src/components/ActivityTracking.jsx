import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, signOut } from '../firebase';
import './ActivityTracking.css';

function ActivityTracking() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('activity');
  
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

  // Tasks State - NEW STRUCTURE
  const [tasksByDay, setTasksByDay] = useState({
    Monday: [],
    Tuesday: [],
    Wednesday: [],
    Thursday: [],
    Friday: [],
    Saturday: [],
    Sunday: []
  });
  const [currentDay, setCurrentDay] = useState(() => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const today = new Date().getDay();
    return days[today];
  });
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [newTaskItem, setNewTaskItem] = useState({
    name: '',
    description: ''
  });

  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  
  const navigate = useNavigate();

  // Helper function to get user-specific localStorage key
  const getUserKey = (userId, key) => {
    return `user_${userId}_${key}`;
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

    // Load tasks - NEW STRUCTURE
    const tasksKey = getUserKey(userId, 'tasksByDay');
    const savedTasks = localStorage.getItem(tasksKey);
    if (savedTasks) {
      setTasksByDay(JSON.parse(savedTasks));
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

  // Save tasks to localStorage - NEW STRUCTURE
  const saveTasksByDay = (userId, tasks) => {
    const tasksKey = getUserKey(userId, 'tasksByDay');
    localStorage.setItem(tasksKey, JSON.stringify(tasks));
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

  // Task functions - NEW
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

  // Task Modal Functions
  const openTaskModal = () => {
    setShowTaskModal(true);
    setNewTaskItem({
      name: '',
      description: ''
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
        completed: false
      };
      
      const updatedTasks = { ...tasksByDay };
      updatedTasks[currentDay] = [...updatedTasks[currentDay], task];
      
      setTasksByDay(updatedTasks);
      saveTasksByDay(user.uid, updatedTasks);
      setShowTaskModal(false);
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

  if (loading) {
    return (
      <div className="activity-container">
        <div className="loading">Loading...</div>
      </div>
    );
  }

  return (
    <div className="activity-container">
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

            {/* Tasks Section - REDESIGNED */}
            <div className="activity-card tasks-card">
              <div className="tasks-header">
                <h2 className="card-title">TASKS</h2>
                <button className="add-task-btn" onClick={openTaskModal}>+</button>
              </div>
              
              {/* Day Navigator */}
              <div className="day-navigator">
                <button className="nav-arrow" onClick={() => navigateDay('prev')}>←</button>
                <h3 className="current-day">{currentDay}</h3>
                <button className="nav-arrow" onClick={() => navigateDay('next')}>→</button>
              </div>

              {/* Tasks for Current Day */}
              <div className="day-tasks">
                {tasksByDay[currentDay] && tasksByDay[currentDay].length > 0 ? (
                  tasksByDay[currentDay].map(item => (
                    <div 
                      key={item.id} 
                      className={`task-item ${item.completed ? 'completed' : ''}`}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <span className="checkbox" onClick={(e) => {
                        e.stopPropagation();
                        toggleTaskComplete(currentDay, item.id);
                      }}>
                        {item.completed ? '✓' : '○'}
                      </span>
                      <div className="task-content">
                        <span className="task-name">{item.name}</span>
                        <p className="task-description">{item.description}</p>
                      </div>
                      <span className="remove-task" onClick={(e) => removeTask(currentDay, item.id, e)}>✕</span>
                    </div>
                  ))
                ) : (
                  <div className="empty-day-tasks" onClick={openTaskModal}>
                    <p>No tasks for {currentDay}</p>
                    <span className="add-icon-small">+</span>
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

      {/* Task Modal - UPDATED */}
      {showTaskModal && (
        <div className="modal-overlay" onClick={closeTaskModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">add task for {currentDay} |</h3>
            
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
                  rows="4"
                />
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
    </div>
  );
}

export default ActivityTracking;