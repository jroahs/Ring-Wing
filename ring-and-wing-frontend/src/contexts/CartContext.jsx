import React, { createContext, useContext } from 'react';
import { useCart } from '../hooks/useCart';

// Create cart context
const CartContext = createContext(null);

// CartProvider component
export const CartProvider = ({ children }) => {
  const cart = useCart();
  
  return (
    <CartContext.Provider value={cart}>
      {children}
    </CartContext.Provider>
  );
};

// Custom hook to use cart context
export const useCartContext = () => {
  const context = useContext(CartContext);
  
  if (!context) {
    throw new Error('useCartContext must be used within a CartProvider');
  }
  
  return context;
};

export default CartProvider;