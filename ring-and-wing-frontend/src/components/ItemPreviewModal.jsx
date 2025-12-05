import React, { useState, useEffect } from 'react';
import { X, Plus, Minus, Check, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import { API_URL } from '../App';

/**
 * ItemPreviewModal - Modal for previewing menu items AND editing cart items in Self Checkout
 * 
 * For Self Checkout (customer-facing):
 * - Shows item preview with description even when no customization is needed
 * - Displays item recommendations from the same category
 * - Allows size, variant, and add-on selection
 * - Supports editing existing cart items
 * 
 * Props:
 * - item: The menu item to preview/customize
 * - addOns: Array of available add-ons
 * - onClose: Callback when modal is closed
 * - onConfirm: Callback when item is added/updated
 * - isEditing: Boolean - true if editing an existing cart item
 * - cartItem: The existing cart item data (when editing)
 * - menuItems: Array of all menu items (for recommendations)
 * - colors: Theme colors object
 */
const ItemPreviewModal = ({ 
  item, 
  addOns = [], 
  onClose, 
  onConfirm,
  isEditing = false,
  cartItem = null,
  menuItems = [],
  colors = {
    primary: '#2e0304',
    secondary: '#7a1518',
    accent: '#f1670f',
    background: '#fffbf7',
    muted: '#706b68'
  }
}) => {
  const [selectedSize, setSelectedSize] = useState(null);
  const [selectedAddOns, setSelectedAddOns] = useState([]);
  const [quantity, setQuantity] = useState(1);
  const [recommendations, setRecommendations] = useState([]);
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);
  const [itemNotes, setItemNotes] = useState(''); // Notes for special requests (max 150 chars)
  
  // Per-quantity variant selection - array of variants, one per quantity unit
  const [variantsPerUnit, setVariantsPerUnit] = useState([]);
  const [expandedVariantUnits, setExpandedVariantUnits] = useState(true);

  // Get variants/flavors
  const variants = item?.variants || [];
  const hasVariants = variants.length > 0;

  // Get all available sizes and prices
  const sizes = Object.keys(item?.pricing || {}).filter(key => key !== '_id');
  const hasSizes = sizes.length > 1;

  // Filter add-ons relevant to this item's category
  const relevantAddOns = addOns.filter(addon => 
    addon.category === item?.category || 
    addon.category === 'All'
  );
  const hasAddOns = relevantAddOns.length > 0;

  // Determine if item needs customization
  const needsCustomization = hasSizes || hasVariants || hasAddOns;

  // Initialize state based on whether we're editing or adding new
  useEffect(() => {
    if (!item) return;

    if (isEditing && cartItem) {
      // Pre-fill with existing cart item data
      setSelectedSize(cartItem.selectedSize);
      setQuantity(cartItem.quantity || 1);
      setSelectedAddOns(cartItem.addOns || []);
      setItemNotes(cartItem.notes || ''); // Load existing notes
      
      // Set variants for editing
      if (hasVariants && cartItem.variant) {
        setVariantsPerUnit(Array(cartItem.quantity || 1).fill(cartItem.variant));
      }
    } else {
      // New item - auto-select size if only one option
      if (sizes.length === 1) {
        setSelectedSize(sizes[0]);
      }
      // Initialize variants per unit with first variant or null
      if (hasVariants) {
        const defaultVariant = variants.length === 1 ? variants[0] : null;
        setVariantsPerUnit([defaultVariant]);
      }
      // Reset notes for new items
      setItemNotes('');
    }
  }, [item, isEditing, cartItem]);

  // Sync variantsPerUnit array with quantity changes
  useEffect(() => {
    if (hasVariants) {
      setVariantsPerUnit(prev => {
        const newVariants = [...prev];
        // If quantity increased, add default variants for new units
        while (newVariants.length < quantity) {
          const lastVariant = newVariants[newVariants.length - 1];
          const defaultVariant = variants.length === 1 ? variants[0] : (lastVariant || null);
          newVariants.push(defaultVariant);
        }
        // If quantity decreased, trim the array
        while (newVariants.length > quantity) {
          newVariants.pop();
        }
        return newVariants;
      });
    }
  }, [quantity, hasVariants, variants]);

  // Fetch recommendations from same category
  useEffect(() => {
    if (!item || !menuItems.length) return;

    setLoadingRecommendations(true);
    
    // Get items from same category, exclude current item, limit to 4
    const categoryItems = menuItems
      .filter(mi => 
        mi.category === item.category && 
        mi._id !== item._id && 
        mi.isAvailable !== false
      )
      .slice(0, 4);
    
    setRecommendations(categoryItems);
    setLoadingRecommendations(false);
  }, [item, menuItems]);

  if (!item) return null;

  // Calculate total price
  const calculateTotal = () => {
    let total = 0;
    
    // Base price from size (per unit)
    const sizeToUse = selectedSize || sizes[0] || 'base';
    const baseUnitPrice = item.pricing[sizeToUse] || item.pricing.base || 0;
    
    // Calculate price for each unit including its variant
    if (hasVariants && variantsPerUnit.length > 0) {
      variantsPerUnit.forEach(variant => {
        total += baseUnitPrice + (variant?.priceAdjustment || 0);
      });
    } else {
      total = baseUnitPrice * quantity;
    }
    
    // Add add-ons prices (applied per order, not per unit)
    selectedAddOns.forEach(addon => {
      total += (addon.price || 0) * quantity;
    });
    
    return total;
  };

  // Set variant for a specific unit
  const setVariantForUnit = (unitIndex, variant) => {
    setVariantsPerUnit(prev => {
      const newVariants = [...prev];
      newVariants[unitIndex] = variant;
      return newVariants;
    });
  };

  // Set same variant for all units
  const setAllVariantsToSame = (variant) => {
    setVariantsPerUnit(Array(quantity).fill(variant));
  };

  // Check if all variants are selected
  const allVariantsSelected = () => {
    if (!hasVariants) return true;
    return variantsPerUnit.every(v => v !== null);
  };

  // Get summary of selected variants
  const getVariantsSummary = () => {
    if (!hasVariants || variantsPerUnit.length === 0) return null;
    
    const variantCounts = {};
    variantsPerUnit.forEach(v => {
      if (v) {
        const name = v.name;
        variantCounts[name] = (variantCounts[name] || 0) + 1;
      }
    });
    
    return Object.entries(variantCounts).map(([name, count]) => 
      count > 1 ? `${count}x ${name}` : name
    ).join(', ');
  };

  const handleConfirm = () => {
    if (!selectedSize && hasSizes) {
      alert('Please select a size');
      return;
    }

    if (hasVariants && !allVariantsSelected()) {
      alert('Please select a flavor for each item');
      return;
    }

    const sizeToUse = selectedSize || sizes[0] || 'base';
    const basePrice = item.pricing[sizeToUse] || item.pricing.base || 0;
    const addOnsTotal = selectedAddOns.reduce((sum, addon) => sum + (addon.price || 0), 0);

    // If multiple different variants, add each as separate cart item
    if (hasVariants && quantity > 1) {
      // Group items by variant
      const variantGroups = {};
      variantsPerUnit.forEach(variant => {
        const key = variant?.name || 'none';
        if (!variantGroups[key]) {
          variantGroups[key] = { variant, count: 0 };
        }
        variantGroups[key].count++;
      });

      // If all same variant, submit as single item
      if (Object.keys(variantGroups).length === 1) {
        const variant = variantsPerUnit[0];
        const variantAdjustment = variant?.priceAdjustment || 0;
        onConfirm({
          ...item,
          selectedSize: sizeToUse,
          price: basePrice + variantAdjustment + addOnsTotal,
          basePrice: basePrice,
          availableSizes: sizes.length > 0 ? sizes : ['base'],
          selectedVariant: variant,
          selectedAddOns: selectedAddOns,
          notes: itemNotes.trim() || '', // Include notes
          quantity: quantity,
          isEditing: isEditing
        });
      } else {
        // Multiple different variants - add each group separately
        Object.values(variantGroups).forEach(({ variant, count }) => {
          const variantAdjustment = variant?.priceAdjustment || 0;
          onConfirm({
            ...item,
            selectedSize: sizeToUse,
            price: basePrice + variantAdjustment + addOnsTotal,
            basePrice: basePrice,
            availableSizes: sizes.length > 0 ? sizes : ['base'],
            selectedVariant: variant,
            selectedAddOns: selectedAddOns,
            notes: itemNotes.trim() || '', // Include notes
            quantity: count,
            isEditing: isEditing
          });
        });
      }
    } else {
      // Single item or no variants
      const variant = variantsPerUnit[0] || null;
      const variantAdjustment = variant?.priceAdjustment || 0;
      onConfirm({
        ...item,
        selectedSize: sizeToUse,
        price: basePrice + variantAdjustment + addOnsTotal,
        basePrice: basePrice,
        availableSizes: sizes.length > 0 ? sizes : ['base'],
        selectedVariant: variant,
        selectedAddOns: selectedAddOns,
        notes: itemNotes.trim() || '', // Include notes
        quantity: quantity,
        isEditing: isEditing
      });
    }
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

  // Handle recommendation click
  const handleRecommendationClick = (recItem) => {
    // Close current modal and open new one with the recommended item
    onClose();
    // Small delay to allow modal to close before opening new one
    setTimeout(() => {
      // This will be handled by the parent component
      if (window.handleItemPreview) {
        window.handleItemPreview(recItem);
      }
    }, 100);
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
            <div 
              className="absolute inset-0 bg-cover bg-center"
              style={{
                backgroundImage: `url(${item.image || (item.category === 'Beverages' ? '/placeholders/drinks.png' : '/placeholders/meal.png')})`,
                filter: 'blur(20px)',
                transform: 'scale(1.1)',
                opacity: 0.6
              }}
            />
            
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

            {/* Editing badge */}
            {isEditing && (
              <div className="absolute top-4 right-4 z-10 bg-orange-500 text-white px-3 py-1 rounded-full text-sm font-medium shadow-lg">
                Editing
              </div>
            )}
            
            <div className="relative w-full h-full flex items-center justify-center p-6 min-h-[300px] md:min-h-[400px]">
              <div className="relative w-full aspect-square max-w-sm">
                <img
                  src={item.image || (item.category === 'Beverages' ? '/placeholders/drinks.png' : '/placeholders/meal.png')}
                  alt={item.name}
                  className="w-full h-full object-cover rounded-xl shadow-2xl"
                  onError={(e) => {
                    e.target.src = item.category === 'Beverages' ? '/placeholders/drinks.png' : '/placeholders/meal.png';
                  }}
                />
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
              {/* Always show description in preview mode */}
              {item.description ? (
                <p className="text-sm mt-2" style={{ color: colors.muted }}>{item.description}</p>
              ) : (
                <p className="text-sm mt-2 italic" style={{ color: colors.muted + '80' }}>
                  A delicious {item.category?.toLowerCase() || 'menu'} item from Ring & Wings
                </p>
              )}
              {/* Base price display for simple items */}
              {!needsCustomization && (
                <p className="text-xl font-bold mt-3" style={{ color: colors.accent }}>
                  ₱{(Object.values(item.pricing)[0] || 0).toFixed(2)}
                </p>
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

              {/* Per-Quantity Variant/Flavor Selection */}
              {hasVariants && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="block text-sm font-semibold" style={{ color: colors.primary }}>
                      Select Flavor/Variant {quantity > 1 ? `for Each (${quantity} items)` : ''} <span className="text-red-500">*</span>
                    </label>
                    {quantity > 1 && (
                      <button
                        onClick={() => setExpandedVariantUnits(!expandedVariantUnits)}
                        className="text-xs flex items-center gap-1 px-2 py-1 rounded"
                        style={{ color: colors.accent }}
                      >
                        {expandedVariantUnits ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        {expandedVariantUnits ? 'Collapse' : 'Expand'}
                      </button>
                    )}
                  </div>

                  {/* Quick select: Apply same flavor to all */}
                  {quantity > 1 && (
                    <div className="mb-4 p-3 rounded-lg" style={{ backgroundColor: colors.muted + '15' }}>
                      <p className="text-xs mb-2" style={{ color: colors.muted }}>Quick Select - Same flavor for all:</p>
                      <div className="flex flex-wrap gap-2">
                        {variants.map((variant, index) => (
                          <button
                            key={index}
                            onClick={() => setAllVariantsToSame(variant)}
                            className="px-3 py-1.5 rounded-lg border text-sm transition-all"
                            style={{
                              borderColor: colors.muted + '40',
                              color: colors.primary
                            }}
                          >
                            All {variant.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Individual unit variant selection */}
                  {(quantity === 1 || expandedVariantUnits) && (
                    <div className="space-y-3">
                      {variantsPerUnit.map((selectedVar, unitIndex) => (
                        <div key={unitIndex} className="p-3 rounded-lg border" style={{ borderColor: colors.muted + '30' }}>
                          {quantity > 1 && (
                            <p className="text-xs font-semibold mb-2" style={{ color: colors.muted }}>
                              Item #{unitIndex + 1}
                            </p>
                          )}
                          <div className="flex flex-wrap gap-2">
                            {variants.map((variant, variantIndex) => {
                              const isSelected = selectedVar?.name === variant.name;
                              
                              return (
                                <button
                                  key={variantIndex}
                                  onClick={() => setVariantForUnit(unitIndex, variant)}
                                  className={`px-3 py-2 rounded-xl border-2 transition-all duration-200`}
                                  style={{
                                    borderColor: isSelected ? colors.accent : colors.muted + '40',
                                    backgroundColor: isSelected ? colors.accent + '10' : 'transparent'
                                  }}
                                >
                                  <div className="flex items-center gap-2">
                                    {isSelected && <Check size={14} style={{ color: colors.accent }} />}
                                    <span className="font-medium text-sm" style={{ color: isSelected ? colors.accent : colors.primary }}>
                                      {variant.name}
                                    </span>
                                    {variant.priceAdjustment > 0 && (
                                      <span className="text-xs" style={{ color: colors.muted }}>
                                        +₱{variant.priceAdjustment.toFixed(2)}
                                      </span>
                                    )}
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Collapsed summary */}
                  {quantity > 1 && !expandedVariantUnits && getVariantsSummary() && (
                    <div className="p-3 rounded-lg" style={{ backgroundColor: colors.accent + '15' }}>
                      <p className="text-sm" style={{ color: colors.primary }}>
                        <strong>Selected:</strong> {getVariantsSummary()}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Add-ons Selection */}
              {hasAddOns && (
                <div>
                  <label className="block text-sm font-semibold mb-3" style={{ color: colors.primary }}>
                    Add-ons (Optional) {quantity > 1 && <span className="font-normal text-xs" style={{ color: colors.muted }}>- Applied to each item</span>}
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

              {/* Notes Section (Optional) */}
              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: colors.primary }}>
                  Notes (Optional)
                </label>
                <textarea
                  value={itemNotes}
                  onChange={(e) => setItemNotes(e.target.value.slice(0, 150))}
                  placeholder="Less sugar, no ice, extra pearls..."
                  rows={3}
                  maxLength={150}
                  className="w-full p-3 rounded-xl border-2 transition-all duration-200 resize-none focus:outline-none focus:ring-2"
                  style={{
                    borderColor: colors.muted + '40',
                    backgroundColor: 'transparent',
                    color: colors.primary,
                    '--tw-ring-color': colors.accent + '40'
                  }}
                />
                <p className="text-xs mt-1 text-right" style={{ color: colors.muted }}>
                  {itemNotes.length}/150
                </p>
              </div>

              {/* Recommendations Section - Only show for new items, not when editing */}
              {!isEditing && recommendations.length > 0 && (
                <div className="pt-4 border-t" style={{ borderColor: colors.muted + '30' }}>
                  <label className="block text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: colors.primary }}>
                    <Sparkles size={16} style={{ color: colors.accent }} />
                    You might also like
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {recommendations.map((recItem) => (
                      <button
                        key={recItem._id}
                        onClick={() => handleRecommendationClick(recItem)}
                        className="p-2 rounded-xl border transition-all duration-200 text-left hover:shadow-md"
                        style={{ borderColor: colors.muted + '30' }}
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
                            <img
                              src={recItem.image || (recItem.category === 'Beverages' ? '/placeholders/drinks.png' : '/placeholders/meal.png')}
                              alt={recItem.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-xs truncate" style={{ color: colors.primary }}>
                              {recItem.name}
                            </p>
                            <p className="text-xs font-semibold" style={{ color: colors.accent }}>
                              ₱{(Object.values(recItem.pricing)[0] || 0).toFixed(2)}
                            </p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer - Add to Cart Button */}
            <div className="p-4 md:p-6 border-t" style={{ borderColor: colors.muted + '30', backgroundColor: colors.muted + '10' }}>
              {/* Selected Options Summary */}
              {(getVariantsSummary() || selectedAddOns.length > 0) && (
                <div className="mb-3 text-sm" style={{ color: colors.muted }}>
                  {getVariantsSummary() && (
                    <span className="inline-block px-2 py-1 rounded mr-2 mb-1" style={{ backgroundColor: colors.accent + '20' }}>
                      {getVariantsSummary()}
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
                disabled={(!selectedSize && hasSizes) || (hasVariants && !allVariantsSelected())}
                className="w-full py-4 rounded-xl font-bold text-lg transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ 
                  backgroundColor: colors.accent, 
                  color: colors.background,
                  opacity: ((!selectedSize && hasSizes) || (hasVariants && !allVariantsSelected())) ? 0.5 : 1
                }}
              >
                <span className="flex items-center justify-center gap-2">
                  {isEditing ? 'Update Item' : 'Add to Cart'}
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

export default ItemPreviewModal;
