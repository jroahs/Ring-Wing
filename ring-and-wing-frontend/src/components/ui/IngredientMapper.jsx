import React, { useState, useEffect, useMemo } from 'react';
import { Search, Plus, Trash2, AlertCircle, Package, Calculator, Save, X } from 'lucide-react';

/**
 * IngredientMapper Component
 * Handles ingredient-to-menu-item mapping with search, validation, and recipe calculations
 */
const IngredientMapper = ({ 
  menuItem, 
  onSave, 
  onCancel,
  readOnly = false,
  className = "" 
}) => {
  const [mappings, setMappings] = useState([]);
  const [availableIngredients, setAvailableIngredients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [errors, setErrors] = useState({});
  const [showAddForm, setShowAddForm] = useState(false);

  // Load existing mappings and available ingredients
  useEffect(() => {
    if (menuItem?.id) {
      loadExistingMappings();
    }
    loadAvailableIngredients();
  }, [menuItem]);

  const loadExistingMappings = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/ingredients/mappings/menu-item/${menuItem.id}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setMappings(data.data.mappings || []);
      } else {
        console.error('Failed to load existing mappings');
      }
    } catch (error) {
      console.error('Error loading mappings:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableIngredients = async () => {
    try {
      const response = await fetch('/api/items?category=ingredients&active=true', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setAvailableIngredients(data.data || data || []);
      }
    } catch (error) {
      console.error('Error loading ingredients:', error);
    }
  };

  // Filter ingredients based on search term
  const filteredIngredients = useMemo(() => {
    if (!searchTerm.trim()) return availableIngredients;
    
    const term = searchTerm.toLowerCase();
    return availableIngredients.filter(ingredient => 
      ingredient.name.toLowerCase().includes(term) ||
      ingredient.category?.toLowerCase().includes(term)
    );
  }, [availableIngredients, searchTerm]);

  // Get ingredients not already mapped
  const availableForMapping = useMemo(() => {
    const mappedIds = mappings.map(m => m.ingredientId?._id || m.ingredientId);
    return filteredIngredients.filter(ingredient => 
      !mappedIds.includes(ingredient._id)
    );
  }, [filteredIngredients, mappings]);

  const addMapping = (ingredient) => {
    const newMapping = {
      id: `temp_${Date.now()}`,
      ingredientId: ingredient,
      quantity: 1,
      unit: ingredient.unit || 'pieces',
      isRequired: true,
      substitutions: [],
      notes: '',
      isNew: true
    };

    setMappings([...mappings, newMapping]);
    setShowAddForm(false);
    setSearchTerm('');
  };

  const updateMapping = (mappingId, updates) => {
    setMappings(mappings.map(mapping => 
      mapping.id === mappingId || mapping._id === mappingId
        ? { ...mapping, ...updates, isModified: true }
        : mapping
    ));
    
    // Clear errors for this field
    if (errors[mappingId]) {
      setErrors({ ...errors, [mappingId]: undefined });
    }
  };

  const removeMapping = async (mappingId) => {
    try {
      console.log('🗑️ Attempting to remove mapping with ID:', mappingId);
      
      // Find the mapping to determine if it's new or existing
      const mappingToRemove = mappings.find(mapping => 
        mapping.id === mappingId || mapping._id === mappingId
      );
      
      if (!mappingToRemove) {
        console.warn('⚠️ Mapping not found for removal, ID:', mappingId);
        return;
      }
      
      console.log('📦 Found mapping to remove:', {
        id: mappingToRemove.id,
        _id: mappingToRemove._id,
        isNew: mappingToRemove.isNew,
        ingredientName: mappingToRemove.ingredientId?.name
      });
      
      // If it's an existing mapping (has _id and not isNew), call DELETE API
      if (mappingToRemove._id && !mappingToRemove.isNew) {
        console.log('🔥 Calling DELETE API for mapping:', mappingToRemove._id);
        
        const response = await fetch(`/api/ingredients/mappings/${mappingToRemove._id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('❌ DELETE API failed:', response.status, errorText);
          throw new Error(`Failed to delete ingredient mapping: ${response.status} ${errorText}`);
        }
        
        const result = await response.json();
        console.log('✅ Successfully deleted ingredient mapping from database:', result);
      } else {
        console.log('📝 Skipping API call - mapping is new (isNew:', mappingToRemove.isNew, ')');
      }
      
      // Remove from local state
      const updatedMappings = mappings.filter(mapping => 
        mapping.id !== mappingId && mapping._id !== mappingId
      );
      
      console.log('🔄 Updating local state. Before:', mappings.length, 'After:', updatedMappings.length);
      setMappings(updatedMappings);
      
    } catch (error) {
      console.error('💥 Error removing ingredient mapping:', error);
      // Still remove from UI even if API call fails, user can try again
      const updatedMappings = mappings.filter(mapping => 
        mapping.id !== mappingId && mapping._id !== mappingId
      );
      setMappings(updatedMappings);
    }
  };

  const validateMappings = () => {
    const newErrors = {};
    
    mappings.forEach(mapping => {
      const id = mapping.id || mapping._id;
      
      if (!mapping.quantity || mapping.quantity <= 0) {
        newErrors[id] = 'Quantity must be greater than 0';
      }
      
      if (!mapping.unit) {
        newErrors[id] = 'Unit is required';
      }
    });
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateMappings()) {
      return;
    }
    
    try {
      setSaving(true);
      
      // Separate new mappings from updates (filter out any invalid mappings)
      const validMappings = mappings.filter(m => m.ingredientId && m.ingredientId._id);
      const newMappings = validMappings.filter(m => m.isNew);
      const updatedMappings = validMappings.filter(m => m.isModified && !m.isNew);
      
      // Save new mappings using bulk endpoint - SINGLE REQUEST instead of loop
      if (newMappings.length > 0) {
        const bulkMappings = newMappings.map(mapping => ({
          menuItemId: menuItem.id,
          ingredientId: mapping.ingredientId._id,
          quantity: parseFloat(mapping.quantity),
          unit: mapping.unit,
          isRequired: mapping.isRequired,
          substitutions: mapping.substitutions.map(s => s._id),
          notes: mapping.notes
        }));

        const response = await fetch('/api/ingredients/mappings/bulk', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            mappings: bulkMappings
          })
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to save mappings');
        }
      }
      
      // Update existing mappings (keep individual updates for now)
      for (const mapping of updatedMappings) {
        const response = await fetch(`/api/ingredients/mappings/${mapping._id}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            quantity: parseFloat(mapping.quantity),
            unit: mapping.unit,
            isRequired: mapping.isRequired,
            substitutions: mapping.substitutions.map(s => s._id),
            notes: mapping.notes
          })
        });
        
        if (!response.ok) {
          throw new Error('Failed to update mapping');
        }
      }
      
      if (onSave) {
        onSave(mappings);
      }
      
      // Reload mappings to get fresh data
      await loadExistingMappings();
      
    } catch (error) {
      console.error('Error saving mappings:', error);
      alert('Failed to save ingredient mappings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const calculateTotalCost = () => {
    return mappings.reduce((total, mapping) => {
      const ingredient = mapping.ingredientId;
      const cost = ingredient?.price ? mapping.quantity * ingredient.price : 0;
      return total + cost;
    }, 0);
  };

  const getStockStatus = (ingredient, quantity) => {
    if (!ingredient?.currentStock) {
      return { status: 'unknown', message: 'Stock unknown' };
    }
    
    if (ingredient.currentStock >= quantity) {
      return { status: 'sufficient', message: 'In stock' };
    } else if (ingredient.currentStock > 0) {
      return { status: 'partial', message: `Only ${ingredient.currentStock} available` };
    } else {
      return { status: 'out', message: 'Out of stock' };
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading ingredient mappings...</span>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg border border-gray-200 ${className}`}>
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <Package className="w-5 h-5 mr-2 text-blue-600" />
              Ingredient Mapping
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Map ingredients to track inventory for this menu item
            </p>
          </div>
          
          {!readOnly && mappings.length > 0 && (
            <div className="flex items-center space-x-2">
              <div className="text-right">
                <div className="text-sm font-medium text-gray-900">
                  Ingredient Cost: ${calculateTotalCost().toFixed(2)}
                </div>
                <div className="text-xs text-gray-500">
                  {mappings.length} ingredient{mappings.length !== 1 ? 's' : ''} mapped
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Existing Mappings */}
        {mappings.length > 0 && (
          <div className="space-y-3 mb-4">
            {mappings.map((mapping) => {
              const ingredient = mapping.ingredientId;
              const mappingId = mapping.id || mapping._id;
              const stockStatus = getStockStatus(ingredient, mapping.quantity);
              const error = errors[mappingId];

              return (
                <div 
                  key={mappingId}
                  className={`border rounded-lg p-4 ${error ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-gray-50'}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900">{ingredient?.name}</h4>
                          <p className="text-sm text-gray-600">{ingredient?.category}</p>
                        </div>
                        
                        <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                          stockStatus.status === 'sufficient' ? 'bg-green-100 text-green-800' :
                          stockStatus.status === 'partial' ? 'bg-yellow-100 text-yellow-800' :
                          stockStatus.status === 'out' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {stockStatus.message}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Quantity
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={mapping.quantity}
                            onChange={(e) => updateMapping(mappingId, { quantity: parseFloat(e.target.value) || 0 })}
                            disabled={readOnly}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Unit
                          </label>
                          <select
                            value={mapping.unit}
                            onChange={(e) => updateMapping(mappingId, { unit: e.target.value })}
                            disabled={readOnly}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="grams">Grams</option>
                            <option value="kg">Kilograms</option>
                            <option value="ml">Milliliters</option>
                            <option value="liters">Liters</option>
                            <option value="pieces">Pieces</option>
                            <option value="cups">Cups</option>
                            <option value="tablespoons">Tablespoons</option>
                            <option value="teaspoons">Teaspoons</option>
                          </select>
                        </div>

                        <div className="flex items-center">
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={mapping.isRequired}
                              onChange={(e) => updateMapping(mappingId, { isRequired: e.target.checked })}
                              disabled={readOnly}
                              className="mr-2"
                            />
                            <span className="text-xs font-medium text-gray-700">Required</span>
                          </label>
                        </div>

                        <div className="flex items-center justify-end">
                          {ingredient?.price && (
                            <div className="text-sm text-gray-600 mr-3">
                              ${(mapping.quantity * ingredient.price).toFixed(2)}
                            </div>
                          )}
                          
                          {!readOnly && (
                            <button
                              onClick={() => removeMapping(mappingId)}
                              className="text-red-600 hover:text-red-800 p-1"
                              title="Remove ingredient"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>

                      {error && (
                        <div className="flex items-center mt-2 text-red-600">
                          <AlertCircle className="w-4 h-4 mr-1" />
                          <span className="text-xs">{error}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Add Ingredient Interface */}
        {!readOnly && (
          <div className="border-t pt-4">
            {!showAddForm ? (
              <button
                onClick={() => setShowAddForm(true)}
                className="flex items-center text-blue-600 hover:text-blue-800 font-medium"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Ingredient
              </button>
            ) : (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-gray-900">Add Ingredient</h4>
                  <button
                    onClick={() => {
                      setShowAddForm(false);
                      setSearchTerm('');
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="relative mb-3">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search ingredients..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="max-h-48 overflow-y-auto space-y-2">
                  {availableForMapping.length === 0 ? (
                    <div className="text-center py-4 text-gray-500">
                      {searchTerm ? 'No ingredients found' : 'All available ingredients are already mapped'}
                    </div>
                  ) : (
                    availableForMapping.map(ingredient => (
                      <button
                        key={ingredient._id}
                        onClick={() => addMapping(ingredient)}
                        className="w-full text-left p-3 border border-gray-200 rounded-md hover:bg-white hover:border-blue-300 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium text-gray-900">{ingredient.name}</div>
                            <div className="text-sm text-gray-600">{ingredient.category} • {ingredient.unit}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm text-gray-900">{ingredient.currentStock} available</div>
                            {ingredient.price && (
                              <div className="text-xs text-gray-600">${ingredient.price}/unit</div>
                            )}
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        {!readOnly && (mappings.some(m => m.isNew || m.isModified) || mappings.length === 0) && (
          <div className="flex items-center justify-end space-x-3 pt-4 border-t">
            <button
              onClick={onCancel}
              disabled={saving}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || mappings.length === 0}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Mappings
                </>
              )}
            </button>
          </div>
        )}

        {mappings.length === 0 && !showAddForm && (
          <div className="text-center py-8 text-gray-500">
            <Package className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium mb-2">No ingredients mapped</p>
            <p className="text-sm mb-4">
              This menu item doesn't track ingredient usage. Add ingredients to enable inventory tracking.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default IngredientMapper;