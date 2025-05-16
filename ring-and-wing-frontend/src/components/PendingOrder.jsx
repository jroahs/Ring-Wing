import { useState } from 'react';
import { Button, Badge } from './ui';
import { theme } from '../theme';

const PendingOrder = ({ order, processPayment, colors = theme.colors }) => {  const [isExpanded, setIsExpanded] = useState(false);
  const [localPaymentMethod, setLocalPaymentMethod] = useState('cash');
  const [localCashAmount, setLocalCashAmount] = useState('');
  const [cardDetails, setCardDetails] = useState({ last4: '', name: '' });
  const [eWalletDetails, setEWalletDetails] = useState({ number: '', name: '' });
  
  const orderTotal = order.totals?.total || 
    order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const isCashPayment = localPaymentMethod === 'cash';
  const orderType = order.orderType || 'self_checkout';
  const isFromChatbot = orderType === 'chatbot';

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
          )}

          {/* Order Items */}
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
              }}
            >
              <option value="cash">Cash</option>
              <option value="card">Card</option>
              <option value="e-wallet">E-Wallet</option>
            </select>
          </div>          {isCashPayment && (
            <input
              type="number"
              value={localCashAmount}
              onChange={(e) => {
                const value = e.target.value;
                setLocalCashAmount(value === '' ? '' : Math.max(0, parseFloat(value) || 0));
              }}
              placeholder="Enter cash amount"
              className="w-full p-2 rounded text-sm transition-colors focus:outline-none focus:ring-2"
              style={{
                backgroundColor: colors.background,
                border: '2px solid ' + colors.muted,
                color: colors.primary
              }}
              min="0"
              step="1"
            />
          )}
          
          {localPaymentMethod === 'card' && (
            <div className="space-y-2 mt-3">
              <input
                type="text"
                value={cardDetails.last4}
                onChange={(e) => setCardDetails({...cardDetails, last4: e.target.value})}
                maxLength={4}
                placeholder="Last 4 digits of card"
                className="w-full p-2 rounded text-sm transition-colors focus:outline-none focus:ring-2"
                style={{
                  backgroundColor: colors.background,
                  border: '2px solid ' + colors.muted,
                  color: colors.primary
                }}
              />
              <input
                type="text"
                value={cardDetails.name}
                onChange={(e) => setCardDetails({...cardDetails, name: e.target.value})}
                placeholder="Cardholder name"
                className="w-full p-2 rounded text-sm transition-colors focus:outline-none focus:ring-2"
                style={{
                  backgroundColor: colors.background,
                  border: '2px solid ' + colors.muted,
                  color: colors.primary
                }}
              />
            </div>
          )}
          
          {localPaymentMethod === 'e-wallet' && (
            <div className="space-y-2 mt-3">
              <input
                type="text"
                value={eWalletDetails.number}
                onChange={(e) => setEWalletDetails({...eWalletDetails, number: e.target.value})}
                placeholder="E-wallet number"
                className="w-full p-2 rounded text-sm transition-colors focus:outline-none focus:ring-2"
                style={{
                  backgroundColor: colors.background,
                  border: '2px solid ' + colors.muted,
                  color: colors.primary
                }}
              />
              <input
                type="text"
                value={eWalletDetails.name}
                onChange={(e) => setEWalletDetails({...eWalletDetails, name: e.target.value})}
                placeholder="E-wallet account name"
                className="w-full p-2 rounded text-sm transition-colors focus:outline-none focus:ring-2"
                style={{
                  backgroundColor: colors.background,
                  border: '2px solid ' + colors.muted,
                  color: colors.primary
                }}
              />
            </div>
          )}          <Button
            variant="primary"
            fullWidth
            onClick={() => {
              if (isCashPayment && (!localCashAmount || parseFloat(localCashAmount) < orderTotal)) {
                alert('Cash amount must be at least ₱' + orderTotal.toFixed(2));
                return;
              }
              
              if (localPaymentMethod === 'card' && (!cardDetails.last4 || !cardDetails.name)) {
                alert('Please enter card details');
                return;
              }
              
              if (localPaymentMethod === 'e-wallet' && (!eWalletDetails.number || !eWalletDetails.name)) {
                alert('Please enter e-wallet details');
                return;
              }
                const paymentInfo = {
                method: localPaymentMethod,
                cashAmount: parseFloat(localCashAmount) || 0
              };
              
              if (localPaymentMethod === 'card') {
                paymentInfo.cardDetails = {
                  last4: cardDetails.last4,
                  name: cardDetails.name
                };
              } else if (localPaymentMethod === 'e-wallet') {
                paymentInfo.eWalletDetails = {
                  number: eWalletDetails.number,
                  name: eWalletDetails.name
                };
              }
              
              // Make sure order items have all required fields for OrderItem component
              const enrichedOrder = {
                ...order,
                items: order.items.map(item => ({
                  ...item,
                  availableSizes: item.availableSizes || [item.selectedSize || 'base'],
                  pricing: item.pricing || { [item.selectedSize || 'base']: item.price }
                }))
              };
              
              processPayment(enrichedOrder, paymentInfo);
            }}
            disabled={
              (isCashPayment && !localCashAmount) || 
              (localPaymentMethod === 'card' && (!cardDetails.last4 || !cardDetails.name)) || 
              (localPaymentMethod === 'e-wallet' && (!eWalletDetails.number || !eWalletDetails.name))
            }
          >
            {isCashPayment ? 'Process Payment' : 'Confirm Payment'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PendingOrder;