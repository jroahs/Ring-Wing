import React, { useState } from 'react';
import { X } from 'lucide-react';

/**
 * SizeSelectionModal - Modal for selecting item size before adding to cart
 * Design: Rectangle modal with image on left, size options on right
 */
const SizeSelectionModal = ({ item, onClose, onSelectSize }) => {
  const [selectedSize, setSelectedSize] = useState(null);
  const [quantity, setQuantity] = useState(1);

  if (!item) return null;

  // Get all available sizes and prices
  const sizes = Object.keys(item.pricing || {})
    .filter(key => key !== '_id' && key !== 'base');
  
  // If no sizes or only one size/base price, auto-select
  const hasSizes = sizes.length > 1 || (sizes.length === 1 && sizes[0] !== 'base');

  const handleConfirm = () => {
    if (!selectedSize && hasSizes) {
      alert('Please select a size');
      return;
    }

    const sizeToUse = selectedSize || sizes[0] || 'base';
    const price = item.pricing[sizeToUse] || item.pricing.base || 0;
    
    // Get all available sizes for the dropdown in cart
    const allSizes = Object.keys(item.pricing || {}).filter(key => key !== '_id');

    onSelectSize({
      ...item,
      selectedSize: sizeToUse,
      price: price,
      availableSizes: allSizes.length > 0 ? allSizes : ['base'],
      quantity: quantity
    });
  };

  const incrementQuantity = () => setQuantity(prev => prev + 1);
  const decrementQuantity = () => setQuantity(prev => Math.max(1, prev - 1));

  // Get size display name (capitalize and format)
  const getSizeDisplayName = (sizeName) => {
    if (sizeName === 'base') return 'Regular';
    return sizeName.charAt(0).toUpperCase() + sizeName.slice(1);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[85vh] overflow-hidden animate-fadeIn">
        {/* Modal Content */}
        <div className="flex flex-col md:flex-row h-full">
          {/* Left Side - Image (1:1 aspect ratio) with blurred background */}
          <div className="w-full md:w-1/2 bg-gray-100 relative overflow-hidden">
            {/* Blurred Background Image */}
            {item.image && (
              <div 
                className="absolute inset-0 bg-cover bg-center"
                style={{
                  backgroundImage: `url(${item.image})`,
                  filter: 'blur(20px)',
                  transform: 'scale(1.1)', // Slightly scale to hide blur edges
                  opacity: 0.6
                }}
              />
            )}
            
            {/* Overlay gradient for better contrast */}
            <div className="absolute inset-0 bg-gradient-to-br from-black/10 to-black/20" />
            
            <button
              onClick={onClose}
              className="absolute top-4 right-4 z-10 bg-white rounded-full p-2 shadow-lg hover:bg-gray-100 transition-colors"
              aria-label="Close"
            >
              <X size={20} className="text-gray-700" />
            </button>
            
            <div className="relative w-full h-full flex items-center justify-center p-8">
              <div className="relative w-full aspect-square max-w-sm">
                {item.image ? (
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-full h-full object-cover rounded-xl shadow-2xl"
                    onError={(e) => {
                      e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="400"%3E%3Crect fill="%23f0f0f0" width="400" height="400"/%3E%3Ctext fill="%23999" font-family="Arial" font-size="24" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3ENo Image%3C/text%3E%3C/svg%3E';
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-orange-100 to-red-100 rounded-xl shadow-2xl">
                    <div className="text-center">
                      <div className="text-6xl mb-2">🍽️</div>
                      <p className="text-gray-500 text-sm">No Image</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Vertical Divider */}
          <div className="hidden md:block w-px bg-gradient-to-b from-transparent via-gray-300 to-transparent"></div>

          {/* Right Side - Size Selection */}
          <div className="w-full md:w-1/2 flex flex-col">
            {/* Header */}
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-800 mb-1">{item.name}</h2>
              <p className="text-sm text-gray-500">{item.code}</p>
              {item.description && (
                <p className="text-sm text-gray-600 mt-2 line-clamp-2">{item.description}</p>
              )}
            </div>

            {/* Size Options - Horizontal Single Row */}
            <div className="flex-1 p-6 overflow-y-auto">
              <label className="block text-sm font-semibold text-gray-700 mb-3 text-center">
                Select Size
              </label>
              
              {/* Centered size selector that adjusts based on number of sizes */}
              <div className="flex justify-center items-center pb-2">
                <div className="flex gap-3">
                  {sizes.map((size) => {
                    const price = item.pricing[size];
                    const isSelected = selectedSize === size;
                    
                    return (
                      <button
                        key={size}
                        onClick={() => setSelectedSize(size)}
                        className={`
                          flex-shrink-0 px-6 py-4 rounded-xl border-2 transition-all duration-200
                          ${isSelected
                            ? 'border-orange-500 bg-orange-50 shadow-md'
                            : 'border-gray-200 bg-white hover:border-orange-300 hover:bg-orange-50'
                          }
                        `}
                      >
                        <div className="text-center">
                          <div className={`text-lg font-bold ${isSelected ? 'text-orange-600' : 'text-gray-800'}`}>
                            {getSizeDisplayName(size)}
                          </div>
                          <div className={`text-xl font-semibold mt-1 ${isSelected ? 'text-orange-600' : 'text-gray-600'}`}>
                            ₱{price?.toFixed(2) || '0.00'}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Quantity Selector - Centered */}
              <div className="mt-6">
                <label className="block text-sm font-semibold text-gray-700 mb-3 text-center">
                  Quantity
                </label>
                <div className="flex items-center justify-center gap-4">
                  <button
                    onClick={decrementQuantity}
                    className="w-12 h-12 rounded-full border-2 border-gray-300 text-gray-600 font-bold text-xl hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={quantity <= 1}
                  >
                    −
                  </button>
                  <span className="text-2xl font-bold text-gray-800 w-12 text-center">
                    {quantity}
                  </span>
                  <button
                    onClick={incrementQuantity}
                    className="w-12 h-12 rounded-full border-2 border-orange-500 text-orange-600 font-bold text-xl hover:bg-orange-50 transition-colors"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            {/* Footer - Add to Cart Button */}
            <div className="p-6 border-t border-gray-200 bg-gray-50">
              <button
                onClick={handleConfirm}
                disabled={!selectedSize && hasSizes}
                className={`
                  w-full py-4 rounded-xl font-bold text-lg transition-all duration-200
                  ${selectedSize || !hasSizes
                    ? 'bg-orange-500 text-white hover:bg-orange-600 shadow-lg hover:shadow-xl'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }
                `}
              >
                {selectedSize ? (
                  <span className="flex items-center justify-center gap-2">
                    Add to Cart
                    <span className="text-sm opacity-90">
                      (₱{(item.pricing[selectedSize] * quantity).toFixed(2)})
                    </span>
                  </span>
                ) : (
                  'Select a size'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </div>
  );
};

export default SizeSelectionModal;
