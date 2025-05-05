import { useState } from 'react';
import { theme } from '../../theme';
import { Card } from './Card';
import { Button } from './Button';
import { Input } from './Input';
import { FiPlus, FiX, FiEdit2 } from 'react-icons/fi';

export const CategoryPicker = ({
  categories = [],
  selectedCategory,
  onSelect,
  onAdd,
  onEdit,
  onDelete,
  allowCustom = false,
  allowEdit = false,
  className = ''
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newCategory, setNewCategory] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState('');

  const handleAdd = () => {
    if (newCategory.trim()) {
      onAdd(newCategory.trim());
      setNewCategory('');
      setIsAdding(false);
    }
  };

  const handleEdit = (id) => {
    if (editValue.trim()) {
      onEdit(id, editValue.trim());
      setEditingId(null);
      setEditValue('');
    }
  };

  const startEditing = (category) => {
    setEditingId(category.id);
    setEditValue(category.name);
  };

  return (
    <Card className={className}>
      <div className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 
            className="text-sm font-medium"
            style={{ color: theme.colors.primary }}
          >
            Categories
          </h3>
          {allowCustom && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsAdding(true)}
            >
              <FiPlus className="w-4 h-4 mr-1" />
              Add New
            </Button>
          )}
        </div>

        {/* Add New Category Form */}
        {isAdding && (
          <div className="flex gap-2 mb-4">
            <Input
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              placeholder="Enter category name"
              className="flex-1"
              autoFocus
            />
            <Button
              variant="primary"
              onClick={handleAdd}
            >
              Add
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                setIsAdding(false);
                setNewCategory('');
              }}
            >
              Cancel
            </Button>
          </div>
        )}

        {/* Categories Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {categories.map((category) => (
            <div key={category.id}>
              {editingId === category.id ? (
                <div className="flex gap-1">
                  <Input
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="flex-1 text-sm"
                    autoFocus
                  />
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleEdit(category.id)}
                  >
                    Save
                  </Button>
                </div>
              ) : (
                <button
                  onClick={() => onSelect(category)}
                  className={`
                    w-full py-2 px-3 rounded-lg text-sm font-medium
                    transition-all duration-200 group relative
                    ${selectedCategory?.id === category.id ? 'ring-2' : ''}
                  `}
                  style={{
                    backgroundColor: selectedCategory?.id === category.id 
                      ? theme.colors.accent 
                      : theme.colors.activeBg,
                    color: selectedCategory?.id === category.id 
                      ? theme.colors.background 
                      : theme.colors.primary,
                    ringColor: theme.colors.accent
                  }}
                >
                  <span className="truncate block">{category.name}</span>
                  
                  {allowEdit && (
                    <div 
                      className="absolute right-1 top-1/2 -translate-y-1/2 
                        opacity-0 group-hover:opacity-100 transition-opacity
                        flex items-center gap-1"
                    >
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          startEditing(category);
                        }}
                        className="p-1 rounded hover:bg-black/10"
                      >
                        <FiEdit2 className="w-3 h-3" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete(category.id);
                        }}
                        className="p-1 rounded hover:bg-black/10"
                      >
                        <FiX className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
};