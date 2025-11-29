import React, { useState, useEffect } from 'react';
import { X, Plus, Minus, Check } from 'lucide-react';

/**
 * ItemCustomizationModal - Modal for selecting item size, variants/flavors, and add-ons before adding to cart
 * This modal consolidates size selection, variant/flavor selection, and add-on selection into one flow
 */
const ItemCustomizationModal = ({ 
  item, 
  addOns = [], 
  onClose, 
  onConfirm,
  colors = {
    primary: '#2e0304',
    secondary: '#7a1518',
    accent: '#f1670f',
    background: '#fffbf7',
    muted: '#706b68'
  }
}) => {
  const [selectedSize, setSelectedSize] = useState(null);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [selectedAddOns, setSelectedAddOns] = useState([]);
  const [quantity, setQuantity] = useState(1);

  // Auto-select size if only one option
  useEffect(() => {
    if (item) {
      const sizes = Object.keys(item.pricing || {}).filter(key => key !== '_id');
      if (sizes.length === 1) {
        setSelectedSize(sizes[0]);
      }
      // Auto-select first variant if only one exists
      if (item.variants?.length === 1) {
        setSelectedVariant(item.variants[0]);
      }
    }
  }, [item]);

  if (!item) return null;

  // Get all available sizes and prices
  const sizes = Object.keys(item.pricing || {}).filter(key => key !== '_id');
  const hasSizes = sizes.length > 1;

  // Get variants/flavors
  const variants = item.variants || [];
  const hasVariants = variants.length > 0;

  // Filter add-ons relevant to this item's category
  const relevantAddOns = addOns.filter(addon => 
    addon.category === item.category || 
    addon.category === 'All'
  );
  const hasAddOns = relevantAddOns.length > 0;

  // Calculate total price
  const calculateTotal = () => {
    let total = 0;
    
    // Base price from size
    const sizeToUse = selectedSize || sizes[0] || 'base';
    total += item.pricing[sizeToUse] || item.pricing.base || 0;
    
    // Add variant price adjustment
    if (selectedVariant?.priceAdjustment) {
      total += selectedVariant.priceAdjustment;
    }
    
    // Add add-ons prices
    selectedAddOns.forEach(addon => {
      total += addon.price || 0;
    });
    
    return total * quantity;
  };

  const handleConfirm = () => {
    if (!selectedSize && hasSizes) {
      alert('Please select a size');
      return;
    }

    if (hasVariants && !selectedVariant) {
      alert('Please select a variant/flavor');
      return;
    }

    const sizeToUse = selectedSize || sizes[0] || 'base';
    const basePrice = item.pricing[sizeToUse] || item.pricing.base || 0;
    const variantAdjustment = selectedVariant?.priceAdjustment || 0;
    const addOnsTotal = selectedAddOns.reduce((sum, addon) => sum + (addon.price || 0), 0);

    onConfirm({
      ...item,
      selectedSize: sizeToUse,
      price: basePrice + variantAdjustment + addOnsTotal,
      basePrice: basePrice,
      availableSizes: sizes.length > 0 ? sizes : ['base'],
      selectedVariant: selectedVariant,
      selectedAddOns: selectedAddOns,
      quantity: quantity
    });
  };

  const toggleAddOn = (addon) => {
    setSelectedAddOns(prev => {
      const exists = prev.find(a => a._id === addon._id);
      if (exists) {
        return prev.filter(a => a._id !== addon._id);
      } else {
        return [...prev, addon];
      }
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
      <div 
        className="rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden animate-fadeIn"
        style={{ backgroundColor: colors.background }}
      >
        {/* Modal Content */}
        <div className="flex flex-col md:flex-row h-full max-h-[90vh]">
          {/* Left Side - Image */}
          <div className="w-full md:w-2/5 bg-gray-100 relative overflow-hidden">
            {/* Blurred Background Image */}
            {item.image && (
              <div 
                className="absolute inset-0 bg-cover bg-center"
                style={{
                  backgroundImage: `url(${item.image})`,
                  filter: 'blur(20px)',
                  transform: 'scale(1.1)',
                  opacity: 0.6
                }}
              />
            )}
            
            {/* Overlay gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-black/10 to-black/20" />
            
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 left-4 z-10 bg-white rounded-full p-2 shadow-lg hover:bg-gray-100 transition-colors"
              aria-label="Close"
            >
              <X size={20} className="text-gray-700" />
            </button>
            
            <div className="relative w-full h-full flex items-center justify-center p-6 min-h-[300px] md:min-h-[400px]">
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

          {/* Right Side - Options */}
          <div className="w-full md:w-3/5 flex flex-col max-h-full overflow-hidden">
            {/* Header */}
            <div className="p-4 md:p-6 border-b" style={{ borderColor: colors.muted + '30' }}>
              <h2 className="text-xl md:text-2xl font-bold" style={{ color: colors.primary }}>{item.name}</h2>
              <p className="text-sm" style={{ color: colors.muted }}>{item.code}</p>
              {item.description && (
                <p className="text-sm mt-2 line-clamp-2" style={{ color: colors.muted }}>{item.description}</p>
              )}
            </div>

            {/* Scrollable Options Area */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
              {/* Size Selection */}
              {hasSizes && (
                <div>
                  <label className="block text-sm font-semibold mb-3" style={{ color: colors.primary }}>
                    Select Size <span className="text-red-500">*</span>
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {sizes.map((size) => {
                      const price = item.pricing[size];
                      const isSelected = selectedSize === size;
                      
                      return (
                        <button
                          key={size}
                          onClick={() => setSelectedSize(size)}
                          className={`px-4 py-3 rounded-xl border-2 transition-all duration-200 flex-1 min-w-[100px]`}
                          style={{
                            borderColor: isSelected ? colors.accent : colors.muted + '40',
                            backgroundColor: isSelected ? colors.accent + '10' : 'transparent'
                          }}
                        >
                          <div className="text-center">
                            <div className="font-bold" style={{ color: isSelected ? colors.accent : colors.primary }}>
                              {getSizeDisplayName(size)}
                            </div>
                            <div className="text-sm font-semibold" style={{ color: isSelected ? colors.accent : colors.muted }}>
                              ₱{price?.toFixed(2) || '0.00'}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Variant/Flavor Selection */}
              {hasVariants && (
                <div>
                  <label className="block text-sm font-semibold mb-3" style={{ color: colors.primary }}>
                    Select Flavor/Variant <span className="text-red-500">*</span>
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {variants.map((variant, index) => {
                      const isSelected = selectedVariant?.name === variant.name;
                      
                      return (
                        <button
                          key={index}
                          onClick={() => setSelectedVariant(variant)}
                          className={`px-4 py-3 rounded-xl border-2 transition-all duration-200`}
                          style={{
                            borderColor: isSelected ? colors.accent : colors.muted + '40',
                            backgroundColor: isSelected ? colors.accent + '10' : 'transparent'
                          }}
                        >
                          <div className="flex items-center gap-2">
                            {isSelected && <Check size={16} style={{ color: colors.accent }} />}
                            <span className="font-medium" style={{ color: isSelected ? colors.accent : colors.primary }}>
                              {variant.name}
                            </span>
                            {variant.priceAdjustment > 0 && (
                              <span className="text-sm" style={{ color: colors.muted }}>
                                +₱{variant.priceAdjustment.toFixed(2)}
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Add-ons Selection */}
              {hasAddOns && (
                <div>
                  <label className="block text-sm font-semibold mb-3" style={{ color: colors.primary }}>
                    Add-ons (Optional)
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {relevantAddOns.map((addon) => {
                      const isSelected = selectedAddOns.some(a => a._id === addon._id);
                      
                      return (
                        <button
                          key={addon._id}
                          onClick={() => toggleAddOn(addon)}
                          className={`p-3 rounded-xl border-2 transition-all duration-200 text-left`}
                          style={{
                            borderColor: isSelected ? colors.accent : colors.muted + '40',
                            backgroundColor: isSelected ? colors.accent + '10' : 'transparent'
                          }}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div 
                                className="w-5 h-5 rounded border-2 flex items-center justify-center"
                                style={{ 
                                  borderColor: isSelected ? colors.accent : colors.muted,
                                  backgroundColor: isSelected ? colors.accent : 'transparent'
                                }}
                              >
                                {isSelected && <Check size={12} className="text-white" />}
                              </div>
                              <span className="font-medium" style={{ color: colors.primary }}>
                                {addon.name}
                              </span>
                            </div>
                            <span className="text-sm font-semibold" style={{ color: colors.accent }}>
                              +₱{addon.price?.toFixed(2) || '0.00'}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Quantity Selector */}
              <div>
                <label className="block text-sm font-semibold mb-3" style={{ color: colors.primary }}>
                  Quantity
                </label>
                <div className="flex items-center justify-center gap-4">
                  <button
                    onClick={decrementQuantity}
                    className="w-12 h-12 rounded-full border-2 font-bold text-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                    style={{ borderColor: colors.muted, color: colors.primary }}
                    disabled={quantity <= 1}
                  >
                    <Minus size={20} />
                  </button>
                  <span className="text-2xl font-bold w-12 text-center" style={{ color: colors.primary }}>
                    {quantity}
                  </span>
                  <button
                    onClick={incrementQuantity}
                    className="w-12 h-12 rounded-full border-2 font-bold text-xl transition-colors flex items-center justify-center"
                    style={{ borderColor: colors.accent, color: colors.accent }}
                  >
                    <Plus size={20} />
                  </button>
                </div>
              </div>
            </div>

            {/* Footer - Add to Cart Button */}
            <div className="p-4 md:p-6 border-t" style={{ borderColor: colors.muted + '30', backgroundColor: colors.muted + '10' }}>
              {/* Selected Options Summary */}
              {(selectedVariant || selectedAddOns.length > 0) && (
                <div className="mb-3 text-sm" style={{ color: colors.muted }}>
                  {selectedVariant && (
                    <span className="inline-block px-2 py-1 rounded mr-2 mb-1" style={{ backgroundColor: colors.accent + '20' }}>
                      {selectedVariant.name}
                    </span>
                  )}
                  {selectedAddOns.map(addon => (
                    <span key={addon._id} className="inline-block px-2 py-1 rounded mr-2 mb-1" style={{ backgroundColor: colors.accent + '20' }}>
                      +{addon.name}
                    </span>
                  ))}
                </div>
              )}
              
              <button
                onClick={handleConfirm}
                disabled={(!selectedSize && hasSizes) || (hasVariants && !selectedVariant)}
                className="w-full py-4 rounded-xl font-bold text-lg transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ 
                  backgroundColor: colors.accent, 
                  color: colors.background,
                  opacity: ((!selectedSize && hasSizes) || (hasVariants && !selectedVariant)) ? 0.5 : 1
                }}
              >
                <span className="flex items-center justify-center gap-2">
                  Add to Cart
                  <span className="text-sm opacity-90">
                    (₱{calculateTotal().toFixed(2)})
                  </span>
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <style>{`
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

export default ItemCustomizationModal;
