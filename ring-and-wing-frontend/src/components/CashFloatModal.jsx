import React, { useState, useEffect } from 'react';
import { Modal } from './ui';
import { FiDollarSign, FiRefreshCw, FiEdit, FiArrowRight } from 'react-icons/fi';
import TipsSection from './TipsSection';

const CashFloatModal = ({ isOpen, onClose, initialCashFloat, onSave, theme }) => {
  // Use local state to avoid controlled/uncontrolled input issues
  const [localSettings, setLocalSettings] = useState({
    resetDaily: false,
    resetAmount: "1000",
    manualAmount: "",
  });
  
  // Cash float tips
  const cashFloatTips = [
    "Use <b>Reset Cash Float Daily</b> to automatically reset the float to a specific amount each day",
    "Use <b>Manual Cash Float Adjustment</b> to directly update the current cash float value",
    "The cash float affects your ability to give change during cash transactions"
  ];
  
  // Initialize the component with the current values when opened
  useEffect(() => {
    if (isOpen) {
      setLocalSettings(prev => ({
        ...prev,
        manualAmount: initialCashFloat ? String(initialCashFloat) : "1000",
      }));
    }
  }, [isOpen, initialCashFloat]);
  
  const handleCheckboxChange = (e) => {
    setLocalSettings(prev => ({
      ...prev,
      resetDaily: e.target.checked
    }));
  };
  
  const handleResetAmountChange = (e) => {
    // Always keep as string in state until submitting
    setLocalSettings(prev => ({
      ...prev,
      resetAmount: e.target.value
    }));
  };
  
  const handleManualAmountChange = (e) => {
    // Always keep as string in state until submitting
    setLocalSettings(prev => ({
      ...prev,
      manualAmount: e.target.value
    }));
  };
  
  const handleSave = () => {
    const resetAmount = parseFloat(localSettings.resetAmount) || 0;
    const manualAmount = parseFloat(localSettings.manualAmount) || 0;
    
    onSave({
      resetDaily: localSettings.resetDaily,
      resetAmount,
      manualAmount
    });
    
    onClose();
  };
  
  // Only render when isOpen is true
  if (!isOpen) return null;
  
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="wide" preventClose={true}>
      <div className="relative">
        {/* Using the reusable TipsSection with header */}
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
                    <FiDollarSign size={24} className="text-orange-500" />
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
                </label>

                {localSettings.resetDaily && (
                  <div className="pl-8 ml-1 border-l-2 border-orange-200">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Reset Amount
                    </label>
                    <div className="relative rounded-md shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="text-gray-500">₱</span>
                      </div>
                      <input
                        type="number"
                        value={localSettings.resetAmount}
                        onChange={handleResetAmountChange}
                        className="w-full pl-8 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-300 focus:border-orange-400 outline-none transition-colors"
                        min="0"
                        step="any"
                      />
                    </div>
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
              
              <div className="p-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cash Float Amount
                  </label>
                  <div className="relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-gray-500">₱</span>
                    </div>
                    <input
                      type="number"
                      value={localSettings.manualAmount}
                      onChange={handleManualAmountChange}
                      className="w-full pl-8 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-300 focus:border-blue-400 outline-none transition-colors"
                      min="0"
                      step="any"
                    />
                  </div>
                  <p className="text-gray-500 text-xs mt-2">
                    This will update the current cash float value for today
                  </p>
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
            </button>
            <button
              onClick={handleSave}
              className="px-5 py-2 rounded-lg shadow-md font-medium flex items-center group"
              style={{
                backgroundColor: theme.colors.accent || '#f97316',
                color: 'white'
              }}
            >
              Save Changes
              <FiArrowRight className="ml-1 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default CashFloatModal;