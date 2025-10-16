import React, { useState, useEffect } from 'react';
import { Package, Info, DollarSign, Settings } from 'lucide-react';
import IngredientMapper from './ui/IngredientMapper';

/**
 * Enhanced Menu Item Modal with Tabs
 * Wraps the existing menu item form and adds ingredient management
 */
const MenuItemModal = ({ 
  selectedItem, 
  onClose, 
  onSubmit, 
  register, 
  handleSubmit, 
  errors, 
  colors,
  menuConfig,
  selectedCategory,
  selectedSubCategory,
  imagePreview,
  handleImageChange,
  setImagePreview,
  setImageFile,
  children // The original form content
}) => {
  const [activeTab, setActiveTab] = useState('basic');
  const [ingredientMappings, setIngredientMappings] = useState([]);
  
  const tabs = [
    { id: 'basic', label: 'Basic Info', icon: Info },
    { id: 'ingredients', label: 'Ingredients', icon: Package },
    { id: 'pricing', label: 'Pricing', icon: DollarSign },
    { id: 'advanced', label: 'Advanced', icon: Settings }
  ];

  // Reset to basic tab when opening different item
  useEffect(() => {
    setActiveTab('basic');
  }, [selectedItem._id]);

  const handleIngredientsSave = (mappings) => {
    setIngredientMappings(mappings);
    // Optionally switch to next tab after saving
    // setActiveTab('pricing');
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'basic':
        return (
          <div className="space-y-6">
            {/* Image Section */}
            <div>
              <label className="block text-lg font-medium mb-2">Item Image</label>
              <div className="flex items-center gap-6">
                <div className="relative">
                  <label className="cursor-pointer">
                    <div 
                      className="w-32 h-32 border-2 border-dashed rounded-lg flex items-center justify-center"
                      style={{ borderColor: colors.muted }}
                    >
                      {imagePreview ? (
                        <img
                          src={imagePreview}
                          alt="Preview"
                          className="w-full h-full rounded-lg object-cover"
                        />
                      ) : (
                        <div className="text-gray-400 text-center">
                          <Package className="w-8 h-8 mx-auto mb-2" />
                          <span className="text-sm">Add Image</span>
                        </div>
                      )}
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="hidden"
                    />
                  </label>
                  {imagePreview && (
                    <button
                      type="button"
                      onClick={() => {
                        setImagePreview(null);
                        setImageFile(null);
                      }}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 text-xs shadow-md"
                    >
                      ×
                    </button>
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-600">
                    Recommended size: 500x500px
                    <br />
                    Max file size: 5MB
                    <br />
                    Formats: JPEG, PNG, WEBP
                  </p>
                </div>
              </div>
            </div>

            {/* Basic Info Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Item Code</label>
                <input
                  {...register('code', { 
                    required: 'Required',
                    pattern: {
                      value: /^[A-Z0-9]{3,5}$/i,
                      message: '3-5 alphanumeric characters'
                    }
                  })}
                  className="w-full p-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  style={{ borderColor: colors.muted }}
                  placeholder="WG1, RCM2, etc"
                />
                {errors.code && (
                  <span className="text-red-500 text-xs">{errors.code.message}</span>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Item Name</label>
                <input
                  {...register('name', { required: 'Required' })}
                  className="w-full p-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  style={{ borderColor: colors.muted }}
                />
                {errors.name && (
                  <span className="text-red-500 text-xs">{errors.name.message}</span>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Category</label>
                <select
                  {...register('category')}
                  className="w-full p-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  style={{ borderColor: colors.muted }}
                >
                  {Object.keys(menuConfig).map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Subcategory</label>
                <select
                  {...register('subCategory')}
                  className="w-full p-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  style={{ borderColor: colors.muted }}
                >
                  {Object.keys(menuConfig[selectedCategory]?.subCategories || {}).map((subKey) => (
                    <option key={subKey} value={subKey}>{subKey}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium mb-2">Description</label>
              <textarea
                {...register('description')}
                rows={3}
                className="w-full p-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                style={{ borderColor: colors.muted }}
                placeholder="Brief description of the menu item..."
              />
            </div>
          </div>
        );

      case 'ingredients':
        return (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-800 mb-2">Ingredient Management</h4>
              <p className="text-sm text-blue-700">
                Map ingredients to this menu item to enable inventory tracking and automatic availability checking in the POS system.
              </p>
            </div>
            
            <IngredientMapper
              menuItem={selectedItem}
              onSave={handleIngredientsSave}
              onCancel={() => setActiveTab('basic')}
              readOnly={!selectedItem._id} // Only allow editing for existing items
            />
            
            {!selectedItem._id && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-700">
                  <strong>Note:</strong> Save the menu item first to enable ingredient mapping.
                </p>
              </div>
            )}
          </div>
        );

      case 'pricing':
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-medium" style={{ color: colors.primary }}>
              Pricing Configuration
            </h3>
            
            {menuConfig[selectedCategory]?.subCategories[selectedSubCategory]?.sizes?.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {menuConfig[selectedCategory]?.subCategories[selectedSubCategory]?.sizes?.map((size) => (
                  <div key={size} className="flex items-center gap-2">
                    <label className="w-20 font-medium">{size}</label>
                    <div className="flex-1 flex items-center">
                      <span className="mr-2">₱</span>
                      <input
                        type="number"
                        step="0.01"
                        {...register(`pricing.${size}`, { required: true, min: 0 })}
                        className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        style={{ borderColor: colors.muted }}
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <label className="w-20 font-medium">Base Price</label>
                <div className="flex-1 flex items-center">
                  <span className="mr-2">₱</span>
                  <input
                    type="number"
                    step="0.01"
                    {...register('pricing.base', { required: true, min: 0 })}
                    className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    style={{ borderColor: colors.muted }}
                    placeholder="0.00"
                  />
                </div>
              </div>
            )}

            {/* Cost Analysis */}
            {ingredientMappings.length > 0 && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h4 className="font-medium text-gray-800 mb-2">Cost Analysis</h4>
                <div className="text-sm text-gray-600 space-y-1">
                  <div className="flex justify-between">
                    <span>Ingredient Cost:</span>
                    <span>₱{ingredientMappings.reduce((total, mapping) => {
                      const cost = mapping.ingredientId?.price ? mapping.quantity * mapping.ingredientId.price : 0;
                      return total + cost;
                    }, 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Base Selling Price:</span>
                    <span>₱{register('pricing.base')?.value || '0.00'}</span>
                  </div>
                  <div className="flex justify-between font-medium pt-2 border-t">
                    <span>Estimated Margin:</span>
                    <span className="text-green-600">
                      {/* Calculate margin percentage */}
                      {(() => {
                        const cost = ingredientMappings.reduce((total, mapping) => {
                          return total + (mapping.ingredientId?.price ? mapping.quantity * mapping.ingredientId.price : 0);
                        }, 0);
                        const price = parseFloat(register('pricing.base')?.value || 0);
                        const margin = price > 0 ? ((price - cost) / price) * 100 : 0;
                        return margin.toFixed(1);
                      })()}%
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        );

      case 'advanced':
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-medium" style={{ color: colors.primary }}>
              Advanced Settings
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Availability */}
              <div>
                <label className="block text-sm font-medium mb-2">Availability</label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    {...register('isAvailable')}
                    className="mr-2"
                    defaultChecked={true}
                  />
                  <span className="text-sm">Item is available for ordering</span>
                </label>
              </div>

              {/* Popular Item */}
              <div>
                <label className="block text-sm font-medium mb-2">Promotion</label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    {...register('isPopular')}
                    className="mr-2"
                  />
                  <span className="text-sm">Mark as popular/featured item</span>
                </label>
              </div>

              {/* Sort Order */}
              <div>
                <label className="block text-sm font-medium mb-2">Display Order</label>
                <input
                  type="number"
                  {...register('sortOrder')}
                  className="w-full p-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  style={{ borderColor: colors.muted }}
                  placeholder="0"
                />
                <p className="text-xs text-gray-500 mt-1">Lower numbers appear first</p>
              </div>

              {/* Tags */}
              <div>
                <label className="block text-sm font-medium mb-2">Tags</label>
                <input
                  {...register('tags')}
                  className="w-full p-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  style={{ borderColor: colors.muted }}
                  placeholder="spicy, vegetarian, gluten-free"
                />
                <p className="text-xs text-gray-500 mt-1">Comma-separated tags for filtering</p>
              </div>
            </div>

            {/* Allergen Information */}
            <div>
              <label className="block text-sm font-medium mb-2">Allergen Information</label>
              <textarea
                {...register('allergens')}
                rows={2}
                className="w-full p-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                style={{ borderColor: colors.muted }}
                placeholder="Contains: milk, eggs, wheat..."
              />
            </div>

            {/* Preparation Notes */}
            <div>
              <label className="block text-sm font-medium mb-2">Preparation Notes</label>
              <textarea
                {...register('preparationNotes')}
                rows={3}
                className="w-full p-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                style={{ borderColor: colors.muted }}
                placeholder="Special preparation instructions for kitchen staff..."
              />
            </div>
          </div>
        );

      default:
        return <div>Tab content not found</div>;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center md:pl-20 z-50">
      <div 
        style={{ backgroundColor: colors.background }}
        className="p-6 rounded-lg w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl"
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-6 pb-3 border-b" style={{ borderColor: colors.muted + '40' }}>
          <h2 className="text-2xl font-bold" style={{ color: colors.primary }}>
            {selectedItem._id ? 'Edit' : 'Add'} Menu Item
          </h2>
          <button 
            onClick={onClose} 
            className="p-1.5 rounded-full hover:bg-gray-100 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex space-x-1 mb-6 bg-gray-100 p-1 rounded-lg">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
                disabled={tab.id === 'ingredients' && !selectedItem._id}
              >
                <Icon className="w-4 h-4 mr-2" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <form onSubmit={handleSubmit(onSubmit)} className="flex-1 flex flex-col">
          <div className="flex-1 overflow-y-auto pr-2 mb-6">
            {renderTabContent()}
          </div>

          {/* Footer Actions */}
          <div className="flex justify-between items-center pt-4 border-t" style={{ borderColor: colors.muted + '40' }}>
            <div className="text-sm text-gray-500">
              {activeTab === 'ingredients' && selectedItem._id && (
                <span>
                  {ingredientMappings.length} ingredient{ingredientMappings.length !== 1 ? 's' : ''} mapped
                </span>
              )}
            </div>
            
            <div className="flex space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Cancel
              </button>
              
              {activeTab !== 'ingredients' && (
                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  {selectedItem._id ? 'Update' : 'Create'} Item
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MenuItemModal;