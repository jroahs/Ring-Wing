import React, { useState } from 'react';
import { AlertTriangle, CheckCircle, Clock, X, Shield } from 'lucide-react';

/**
 * AvailabilityIndicator Component
 * Shows inventory availability status for menu items
 */
export const AvailabilityIndicator = ({ availability, className = "", size = "sm" }) => {
  if (!availability) return null;

  const sizeClasses = {
    sm: "w-3 h-3 text-xs",
    md: "w-4 h-4 text-sm",
    lg: "w-5 h-5 text-base"
  };

  const getStatusDisplay = () => {
    if (availability.available) {
      if (availability.warnings && availability.warnings.length > 0) {
        return {
          icon: AlertTriangle,
          color: "text-yellow-600 bg-yellow-100",
          message: availability.warnings[0]
        };
      }
      return {
        icon: CheckCircle,
        color: "text-green-600 bg-green-100",
        message: "Available"
      };
    } else {
      return {
        icon: X,
        color: "text-red-600 bg-red-100",
        message: availability.reason || "Not available"
      };
    }
  };

  const { icon: Icon, color, message } = getStatusDisplay();

  return (
    <div 
      className={`inline-flex items-center px-2 py-1 rounded-full ${color} ${className}`}
      title={message}
    >
      <Icon className={`${sizeClasses[size]} mr-1`} />
      <span className={`font-medium ${size === 'lg' ? 'text-sm' : 'text-xs'}`}>
        {size === 'lg' ? message : (availability.available ? 'Available' : 'N/A')}
      </span>
    </div>
  );
};

/**
 * InventoryAlert Component
 * Shows detailed inventory warnings and conflicts
 */
export const InventoryAlert = ({ 
  availability, 
  onClose, 
  onManagerOverride,
  isManager = false,
  className = "" 
}) => {
  const [overrideReason, setOverrideReason] = useState('');
  const [showOverrideForm, setShowOverrideForm] = useState(false);

  if (!availability || availability.available) return null;

  const handleManagerOverride = () => {
    if (overrideReason.trim()) {
      onManagerOverride(overrideReason);
      setShowOverrideForm(false);
      setOverrideReason('');
    }
  };

  return (
    <div className={`bg-red-50 border border-red-200 rounded-lg p-4 ${className}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start">
          <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 mr-3" />
          <div className="flex-1">
            <h4 className="font-medium text-red-800 mb-2">Inventory Issue</h4>
            <p className="text-sm text-red-700 mb-3">
              {availability.reason || "Some ingredients are not available for this order."}
            </p>
            
            {availability.missingIngredients && availability.missingIngredients.length > 0 && (
              <div className="mb-3">
                <p className="text-sm font-medium text-red-800 mb-1">Missing ingredients:</p>
                <ul className="text-sm text-red-700 space-y-1">
                  {availability.missingIngredients.map((ingredient, index) => (
                    <li key={index} className="flex items-center">
                      <span className="w-2 h-2 bg-red-400 rounded-full mr-2"></span>
                      {ingredient.name} - Need {ingredient.required}, have {ingredient.available}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {isManager && !showOverrideForm && (
              <button
                onClick={() => setShowOverrideForm(true)}
                className="inline-flex items-center px-3 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md"
              >
                <Shield className="w-4 h-4 mr-2" />
                Manager Override
              </button>
            )}

            {showOverrideForm && (
              <div className="mt-3 p-3 bg-white border border-red-200 rounded-md">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Override Reason (required):
                </label>
                <textarea
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  placeholder="Explain why this order should proceed despite inventory issues..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                  rows={3}
                />
                <div className="flex items-center space-x-2 mt-3">
                  <button
                    onClick={handleManagerOverride}
                    disabled={!overrideReason.trim()}
                    className="px-3 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:bg-gray-400 rounded-md"
                  >
                    Override
                  </button>
                  <button
                    onClick={() => {
                      setShowOverrideForm(false);
                      setOverrideReason('');
                    }}
                    className="px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
        
        {onClose && (
          <button
            onClick={onClose}
            className="text-red-400 hover:text-red-600 p-1"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};

/**
 * OrderAvailabilityStatus Component
 * Shows overall order availability with detailed breakdown
 */
export const OrderAvailabilityStatus = ({ 
  orderAvailability, 
  onManagerOverride,
  isManager = false,
  className = "" 
}) => {
  if (!orderAvailability) return null;

  const { available, results, warnings, conflicts } = orderAvailability;
  const hasIssues = !available || warnings.length > 0 || conflicts.length > 0;

  if (!hasIssues) {
    return (
      <div className={`bg-green-50 border border-green-200 rounded-lg p-3 ${className}`}>
        <div className="flex items-center">
          <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
          <span className="text-sm font-medium text-green-800">
            All items available
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-yellow-50 border border-yellow-200 rounded-lg p-4 ${className}`}>
      <div className="flex items-start">
        <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5 mr-3" />
        <div className="flex-1">
          <h4 className="font-medium text-yellow-800 mb-2">Order Availability Issues</h4>
          
          {!available && (
            <div className="mb-3">
              <p className="text-sm text-yellow-700 font-medium mb-2">Unavailable items:</p>
              {results.filter(r => !r.available).map((result, index) => (
                <div key={index} className="text-sm text-yellow-700 mb-1">
                  • {result.menuItemName} - {result.reason}
                </div>
              ))}
            </div>
          )}

          {warnings.length > 0 && (
            <div className="mb-3">
              <p className="text-sm text-yellow-700 font-medium mb-2">Warnings:</p>
              {warnings.map((warning, index) => (
                <div key={index} className="text-sm text-yellow-700 mb-1">
                  • {warning}
                </div>
              ))}
            </div>
          )}

          {conflicts.length > 0 && (
            <div className="mb-3">
              <p className="text-sm text-yellow-700 font-medium mb-2">Inventory conflicts:</p>
              {conflicts.map((conflict, index) => (
                <div key={index} className="text-sm text-yellow-700 mb-1">
                  • {conflict.ingredient} - Multiple items require this ingredient
                </div>
              ))}
            </div>
          )}

          {!available && isManager && (
            <InventoryAlert
              availability={{ available: false, reason: "Order contains unavailable items" }}
              onManagerOverride={onManagerOverride}
              isManager={isManager}
              className="mt-3"
            />
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * InventoryReservationStatus Component
 * Shows reservation status for orders
 */
export const InventoryReservationStatus = ({ 
  reservationId, 
  status = 'pending',
  expiresAt,
  className = "" 
}) => {
  const getStatusDisplay = () => {
    switch (status) {
      case 'active':
        return {
          icon: Clock,
          color: "text-blue-600 bg-blue-100",
          message: "Reserved"
        };
      case 'completed':
        return {
          icon: CheckCircle,
          color: "text-green-600 bg-green-100",
          message: "Completed"
        };
      case 'expired':
        return {
          icon: X,
          color: "text-red-600 bg-red-100",
          message: "Expired"
        };
      default:
        return {
          icon: Clock,
          color: "text-gray-600 bg-gray-100",
          message: "Pending"
        };
    }
  };

  const { icon: Icon, color, message } = getStatusDisplay();
  const timeRemaining = expiresAt ? Math.max(0, Math.floor((new Date(expiresAt) - new Date()) / 60000)) : null;

  return (
    <div className={`inline-flex items-center px-3 py-1 rounded-full ${color} ${className}`}>
      <Icon className="w-4 h-4 mr-2" />
      <span className="text-sm font-medium">
        {message}
        {timeRemaining && timeRemaining > 0 && (
          <span className="ml-1 text-xs">({timeRemaining}m left)</span>
        )}
      </span>
    </div>
  );
};