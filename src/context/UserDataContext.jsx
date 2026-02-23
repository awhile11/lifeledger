import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth } from '../firebase';
import { loadUserData, saveUserData } from '../components/services/dataService';

const UserDataContext = createContext();

export const useUserData = () => {
  const context = useContext(UserDataContext);
  if (!context) {
    throw new Error('useUserData must be used within a UserDataProvider');
  }
  return context;
};

export const UserDataProvider = ({ children }) => {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        try {
          setLoading(true);
          console.log('Loading data for user:', user.uid);
          const result = await loadUserData(user.uid);
          if (result.success) {
            console.log('Data loaded:', result.data);
            setUserData(result.data);
          } else {
            setError(result.error);
          }
        } catch (err) {
          console.error('Error in auth state change:', err);
          setError(err);
        } finally {
          setLoading(false);
        }
      } else {
        setUserData(null);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const updateData = async (updates) => {
    if (!auth.currentUser) return { success: false, error: 'No user logged in' };
    
    try {
      const result = await saveUserData(auth.currentUser.uid, updates);
      if (result.success) {
        setUserData(prev => ({ ...prev, ...updates }));
      }
      return result;
    } catch (err) {
      console.error('Error updating data:', err);
      return { success: false, error: err };
    }
  };

  const value = {
    userData,
    loading,
    error,
    updateData,
    refreshData: async () => {
      if (auth.currentUser) {
        const result = await loadUserData(auth.currentUser.uid);
        if (result.success) {
          setUserData(result.data);
        }
      }
    }
  };

  return (
    <UserDataContext.Provider value={value}>
      {children}
    </UserDataContext.Provider>
  );
};