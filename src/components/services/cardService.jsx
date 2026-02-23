import { db, doc, getDoc, setDoc, updateDoc, CARD_IDS } from '../../firebase';

// Helper to get the correct document reference for a card
const getCardRef = (userId, cardId) => {
  return doc(db, 'users', userId, 'cards', cardId);
};

// Save data for a specific card
export const saveCardData = async (userId, cardId, data) => {
  try {
    const cardRef = getCardRef(userId, cardId);
    await setDoc(cardRef, {
      ...data,
      updatedAt: new Date().toISOString()
    }, { merge: true });
    return { success: true };
  } catch (error) {
    console.error(`Error saving card ${cardId}:`, error);
    return { success: false, error };
  }
};

// Load data for a specific card
export const loadCardData = async (userId, cardId) => {
  try {
    const cardRef = getCardRef(userId, cardId);
    const cardSnap = await getDoc(cardRef);
    
    if (cardSnap.exists()) {
      return { success: true, data: cardSnap.data() };
    } else {
      // Return default data based on card type
      const defaultData = getDefaultDataForCard(cardId);
      return { success: true, data: defaultData };
    }
  } catch (error) {
    console.error(`Error loading card ${cardId}:`, error);
    return { success: false, error };
  }
};

// Update specific fields for a card
export const updateCardData = async (userId, cardId, updates) => {
  try {
    const cardRef = getCardRef(userId, cardId);
    await updateDoc(cardRef, {
      ...updates,
      updatedAt: new Date().toISOString()
    });
    return { success: true };
  } catch (error) {
    console.error(`Error updating card ${cardId}:`, error);
    return { success: false, error };
  }
};

// Get default data structure for each card type
const getDefaultDataForCard = (cardId) => {
  switch(cardId) {
    // Login Page Cards
    case CARD_IDS.LOGIN_NAME:
      return { name: '' };
    case CARD_IDS.LOGIN_SURNAME:
      return { surname: '' };
    case CARD_IDS.LOGIN_EMAIL:
      return { email: '' };

    // Dashboard Cards
    case CARD_IDS.DASHBOARD_FINANCE:
      return {
        monthlyBudget: 0,
        spent: 0,
        percentageUsed: 0,
        remaining: 0,
        isOverBudget: false
      };
    case CARD_IDS.DASHBOARD_IMMEDIATE_FOCUS:
      return { items: [] };
    case CARD_IDS.DASHBOARD_TASKS:
      return {
        totalTasks: 0,
        completedTasks: 0,
        pendingTasks: 0,
        completionPercentage: 0
      };
    case CARD_IDS.DASHBOARD_SYSTEM_ALERTS:
      return { alerts: [] };

    // Activity Tracking Cards
    case CARD_IDS.ACTIVITY_TODO:
      return { todos: [] };
    case CARD_IDS.ACTIVITY_DAILY:
      return {
        name: '',
        startTime: '',
        endTime: '',
        isActive: false
      };
    case CARD_IDS.ACTIVITY_TASKS:
      return { tasks: [] };

    // Financial Tracking Cards - Each category
    case CARD_IDS.FINANCIAL_FOOD:
    case CARD_IDS.FINANCIAL_ENTERTAINMENT:
    case CARD_IDS.FINANCIAL_TRANSPORT:
    case CARD_IDS.FINANCIAL_HOME:
    case CARD_IDS.FINANCIAL_SHOPPING:
    case CARD_IDS.FINANCIAL_HEALTHCARE:
    case CARD_IDS.FINANCIAL_EDUCATION:
    case CARD_IDS.FINANCIAL_UTILITIES:
    case CARD_IDS.FINANCIAL_OTHER:
      return { items: [], total: 0 };
      
    case CARD_IDS.FINANCIAL_OVERALL:
      return {
        overallSpending: 0,
        monthlyData: {
          Jan: 0, Feb: 0, Mar: 0, Apr: 0, May: 0,
          Jun: 0, Jul: 0, Aug: 0, Sep: 0, Oct: 0, Nov: 0, Dec: 0
        }
      };
    case CARD_IDS.FINANCIAL_PERSONAL:
      return {
        streak: 0,
        longestStreak: 0,
        totalCompleted: 0
      };
    case CARD_IDS.FINANCIAL_SAVINGS:
      return { items: [], total: 0 };

    default:
      return {};
  }
};