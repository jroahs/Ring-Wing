// Enhanced POS Integration with Inventory Availability
// This file contains the code additions needed for PointofSale.jsx

// 1. Add these imports at the top of PointofSale.jsx
import { useInventoryAvailability } from './hooks/useInventoryAvailability';
import { 
  AvailabilityIndicator, 
  InventoryAlert, 
  OrderAvailabilityStatus 
} from './components/ui/InventoryStatus';

// 2. Add these state variables after existing useState declarations
const [showInventoryAlert, setShowInventoryAlert] = useState(null);
const [inventoryOverrideReason, setInventoryOverrideReason] = useState('');
const [checkingAvailability, setCheckingAvailability] = useState(false);

// 3. Add inventory availability hook after existing hooks
const {
  menuItemsWithAvailability,
  orderAvailability,
  availabilitySummary,
  loading: inventoryLoading,
  error: inventoryError,
  checkItemAvailability,
  checkOrderAvailability,
  processOrderWithInventory,
  requestManagerOverride,
  refreshAllAvailability
} = useInventoryAvailability(menuItems);

// 4. Replace the existing addToOrder function with this enhanced version
const addToOrder = async (item) => {
  // Check availability before adding to cart
  setCheckingAvailability(true);
  
  try {
    const availability = await checkItemAvailability(item._id, 1);
    
    // If item is not available and user is not manager, show alert and prevent addition
    if (!availability.available && !isManager) {
      setShowInventoryAlert({
        ...availability,
        menuItemName: item.name
      });
      setCheckingAvailability(false);
      return;
    }
    
    // If item has warnings, show them but allow addition
    if (availability.warnings && availability.warnings.length > 0) {
      const shouldContinue = window.confirm(
        `Warning: ${availability.warnings.join(', ')}. Continue adding this item?`
      );
      if (!shouldContinue) {
        setCheckingAvailability(false);
        return;
      }
    }
  } catch (error) {
    console.error('Error checking availability:', error);
    // Continue with order if availability check fails (graceful degradation)
  }
  
  setCheckingAvailability(false);

  // If in pending orders view, only allow adding items when editing a pending order
  if (orderViewType === 'pending') {
    if (!isPendingOrderMode) {
      alert('Please select a pending order to add items to.');
      return;
    }
    
    const sizes = Object.keys(item.pricing);
    const basePrice = item.pricing.base || item.pricing[sizes[0]];
    const selectedSize = sizes.includes('base') ? 'base' : sizes[0];

    const orderItem = {
      ...item,
      price: basePrice,
      selectedSize,
      availableSizes: sizes,
      quantity: 1
    };

    // Update pending order items
    const existing = pendingOrderItems.find(
      i => i._id === item._id && i.selectedSize === selectedSize
    );

    if (existing) {
      setPendingOrderItems(pendingOrderItems.map(i =>
        i._id === item._id && i.selectedSize === selectedSize
          ? { ...i, quantity: i.quantity + 1 }
          : i
      ));
    } else {
      setPendingOrderItems([...pendingOrderItems, orderItem]);
    }
    return;
  }

  // Regular order handling (only for non-pending orders)
  const sizes = Object.keys(item.pricing);
  const basePrice = item.pricing.base || item.pricing[sizes[0]];
  const selectedSize = sizes.includes('base') ? 'base' : sizes[0];

  const orderItem = {
    ...item,
    price: basePrice,
    selectedSize,
    availableSizes: sizes,
    quantity: 1
  };

  const [currentCart, setCart] = orderViewType === 'ready' ? 
    [readyOrderCart, setReadyOrderCart] : 
    [pendingOrderCart, setPendingOrderCart];

  const existing = currentCart.find(
    i => i._id === item._id && i.selectedSize === selectedSize
  );

  if (existing) {
    setCart(
      currentCart.map(i =>
        i._id === item._id && i.selectedSize === selectedSize
          ? { ...i, quantity: i.quantity + 1 }
          : i
      )
    );
  } else {
    setCart([...currentCart, orderItem]);
  }

  // Keep currentOrder in sync for backward compatibility
  setCurrentOrder(orderViewType === 'ready' ? readyOrderCart : pendingOrderCart);
};

// 5. Add this useEffect to check order availability when cart changes
useEffect(() => {
  const currentCart = orderViewType === 'ready' ? readyOrderCart : pendingOrderCart;
  if (currentCart.length > 0) {
    const debounceTimer = setTimeout(() => {
      checkOrderAvailability(currentCart);
    }, 500); // Debounce to avoid too frequent calls

    return () => clearTimeout(debounceTimer);
  } else {
    setOrderAvailability(null);
  }
}, [readyOrderCart, pendingOrderCart, orderViewType, checkOrderAvailability]);

// 6. Enhanced processPayment function with inventory integration
const processPaymentWithInventory = async (paymentDetails = null) => {
  const currentCart = orderViewType === 'ready' ? readyOrderCart : pendingOrderCart;
  const setCart = orderViewType === 'ready' ? setReadyOrderCart : setPendingOrderCart;
  
  if (currentCart.length === 0) {
    alert('No items in cart to process');
    return;
  }

  const totals = calculateTotal();
  const cashValue = paymentDetails?.cashAmount ? parseFloat(paymentDetails.cashAmount) : parseFloat(cashAmount);
  const totalDue = parseFloat(totals.total);
  const currentPaymentMethod = paymentDetails?.method || paymentMethod;

  if (currentPaymentMethod === 'cash') {
    const changeValidation = validateChange(cashValue, totalDue);
    if (!changeValidation.valid) {
      alert(changeValidation.message);
      return;
    }
  }

  try {
    setShowPaymentProcessingModal(true);
    
    // Prepare order data for inventory integration
    const orderData = {
      items: currentCart.map(item => ({
        menuItemId: item._id,
        quantity: item.quantity,
        size: item.selectedSize,
        price: item.price
      })),
      paymentMethod: currentPaymentMethod,
      totals: {
        subtotal: totals.subtotal,
        discount: totals.discount,
        total: totalDue
      },
      customerName: customerName || '',
      orderType: orderViewType
    };

    // Process order with inventory integration
    const result = await processOrderWithInventory(orderData);
    
    setShowReceipt(true);
    
    // Continue with existing payment processing
    await new Promise(resolve => setTimeout(resolve, 100));
    await handlePrint();
    await saveOrderToDB(result.orderId); // Pass the order ID from inventory service

    if (currentPaymentMethod === 'cash') {
      console.log('Processing cash transaction:', { paymentMethod: currentPaymentMethod, cashValue, totalDue });
      await processTransaction(cashValue, totalDue, 'pos_order');
      console.log('Cash transaction processed successfully');
    }

    // Clear cart and reset state
    setCart([]);
    setCurrentOrder([]);
    setCashAmount(0);
    setSearchTerm('');
    setShowReceipt(false);
    setEWalletDetails({ provider: 'gcash', referenceNumber: '', name: '' });
    setCustomerName('');

    alert('Order completed successfully with inventory tracking!');
    
  } catch (error) {
    console.error('Payment processing with inventory error:', error);
    
    // If inventory error and user is manager, offer override option
    if (error.message.includes('inventory') && isManager) {
      const shouldOverride = window.confirm(
        `Inventory error: ${error.message}\n\nAs a manager, would you like to override this restriction?`
      );
      
      if (shouldOverride) {
        const reason = prompt('Please provide a reason for this override:');
        if (reason) {
          try {
            await requestManagerOverride(orderData, reason);
            // Retry payment processing without inventory checks
            await processPayment(paymentDetails);
            return;
          } catch (overrideError) {
            console.error('Override failed:', overrideError);
            alert('Override failed: ' + overrideError.message);
          }
        }
      }
    } else {
      alert('Error processing payment: ' + error.message);
    }
  } finally {
    setShowPaymentProcessingModal(false);
  }
};

// 7. Add inventory status display in the menu item cards
// This goes in the menu item rendering section - replace existing item onClick with availability check

// In the menu item card rendering (around line 1232), replace:
// onClick={() => item.isAvailable !== false ? addToOrder(item) : null}
// with:
// onClick={() => !checkingAvailability && addToOrder(item)}

// And add availability indicator in the item card:
/*
{item.availability && (
  <AvailabilityIndicator 
    availability={item.availability}
    className="absolute top-2 right-2"
    size="sm"
  />
)}
*/

// 8. Add order availability status display in the cart/order area
// This should be placed in the cart section, around where totals are displayed:
/*
{orderAvailability && (
  <OrderAvailabilityStatus
    orderAvailability={orderAvailability}
    onManagerOverride={async (reason) => {
      try {
        const currentCart = orderViewType === 'ready' ? readyOrderCart : pendingOrderCart;
        const orderData = {
          items: currentCart.map(item => ({
            menuItemId: item._id,
            quantity: item.quantity
          }))
        };
        await requestManagerOverride(orderData, reason);
        alert('Override approved. You can now process this order.');
      } catch (error) {
        alert('Override failed: ' + error.message);
      }
    }}
    isManager={isManager}
    className="mb-4"
  />
)}
*/

// 9. Add inventory alert modal
/*
{showInventoryAlert && (
  <Modal
    isOpen={true}
    onClose={() => setShowInventoryAlert(null)}
    title="Inventory Alert"
  >
    <InventoryAlert
      availability={showInventoryAlert}
      onClose={() => setShowInventoryAlert(null)}
      onManagerOverride={async (reason) => {
        try {
          const orderData = {
            items: [{ menuItemId: showInventoryAlert.menuItemId, quantity: 1 }]
          };
          await requestManagerOverride(orderData, reason);
          setShowInventoryAlert(null);
          // Add item to cart after override
          const item = menuItems.find(i => i._id === showInventoryAlert.menuItemId);
          if (item) {
            addToOrder(item);
          }
        } catch (error) {
          alert('Override failed: ' + error.message);
        }
      }}
      isManager={isManager}
    />
  </Modal>
)}
*/

// 10. Add availability refresh button in the header/controls area
/*
<button
  onClick={() => refreshAllAvailability()}
  disabled={inventoryLoading}
  className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
  title="Refresh inventory status"
>
  <FiRefreshCw className={`w-5 h-5 ${inventoryLoading ? 'animate-spin' : ''}`} />
</button>
*/

export {
  processPaymentWithInventory,
  addToOrder // Enhanced version
};