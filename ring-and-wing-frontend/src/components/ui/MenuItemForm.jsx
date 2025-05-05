import { useState } from 'react';
import { theme } from '../../theme';
import { Card } from './Card';
import { Input } from './Input';
import { Button } from './Button';
import { FiTrash2, FiPlus, FiUpload } from 'react-icons/fi';

export const MenuItemForm = ({
  initialData,
  onSubmit,
  onCancel,
  isLoading = false
}) => {
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    category: '',
    description: '',
    image: null,
    pricing: {
      base: ''
    },
    ...initialData
  });

  const [imagePreview, setImagePreview] = useState(initialData?.image || null);
  const [sizes, setSizes] = useState(
    Object.keys(initialData?.pricing || {}).length > 0 
      ? Object.keys(initialData?.pricing || {}) 
      : ['base']
  );

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData({ ...formData, image: file });
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handlePriceChange = (size, value) => {
    setFormData({
      ...formData,
      pricing: {
        ...formData.pricing,
        [size]: value ? parseFloat(value) : ''
      }
    });
  };

  const addSize = () => {
    const newSize = `size${sizes.length + 1}`;
    setSizes([...sizes, newSize]);
    setFormData({
      ...formData,
      pricing: {
        ...formData.pricing,
        [newSize]: ''
      }
    });
  };

  const removeSize = (sizeToRemove) => {
    const newSizes = sizes.filter(size => size !== sizeToRemove);
    const newPricing = { ...formData.pricing };
    delete newPricing[sizeToRemove];
    
    setSizes(newSizes);
    setFormData({
      ...formData,
      pricing: newPricing
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <Card>
      <form onSubmit={handleSubmit} className="space-y-6 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <Input
              label="Item Code"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              required
              placeholder="Enter item code"
            />
          </div>
          
          <div>
            <Input
              label="Item Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              placeholder="Enter item name"
            />
          </div>
        </div>

        <div>
          <Input
            label="Category"
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            required
            placeholder="Enter category"
          />
        </div>

        <div>
          <Input
            label="Description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Enter description"
            multiline
            rows={3}
          />
        </div>

        <div>
          <label 
            className="block text-sm font-medium mb-2"
            style={{ color: theme.colors.primary }}
          >
            Item Image
          </label>
          
          <div className="flex items-start gap-4">
            {imagePreview && (
              <div className="relative">
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="w-24 h-24 rounded-lg object-cover"
                />
                <button
                  type="button"
                  onClick={() => {
                    setImagePreview(null);
                    setFormData({ ...formData, image: null });
                  }}
                  className="absolute -top-2 -right-2 p-1 rounded-full"
                  style={{ backgroundColor: theme.colors.error }}
                >
                  <FiTrash2 className="w-4 h-4 text-white" />
                </button>
              </div>
            )}
            
            <div>
              <Button
                type="button"
                variant="secondary"
                onClick={() => document.getElementById('imageInput').click()}
              >
                <FiUpload className="w-4 h-4 mr-2" />
                Upload Image
              </Button>
              <input
                id="imageInput"
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
              />
            </div>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label 
              className="block text-sm font-medium"
              style={{ color: theme.colors.primary }}
            >
              Pricing
            </label>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={addSize}
            >
              <FiPlus className="w-4 h-4 mr-1" />
              Add Size
            </Button>
          </div>

          <div className="space-y-3">
            {sizes.map((size) => (
              <div key={size} className="flex gap-3">
                <Input
                  value={size}
                  onChange={(e) => {
                    const newPricing = { ...formData.pricing };
                    const price = newPricing[size];
                    delete newPricing[size];
                    newPricing[e.target.value] = price;
                    setFormData({ ...formData, pricing: newPricing });
                    setSizes(sizes.map(s => s === size ? e.target.value : s));
                  }}
                  placeholder="Size name"
                  className="flex-1"
                />
                <Input
                  type="number"
                  value={formData.pricing[size]}
                  onChange={(e) => handlePriceChange(size, e.target.value)}
                  placeholder="Price"
                  className="flex-1"
                  step="0.01"
                  min="0"
                />
                {sizes.length > 1 && (
                  <Button
                    type="button"
                    variant="danger"
                    size="sm"
                    onClick={() => removeSize(size)}
                  >
                    <FiTrash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="secondary"
            onClick={onCancel}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            isLoading={isLoading}
          >
            {initialData ? 'Update Item' : 'Create Item'}
          </Button>
        </div>
      </form>
    </Card>
  );
};