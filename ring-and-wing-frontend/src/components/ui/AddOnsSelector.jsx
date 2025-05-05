import { useState, useEffect } from 'react';
import { theme } from '../../theme';
import { Card } from './Card';
import { Button } from './Button';
import { Input } from './Input';
import { FiPlus, FiMinus, FiEdit2, FiTrash2 } from 'react-icons/fi';

export const AddOnsSelector = ({
  addOns = [],
  selectedAddOns = [],
  onSelect,
  onQuantityChange,
  allowManage = false,
  onAddNew,
  onEdit,
  onDelete,
  maxSelections,
  className = ''
}) => {
  const [selectedItems, setSelectedItems] = useState(
    selectedAddOns.reduce((acc, item) => ({
      ...acc,
      [item.id]: item.quantity || 1
    }), {})
  );

  const [editingAddOn, setEditingAddOn] = useState(null);
  const [newAddOn, setNewAddOn] = useState({
    name: '',
    price: ''
  });

  useEffect(() => {
    const selections = selectedAddOns.reduce((acc, item) => ({
      ...acc,
      [item.id]: item.quantity || 1
    }), {});
    setSelectedItems(selections);
  }, [selectedAddOns]);

  const handleToggle = (addOn) => {
    const newSelections = { ...selectedItems };
    
    if (newSelections[addOn.id]) {
      delete newSelections[addOn.id];
    } else {
      if (maxSelections && Object.keys(newSelections).length >= maxSelections) {
        return;
      }
      newSelections[addOn.id] = 1;
    }
    
    setSelectedItems(newSelections);
    notifyChanges(newSelections);
  };

  const handleQuantityChange = (addOn, change) => {
    const currentQty = selectedItems[addOn.id] || 0;
    const newQty = Math.max(0, currentQty + change);
    
    const newSelections = { ...selectedItems };
    if (newQty === 0) {
      delete newSelections[addOn.id];
    } else {
      newSelections[addOn.id] = newQty;
    }
    
    setSelectedItems(newSelections);
    notifyChanges(newSelections);
  };

  const notifyChanges = (selections) => {
    const selectedItems = addOns
      .filter(item => selections[item.id])
      .map(item => ({
        ...item,
        quantity: selections[item.id]
      }));
    
    onSelect(selectedItems);
  };

  const handleSaveAddOn = () => {
    if (editingAddOn) {
      onEdit(editingAddOn.id, {
        name: editingAddOn.name,
        price: parseFloat(editingAddOn.price)
      });
    } else {
      onAddNew({
        name: newAddOn.name,
        price: parseFloat(newAddOn.price)
      });
    }
    
    setEditingAddOn(null);
    setNewAddOn({ name: '', price: '' });
  };

  const totalSelected = Object.keys(selectedItems).length;
  const remainingSelections = maxSelections ? maxSelections - totalSelected : null;

  return (
    <Card className={className}>
      <div className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 
              className="text-sm font-medium"
              style={{ color: theme.colors.primary }}
            >
              Add-Ons
            </h3>
            {maxSelections && (
              <p 
                className="text-xs mt-1"
                style={{ color: theme.colors.muted }}
              >
                Select up to {maxSelections} items 
                ({remainingSelections} remaining)
              </p>
            )}
          </div>

          {allowManage && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setEditingAddOn({ name: '', price: '' })}
            >
              <FiPlus className="w-4 h-4 mr-1" />
              Add New
            </Button>
          )}
        </div>

        {/* Add/Edit Form */}
        {(editingAddOn || allowManage) && (
          <div className="mb-4 p-3 rounded-lg space-y-3" style={{ backgroundColor: theme.colors.activeBg }}>
            <Input
              label="Name"
              value={editingAddOn ? editingAddOn.name : newAddOn.name}
              onChange={(e) => {
                if (editingAddOn) {
                  setEditingAddOn({ ...editingAddOn, name: e.target.value });
                } else {
                  setNewAddOn({ ...newAddOn, name: e.target.value });
                }
              }}
              placeholder="Add-on name"
            />
            <Input
              label="Price"
              type="number"
              value={editingAddOn ? editingAddOn.price : newAddOn.price}
              onChange={(e) => {
                if (editingAddOn) {
                  setEditingAddOn({ ...editingAddOn, price: e.target.value });
                } else {
                  setNewAddOn({ ...newAddOn, price: e.target.value });
                }
              }}
              placeholder="0.00"
              step="0.01"
              min="0"
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setEditingAddOn(null);
                  setNewAddOn({ name: '', price: '' });
                }}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleSaveAddOn}
                disabled={
                  editingAddOn 
                    ? !editingAddOn.name || !editingAddOn.price
                    : !newAddOn.name || !newAddOn.price
                }
              >
                {editingAddOn ? 'Update' : 'Add'}
              </Button>
            </div>
          </div>
        )}

        {/* Add-ons List */}
        <div className="space-y-2">
          {addOns.map((addOn) => (
            <div
              key={addOn.id}
              className={`
                p-3 rounded-lg transition-all duration-200
                ${selectedItems[addOn.id] ? 'ring-2' : ''}
              `}
              style={{
                backgroundColor: selectedItems[addOn.id] 
                  ? theme.colors.activeBg 
                  : theme.colors.background,
                ringColor: theme.colors.accent
              }}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <h4 
                      className="font-medium truncate"
                      style={{ color: theme.colors.primary }}
                    >
                      {addOn.name}
                    </h4>
                    <span 
                      className="text-sm"
                      style={{ color: theme.colors.secondary }}
                    >
                      ₱{addOn.price.toFixed(2)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {allowManage ? (
                    <>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setEditingAddOn(addOn)}
                      >
                        <FiEdit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => onDelete(addOn.id)}
                      >
                        <FiTrash2 className="w-4 h-4" />
                      </Button>
                    </>
                  ) : (
                    selectedItems[addOn.id] ? (
                      <div className="flex items-center gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleQuantityChange(addOn, -1)}
                        >
                          <FiMinus className="w-4 h-4" />
                        </Button>
                        <span 
                          className="w-8 text-center"
                          style={{ color: theme.colors.primary }}
                        >
                          {selectedItems[addOn.id]}
                        </span>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleQuantityChange(addOn, 1)}
                        >
                          <FiPlus className="w-4 h-4" />
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleToggle(addOn)}
                        disabled={maxSelections && totalSelected >= maxSelections}
                      >
                        Add
                      </Button>
                    )
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {addOns.length === 0 && (
          <div 
            className="text-center py-6 text-sm"
            style={{ color: theme.colors.muted }}
          >
            No add-ons available
          </div>
        )}
      </div>
    </Card>
  );
};