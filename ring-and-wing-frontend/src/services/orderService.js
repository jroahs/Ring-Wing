
// ID generation to prevent duplicate keys - assuming generateUniqueId is available or passed as an argument
// For now, let's assume it's passed or we'll define a simple one here if not.
const generateUniqueId = () => `id_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

export const addToCurrentOrder = (currentOrder, item, size = 'base', quantity = 1, generateUniqueIdFunc = generateUniqueId) => {
  // Ensure item object is complete
  if (!item) {
    console.error("Cannot add undefined item to order");
    return currentOrder; // Return original order if item is undefined
  }

  // Ensure quantity is properly handled
  let validQuantity;
  if (typeof quantity === 'number' && !isNaN(quantity)) {
    validQuantity = quantity > 0 ? quantity : 1;
  } else {
    const parsedQuantity = parseInt(quantity, 10);
    validQuantity = !isNaN(parsedQuantity) && parsedQuantity > 0 ? parsedQuantity : 1;
  }

  console.log(`Adding to order: ${validQuantity}x ${item.name} (${size})`);

  const existingItemIndex = currentOrder.findIndex(
    orderItem => orderItem.name === item.name && orderItem.selectedSize === size
  );

  if (existingItemIndex !== -1) {
    // Update quantity if item already in order
    const updatedOrder = [...currentOrder];
    updatedOrder[existingItemIndex].quantity += validQuantity;
    return updatedOrder;
  } else {
    // Add new item to order
    const sizePrice = item.pricing && item.pricing[size]
      ? item.pricing[size]
      : (item.pricing && Object.values(item.pricing)[0]) || 0;
    return [
      ...currentOrder,
      {
        id: generateUniqueIdFunc(), // Use the passed or default ID generator
        name: item.name,
        selectedSize: size,
        price: sizePrice,
        quantity: validQuantity,
        image: item.image || ""
      }
    ];
  }
};
