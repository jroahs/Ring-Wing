import { useState, useEffect } from 'react';
import { FiCheck, FiX, FiAlertTriangle, FiInfo } from 'react-icons/fi';

const Toast = ({ message, type = 'success', isVisible, onClose, duration = 5000 }) => {
  useEffect(() => {
    if (isVisible && duration > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [isVisible, duration, onClose]);

  if (!isVisible) return null;

  const getToastStyles = () => {
    switch (type) {
      case 'success':
        return {
          bg: 'bg-green-500',
          icon: <FiCheck className="text-white text-lg" />,
          text: 'text-white'
        };
      case 'error':
        return {
          bg: 'bg-red-500',
          icon: <FiX className="text-white text-lg" />,
          text: 'text-white'
        };
      case 'warning':
        return {
          bg: 'bg-amber-500',
          icon: <FiAlertTriangle className="text-white text-lg" />,
          text: 'text-white'
        };
      case 'info':
        return {
          bg: 'bg-blue-500',
          icon: <FiInfo className="text-white text-lg" />,
          text: 'text-white'
        };
      default:
        return {
          bg: 'bg-gray-500',
          icon: <FiInfo className="text-white text-lg" />,
          text: 'text-white'
        };
    }
  };

  const styles = getToastStyles();

  return (
    <div 
      className={`fixed top-4 right-4 z-50 ${styles.bg} ${styles.text} px-6 py-4 rounded-lg shadow-lg transform transition-all duration-300 ease-in-out ${
        isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
      }`}
      style={{ minWidth: '320px', maxWidth: '480px' }}
    >
      <div className="flex items-center gap-3">
        <div className="flex-shrink-0">
          {styles.icon}
        </div>
        <div className="flex-1">
          <p className="font-medium">{message}</p>
        </div>
        <button
          onClick={onClose}
          className="flex-shrink-0 ml-2 hover:bg-white hover:bg-opacity-20 rounded-full p-1 transition-colors"
        >
          <FiX className="text-sm" />
        </button>
      </div>
    </div>
  );
};

export default Toast;