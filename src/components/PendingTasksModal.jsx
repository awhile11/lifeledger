import React from 'react';
import './PendingTasksModal.css';

function PendingTasksModal({ isOpen, onClose, todos, onToggleComplete, onRemove }) {
  if (!isOpen) return null;

  const pendingTodos = todos.filter(todo => !todo.completed);

  return (
    <div className="pending-modal-overlay" onClick={onClose}>
      <div className="pending-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="pending-modal-header">
          <h2>Pending Tasks</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="pending-modal-body">
          {pendingTodos.length === 0 ? (
            <div className="no-pending-tasks">
              <span className="check-icon">✓</span>
              <p>All tasks completed!</p>
              <p className="sub-text">Great job! You have no pending tasks.</p>
            </div>
          ) : (
            <>
              <p className="pending-count">
                You have {pendingTodos.length} task{pendingTodos.length > 1 ? 's' : ''} pending
              </p>
              <ul className="pending-todo-list">
                {pendingTodos.map(todo => (
                  <li key={todo.id} className="pending-todo-item">
                    <span 
                      className="pending-checkbox" 
                      onClick={() => onToggleComplete(todo.id)}
                    >
                      ○
                    </span>
                    <span className="pending-todo-text">{todo.text}</span>
                    <span 
                      className="pending-remove-task" 
                      onClick={() => onRemove(todo.id)}
                    >
                      ✕
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>

        <div className="pending-modal-footer">
          <button className="pending-modal-btn close-modal-btn" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default PendingTasksModal;