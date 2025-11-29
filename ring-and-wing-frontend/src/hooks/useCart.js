import { useReducer, useCallback, useEffect } from 'react';

// Cart action types
const CART_ACTIONS = {
  ADD_ITEM: 'ADD_ITEM',
  UPDATE_QUANTITY: 'UPDATE_QUANTITY', 
  UPDATE_SIZE: 'UPDATE_SIZE',
  REMOVE_ITEM: 'REMOVE_ITEM',
  CLEAR_CART: 'CLEAR_CART',
  LOAD_FROM_STORAGE: 'LOAD_FROM_STORAGE'
};

// localStorage key for cart persistence
const CART_STORAGE_KEY = 'ringwing_cart_v1';

// Pure function to calculate totals (easily testable)
export const calculateCartTotals = (cartItems) => {
  const subtotal = cartItems.reduce((sum, item) => {
    // Base price * quantity
    let itemTotal = item.price * item.quantity;
    // Add variant price adjustment if any
    if (item.variant?.priceAdjustment) {
      itemTotal += item.variant.priceAdjustment * item.quantity;
    }
    // Add add-ons prices
    if (item.addOns?.length > 0) {
      const addOnsTotal = item.addOns.reduce((sum, addon) => sum + (addon.price || 0), 0);
      itemTotal += addOnsTotal * item.quantity;
    }
    return sum + itemTotal;
  }, 0);
  const discount = 0; // Can be extended later
  return {
    subtotal,
    discount,
    total: subtotal - discount
  };
};

// Pure function to get cart item count
export const getCartItemCount = (cartItems) => {
  return cartItems.length;
};

// Cart reducer function
const cartReducer = (state, action) => {
  switch (action.type) {
    case CART_ACTIONS.ADD_ITEM: {
      const { item, selectedSize, variant, addOns, quantity } = action.payload;
      
      // Create a unique key that includes variant and addOns for matching
      const variantKey = variant ? JSON.stringify(variant) : '';
      const addOnsKey = addOns?.length > 0 ? JSON.stringify(addOns.map(a => a._id).sort()) : '';
      
      // Check if item with same size, variant, and addOns already exists
      const existingIndex = state.findIndex(cartItem => {
        const cartVariantKey = cartItem.variant ? JSON.stringify(cartItem.variant) : '';
        const cartAddOnsKey = cartItem.addOns?.length > 0 ? JSON.stringify(cartItem.addOns.map(a => a._id).sort()) : '';
        return cartItem._id === item._id && 
               cartItem.selectedSize === selectedSize &&
               cartVariantKey === variantKey &&
               cartAddOnsKey === addOnsKey;
      });
      
      if (existingIndex >= 0) {
        // Increment quantity of existing item
        return state.map((cartItem, index) => 
          index === existingIndex 
            ? { ...cartItem, quantity: cartItem.quantity + (quantity || 1) }
            : cartItem
        );
      } else {
        // Add new item to cart
        const cartItem = {
          ...item,
          price: item.pricing[selectedSize],
          selectedSize,
          availableSizes: Object.keys(item.pricing),
          pricing: item.pricing,
          variant: variant || null,
          addOns: addOns || [],
          quantity: quantity || 1
        };
        return [...state, cartItem];
      }
    }
    
    case CART_ACTIONS.UPDATE_QUANTITY: {
      const { itemId, selectedSize, delta } = action.payload;
      
      return state.map(cartItem => 
        cartItem._id === itemId && cartItem.selectedSize === selectedSize
          ? { ...cartItem, quantity: Math.max(1, cartItem.quantity + delta) }
          : cartItem
      );
    }
    
    case CART_ACTIONS.UPDATE_SIZE: {
      const { itemId, oldSize, newSize } = action.payload;
      
      return state.map(cartItem => 
        cartItem._id === itemId && cartItem.selectedSize === oldSize
          ? { 
              ...cartItem, 
              selectedSize: newSize, 
              price: cartItem.pricing[newSize] 
            }
          : cartItem
      );
    }
    
    case CART_ACTIONS.REMOVE_ITEM: {
      const { itemId, selectedSize } = action.payload;
      
      return state.filter(cartItem => 
        !(cartItem._id === itemId && cartItem.selectedSize === selectedSize)
      );
    }
    
    case CART_ACTIONS.CLEAR_CART:
      return [];
      
    case CART_ACTIONS.LOAD_FROM_STORAGE:
      return action.payload || [];
    
    default:
      return state;
  }
};

// Save cart to localStorage
const saveCartToStorage = (cartItems) => {
  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartItems));
  } catch (error) {
    console.warn('Failed to save cart to localStorage:', error);
  }
};

// Load cart from localStorage  
const loadCartFromStorage = () => {
  try {
    const stored = localStorage.getItem(CART_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.warn('Failed to load cart from localStorage:', error);
    return [];
  }
};

// Main useCart hook
export const useCart = () => {
  const [cartItems, dispatch] = useReducer(cartReducer, []);
  
  // Initialize cart from localStorage on mount
  useEffect(() => {
    const storedCart = loadCartFromStorage();
    dispatch({ type: CART_ACTIONS.LOAD_FROM_STORAGE, payload: storedCart });
  }, []);
  
  // Save to localStorage whenever cart changes
  useEffect(() => {
    saveCartToStorage(cartItems);
  }, [cartItems]);
  
  // Add item to cart (matches original addToOrder behavior)
  const addItem = useCallback((item, options = {}) => {
    const sizes = Object.keys(item.pricing);
    const selectedSize = options.size || (sizes.includes('base') ? 'base' : sizes[0]);
    
    dispatch({ 
      type: CART_ACTIONS.ADD_ITEM, 
      payload: { 
        item, 
        selectedSize,
        variant: options.variant || null,
        addOns: options.addOns || [],
        quantity: options.quantity || 1
      } 
    });
  }, []);
  
  // Update item quantity (matches original updateQuantity behavior)
  const updateQuantity = useCallback((itemId, selectedSize, delta) => {
    dispatch({ 
      type: CART_ACTIONS.UPDATE_QUANTITY, 
      payload: { itemId, selectedSize, delta } 
    });
  }, []);
  
  // Update item size (matches original updateSize behavior)
  const updateSize = useCallback((itemId, oldSize, newSize) => {
    dispatch({ 
      type: CART_ACTIONS.UPDATE_SIZE, 
      payload: { itemId, oldSize, newSize } 
    });
  }, []);
  
  // Remove item from cart
  const removeItem = useCallback((itemId, selectedSize) => {
    dispatch({ 
      type: CART_ACTIONS.REMOVE_ITEM, 
      payload: { itemId, selectedSize } 
    });
  }, []);
  
  // Clear entire cart
  const clearCart = useCallback(() => {
    dispatch({ type: CART_ACTIONS.CLEAR_CART });
  }, []);
  
  // Get calculated totals (memoized)
  const getTotals = useCallback(() => {
    return calculateCartTotals(cartItems);
  }, [cartItems]);
  
  // Get item count (memoized)
  const itemCount = useCallback(() => {
    return getCartItemCount(cartItems);
  }, [cartItems]);
  
  return {
    cartItems,
    addItem,
    updateQuantity,
    updateSize, 
    removeItem,
    clearCart,
    getTotals,
    itemCount: itemCount()
  };
};

export default useCart;