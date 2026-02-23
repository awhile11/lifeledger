import { db, doc, setDoc, getDoc, updateDoc } from '../../firebase';

// User Data Structure
const defaultUserData = {
  todos: [],
  tasks: [],
  dailyActivity: {
    name: '',
    startTime: '',
    endTime: '',
    isActive: false
  },
  financialData: {
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
  },
  monthlyBudget: 0,
  workData: {
    completed: 0,
    total: 20,
    remaining: 20
  },
  personalData: {
    streak: 0,
    longestStreak: 0,
    totalCompleted: 0
  },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};

// Save user data to Firestore
export const saveUserData = async (userId, data) => {
  try {
    const userRef = doc(db, 'users', userId);
    await setDoc(userRef, {
      ...data,
      updatedAt: new Date().toISOString()
    }, { merge: true });
    return { success: true };
  } catch (error) {
    console.error('Error saving user data:', error);
    return { success: false, error };
  }
};

// Load user data from Firestore
export const loadUserData = async (userId) => {
  try {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      return { success: true, data: userSnap.data() };
    } else {
      // Create default data for new user
      await setDoc(userRef, defaultUserData);
      return { success: true, data: defaultUserData };
    }
  } catch (error) {
    console.error('Error loading user data:', error);
    return { success: false, error };
  }
};

// Update specific user data
export const updateUserData = async (userId, updates) => {
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      ...updates,
      updatedAt: new Date().toISOString()
    });
    return { success: true };
  } catch (error) {
    console.error('Error updating user data:', error);
    return { success: false, error };
  }
};