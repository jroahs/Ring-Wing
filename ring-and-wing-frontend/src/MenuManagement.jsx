import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';

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
      Coffee: { sizes: ['Hot (S)', 'Hot (M)', 'Cold (M)', 'Cold (L)', 'Float (M)', 'Float (L)'] },
      'Non-Coffee (Milk-Based)': { sizes: ['Hot (S)', 'Hot (M)', 'Cold (M)', 'Cold (L)', 'Float (M)', 'Float (L)'] },
      'Fruit Tea': { sizes: ['Medium', 'Large'] },
      'Fruit Soda': { sizes: ['Medium', 'Large'] },
      'Yogurt Smoothies': { sizes: ['Medium'] },
      'Fresh Lemonade': { sizes: ['Medium', 'Large'] },
      Frappe: { sizes: ['Medium', 'Large'] }
    }
  },
  Milktea: {
    subCategories: ['Regular', 'Special'],
    modifiers: { sizes: ['Medium', 'Large'] }
  },
  Meals: {
    subCategories: ['Breakfast All Day', 'Wings & Sides', 'Rice Meals'],
    modifiers: { sizes: [] }
  },
  Wings: {
    subCategories: ['Flavored Wings', 'Combos', 'Snacks'],
    modifiers: { sizes: [] }
  }
};

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
  const [addOns, setAddOns] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showAddOnModal, setShowAddOnModal] = useState(false);
  const [addOnToDelete, setAddOnToDelete] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [newAddOn, setNewAddOn] = useState({
    name: '',
    price: 0,
    category: 'Beverages'
  });

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors }
  } = useForm({
    defaultValues: initialItem
  });

  const selectedCategory = watch('category');
  const selectedSubCategory = watch('subCategory');

  const createAddOn = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/add-ons', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newAddOn)
      });

      if (!response.ok) throw new Error('Failed to create add-on');

      const result = await response.json();
      setAddOns((prev) => [...prev, result]);
      setShowAddOnModal(false);
      setNewAddOn({ name: '', price: 0, category: 'Beverages' });
    } catch (error) {
      console.error('Error creating add-on:', error);
      alert(`Error: ${error.message}`);
    }
  };

  const deleteAddOn = async (addOnId) => {
    try {
      const response = await fetch(`http://localhost:5000/api/add-ons/${addOnId}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Failed to delete add-on');

      setAddOns((prev) => prev.filter((addOn) => addOn._id !== addOnId));
      setAddOnToDelete(null);
    } catch (error) {
      console.error('Error deleting add-on:', error);
      alert(`Error: ${error.message}`);
    }
  };

  // Fetch menu items and add-ons
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [menuRes, addOnsRes] = await Promise.all([
          fetch('http://localhost:5000/api/menu'),
          fetch('http://localhost:5000/api/add-ons')
        ]);

        const menuData = await menuRes.json();
        const addOnsData = await addOnsRes.json();

        setMenuItems(menuData);
        setAddOns(addOnsData);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching data:', error);
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Handle image upload
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

  // Form submission
  const onSubmit = async (data) => {
    try {
      const categoryConfig = MENU_CONFIG[data.category]?.modifiers[data.subCategory];
      const processedPricing =
        categoryConfig?.sizes?.length > 0
          ? Object.fromEntries(categoryConfig.sizes.map((size) => [size, data.pricing[size]]))
          : { base: data.pricing.base };

      const formData = new FormData();
      formData.append('name', data.name);
      formData.append('category', data.category);
      formData.append('subCategory', data.subCategory);
      formData.append('description', data.description);
      formData.append('pricing', JSON.stringify(processedPricing));
      formData.append('modifiers', JSON.stringify(data.modifiers));

      if (imageFile) formData.append('image', imageFile);

      const method = selectedItem?._id ? 'PUT' : 'POST';
      const url = selectedItem?._id
        ? `http://localhost:5000/api/menu/${selectedItem._id}`
        : 'http://localhost:5000/api/menu';

      const response = await fetch(url, { method, body: formData });
      if (!response.ok) throw new Error('Failed to save item');

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
      console.error('Error saving item:', error);
      alert(`Error: ${error.message}`);
    }
  };

  // Delete handler
  const handleDelete = async () => {
    if (!selectedItem?._id) return;

    try {
      const response = await fetch(`http://localhost:5000/api/menu/${selectedItem._id}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Failed to delete item');

      setMenuItems((prev) => prev.filter((item) => item._id !== selectedItem._id));
      setShowDeleteModal(false);
      setSelectedItem(null);
    } catch (error) {
      console.error('Delete error:', error);
      alert(`Delete failed: ${error.message}`);
    }
  };

  // Load selected item for editing
  useEffect(() => {
    if (selectedItem) {
      reset({
        ...selectedItem,
        subCategory:
          selectedItem.subCategory ||
          MENU_CONFIG[selectedItem.category]?.subCategories[0]
      });
      if (selectedItem.image) {
        setImagePreview(`http://localhost:5000/public${selectedItem.image}`);
      }
    }
  }, [selectedItem, reset]);

  if (loading) return <p>Loading...</p>;

  return (
    <div
      style={{ backgroundColor: colors.background }}
      className="min-h-screen p-8 ml-0 md:ml-64"
    >
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
        <div
          className="overflow-x-auto rounded-lg border"
          style={{ borderColor: colors.muted }}
        >
          <table className="w-full">
            <thead
              style={{ backgroundColor: colors.primary, position: 'sticky', top: 0 }}
            >
              <tr>
                <th className="p-3 text-left text-white">Name</th>
                <th className="p-3 text-left text-white">Category</th>
                <th className="p-3 text-left text-white">Price</th>
                <th className="p-3 text-left text-white">Add-Ons</th>
                <th className="p-3 text-left text-white">Actions</th>
              </tr>
            </thead>
            <tbody>
              {menuItems.map((item) => (
                <tr
                  key={item._id}
                  style={{ borderColor: colors.activeBg }}
                  className="border-t"
                >
                  <td className="p-3">{item.name}</td>
                  <td className="p-3">{item.category}</td>
                  <td className="p-3">
                    {Object.entries(item.pricing).map(([size, price]) => (
                      <div key={size}>
                        {size}: ₱{price}
                      </div>
                    ))}
                  </td>
                  <td className="p-3">
                    {item.modifiers
                      .map((id) => addOns.find((a) => a._id === id)?.name)
                      .join(', ')}
                  </td>
                  <td className="p-3 flex gap-2">
                    <button
                      style={{ color: colors.accent }}
                      className="hover:underline"
                      onClick={() => setSelectedItem(item)}
                    >
                      Edit
                    </button>
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
            <div
              style={{ backgroundColor: colors.background }}
              className="p-6 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            >
              <h2
                className="text-2xl font-bold mb-4"
                style={{ color: colors.primary }}
              >
                {selectedItem._id ? 'Edit' : 'Add'} Menu Item
              </h2>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                {/* Image Upload */}
                <div>
                  <label className="block mb-1">Item Image</label>
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

                {/* Basic Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block mb-1">Name</label>
                    <input
                      {...register('name', { required: 'Required' })}
                      className="w-full p-2 border rounded"
                      style={{ borderColor: colors.muted }}
                    />
                    {errors.name && (
                      <span className="text-red-500 text-sm">
                        {errors.name.message}
                      </span>
                    )}
                  </div>
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
                        // Corrected the value prop here:
                        // vvv
                        <option key={sub} value={sub}>
                          {sub}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Pricing */}
                <div className="space-y-4">
                  <h3
                    className="text-lg font-semibold"
                    style={{ color: colors.secondary }}
                  >
                    Pricing
                  </h3>
                  {MENU_CONFIG[selectedCategory]?.modifiers[selectedSubCategory]?.sizes
                    ?.length > 0 ? (
                    <div className="grid grid-cols-2 gap-4">
                      {MENU_CONFIG[selectedCategory].modifiers[selectedSubCategory].sizes.map(
                        (size) => (
                          <div key={size} className="flex items-center gap-2">
                            <label className="w-32">{size}</label>
                            <input
                              type="number"
                              {...register(`pricing.${size}`, { required: true })}
                              className="flex-1 p-2 border rounded"
                              style={{ borderColor: colors.muted }}
                            />
                          </div>
                        )
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <label className="w-32">Base Price</label>
                      <input
                        type="number"
                        {...register('pricing.base', { required: true })}
                        className="flex-1 p-2 border rounded"
                        style={{ borderColor: colors.muted }}
                      />
                    </div>
                  )}
                </div>

                {/* Add-Ons Section */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3
                      className="text-lg font-semibold"
                      style={{ color: colors.secondary }}
                    >
                      Add-Ons
                    </h3>
                    <button
                      type="button"
                      style={{ backgroundColor: colors.accent, color: colors.background }}
                      className="px-3 py-1 rounded text-sm"
                      onClick={() => setShowAddOnModal(true)}
                    >
                      Create New Add-On
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    {addOns
                      .filter((a) => a.category === selectedCategory)
                      .map((addOn) => (
                        <div key={addOn._id} className="flex items-center justify-between">
                          <label className="flex items-center gap-2 flex-1">
                            <input
                              type="checkbox"
                              value={addOn._id}
                              {...register('modifiers')}
                              className="form-checkbox h-4 w-4"
                              checked={watch('modifiers')?.includes(addOn._id)}
                              readOnly
                            />
                            <span>
                              {addOn.name} (+₱{addOn.price})
                            </span>
                          </label>
                          <button
                            type="button"
                            onClick={() => setAddOnToDelete(addOn._id)}
                            style={{ color: colors.secondary }}
                            className="hover:opacity-70 text-sm"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block mb-1">Description</label>
                  <textarea
                    {...register('description')}
                    className="w-full p-2 border rounded"
                    style={{ borderColor: colors.muted }}
                    rows="3"
                  />
                </div>

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

        {/* Add-On Creation Modal */}
        {showAddOnModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <div
              style={{ backgroundColor: colors.background }}
              className="p-6 rounded-lg w-96"
            >
              <h3 className="text-xl font-bold mb-4">Create New Add-On</h3>
              <div className="space-y-4">
                <div>
                  <label className="block mb-1">Name</label>
                  <input
                    type="text"
                    value={newAddOn.name}
                    onChange={(e) =>
                      setNewAddOn({ ...newAddOn, name: e.target.value })
                    }
                    className="w-full p-2 border rounded"
                    style={{ borderColor: colors.muted }}
                  />
                </div>
                <div>
                  <label className="block mb-1">Price</label>
                  <input
                    type="number"
                    value={newAddOn.price}
                    onChange={(e) =>
                      setNewAddOn({ ...newAddOn, price: Number(e.target.value) })
                    }
                    className="w-full p-2 border rounded"
                    style={{ borderColor: colors.muted }}
                  />
                </div>
                <div>
                  <label className="block mb-1">Category</label>
                  <select
                    value={newAddOn.category}
                    onChange={(e) =>
                      setNewAddOn({ ...newAddOn, category: e.target.value })
                    }
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
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    className="px-4 py-2 border rounded"
                    style={{ borderColor: colors.muted }}
                    onClick={() => setShowAddOnModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    style={{ backgroundColor: colors.primary, color: colors.background }}
                    className="px-4 py-2 rounded hover:opacity-90"
                    onClick={createAddOn}
                  >
                    Create Add-On
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Delete Add-On Confirmation Modal */}
        {addOnToDelete && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <div style={{ backgroundColor: colors.background }} className="p-6 rounded-lg">
              <h3 className="text-lg font-bold mb-4">Confirm Delete Add-On</h3>
              <p className="mb-4">Are you sure you want to delete this add-on?</p>
              <div className="flex justify-end gap-2">
                <button
                  className="px-4 py-2 border rounded"
                  style={{ borderColor: colors.muted }}
                  onClick={() => setAddOnToDelete(null)}
                >
                  Cancel
                </button>
                <button
                  style={{ backgroundColor: colors.secondary, color: colors.background }}
                  className="px-4 py-2 rounded hover:opacity-90"
                  onClick={() => deleteAddOn(addOnToDelete)}
                >
                  Confirm Delete
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Menu Item Confirmation Modal */}
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
