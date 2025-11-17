import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { FiPlus, FiMinus, FiX, FiChevronDown, FiChevronUp } from 'react-icons/fi';
import MenuItemImage from './components/MenuItemImage';

const API_URL = (window.API_CONFIG?.apiUrl || window.location.origin).replace(/\/$/, '');

const OrderModal = ({ isOpen, onClose, item, onAddToOrder }) => {
  const [quantity, setQuantity] = useState(1);
  const [selectedAddOns, setSelectedAddOns] = useState([]);
  const [availableAddOns, setAvailableAddOns] = useState([]);
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [showAddOns, setShowAddOns] = useState(false);
  
  // Animation variants
  const backdropVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 }
  };
  
  const modalVariants = {
    hidden: { 
      opacity: 0,
      y: 50,
      scale: 0.95
    },
    visible: { 
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { 
        type: "spring",
        stiffness: 300,
        damping: 30 
      }
    },
    exit: {
      opacity: 0,
      y: 50,
      scale: 0.95,
      transition: { duration: 0.2 }
    }
  };
  
  const listItemVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: i => ({
      opacity: 1,
      x: 0,
      transition: {
        type: "spring",
        stiffness: 100,
        damping: 20
      }
    }),
    hover: {
      scale: 1.02,
      backgroundColor: "rgba(241, 103, 15, 0.05)",
      transition: { duration: 0.1 }
    }
  };
  
  const quantityControlVariants = {
    hover: { scale: 1.1 },
    tap: { scale: 0.95 }
  };

  useEffect(() => {
    if (item?.category) {
      fetchAddOns(item.category);
    }
    
    // Reset state when modal opens with new item
    setQuantity(1);
    setSelectedAddOns([]);
    setSpecialInstructions('');
    setShowAddOns(false);
  }, [item]);

  const fetchAddOns = async (category) => {
    try {
      const response = await axios.get(`${API_URL}/api/addons/category/${category}`);
      setAvailableAddOns(response.data);
    } catch (error) {
      console.error('Error fetching add-ons:', error);
    }
  };

  const handleAddOnToggle = (addOn) => {
    setSelectedAddOns(prev => {
      const exists = prev.some(a => a._id === addOn._id);
      if (exists) {
        return prev.filter(a => a._id !== addOn._id);
      } else {
        return [...prev, addOn];
      }
    });
  };

  const handleIncrement = () => {
    setQuantity(prev => Math.min(prev + 1, 20)); // Limit to 20 items
  };

  const handleDecrement = () => {
    setQuantity(prev => Math.max(prev - 1, 1)); // Minimum 1 item
  };

  const handleSubmit = () => {
    if (!item) return;
    
    const orderItem = {
      itemId: item._id,
      name: item.name,
      price: item.price,
      quantity,
      addOns: selectedAddOns.map(a => ({
        addOnId: a._id,
        name: a.name,
        price: a.price
      })),
      specialInstructions,
      totalPrice: calculateTotal()
    };
    
    onAddToOrder(orderItem);
    onClose();
  };

  const calculateTotal = () => {
    if (!item) return 0;
    
    const basePrice = item.price;
    const addOnTotal = selectedAddOns.reduce((sum, addOn) => sum + addOn.price, 0);
    
    return (basePrice + addOnTotal) * quantity;
  };

  if (!isOpen || !item) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          className="fixed inset-0 flex items-center justify-center z-50 p-4"
          variants={backdropVariants}
          initial="hidden"
          animate="visible"
          exit="hidden"
          onClick={onClose}
        >
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black bg-opacity-50"
          />
          
          {/* Modal Content */}
          <motion.div 
            className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[85vh] flex flex-col relative z-10"
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={e => e.stopPropagation()}
          >
            {/* Header with Image */}
            <div className="relative">
              <motion.div 
                className="h-40 bg-gradient-to-r from-orange-500 to-red-600 rounded-t-lg flex items-center justify-center overflow-hidden"
                initial={{ opacity: 0, scale: 1.2 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}              >
                {item.image ? (
                  <img 
                    src={item.image.startsWith('http') ? item.image : `${API_URL}/${item.image}`}
                    alt={item.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      // If image fails to load, use category-specific placeholder
                      e.target.src = item.category === 'Beverages' ? '/placeholders/drinks.png' : '/placeholders/meal.png';
                    }}
                  />
                ) : (
                  <img 
                    src={item.category === 'Beverages' ? '/placeholders/drinks.png' : '/placeholders/meal.png'} 
                    alt={item.name} 
                    className="w-full h-full object-cover"
                  />
                )}
              </motion.div>
              
              <motion.button
                onClick={onClose}
                className="absolute top-2 right-2 bg-white rounded-full p-1 shadow-md"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <FiX size={18} />
              </motion.button>
            </div>
            
            <div className="p-6 flex-1 overflow-auto">
              {/* Item Details */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <h2 className="text-2xl font-bold mb-1">{item.name}</h2>
                <p className="text-gray-600 mb-3">{item.description || "No description available"}</p>
                <div className="text-xl font-bold text-orange-600 mb-6">
                  ${item.price.toFixed(2)}
                </div>
              </motion.div>
              
              {/* Quantity Selector */}
              <motion.div 
                className="mb-6 flex items-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                <span className="mr-4 font-medium">Quantity:</span>
                <div className="flex items-center gap-4">
                  <motion.button
                    onClick={handleDecrement}
                    disabled={quantity <= 1}
                    className={`w-8 h-8 rounded-full flex items-center justify-center border ${
                      quantity <= 1 ? 'border-gray-300 text-gray-300' : 'border-gray-400 text-gray-600'
                    }`}
                    variants={quantityControlVariants}
                    whileHover={quantity > 1 ? "hover" : {}}
                    whileTap={quantity > 1 ? "tap" : {}}
                  >
                    <FiMinus size={16} />
                  </motion.button>
                  
                  <motion.span 
                    className="text-xl font-medium w-8 text-center"
                    initial={{ scale: 1 }}
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 0.2 }}
                    key={quantity} // This ensures animation plays on every quantity change
                  >
                    {quantity}
                  </motion.span>
                  
                  <motion.button
                    onClick={handleIncrement}
                    disabled={quantity >= 20}
                    className={`w-8 h-8 rounded-full flex items-center justify-center border ${
                      quantity >= 20 ? 'border-gray-300 text-gray-300' : 'border-gray-400 text-gray-600'
                    }`}
                    variants={quantityControlVariants}
                    whileHover={quantity < 20 ? "hover" : {}}
                    whileTap={quantity < 20 ? "tap" : {}}
                  >
                    <FiPlus size={16} />
                  </motion.button>
                </div>
              </motion.div>
              
              {/* Add-ons Section */}
              {availableAddOns.length > 0 && (
                <motion.div 
                  className="mb-6 border border-gray-200 rounded-lg overflow-hidden"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <motion.button
                    className="flex w-full items-center justify-between p-4 text-left font-medium"
                    onClick={() => setShowAddOns(!showAddOns)}
                    whileHover={{ backgroundColor: "rgba(0, 0, 0, 0.02)" }}
                  >
                    <span>Add-ons {selectedAddOns.length > 0 && `(${selectedAddOns.length} selected)`}</span>
                    <motion.div
                      animate={{ rotate: showAddOns ? 180 : 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      {showAddOns ? <FiChevronUp /> : <FiChevronDown />}
                    </motion.div>
                  </motion.button>
                  
                  <AnimatePresence>
                    {showAddOns && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                      >
                        <div className="p-4 pt-2">
                          {availableAddOns.map((addOn, index) => {
                            const isSelected = selectedAddOns.some(a => a._id === addOn._id);
                            
                            return (
                              <motion.div
                                key={addOn._id}
                                className={`flex items-center justify-between p-2 mb-2 rounded-lg cursor-pointer ${
                                  isSelected ? 'bg-orange-50 border border-orange-200' : 'border border-transparent'
                                }`}
                                custom={index}
                                variants={listItemVariants}
                                initial="hidden"
                                animate="visible"
                                whileHover="hover"
                                onClick={() => handleAddOnToggle(addOn)}
                              >
                                <div className="flex items-center">
                                  <div className={`w-5 h-5 mr-3 rounded-full border flex items-center justify-center ${
                                    isSelected ? 'border-orange-500 bg-orange-500' : 'border-gray-300'
                                  }`}>
                                    {isSelected && (
                                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                                        <path d="M4 6L5 7L8 4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                      </svg>
                                    )}
                                  </div>
                                  <span>{addOn.name}</span>
                                </div>
                                <span className="text-gray-600">+${addOn.price.toFixed(2)}</span>
                              </motion.div>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )}
              
              {/* Special Instructions */}
              <motion.div
                className="mb-6"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <label className="block text-sm font-medium mb-2">Special Instructions</label>
                <textarea
                  value={specialInstructions}
                  onChange={e => setSpecialInstructions(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="Add any special requests (optional)"
                  rows={2}
                />
              </motion.div>
              
              {/* Total Price */}
              <motion.div
                className="text-xl font-bold text-right mb-6"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5, type: "spring" }}
              >
                Total: ${calculateTotal().toFixed(2)}
              </motion.div>
            </div>
            
            {/* Footer with Action Buttons */}
            <div className="border-t border-gray-200 p-4">
              <div className="flex justify-end gap-4">
                <motion.button
                  onClick={onClose}
                  className="px-4 py-2 border border-gray-300 rounded-lg"
                  whileHover={{ backgroundColor: "#f8f8f8" }}
                  whileTap={{ scale: 0.98 }}
                >
                  Cancel
                </motion.button>
                
                <motion.button
                  onClick={handleSubmit}
                  className="px-6 py-2 bg-orange-600 text-white rounded-lg shadow-lg"
                  whileHover={{ 
                    backgroundColor: "#e85d04",
                    scale: 1.03,
                    boxShadow: "0px 5px 15px rgba(232, 93, 4, 0.3)"
                  }}
                  whileTap={{ scale: 0.97 }}
                  initial={{ boxShadow: "0px 3px 8px rgba(0, 0, 0, 0.1)" }}
                >
                  Add to Order
                </motion.button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default OrderModal;