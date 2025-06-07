import React from 'react';
import { FiAlertTriangle, FiAlertCircle, FiInfo, FiX } from 'react-icons/fi';

/**
 * Enhanced error and notification component for cash operations
 * 
 * Provides consistent error display, warnings, and informational messages
 * for cash handling throughout the application.
 */
export const CashAlert = ({ 
  type = 'error', 
  message, 
  details, 
  onClose, 
  actionButton = null,
  className = '',
  autoHide = false,
  hideDelay = 5000
}) => {
  const [isVisible, setIsVisible] = React.useState(true);

  React.useEffect(() => {
    if (autoHide && hideDelay > 0) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        if (onClose) onClose();
      }, hideDelay);

      return () => clearTimeout(timer);
    }
  }, [autoHide, hideDelay, onClose]);

  if (!isVisible || !message) return null;

  const getTypeConfig = () => {
    switch (type) {
      case 'error':
        return {
          icon: FiAlertCircle,
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          iconColor: 'text-red-500',
          textColor: 'text-red-800',
          titleColor: 'text-red-900'
        };
      case 'warning':
        return {
          icon: FiAlertTriangle,
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200',
          iconColor: 'text-yellow-500',
          textColor: 'text-yellow-800',
          titleColor: 'text-yellow-900'
        };
      case 'info':
        return {
          icon: FiInfo,
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          iconColor: 'text-blue-500',
          textColor: 'text-blue-800',
          titleColor: 'text-blue-900'
        };
      case 'success':
        return {
          icon: FiInfo,
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          iconColor: 'text-green-500',
          textColor: 'text-green-800',
          titleColor: 'text-green-900'
        };
      default:
        return {
          icon: FiInfo,
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200',
          iconColor: 'text-gray-500',
          textColor: 'text-gray-800',
          titleColor: 'text-gray-900'
        };
    }
  };

  const config = getTypeConfig();
  const Icon = config.icon;

  return (
    <div className={`rounded-lg border p-4 ${config.bgColor} ${config.borderColor} ${className}`}>
      <div className="flex">
        <div className="flex-shrink-0">
          <Icon className={`h-5 w-5 ${config.iconColor}`} />
        </div>
        <div className="ml-3 flex-1">
          <h3 className={`text-sm font-medium ${config.titleColor}`}>
            {type === 'error' && 'Cash Operation Error'}
            {type === 'warning' && 'Cash Operation Warning'}
            {type === 'info' && 'Cash Operation Info'}
            {type === 'success' && 'Cash Operation Success'}
          </h3>
          <div className={`mt-2 text-sm ${config.textColor}`}>
            <p>{message}</p>
            {details && (
              <div className="mt-2 text-xs opacity-75">
                {Array.isArray(details) ? (
                  <ul className="list-disc list-inside space-y-1">
                    {details.map((detail, index) => (
                      <li key={index}>{detail}</li>
                    ))}
                  </ul>
                ) : (
                  <p>{details}</p>
                )}
              </div>
            )}
          </div>
          {actionButton && (
            <div className="mt-3">
              {actionButton}
            </div>
          )}
        </div>
        {onClose && (
          <div className="ml-auto pl-3">
            <div className="-mx-1.5 -my-1.5">
              <button
                onClick={() => {
                  setIsVisible(false);
                  onClose();
                }}
                className={`inline-flex rounded-md p-1.5 focus:outline-none focus:ring-2 focus:ring-offset-2 ${config.textColor} hover:${config.bgColor}`}
              >
                <span className="sr-only">Dismiss</span>
                <FiX className="h-5 w-5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Hook for managing cash operation notifications
 */
export const useCashAlerts = () => {
  const [alerts, setAlerts] = React.useState([]);

  const addAlert = React.useCallback((alert) => {
    const id = Date.now() + Math.random();
    const newAlert = { ...alert, id };
    
    setAlerts(prev => [...prev, newAlert]);

    // Auto-remove after delay if specified
    if (alert.autoRemove !== false) {
      const delay = alert.autoRemoveDelay || 5000;
      setTimeout(() => {
        setAlerts(prev => prev.filter(a => a.id !== id));
      }, delay);
    }

    return id;
  }, []);

  const removeAlert = React.useCallback((id) => {
    setAlerts(prev => prev.filter(alert => alert.id !== id));
  }, []);

  const clearAlerts = React.useCallback(() => {
    setAlerts([]);
  }, []);

  // Convenience methods for different alert types
  const showError = React.useCallback((message, options = {}) => {
    return addAlert({ type: 'error', message, ...options });
  }, [addAlert]);

  const showWarning = React.useCallback((message, options = {}) => {
    return addAlert({ type: 'warning', message, ...options });
  }, [addAlert]);

  const showInfo = React.useCallback((message, options = {}) => {
    return addAlert({ type: 'info', message, ...options });
  }, [addAlert]);

  const showSuccess = React.useCallback((message, options = {}) => {
    return addAlert({ type: 'success', message, ...options });
  }, [addAlert]);

  return {
    alerts,
    addAlert,
    removeAlert,
    clearAlerts,
    showError,
    showWarning,
    showInfo,
    showSuccess
  };
};

/**
 * Container component for displaying cash alerts
 */
export const CashAlertContainer = ({ alerts = [], onRemoveAlert, className = '' }) => {
  if (!alerts.length) return null;

  return (
    <div className={`space-y-2 ${className}`}>
      {alerts.map(alert => (
        <CashAlert
          key={alert.id}
          type={alert.type}
          message={alert.message}
          details={alert.details}
          onClose={() => onRemoveAlert(alert.id)}
          actionButton={alert.actionButton}
          autoHide={alert.autoHide}
          hideDelay={alert.hideDelay}
        />
      ))}
    </div>
  );
};

/**
 * Specific cash validation error component
 */
export const CashValidationError = ({ 
  cashAmount, 
  requiredAmount, 
  availableFloat, 
  onSuggestAmount 
}) => {
  const shortfall = requiredAmount - cashAmount;
  const change = cashAmount - requiredAmount;
  const canGiveChange = change <= availableFloat;

  const suggestions = [];
  
  if (cashAmount < requiredAmount) {
    suggestions.push(`Add ₱${shortfall.toFixed(2)} more cash`);
    if (onSuggestAmount) {
      suggestions.push(`Suggest exact amount: ₱${requiredAmount.toFixed(2)}`);
    }
  } else if (!canGiveChange) {
    const maxCash = requiredAmount + availableFloat;
    suggestions.push(`Maximum cash accepted: ₱${maxCash.toFixed(2)}`);
    if (onSuggestAmount) {
      suggestions.push(`Suggest maximum amount`);
    }
  }

  return (
    <CashAlert
      type="error"
      message={
        cashAmount < requiredAmount 
          ? `Insufficient cash amount` 
          : `Cannot provide change`
      }
      details={[
        `Cash received: ₱${cashAmount.toFixed(2)}`,
        `Amount required: ₱${requiredAmount.toFixed(2)}`,
        `Available float: ₱${availableFloat.toFixed(2)}`,
        cashAmount >= requiredAmount && `Change needed: ₱${change.toFixed(2)}`
      ].filter(Boolean)}
      actionButton={onSuggestAmount && (
        <button
          onClick={() => onSuggestAmount(
            cashAmount < requiredAmount ? requiredAmount : requiredAmount + availableFloat
          )}
          className="text-sm bg-red-100 hover:bg-red-200 text-red-800 px-3 py-1 rounded-md transition-colors"
        >
          {cashAmount < requiredAmount ? 'Use Exact Amount' : 'Use Maximum Amount'}
        </button>
      )}
    />
  );
};
