import React, { useState, useEffect, useMemo } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { Badge } from './Badge';
import { theme } from '../../theme';
import { FiCreditCard, FiDollarSign, FiUser, FiCheck, FiArrowRight } from 'react-icons/fi';

export const PaymentProcessingModal = ({
  isOpen,
  onClose,
  total,
  subtotal,
  discount,
  cashFloat,
  onProcessPayment,
  eWalletDetails,
  onEWalletDetailsChange,
  customerName,
  onCustomerNameChange,
  orderItems // Add orderItems to get discount info
}) => {
  const [paymentMethod, setPaymentMethod] = useState('');
  const [cashAmount, setCashAmount] = useState(0);
  const [cashInputError, setCashInputError] = useState('');
  const [eWalletError, setEWalletError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [discountCards, setDiscountCards] = useState([]);

  // Get items that have discounts applied
  const itemsWithDiscounts = useMemo(() => {
    if (!orderItems) return [];
    return orderItems.filter(item => 
      item.pwdSeniorDiscount?.applied && item.pwdSeniorDiscount?.discountedQuantity > 0
    );
  }, [orderItems]);

  // Calculate how many discount cards we need
  const requiredDiscountCards = useMemo(() => {
    return itemsWithDiscounts.reduce((total, item) => 
      total + (item.pwdSeniorDiscount?.discountedQuantity || 0), 0
    );
  }, [itemsWithDiscounts]);

  // Initialize discount cards array when items change
  useEffect(() => {
    if (requiredDiscountCards > 0) {
      setDiscountCards(prev => {
        const newCards = Array(requiredDiscountCards).fill(null).map((_, index) => 
          prev[index] || { cardType: 'PWD', cardIdNumber: '', itemName: '', index }
        );
        return newCards;
      });
    } else {
      setDiscountCards([]);
    }
  }, [requiredDiscountCards]);
  
  const paymentMethods = ['cash', 'e-wallet'];

  // Enhanced currency formatting and validation utilities
  const formatCurrency = (amount) => {
    if (amount === null || amount === undefined || isNaN(amount)) return '0.00';
    return Number(amount).toFixed(2);
  };

  const parseCurrency = (value) => {
    if (!value || value === '') return 0;
    const parsed = parseFloat(value.toString().replace(/[^\d.-]/g, ''));
    return isNaN(parsed) ? 0 : Math.max(0, parsed);
  };

  // Validate cash amount with enhanced checks
  const validateCashAmount = (amount) => {
    const numAmount = parseCurrency(amount);
    const numTotal = parseCurrency(total);
    
    if (numAmount <= 0) {
      return 'Cash amount must be greater than zero';
    }
    
    if (numAmount < numTotal) {
      return `Insufficient cash. Need ₱${formatCurrency(numTotal - numAmount)} more`;
    }
    
    // Check if change can be provided from current float
    const change = numAmount - numTotal;
    const availableFloat = parseCurrency(cashFloat);
    
    if (change > availableFloat) {
      return `Cannot provide ₱${formatCurrency(change)} change. Cash float only has ₱${formatCurrency(availableFloat)}`;
    }
    
    return '';
  };

  // Validate e-wallet details
  const validateEWalletDetails = (details) => {
    if (!details?.referenceNumber || details.referenceNumber.trim() === '') {
      return 'Reference number is required';
    }
    
    if (!details?.name || details.name.trim() === '') {
      return 'Account name is required';
    }
    
    // Validate that reference number contains only numbers
    if (!/^\d+$/.test(details.referenceNumber)) {
      return 'Reference number must contain only numbers';
    }
    
    // Check minimum length for reference number
    if (details.referenceNumber.length < 4) {
      return 'Reference number must be at least 4 digits';
    }
    
    return '';
  };

  // Calculate change with precision handling
  const calculateChange = useMemo(() => {
    if (paymentMethod !== 'cash') return 0;
    const numCashAmount = parseCurrency(cashAmount);
    const numTotal = parseCurrency(total);
    const change = numCashAmount - numTotal;
    return Math.max(0, change);
  }, [paymentMethod, cashAmount, total]);

  // Validate payment on cash amount change
  useEffect(() => {
    if (paymentMethod === 'cash' && cashAmount > 0) {
      const error = validateCashAmount(cashAmount);
      setCashInputError(error);
    } else {
      setCashInputError('');
    }
  }, [cashAmount, total, cashFloat, paymentMethod]);

  // Validate e-wallet details
  useEffect(() => {
    if (paymentMethod === 'e-wallet') {
      const error = validateEWalletDetails(eWalletDetails);
      setEWalletError(error);
    } else {
      setEWalletError('');
    }
  }, [eWalletDetails, paymentMethod]);

  // Check if payment can be processed
  const canProcessPayment = useMemo(() => {
    if (isProcessing) return false;
    
    // Check if all discount cards are filled when discount is applied
    if (parseFloat(discount) > 0 && requiredDiscountCards > 0) {
      const allCardsFilled = discountCards.every(card => 
        card.cardType && card.cardIdNumber.trim()
      );
      if (!allCardsFilled) return false;
    }
    
    if (paymentMethod === 'cash') {
      return cashAmount > 0 && cashInputError === '';
    }
    
    if (paymentMethod === 'e-wallet') {
      return eWalletError === '';
    }
    
    return false;
  }, [paymentMethod, cashAmount, cashInputError, eWalletError, isProcessing, discount, requiredDiscountCards, discountCards]);

  // Enhanced cash amount change handler
  const handleCashAmountChange = (value) => {
    // Only allow positive numbers and decimals
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setCashAmount(value === '' ? 0 : parseCurrency(value));
    }
  };

  // Enhanced payment processing with validation
  const handleProcessPayment = async () => {
    if (!canProcessPayment) return;
    
    setIsProcessing(true);
    
    try {
      // Final validation before processing
      if (paymentMethod === 'cash') {
        const error = validateCashAmount(cashAmount);
        if (error) {
          setCashInputError(error);
          return;
        }
      } else if (paymentMethod === 'e-wallet') {
        const error = validateEWalletDetails(eWalletDetails);
        if (error) {
          setEWalletError(error);
          return;
        }
      }
      
      // Call the parent's process payment function with payment details
      await onProcessPayment({
        method: paymentMethod,
        cashAmount: paymentMethod === 'cash' ? cashAmount : 0,
        eWalletDetails: paymentMethod === 'e-wallet' ? eWalletDetails : null,
        customerName: customerName || '',
        discountCards: parseFloat(discount) > 0 ? discountCards : []
      });
      
      onClose();
    } catch (error) {
      console.error('Payment processing error:', error);
      // Error handling could be enhanced here
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="5xl" preventClose={false}>
      <div className="relative">
        <div className="flex bg-gray-50 rounded-lg overflow-hidden">
        {/* Sidebar Navigation */}
        <div className="w-72 bg-white border-r border-gray-200 flex flex-col">
          {/* Header */}
          <div className="p-3 border-b border-gray-200">
            <h2 className="text-base font-bold text-gray-800 mb-1">Process Payment</h2>
            <div className="text-xs text-gray-500">Complete your order transaction</div>
          </div>

          {/* Navigation Steps */}
          <div className="flex-1 p-3">
            <div className="space-y-2">
              {/* Step 1: Payment Method */}
              <div className={`flex items-center p-2 rounded-lg transition-colors ${
                !paymentMethod 
                  ? 'bg-orange-50 border border-orange-200' // Current step
                  : 'bg-green-50 border border-green-200' // Completed step
              }`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center mr-2 ${
                  !paymentMethod 
                    ? 'bg-orange-500 text-white' // Current step
                    : 'bg-green-500 text-white' // Completed step
                }`}>
                  {!paymentMethod ? (
                    <FiCreditCard size={14} />
                  ) : (
                    <FiCheck size={14} />
                  )}
                </div>
                <div>
                  <div className="font-medium text-gray-800 text-sm">Payment Method</div>
                  <div className="text-xs text-gray-500">
                    {paymentMethod 
                      ? paymentMethod.toUpperCase().replace('-', ' ') 
                      : 'Select method'
                    }
                  </div>
                </div>
              </div>

              {/* Step 2: Customer Info */}
              <div className={`flex items-center p-2 rounded-lg transition-colors ${
                !paymentMethod 
                  ? 'bg-gray-50' // Not active yet
                  : paymentMethod && !canProcessPayment 
                    ? 'bg-orange-50 border border-orange-200' // Current step
                    : 'bg-green-50 border border-green-200' // Completed
              }`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center mr-2 ${
                  !paymentMethod 
                    ? 'bg-gray-300 text-gray-600' // Not active yet
                    : paymentMethod && !canProcessPayment 
                      ? 'bg-orange-500 text-white' // Current step
                      : 'bg-green-500 text-white' // Completed
                }`}>
                  {paymentMethod && canProcessPayment ? (
                    <FiCheck size={14} />
                  ) : (
                    <FiUser size={14} />
                  )}
                </div>
                <div>
                  <div className="font-medium text-gray-800 text-sm">Customer Info</div>
                  <div className="text-xs text-gray-500">
                    {customerName || 'Optional details'}
                  </div>
                </div>
              </div>

              {/* Step 3: Complete */}
              <div className={`flex items-center p-2 rounded-lg transition-colors ${
                canProcessPayment 
                  ? 'bg-green-50 border border-green-200' // Ready to complete
                  : 'bg-gray-50' // Not ready yet
              }`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center mr-2 ${
                  canProcessPayment 
                    ? 'bg-green-500 text-white' // Ready
                    : 'bg-gray-300 text-gray-600' // Not ready
                }`}>
                  <FiCheck size={14} />
                </div>
                <div>
                  <div className="font-medium text-gray-800 text-sm">Complete</div>
                  <div className="text-xs text-gray-500">
                    {canProcessPayment ? 'Ready to process' : 'Fill required fields'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Order Summary Card */}
          <div className="p-3 border-t border-gray-200">
            <div className="bg-gradient-to-r from-orange-50 to-orange-100 rounded-lg p-3 border border-orange-200">
              <h3 className="font-semibold text-gray-800 mb-2 flex items-center text-sm">
                <FiDollarSign className="mr-2 text-orange-600" size={16} />
                Order Summary
              </h3>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal:</span>
                  <span className="font-medium">₱{subtotal}</span>
                </div>
                {parseFloat(discount) > 0 && (
                  <div className="flex justify-between text-orange-600">
                    <span>PWD/Senior Discount:</span>
                    <span>-₱{discount}</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-bold border-t border-orange-200 pt-1">
                  <span>TOTAL:</span>
                  <span className="text-orange-600">₱{total}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col">
          {/* Content Header */}
          <div className="p-3 border-b border-gray-200 bg-white">
            <h3 className="text-sm font-semibold text-gray-800 mb-1">
              {paymentMethod === 'cash' ? 'Cash Payment' : 
               paymentMethod === 'e-wallet' ? 'E-Wallet Payment' : 
               'Select Payment Method'}
            </h3>
            <p className="text-xs text-gray-500">
              {paymentMethod === 'cash' ? 'Enter the cash amount received from customer' : 
               paymentMethod === 'e-wallet' ? 'Enter e-wallet transaction details' : 
               'Choose how the customer will pay for this order'}
            </p>
          </div>

          {/* Payment Method Selection */}
          {!paymentMethod && (
            <div className="p-4 bg-white">
              <div className="max-w-xl mx-auto">
                <h4 className="font-medium text-gray-800 mb-4">Choose Payment Method</h4>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => setPaymentMethod('cash')}
                    className="p-4 border-2 border-gray-200 rounded-xl hover:border-orange-300 hover:bg-orange-50 transition-all group"
                  >
                    <div className="text-center">
                      <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2 group-hover:bg-green-200">
                        <FiDollarSign className="text-green-600" size={20} />
                      </div>
                      <div className="font-semibold text-gray-800 text-sm">Cash Payment</div>
                      <div className="text-xs text-gray-500">Physical cash transaction</div>
                    </div>
                  </button>
                  
                  <button
                    onClick={() => setPaymentMethod('e-wallet')}
                    className="p-4 border-2 border-gray-200 rounded-xl hover:border-orange-300 hover:bg-orange-50 transition-all group"
                  >
                    <div className="text-center">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2 group-hover:bg-blue-200">
                        <FiCreditCard className="text-blue-600" size={20} />
                      </div>
                      <div className="font-semibold text-gray-800 text-sm">E-Wallet Payment</div>
                      <div className="text-xs text-gray-500">GCash, PayMaya, etc.</div>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Payment Forms */}
          {paymentMethod && (
            <div className="p-2 bg-white">
              <div className="max-w-xl mx-auto space-y-2">
                {/* Customer Name Input */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Customer Name (Optional)
                  </label>
                  <input
                    type="text"
                    value={customerName || ''}
                    onChange={(e) => onCustomerNameChange && onCustomerNameChange(e.target.value)}
                    className="w-full p-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors"
                    placeholder="Enter customer name"
                  />
                </div>

                {/* PWD/Senior Discount Card Details */}
                {parseFloat(discount) > 0 && requiredDiscountCards > 0 && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-medium text-blue-800">
                        PWD/Senior Discount Applied ({requiredDiscountCards} cards needed)
                      </h4>
                      <button
                        onClick={() => setShowDiscountModal(true)}
                        className="text-xs px-2 py-1 bg-blue-200 text-blue-700 rounded hover:bg-blue-300"
                      >
                        {discountCards.every(card => card.cardIdNumber) ? 'Edit Cards' : 'Add Card Details'}
                      </button>
                    </div>
                    
                    <div className="space-y-1">
                      {itemsWithDiscounts.map((item, index) => (
                        <div key={`${item._id}-${item.selectedSize}`} className="text-xs text-blue-700">
                          <div className="font-medium">{item.name} ({item.selectedSize})</div>
                          <div className="text-blue-600 ml-2">
                            {item.pwdSeniorDiscount.discountedQuantity} items need card details
                          </div>
                        </div>
                      ))}
                    </div>

                    {discountCards.length > 0 && discountCards.every(card => card.cardIdNumber) && (
                      <div className="mt-2 pt-2 border-t border-blue-200">
                        <div className="text-xs text-blue-700 font-medium">Cards Provided:</div>
                        {discountCards.map((card, index) => (
                          <div key={index} className="text-xs text-blue-600 ml-2">
                            {card.cardType} - ID: {card.cardIdNumber}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Cash Payment Form */}
                {paymentMethod === 'cash' && (
                  <div className="space-y-2">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Cash Amount Received
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <span className="text-gray-500 text-sm">₱</span>
                        </div>
                        <input
                          type="number"
                          value={cashAmount === 0 ? '' : cashAmount}
                          onChange={(e) => handleCashAmountChange(e.target.value)}
                          className={`w-full pl-8 pr-4 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors ${
                            cashInputError ? 'border-red-500 bg-red-50' : 'border-gray-300'
                          }`}
                          placeholder="0.00"
                          min="0"
                          step="0.01"
                        />
                      </div>
                      {cashInputError && (
                        <div className="text-red-500 text-xs mt-1 flex items-center">
                          <div className="w-3 h-3 rounded-full bg-red-100 flex items-center justify-center mr-1">
                            <span className="text-red-500 text-xs">!</span>
                          </div>
                          {cashInputError}
                        </div>
                      )}
                    </div>

                    {/* Cash Float Display */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-2">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-medium text-blue-800">Available Cash Float:</span>
                        <Badge variant="primary" className="text-xs">₱{formatCurrency(cashFloat)}</Badge>
                      </div>
                      <div className="text-xs text-blue-600 mt-1">Used for providing change to customers</div>
                    </div>

                    {/* Change Display */}
                    {paymentMethod === 'cash' && calculateChange > 0 && !cashInputError && (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-green-800">Change to Return:</span>
                          <span className="text-base font-bold text-green-600">₱{formatCurrency(calculateChange)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* E-Wallet Payment Form */}
                {paymentMethod === 'e-wallet' && (
                  <div className="space-y-2">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        E-Wallet Provider
                      </label>
                      <select
                        value={eWalletDetails?.provider || 'gcash'}
                        onChange={(e) => onEWalletDetailsChange({...eWalletDetails, provider: e.target.value})}
                        className="w-full p-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors"
                      >
                        <option value="gcash">GCash</option>
                        <option value="paymaya">PayMaya</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Reference Number
                        </label>
                        <input
                          type="text"
                          value={eWalletDetails?.referenceNumber || ''}
                          onChange={(e) => {
                            const value = e.target.value.replace(/[^0-9]/g, '');
                            onEWalletDetailsChange({...eWalletDetails, referenceNumber: value});
                          }}
                          className={`w-full p-2 text-sm border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors ${
                            eWalletError && (!eWalletDetails?.referenceNumber || eWalletDetails.referenceNumber.trim() === '') 
                              ? 'border-red-500 bg-red-50' : 'border-gray-300'
                          }`}
                          placeholder="Numbers only"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Account Name
                        </label>
                        <input
                          type="text"
                          value={eWalletDetails?.name || ''}
                          onChange={(e) => onEWalletDetailsChange({...eWalletDetails, name: e.target.value})}
                          className={`w-full p-2 text-sm border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors ${
                            eWalletError && (!eWalletDetails?.name || eWalletDetails.name.trim() === '') 
                              ? 'border-red-500 bg-red-50' : 'border-gray-300'
                          }`}
                          placeholder="Account holder name"
                        />
                      </div>
                    </div>

                    {eWalletError && (
                      <div className="text-red-500 text-xs flex items-center">
                        <div className="w-3 h-3 rounded-full bg-red-100 flex items-center justify-center mr-1">
                          <span className="text-red-500 text-xs">!</span>
                        </div>
                        {eWalletError}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Spacer to push footer to bottom */}
          <div className="flex-1"></div>

          {/* Footer Actions */}
          <div className="p-1 border-t border-gray-200 bg-gray-50">
            <div className="flex gap-1 max-w-xl mx-auto">
              {paymentMethod ? (
                <>
                  <Button
                    variant="secondary"
                    onClick={() => setPaymentMethod('')}
                    className="flex-1 py-1 text-sm"
                  >
                    ← Back
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={onClose}
                    className="flex-1 py-1 text-sm"
                    disabled={isProcessing}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    onClick={handleProcessPayment}
                    className="flex-1 py-1 text-sm bg-orange-500 hover:bg-orange-600"
                    disabled={!canProcessPayment}
                  >
                    {isProcessing ? (
                      <span className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Processing...
                      </span>
                    ) : (
                      `Complete Payment`
                    )}
                  </Button>
                </>
              ) : (
                <Button
                  variant="secondary"
                  onClick={onClose}
                  className="w-full py-1 text-sm"
                >
                  Cancel
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
      </div>

      {/* PWD/Senior Card Details Modal */}
      {showDiscountModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <h3 className="text-lg font-bold mb-4 text-gray-800">
              PWD/Senior Card Details ({requiredDiscountCards} cards needed)
            </h3>
            <p className="text-sm mb-4 text-gray-600">
              Please provide card holder details for each discounted item:
            </p>
            
            {/* Quick Reuse Section */}
            {discountCards.some((card, index) => card.cardType && card.cardIdNumber && 
              discountCards.slice(index + 1).some(laterCard => !laterCard.cardIdNumber)) && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                <h4 className="text-sm font-medium text-green-800 mb-2">
                  Quick Reuse Card Holder
                </h4>
                <p className="text-xs text-green-700 mb-2">
                  Click to reuse an existing card holder for remaining empty cards:
                </p>
                <div className="flex flex-wrap gap-2">
                  {discountCards
                    .filter((card, index) => card.cardType && card.cardIdNumber)
                    .reduce((unique, card) => {
                      const key = `${card.cardType}-${card.cardIdNumber}`;
                      if (!unique.some(u => `${u.cardType}-${u.cardIdNumber}` === key)) {
                        unique.push(card);
                      }
                      return unique;
                    }, [])
                    .map((uniqueCard, uniqueIndex) => (
                      <button
                        key={uniqueIndex}
                        onClick={() => {
                          const newCards = [...discountCards];
                          const emptyCardIndex = newCards.findIndex(c => !c.cardIdNumber);
                          if (emptyCardIndex !== -1) {
                            newCards[emptyCardIndex] = {
                              ...newCards[emptyCardIndex],
                              cardType: uniqueCard.cardType,
                              cardIdNumber: uniqueCard.cardIdNumber
                            };
                            setDiscountCards(newCards);
                          }
                        }}
                        className="px-3 py-1 text-xs bg-green-200 text-green-800 rounded-lg hover:bg-green-300 transition-colors"
                        disabled={!discountCards.some(c => !c.cardIdNumber)}
                      >
                        Reuse: {uniqueCard.cardType} - {uniqueCard.cardIdNumber}
                      </button>
                    ))}
                </div>
              </div>
            )}

            <div className="space-y-4">
              {discountCards.map((card, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-medium text-gray-700">
                      Card {index + 1}
                    </h4>
                    {card.cardIdNumber && (
                      <button
                        onClick={() => {
                          const newCards = [...discountCards];
                          newCards[index] = { ...card, cardType: 'PWD', cardIdNumber: '' };
                          setDiscountCards(newCards);
                        }}
                        className="text-xs text-red-600 hover:text-red-800 underline"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    {/* Card Type Dropdown */}
                    <div>
                      <label className="block text-xs font-medium mb-1 text-gray-600">
                        Card Type:
                      </label>
                      <select
                        value={card.cardType}
                        onChange={(e) => {
                          const newCards = [...discountCards];
                          newCards[index] = { ...card, cardType: e.target.value };
                          setDiscountCards(newCards);
                        }}
                        className="w-full p-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                      >
                        <option value="PWD">PWD (Person with Disability)</option>
                        <option value="Senior Citizen">Senior Citizen</option>
                      </select>
                    </div>

                    {/* ID Number Input */}
                    <div>
                      <label className="block text-xs font-medium mb-1 text-gray-600">
                        ID Number:
                      </label>
                      <input
                        type="text"
                        value={card.cardIdNumber}
                        onChange={(e) => {
                          const newCards = [...discountCards];
                          newCards[index] = { ...card, cardIdNumber: e.target.value };
                          setDiscountCards(newCards);
                        }}
                        placeholder="Enter ID number"
                        className="w-full p-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                      />
                    </div>
                  </div>

                  {/* Show if this card is a duplicate */}
                  {card.cardIdNumber && discountCards.filter(c => 
                    c.cardType === card.cardType && c.cardIdNumber === card.cardIdNumber
                  ).length > 1 && (
                    <div className="mt-2 text-xs text-blue-600 flex items-center">
                      <div className="w-3 h-3 rounded-full bg-blue-100 flex items-center justify-center mr-1">
                        <span className="text-blue-500 text-xs">i</span>
                      </div>
                      This card holder is being used for multiple items
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={() => setShowDiscountModal(false)}
                className="flex-1 px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => setShowDiscountModal(false)}
                className="flex-1 px-4 py-2 text-sm bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50"
                disabled={!discountCards.every(card => card.cardType && card.cardIdNumber.trim())}
              >
                Save All Cards
              </button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
};
