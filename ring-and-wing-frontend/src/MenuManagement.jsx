import { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';

const colors = {
  primary: '#2e0304',
  background: '#fefdfd',
  accent: '#f1670f',
  secondary: '#853619',
  muted: '#ac9c9b',
  activeBg: '#f1670f20',
  activeBorder: '#f1670f',
  hoverBg: '#f1670f10'
};

// Updated MENU_CONFIG with Milktea as a top-level category
const MENU_CONFIG = {
  Beverages: {
    subCategories: [
      'Coffee',
      'Non-Coffee (Milk-Based)',
      'Fruit Tea',
      'Fruit Soda',
      'Yogurt Smoothies',
      'Fresh Lemonade',
      'Frappe'
    ],
    modifiers: {
      Coffee: {
        sizes: ['Hot (S)', 'Hot (M)', 'Cold (M)', 'Cold (L)', 'Float (M)', 'Float (L)'],
        addons: []
      },
      'Non-Coffee (Milk-Based)': {
        sizes: ['Hot (S)', 'Hot (M)', 'Cold (M)', 'Cold (L)', 'Float (M)', 'Float (L)'],
        addons: []
      },
      'Fruit Tea': {
        sizes: ['Medium', 'Large'],
        addons: []
      },
      'Fruit Soda': {
        sizes: ['Medium', 'Large'],
        addons: []
      },
      'Yogurt Smoothies': {
        sizes: ['Medium'],
        addons: []
      },
      'Fresh Lemonade': {
        sizes: ['Medium', 'Large'],
        addons: []
      },
      Frappe: {
        sizes: ['Medium', 'Large'],
        addons: []
      }
    }
  },
  Milktea: {
    subCategories: ['Regular', 'Special'],
    modifiers: {
      sizes: ['Medium', 'Large'],
      addons: ['Tapioca Pearls (+15)', 'Nata (+15)', 'Nutella (+15)', 'Cream Puff (+15)']
    }
  },
  Meals: {
    subCategories: ['Breakfast All Day', 'Wings & Sides', 'Rice Meals'],
    modifiers: {
      sizes: [],
      addons: ['Add Rice (+40)', 'Add Drink (+40)']
    }
  },
  Wings: {
    subCategories: ['Flavored Wings', 'Combos', 'Snacks'],
    modifiers: {
      sizes: [],
      addons: ['Extra Sauce (+20)', 'Extra Dip (+15)']
    }
  }
};

// Updated initialItem with additional fields and proper subCategory initialization
const initialItem = {
  name: '',
  category: 'Beverages',
  subCategory: MENU_CONFIG.Beverages.subCategories[0],
  pricing: {},
  description: '',
  image: '',
  modifiers: [],
  preparationTime: 15,
  isAvailable: true,
  ingredients: []
};

const MenuPage = () => {
  const [menuItems, setMenuItems] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [loading, setLoading] = useState(true);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    control,
    formState: { errors }
  } = useForm({
    defaultValues: initialItem
  });

  // Field Array for custom add-ons / additional modifiers
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'modifiers'
  });

  // Watch for category and subcategory selections
  const selectedCategory = watch('category');
  const selectedSubCategory = watch('subCategory');

  // Reset subCategory when category changes
  useEffect(() => {
    reset((formValues) => ({
      ...formValues,
      subCategory: MENU_CONFIG[formValues.category]?.subCategories[0] || ''
    }));
  }, [selectedCategory, reset]);

  // Fetch menu items from backend
  useEffect(() => {
    const fetchMenuItems = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/menu');
        const data = await response.json();
        setMenuItems(data);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching menu items:', error);
        setLoading(false);
      }
    };

    fetchMenuItems();
  }, []);

  // Handle image change with validation
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file && !file.type.startsWith('image/')) {
      alert('Please upload an image file');
      return;
    }
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result);
      reader.readAsDataURL(file);
      setImageFile(file);
    } else {
      setImagePreview(null);
      setImageFile(null);
    }
  };

  // onSubmit processes category-specific pricing and addons
  const onSubmit = async (data) => {
    try {
      const categoryConfig = MENU_CONFIG[data.category]?.modifiers[data.subCategory];
      const processedPricing =
        categoryConfig?.sizes && categoryConfig.sizes.length > 0
          ? Object.fromEntries(
              categoryConfig.sizes.map((size) => [size, data.pricing[size]])
            )
          : { base: data.pricing.base };

      // Predefined addons auto-population
      const predefinedAddons =
        categoryConfig?.addons?.map((addon) => {
          const name = addon.split(' (+')[0];
          const price = parseInt(addon.match(/\(([^)]+)\)/)?.[1]) || 0;
          return { name, price };
        }) || [];

      const formData = new FormData();
      formData.append('name', data.name);
      formData.append('category', data.category);
      formData.append('subCategory', data.subCategory);
      formData.append('description', data.description);
      formData.append('pricing', JSON.stringify(processedPricing));
      formData.append('modifiers', JSON.stringify([...predefinedAddons, ...data.modifiers]));

      if (imageFile) {
        formData.append('image', imageFile);
      }

      const method = selectedItem?._id ? 'PUT' : 'POST';
      const url = selectedItem?._id
        ? `http://localhost:5000/api/menu/${selectedItem._id}`
        : 'http://localhost:5000/api/menu';

      const response = await fetch(url, {
        method,
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to save item');
      }

      const result = await response.json();

      setMenuItems((prev) =>
        selectedItem?._id
          ? prev.map((item) => (item._id === result._id ? result : item))
          : [...prev, result]
      );
      reset();
      setImagePreview(null);
      setImageFile(null);
      setSelectedItem(null);
    } catch (error) {
      console.error('Error saving menu item:', error);
      alert(`Error: ${error.message}`);
    }
  };

  // Delete handler with updated error handling
  const handleDelete = async () => {
    if (!selectedItem?._id) return;

    try {
      const response = await fetch(`http://localhost:5000/api/menu/${selectedItem._id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete item');
      }

      setMenuItems((prev) => prev.filter((item) => item._id !== selectedItem._id));
      setShowDeleteModal(false);
      setSelectedItem(null);
    } catch (error) {
      console.error('Error deleting menu item:', error);
      alert(`Delete failed: ${error.message}`);
    }
  };

  // Load selected item data into form when editing
  useEffect(() => {
  if (selectedItem) {
    reset({
      ...selectedItem,
      subCategory: selectedItem.subCategory || MENU_CONFIG[selectedItem.category]?.subCategories[0]
    });
    
    // Fix: Prepend server URL to image path
    if (selectedItem.image) {
      setImagePreview(`http://localhost:5000/public${selectedItem.image}`);
    } else {
      setImagePreview(null);
    }
  }
}, [selectedItem, reset]);

  if (loading) return <p>Loading...</p>;

  return (
    <div style={{ backgroundColor: colors.background }} className="min-h-screen p-8 ml-0 md:ml-64">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 style={{ color: colors.primary }} className="text-3xl font-bold mb-4">
            Menu Management
          </h1>
          <button
            style={{ backgroundColor: colors.accent, color: colors.background }}
            className="px-4 py-2 rounded-lg hover:opacity-90"
            onClick={() => setSelectedItem(initialItem)}
          >
            Add New Item
          </button>
        </div>

        {/* Menu List Table */}
        <div className="overflow-x-auto rounded-lg border" style={{ borderColor: colors.muted }}>
          <table className="w-full">
            <thead style={{ backgroundColor: colors.primary, position: 'sticky', top: 0 }}>
              <tr>
                <th className="p-3 text-left text-white">Name</th>
                <th className="p-3 text-left text-white">Category</th>
                <th className="p-3 text-left text-white">Price</th>
                <th className="p-3 text-left text-white">Modifiers</th>
                <th className="p-3 text-left text-white">Actions</th>
              </tr>
            </thead>
            <tbody>
              {menuItems.map((item) => (
                <tr key={item._id} style={{ borderColor: colors.activeBg }} className="border-t">
                  <td className="p-3">{item.name}</td>
                  <td className="p-3">{item.category}</td>
                  <td className="p-3">
                    {typeof item.pricing === 'object'
                      ? Object.entries(item.pricing)
                          .map(([key, price]) => `${key}: ₱${price}`)
                          .join(', ')
                      : `₱${item.pricing}`}
                  </td>
                  <td className="p-3">{item.modifiers.map((m) => m.name || m.type).join(', ')}</td>
                  <td className="p-3 flex gap-2">
                    <button
                      style={{ color: colors.accent }}
                      className="hover:underline"
                      onClick={() => setSelectedItem(item)}
                    >
                      Edit
                    </button>
                    {/* Delete Button Fix: Set selectedItem and then open modal */}
                    <button
                      style={{ color: colors.secondary }}
                      className="hover:underline"
                      onClick={() => {
                        setSelectedItem(item);
                        setShowDeleteModal(true);
                      }}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Add/Edit Form Modal */}
        {selectedItem && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center md:pl-64">
            <div style={{ backgroundColor: colors.background }} className="p-6 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <h2 className="text-2xl font-bold mb-4" style={{ color: colors.primary }}>
                {selectedItem._id ? 'Edit' : 'Add'} Menu Item
              </h2>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                {/* Image Upload Section */}
                <div>
                  <label className="block mb-1">Item Image (Optional)</label>
                  <div className="flex items-center gap-4">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="w-full p-2 border rounded"
                      style={{ borderColor: colors.muted }}
                    />
                    {imagePreview && (
                      <div className="relative">
                        <img
                          src={imagePreview}
                          alt="Preview"
                          className="h-24 w-24 object-cover rounded border"
                          style={{ borderColor: colors.muted }}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setImagePreview(null);
                            setImageFile(null);
                          }}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 text-xs"
                        >
                          ×
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Item Name */}
                <div>
                  <label className="block mb-1">Item Name</label>
                  <input
                    {...register('name', { required: 'Item name is required' })}
                    className="w-full p-2 border rounded"
                    style={{ borderColor: colors.muted }}
                    placeholder="e.g., Café Americano"
                  />
                  {errors.name && <span className="text-red-500 text-sm">{errors.name.message}</span>}
                </div>

                {/* Category/Subcategory Section */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block mb-1">Category</label>
                    <select
                      {...register('category')}
                      className="w-full p-2 border rounded"
                      style={{ borderColor: colors.muted }}
                    >
                      {Object.keys(MENU_CONFIG).map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block mb-1">Subcategory</label>
                    <select
                      {...register('subCategory')}
                      className="w-full p-2 border rounded"
                      style={{ borderColor: colors.muted }}
                    >
                      {MENU_CONFIG[selectedCategory]?.subCategories.map((sub) => (
                        <option key={sub} value={sub}>
                          {sub}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Dynamic Pricing */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold" style={{ color: colors.secondary }}>
                    Pricing
                  </h3>
                  {MENU_CONFIG[selectedCategory]?.modifiers[selectedSubCategory]?.sizes?.length > 0 ? (
                    <div className="grid grid-cols-2 gap-4">
                      {MENU_CONFIG[selectedCategory].modifiers[selectedSubCategory].sizes.map((size) => (
                        <div key={size} className="flex items-center gap-2">
                          <label className="w-32">{size}</label>
                          <input
                            type="number"
                            {...register(`pricing.${size}`, { required: true })}
                            className="flex-1 p-2 border rounded"
                            style={{ borderColor: colors.muted }}
                            placeholder="Price"
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <label className="w-32">Base Price</label>
                      <input
                        type="number"
                        {...register('pricing.base', { required: true })}
                        className="flex-1 p-2 border rounded"
                        style={{ borderColor: colors.muted }}
                        placeholder="Price"
                      />
                    </div>
                  )}
                </div>

                {/* Description */}
                <div>
                  <label className="block mb-1">Description</label>
                  <textarea
                    {...register('description')}
                    className="w-full p-2 border rounded"
                    style={{ borderColor: colors.muted }}
                    rows="3"
                    placeholder="Item description..."
                  />
                </div>

                {/* Add-ons Management for Milktea or Meals */}
                {(selectedCategory === 'Milktea' || selectedCategory === 'Meals') && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold" style={{ color: colors.secondary }}>
                      Add-ons
                    </h3>
                    {/* Predefined add-ons */}
                    {MENU_CONFIG[selectedCategory]?.modifiers[selectedSubCategory]?.addons?.map((addon, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <input
                          value={addon.split(' (+')[0]}
                          readOnly
                          className="flex-1 p-2 border rounded bg-gray-100"
                          style={{ borderColor: colors.muted }}
                        />
                        <input
                          value={addon.match(/\(([^)]+)\)/)?.[1] || '0'}
                          readOnly
                          className="w-24 p-2 border rounded bg-gray-100"
                          style={{ borderColor: colors.muted }}
                        />
                      </div>
                    ))}
                    {/* Custom add-ons */}
                    {fields.map((field, index) => (
                      <div key={field.id} className="flex items-center gap-2">
                        <input
                          {...register(`modifiers.${index}.name`)}
                          className="flex-1 p-2 border rounded"
                          style={{ borderColor: colors.muted }}
                          placeholder="Add-on name"
                        />
                        <input
                          type="number"
                          {...register(`modifiers.${index}.price`)}
                          className="w-24 p-2 border rounded"
                          style={{ borderColor: colors.muted }}
                          placeholder="Price"
                        />
                        <button
                          type="button"
                          onClick={() => remove(index)}
                          style={{ color: colors.secondary }}
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      style={{ backgroundColor: colors.secondary, color: colors.background }}
                      className="px-3 py-1 rounded text-sm"
                      onClick={() => append({ name: '', price: 0 })}
                    >
                      Add Add-on
                    </button>
                  </div>
                )}

                {/* Custom Additional Modifiers */}
                <div>
                  <h3 className="text-lg font-semibold">Additional Modifiers</h3>
                  {fields.map((modifier, index) => (
                    <div key={modifier.id} className="p-4 border rounded-lg mb-2" style={{ borderColor: colors.muted }}>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label>Modifier Type</label>
                          <select
                            {...register(`modifiers.${index}.type`)}
                            className="w-full p-2 border rounded"
                            style={{ borderColor: colors.muted }}
                          >
                            <option value="size">Size</option>
                            <option value="add-ons">Add-ons</option>
                            <option value="rice">Rice</option>
                            <option value="drink">Drink</option>
                          </select>
                        </div>
                        <div>
                          <label>Options (comma separated)</label>
                          <input
                            {...register(`modifiers.${index}.options`)}
                            className="w-full p-2 border rounded"
                            style={{ borderColor: colors.muted }}
                            placeholder="e.g., Small, Medium, Large"
                          />
                        </div>
                      </div>
                      <div className="mt-2 text-sm text-gray-600">
                        {watch(`modifiers.${index}.type`) === 'size' && 'Example: Hot (S), Cold (L)'}
                        {watch(`modifiers.${index}.type`) === 'add-ons' && 'Example: Tapioca Pearls, Nata'}
                        {watch(`modifiers.${index}.type`) === 'rice' && 'Example: Add Rice'}
                        {watch(`modifiers.${index}.type`) === 'drink' && 'Example: Coffee, Lemonade'}
                      </div>
                    </div>
                  ))}
                  <button
                    type="button"
                    style={{ backgroundColor: colors.secondary, color: colors.background }}
                    className="px-3 py-1 rounded text-sm"
                    onClick={() => append({ type: 'size', options: '' })}
                  >
                    Add Modifier
                  </button>
                </div>

                {/* Special Notes for Meals */}
                {selectedCategory === 'Meals' && (
                  <div>
                    <label>Meal Options</label>
                    <textarea
                      {...register('description')}
                      placeholder="Include any meal-specific notes here..."
                      className="w-full p-2 border rounded"
                      style={{ borderColor: colors.muted }}
                    />
                  </div>
                )}

                {/* Form Actions */}
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    className="px-4 py-2 border rounded"
                    style={{ borderColor: colors.muted }}
                    onClick={() => setSelectedItem(null)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    style={{ backgroundColor: colors.primary, color: colors.background }}
                    className="px-4 py-2 rounded hover:opacity-90"
                  >
                    Save Item
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <div style={{ backgroundColor: colors.background }} className="p-6 rounded-lg">
              <h3 className="text-lg font-bold mb-4">Confirm Delete</h3>
              <p className="mb-4">Are you sure you want to delete this item?</p>
              <div className="flex justify-end gap-2">
                <button
                  className="px-4 py-2 border rounded"
                  style={{ borderColor: colors.muted }}
                  onClick={() => setShowDeleteModal(false)}
                >
                  Cancel
                </button>
                <button
                  style={{ backgroundColor: colors.secondary, color: colors.background }}
                  className="px-4 py-2 rounded hover:opacity-90"
                  onClick={handleDelete}
                >
                  Confirm Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MenuPage;
