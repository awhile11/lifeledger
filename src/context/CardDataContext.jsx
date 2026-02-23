import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth } from '../firebase';
import { loadCardData, saveCardData, updateCardData } from '../components/services/cardService';

const CardDataContext = createContext();

export const useCardData = () => {
  const context = useContext(CardDataContext);
  if (!context) {
    throw new Error('useCardData must be used within a CardDataProvider');
  }
  return context;
};

export const CardDataProvider = ({ children }) => {
  const [cardData, setCardData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load all card data when user logs in
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        try {
          setLoading(true);
          // We'll load data on-demand instead of all at once
          setLoading(false);
        } catch (err) {
          console.error('Error in auth state change:', err);
          setError(err);
          setLoading(false);
        }
      } else {
        setCardData({});
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // Load data for a specific card
  const loadCard = async (cardId) => {
    if (!auth.currentUser) return { success: false, error: 'No user logged in' };
    
    try {
      const result = await loadCardData(auth.currentUser.uid, cardId);
      if (result.success) {
        setCardData(prev => ({
          ...prev,
          [cardId]: result.data
        }));
      }
      return result;
    } catch (err) {
      console.error(`Error loading card ${cardId}:`, err);
      return { success: false, error: err };
    }
  };

  // Save data for a specific card
  const saveCard = async (cardId, data) => {
    if (!auth.currentUser) return { success: false, error: 'No user logged in' };
    
    try {
      const result = await saveCardData(auth.currentUser.uid, cardId, data);
      if (result.success) {
        setCardData(prev => ({
          ...prev,
          [cardId]: data
        }));
      }
      return result;
    } catch (err) {
      console.error(`Error saving card ${cardId}:`, err);
      return { success: false, error: err };
    }
  };

  // Update specific fields for a card
  const updateCard = async (cardId, updates) => {
    if (!auth.currentUser) return { success: false, error: 'No user logged in' };
    
    try {
      const result = await updateCardData(auth.currentUser.uid, cardId, updates);
      if (result.success) {
        setCardData(prev => ({
          ...prev,
          [cardId]: {
            ...prev[cardId],
            ...updates
          }
        }));
      }
      return result;
    } catch (err) {
      console.error(`Error updating card ${cardId}:`, err);
      return { success: false, error: err };
    }
  };

  // Get data for a specific card
  const getCardData = (cardId) => {
    return cardData[cardId] || null;
  };

  const value = {
    cardData,
    loading,
    error,
    loadCard,
    saveCard,
    updateCard,
    getCardData
  };

  return (
    <CardDataContext.Provider value={value}>
      {children}
    </CardDataContext.Provider>
  );
};