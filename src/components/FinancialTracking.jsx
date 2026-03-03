import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, signOut } from '../firebase';
import './FinancialTracking.css';

function FinancialTracking() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('financial');
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const date = new Date();
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return months[date.getMonth()];
  });
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showSavingsModal, setShowSavingsModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [showResetConfirmModal, setShowResetConfirmModal] = useState(false);
  
  const navigate = useNavigate();

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const days = Array.from({ length: 31 }, (_, i) => (i + 1).toString());

  // Categories for expenses
  const categories = [
    { id: 1, name: 'Food' },
    { id: 2, name: 'Transport' },
    { id: 3, name: 'Entertainment' },
    { id: 4, name: 'Home' },
    { id: 5, name: 'Shopping' },
    { id: 6, name: 'Healthcare' },
    { id: 7, name: 'Education' },
    { id: 8, name: 'Utilities' },
    { id: 9, name: 'Other' }
  ];

  // State for new expense
  const [newExpense, setNewExpense] = useState({
    category: '',
    name: '',
    cost: ''
  });

  // State for new savings
  const [newSavings, setNewSavings] = useState({
    day: '1',
    month: 'Jan',
    amount: ''
  });

  // Helper function to get user-specific localStorage key
  const getUserKey = (userId, key) => {
    return `user_${userId}_${key}`;
  };

  // Initialize empty expenses data with monthly tracking
  const [expensesData, setExpensesData] = useState(() => {
    // Get current month and year for expiration tracking
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    return {
      savings: {
        items: [],
        total: 0,
        history: [] // Permanent savings history
      },
      monthlyExpenses: {
        // Each month's data will be stored under a key like "Jan-2024"
      },
      lastReset: {
        month: currentMonth,
        year: currentYear
      },
      overallSpending: 0
    };
  });

  // Load user-specific data when user changes
  useEffect(() => {
    if (user) {
      const financeKey = getUserKey(user.uid, 'financialData');
      const savedData = localStorage.getItem(financeKey);
      
      if (savedData) {
        const parsed = JSON.parse(savedData);
        
        // Check if we need to reset expenses for the new month
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        
        if (parsed.lastReset) {
          // If it's a new month, reset expenses but keep savings
          if (parsed.lastReset.month !== currentMonth || parsed.lastReset.year !== currentYear) {
            // Archive old month's data before resetting
            const lastMonthKey = `${months[parsed.lastReset.month]}-${parsed.lastReset.year}`;
            const archivedData = {};
            
            // Archive all category data from the previous month
            categories.forEach(cat => {
              const categoryKey = cat.name.toLowerCase();
              if (parsed[categoryKey]) {
                archivedData[categoryKey] = parsed[categoryKey];
              }
            });
            
            // Save archived data to monthlyExpenses
            const updatedData = {
              ...parsed,
              monthlyExpenses: {
                ...parsed.monthlyExpenses,
                [lastMonthKey]: archivedData
              },
              // Reset all category data
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
              },
              lastReset: {
                month: currentMonth,
                year: currentYear
              }
            };
            
            setExpensesData(updatedData);
          } else {
            setExpensesData(parsed);
          }
        } else {
          setExpensesData(parsed);
        }
      }
    }
  }, [user]);

  // Save to user-specific localStorage whenever data changes
  useEffect(() => {
    if (user) {
      const financeKey = getUserKey(user.uid, 'financialData');
      localStorage.setItem(financeKey, JSON.stringify(expensesData));
    }
  }, [expensesData, user]);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        setUser(user);
      } else {
        navigate('/login');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [navigate]);

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

  const openExpenseModal = (category) => {
    setSelectedCategory(category);
    setNewExpense({
      category: category.name,
      name: '',
      cost: ''
    });
    setShowExpenseModal(true);
  };

  const closeExpenseModal = () => {
    setShowExpenseModal(false);
    setSelectedCategory(null);
    setNewExpense({
      category: '',
      name: '',
      cost: ''
    });
  };

  const openSavingsModal = () => {
    setNewSavings({
      day: '1',
      month: selectedMonth,
      amount: ''
    });
    setShowSavingsModal(true);
  };

  const closeSavingsModal = () => {
    setShowSavingsModal(false);
  };

  const handleExpenseChange = (e) => {
    const { name, value } = e.target;
    setNewExpense(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSavingsChange = (e) => {
    const { name, value } = e.target;
    setNewSavings(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Function to remove an expense
  const removeExpense = (categoryName, itemId, e) => {
    e.stopPropagation();
    const categoryKey = categoryName.toLowerCase();
    
    setExpensesData(prev => {
      // Get the category data
      const categoryData = prev[categoryKey];
      if (!categoryData) return prev;

      // Find the item to remove
      const itemToRemove = categoryData.items.find(item => item.id === itemId);
      if (!itemToRemove) return prev;

      // Filter out the item
      const updatedItems = categoryData.items.filter(item => item.id !== itemId);
      
      // Calculate new category total
      const newCategoryTotal = categoryData.total - itemToRemove.amount;

      // Update overall spending
      const newOverallSpending = prev.overallSpending - itemToRemove.amount;

      // Update monthly data
      const itemMonth = itemToRemove.month || selectedMonth;
      const newMonthlyTotal = (prev.monthlyData?.[itemMonth] || 0) - itemToRemove.amount;

      return {
        ...prev,
        [categoryKey]: {
          items: updatedItems,
          total: newCategoryTotal
        },
        overallSpending: newOverallSpending,
        monthlyData: {
          ...(prev.monthlyData || {}),
          [itemMonth]: newMonthlyTotal
        }
      };
    });
  };

  const handleAddExpense = () => {
    if (newExpense.name && newExpense.cost) {
      const cost = parseFloat(newExpense.cost);
      const categoryKey = newExpense.category.toLowerCase();
      
      setExpensesData(prev => {
        // Get existing items for the category
        const existingItems = prev[categoryKey]?.items || [];
        
        // Add new item with unique ID and timestamp
        const newItem = { 
          id: Date.now(), 
          name: newExpense.name, 
          amount: cost, 
          month: selectedMonth,
          timestamp: new Date().toISOString()
        };
        
        const updatedItems = [...existingItems, newItem];

        // Calculate new category total
        const newCategoryTotal = (prev[categoryKey]?.total || 0) + cost;

        // Calculate new overall spending
        const newOverallSpending = prev.overallSpending + cost;

        // Update monthly data for selected month
        const newMonthlyTotal = (prev.monthlyData?.[selectedMonth] || 0) + cost;

        return {
          ...prev,
          [categoryKey]: {
            items: updatedItems,
            total: newCategoryTotal
          },
          overallSpending: newOverallSpending,
          monthlyData: {
            ...(prev.monthlyData || {}),
            [selectedMonth]: newMonthlyTotal
          }
        };
      });

      closeExpenseModal();
    }
  };

  const handleAddSavings = () => {
    if (newSavings.amount) {
      const amount = parseFloat(newSavings.amount);
      const date = `${newSavings.month} ${newSavings.day}`;
      const currentYear = new Date().getFullYear();
      
      setExpensesData(prev => {
        // Add new savings item with unique ID and permanent storage
        const newItem = { 
          id: Date.now(), 
          name: date, 
          amount: amount, 
          month: newSavings.month,
          year: currentYear,
          timestamp: new Date().toISOString()
        };
        
        const updatedItems = [...(prev.savings?.items || []), newItem];

        // Calculate new savings total
        const newSavingsTotal = (prev.savings?.total || 0) + amount;

        // Add to permanent history
        const updatedHistory = [...(prev.savings?.history || []), {
          id: Date.now(),
          date,
          amount,
          month: newSavings.month,
          year: currentYear,
          timestamp: new Date().toISOString()
        }];

        return {
          ...prev,
          savings: {
            items: updatedItems,
            total: newSavingsTotal,
            history: updatedHistory
          }
        };
      });

      closeSavingsModal();
    }
  };

  // Function to remove a savings entry
  const removeSavings = (itemId, e) => {
    e.stopPropagation();
    
    setExpensesData(prev => {
      // Find the item to remove
      const itemToRemove = prev.savings?.items.find(item => item.id === itemId);
      if (!itemToRemove) return prev;

      // Filter out the item from current items
      const updatedItems = prev.savings.items.filter(item => item.id !== itemId);
      
      // Calculate new savings total
      const newSavingsTotal = prev.savings.total - itemToRemove.amount;

      // Remove from history as well
      const updatedHistory = prev.savings.history.filter(item => item.id !== itemId);

      return {
        ...prev,
        savings: {
          items: updatedItems,
          total: newSavingsTotal,
          history: updatedHistory
        }
      };
    });
  };

  const handleResetSavings = () => {
    setShowResetConfirmModal(true);
  };

  const confirmResetSavings = () => {
    setExpensesData(prev => ({
      ...prev,
      savings: {
        items: [],
        total: 0,
        history: prev.savings?.history || [] // Keep history for reference
      }
    }));
    setShowResetConfirmModal(false);
    closeSavingsModal();
  };

  const cancelResetSavings = () => {
    setShowResetConfirmModal(false);
  };

  // Calculate top category and item for selected month
  const getTopCategoryForMonth = () => {
    let topCategory = { name: '', total: 0, items: [] };
    
    categories.forEach(cat => {
      const catData = expensesData[cat.name.toLowerCase()];
      if (catData && catData.items) {
        // Filter items for selected month
        const monthItems = catData.items.filter(item => item.month === selectedMonth);
        const monthTotal = monthItems.reduce((sum, item) => sum + item.amount, 0);
        
        if (monthTotal > topCategory.total) {
          topCategory = { 
            name: cat.name, 
            total: monthTotal,
            items: monthItems
          };
        }
      }
    });
    
    return topCategory;
  };

  // Get top item from a category for selected month
  const getTopItemForMonth = (category) => {
    if (!category.items || category.items.length === 0) return null;
    return category.items.reduce((max, item) => 
      item.amount > max.amount ? item : max, category.items[0]
    );
  };

  // Calculate percentage change from previous month
  const getPercentageChange = () => {
    const currentIndex = months.indexOf(selectedMonth);
    const previousMonth = currentIndex > 0 ? months[currentIndex - 1] : null;
    
    if (!previousMonth) return { percentage: 0, isMore: true };
    
    const currentAmount = expensesData.monthlyData?.[selectedMonth] || 0;
    const previousAmount = expensesData.monthlyData?.[previousMonth] || 0;
    
    if (previousAmount === 0) return { percentage: 0, isMore: true };
    
    const change = ((currentAmount - previousAmount) / previousAmount) * 100;
    return {
      percentage: Math.abs(change).toFixed(1),
      isMore: change > 0
    };
  };

  // Get max monthly amount for graph scaling
  const getMaxMonthlyAmount = () => {
    const monthlyValues = Object.values(expensesData.monthlyData || {});
    return Math.max(...monthlyValues, 100); // Minimum 100 to avoid division by zero
  };

  // Get category items for display
  const getCategoryItems = (categoryName) => {
    const catData = expensesData[categoryName.toLowerCase()];
    return catData?.items || [];
  };

  // Get category total
  const getCategoryTotal = (categoryName) => {
    const catData = expensesData[categoryName.toLowerCase()];
    return catData?.total || 0;
  };

  // Get total savings for display (permanent)
  const getTotalSavings = () => {
    return expensesData.savings?.total || 0;
  };

  // Get savings items for display
  const getSavingsItems = () => {
    return expensesData.savings?.items || [];
  };

  if (loading) {
    return (
      <div className="financial-container">
        <div className="loading">Loading...</div>
      </div>
    );
  }

  const topCategory = getTopCategoryForMonth();
  const topItem = getTopItemForMonth(topCategory);
  const percentageChange = getPercentageChange();
  const maxAmount = getMaxMonthlyAmount();
  const totalSavings = getTotalSavings();
  const savingsItems = getSavingsItems();

  return (
    <div className="financial-container">
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

          <div 
            className={`menu-item ${activeTab === 'health' ? 'active' : ''}`}
            onClick={() => handleNavigation('health')}
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

      {/* Main Content */}
      <div className="financial-main-content">
        <div className="content-wrapper">
          <h1 className="page-title">MONTHLY EXPENSES</h1>

          {/* Top Row - Savings Card on Right, Expenses on Left */}
          <div className="top-row">
            {/* Expenses Grid - Left Side */}
            <div className="expenses-grid">
              {/* Food Card */}
              <div className="expense-card" onClick={() => openExpenseModal({ name: 'Food' })}>
                <h3 className="expense-card-title">Food</h3>
                <div className="expense-items">
                  {getCategoryItems('Food').map((item) => (
                    <div key={item.id} className="expense-row">
                      <span className="expense-name">- {item.name}</span>
                      <span className="expense-amount">R{item.amount}</span>
                      <span 
                        className="remove-expense" 
                        onClick={(e) => removeExpense('Food', item.id, e)}
                        title="Remove expense"
                      >
                        ✕
                      </span>
                    </div>
                  ))}
                  {getCategoryItems('Food').length === 0 && (
                    <div className="expense-empty">Click to add food expenses</div>
                  )}
                </div>
                <div className="expense-total">R{getCategoryTotal('Food')}</div>
              </div>

              {/* Entertainment Card */}
              <div className="expense-card" onClick={() => openExpenseModal({ name: 'Entertainment' })}>
                <h3 className="expense-card-title">Entertainment</h3>
                <div className="expense-items">
                  {getCategoryItems('Entertainment').map((item) => (
                    <div key={item.id} className="expense-row">
                      <span className="expense-name">- {item.name}</span>
                      <span className="expense-amount">R{item.amount}</span>
                      <span 
                        className="remove-expense" 
                        onClick={(e) => removeExpense('Entertainment', item.id, e)}
                        title="Remove expense"
                      >
                        ✕
                      </span>
                    </div>
                  ))}
                  {getCategoryItems('Entertainment').length === 0 && (
                    <div className="expense-empty">Click to add entertainment expenses</div>
                  )}
                </div>
                <div className="expense-total">R{getCategoryTotal('Entertainment')}</div>
              </div>

              {/* Transport Card */}
              <div className="expense-card" onClick={() => openExpenseModal({ name: 'Transport' })}>
                <h3 className="expense-card-title">Transport</h3>
                <div className="expense-items">
                  {getCategoryItems('Transport').map((item) => (
                    <div key={item.id} className="expense-row">
                      <span className="expense-name">- {item.name}</span>
                      <span className="expense-amount">R{item.amount}</span>
                      <span 
                        className="remove-expense" 
                        onClick={(e) => removeExpense('Transport', item.id, e)}
                        title="Remove expense"
                      >
                        ✕
                      </span>
                    </div>
                  ))}
                  {getCategoryItems('Transport').length === 0 && (
                    <div className="expense-empty">Click to add transport expenses</div>
                  )}
                </div>
                <div className="expense-total">R{getCategoryTotal('Transport')}</div>
              </div>

              {/* Home Card */}
              <div className="expense-card" onClick={() => openExpenseModal({ name: 'Home' })}>
                <h3 className="expense-card-title">Home</h3>
                <div className="expense-items">
                  {getCategoryItems('Home').map((item) => (
                    <div key={item.id} className="expense-row">
                      <span className="expense-name">- {item.name}</span>
                      <span className="expense-amount">R{item.amount}</span>
                      <span 
                        className="remove-expense" 
                        onClick={(e) => removeExpense('Home', item.id, e)}
                        title="Remove expense"
                      >
                        ✕
                      </span>
                    </div>
                  ))}
                  {getCategoryItems('Home').length === 0 && (
                    <div className="expense-empty">Click to add home expenses</div>
                  )}
                </div>
                <div className="expense-total">R{getCategoryTotal('Home')}</div>
              </div>

              {/* Shopping Card */}
              <div className="expense-card" onClick={() => openExpenseModal({ name: 'Shopping' })}>
                <h3 className="expense-card-title">Shopping</h3>
                <div className="expense-items">
                  {getCategoryItems('Shopping').map((item) => (
                    <div key={item.id} className="expense-row">
                      <span className="expense-name">- {item.name}</span>
                      <span className="expense-amount">R{item.amount}</span>
                      <span 
                        className="remove-expense" 
                        onClick={(e) => removeExpense('Shopping', item.id, e)}
                        title="Remove expense"
                      >
                        ✕
                      </span>
                    </div>
                  ))}
                  {getCategoryItems('Shopping').length === 0 && (
                    <div className="expense-empty">Click to add shopping expenses</div>
                  )}
                </div>
                <div className="expense-total">R{getCategoryTotal('Shopping')}</div>
              </div>

              {/* Healthcare Card */}
              <div className="expense-card" onClick={() => openExpenseModal({ name: 'Healthcare' })}>
                <h3 className="expense-card-title">Healthcare</h3>
                <div className="expense-items">
                  {getCategoryItems('Healthcare').map((item) => (
                    <div key={item.id} className="expense-row">
                      <span className="expense-name">- {item.name}</span>
                      <span className="expense-amount">R{item.amount}</span>
                      <span 
                        className="remove-expense" 
                        onClick={(e) => removeExpense('Healthcare', item.id, e)}
                        title="Remove expense"
                      >
                        ✕
                      </span>
                    </div>
                  ))}
                  {getCategoryItems('Healthcare').length === 0 && (
                    <div className="expense-empty">Click to add healthcare expenses</div>
                  )}
                </div>
                <div className="expense-total">R{getCategoryTotal('Healthcare')}</div>
              </div>

              {/* Education Card */}
              <div className="expense-card" onClick={() => openExpenseModal({ name: 'Education' })}>
                <h3 className="expense-card-title">Education</h3>
                <div className="expense-items">
                  {getCategoryItems('Education').map((item) => (
                    <div key={item.id} className="expense-row">
                      <span className="expense-name">- {item.name}</span>
                      <span className="expense-amount">R{item.amount}</span>
                      <span 
                        className="remove-expense" 
                        onClick={(e) => removeExpense('Education', item.id, e)}
                        title="Remove expense"
                      >
                        ✕
                      </span>
                    </div>
                  ))}
                  {getCategoryItems('Education').length === 0 && (
                    <div className="expense-empty">Click to add education expenses</div>
                  )}
                </div>
                <div className="expense-total">R{getCategoryTotal('Education')}</div>
              </div>

              {/* Utilities Card */}
              <div className="expense-card" onClick={() => openExpenseModal({ name: 'Utilities' })}>
                <h3 className="expense-card-title">Utilities</h3>
                <div className="expense-items">
                  {getCategoryItems('Utilities').map((item) => (
                    <div key={item.id} className="expense-row">
                      <span className="expense-name">- {item.name}</span>
                      <span className="expense-amount">R{item.amount}</span>
                      <span 
                        className="remove-expense" 
                        onClick={(e) => removeExpense('Utilities', item.id, e)}
                        title="Remove expense"
                      >
                        ✕
                      </span>
                    </div>
                  ))}
                  {getCategoryItems('Utilities').length === 0 && (
                    <div className="expense-empty">Click to add utilities expenses</div>
                  )}
                </div>
                <div className="expense-total">R{getCategoryTotal('Utilities')}</div>
              </div>

              {/* Other Card */}
              <div className="expense-card" onClick={() => openExpenseModal({ name: 'Other' })}>
                <h3 className="expense-card-title">Other</h3>
                <div className="expense-items">
                  {getCategoryItems('Other').map((item) => (
                    <div key={item.id} className="expense-row">
                      <span className="expense-name">- {item.name}</span>
                      <span className="expense-amount">R{item.amount}</span>
                      <span 
                        className="remove-expense" 
                        onClick={(e) => removeExpense('Other', item.id, e)}
                        title="Remove expense"
                      >
                        ✕
                      </span>
                    </div>
                  ))}
                  {getCategoryItems('Other').length === 0 && (
                    <div className="expense-empty">Click to add other expenses</div>
                  )}
                </div>
                <div className="expense-total">R{getCategoryTotal('Other')}</div>
              </div>
            </div>

            {/* Savings Card - Right Side (Permanent) */}
            <div className="savings-card" onClick={openSavingsModal}>
              <h2 className="savings-title">Savings</h2>
              <div className="savings-items">
                {savingsItems.map((item) => (
                  <div key={item.id} className="savings-item">
                    <span className="savings-item-name">- {item.name}</span>
                    <span className="savings-item-amount">R{item.amount}</span>
                    <span 
                      className="remove-savings" 
                      onClick={(e) => removeSavings(item.id, e)}
                      title="Remove savings"
                    >
                      ✕
                    </span>
                  </div>
                ))}
                {savingsItems.length === 0 && (
                  <div className="savings-empty">Click to add savings</div>
                )}
              </div>
              <div className="savings-total">R{totalSavings}</div>
            </div>
          </div>

          {/* Bottom Section - Graph and Summary */}
          <div className="bottom-section">
            {/* Overall Spending Card with Graph */}
            <div className="overall-spending-card">
              <h2 className="overall-title">Overall Spending</h2>
              <div className="overall-amount">R{expensesData.overallSpending?.toLocaleString() || 0}</div>
              
              {/* Month Graph */}
              <div className="month-graph">
                {months.map(month => {
                  const amount = expensesData.monthlyData?.[month] || 0;
                  const barHeight = amount > 0 ? (amount / maxAmount) * 150 : 4;
                  
                  return (
                    <div key={month} className="graph-bar-container">
                      <div 
                        className={`graph-bar ${selectedMonth === month ? 'active' : ''}`}
                        style={{ height: `${barHeight}px` }}
                      >
                        {amount > 0 && <span className="bar-amount">R{amount}</span>}
                      </div>
                      <button
                        className={`graph-month-btn ${selectedMonth === month ? 'active' : ''}`}
                        onClick={() => setSelectedMonth(month)}
                      >
                        {month}
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Summary Section */}
              <div className="graph-summary">
                <p className="summary-text">
                  This Month you spent <span className="highlight">R{expensesData.monthlyData?.[selectedMonth]?.toLocaleString() || 0}</span>
                  {topCategory.total > 0 && (
                    <>
                      {' '}top category spent on is <span className="highlight">{topCategory.name}</span>
                      {topItem && (
                        <> top item is <span className="highlight">{topItem.name} R{topItem.amount}</span></>
                      )}
                      {' '}total of <span className="highlight">R{topCategory.total}</span>
                    </>
                  )}
                  {percentageChange.percentage > 0 && (
                    <> Spent <span className={percentageChange.isMore ? 'more' : 'less'}>
                      {percentageChange.percentage}%
                    </span> {percentageChange.isMore ? 'more' : 'less'} than last month
                    </>
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Expense Modal */}
      {showExpenseModal && selectedCategory && (
        <div className="modal-overlay" onClick={closeExpenseModal}>
          <div className="modal-content expense-modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">Add Expense |</h3>
            
            <div className="modal-body">
              <div className="expense-input-group">
                <label className="expense-label">Category</label>
                <div className="category-display">
                  <span className="category-name">{selectedCategory.name}</span>
                </div>
              </div>

              <div className="expense-input-group">
                <label className="expense-label">Name of Expense |</label>
                <input
                  type="text"
                  name="name"
                  className="expense-input"
                  placeholder="e.g., Burger, Netflix, Rent..."
                  value={newExpense.name}
                  onChange={handleExpenseChange}
                  autoFocus
                />
              </div>

              <div className="expense-input-group">
                <label className="expense-label">Cost (R)</label>
                <input
                  type="number"
                  name="cost"
                  className="expense-input"
                  placeholder="Enter amount"
                  value={newExpense.cost}
                  onChange={handleExpenseChange}
                  min="0"
                  step="0.01"
                />
              </div>
            </div>

            <div className="modal-footer">
              <button className="modal-btn exit-btn" onClick={closeExpenseModal}>
                Cancel
              </button>
              <button 
                className="modal-btn add-btn" 
                onClick={handleAddExpense}
                disabled={!newExpense.name || !newExpense.cost}
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Savings Modal */}
      {showSavingsModal && (
        <div className="modal-overlay" onClick={closeSavingsModal}>
          <div className="modal-content savings-modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">Add Savings</h3>
            
            <div className="modal-body">
              <div className="savings-input-group">
                <label className="savings-label">Day</label>
                <div className="savings-select-row">
                  <select
                    name="day"
                    className="savings-select day-select"
                    value={newSavings.day}
                    onChange={handleSavingsChange}
                  >
                    {days.map(day => (
                      <option key={day} value={day}>{day}</option>
                    ))}
                  </select>
                  <select
                    name="month"
                    className="savings-select month-select"
                    value={newSavings.month}
                    onChange={handleSavingsChange}
                  >
                    {months.map(month => (
                      <option key={month} value={month}>{month}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="savings-input-group">
                <label className="savings-label">Amount (R)</label>
                <input
                  type="number"
                  name="amount"
                  className="savings-amount-input"
                  placeholder="Enter amount saved"
                  value={newSavings.amount}
                  onChange={handleSavingsChange}
                  min="0"
                  step="0.01"
                  autoFocus
                />
              </div>
              
              <div className="savings-info">
              </div>
            </div>

            <div className="modal-footer savings-footer">
              <button className="modal-btn reset-btn" onClick={handleResetSavings}>
                Reset All Savings
              </button>
              <button 
                className="modal-btn add-btn" 
                onClick={handleAddSavings}
                disabled={!newSavings.amount}
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Confirmation Modal */}
      {showResetConfirmModal && (
        <div className="modal-overlay" onClick={cancelResetSavings}>
          <div className="modal-content confirm-modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">Confirm Reset |</h3>
            
            <div className="modal-body">
              <p className="confirm-text">
                Are you sure you want to reset all savings? This action cannot be undone.
              </p>
            </div>

            <div className="modal-footer">
              <button className="modal-btn exit-btn" onClick={cancelResetSavings}>
                Cancel
              </button>
              <button className="modal-btn delete-btn" onClick={confirmResetSavings}>
                Reset All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default FinancialTracking;