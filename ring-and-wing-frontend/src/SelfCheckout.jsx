import React, { useState, useEffect, useMemo } from 'react';
import PropTypes from 'prop-types';
import { API_URL } from './App';
import { AlternativesModal } from './components/ui/AlternativesModal';
import { useAlternatives } from './hooks/useAlternatives';
import SelfCheckoutAIAssistant from './components/ui/SelfCheckoutAIAssistant';
import { CartProvider, useCartContext } from './contexts/CartContext';
import { MenuProvider, useMenuContext } from './contexts/MenuContext';
import LayoutSelector from './components/layouts/LayoutSelector';

const colors = {
  primary: '#2e0304',
  background: '#fefdfd',
  accent: '#f1670f',
  secondary: '#853619',
  muted: '#ac9c9b',
  activeBg: '#f1670f20',
  activeBorder: '#f1670f',
  hoverBg: '#f1670f10'
};

const Receipt = React.forwardRef(({ order, totals }, ref) => {
  return (
    <div ref={ref} className="text-xs p-6" style={{ backgroundColor: colors.background }}>
      <div className="text-center">
        <h2 className="text-xl font-semibold" style={{ color: colors.primary }}>Ring & Wings</h2>
        <p style={{ color: colors.secondary }}>Thank You</p>
      </div>
      <div className="flex mt-4" style={{ color: colors.primary }}>
        <div className="flex-grow">No: {order.receiptNumber}</div>
        <div>{new Date().toLocaleString()}</div>
      </div>
      <hr className="my-2" style={{ borderColor: colors.muted }}/>
      <table className="w-full">
        <thead>
          <tr style={{ backgroundColor: colors.primary }}>
            <th className="py-1 w-1/12 text-center text-white">#</th>
            <th className="py-1 text-left text-white">Item</th>
            <th className="py-1 w-2/12 text-center text-white">Qty</th>
            <th className="py-1 w-3/12 text-right text-white">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          {order.items.map((item, index) => (
            <tr key={`${item._id}-${item.selectedSize}`} style={{ borderColor: colors.muted }}>
              <td className="py-2 text-center" style={{ color: colors.primary }}>{index + 1}</td>
              <td className="py-2 text-left" style={{ color: colors.primary }}>
                {item.name} ({item.selectedSize})<br/>
                <small style={{ color: colors.secondary }}>₱{item.price.toFixed(2)}</small>
              </td>
              <td className="py-2 text-center" style={{ color: colors.primary }}>{item.quantity}</td>
              <td className="py-2 text-right" style={{ color: colors.primary }}>₱{(item.quantity * item.price).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <hr className="my-2" style={{ borderColor: colors.muted }}/>
      <div className="flex justify-between font-semibold text-sm" style={{ color: colors.primary }}>
        <span>Subtotal:</span>
        <span>₱{totals.subtotal}</span>
      </div>
      <div className="flex justify-between font-bold mt-1" style={{ color: colors.primary }}>
        <span>TOTAL</span>
        <span>₱{totals.total}</span>
      </div>
    </div>
  );
});

Receipt.propTypes = {
  order: PropTypes.shape({
    items: PropTypes.array.isRequired,
    receiptNumber: PropTypes.string.isRequired
  }).isRequired,
  totals: PropTypes.object.isRequired
};

const SelfCheckout = () => {
  return (
    <MenuProvider>
      <CartProvider>
        <SelfCheckoutContent />
      </CartProvider>
    </MenuProvider>
  );
};

const SelfCheckoutContent = () => {
  // Get cart functionality from context
  const { 
    cartItems, 
    clearCart, 
    getTotals
  } = useCartContext();

  const [orderNumber, setOrderNumber] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [orderSubmitted, setOrderSubmitted] = useState(false);

  const calculateTotal = () => {
    return getTotals();
  };

  const saveOrderToDB = async () => {
    const calculatedTotals = calculateTotal();
    
    const orderData = {
      items: cartItems.map(item => ({
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        selectedSize: item.selectedSize
      })),
      totals: {
        subtotal: calculatedTotals.subtotal,
        total: calculatedTotals.total
      },
      paymentMethod: 'pending',
      orderType: 'self_checkout',
      status: 'pending'
    };
  
    try {
      const response = await fetch(`${API_URL}/api/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData)
      });
      const data = await response.json();
      setOrderNumber(data.data.receiptNumber);
      setOrderSubmitted(true);
    } catch (error) {
      alert('Failed to submit order. Please try again.');
    }
  };

  const processOrder = async () => {
    if (cartItems.length === 0) {
      alert('Please add items to your order');
      return;
    }
    await saveOrderToDB();
    clearCart();
  };

  return (
    <LayoutSelector
      searchTerm={searchTerm}
      onSearchChange={setSearchTerm}
      orderNumber={orderNumber}
      orderSubmitted={orderSubmitted}
      onProcessOrder={processOrder}
    />
  );
};

export default SelfCheckout;