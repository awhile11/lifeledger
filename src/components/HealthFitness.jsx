import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, signOut } from '../firebase';
import useStepCounter from '../hooks/useStepCounter';
import './HealthFitness.css';

function HealthFitness() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('health');
  const [newHabit, setNewHabit] = useState('');
  
  // Step counter hook
  const { 
    steps: autoSteps, 
    isWalking, 
    error: stepError, 
    permissionGranted
  } = useStepCounter(true);
  
  // Health Data State with expanded stats
  const [healthData, setHealthData] = useState({
    waterIntake: {
      current: 0,
      goal: 3.7,
      unit: 'L',
      recommended: 3.7,
      calculationMethod: 'standard',
      useWeightCalculation: false,
      lastResetDate: new Date().toDateString(),
      history: [] // Store daily water intake
    },
    steps: {
      current: 0,
      goal: 10000,
      lastResetDate: new Date().toDateString(),
      history: [] // Store daily steps
    },
    sleep: {
      totalHours: 0,
      totalMinutes: 0,
      optimalMin: 7,
      optimalMax: 9,
      sessions: [],
      lastSleepDate: new Date().toDateString(),
      sleepStatus: 'pending',
      message: '',
      history: [] // Store daily sleep totals
    },
    workout: {
      routines: {},
      currentDay: new Date().toLocaleDateString('en-US', { weekday: 'long' }),
      lastUpdated: new Date().toDateString(),
      allCompleted: false,
      history: [] // Store daily workout completion
    },
    habits: [
      { id: 1, name: 'GYM', completed: false, history: [] },
      { id: 2, name: 'Stretch', completed: true, history: [] },
      { id: 3, name: 'Meditation', completed: false, history: [] },
      { id: 4, name: 'Vitamins', completed: true, history: [] },
      { id: 5, name: 'No Junk Food', completed: false, history: [] }
    ],
    weeklyStats: {
      workouts: { completed: 0, total: 0 },
      avgSleep: '0h 0m',
      waterConsistency: 0,
      mostMissedHabit: 'None'
    },
    monthlyStats: {
      current: {
        workouts: { completed: 0, total: 0 },
        avgSleep: '0h 0m',
        waterConsistency: 0,
        mostMissedHabit: 'None',
        sleepTotal: 0,
        waterTotal: 0,
        waterGoalTotal: 0
      },
      previous: {
        workouts: { completed: 0, total: 0 },
        avgSleep: '0h 0m',
        waterConsistency: 0,
        mostMissedHabit: 'None',
        sleepTotal: 0,
        waterTotal: 0,
        waterGoalTotal: 0
      }
    },
    weightTracker: {
      enabled: true,
      weight: 175,
      unit: 'lbs',
      gender: 'male',
      useForWaterCalculation: false,
      history: [] // Store weight history with dates
    }
  });

  const [userGender, setUserGender] = useState('male');
  const [showHabitModal, setShowHabitModal] = useState(false);
  const [showWeightModal, setShowWeightModal] = useState(false);
  const [showWaterModal, setShowWaterModal] = useState(false);
  const [showSleepModal, setShowSleepModal] = useState(false);
  const [showSleepHistoryModal, setShowSleepHistoryModal] = useState(false);
  const [showWorkoutModal, setShowWorkoutModal] = useState(false);
  const [showEditWorkoutModal, setShowEditWorkoutModal] = useState(false);
  const [showWeightHistoryModal, setShowWeightHistoryModal] = useState(false);
  const [editingExercise, setEditingExercise] = useState(null);
  
  const [waterInput, setWaterInput] = useState({ amount: '', unit: 'ml' });
  const [sleepInput, setSleepInput] = useState({ bedTime: '', wakeTime: '' });
  const [weightForm, setWeightForm] = useState({
    weight: '',
    bodyFat: '',
    waist: '',
    unit: 'lbs'
  });
  
  // Workout state
  const [workoutInput, setWorkoutInput] = useState({
    day: new Date().toLocaleDateString('en-US', { weekday: 'long' }),
    exerciseName: '',
    sets: 3,
    reps: 10
  });

  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  
  const navigate = useNavigate();

  // Helper function for localStorage keys
  const getUserKey = (userId, key) => `user_${userId}_${key}`;

  // Calculate weight change
  const calculateWeightChange = () => {
    if (!healthData.weightTracker.history || healthData.weightTracker.history.length < 2) {
      return { change: 0, percentage: 0, trend: 'stable', firstWeight: null, lastWeight: null };
    }
    
    // Sort history by date
    const sortedHistory = [...healthData.weightTracker.history].sort((a, b) => 
      new Date(a.date) - new Date(b.date)
    );
    
    const firstWeight = sortedHistory[0];
    const lastWeight = sortedHistory[sortedHistory.length - 1];
    
    // Convert to same unit for comparison
    const firstWeightValue = firstWeight.unit === 'lbs' ? firstWeight.weight : firstWeight.weight * 2.20462;
    const lastWeightValue = lastWeight.unit === 'lbs' ? lastWeight.weight : lastWeight.weight * 2.20462;
    
    const change = lastWeightValue - firstWeightValue;
    const percentage = ((change / firstWeightValue) * 100).toFixed(1);
    
    let trend = 'stable';
    if (change > 0.5) trend = 'gained';
    else if (change < -0.5) trend = 'lost';
    
    return {
      change: Math.abs(change).toFixed(1),
      percentage: Math.abs(percentage),
      trend,
      firstWeight: firstWeight,
      lastWeight: lastWeight,
      direction: change > 0 ? 'gain' : change < 0 ? 'loss' : 'no change'
    };
  };

  // Calculate weekly workout stats
  const calculateWeeklyWorkoutStats = (routines) => {
    let totalWorkouts = 0;
    let completedWorkouts = 0;
    
    Object.values(routines).forEach(dayExercises => {
      dayExercises.forEach(exercise => {
        totalWorkouts++;
        if (exercise.completed) {
          completedWorkouts++;
        }
      });
    });
    
    return { completed: completedWorkouts, total: totalWorkouts };
  };

  // Calculate weekly sleep stats
  const calculateWeeklySleepStats = (sessions) => {
    if (!sessions || sessions.length === 0) return '0h 0m';
    
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    
    const weeklySessions = sessions.filter(s => new Date(s.timestamp) >= oneWeekAgo);
    
    if (weeklySessions.length === 0) return '0h 0m';
    
    const totalMinutes = weeklySessions.reduce((total, session) => {
      return total + (session.hours * 60) + session.minutes;
    }, 0);
    
    const avgMinutes = Math.round(totalMinutes / 7); // Average per day
    const hours = Math.floor(avgMinutes / 60);
    const minutes = avgMinutes % 60;
    
    return `${hours}h ${minutes}m`;
  };

  // Calculate water consistency
  const calculateWaterConsistency = (history, goal) => {
    if (!history || history.length === 0) return 0;
    
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    
    const weeklyHistory = history.filter(h => new Date(h.date) >= oneWeekAgo);
    
    if (weeklyHistory.length === 0) return 0;
    
    const totalPercentage = weeklyHistory.reduce((sum, day) => {
      const percentage = (day.current / goal) * 100;
      return sum + Math.min(percentage, 100);
    }, 0);
    
    return Math.round(totalPercentage / weeklyHistory.length);
  };

  // Calculate most missed habit
  const calculateMostMissedHabit = (habits) => {
    if (!habits || habits.length === 0) return 'None';
    
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    
    const missedCounts = habits.map(habit => {
      const weeklyHistory = (habit.history || []).filter(h => new Date(h.date) >= oneWeekAgo);
      const missed = weeklyHistory.filter(h => !h.completed).length;
      return { name: habit.name, missed };
    });
    
    const mostMissed = missedCounts.reduce((max, habit) => 
      habit.missed > max.missed ? habit : max, { missed: 0 }
    );
    
    return mostMissed.missed > 0 ? mostMissed.name : 'None';
  };

  // Calculate monthly stats
  const calculateMonthlyStats = (data, monthOffset = 0) => {
    const targetDate = new Date();
    targetDate.setMonth(targetDate.getMonth() - monthOffset);
    const targetMonth = targetDate.getMonth();
    const targetYear = targetDate.getFullYear();
    
    // Filter data for the target month
    const monthData = {
      workouts: { completed: 0, total: 0 },
      sleepTotal: 0,
      waterTotal: 0,
      waterGoalTotal: 0,
      habitMisses: {}
    };
    
    // Process workout history
    Object.values(data.workout.routines || {}).forEach(dayExercises => {
      dayExercises.forEach(exercise => {
        (exercise.history || []).forEach(entry => {
          const entryDate = new Date(entry.date);
          if (entryDate.getMonth() === targetMonth && entryDate.getFullYear() === targetYear) {
            monthData.workouts.total++;
            if (entry.completed) monthData.workouts.completed++;
          }
        });
      });
    });
    
    // Process sleep history
    (data.sleep.history || []).forEach(entry => {
      const entryDate = new Date(entry.date);
      if (entryDate.getMonth() === targetMonth && entryDate.getFullYear() === targetYear) {
        monthData.sleepTotal += (entry.hours * 60) + entry.minutes;
      }
    });
    
    // Process water history
    (data.waterIntake.history || []).forEach(entry => {
      const entryDate = new Date(entry.date);
      if (entryDate.getMonth() === targetMonth && entryDate.getFullYear() === targetYear) {
        monthData.waterTotal += entry.current;
        monthData.waterGoalTotal += entry.goal;
      }
    });
    
    // Process habit history for most missed
    data.habits.forEach(habit => {
      (habit.history || []).forEach(entry => {
        const entryDate = new Date(entry.date);
        if (entryDate.getMonth() === targetMonth && entryDate.getFullYear() === targetYear) {
          if (!entry.completed) {
            monthData.habitMisses[habit.name] = (monthData.habitMisses[habit.name] || 0) + 1;
          }
        }
      });
    });
    
    // Find most missed habit for the month
    let mostMissed = 'None';
    let maxMisses = 0;
    Object.entries(monthData.habitMisses).forEach(([habit, misses]) => {
      if (misses > maxMisses) {
        maxMisses = misses;
        mostMissed = habit;
      }
    });
    
    // Calculate averages
    const daysInMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
    const avgSleepMinutes = monthData.sleepTotal / daysInMonth;
    const avgSleepHours = Math.floor(avgSleepMinutes / 60);
    const avgSleepMins = Math.round(avgSleepMinutes % 60);
    
    const waterConsistency = monthData.waterGoalTotal > 0 
      ? Math.round((monthData.waterTotal / monthData.waterGoalTotal) * 100)
      : 0;
    
    return {
      workouts: monthData.workouts,
      avgSleep: `${avgSleepHours}h ${avgSleepMins}m`,
      waterConsistency,
      mostMissedHabit: mostMissed,
      sleepTotal: monthData.sleepTotal,
      waterTotal: monthData.waterTotal,
      waterGoalTotal: monthData.waterGoalTotal
    };
  };

  // Update all stats
  const updateAllStats = (data) => {
    const workoutStats = calculateWeeklyWorkoutStats(data.workout.routines);
    const avgSleep = calculateWeeklySleepStats(data.sleep.sessions);
    const waterConsistency = calculateWaterConsistency(data.waterIntake.history, data.waterIntake.goal);
    const mostMissed = calculateMostMissedHabit(data.habits);
    
    const currentMonthStats = calculateMonthlyStats(data, 0);
    const previousMonthStats = calculateMonthlyStats(data, 1);
    
    return {
      ...data,
      weeklyStats: {
        workouts: workoutStats,
        avgSleep,
        waterConsistency,
        mostMissedHabit: mostMissed
      },
      monthlyStats: {
        current: currentMonthStats,
        previous: previousMonthStats
      }
    };
  };

  // Save daily data to history at midnight
  const saveDailyToHistory = (data) => {
    const today = new Date().toDateString();
    
    // Save water intake
    const waterHistory = [...(data.waterIntake.history || [])];
    const existingWaterEntry = waterHistory.findIndex(h => h.date === today);
    if (existingWaterEntry >= 0) {
      waterHistory[existingWaterEntry] = {
        date: today,
        current: data.waterIntake.current,
        goal: data.waterIntake.goal
      };
    } else {
      waterHistory.push({
        date: today,
        current: data.waterIntake.current,
        goal: data.waterIntake.goal
      });
    }
    
    // Save steps
    const stepsHistory = [...(data.steps.history || [])];
    const existingStepsEntry = stepsHistory.findIndex(h => h.date === today);
    if (existingStepsEntry >= 0) {
      stepsHistory[existingStepsEntry] = {
        date: today,
        current: data.steps.current,
        goal: data.steps.goal
      };
    } else {
      stepsHistory.push({
        date: today,
        current: data.steps.current,
        goal: data.steps.goal
      });
    }
    
    // Save sleep
    const sleepHistory = [...(data.sleep.history || [])];
    const existingSleepEntry = sleepHistory.findIndex(h => h.date === today);
    if (existingSleepEntry >= 0) {
      sleepHistory[existingSleepEntry] = {
        date: today,
        hours: data.sleep.totalHours,
        minutes: data.sleep.totalMinutes
      };
    } else if (data.sleep.totalHours > 0 || data.sleep.totalMinutes > 0) {
      sleepHistory.push({
        date: today,
        hours: data.sleep.totalHours,
        minutes: data.sleep.totalMinutes
      });
    }
    
    // Save workout completion
    const workoutHistory = [...(data.workout.history || [])];
    const existingWorkoutEntry = workoutHistory.findIndex(h => h.date === today);
    if (existingWorkoutEntry >= 0) {
      workoutHistory[existingWorkoutEntry] = {
        date: today,
        completed: data.workout.allCompleted,
        exercises: Object.values(data.workout.routines[today] || []).map(e => ({
          name: e.name,
          completed: e.completed
        }))
      };
    } else {
      workoutHistory.push({
        date: today,
        completed: data.workout.allCompleted,
        exercises: Object.values(data.workout.routines[today] || []).map(e => ({
          name: e.name,
          completed: e.completed
        }))
      });
    }
    
    // Save habit completion
    const updatedHabits = data.habits.map(habit => {
      const habitHistory = [...(habit.history || [])];
      const existingEntry = habitHistory.findIndex(h => h.date === today);
      if (existingEntry >= 0) {
        habitHistory[existingEntry] = {
          date: today,
          completed: habit.completed
        };
      } else {
        habitHistory.push({
          date: today,
          completed: habit.completed
        });
      }
      return { ...habit, history: habitHistory };
    });
    
    return {
      ...data,
      waterIntake: { ...data.waterIntake, history: waterHistory },
      steps: { ...data.steps, history: stepsHistory },
      sleep: { ...data.sleep, history: sleepHistory },
      workout: { ...data.workout, history: workoutHistory },
      habits: updatedHabits
    };
  };

  // Generate improvement tips
  const generateImprovementTips = () => {
    const { current, previous } = healthData.monthlyStats;
    const tips = [];
    
    // Workout tips
    if (current.workouts.total > 0) {
      const workoutPercentage = (current.workouts.completed / current.workouts.total) * 100;
      if (workoutPercentage < 70) {
        tips.push({
          category: 'workout',
          tip: 'Try to complete at least 70% of your workouts. Consider scheduling them at the same time each day to build consistency.'
        });
      }
      if (previous.workouts.total > 0) {
        const previousPercentage = (previous.workouts.completed / previous.workouts.total) * 100;
        if (workoutPercentage > previousPercentage) {
          tips.push({
            category: 'workout',
            tip: 'Great improvement in workout consistency! Keep up the momentum.'
          });
        } else if (workoutPercentage < previousPercentage) {
          tips.push({
            category: 'workout',
            tip: 'Your workout completion rate dropped. Try setting smaller, achievable goals to rebuild momentum.'
          });
        }
      }
    }
    
    // Sleep tips
    if (current.sleepTotal > 0) {
      const avgSleepHours = current.sleepTotal / 60 / 30; // Approximate hours per night
      if (avgSleepHours < 7) {
        tips.push({
          category: 'sleep',
          tip: 'You\'re averaging less than 7 hours of sleep. Try to establish a consistent bedtime routine and avoid screens before bed.'
        });
      } else if (avgSleepHours > 9) {
        tips.push({
          category: 'sleep',
          tip: 'You\'re sleeping more than 9 hours on average. While rest is important, excessive sleep might indicate other factors. Try to maintain a consistent wake-up time.'
        });
      }
      
      if (previous.sleepTotal > 0) {
        const sleepDifference = current.sleepTotal - previous.sleepTotal;
        if (Math.abs(sleepDifference) > 300) { // 5 hours difference
          tips.push({
            category: 'sleep',
            tip: sleepDifference > 0 
              ? 'You\'re sleeping more this month. Great job prioritizing rest!'
              : 'Your sleep has decreased this month. Try to prioritize getting enough rest.'
          });
        }
      }
    }
    
    // Water tips
    if (current.waterConsistency < 70) {
      tips.push({
        category: 'water',
        tip: 'Water consistency is below 70%. Try keeping a water bottle at your desk and setting reminders to drink.'
      });
    }
    
    // Habit tips
    if (current.mostMissedHabit !== 'None') {
      tips.push({
        category: 'habit',
        tip: `Your most missed habit is "${current.mostMissedHabit}". Try linking it to an existing habit you already do daily.`
      });
    }
    
    // Weight tips
    const weightChange = calculateWeightChange();
    if (weightChange.trend === 'gained' && weightChange.change > 5) {
      tips.push({
        category: 'weight',
        tip: `You've gained ${weightChange.change} ${healthData.weightTracker.unit}. Consider adjusting your diet and increasing physical activity.`
      });
    } else if (weightChange.trend === 'lost' && weightChange.change > 5) {
      tips.push({
        category: 'weight',
        tip: `Great job! You've lost ${weightChange.change} ${healthData.weightTracker.unit}. Keep up the healthy habits!`
      });
    }
    
    // Overall improvement
    if (current.waterConsistency > previous.waterConsistency && 
        current.workouts.completed > previous.workouts.completed) {
      tips.push({
        category: 'overall',
        tip: 'Excellent progress this month! You\'re improving across multiple areas. Keep up the great work!'
      });
    }
    
    return tips;
  };

  // Load user gender from settings
  const loadUserGender = (userId) => {
    const genderKey = getUserKey(userId, 'gender');
    const savedGender = localStorage.getItem(genderKey);
    if (savedGender) {
      setUserGender(savedGender);
      return savedGender;
    }
    return 'male';
  };

  // Calculate water based on weight
  const calculateWaterFromWeight = (weight, unit) => {
    if (!weight || weight <= 0) return null;
    const weightInKg = unit === 'lbs' ? weight * 0.453592 : weight;
    return parseFloat((weightInKg * 0.033).toFixed(1));
  };

  // Calculate sleep duration
  const calculateSleepDuration = (bedTime, wakeTime) => {
    if (!bedTime || !wakeTime) return { hours: 0, minutes: 0 };
    
    const [bedHour, bedMinute] = bedTime.split(':').map(Number);
    const [wakeHour, wakeMinute] = wakeTime.split(':').map(Number);
    
    let bedDate = new Date();
    bedDate.setHours(bedHour, bedMinute, 0);
    
    let wakeDate = new Date();
    wakeDate.setHours(wakeHour, wakeMinute, 0);
    
    if (wakeDate <= bedDate) {
      wakeDate.setDate(wakeDate.getDate() + 1);
    }
    
    const diffMs = wakeDate - bedDate;
    return {
      hours: Math.floor(diffMs / (1000 * 60 * 60)),
      minutes: Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
    };
  };

  // Calculate total sleep
  const calculateTotalSleep = (sessions) => {
    let totalMinutes = 0;
    sessions.forEach(session => {
      totalMinutes += (session.hours * 60) + session.minutes;
    });
    return {
      hours: Math.floor(totalMinutes / 60),
      minutes: totalMinutes % 60
    };
  };

  // Determine sleep status
  const determineSleepStatus = (totalHours, totalMinutes) => {
    const totalInHours = totalHours + (totalMinutes / 60);
    const optimalMin = 7;
    const optimalMax = 9;
    
    if (totalInHours === 0) {
      return {
        status: 'pending',
        message: 'No sleep logged yet',
        color: 'var(--text-secondary)'
      };
    }
    
    if (totalInHours < optimalMin) {
      const hoursNeeded = (optimalMin - totalInHours).toFixed(1);
      return {
        status: 'under-slept',
        message: `Need ${hoursNeeded}h more for optimal rest`,
        color: 'var(--warning-color)'
      };
    }
    
    if (totalInHours > optimalMax) {
      const hoursOver = (totalInHours - optimalMax).toFixed(1);
      return {
        status: 'over-slept',
        message: ` Overslept by ${hoursOver}h`,
        color: 'var(--accent-color)'
      };
    }
    
    return {
      status: 'optimal',
      message: 'Optimal sleep! Well rested',
      color: 'var(--success-color)'
    };
  };

  // Workout functions
  const getCurrentDayWorkout = () => {
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
    return healthData.workout.routines[today] || [];
  };

  const checkAllCompleted = (routines) => {
    if (!routines || routines.length === 0) return false;
    return routines.every(exercise => 
      exercise.sets.every(set => set.completed)
    );
  };

  const handleAddWorkout = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!user) return;
    if (!workoutInput.exerciseName.trim()) return;
    
    const newExercise = {
      id: Date.now(),
      name: workoutInput.exerciseName,
      sets: Array(workoutInput.sets).fill(null).map((_, i) => ({
        id: `set-${Date.now()}-${i}`,
        number: i + 1,
        reps: workoutInput.reps,
        completed: false
      })),
      completed: false,
      history: []
    };
    
    const updatedRoutines = { ...healthData.workout.routines };
    if (!updatedRoutines[workoutInput.day]) {
      updatedRoutines[workoutInput.day] = [];
    }
    updatedRoutines[workoutInput.day].push(newExercise);
    
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
    const allCompleted = checkAllCompleted(updatedRoutines[today]);
    
    const updatedData = {
      ...healthData,
      workout: {
        ...healthData.workout,
        routines: updatedRoutines,
        allCompleted
      }
    };
    
    const dataWithStats = updateAllStats(updatedData);
    setHealthData(dataWithStats);
    saveHealthData(user.uid, dataWithStats);
    setShowWorkoutModal(false);
    setWorkoutInput({
      ...workoutInput,
      exerciseName: '',
      sets: 3,
      reps: 10
    });
  };

  const handleRemoveWorkout = (day, exerciseId, e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!user) return;
    
    const updatedRoutines = { ...healthData.workout.routines };
    updatedRoutines[day] = updatedRoutines[day].filter(ex => ex.id !== exerciseId);
    
    if (updatedRoutines[day].length === 0) {
      delete updatedRoutines[day];
    }
    
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
    const allCompleted = checkAllCompleted(updatedRoutines[today] || []);
    
    const updatedData = {
      ...healthData,
      workout: {
        ...healthData.workout,
        routines: updatedRoutines,
        allCompleted
      }
    };
    
    const dataWithStats = updateAllStats(updatedData);
    setHealthData(dataWithStats);
    saveHealthData(user.uid, dataWithStats);
  };

  const handleEditWorkout = (exercise) => {
    setEditingExercise(exercise);
    setWorkoutInput({
      day: exercise.day || new Date().toLocaleDateString('en-US', { weekday: 'long' }),
      exerciseName: exercise.name,
      sets: exercise.sets.length,
      reps: exercise.sets[0]?.reps || 10
    });
    setShowEditWorkoutModal(true);
  };

  const handleUpdateWorkout = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!user || !editingExercise) return;
    
    const updatedRoutines = { ...healthData.workout.routines };
    const day = workoutInput.day;
    
    const exerciseIndex = updatedRoutines[day]?.findIndex(ex => ex.id === editingExercise.id);
    
    if (exerciseIndex !== -1) {
      const updatedExercise = {
        ...editingExercise,
        name: workoutInput.exerciseName,
        sets: Array(workoutInput.sets).fill(null).map((_, i) => ({
          id: `set-${Date.now()}-${i}`,
          number: i + 1,
          reps: workoutInput.reps,
          completed: editingExercise.sets[i]?.completed || false
        })),
        completed: false
      };
      
      updatedRoutines[day][exerciseIndex] = updatedExercise;
    }
    
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
    const allCompleted = checkAllCompleted(updatedRoutines[today] || []);
    
    const updatedData = {
      ...healthData,
      workout: {
        ...healthData.workout,
        routines: updatedRoutines,
        allCompleted
      }
    };
    
    const dataWithStats = updateAllStats(updatedData);
    setHealthData(dataWithStats);
    saveHealthData(user.uid, dataWithStats);
    setShowEditWorkoutModal(false);
    setEditingExercise(null);
  };

  const toggleSetComplete = (day, exerciseId, setId, e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!user) return;
    
    const updatedRoutines = { ...healthData.workout.routines };
    const exerciseIndex = updatedRoutines[day].findIndex(ex => ex.id === exerciseId);
    
    if (exerciseIndex !== -1) {
      const setIndex = updatedRoutines[day][exerciseIndex].sets.findIndex(s => s.id === setId);
      if (setIndex !== -1) {
        updatedRoutines[day][exerciseIndex].sets[setIndex].completed = 
          !updatedRoutines[day][exerciseIndex].sets[setIndex].completed;
      }
      
      const allSetsCompleted = updatedRoutines[day][exerciseIndex].sets.every(s => s.completed);
      updatedRoutines[day][exerciseIndex].completed = allSetsCompleted;
    }
    
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
    const allCompleted = checkAllCompleted(updatedRoutines[today] || []);
    
    const updatedData = {
      ...healthData,
      workout: {
        ...healthData.workout,
        routines: updatedRoutines,
        allCompleted
      }
    };
    
    const dataWithStats = updateAllStats(updatedData);
    setHealthData(dataWithStats);
    saveHealthData(user.uid, dataWithStats);
  };

  // Check for day change and reset workout completion
  const checkAndResetWorkout = (data) => {
    const today = new Date().toDateString();
    const currentDay = new Date().toLocaleDateString('en-US', { weekday: 'long' });
    
    if (data.workout.lastUpdated !== today) {
      // Save yesterday's data to history before resetting
      let updatedData = saveDailyToHistory(data);
      
      // Reset completion status for all exercises
      const updatedRoutines = { ...updatedData.workout.routines };
      Object.keys(updatedRoutines).forEach(day => {
        updatedRoutines[day].forEach(exercise => {
          exercise.sets.forEach(set => {
            set.completed = false;
          });
          exercise.completed = false;
        });
      });
      
      return {
        ...updatedData,
        workout: {
          ...updatedData.workout,
          routines: updatedRoutines,
          currentDay,
          lastUpdated: today,
          allCompleted: false
        }
      };
    }
    return data;
  };

  // Handle sleep submit
  const handleSleepSubmit = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!user) return;
    if (!sleepInput.bedTime || !sleepInput.wakeTime) return;
    
    const { hours, minutes } = calculateSleepDuration(sleepInput.bedTime, sleepInput.wakeTime);
    
    if (hours > 24) {
      alert('Sleep session cannot be longer than 24 hours');
      return;
    }

    if (hours === 0 && minutes === 0) {
      alert('Sleep duration cannot be zero');
      return;
    }
    
    const newSession = {
      id: Date.now(),
      bedTime: sleepInput.bedTime,
      wakeTime: sleepInput.wakeTime,
      hours, 
      minutes,
      timestamp: new Date().toISOString()
    };
    
    const updatedSessions = [...(healthData.sleep.sessions || []), newSession];
    const totalSleep = calculateTotalSleep(updatedSessions);
    const sleepStatus = determineSleepStatus(totalSleep.hours, totalSleep.minutes);
    
    const updatedData = {
      ...healthData,
      sleep: {
        ...healthData.sleep,
        sessions: updatedSessions,
        totalHours: totalSleep.hours,
        totalMinutes: totalSleep.minutes,
        sleepStatus: sleepStatus.status,
        message: sleepStatus.message,
        lastSleepDate: new Date().toDateString()
      }
    };
    
    const dataWithStats = updateAllStats(updatedData);
    setHealthData(dataWithStats);
    saveHealthData(user.uid, dataWithStats);
    setShowSleepModal(false);
    setSleepInput({ bedTime: '', wakeTime: '' });
  };

  // Remove a sleep session
  const removeSleepSession = (sessionId, e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!user) return;
    
    const updatedSessions = healthData.sleep.sessions.filter(s => s.id !== sessionId);
    const totalSleep = calculateTotalSleep(updatedSessions);
    const sleepStatus = determineSleepStatus(totalSleep.hours, totalSleep.minutes);
    
    const updatedData = {
      ...healthData,
      sleep: {
        ...healthData.sleep,
        sessions: updatedSessions,
        totalHours: totalSleep.hours,
        totalMinutes: totalSleep.minutes,
        sleepStatus: sleepStatus.status,
        message: sleepStatus.message
      }
    };
    
    const dataWithStats = updateAllStats(updatedData);
    setHealthData(dataWithStats);
    saveHealthData(user.uid, dataWithStats);
  };

  // Handle water submit
  const handleWaterSubmit = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!user || !waterInput.amount) return;
    
    let amountInLiters = parseFloat(waterInput.amount);
    if (waterInput.unit === 'ml') amountInLiters /= 1000;
    
    const newCurrent = healthData.waterIntake.current + amountInLiters;
    const updatedData = {
      ...healthData,
      waterIntake: { ...healthData.waterIntake, current: parseFloat(newCurrent.toFixed(2)) }
    };
    
    const dataWithStats = updateAllStats(updatedData);
    setHealthData(dataWithStats);
    saveHealthData(user.uid, dataWithStats);
    setShowWaterModal(false);
    setWaterInput({ amount: '', unit: 'ml' });
  };

  // Handle add habit
  const handleAddHabit = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!user || !newHabit.trim()) return;
    
    const newHabitObj = { 
      id: Date.now(), 
      name: newHabit.trim(), 
      completed: false,
      history: []
    };
    
    const updatedData = { 
      ...healthData, 
      habits: [...healthData.habits, newHabitObj] 
    };
    
    const dataWithStats = updateAllStats(updatedData);
    setHealthData(dataWithStats);
    saveHealthData(user.uid, dataWithStats);
    setNewHabit('');
    setShowHabitModal(false);
  };

  // Handle update weight
  const handleUpdateWeight = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!user) return;
    
    const newWeight = weightForm.weight ? parseFloat(weightForm.weight) : healthData.weightTracker.weight;
    const newUnit = weightForm.unit || healthData.weightTracker.unit;
    
    // Add to history
    const today = new Date().toDateString();
    const weightHistory = [...(healthData.weightTracker.history || [])];
    const existingEntry = weightHistory.findIndex(h => h.date === today);
    
    if (existingEntry >= 0) {
      weightHistory[existingEntry] = {
        date: today,
        weight: newWeight,
        unit: newUnit
      };
    } else {
      weightHistory.push({
        date: today,
        weight: newWeight,
        unit: newUnit
      });
    }
    
    const updatedWeightData = {
      ...healthData.weightTracker,
      weight: newWeight,
      unit: newUnit,
      history: weightHistory
    };
    
    let updatedWaterIntake = { ...healthData.waterIntake };
    
    if (healthData.waterIntake.useWeightCalculation && updatedWeightData.weight) {
      const calculatedWater = calculateWaterFromWeight(updatedWeightData.weight, updatedWeightData.unit);
      if (calculatedWater) {
        updatedWaterIntake = {
          ...updatedWaterIntake,
          goal: calculatedWater,
          recommended: calculatedWater,
          calculationMethod: 'weight-based'
        };
      }
    }
    
    const updatedData = {
      ...healthData,
      weightTracker: updatedWeightData,
      waterIntake: updatedWaterIntake
    };
    
    const dataWithStats = updateAllStats(updatedData);
    setHealthData(dataWithStats);
    saveHealthData(user.uid, dataWithStats);
    setShowWeightModal(false);
    setWeightForm({ weight: '', bodyFat: '', waist: '', unit: 'lbs' });
  };

  // Reset functions
  const resetSleepForNewDay = (data) => {
    // Save yesterday's sleep to history
    let updatedData = saveDailyToHistory(data);
    
    return {
      ...updatedData,
      sleep: {
        ...updatedData.sleep,
        sessions: [],
        totalHours: 0,
        totalMinutes: 0,
        sleepStatus: 'pending',
        message: 'No sleep logged yet'
      }
    };
  };

  // Check and reset functions
  const checkAndResetSleep = (data) => {
    const today = new Date().toDateString();
    if (data.sleep.lastSleepDate !== today) {
      return resetSleepForNewDay(data);
    }
    return data;
  };

  const checkAndResetSteps = (data) => {
    const today = new Date().toDateString();
    if (data.steps.lastResetDate !== today) {
      // Save yesterday's steps to history
      let updatedData = saveDailyToHistory(data);
      
      return {
        ...updatedData,
        steps: { ...updatedData.steps, current: 0, lastResetDate: today }
      };
    }
    return data;
  };

  const checkAndResetWaterIntake = (data) => {
    const today = new Date().toDateString();
    if (data.waterIntake.lastResetDate !== today) {
      // Save yesterday's water to history
      let updatedData = saveDailyToHistory(data);
      
      return {
        ...updatedData,
        waterIntake: { ...updatedData.waterIntake, current: 0, lastResetDate: today }
      };
    }
    return data;
  };

  // Load health data
  const loadHealthData = (userId) => {
    const healthKey = getUserKey(userId, 'healthData');
    const savedHealth = localStorage.getItem(healthKey);
    const gender = loadUserGender(userId);
    
    let waterGoal = gender === 'female' ? 2.7 : 3.7;
    let calculationMethod = 'standard';
    
    if (savedHealth) {
      try {
        let parsed = JSON.parse(savedHealth);
        
        if (parsed.weightTracker?.useForWaterCalculation && parsed.weightTracker?.weight) {
          const calculatedWater = calculateWaterFromWeight(parsed.weightTracker.weight, parsed.weightTracker.unit);
          if (calculatedWater) {
            waterGoal = calculatedWater;
            calculationMethod = 'weight-based';
          }
        }
        
        parsed.waterIntake = { ...parsed.waterIntake, goal: waterGoal, recommended: waterGoal, calculationMethod };
        parsed.weightTracker.gender = gender;
        
        // Update sleep status
        if (parsed.sleep) {
          const sleepStatus = determineSleepStatus(parsed.sleep.totalHours || 0, parsed.sleep.totalMinutes || 0);
          parsed.sleep.sleepStatus = sleepStatus.status;
          parsed.sleep.message = sleepStatus.message;
        }
        
        // Update workout for new day
        const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
        parsed.workout = parsed.workout || {
          routines: {},
          currentDay: today,
          lastUpdated: new Date().toDateString(),
          allCompleted: false,
          history: []
        };
        
        let updated = checkAndResetWaterIntake(parsed);
        updated = checkAndResetSteps(updated);
        updated = checkAndResetSleep(updated);
        updated = checkAndResetWorkout(updated);
        
        const dataWithStats = updateAllStats(updated);
        setHealthData(dataWithStats);
      } catch (e) {
        console.error('Error parsing health data:', e);
      }
    }
  };

  // Save health data
  const saveHealthData = (userId, data) => {
    const healthKey = getUserKey(userId, 'healthData');
    localStorage.setItem(healthKey, JSON.stringify(data));
  };

  // Update steps from auto-counter
  useEffect(() => {
    if (user && autoSteps > 0) {
      setHealthData(prev => {
        const dataWithReset = checkAndResetSteps(prev);
        if (Math.abs(autoSteps - dataWithReset.steps.current) > 5) {
          const updated = {
            ...dataWithReset,
            steps: { ...dataWithReset.steps, current: autoSteps }
          };
          const dataWithStats = updateAllStats(updated);
          saveHealthData(user.uid, dataWithStats);
          return dataWithStats;
        }
        return dataWithReset;
      });
    }
  }, [autoSteps, user]);

  // Auth state observer
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        setUser(user);
        loadHealthData(user.uid);
        setLoading(false);
      } else {
        navigate('/login');
      }
    });

    const interval = setInterval(() => {
      if (user) {
        setHealthData(prev => {
          let updated = checkAndResetWaterIntake(prev);
          updated = checkAndResetSteps(updated);
          updated = checkAndResetSleep(updated);
          updated = checkAndResetWorkout(updated);
          
          // Check if it's midnight to update stats
          const now = new Date();
          if (now.getHours() === 0 && now.getMinutes() === 0) {
            updated = saveDailyToHistory(updated);
          }
          
          const dataWithStats = updateAllStats(updated);
          if (dataWithStats !== prev) saveHealthData(user.uid, dataWithStats);
          return dataWithStats;
        });
      }
    }, 60000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, [navigate, user]);

  // Handlers
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
    if (tab === 'home') navigate('/dashboard');
    else if (tab === 'activity') navigate('/activity');
    else if (tab === 'financial') navigate('/financial');
    else if (tab === 'health') navigate('/health');
  };

  const toggleWeightBasedWater = () => {
    if (!user) return;
    
    const useWeightCalc = !healthData.waterIntake.useWeightCalculation;
    let newGoal = healthData.waterIntake.goal;
    let calculationMethod = 'standard';
    
    if (useWeightCalc && healthData.weightTracker.weight) {
      const calculatedWater = calculateWaterFromWeight(healthData.weightTracker.weight, healthData.weightTracker.unit);
      if (calculatedWater) {
        newGoal = calculatedWater;
        calculationMethod = 'weight-based';
      }
    } else {
      newGoal = healthData.weightTracker.gender === 'female' ? 2.7 : 3.7;
    }
    
    const updatedData = {
      ...healthData,
      waterIntake: {
        ...healthData.waterIntake,
        goal: newGoal,
        recommended: newGoal,
        calculationMethod,
        useWeightCalculation: useWeightCalc
      },
      weightTracker: {
        ...healthData.weightTracker,
        useForWaterCalculation: useWeightCalc
      }
    };
    
    const dataWithStats = updateAllStats(updatedData);
    setHealthData(dataWithStats);
    saveHealthData(user.uid, dataWithStats);
  };

  const toggleHabit = (id) => {
    if (!user) return;
    const updatedHabits = healthData.habits.map(h => h.id === id ? { ...h, completed: !h.completed } : h);
    const updatedData = { ...healthData, habits: updatedHabits };
    const dataWithStats = updateAllStats(updatedData);
    setHealthData(dataWithStats);
    saveHealthData(user.uid, dataWithStats);
  };

  const removeHabit = (id, e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!user) return;
    const updatedHabits = healthData.habits.filter(h => h.id !== id);
    const updatedData = { ...healthData, habits: updatedHabits };
    const dataWithStats = updateAllStats(updatedData);
    setHealthData(dataWithStats);
    saveHealthData(user.uid, dataWithStats);
  };

  const toggleWeightTracker = () => {
    if (!user) return;
    const updatedData = {
      ...healthData,
      weightTracker: { ...healthData.weightTracker, enabled: !healthData.weightTracker.enabled }
    };
    setHealthData(updatedData);
    saveHealthData(user.uid, updatedData);
  };

  const updateGender = (gender) => {
    if (!user) return;
    
    const genderKey = getUserKey(user.uid, 'gender');
    localStorage.setItem(genderKey, gender);
    setUserGender(gender);
    
    let updatedWaterIntake = { ...healthData.waterIntake };
    
    if (!healthData.waterIntake.useWeightCalculation) {
      const defaultGoal = gender === 'female' ? 2.7 : 3.7;
      updatedWaterIntake = {
        ...updatedWaterIntake,
        goal: defaultGoal,
        recommended: defaultGoal,
        calculationMethod: 'standard'
      };
    }
    
    const updatedData = {
      ...healthData,
      weightTracker: { ...healthData.weightTracker, gender },
      waterIntake: updatedWaterIntake
    };
    
    const dataWithStats = updateAllStats(updatedData);
    setHealthData(dataWithStats);
    saveHealthData(user.uid, dataWithStats);
  };

  // Calculate percentage
  const calculatePercentage = (current, goal) => {
    if (!goal || goal === 0) return 0;
    return Math.min(100, Math.round((current / goal) * 100));
  };

  // Get sleep status display
  const getSleepStatusDisplay = () => {
    return {
      message: healthData?.sleep?.message || 'No sleep logged',
      color: healthData?.sleep?.sleepStatus === 'optimal' ? 'var(--success-color)' :
             healthData?.sleep?.sleepStatus === 'under-slept' ? 'var(--warning-color)' :
             healthData?.sleep?.sleepStatus === 'over-slept' ? 'var(--accent-color)' :
             'var(--text-secondary)'
    };
  };

  if (loading) {
    return (
      <div className="health-container">
        <div className="loading">Loading...</div>
      </div>
    );
  }

  const waterPercentage = calculatePercentage(
    healthData?.waterIntake?.current || 0, 
    healthData?.waterIntake?.goal || 1
  );
  const stepsPercentage = calculatePercentage(
    healthData?.steps?.current || 0, 
    healthData?.steps?.goal || 1
  );
  const sleepPercentage = calculatePercentage(
    (healthData?.sleep?.totalHours || 0) + ((healthData?.sleep?.totalMinutes || 0) / 60), 
    healthData?.sleep?.optimalMax || 9
  );
  const sleepStatus = getSleepStatusDisplay();
  const genderDisplay = healthData?.weightTracker?.gender === 'female' ? 'Women' : 'Men';

  const sleepGoalDisplay = `7-9 hours (optimal)`;
  
  // Get today's workout
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
  const todayWorkout = healthData?.workout?.routines?.[today] || [];
  
  const improvementTips = generateImprovementTips();
  const { current, previous } = healthData.monthlyStats;
  const weightChange = calculateWeightChange();

  return (
    <div className="health-container">
      {/* Sidebar */}
      <div className="sidebar">
        <div className="sidebar-header">
          <h2 className="sidebar-logo">LIFELEADGER</h2>
        </div>
        <div className="sidebar-menu">
          {['home', 'activity', 'financial', 'health'].map(tab => (
            <div key={tab} className={`menu-item ${activeTab === tab ? 'active' : ''}`} onClick={() => handleNavigation(tab)}>
              <span className="menu-text">
                {tab === 'home' ? 'Home' : tab === 'activity' ? 'Activity Tracking' : tab === 'financial' ? 'Financial Tracking' : 'Health & Fitness'}
              </span>
              <span className="menu-indicator"></span>
            </div>
          ))}
        </div>
        <div className="sidebar-footer">
          <button className="logout-btn" onClick={handleLogout}>Logout</button>
        </div>
      </div>

      {/* Main Content */}
      <div className="health-main-content">
        <div className="content-wrapper">
          <h1 className="page-title">HEALTH & FITNESS</h1>

          {/* Daily Overview */}
          <div className="daily-overview-section">
            <h2 className="section-title">DAILY OVERVIEW</h2>
            <div className="overview-grid">
              {/* Water Card */}
              <div className="overview-card water-card" onClick={() => setShowWaterModal(true)}>
                <h3 className="card-label">Water Intake</h3>
                <div className="progress-container">
                  <div className="progress-info">
                    <span className="progress-value">{healthData?.waterIntake?.current?.toFixed(1) || '0'}/{healthData?.waterIntake?.goal?.toFixed(1) || '0'}L</span>
                    <span className="progress-percentage">{waterPercentage}%</span>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-fill water-progress" style={{ width: `${waterPercentage}%` }}></div>
                  </div>
                  <div className="water-info">
                    <small className="recommended-text">
                      {healthData?.waterIntake?.calculationMethod === 'weight-based' 
                        ? `Based on your weight: ${healthData?.waterIntake?.recommended?.toFixed(1) || '0'}L` 
                        : `Standard for ${genderDisplay}: ${healthData?.waterIntake?.recommended?.toFixed(1) || '0'}L`}
                    </small>
                    <small className="reset-text">Resets at midnight</small>
                  </div>
                </div>
              </div>

              {/* Steps Card */}
              <div className="overview-card steps-card">
                <h3 className="card-label">Steps {isWalking && '🚶‍♂️'}</h3>
                <div className="progress-container">
                  {!permissionGranted && stepError && (
                    <div className="sensor-error"><small className="error-text">{stepError}</small></div>
                  )}
                  <div className="progress-info">
                    <span className="progress-value">{healthData?.steps?.current?.toLocaleString() || '0'}/{healthData?.steps?.goal?.toLocaleString() || '0'}</span>
                    <span className="progress-percentage">{stepsPercentage}%</span>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-fill steps-progress" style={{ width: `${stepsPercentage}%` }}></div>
                  </div>
                  <div className="step-status">
                    {isWalking ? <span className="walking-indicator">🚶 Walking</span> : <span className="idle-indicator">💤 No movement</span>}
                  </div>
                  <div className="reset-indicator">
                    <small className="reset-text">Resets at midnight</small>
                  </div>
                </div>
              </div>

              {/* Sleep Card */}
              <div className="overview-card sleep-card" onClick={() => setShowSleepModal(true)}>
                <h3 className="card-label">Sleep</h3>
                <div className="progress-container">
                  <div className="progress-info">
                    <span className="progress-value">
                      {healthData?.sleep?.totalHours > 0 || healthData?.sleep?.totalMinutes > 0 
                        ? `${healthData.sleep.totalHours}h ${healthData.sleep.totalMinutes}m` : '-- : --'}
                    </span>
                    <span className="progress-percentage">{sleepPercentage}%</span>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-fill sleep-progress" style={{ width: `${sleepPercentage}%` }}></div>
                  </div>
                  
                  {/* Sleep Status Message */}
                  <div className="sleep-status-message" style={{ color: sleepStatus.color }}>
                    {sleepStatus.message}
                  </div>
                  
                  {/* Optimal Range Indicator */}
                  <div className="sleep-optimal-range">
                    <small>{sleepGoalDisplay}</small>
                  </div>
                  
                  {/* Sleep Sessions Count */}
                  {healthData?.sleep?.sessions?.length > 0 && (
                    <div className="sleep-sessions-info">
                      <small>{healthData.sleep.sessions.length} session(s)</small>
                      <button 
                        className="view-sessions-btn" 
                        onClick={(e) => { 
                          e.preventDefault();
                          e.stopPropagation(); 
                          setShowSleepHistoryModal(true); 
                        }}
                      >
                        View
                      </button>
                    </div>
                  )}
                  
                  <div className="reset-indicator">
                    <small className="reset-text">Click to add sleep</small>
                  </div>
                </div>
              </div>

              {/* Workout Card */}
              <div className="overview-card workout-card" onClick={() => setShowWorkoutModal(true)}>
                <h3 className="card-label">Workout - {today}</h3>
                <div className="workout-container">
                  {todayWorkout.length > 0 ? (
                    <>
                      {todayWorkout.map(exercise => {
                        const completedSets = exercise.sets.filter(s => s.completed).length;
                        const totalSets = exercise.sets.length;
                        const progress = Math.round((completedSets / totalSets) * 100);
                        
                        return (
                          <div key={exercise.id} className="workout-exercise">
                            <div className="exercise-header">
                              <div className="exercise-info">
                                <span className="exercise-name">{exercise.name}</span>
                                <span className="exercise-summary">
                                  {totalSets} sets × {exercise.sets[0]?.reps} reps
                                </span>
                                <span className="exercise-progress">
                                  {completedSets}/{totalSets} sets complete ({progress}%)
                                </span>
                              </div>
                              <div className="exercise-actions">
                                <button 
                                  className="edit-exercise-btn"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    handleEditWorkout({...exercise, day: today});
                                  }}
                                  title="Edit exercise"
                                >
                                  ✎
                                </button>
                                <button 
                                  className="remove-exercise-btn"
                                  onClick={(e) => handleRemoveWorkout(today, exercise.id, e)}
                                  title="Remove exercise"
                                >
                                  ✕
                                </button>
                              </div>
                            </div>
                            <div className="exercise-sets">
                              {exercise.sets.map(set => (
                                <div key={set.id} className="set-item">
                                  <span className="set-label">Set {set.number}: {set.reps} reps</span>
                                  <input
                                    type="checkbox"
                                    className="set-checkbox"
                                    checked={set.completed}
                                    onChange={(e) => toggleSetComplete(today, exercise.id, set.id, e)}
                                    onClick={(e) => e.stopPropagation()}
                                  />
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                      {healthData.workout.allCompleted && (
                        <div className="workout-complete-badge">✅ Workout Complete!</div>
                      )}
                    </>
                  ) : (
                    <div className="no-workout">
                      <p>No workout scheduled for today</p>
                      <p className="add-workout-prompt">Click to add exercises</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Habits Section */}
          <div className="habits-section">
            <div className="section-header">
              <h2 className="section-title">Daily Habits</h2>
              <button 
                className="add-habit-btn" 
                onClick={(e) => { 
                  e.preventDefault();
                  e.stopPropagation(); 
                  setShowHabitModal(true); 
                }}
              >
                Add Habit
              </button>
            </div>
            <div className="habits-grid">
              {healthData?.habits?.map(habit => (
                <div key={habit?.id} className={`habit-item ${habit?.completed ? 'completed' : ''}`}>
                  <span className="habit-checkbox" onClick={() => toggleHabit(habit?.id)}>
                    {habit?.completed ? '✓' : '○'}
                  </span>
                  <span className="habit-name">{habit?.name || ''}</span>
                  <span 
                    className="remove-habit" 
                    onClick={(e) => removeHabit(habit?.id, e)}
                  >
                    ✕
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Stats Row */}
          <div className="stats-row">
            <div className="stats-card">
              <h2 className="section-title">Weekly Stats</h2>
              <div className="stats-list">
                <div className="stat-item">
                  <span className="stat-label">Workouts:</span>
                  <span className={`stat-value ${healthData.weeklyStats.workouts.completed === healthData.weeklyStats.workouts.total && healthData.weeklyStats.workouts.total > 0 ? 'complete' : ''}`}>
                    {healthData.weeklyStats.workouts.completed}/{healthData.weeklyStats.workouts.total}
                  </span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Avg Sleep:</span>
                  <span className="stat-value">{healthData?.weeklyStats?.avgSleep || '0h 0m'}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Water consistency:</span>
                  <span className="stat-value">{healthData?.weeklyStats?.waterConsistency || 0}%</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Most missed:</span>
                  <span className="stat-value highlight">{healthData?.weeklyStats?.mostMissedHabit || 'None'}</span>
                </div>
              </div>
            </div>

            {/* Weight Tracker Card - Enhanced with comparison */}
            <div className="stats-card weight-card">
              <div className="weight-header">
                <h2 className="section-title">WEIGHT TRACKER</h2>
                <label className="toggle-switch">
                  <input 
                    type="checkbox" 
                    checked={healthData?.weightTracker?.enabled || false} 
                    onChange={toggleWeightTracker} 
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>
              {healthData?.weightTracker?.enabled ? (
                <div className="weight-stats">
                  <div className="weight-item">
                    <span className="weight-label">Gender:</span>
                    <span className="weight-value">
                      <select 
                        className="gender-select" 
                        value={healthData?.weightTracker?.gender || 'male'} 
                        onChange={(e) => updateGender(e.target.value)}
                      >
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                      </select>
                    </span>
                  </div>
                  <div className="weight-item">
                    <span className="weight-label">Current Weight:</span>
                    <span className="weight-value">{healthData?.weightTracker?.weight || 0} {healthData?.weightTracker?.unit || 'lbs'}</span>
                  </div>
                  
                  {/* Weight Change Display */}
                  {healthData.weightTracker.history && healthData.weightTracker.history.length > 0 && (
                    <div className="weight-change-container">
                      <div className={`weight-change-badge ${weightChange.trend}`}>
                        {weightChange.trend === 'lost' && '📉'}
                        {weightChange.trend === 'gained' && '📈'}
                        {weightChange.trend === 'stable' && '⚖️'}
                        <span>
                          {weightChange.trend === 'lost' && `Lost ${weightChange.change} ${healthData.weightTracker.unit} (${weightChange.percentage}%)`}
                          {weightChange.trend === 'gained' && `Gained ${weightChange.change} ${healthData.weightTracker.unit} (${weightChange.percentage}%)`}
                          {weightChange.trend === 'stable' && 'Weight stable'}
                        </span>
                      </div>
                      
                      {/* Quick Stats */}
                      <div className="weight-history-stats">
                        {weightChange.firstWeight && (
                          <div className="weight-stat">
                            <small>First: {weightChange.firstWeight.weight} {weightChange.firstWeight.unit}</small>
                          </div>
                        )}
                        {weightChange.lastWeight && (
                          <div className="weight-stat">
                            <small>Latest: {weightChange.lastWeight.weight} {weightChange.lastWeight.unit}</small>
                          </div>
                        )}
                        <div className="weight-stat">
                          <small>Entries: {healthData.weightTracker.history.length}</small>
                        </div>
                      </div>
                      
                      {/* View History Button */}
                      <button 
                        className="view-history-btn"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setShowWeightHistoryModal(true);
                        }}
                      >
                        View History
                      </button>
                    </div>
                  )}
                  
                  <div className="weight-item toggle-item">
                    <span className="weight-label">Use weight for water:</span>
                    <label className="toggle-switch small">
                      <input 
                        type="checkbox" 
                        checked={healthData?.waterIntake?.useWeightCalculation || false} 
                        onChange={toggleWeightBasedWater} 
                      />
                      <span className="toggle-slider small"></span>
                    </label>
                  </div>
                  {healthData?.waterIntake?.useWeightCalculation && (
                    <div className="water-calculation-info">
                      <small>Water goal: {healthData?.waterIntake?.goal?.toFixed(1) || '0'}L/day</small>
                    </div>
                  )}
                  <button 
                    className="edit-weight-btn" 
                    onClick={(e) => { 
                      e.preventDefault();
                      e.stopPropagation(); 
                      setShowWeightModal(true); 
                    }}
                  >
                    Update Weight
                  </button>
                </div>
              ) : (
                <div className="weight-disabled">
                  <p>Weight tracking disabled</p>
                  <button 
                    className="enable-btn" 
                    onClick={toggleWeightTracker}
                  >
                    Enable
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Monthly Progress - Without toggle buttons */}
          <div className="comparison-section">
            <h2 className="section-title">Monthly Progress</h2>

            <div className="comparison-grid">
              {/* Current Month Stats */}
              <div className="comparison-card expanded">
                <h3 className="comparison-title">This Month</h3>
                <div className="comparison-stats">
                  <div className="comparison-stat-item">
                    <span className="comparison-stat-label">Workouts:</span>
                    <span className={`comparison-stat-value ${current.workouts.completed === current.workouts.total && current.workouts.total > 0 ? 'complete' : ''}`}>
                      {current.workouts.completed}/{current.workouts.total}
                    </span>
                  </div>
                  <div className="comparison-stat-item">
                    <span className="comparison-stat-label">Avg Sleep:</span>
                    <span className="comparison-stat-value">{current.avgSleep}</span>
                  </div>
                  <div className="comparison-stat-item">
                    <span className="comparison-stat-label">Water Consistency:</span>
                    <span className="comparison-stat-value">{current.waterConsistency}%</span>
                  </div>
                  <div className="comparison-stat-item">
                    <span className="comparison-stat-label">Most Missed:</span>
                    <span className="comparison-stat-value highlight">{current.mostMissedHabit}</span>
                  </div>
                </div>
              </div>

              {/* Previous Month Stats */}
              <div className="comparison-card expanded">
                <h3 className="comparison-title">Last Month</h3>
                <div className="comparison-stats">
                  <div className="comparison-stat-item">
                    <span className="comparison-stat-label">Workouts:</span>
                    <span className={`comparison-stat-value ${previous.workouts.completed === previous.workouts.total && previous.workouts.total > 0 ? 'complete' : ''}`}>
                      {previous.workouts.completed}/{previous.workouts.total}
                    </span>
                  </div>
                  <div className="comparison-stat-item">
                    <span className="comparison-stat-label">Avg Sleep:</span>
                    <span className="comparison-stat-value">{previous.avgSleep}</span>
                  </div>
                  <div className="comparison-stat-item">
                    <span className="comparison-stat-label">Water Consistency:</span>
                    <span className="comparison-stat-value">{previous.waterConsistency}%</span>
                  </div>
                  <div className="comparison-stat-item">
                    <span className="comparison-stat-label">Most Missed:</span>
                    <span className="comparison-stat-value highlight">{previous.mostMissedHabit}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Improvement Tips */}
            {improvementTips.length > 0 && (
              <div className="improvement-section">
                <h3 className="improvement-title">Tips to Improve</h3>
                <div className="improvement-list">
                  {improvementTips.map((tip, index) => (
                    <div key={index} className={`improvement-item ${tip.category}`}>
                      <span className="improvement-bullet">•</span>
                      <span className="improvement-text">{tip.tip}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Progress Summary */}
            <div className="progress-summary">
              <h3 className="summary-title">Progress Summary</h3>
              <div className="summary-grid">
                <div className="summary-item">
                  <span className="summary-label">Workout Trend:</span>
                  <span className={`summary-value ${
                    current.workouts.completed > previous.workouts.completed ? 'positive' :
                    current.workouts.completed < previous.workouts.completed ? 'negative' : 'neutral'
                  }`}>
                    {current.workouts.completed > previous.workouts.completed ? '↑ Improving' :
                     current.workouts.completed < previous.workouts.completed ? '↓ Declining' :
                     '→ Stable'}
                  </span>
                </div>
                <div className="summary-item">
                  <span className="summary-label">Sleep Trend:</span>
                  <span className={`summary-value ${
                    current.sleepTotal > previous.sleepTotal ? 'positive' :
                    current.sleepTotal < previous.sleepTotal ? 'negative' : 'neutral'
                  }`}>
                    {current.sleepTotal > previous.sleepTotal ? '↑ Improving' :
                     current.sleepTotal < previous.sleepTotal ? '↓ Declining' :
                     '→ Stable'}
                  </span>
                </div>
                <div className="summary-item">
                  <span className="summary-label">Water Trend:</span>
                  <span className={`summary-value ${
                    current.waterConsistency > previous.waterConsistency ? 'positive' :
                    current.waterConsistency < previous.waterConsistency ? 'negative' : 'neutral'
                  }`}>
                    {current.waterConsistency > previous.waterConsistency ? '↑ Improving' :
                     current.waterConsistency < previous.waterConsistency ? '↓ Declining' :
                     '→ Stable'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Weight History Modal */}
      {showWeightHistoryModal && (
        <div className="modal-overlay" onClick={() => setShowWeightHistoryModal(false)}>
          <div className="modal-content history-modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">weight history |</h3>
            <div className="modal-body">
              {healthData?.weightTracker?.history?.length > 0 ? (
                <>
                  {healthData.weightTracker.history
                    .sort((a, b) => new Date(b.date) - new Date(a.date))
                    .map((entry, index) => (
                      <div key={index} className="weight-history-item">
                        <div className="weight-history-info">
                          <span className="weight-date">{entry.date}</span>
                          <span className="weight-value">{entry.weight} {entry.unit}</span>
                        </div>
                      </div>
                    ))}
                </>
              ) : (
                <div className="empty-history"><p>No weight entries yet</p></div>
              )}
            </div>
            <div className="modal-footer">
              <button 
                className="modal-btn exit-btn" 
                onClick={() => setShowWeightHistoryModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Water Modal */}
      {showWaterModal && (
        <div className="modal-overlay" onClick={() => setShowWaterModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">add water |</h3>
            <form onSubmit={handleWaterSubmit}>
              <div className="modal-body">
                <input 
                  type="number" 
                  className="water-input" 
                  placeholder="Amount" 
                  value={waterInput.amount} 
                  onChange={(e) => setWaterInput({...waterInput, amount: e.target.value})} 
                  autoFocus 
                  required
                />
                <div className="water-unit-group">
                  {['ml', 'L'].map(unit => (
                    <label key={unit} className={`unit-option ${waterInput.unit === unit ? 'selected' : ''}`}>
                      <input 
                        type="radio" 
                        name="unit" 
                        value={unit} 
                        checked={waterInput.unit === unit} 
                        onChange={() => setWaterInput({...waterInput, unit})} 
                      />
                      <span>{unit}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="modal-footer">
                <button 
                  type="button"
                  className="modal-btn exit-btn" 
                  onClick={() => setShowWaterModal(false)}
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="modal-btn add-btn" 
                  disabled={!waterInput.amount}
                >
                  Add
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Sleep Modal */}
      {showSleepModal && (
        <div className="modal-overlay" onClick={() => setShowSleepModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">log sleep |</h3>
            <form onSubmit={handleSleepSubmit}>
              <div className="modal-body">
                <div className="sleep-input-group">
                  <label>Bed Time</label>
                  <input 
                    type="time" 
                    className="sleep-input" 
                    value={sleepInput.bedTime} 
                    onChange={(e) => setSleepInput({...sleepInput, bedTime: e.target.value})} 
                    required
                  />
                </div>
                <div className="sleep-input-group">
                  <label>Wake Time</label>
                  <input 
                    type="time" 
                    className="sleep-input" 
                    value={sleepInput.wakeTime} 
                    onChange={(e) => setSleepInput({...sleepInput, wakeTime: e.target.value})} 
                    required
                  />
                </div>
                {sleepInput.bedTime && sleepInput.wakeTime && (
                  <div className="sleep-preview">
                    <p>This session:</p>
                    <p className="preview-value">
                      {calculateSleepDuration(sleepInput.bedTime, sleepInput.wakeTime).hours}h {' '}
                      {calculateSleepDuration(sleepInput.bedTime, sleepInput.wakeTime).minutes}m
                    </p>
                  </div>
                )}
                <div className="sleep-info-text">
                  <p>Total today: {healthData.sleep.totalHours}h {healthData.sleep.totalMinutes}m</p>
                  <p>Optimal range: 7-9 hours</p>
                </div>
              </div>
              <div className="modal-footer">
                <button 
                  type="button"
                  className="modal-btn exit-btn" 
                  onClick={() => setShowSleepModal(false)}
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="modal-btn add-btn" 
                  disabled={!sleepInput.bedTime || !sleepInput.wakeTime}
                >
                  Add Session
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Sleep History Modal */}
      {showSleepHistoryModal && (
        <div className="modal-overlay" onClick={() => setShowSleepHistoryModal(false)}>
          <div className="modal-content history-modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">sleep sessions |</h3>
            <div className="modal-body">
              {healthData?.sleep?.sessions?.length > 0 ? (
                <>
                  {healthData.sleep.sessions.map((session, i) => (
                    <div key={session?.id} className="sleep-history-item">
                      <div className="sleep-history-info">
                        <span className="session-number">Session {i + 1}</span>
                        <span className="session-time">{session?.bedTime || ''} → {session?.wakeTime || ''}</span>
                        <span className="session-duration">{session?.hours || 0}h {session?.minutes || 0}m</span>
                      </div>
                      <button 
                        className="remove-session-btn" 
                        onClick={(e) => removeSleepSession(session?.id, e)}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  <div className="sleep-total">
                    <strong>Total:</strong> {healthData.sleep.totalHours || 0}h {healthData.sleep.totalMinutes || 0}m
                  </div>
                  <div className="sleep-status" style={{ color: sleepStatus.color }}>
                    <strong>Status:</strong> {sleepStatus.message}
                  </div>
                </>
              ) : (
                <div className="empty-history"><p>No sleep sessions logged today</p></div>
              )}
            </div>
            <div className="modal-footer">
              <button 
                className="modal-btn exit-btn" 
                onClick={() => setShowSleepHistoryModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Workout Modal - Add */}
      {showWorkoutModal && (
        <div className="modal-overlay" onClick={() => setShowWorkoutModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">add workout |</h3>
            <form onSubmit={handleAddWorkout}>
              <div className="modal-body">
                <div className="workout-input-group">
                  <label>Day</label>
                  <select 
                    className="workout-select"
                    value={workoutInput.day}
                    onChange={(e) => setWorkoutInput({...workoutInput, day: e.target.value})}
                  >
                    {daysOfWeek.map(day => (
                      <option key={day} value={day}>{day}</option>
                    ))}
                  </select>
                </div>
                
                <div className="workout-input-group">
                  <label>Exercise Name</label>
                  <input 
                    type="text" 
                    className="workout-input" 
                    placeholder="e.g., Push-ups, Squats, Pull-ups" 
                    value={workoutInput.exerciseName} 
                    onChange={(e) => setWorkoutInput({...workoutInput, exerciseName: e.target.value})} 
                    required
                  />
                </div>
                
                <div className="workout-row">
                  <div className="workout-input-group half">
                    <label>Sets</label>
                    <input 
                      type="number" 
                      className="workout-input" 
                      value={workoutInput.sets} 
                      onChange={(e) => setWorkoutInput({...workoutInput, sets: parseInt(e.target.value) || 1})} 
                      min="1"
                      max="10"
                      required
                    />
                  </div>
                  
                  <div className="workout-input-group half">
                    <label>Reps</label>
                    <input 
                      type="number" 
                      className="workout-input" 
                      value={workoutInput.reps} 
                      onChange={(e) => setWorkoutInput({...workoutInput, reps: parseInt(e.target.value) || 1})} 
                      min="1"
                      max="100"
                      required
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button 
                  type="button"
                  className="modal-btn exit-btn" 
                  onClick={() => setShowWorkoutModal(false)}
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="modal-btn add-btn" 
                  disabled={!workoutInput.exerciseName.trim()}
                >
                  Add Exercise
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Workout Modal */}
      {showEditWorkoutModal && (
        <div className="modal-overlay" onClick={() => setShowEditWorkoutModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">edit workout |</h3>
            <form onSubmit={handleUpdateWorkout}>
              <div className="modal-body">
                <div className="workout-input-group">
                  <label>Day</label>
                  <select 
                    className="workout-select"
                    value={workoutInput.day}
                    onChange={(e) => setWorkoutInput({...workoutInput, day: e.target.value})}
                  >
                    {daysOfWeek.map(day => (
                      <option key={day} value={day}>{day}</option>
                    ))}
                  </select>
                </div>
                
                <div className="workout-input-group">
                  <label>Exercise Name</label>
                  <input 
                    type="text" 
                    className="workout-input" 
                    value={workoutInput.exerciseName} 
                    onChange={(e) => setWorkoutInput({...workoutInput, exerciseName: e.target.value})} 
                    required
                  />
                </div>
                
                <div className="workout-row">
                  <div className="workout-input-group half">
                    <label>Sets</label>
                    <input 
                      type="number" 
                      className="workout-input" 
                      value={workoutInput.sets} 
                      onChange={(e) => setWorkoutInput({...workoutInput, sets: parseInt(e.target.value) || 1})} 
                      min="1"
                      max="10"
                      required
                    />
                  </div>
                  
                  <div className="workout-input-group half">
                    <label>Reps</label>
                    <input 
                      type="number" 
                      className="workout-input" 
                      value={workoutInput.reps} 
                      onChange={(e) => setWorkoutInput({...workoutInput, reps: parseInt(e.target.value) || 1})} 
                      min="1"
                      max="100"
                      required
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button 
                  type="button"
                  className="modal-btn exit-btn" 
                  onClick={() => setShowEditWorkoutModal(false)}
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="modal-btn add-btn" 
                  disabled={!workoutInput.exerciseName.trim()}
                >
                  Update Exercise
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Habit Modal */}
      {showHabitModal && (
        <div className="modal-overlay" onClick={() => setShowHabitModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">add habit |</h3>
            <form onSubmit={handleAddHabit}>
              <div className="modal-body">
                <input 
                  type="text" 
                  className="habit-input" 
                  placeholder="Habit name" 
                  value={newHabit} 
                  onChange={(e) => setNewHabit(e.target.value)} 
                  autoFocus 
                  required
                />
              </div>
              <div className="modal-footer">
                <button 
                  type="button"
                  className="modal-btn exit-btn" 
                  onClick={() => setShowHabitModal(false)}
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="modal-btn add-btn" 
                  disabled={!newHabit.trim()}
                >
                  Add
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Weight Modal */}
      {showWeightModal && (
        <div className="modal-overlay" onClick={() => setShowWeightModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">update weight |</h3>
            <form onSubmit={handleUpdateWeight}>
              <div className="modal-body">
                <div className="weight-input-with-unit">
                  <input 
                    type="number" 
                    step="0.1"
                    value={weightForm.weight} 
                    onChange={(e) => setWeightForm({...weightForm, weight: e.target.value})} 
                    placeholder="Weight" 
                    required
                  />
                  <select 
                    value={weightForm.unit} 
                    onChange={(e) => setWeightForm({...weightForm, unit: e.target.value})}
                  >
                    <option value="lbs">lbs</option>
                    <option value="kg">kg</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button 
                  type="button"
                  className="modal-btn exit-btn" 
                  onClick={() => setShowWeightModal(false)}
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="modal-btn add-btn"
                >
                  Update
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default HealthFitness;