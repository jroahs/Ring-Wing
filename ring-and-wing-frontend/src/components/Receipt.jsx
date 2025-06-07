import React, { useState, useEffect } from 'react';
import { theme } from '../theme';

export const Receipt = React.forwardRef(({ order, totals, paymentMethod }, ref) => {
  const [staffName, setStaffName] = useState('');
  
  useEffect(() => {
    try {
      const userData = localStorage.getItem('userData');
      if (userData) {
        const user = JSON.parse(userData);
        setStaffName(user.username || '');
      }
    } catch (error) {
      console.error('Error retrieving staff info:', error);
    }
  }, []);
  
  const formattedDate = new Date().toLocaleTimeString([], { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: true
  });

  return (
    <div ref={ref} className="text-sm p-6" style={{ backgroundColor: theme.colors.background }}>
      <div className="text-center">
        <h2 
          className="text-lg md:text-xl font-semibold" 
          style={{ color: theme.colors.primary }}
        >
          Ring & Wings
        </h2>
        <p 
          className="text-sm md:text-base" 
          style={{ color: theme.colors.secondary }}
        >
          Thank You
        </p>
      </div>
      
      <div 
        className="flex flex-col md:flex-row mt-2 md:mt-4" 
        style={{ color: theme.colors.primary }}      >
        <div className="flex-grow">No: {order.receiptNumber}</div>
        <div className="mt-1 md:mt-0">{formattedDate}</div>
      </div>
      
      {/* Cashier/Staff Name */}
      <div style={{ color: theme.colors.primary }} className="my-1 text-sm">
        <span className="font-medium">Staff: </span>
        <span>{staffName || 'Cashier'}</span>
      </div>

      <hr className="my-2" style={{ borderColor: theme.colors.muted }}/>

      <table className="w-full">
        <thead>
          <tr style={{ backgroundColor: theme.colors.primary }}>
            <th className="py-1 w-1/12 text-center text-white">#</th>
            <th className="py-1 text-left text-white">Item</th>
            <th className="py-1 w-2/12 text-center text-white">Qty</th>
            <th className="py-1 w-3/12 text-right text-white">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          {order.items.map((item, index) => (
            <tr 
              key={item._id + '-' + item.selectedSize}
              style={{ borderColor: theme.colors.muted }}
            >
              <td 
                className="py-1 md:py-2 text-center" 
                style={{ color: theme.colors.primary }}
              >
                {index + 1}
              </td>
              <td 
                className="py-1 md:py-2 text-left" 
                style={{ color: theme.colors.primary }}
              >
                {item.name} ({item.selectedSize})<br/>
                <small style={{ color: theme.colors.secondary }}>
                  ₱{item.price.toFixed(2)}
                </small>
              </td>
              <td 
                className="py-1 md:py-2 text-center" 
                style={{ color: theme.colors.primary }}
              >
                {item.quantity}
              </td>
              <td 
                className="py-1 md:py-2 text-right" 
                style={{ color: theme.colors.primary }}
              >
                ₱{(item.quantity * item.price).toFixed(2)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <hr className="my-2" style={{ borderColor: theme.colors.muted }}/>

      <div 
        className="flex justify-between font-semibold text-sm" 
        style={{ color: theme.colors.primary }}
      >
        <span>Subtotal:</span>
        <span>₱{totals.subtotal}</span>
      </div>      {parseFloat(totals.discount) > 0 && (
        <div 
          className="flex justify-between text-sm" 
          style={{ color: theme.colors.secondary }}
        >
          <span>PWD/Senior Discount (20%):</span>
          <span>-₱{totals.discount}</span>
        </div>
      )}<div 
        className="flex justify-between text-sm" 
        style={{ color: theme.colors.primary }}
      >
        <span>Payment Method:</span>
        <span>{paymentMethod.toUpperCase()}</span>
      </div>

      {paymentMethod === 'cash' && (
        <>
          <div 
            className="flex justify-between text-sm" 
            style={{ color: theme.colors.primary }}
          >
            <span>Cash Received:</span>
            <span>₱{totals.cashReceived}</span>
          </div>
          <div 
            className="flex justify-between text-sm" 
            style={{ color: theme.colors.primary }}
          >
            <span>Change:</span>
            <span>₱{totals.change}</span>
          </div>        </>
      )}

      {paymentMethod === 'e-wallet' && totals.eWalletNumber && (
        <>
          <div 
            className="flex justify-between text-sm" 
            style={{ color: theme.colors.primary }}
          >
            <span>E-wallet Number:</span>
            <span>{totals.eWalletNumber}</span>
          </div>
          <div 
            className="flex justify-between text-sm" 
            style={{ color: theme.colors.primary }}
          >
            <span>Account Name:</span>
            <span>{totals.eWalletName}</span>
          </div>
        </>
      )}

      <div 
        className="flex justify-between font-bold mt-1" 
        style={{ color: theme.colors.primary }}
      >
        <span>TOTAL</span>
        <span>₱{totals.total}</span>
      </div>
    </div>
  );
});