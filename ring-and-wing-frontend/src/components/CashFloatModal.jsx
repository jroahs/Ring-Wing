import React, { useState, useEffect, useMemo } from 'react';
import { Modal } from './ui';
import { FiRefreshCw, FiEdit, FiArrowRight, FiAlertCircle } from 'react-icons/fi';
import { PesoIconSimple } from './ui/PesoIconSimple';
import TipsSection from './TipsSection';

const CashFloatModal = ({ isOpen, onClose, initialCashFloat, onSave, theme }) => {
  // Use local state to avoid controlled/uncontrolled input issues
  const [localSettings, setLocalSettings] = useState({
    resetDaily: false,
    resetAmount: "1000",
    manualAmount: "",
  });

  // Enhanced validation states
  const [errors, setErrors] = useState({
    resetAmount: '',
    manualAmount: ''
  });

  const [isProcessing, setIsProcessing] = useState(false);
  
  // Cash float tips - Enhanced with validation information
  const cashFloatTips = [
    "Use <b>Reset Cash Float Daily</b> to automatically reset the float to a specific amount each day",
    "Use <b>Manual Cash Float Adjustment</b> to directly update the current cash float value",
    "The cash float affects your ability to give change during cash transactions",
    "Ensure the cash float amount is reasonable for your daily operations (recommended: ₱500-₱5000)",
    "Manual adjustments should reflect the actual cash available in your register"
  ];

  // Enhanced utility functions
  const formatCurrency = (amount) => {
    if (amount === null || amount === undefined || isNaN(amount)) return '0.00';
    return Number(amount).toFixed(2);
  };

  const parseCurrency = (value) => {
    if (!value || value === '') return 0;
    const parsed = parseFloat(value.toString().replace(/[^\d.-]/g, ''));
    return isNaN(parsed) ? 0 : Math.max(0, parsed);
  };

  // Validation functions
  const validateResetAmount = (amount) => {
    const numAmount = parseCurrency(amount);
    
    if (numAmount <= 0) {
      return 'Reset amount must be greater than zero';
    }
    
    if (numAmount > 50000) {
      return 'Reset amount seems unusually high (max: ₱50,000)';
    }
    
    if (numAmount < 100) {
      return 'Reset amount might be too low for daily operations (min: ₱100)';
    }
    
    return '';
  };

  const validateManualAmount = (amount) => {
    const numAmount = parseCurrency(amount);
    
    if (numAmount < 0) {
      return 'Cash float cannot be negative';
    }
    
    if (numAmount > 100000) {
      return 'Cash float amount seems unusually high (max: ₱100,000)';
    }
    
    return '';
  };

  // Check if form can be saved
  const canSave = useMemo(() => {
    if (isProcessing) return false;
    
    // Check for any validation errors
    if (localSettings.resetDaily && errors.resetAmount) return false;
    if (errors.manualAmount) return false;
    
    // Check if manual amount is provided and valid
    const manualAmount = parseCurrency(localSettings.manualAmount);
    if (manualAmount < 0) return false;
    
    return true;
  }, [localSettings, errors, isProcessing]);
    // Initialize the component with the current values when opened
  useEffect(() => {
    if (isOpen) {
      setLocalSettings(prev => ({
        ...prev,
        manualAmount: initialCashFloat ? String(initialCashFloat) : "1000",
      }));
      // Reset errors when modal opens
      setErrors({
        resetAmount: '',
        manualAmount: ''
      });
      setIsProcessing(false);
    }
  }, [isOpen, initialCashFloat]);

  // Validate reset amount on change
  useEffect(() => {
    if (localSettings.resetDaily && localSettings.resetAmount) {
      const error = validateResetAmount(localSettings.resetAmount);
      setErrors(prev => ({ ...prev, resetAmount: error }));
    } else {
      setErrors(prev => ({ ...prev, resetAmount: '' }));
    }
  }, [localSettings.resetAmount, localSettings.resetDaily]);

  // Validate manual amount on change
  useEffect(() => {
    if (localSettings.manualAmount) {
      const error = validateManualAmount(localSettings.manualAmount);
      setErrors(prev => ({ ...prev, manualAmount: error }));
    } else {
      setErrors(prev => ({ ...prev, manualAmount: '' }));
    }
  }, [localSettings.manualAmount]);
  
  const handleCheckboxChange = (e) => {
    setLocalSettings(prev => ({
      ...prev,
      resetDaily: e.target.checked
    }));
  };
    const handleResetAmountChange = (e) => {
    const value = e.target.value;
    // Only allow positive numbers and decimals
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setLocalSettings(prev => ({
        ...prev,
        resetAmount: value
      }));
    }
  };
  
  const handleManualAmountChange = (e) => {
    const value = e.target.value;
    // Only allow positive numbers and decimals
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setLocalSettings(prev => ({
        ...prev,
        manualAmount: value
      }));
    }
  };
  
  const handleSave = async () => {
    if (!canSave) return;
    
    setIsProcessing(true);
    
    try {
      // Final validation before saving
      if (localSettings.resetDaily) {
        const resetError = validateResetAmount(localSettings.resetAmount);
        if (resetError) {
          setErrors(prev => ({ ...prev, resetAmount: resetError }));
          return;
        }
      }
      
      const manualError = validateManualAmount(localSettings.manualAmount);
      if (manualError) {
        setErrors(prev => ({ ...prev, manualAmount: manualError }));
        return;
      }
      
      const resetAmount = parseCurrency(localSettings.resetAmount);
      const manualAmount = parseCurrency(localSettings.manualAmount);
      
      // Ensure valid amounts
      if (localSettings.resetDaily && resetAmount <= 0) {
        setErrors(prev => ({ ...prev, resetAmount: 'Reset amount must be greater than zero' }));
        return;
      }
      
      if (manualAmount < 0) {
        setErrors(prev => ({ ...prev, manualAmount: 'Cash float cannot be negative' }));
        return;
      }
      
      await onSave({
        resetDaily: localSettings.resetDaily,
        resetAmount,
        manualAmount
      });
      
      onClose();
    } catch (error) {
      console.error('Error saving cash float settings:', error);
      // Could add toast notification here
    } finally {
      setIsProcessing(false);
    }
  };
  
  // Only render when isOpen is true
  if (!isOpen) return null;
  
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="2xl" preventClose={true}>
      <div className="relative">{/* Using the reusable TipsSection with header */}
        <TipsSection 
          tips={cashFloatTips}
          accentColor="orange"
          title="Cash Float Tips:"
          withHeader={true}
          headerTitle="Cash Float Settings"
          defaultOpen={false}
        />

        {/* Main Content Area - Redesigned for better horizontal layout */}
        <div className="py-4">
          {/* Redesigned Current Cash Float Display - Horizontal style */}
          <div className="mb-6">
            <div className="bg-gradient-to-r from-orange-400 to-orange-600 rounded-xl p-0.5 shadow-lg">
              <div className="bg-white rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-500 mb-1">Current Cash Float</h3>
                <div className="flex items-center">
                  <div className="bg-orange-100 rounded-full p-2 mr-4">
                    <PesoIconSimple width={24} height={24} className="text-orange-500" />
                  </div>
                  <div className="flex-1">
                    <div className="text-3xl font-bold text-orange-600">₱{Number(initialCashFloat).toFixed(2)}</div>
                    <div className="h-1.5 bg-gray-100 rounded-full mt-2 overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-orange-400 to-orange-500"
                        style={{ width: `${Math.min(100, (initialCashFloat / 5000) * 100)}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Card Layout for Options - Now in a 2-column grid for wider layout */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Daily Reset Card */}
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
              <div className="bg-gradient-to-r from-orange-50 to-orange-100 px-4 py-3 border-b border-orange-200">
                <div className="flex items-center">
                  <FiRefreshCw className="text-orange-500 mr-2" size={18} />
                  <h3 className="font-medium text-orange-800">Daily Reset</h3>
                </div>
              </div>
              
              <div className="p-4">
                <label className="flex items-center cursor-pointer mb-4 p-3 rounded-lg hover:bg-orange-50 transition-colors">
                  <input
                    type="checkbox"
                    checked={localSettings.resetDaily}
                    onChange={handleCheckboxChange}
                    className="h-5 w-5 accent-orange-500 rounded"
                  />
                  <div className="ml-3">
                    <span className="text-gray-800 font-medium">Reset Cash Float Daily</span>
                    <p className="text-gray-500 text-sm mt-1">Automatically reset to a specific amount each day</p>
                  </div>
                </label>                {localSettings.resetDaily && (
                  <div className="pl-8 ml-1 border-l-2 border-orange-200">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Reset Amount
                    </label>
                    <div className="relative rounded-md shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="text-gray-500">₱</span>
                      </div>
                      <input
                        type="text"
                        value={localSettings.resetAmount}
                        onChange={handleResetAmountChange}
                        className={`w-full pl-8 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-300 focus:border-orange-400 outline-none transition-colors ${
                          errors.resetAmount ? 'border-red-500 focus:ring-red-300 focus:border-red-400' : ''
                        }`}
                        placeholder="1000"
                      />
                    </div>
                    {errors.resetAmount && (
                      <div className="flex items-center mt-1 text-red-600 text-sm">
                        <FiAlertCircle className="mr-1" size={14} />
                        {errors.resetAmount}
                      </div>
                    )}
                    <p className="text-gray-500 text-xs mt-1">
                      Recommended range: ₱500 - ₱5,000
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Manual Adjustment Card */}
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
              <div className="bg-gradient-to-r from-blue-50 to-blue-100 px-4 py-3 border-b border-blue-200">
                <div className="flex items-center">
                  <FiEdit className="text-blue-600 mr-2" size={18} />
                  <h3 className="font-medium text-blue-800">Manual Adjustment</h3>
                </div>
              </div>
              
              <div className="p-4">                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cash Float Amount
                  </label>
                  <div className="relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-gray-500">₱</span>
                    </div>
                    <input
                      type="text"
                      value={localSettings.manualAmount}
                      onChange={handleManualAmountChange}
                      className={`w-full pl-8 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-300 focus:border-blue-400 outline-none transition-colors ${
                        errors.manualAmount ? 'border-red-500 focus:ring-red-300 focus:border-red-400' : ''
                      }`}
                      placeholder={formatCurrency(initialCashFloat)}
                    />
                  </div>
                  {errors.manualAmount && (
                    <div className="flex items-center mt-1 text-red-600 text-sm">
                      <FiAlertCircle className="mr-1" size={14} />
                      {errors.manualAmount}
                    </div>
                  )}
                  <p className="text-gray-500 text-xs mt-2">
                    Current: ₱{formatCurrency(initialCashFloat)} | This will update the current cash float value
                  </p>
                  {localSettings.manualAmount && !errors.manualAmount && (
                    <div className="mt-2 p-2 bg-blue-50 rounded-lg">
                      <div className="text-sm text-blue-800">
                        <strong>Change: </strong>
                        {parseCurrency(localSettings.manualAmount) > initialCashFloat ? '+' : ''}
                        ₱{formatCurrency(parseCurrency(localSettings.manualAmount) - initialCashFloat)}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons - Made more appealing */}
          <div className="flex justify-end space-x-3 mt-6">
            <button
              onClick={onClose}
              className="px-5 py-2 rounded-lg border border-gray-300 font-medium text-gray-700 hover:bg-gray-100 transition-colors"
            >
              Cancel
            </button>            <button
              onClick={handleSave}
              disabled={!canSave}
              className={`px-5 py-2 rounded-lg shadow-md font-medium flex items-center group transition-all ${
                canSave 
                  ? 'hover:shadow-lg' 
                  : 'opacity-50 cursor-not-allowed'
              } ${isProcessing ? 'animate-pulse' : ''}`}
              style={{
                backgroundColor: canSave ? (theme.colors.accent || '#f97316') : '#9ca3af',
                color: 'white'
              }}
            >
              {isProcessing ? 'Saving...' : 'Save Changes'}
              {!isProcessing && (
                <FiArrowRight className="ml-1 group-hover:translate-x-1 transition-transform" />
              )}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default CashFloatModal;