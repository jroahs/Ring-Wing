import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCart, calculateCartTotals, getCartItemCount } from '../hooks/useCart';

// Mock localStorage
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: vi.fn((key) => store[key] || null),
    setItem: vi.fn((key, value) => {
      store[key] = value.toString();
    }),
    removeItem: vi.fn((key) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    })
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

// Mock console.warn to avoid localStorage error messages in tests
console.warn = vi.fn();

describe('calculateCartTotals', () => {
  it('calculates correct totals for empty cart', () => {
    const result = calculateCartTotals([]);
    expect(result).toEqual({
      subtotal: 0,
      discount: 0,
      total: 0
    });
  });

  it('calculates correct totals for single item', () => {
    const cartItems = [
      { price: 100, quantity: 2 }
    ];
    const result = calculateCartTotals(cartItems);
    expect(result).toEqual({
      subtotal: 200,
      discount: 0,
      total: 200
    });
  });

  it('calculates correct totals for multiple items', () => {
    const cartItems = [
      { price: 100, quantity: 2 },
      { price: 50, quantity: 1 },
      { price: 25, quantity: 3 }
    ];
    const result = calculateCartTotals(cartItems);
    expect(result).toEqual({
      subtotal: 325,
      discount: 0,
      total: 325
    });
  });
});

describe('getCartItemCount', () => {
  it('returns 0 for empty cart', () => {
    expect(getCartItemCount([])).toBe(0);
  });

  it('returns correct count for multiple items', () => {
    const cartItems = [
      { _id: '1', selectedSize: 'base' },
      { _id: '2', selectedSize: 'large' },
      { _id: '1', selectedSize: 'small' }
    ];
    expect(getCartItemCount(cartItems)).toBe(3);
  });
});

describe('useCart hook', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  it('initializes with empty cart', () => {
    const { result } = renderHook(() => useCart());
    
    expect(result.current.cartItems).toEqual([]);
    expect(result.current.itemCount).toBe(0);
    expect(result.current.getTotals()).toEqual({
      subtotal: 0,
      discount: 0,
      total: 0
    });
  });

  it('adds new item to cart', () => {
    const { result } = renderHook(() => useCart());
    
    const testItem = {
      _id: 'item1',
      name: 'Test Burger',
      pricing: { base: 150 },
      category: 'Meals'
    };

    act(() => {
      result.current.addItem(testItem);
    });

    expect(result.current.cartItems).toHaveLength(1);
    expect(result.current.cartItems[0]).toEqual(
      expect.objectContaining({
        _id: 'item1',
        name: 'Test Burger',
        selectedSize: 'base',
        price: 150,
        quantity: 1,
        availableSizes: ['base']
      })
    );
  });

  it('increments quantity for existing item with same size', () => {
    const { result } = renderHook(() => useCart());
    
    const testItem = {
      _id: 'item1',
      name: 'Test Burger',
      pricing: { base: 150 },
      category: 'Meals'
    };

    act(() => {
      result.current.addItem(testItem);
      result.current.addItem(testItem);
    });

    expect(result.current.cartItems).toHaveLength(1);
    expect(result.current.cartItems[0].quantity).toBe(2);
  });

  it('adds separate entry for same item with different size', () => {
    const { result } = renderHook(() => useCart());
    
    const testItem = {
      _id: 'item1',
      name: 'Test Burger',
      pricing: { small: 100, large: 200 },
      category: 'Meals'
    };

    act(() => {
      result.current.addItem(testItem, { size: 'small' });
      result.current.addItem(testItem, { size: 'large' });
    });

    expect(result.current.cartItems).toHaveLength(2);
    expect(result.current.cartItems[0].selectedSize).toBe('small');
    expect(result.current.cartItems[0].price).toBe(100);
    expect(result.current.cartItems[1].selectedSize).toBe('large');
    expect(result.current.cartItems[1].price).toBe(200);
  });

  it('updates quantity correctly', () => {
    const { result } = renderHook(() => useCart());
    
    const testItem = {
      _id: 'item1',
      name: 'Test Burger',
      pricing: { base: 150 },
      category: 'Meals'
    };

    act(() => {
      result.current.addItem(testItem);
    });

    act(() => {
      result.current.updateQuantity('item1', 'base', 2);
    });

    expect(result.current.cartItems[0].quantity).toBe(3);

    act(() => {
      result.current.updateQuantity('item1', 'base', -1);
    });

    expect(result.current.cartItems[0].quantity).toBe(2);
  });

  it('enforces minimum quantity of 1', () => {
    const { result } = renderHook(() => useCart());
    
    const testItem = {
      _id: 'item1',
      name: 'Test Burger',
      pricing: { base: 150 },
      category: 'Meals'
    };

    act(() => {
      result.current.addItem(testItem);
    });

    act(() => {
      result.current.updateQuantity('item1', 'base', -5);
    });

    expect(result.current.cartItems[0].quantity).toBe(1);
  });

  it('updates item size and recalculates price', () => {
    const { result } = renderHook(() => useCart());
    
    const testItem = {
      _id: 'item1',
      name: 'Test Burger',
      pricing: { small: 100, large: 200 },
      category: 'Meals'
    };

    act(() => {
      result.current.addItem(testItem, { size: 'small' });
    });

    expect(result.current.cartItems[0].price).toBe(100);

    act(() => {
      result.current.updateSize('item1', 'small', 'large');
    });

    expect(result.current.cartItems[0].selectedSize).toBe('large');
    expect(result.current.cartItems[0].price).toBe(200);
  });

  it('removes item from cart', () => {
    const { result } = renderHook(() => useCart());
    
    const testItem = {
      _id: 'item1',
      name: 'Test Burger',
      pricing: { base: 150 },
      category: 'Meals'
    };

    act(() => {
      result.current.addItem(testItem);
    });

    expect(result.current.cartItems).toHaveLength(1);

    act(() => {
      result.current.removeItem('item1', 'base');
    });

    expect(result.current.cartItems).toHaveLength(0);
  });

  it('clears entire cart', () => {
    const { result } = renderHook(() => useCart());
    
    const testItem1 = {
      _id: 'item1',
      name: 'Test Burger',
      pricing: { base: 150 },
      category: 'Meals'
    };

    const testItem2 = {
      _id: 'item2',
      name: 'Test Fries',
      pricing: { base: 75 },
      category: 'Sides'
    };

    act(() => {
      result.current.addItem(testItem1);
      result.current.addItem(testItem2);
    });

    expect(result.current.cartItems).toHaveLength(2);

    act(() => {
      result.current.clearCart();
    });

    expect(result.current.cartItems).toHaveLength(0);
  });

  it('calculates totals correctly', () => {
    const { result } = renderHook(() => useCart());
    
    const testItem1 = {
      _id: 'item1',
      name: 'Test Burger',
      pricing: { base: 150 },
      category: 'Meals'
    };

    const testItem2 = {
      _id: 'item2',
      name: 'Test Fries',
      pricing: { base: 75 },
      category: 'Sides'
    };

    act(() => {
      result.current.addItem(testItem1);
      result.current.addItem(testItem1); // quantity = 2
      result.current.addItem(testItem2); // quantity = 1
    });

    const totals = result.current.getTotals();
    expect(totals).toEqual({
      subtotal: 375, // (150 * 2) + (75 * 1)
      discount: 0,
      total: 375
    });
  });

  it('saves to localStorage when cart changes', () => {
    const { result } = renderHook(() => useCart());
    
    const testItem = {
      _id: 'item1',
      name: 'Test Burger',
      pricing: { base: 150 },
      category: 'Meals'
    };

    act(() => {
      result.current.addItem(testItem);
    });

    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'ringwing_cart_v1',
      expect.stringContaining('"_id":"item1"')
    );
  });

  it('loads from localStorage on initialization', () => {
    // Pre-populate localStorage
    const existingCart = [
      {
        _id: 'item1',
        name: 'Test Burger',
        selectedSize: 'base',
        price: 150,
        quantity: 2,
        availableSizes: ['base']
      }
    ];
    
    localStorageMock.setItem('ringwing_cart_v1', JSON.stringify(existingCart));

    const { result } = renderHook(() => useCart());

    expect(result.current.cartItems).toEqual(existingCart);
    expect(result.current.itemCount).toBe(1);
  });
});