/**
 * Toast Notification Component
 * Simple toast notifications for user feedback
 */

import React, { useEffect, useState } from 'react';
import './Toast.css';

export interface ToastProps {
  message: string;
  type?: 'info' | 'warning' | 'error' | 'success';
  duration?: number;
  onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({
  message,
  type = 'info',
  duration = 4000,
  onClose,
}) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 300); // Wait for fade-out animation
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const getIcon = () => {
    switch (type) {
      case 'error':
        return '❌';
      case 'warning':
        return '⚠️';
      case 'success':
        return '✅';
      default:
        return 'ℹ️';
    }
  };

  return (
    <div
      className={`toast toast--${type} ${isVisible ? 'toast--visible' : 'toast--hidden'}`}
      role="alert"
    >
      <span className="toast__icon">{getIcon()}</span>
      <span className="toast__message">{message}</span>
      <button
        className="toast__close"
        onClick={() => {
          setIsVisible(false);
          setTimeout(onClose, 300);
        }}
        type="button"
        aria-label="Close"
      >
        ×
      </button>
    </div>
  );
};

export default Toast;
