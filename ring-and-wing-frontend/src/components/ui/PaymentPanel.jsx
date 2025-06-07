import React, { useState, useEffect, useMemo } from 'react';
import { theme } from '../../theme';
import { Button } from './Button';
import { Badge } from './Badge';

export const PaymentPanel = ({
  total,
  subtotal,
  discount,
  cashFloat,
  paymentMethod,
  cashAmount,
  onPaymentMethodChange,
  onCashAmountChange,
  onProcessPayment,
  onCancelOrder,
  eWalletDetails,
  onEWalletDetailsChange,
  disabled
}) => {
  const [cashInputError, setCashInputError] = useState('');
  const [eWalletError, setEWalletError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  
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
    if (!details?.number || details.number.trim() === '') {
      return 'E-wallet number is required';
    }
    
    if (!details?.name || details.name.trim() === '') {
      return 'E-wallet account name is required';
    }
    
    // Basic e-wallet number format validation
    const numberPattern = /^[0-9+\-\s()]+$/;
    if (!numberPattern.test(details.number)) {
      return 'Invalid e-wallet number format';
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
    if (disabled || isProcessing) return false;
    
    if (paymentMethod === 'cash') {
      return cashAmount > 0 && cashInputError === '';
    }
    
    if (paymentMethod === 'e-wallet') {
      return eWalletError === '';
    }
    
    return false;
  }, [paymentMethod, cashAmount, cashInputError, eWalletError, disabled, isProcessing]);

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
      
      await onProcessPayment();
    } catch (error) {
      console.error('Payment processing error:', error);
      // Error handling could be enhanced here
    } finally {
      setIsProcessing(false);
    }
  };

  // Enhanced cash amount change handler
  const handleCashAmountChange = (value) => {
    const sanitizedValue = value === '' ? 0 : parseCurrency(value);
    onCashAmountChange(sanitizedValue);
  };

  return (    <div className="pt-2 border-t" style={{ borderColor: theme.colors.muted }}>
      <div className="mb-1">
        <span className="text-xs font-medium" style={{ color: theme.colors.primary }}>
          Payment via:
        </span>
      </div>      {/* Payment Methods Row - Remove Discount Button */}      <div className="flex flex-wrap items-center gap-1 mb-1">
        {paymentMethods.map((method, index) => (
          <React.Fragment key={method}>
            <Button
              variant={paymentMethod === method ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => onPaymentMethodChange(method)}
              className="h-7 px-2 text-xs font-medium"
            >
              {method.toUpperCase()}
            </Button>
            {index < paymentMethods.length - 1 && (
              <span className="mx-0.5 text-xs" style={{ color: theme.colors.muted }}>•</span>
            )}
          </React.Fragment>
        ))}
      </div>

      <div className="flex justify-between items-center mb-2"> {/* Reduced mb-3 to mb-2 */}
        <span className="text-xs" style={{ color: theme.colors.primary }}> {/* Reduced text-sm to text-xs */}
          Cash Float:
        </span>
        <Badge variant="accent" className="text-xs px-1 py-0.5">₱{cashFloat.toFixed(2)}</Badge> {/* Adjusted padding & text size */}
      </div>

      {/* Discount button is now in the row above, so this section is removed */}      <div className="space-y-1 mb-3"> {/* Reduced space-y-2 to space-y-1 and mb-4 to mb-3 */}
        <div className="flex justify-between text-sm">
          <span style={{ color: theme.colors.primary }}>Subtotal:</span>
          <span style={{ color: theme.colors.primary }}>₱{subtotal}</span>
        </div>
          {parseFloat(discount) > 0 && (
          <div className="flex justify-between text-sm">
            <span style={{ color: theme.colors.secondary }}>
              PWD/Senior Discount (20%):
            </span>
            <span style={{ color: theme.colors.secondary }}>-₱{discount}</span>
          </div>
        )}

        <div className="flex justify-between text-base font-bold"> {/* Reduced text-lg to text-base */}
          <span style={{ color: theme.colors.primary }}>TOTAL:</span>
          <span style={{ color: theme.colors.primary }}>₱{total}</span>
        </div>
      </div>      {paymentMethod === 'cash' && (
        <div className="mb-2">
          <input
            type="number"
            value={cashAmount === 0 ? '' : cashAmount}
            onChange={(e) => handleCashAmountChange(e.target.value)}
            className={`w-full p-3 text-sm rounded-lg border-2 focus:outline-none transition-colors ${
              cashInputError ? 'border-red-500' : ''
            }`}
            style={{
              borderColor: cashInputError ? '#ef4444' : theme.colors.muted,
              backgroundColor: theme.colors.background,
              color: theme.colors.primary
            }}
            placeholder="Cash amount"
            min="0"
            step="0.01"
          />
          {cashInputError && (
            <div className="text-red-500 text-xs mt-1">{cashInputError}</div>
          )}
          {paymentMethod === 'cash' && calculateChange > 0 && !cashInputError && (
            <div className="flex justify-between items-center mt-2 p-2 rounded-lg" 
                 style={{ backgroundColor: theme.colors.accent + '20' }}>
              <span className="text-sm font-medium" style={{ color: theme.colors.primary }}>
                Change:
              </span>
              <span className="text-sm font-bold" style={{ color: theme.colors.secondary }}>
                ₱{formatCurrency(calculateChange)}
              </span>
            </div>
          )}
        </div>
      )}
        {paymentMethod === 'e-wallet' && (
        <div className="space-y-1 mb-2">
          <input
            type="text"
            value={eWalletDetails?.number || ''}
            onChange={(e) => onEWalletDetailsChange({...eWalletDetails, number: e.target.value})}
            className={`w-full p-3 text-sm rounded-lg border-2 focus:outline-none transition-colors ${
              eWalletError && (!eWalletDetails?.number || eWalletDetails.number.trim() === '') ? 'border-red-500' : ''
            }`}
            style={{
              borderColor: eWalletError && (!eWalletDetails?.number || eWalletDetails.number.trim() === '') 
                ? '#ef4444' : theme.colors.muted,
              backgroundColor: theme.colors.background,
              color: theme.colors.primary
            }}
            placeholder="E-wallet number"
          />
          <input
            type="text"
            value={eWalletDetails?.name || ''}
            onChange={(e) => onEWalletDetailsChange({...eWalletDetails, name: e.target.value})}
            className={`w-full p-3 text-sm rounded-lg border-2 focus:outline-none transition-colors ${
              eWalletError && (!eWalletDetails?.name || eWalletDetails.name.trim() === '') ? 'border-red-500' : ''
            }`}
            style={{
              borderColor: eWalletError && (!eWalletDetails?.name || eWalletDetails.name.trim() === '') 
                ? '#ef4444' : theme.colors.muted,
              backgroundColor: theme.colors.background,
              color: theme.colors.primary
            }}
            placeholder="E-wallet account name"
          />
          {eWalletError && (
            <div className="text-red-500 text-xs mt-1">{eWalletError}</div>
          )}
        </div>
      )}

      <div className="flex gap-2">
        <Button
          variant="danger"
          onClick={onCancelOrder}
          fullWidth
          size="sm" // Added size sm for consistency
          className="py-1.5" // Adjusted padding
        >
          Cancel Order
        </Button>        <Button
          variant="primary"
          onClick={handleProcessPayment}
          disabled={!canProcessPayment}
          fullWidth
          size="sm"
          className={`py-1.5 ${isProcessing ? 'opacity-75' : ''}`}
        >
          {isProcessing ? 'PROCESSING...' : 'PROCESS PAYMENT'}
        </Button>
      </div>
    </div>
  );
};