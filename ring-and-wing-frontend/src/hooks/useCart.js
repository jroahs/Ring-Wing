import { useReducer, useCallback, useEffect } from 'react';

// Cart action types
const CART_ACTIONS = {
  ADD_ITEM: 'ADD_ITEM',
  UPDATE_QUANTITY: 'UPDATE_QUANTITY', 
  UPDATE_SIZE: 'UPDATE_SIZE',
  REMOVE_ITEM: 'REMOVE_ITEM',
  REPLACE_ITEM: 'REPLACE_ITEM',
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
      const { item, selectedSize, variant, addOns, quantity, notes } = action.payload;
      
      // Sanitize variant to prevent circular references (only keep serializable data)
      const sanitizedVariant = variant ? {
        name: String(variant.name || ''),
        priceAdjustment: Number(variant.priceAdjustment) || 0
      } : null;
      
      // Sanitize addOns to prevent circular references
      const sanitizedAddOns = Array.isArray(addOns) ? addOns.map(addon => ({
        _id: String(addon._id || ''),
        name: String(addon.name || ''),
        price: Number(addon.price) || 0
      })) : [];
      
      // Sanitize notes (max 150 chars)
      const sanitizedNotes = typeof notes === 'string' ? notes.slice(0, 150).trim() : '';
      
      // Create a unique key that includes variant, addOns, and notes for matching
      const variantKey = sanitizedVariant ? JSON.stringify(sanitizedVariant) : '';
      const addOnsKey = sanitizedAddOns.length > 0 ? JSON.stringify(sanitizedAddOns.map(a => a._id).sort()) : '';
      const notesKey = sanitizedNotes;
      
      // Check if item with same size, variant, addOns, and notes already exists
      const existingIndex = state.findIndex(cartItem => {
        const cartVariantKey = cartItem.variant ? JSON.stringify(cartItem.variant) : '';
        const cartAddOnsKey = cartItem.addOns?.length > 0 ? JSON.stringify(cartItem.addOns.map(a => a._id).sort()) : '';
        const cartNotesKey = cartItem.notes || '';
        return cartItem._id === item._id && 
               cartItem.selectedSize === selectedSize &&
               cartVariantKey === variantKey &&
               cartAddOnsKey === addOnsKey &&
               cartNotesKey === notesKey;
      });
      
      if (existingIndex >= 0) {
        // Increment quantity of existing item
        return state.map((cartItem, index) => 
          index === existingIndex 
            ? { ...cartItem, quantity: cartItem.quantity + (quantity || 1) }
            : cartItem
        );
      } else {
        // Add new item to cart - only include serializable properties
        const cartItem = {
          _id: item._id,
          name: String(item.name || ''),
          category: String(item.category || ''),
          description: String(item.description || ''),
          image: item.image || '',
          price: Number(item.pricing?.[selectedSize]) || 0,
          selectedSize: String(selectedSize),
          availableSizes: Object.keys(item.pricing || {}),
          pricing: { ...item.pricing },
          modifiers: Array.isArray(item.modifiers) ? [...item.modifiers] : [],
          variant: sanitizedVariant,
          addOns: sanitizedAddOns,
          notes: sanitizedNotes,
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

    case CART_ACTIONS.REPLACE_ITEM: {
      const { oldItemId, oldSelectedSize, newItem, selectedSize, variant, addOns, quantity, notes } = action.payload;
      
      // Sanitize variant to prevent circular references
      const sanitizedVariant = variant ? {
        name: String(variant.name || ''),
        priceAdjustment: Number(variant.priceAdjustment) || 0
      } : null;
      
      // Sanitize addOns to prevent circular references
      const sanitizedAddOns = Array.isArray(addOns) ? addOns.map(addon => ({
        _id: String(addon._id || ''),
        name: String(addon.name || ''),
        price: Number(addon.price) || 0
      })) : [];
      
      // Sanitize notes (max 150 chars)
      const sanitizedNotes = typeof notes === 'string' ? notes.slice(0, 150).trim() : '';

      // Find the index of the item to replace
      const indexToReplace = state.findIndex(cartItem => 
        cartItem._id === oldItemId && cartItem.selectedSize === oldSelectedSize
      );

      if (indexToReplace === -1) {
        // Item not found, just add it as new
        const cartItem = {
          _id: newItem._id,
          name: String(newItem.name || ''),
          category: String(newItem.category || ''),
          description: String(newItem.description || ''),
          image: newItem.image || '',
          price: Number(newItem.pricing?.[selectedSize]) || 0,
          selectedSize: String(selectedSize),
          availableSizes: Object.keys(newItem.pricing || {}),
          pricing: { ...newItem.pricing },
          modifiers: Array.isArray(newItem.modifiers) ? [...newItem.modifiers] : [],
          variant: sanitizedVariant,
          addOns: sanitizedAddOns,
          notes: sanitizedNotes,
          quantity: quantity || 1
        };
        return [...state, cartItem];
      }

      // Replace the item at the found index
      const newCartItem = {
        _id: newItem._id,
        name: String(newItem.name || ''),
        category: String(newItem.category || ''),
        description: String(newItem.description || ''),
        image: newItem.image || '',
        price: Number(newItem.pricing?.[selectedSize]) || 0,
        selectedSize: String(selectedSize),
        availableSizes: Object.keys(newItem.pricing || {}),
        pricing: { ...newItem.pricing },
        modifiers: Array.isArray(newItem.modifiers) ? [...newItem.modifiers] : [],
        variant: sanitizedVariant,
        addOns: sanitizedAddOns,
        notes: sanitizedNotes,
        quantity: quantity || 1
      };

      return state.map((cartItem, index) => 
        index === indexToReplace ? newCartItem : cartItem
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
        notes: options.notes || '',
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

  // Replace an existing cart item (for editing)
  const replaceItem = useCallback((oldItemId, oldSelectedSize, newItem, options = {}) => {
    const sizes = Object.keys(newItem.pricing);
    const selectedSize = options.size || (sizes.includes('base') ? 'base' : sizes[0]);
    
    dispatch({
      type: CART_ACTIONS.REPLACE_ITEM,
      payload: {
        oldItemId,
        oldSelectedSize,
        newItem,
        selectedSize,
        variant: options.variant || null,
        addOns: options.addOns || [],
        notes: options.notes || '',
        quantity: options.quantity || 1
      }
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
    replaceItem,
    clearCart,
    getTotals,
    itemCount: itemCount()
  };
};

export default useCart;