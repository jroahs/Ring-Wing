import { useState, useEffect, useMemo } from 'react';
import { Button, Badge } from './ui';
import { theme } from '../theme';

const PendingOrder = ({ order, processPayment, cashFloat = 0, colors = theme.colors, customerName = '' }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [localPaymentMethod, setLocalPaymentMethod] = useState('cash');
  const [localCashAmount, setLocalCashAmount] = useState('');
  const [eWalletDetails, setEWalletDetails] = useState({ provider: 'gcash', referenceNumber: '', name: '' });
  const [isDiscountApplied, setIsDiscountApplied] = useState(false);
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  
  // Enhanced validation states
  const [errors, setErrors] = useState({
    cashAmount: '',
    eWallet: ''
  });
  const [isProcessing, setIsProcessing] = useState(false);

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
  const validateCashAmount = (amount, total) => {
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
  };  const validateEWalletDetails = (details) => {
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
  const calculateTotal = () => {
    const subtotal = order.totals?.subtotal || 
      order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const discount = isDiscountApplied ? subtotal * 0.2 : (order.totals?.discount || 0); // Fixed to 20% PWD/Senior discount
    const total = subtotal - discount;
    
    return {
      subtotal: subtotal,
      discount: discount,
      total: total
    };
  };
  
  const totals = calculateTotal();
  const orderTotal = totals.total;
  const isCashPayment = localPaymentMethod === 'cash';
  const orderType = order.orderType || 'self_checkout';
  const isFromChatbot = orderType === 'chatbot';

  // Calculate change with precision handling
  const calculateChange = useMemo(() => {
    if (localPaymentMethod !== 'cash') return 0;
    const numCashAmount = parseCurrency(localCashAmount);
    const numTotal = parseCurrency(orderTotal);
    const change = numCashAmount - numTotal;
    return Math.max(0, change);
  }, [localPaymentMethod, localCashAmount, orderTotal]);

  // Validate cash amount on change
  useEffect(() => {
    if (isCashPayment && localCashAmount) {
      const error = validateCashAmount(localCashAmount, orderTotal);
      setErrors(prev => ({ ...prev, cashAmount: error }));
    } else {
      setErrors(prev => ({ ...prev, cashAmount: '' }));
    }
  }, [localCashAmount, orderTotal, cashFloat, isCashPayment]);

  // Validate e-wallet details
  useEffect(() => {
    if (localPaymentMethod === 'e-wallet') {
      const error = validateEWalletDetails(eWalletDetails);
      setErrors(prev => ({ ...prev, eWallet: error }));
    } else {
      setErrors(prev => ({ ...prev, eWallet: '' }));
    }
  }, [eWalletDetails, localPaymentMethod]);

  // Check if payment can be processed
  const canProcessPayment = useMemo(() => {
    if (isProcessing) return false;
    
    if (isCashPayment) {
      return localCashAmount && errors.cashAmount === '';
    }
    
    if (localPaymentMethod === 'e-wallet') {
      return errors.eWallet === '';
    }
    
    return false;
  }, [localPaymentMethod, localCashAmount, errors, isProcessing, isCashPayment]);

  // Enhanced cash amount change handler
  const handleCashAmountChange = (value) => {
    // Only allow positive numbers and decimals
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setLocalCashAmount(value);
    }
  };

  return (
    <div 
      className="p-4 rounded-lg transition-all"
      style={{ 
        backgroundColor: isFromChatbot ? '#f9f2e8' : colors.activeBg 
      }}
    >
      <div 
        className="flex justify-between mb-2 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium" style={{ color: colors.primary }}>
              Order #{order.receiptNumber}
            </span>
            <Badge variant={isFromChatbot ? "warning" : "accent"}>
              {isFromChatbot ? 'CHATBOT' : 'SELF-CHECKOUT'}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            {/* Only show payment method badge if it's different from status */}
            <Badge variant="secondary">
              {order.status.toUpperCase()}
            </Badge>
            {order.paymentMethod !== order.status && (
              <Badge variant="secondary">
                {order.paymentMethod.toUpperCase()}
              </Badge>
            )}
          </div>
        </div>
        <div className="text-right">
          <span 
            className="block text-sm font-bold" 
            style={{ color: colors.primary }}
          >
            ₱{parseFloat(orderTotal).toFixed(2)}
          </span>
          <span 
            className="text-xs" 
            style={{ color: colors.secondary }}
          >
            {new Date(order.createdAt).toLocaleTimeString()}
          </span>
        </div>
      </div>

      <div 
        className={'overflow-hidden transition-all duration-300 ' + 
          (isExpanded ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0')}
      >
        <div className="space-y-2 pt-3 border-t" style={{ borderColor: colors.muted }}>
          {/* Customer Info (for chatbot orders) */}
          {isFromChatbot && order.customer && (
            <div className="mb-3 p-2 rounded-md bg-white">
              <h4 className="text-sm font-bold mb-1" style={{ color: colors.primary }}>Customer Info:</h4>
              <p className="text-xs" style={{ color: colors.secondary }}>
                Name: {order.customer.name || 'N/A'}
              </p>
              <p className="text-xs" style={{ color: colors.secondary }}>
                Phone: {order.customer.phone || 'N/A'}
              </p>
              {order.customer.tableNumber && (
                <p className="text-xs" style={{ color: colors.secondary }}>
                  Table: {order.customer.tableNumber}
                </p>
              )}
            </div>
          )}          {/* Order Items */}
          {order.items.map((item, index) => (
            <div 
              key={`${item._id || index}-${item.selectedSize}`}
              className="flex justify-between text-sm"
            >
              <span style={{ color: colors.primary }}>
                {item.quantity}x {item.name} ({item.selectedSize})
              </span>
              <span style={{ color: colors.primary }}>
                ₱{(item.price * item.quantity).toFixed(2)}
              </span>
            </div>
          ))}
          
          {/* Order Totals */}
          <div className="mt-2 border-t pt-2" style={{ borderColor: colors.muted + '40' }}>
            <div className="flex justify-between text-sm">
              <span style={{ color: colors.secondary }}>Subtotal:</span>
              <span style={{ color: colors.secondary }}>₱{totals.subtotal.toFixed(2)}</span>
            </div>
              {totals.discount > 0 && (
              <div className="flex justify-between text-sm">
                <span style={{ color: colors.secondary }}>PWD/Senior Discount (20%):</span>
                <span style={{ color: colors.secondary }}>-₱{totals.discount.toFixed(2)}</span>
              </div>
            )}
            
            <div className="flex justify-between text-sm font-bold mt-1">
              <span style={{ color: colors.primary }}>Total:</span>
              <span style={{ color: colors.primary }}>₱{totals.total.toFixed(2)}</span>
            </div>
          </div>          {/* Discount Toggle Button */}
          <div className="mt-3">
            <Button
              variant={isDiscountApplied ? 'primary' : 'secondary'}
              fullWidth
              size="lg"
              className="py-3 text-base font-medium"
              onClick={() => setIsDiscountApplied(!isDiscountApplied)}
            >
              {isDiscountApplied ? 'PWD/Senior Discount Applied (20%)' : 'PWD/Senior Discount (20%)'}
            </Button>
            {isDiscountApplied && (
              <div className="mt-2 text-xs bg-blue-50 px-2 py-1 rounded text-blue-600">
                Card details will be collected during payment processing
              </div>
            )}
          </div>

          <div className="flex gap-2 mt-3">
            <select
              value={localPaymentMethod}
              onChange={(e) => {
                setLocalPaymentMethod(e.target.value);
                if (e.target.value !== 'cash') setLocalCashAmount('');
              }}
              className="flex-1 p-2 rounded text-sm transition-colors focus:outline-none focus:ring-2"
              style={{
                backgroundColor: colors.background,
                border: '2px solid ' + colors.muted,
                color: colors.primary
              }}            >
              <option value="cash">Cash</option>
              <option value="e-wallet">E-Wallet</option>
            </select>
          </div>          {isCashPayment && (
            <div className="mt-3">
              <input
                type="text"
                value={localCashAmount}
                onChange={(e) => handleCashAmountChange(e.target.value)}
                placeholder="Enter cash amount"
                className={`w-full p-2 rounded text-sm transition-colors focus:outline-none focus:ring-2 ${
                  errors.cashAmount ? 'border-red-500 focus:ring-red-300' : 'focus:ring-2'
                }`}
                style={{
                  backgroundColor: colors.background,
                  border: `2px solid ${errors.cashAmount ? '#ef4444' : colors.muted}`,
                  color: colors.primary
                }}
              />
              {errors.cashAmount && (
                <div className="text-red-500 text-xs mt-1">{errors.cashAmount}</div>
              )}
              {localCashAmount && calculateChange > 0 && !errors.cashAmount && (
                <div className="flex justify-between items-center mt-2 p-2 rounded-lg" 
                     style={{ backgroundColor: colors.accent + '20' }}>
                  <span className="text-sm font-medium" style={{ color: colors.primary }}>
                    Change:
                  </span>
                  <span className="text-sm font-bold" style={{ color: colors.secondary }}>
                    ₱{formatCurrency(calculateChange)}
                  </span>
                </div>
              )}
            </div>
          )}          {localPaymentMethod === 'e-wallet' && (
            <div className="space-y-2 mt-3">
              <select
                value={eWalletDetails.provider || 'gcash'}
                onChange={(e) => setEWalletDetails({...eWalletDetails, provider: e.target.value})}
                className="w-full p-2 rounded text-sm transition-colors focus:outline-none focus:ring-2"
                style={{
                  backgroundColor: colors.background,
                  border: `2px solid ${colors.muted}`,
                  color: colors.primary
                }}
              >
                <option value="gcash">GCash</option>
                <option value="paymaya">PayMaya</option>
              </select>              <input
                type="text"
                value={eWalletDetails.referenceNumber}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^0-9]/g, '');
                  setEWalletDetails({...eWalletDetails, referenceNumber: value});
                }}
                placeholder="Reference number (numbers only)"
                className={`w-full p-2 rounded text-sm transition-colors focus:outline-none focus:ring-2 ${
                  errors.eWallet && (!eWalletDetails.referenceNumber || eWalletDetails.referenceNumber.trim() === '') 
                    ? 'border-red-500 focus:ring-red-300' : 'focus:ring-2'
                }`}
                style={{
                  backgroundColor: colors.background,
                  border: `2px solid ${
                    errors.eWallet && (!eWalletDetails.referenceNumber || eWalletDetails.referenceNumber.trim() === '') 
                      ? '#ef4444' : colors.muted
                  }`,
                  color: colors.primary
                }}
              />
              <input
                type="text"
                value={eWalletDetails.name}
                onChange={(e) => setEWalletDetails({...eWalletDetails, name: e.target.value})}
                placeholder="Account name"
                className={`w-full p-2 rounded text-sm transition-colors focus:outline-none focus:ring-2 ${
                  errors.eWallet && (!eWalletDetails.name || eWalletDetails.name.trim() === '') 
                    ? 'border-red-500 focus:ring-red-300' : 'focus:ring-2'
                }`}
                style={{
                  backgroundColor: colors.background,
                  border: `2px solid ${
                    errors.eWallet && (!eWalletDetails.name || eWalletDetails.name.trim() === '') 
                      ? '#ef4444' : colors.muted
                  }`,
                  color: colors.primary
                }}
              />
              {errors.eWallet && (
                <div className="text-red-500 text-xs mt-1">{errors.eWallet}</div>
              )}
            </div>
          )}          <Button
            variant="primary"
            fullWidth
            onClick={async () => {
              if (!canProcessPayment) return;
              
              setIsProcessing(true);
              
              try {
                // Final validation before processing
                if (isCashPayment) {
                  const cashError = validateCashAmount(localCashAmount, orderTotal);
                  if (cashError) {
                    setErrors(prev => ({ ...prev, cashAmount: cashError }));
                    return;
                  }
                }
                
                if (localPaymentMethod === 'e-wallet') {
                  const eWalletError = validateEWalletDetails(eWalletDetails);
                  if (eWalletError) {
                    setErrors(prev => ({ ...prev, eWallet: eWalletError }));
                    return;
                  }
                }                const paymentInfo = {
                  method: localPaymentMethod,
                  cashAmount: parseCurrency(localCashAmount),
                  isDiscountApplied: isDiscountApplied,
                  customerName: customerName || '' // Include customer name in payment info
                };
                  if (localPaymentMethod === 'e-wallet') {
                  paymentInfo.eWalletDetails = {
                    provider: eWalletDetails.provider,
                    referenceNumber: eWalletDetails.referenceNumber.trim(),
                    name: eWalletDetails.name.trim()
                  };
                }

                // Make sure order items have all required fields for OrderItem component
                const enrichedOrder = {
                  ...order,
                  items: order.items.map(item => ({
                    ...item,
                    availableSizes: item.availableSizes || [item.selectedSize || 'base'],
                    pricing: item.pricing || { [item.selectedSize || 'base']: item.price }
                  })),
                  totals: totals // Use our calculated totals that include the discount
                };
                
                await processPayment(enrichedOrder, paymentInfo);
              } catch (error) {
                console.error('Payment processing error:', error);
                // Error handling could be enhanced here with toast notifications
              } finally {
                setIsProcessing(false);
              }
            }}
            disabled={!canProcessPayment}
            className={isProcessing ? 'opacity-75' : ''}
          >
            {isProcessing ? 'Processing...' : (isCashPayment ? 'Process Payment' : 'Confirm Payment')}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PendingOrder;