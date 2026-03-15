import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, signOut } from '../firebase';
import SettingsModal from './SettingsModal';
import PendingTasksModal from './PendingTasksModal';
import './Dashboard.css';
import './MobileSidebar.css';

function Dashboard() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('home');
  const [immediateFocus, setImmediateFocus] = useState([]);
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showPendingTasksModal, setShowPendingTasksModal] = useState(false);
  const [pendingTodos, setPendingTodos] = useState([]);
  const [newBudget, setNewBudget] = useState('');
  const [streakData, setStreakData] = useState({
    currentStreak: 0,
    longestStreak: 0,
    todayCompleted: 0,
    totalCompleted: 0
  });
  
  // Health & Fitness data
  const [healthHighlights, setHealthHighlights] = useState({
    waterIntake: { current: 0, goal: 3.7, percentage: 0 },
    steps: { current: 0, goal: 10000, percentage: 0 },
    sleep: { hours: 0, minutes: 0, status: 'pending', message: '' },
    workouts: { completed: 0, total: 0, percentage: 0 },
    habits: { completed: 0, total: 0, percentage: 0 },
    weightChange: { change: 0, trend: 'stable', display: '' },
    funFact: '',
    motivationMessage: ''
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

  // Load health highlights from Health & Fitness page
  const loadHealthHighlights = (userId) => {
    try {
      const healthKey = getUserKey(userId, 'healthData');
      const savedHealth = localStorage.getItem(healthKey);
      
      if (savedHealth) {
        const health = JSON.parse(savedHealth);
        
        // Calculate water percentage
        const waterPercentage = health.waterIntake?.goal > 0 
          ? Math.round((health.waterIntake.current / health.waterIntake.goal) * 100)
          : 0;
        
        // Calculate steps percentage
        const stepsPercentage = health.steps?.goal > 0
          ? Math.round((health.steps.current / health.steps.goal) * 100)
          : 0;
        
        // Calculate workout completion
        let totalWorkouts = 0;
        let completedWorkouts = 0;
        if (health.workout?.routines) {
          Object.values(health.workout.routines).forEach(dayExercises => {
            dayExercises.forEach(exercise => {
              totalWorkouts++;
              if (exercise.completed) completedWorkouts++;
            });
          });
        }
        const workoutPercentage = totalWorkouts > 0 
          ? Math.round((completedWorkouts / totalWorkouts) * 100)
          : 0;
        
        // Calculate habit completion
        const totalHabits = health.habits?.length || 0;
        const completedHabits = health.habits?.filter(h => h.completed).length || 0;
        const habitPercentage = totalHabits > 0
          ? Math.round((completedHabits / totalHabits) * 100)
          : 0;
        
        // Calculate weight change
        let weightChangeDisplay = '';
        let weightTrend = 'stable';
        let weightChangeValue = 0;
        
        if (health.weightTracker?.history && health.weightTracker.history.length >= 2) {
          const sortedHistory = [...health.weightTracker.history].sort((a, b) => 
            new Date(a.date) - new Date(b.date)
          );
          const first = sortedHistory[0];
          const last = sortedHistory[sortedHistory.length - 1];
          
          const firstValue = first.unit === 'lbs' ? first.weight : first.weight * 2.20462;
          const lastValue = last.unit === 'lbs' ? last.weight : last.weight * 2.20462;
          
          weightChangeValue = lastValue - firstValue;
          weightTrend = weightChangeValue > 0.5 ? 'gained' : weightChangeValue < -0.5 ? 'lost' : 'stable';
          
          if (weightTrend === 'lost') {
            weightChangeDisplay = ` Lost ${Math.abs(weightChangeValue).toFixed(1)} ${health.weightTracker.unit}`;
          } else if (weightTrend === 'gained') {
            weightChangeDisplay = ` Gained ${weightChangeValue.toFixed(1)} ${health.weightTracker.unit}`;
          } else {
            weightChangeDisplay = `⚖️ Weight stable`;
          }
        }
        
        // Generate fun facts
        const funFacts = [];
        
        if (waterPercentage >= 100) {
          funFacts.push(" You're a hydration hero! Water you waiting for? More wins!");
        } else if (waterPercentage >= 75) {
          funFacts.push(" Almost there! Your cells are throwing a hydration party!");
        } else if (waterPercentage >= 50) {
          funFacts.push(" Halfway to hydration station! Keep sipping!");
        }
        
        if (stepsPercentage >= 100) {
          funFacts.push(" Step champion! Your legs are basically superpowers!");
        } else if (stepsPercentage >= 75) {
          funFacts.push(" On fire! Your step count is climbing mountains!");
        }
        
        if (health.sleep?.totalHours > 0) {
          if (health.sleep.totalHours >= 8) {
            funFacts.push(" Sleep master! You're catching those Z's like a pro!");
          } else if (health.sleep.totalHours >= 6) {
            funFacts.push(" Getting there! Dreamland is calling your name tonight!");
          }
        }
        
        if (workoutPercentage >= 100) {
          funFacts.push(" Workout warrior! You're crushing it like a fitness influencer!");
        } else if (workoutPercentage >= 75) {
          funFacts.push(" Almost there! Your muscles are cheering you on!");
        }
        
        if (habitPercentage >= 80) {
          funFacts.push(" Habit hero! You're building a lifestyle, not just a routine!");
        }
        
        if (weightTrend === 'lost' && weightChangeValue > 2) {
          funFacts.push(" Major weight loss! Your old clothes are feeling left out!");
        } else if (weightTrend === 'gained' && weightChangeValue > 2 && health.weightTracker?.enabled) {
          funFacts.push(" Muscle gains detected! You're getting stronger every day!");
        }
        
        // Generate motivation message
        let motivationMessage = '';
        const now = new Date();
        const hour = now.getHours();
        
        if (hour < 12) {
          motivationMessage = " Rise and shine! Today's another chance to crush your goals!";
        } else if (hour < 17) {
          motivationMessage = " Afternoon energy! You're halfway to greatness!";
        } else {
          motivationMessage = " Evening vibes! Wrapping up like a champion!";
        }
        
        // Add health-specific motivation
        if (health.sleep?.sleepStatus === 'under-slept') {
          motivationMessage = " You need more sleep, but you're still showing up! That's dedication!";
        } else if (health.sleep?.sleepStatus === 'optimal') {
          motivationMessage = " Well-rested and ready to conquer! You're unstoppable today!";
        }
        
        setHealthHighlights({
          waterIntake: {
            current: health.waterIntake?.current || 0,
            goal: health.waterIntake?.goal || 3.7,
            percentage: waterPercentage
          },
          steps: {
            current: health.steps?.current || 0,
            goal: health.steps?.goal || 10000,
            percentage: stepsPercentage
          },
          sleep: {
            hours: health.sleep?.totalHours || 0,
            minutes: health.sleep?.totalMinutes || 0,
            status: health.sleep?.sleepStatus || 'pending',
            message: health.sleep?.message || ''
          },
          workouts: {
            completed: completedWorkouts,
            total: totalWorkouts,
            percentage: workoutPercentage
          },
          habits: {
            completed: completedHabits,
            total: totalHabits,
            percentage: habitPercentage
          },
          weightChange: {
            change: weightChangeValue,
            trend: weightTrend,
            display: weightChangeDisplay
          },
          funFact: funFacts.length > 0 ? funFacts[Math.floor(Math.random() * funFacts.length)] : "✨ You're doing amazing! Keep going!",
          motivationMessage
        });
      } else {
        // Default fun facts if no health data
        setHealthHighlights(prev => ({
          ...prev,
          funFact: " Start tracking your health to see fun facts here!",
          motivationMessage: " Every great journey starts with a single step. Start tracking today!"
        }));
      }
    } catch (error) {
      console.error('Error loading health highlights:', error);
    }
  };

  // Load all user data
  const loadAllUserData = (userId) => {
    loadBudgetFromStorage(userId);
    loadFinancialData(userId);
    loadImmediateFocus(userId);
    loadHealthHighlights(userId);
    updateSystemAlerts(userId);
    calculateStreak(userId);
    calculateTaskCompletion(userId);
  };

  // Load todos for the modal
  const loadTodos = (userId) => {
    try {
      const todosKey = getUserKey(userId, 'todos');
      const savedTodos = localStorage.getItem(todosKey);
      if (savedTodos) {
        const todos = JSON.parse(savedTodos);
        setPendingTodos(todos);
      }
    } catch (error) {
      console.error('Error loading todos:', error);
    }
  };

  // Handle todo completion toggle
  const handleToggleTodoComplete = async (id) => {
    if (!user) return;
    const todosKey = getUserKey(user.uid, 'todos');
    const savedTodos = localStorage.getItem(todosKey);
    if (savedTodos) {
      const todos = JSON.parse(savedTodos);
      const updatedTodos = todos.map(item => 
        item.id === id ? { ...item, completed: !item.completed } : item
      );
      localStorage.setItem(todosKey, JSON.stringify(updatedTodos));
      setPendingTodos(updatedTodos);
      
      // Update task data to refresh the tasks card
      calculateTaskCompletion(user.uid);
    }
  };

  // Handle todo removal
  const handleRemoveTodo = async (id) => {
    if (!user) return;
    const todosKey = getUserKey(user.uid, 'todos');
    const savedTodos = localStorage.getItem(todosKey);
    if (savedTodos) {
      const todos = JSON.parse(savedTodos);
      const updatedTodos = todos.filter(item => item.id !== id);
      localStorage.setItem(todosKey, JSON.stringify(updatedTodos));
      setPendingTodos(updatedTodos);
      
      // Update task data to refresh the tasks card
      calculateTaskCompletion(user.uid);
    }
  };

  // Handle tasks card click
  const handleTasksCardClick = () => {
    if (user) {
      loadTodos(user.uid);
      setShowPendingTasksModal(true);
    }
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

    // Health & Fitness alerts
    if (healthHighlights.waterIntake.percentage < 50 && healthHighlights.waterIntake.percentage > 0) {
      alerts.push({ type: 'info', message: ` Only ${healthHighlights.waterIntake.percentage}% water intake - Time to hydrate!` });
    }
    
    if (healthHighlights.steps.percentage < 50 && healthHighlights.steps.percentage > 0) {
      alerts.push({ type: 'info', message: ` ${healthHighlights.steps.percentage}% steps - Let's get moving!` });
    }
    
    if (healthHighlights.sleep.status === 'under-slept') {
      alerts.push({ type: 'warning', message: ` You're under-slept - Try to rest more tonight!` });
    } else if (healthHighlights.sleep.status === 'optimal') {
      alerts.push({ type: 'success', message: ` Perfect sleep! You're well-rested!` });
    }
    
    if (healthHighlights.workouts.percentage === 100 && healthHighlights.workouts.total > 0) {
      alerts.push({ type: 'success', message: ` All workouts completed! You're a beast!` });
    }
    
    if (healthHighlights.weightChange.trend === 'lost' && healthHighlights.weightChange.change > 2) {
      alerts.push({ type: 'success', message: ` ${healthHighlights.weightChange.display}` });
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
      alerts.push({ type: 'success', message: `${streakData.currentStreak}-day productivity streak! 🔥` });
    }

    setDashboardData(prev => ({
      ...prev,
      systemAlerts: alerts.slice(0, 5) // Show top 5 alerts
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
  } else if (tab === 'health') {
    navigate('/health');
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

  // Format sleep time
  const sleepTime = healthHighlights.sleep.hours > 0 || healthHighlights.sleep.minutes > 0
    ? `${healthHighlights.sleep.hours}h ${healthHighlights.sleep.minutes}m`
    : '-- : --';

  const handleMobileNav = (tab) => {
    handleNavigation(tab);
    setSidebarOpen(false);
  };

  return (
    <div className="dashboard-container">
      {/* Mobile Header */}
      <div className="mobile-header">
        <button 
          className={`hamburger-btn ${sidebarOpen ? 'open' : ''}`}
          onClick={() => setSidebarOpen(!sidebarOpen)}
          aria-label="Toggle menu"
        >
          <span></span>
          <span></span>
          <span></span>
        </button>
        <span className="mobile-header-logo">LIFELEADGER</span>
        <div className="mobile-header-actions">
          <button 
            className="settings-btn"
            onClick={() => setShowSettings(true)}
            title="Settings"
            style={{position:'static', width:40, height:40}}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
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

      {/* Sidebar overlay backdrop */}
      {sidebarOpen && (
        <div className="sidebar-overlay visible" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Left Sidebar */}
      <div className={`sidebar ${sidebarOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-header">
          <h2 className="sidebar-logo">LIFELEADGER</h2>
        </div>
        
        <div className="sidebar-menu">
          <div 
            className={`menu-item ${activeTab === 'home' ? 'active' : ''}`}
            onClick={() => handleMobileNav('home')}
          >
            <span className="menu-text">Home</span>
            <span className="menu-indicator"></span>
          </div>
          
          <div 
            className={`menu-item ${activeTab === 'activity' ? 'active' : ''}`}
            onClick={() => handleMobileNav('activity')}
          >
            <span className="menu-text">Activity Tracking</span>
            <span className="menu-indicator"></span>
          </div>
          
          <div 
            className={`menu-item ${activeTab === 'financial' ? 'active' : ''}`}
            onClick={() => handleMobileNav('financial')}
          >
            <span className="menu-text">Financial Tracking</span>
            <span className="menu-indicator"></span>
          </div>

          <div 
            className={`menu-item ${activeTab === 'health' ? 'active' : ''}`}
            onClick={() => handleMobileNav('health')}
          >
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
            
            {/* Fun Fact Banner */}
            <div className="fun-fact-banner">
              <span className="fun-fact-text">{healthHighlights.funFact}</span>
            </div>
          </div>

          {/* Stats Cards Grid */}
          <div className="stats-grid">
            {/* Tasks Card - Now Clickable */}
            <div className="stat-card" onClick={handleTasksCardClick} style={{ cursor: 'pointer' }}>
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

          {/* Health Highlights Row */}
          <div className="health-highlights-row">
            <div className="health-highlight-card water-mini">
              <div className="health-highlight-content">
                <span className="health-highlight-label">Water</span>
                <span className="health-highlight-value">{healthHighlights.waterIntake.percentage}%</span>
                <div className="health-mini-progress">
                  <div className="health-mini-fill water-fill" style={{ width: `${healthHighlights.waterIntake.percentage}%` }}></div>
                </div>
              </div>
            </div>
            
            <div className="health-highlight-card steps-mini">
              <div className="health-highlight-content">
                <span className="health-highlight-label">Steps</span>
                <span className="health-highlight-value">{healthHighlights.steps.percentage}%</span>
                <div className="health-mini-progress">
                  <div className="health-mini-fill steps-fill" style={{ width: `${healthHighlights.steps.percentage}%` }}></div>
                </div>
              </div>
            </div>
            
            <div className="health-highlight-card sleep-mini">
              <div className="health-highlight-content">
                <span className="health-highlight-label">Sleep</span>
                <span className="health-highlight-value">{sleepTime}</span>
              </div>
            </div>
            
            <div className="health-highlight-card workout-mini">
              <div className="health-highlight-content">
                <span className="health-highlight-label">Workouts</span>
                <span className="health-highlight-value">{healthHighlights.workouts.completed}/{healthHighlights.workouts.total}</span>
              </div>
            </div>
            
            <div className="health-highlight-card habit-mini">
              <div className="health-highlight-content">
                <span className="health-highlight-label">Habits</span>
                <span className="health-highlight-value">{healthHighlights.habits.percentage}%</span>
                <div className="health-mini-progress">
                  <div className="health-mini-fill habit-fill" style={{ width: `${healthHighlights.habits.percentage}%` }}></div>
                </div>
              </div>
            </div>
            
            {healthHighlights.weightChange.display && (
              <div className="health-highlight-card weight-mini">
                <div className="health-highlight-icon">
                  {healthHighlights.weightChange.trend === 'lost' ? '📉' : healthHighlights.weightChange.trend === 'gained' ? '📈' : '⚖️'}
                </div>
                <div className="health-highlight-content">
                  <span className="health-highlight-label">Weight</span>
                  <span className="health-highlight-value-small">{healthHighlights.weightChange.display}</span>
                </div>
              </div>
            )}
          </div>

          {/* Motivation Message */}
          <div className="motivation-message">
            <span className="motivation-text">{healthHighlights.motivationMessage}</span>
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

      {/* Pending Tasks Modal */}
      <PendingTasksModal 
        isOpen={showPendingTasksModal}
        onClose={() => setShowPendingTasksModal(false)}
        todos={pendingTodos}
        onToggleComplete={handleToggleTodoComplete}
        onRemove={handleRemoveTodo}
      />
    </div>
  );
}

export default Dashboard;