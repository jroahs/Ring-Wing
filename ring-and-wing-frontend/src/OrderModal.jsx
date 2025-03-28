import { useState, useEffect } from 'react';
import { FiX, FiMinus, FiPlus } from 'react-icons/fi';

const OrderModal = ({ menuItems, onClose, onSubmit, orderType }) => {
  const [orderItems, setOrderItems] = useState([]);
  const [customerInfo, setCustomerInfo] = useState({
    name: '',
    phone: '',
    address: orderType === 'delivery' ? '' : 'N/A'
  });

  useEffect(() => {
    const handleEsc = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  const addItem = (item) => {
    setOrderItems([...orderItems, {
      ...item,
      quantity: 1,
      selectedModifiers: item.modifiers?.map(mod => ({
        name: mod.name,
        selected: mod.options[0],
        priceDiff: mod.priceDiff[0]
      })) || []
    }]);
  };

  const updateQuantity = (index, newQuantity) => {
    if (newQuantity < 1) return;
    const updated = [...orderItems];
    updated[index].quantity = newQuantity;
    setOrderItems(updated);
  };

  const updateModifier = (itemIndex, modIndex, value) => {
    const updated = [...orderItems];
    const modifier = updated[itemIndex].modifiers[modIndex];
    const valueIndex = modifier.options.indexOf(value);
    updated[itemIndex].selectedModifiers[modIndex] = {
      ...modifier,
      selected: value,
      priceDiff: modifier.priceDiff[valueIndex]
    };
    setOrderItems(updated);
  };

  const calculateItemPrice = (item) => {
    const basePrice = item.price;
    const modifiersPrice = item.selectedModifiers.reduce((sum, mod) => sum + mod.priceDiff, 0);
    return (basePrice + modifiersPrice) * item.quantity;
  };

  const handleSubmit = () => {
    const order = {
      items: orderItems.map(item => ({
        id: item.id,
        name: item.name,
        price: calculateItemPrice(item),
        quantity: item.quantity,
        modifiers: item.selectedModifiers
      })),
      customer: customerInfo
    };
    onSubmit(order);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-bold">New {orderType.replace('-', ' ')} Order</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <FiX size={24} />
          </button>
        </div>

        <div className="flex h-[70vh]">
          <div className="w-1/3 border-r overflow-y-auto">
            <div className="p-4">
              <input 
                type="text" 
                placeholder="Search menu..." 
                className="w-full p-2 border rounded mb-4"
              />
              <div className="space-y-4">
                {menuItems.map(item => (
                  <div 
                    key={item.id}
                    className="p-3 border rounded cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => addItem(item)}
                  >
                    <h3 className="font-medium">{item.name}</h3>
                    <p className="text-sm text-gray-600">₱{item.price.toFixed(2)}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="w-2/3 flex flex-col">
            <div className="p-4 border-b">
              <h3 className="font-bold mb-2">Customer Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="Name"
                  value={customerInfo.name}
                  onChange={(e) => setCustomerInfo(prev => ({ ...prev, name: e.target.value }))}
                  className="p-2 border rounded"
                />
                <input
                  type="tel"
                  placeholder="Phone"
                  value={customerInfo.phone}
                  onChange={(e) => setCustomerInfo(prev => ({ ...prev, phone: e.target.value }))}
                  className="p-2 border rounded"
                />
                {orderType === 'delivery' && (
                  <input
                    type="text"
                    placeholder="Delivery Address"
                    value={customerInfo.address}
                    onChange={(e) => setCustomerInfo(prev => ({ ...prev, address: e.target.value }))}
                    className="p-2 border rounded col-span-2"
                  />
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              <h3 className="font-bold mb-2">Order Items</h3>
              {orderItems.length === 0 ? (
                <p className="text-gray-500 text-center py-8">Add items from the menu</p>
              ) : (
                <div className="space-y-4">
                  {orderItems.map((item, index) => (
                    <div key={index} className="border rounded p-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-medium">{item.name}</h4>
                          <div className="flex items-center mt-2">
                            <button 
                              onClick={() => updateQuantity(index, item.quantity - 1)}
                              className="p-1 rounded-full hover:bg-gray-100"
                            >
                              <FiMinus size={16} />
                            </button>
                            <span className="mx-2">{item.quantity}</span>
                            <button 
                              onClick={() => updateQuantity(index, item.quantity + 1)}
                              className="p-1 rounded-full hover:bg-gray-100"
                            >
                              <FiPlus size={16} />
                            </button>
                          </div>
                        </div>
                        <span className="font-medium">
                          ₱{calculateItemPrice(item).toFixed(2)}
                        </span>
                      </div>

                      {item.modifiers?.map((modifier, modIndex) => (
                        <div key={modIndex} className="mt-2">
                          <label className="block text-sm text-gray-600 mb-1">
                            {modifier.name}
                          </label>
                          <select
                            value={item.selectedModifiers[modIndex].selected}
                            onChange={(e) => updateModifier(index, modIndex, e.target.value)}
                            className="w-full p-2 border rounded text-sm"
                          >
                            {modifier.options.map((option, optIndex) => (
                              <option key={optIndex} value={option}>
                                {option} {modifier.priceDiff[optIndex] > 0 && `(+₱${modifier.priceDiff[optIndex].toFixed(2)})`}
                              </option>
                            ))}
                          </select>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 border-t">
              <div className="flex justify-between items-center mb-4">
                <span className="font-bold">Total:</span>
                <span className="font-bold text-xl">
                  ₱{orderItems.reduce((sum, item) => sum + calculateItemPrice(item), 0).toFixed(2)}
                </span>
              </div>
              <button
                onClick={handleSubmit}
                disabled={orderItems.length === 0}
                className={`w-full py-2 px-4 rounded font-medium transition-colors ${
                  orderItems.length === 0 
                    ? 'bg-gray-300 cursor-not-allowed' 
                    : 'bg-[#f1670f] hover:bg-[#f1670f90] text-white'
                }`}
              >
                Place Order
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderModal;