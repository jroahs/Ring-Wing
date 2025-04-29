import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart, PieChart, Bar, Pie, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Cell } from 'recharts';
import { saveAs } from 'file-saver';
import axios from 'axios';

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

const API_URL = import.meta.env.VITE_APP_API_URL || 'http://localhost:5000/api';

const InventorySystem = () => {
  
  const navigate = useNavigate();
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // State management
  const [items, setItems] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAuditLog, setShowAuditLog] = useState(false);
  const [showReports, setShowReports] = useState(false);
  const [alerts, setAlerts] = useState([]);
  const [auditLog, setAuditLog] = useState([]);
  const [newItem, setNewItem] = useState({
    name: '',
    category: '',
    unit: 'pieces',
    cost: 0,
    price: 0,
    vendor: '',
    inventory: []
  });

   // restock
  const [showRestockModal, setShowRestockModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [restockData, setRestockData] = useState({
  quantity: '',
  expirationDate: ''
});

useEffect(() => {
  const handleResize = () => {
    setWindowWidth(window.innerWidth);
  };
  window.addEventListener('resize', handleResize);
  return () => window.removeEventListener('resize', handleResize);
}, []);

  
  // Vendor creation state
  const [showVendorAccordion, setShowVendorAccordion] = useState(false);
  const [newVendor, setNewVendor] = useState({
    name: '',
    contact: { email: '', phone: '' },
    address: { street: '', city: '', state: '', zipCode: '' },
    paymentTerms: 'NET_30'
  });


  

  
  // Fetch data from backend
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [itemsRes, vendorsRes] = await Promise.all([
          axios.get(`${API_URL}/items`),
          axios.get(`${API_URL}/vendors`)
        ]);
        setItems(itemsRes.data);
        setVendors(vendorsRes.data);
        setLoading(false);
      } catch (err) {
        console.error('Fetch error:', err.response?.data || err.message); // Add this line
        setError('Failed to fetch data: ' + (err.response?.data?.message || err.message));
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    console.log('Raw items data:', items);
    
    const allAlerts = items.flatMap(item => {
      const alerts = [];
      
      // Stock alerts
      if (item.totalQuantity <= 5) {
        alerts.push({
          type: 'stock',
          id: item._id,
          message: `${item.name} is ${item.totalQuantity === 0 ? 'out of stock' : 'low on stock'} (${item.totalQuantity} ${item.unit} remaining)`,
          date: new Date().toISOString()
        });
      }
  
      // Expiration alerts from backend
      if (item.expirationAlerts?.length) {
        item.expirationAlerts.forEach(batch => {
          // Add validation for batch expiration date
          if (!batch.expirationDate || isNaN(new Date(batch.expirationDate))) {
            console.error('Invalid expiration date for batch:', batch);
            return;
          }
  
          const phExpDate = new Date(batch.expirationDate);
          phExpDate.setHours(phExpDate.getHours() + 8); // Convert to PH time
          
          // Ensure daysLeft is calculated safely
          const now = new Date();
          const timeDiff = phExpDate - now;
          const daysLeft = Math.ceil(timeDiff / (1000 * 3600 * 24));
  
          alerts.push({
            type: 'expiration',
            id: `${item._id}-${batch._id}`,
            message: `${item.name} batch ${
              daysLeft >= 0 ? 'expiring in' : 'expired'
            } ${Math.abs(daysLeft)} day${Math.abs(daysLeft) !== 1 ? 's' : ''} (${
              phExpDate.toLocaleDateString('en-PH', { 
                year: 'numeric', 
                month: '2-digit', 
                day: '2-digit' 
              })
            })`,
            date: batch.expirationDate
          });
        });
      }
  
      return alerts;
    });
  
    console.log('All alerts:', allAlerts);
    setAlerts(allAlerts);
  }, [items]);

  // Filtered items
  const filteredItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Audit log actions
  const logAction = (action, itemId) => {
    setAuditLog([...auditLog, {
      id: auditLog.length + 1,
      action,
      itemId,
      user: 'admin',
      timestamp: new Date().toISOString()
    }]);
  };

// Updated handleSale function
const handleSale = async (itemId, quantitySold) => {
  try {
    const { data } = await axios.patch(`${API_URL}/items/${itemId}/sell`, { quantity: quantitySold });
    
    setItems(items.map(item => 
      item._id === itemId ? { 
        ...data,
        status: calculateStatus(data.totalQuantity) 
      } : item
    ));
    
    logAction(`Sold ${quantitySold} units`, itemId);
  } catch (err) {
    setError('Failed to process sale: ' + (err.response?.data?.message || err.message));
  }
};

// Add this helper function
const calculateStatus = (totalQuantity) => {
  if (totalQuantity === 0) return 'Out of Stock';
  if (totalQuantity <= 5) return 'Low Stock';
  return 'In Stock';
};


const handleRestock = async (e) => {
  e.preventDefault();
  try {
    // Convert local date to UTC-adjusted PH time
    const adjustForPHTime = (dateString) => {
      const localDate = new Date(dateString);
      // Convert to PH time midnight in UTC
      const phMidnightUTC = new Date(
        Date.UTC(
          localDate.getFullYear(),
          localDate.getMonth(),
          localDate.getDate(),
          16, // 16 hours = 24 - 8 (UTC+8)
          0,
          0,
          0
        )
      );
      return phMidnightUTC.toISOString();
    };

    const payload = {
      ...restockData,
      expirationDate: adjustForPHTime(restockData.expirationDate)
    };

    const { data } = await axios.patch(
      `${API_URL}/items/${selectedItem._id}/restock`,
      payload
    );

    setItems(items.map(item => 
      item._id === selectedItem._id ? data : item
    ));

    setShowRestockModal(false);
    setRestockData({ quantity: '', expirationDate: '' });
    logAction(`Restocked ${restockData.quantity} units`, selectedItem._id);
  } catch (err) {
    setError('Failed to restock item: ' + (err.response?.data?.message || err.message));
  }
};


  // Handle deletion
  const handleDelete = async (itemId) => {
    try {
      await axios.delete(`${API_URL}/items/${itemId}`);
      setItems(items.filter(item => item._id !== itemId));
    } catch (err) {
      setError('Failed to delete item: ' + (err.response?.data?.message || err.message));
    }
  };

  // Handle exports
  const exportData = (format) => {
    const data = JSON.stringify(items, null, 2);
    const blob = new Blob([data], { type: `text/${format};charset=utf-8` });
    saveAs(blob, `inventory-${new Date().toISOString()}.${format}`);
  };

  // Inventory batch management
  const addBatch = () => {
    setNewItem({
      ...newItem,
      inventory: [...newItem.inventory, { quantity: 0, expirationDate: '' }]
    });
  };

  const removeBatch = (index) => {
    const newInventory = newItem.inventory.filter((_, i) => i !== index);
    setNewItem({ ...newItem, inventory: newInventory });
  };

  const handleBatchChange = (index, field, value) => {
    const newInventory = [...newItem.inventory];
    newInventory[index][field] = value;
    setNewItem({ ...newItem, inventory: newInventory });
  };

  // Handle item form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Validate inventory batches
      if (newItem.inventory.length === 0) {
        throw new Error('At least one inventory batch is required');
      }
      
      const { data } = await axios.post(`${API_URL}/items`, newItem);
      setItems([...items, data]);
      setShowAddModal(false);
      setNewItem({
        name: '',
        category: '',
        unit: 'pieces',
        cost: 0,
        price: 0,
        vendor: '',
        inventory: []
      });
    } catch (err) {
      setError('Failed to add new item: ' + (err.response?.data?.message || err.message));
    }
  };

  // Handle vendor submission
  const handleVendorSubmit = async (e) => {
    e.preventDefault();
    try {
      const { data } = await axios.post(`${API_URL}/vendors`, newVendor);
      setVendors([...vendors, data]);
      setNewVendor({
        name: '',
        contact: { email: '', phone: '' },
        address: { street: '', city: '', state: '', zipCode: '' },
        paymentTerms: 'NET_30'
      });
      setShowVendorAccordion(false);
    } catch (err) {
      setError('Failed to add new vendor: ' + (err.response?.data?.message || err.message));
    }
  };

  // Reports data formatting
  const categoryData = Object.entries(
    items.reduce((acc, item) => ({
      ...acc,
      [item.category]: (acc[item.category] || 0) + item.totalQuantity
    }), {})
  ).map(([name, value]) => ({ name, value }));

  // Loading and error states
  if (loading) return <div className="p-4">Loading inventory...</div>;
  if (error) return <div className="p-4 text-red-500">Error: {error}</div>;

  const getMainContentMargin = () => {
    if (windowWidth < 768) return '0';
    return windowWidth >= 1920 ? '8rem' : '5rem';
  };

  return (
    <div className="flex min-h-screen" style={{ backgroundColor: colors.background }}>
      
      <div 
        className="flex-1 flex flex-col transition-all duration-300"
        style={{ 
          marginLeft: getMainContentMargin(),
          paddingTop: windowWidth < 768 ? '4rem' : '0'
        }}
      >
        {error && (
          <div className="p-4 bg-red-100 text-red-700 border-b">
            {error}
          </div>
        )}

        {alerts.length > 0 && (
          <div className="p-4 bg-yellow-100 border-b border-yellow-200">
            {alerts.map(alert => (
              <div key={alert.id} className="text-yellow-800 text-sm mb-1">
                ⚠️ {alert.message}
              </div>
            ))}
          </div>
        )}

        <div className="mb-6 p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h1 className="text-2xl font-bold" style={{ color: colors.primary }}>
            Ring & Wing Café Inventory System
          </h1>
          
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <input
              type="text"
              placeholder="Search inventory..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-4 py-2 rounded-lg border focus:outline-none focus:ring-1"
              style={{
                borderColor: colors.muted,
                focusBorderColor: colors.accent,
              }}
            />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-4 py-2 rounded-lg border"
              style={{ borderColor: colors.muted }}
            >
              <option value="All">All Categories</option>
              {['Food', 'Beverages', 'Ingredients', 'Packaging'].map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 rounded-lg font-medium"
              style={{ backgroundColor: colors.accent, color: colors.background }}
            >
              Add New Item
            </button>
          </div>
        </div>

        <div className="flex gap-3 px-6 mb-4">
          <button
            onClick={() => setShowReports(true)}
            className="px-4 py-2 rounded border"
            style={{ borderColor: colors.muted, color: colors.primary }}
          >
            View Reports
          </button>
          <button
            onClick={() => setShowAuditLog(true)}
            className="px-4 py-2 rounded border"
            style={{ borderColor: colors.muted, color: colors.primary }}
          >
            Audit Log
          </button>
          <button
            onClick={() => exportData('json')}
            className="px-4 py-2 rounded border"
            style={{ borderColor: colors.muted, color: colors.primary }}
          >
            Export JSON
          </button>
          <button
            onClick={() => exportData('csv')}
            className="px-4 py-2 rounded border"
            style={{ borderColor: colors.muted, color: colors.primary }}
          >
            Export CSV
          </button>
        </div>

        <div className="rounded-lg overflow-hidden border mx-6" style={{ borderColor: colors.muted }}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead style={{ backgroundColor: colors.activeBg }}>
                <tr>
                  {['Item Name', 'Category', 'Status', 'Quantity', 'Unit', 'Cost', 'Price', 'Vendor', 'Actions'].map((header) => (
                    <th key={header} className="px-4 py-3 text-left text-sm font-semibold" style={{ color: colors.primary }}>
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              
              <tbody>
                {filteredItems.map((item) => (
                  <tr key={item._id} className="border-t" style={{ borderColor: colors.muted }}>
                    <td className="px-4 py-3" style={{ color: colors.primary }}>{item.name}</td>
                    <td className="px-4 py-3" style={{ color: colors.secondary }}>{item.category}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 rounded-full text-sm"
                        style={{ backgroundColor: getStatusColor(item.status).bg, color: getStatusColor(item.status).text }}>
                        {item.status}
                      </span>
                    </td>
                    <td className="px-4 py-3" style={{ color: colors.primary }}>{item.totalQuantity}</td>
                    <td className="px-4 py-3" style={{ color: colors.secondary }}>{item.unit}</td>
                    <td className="px-4 py-3" style={{ color: colors.primary }}>{formatPeso(item.cost)}</td>
                    <td className="px-4 py-3" style={{ color: colors.primary }}>{formatPeso(item.price)}</td>
                    <td className="px-4 py-3" style={{ color: colors.secondary }}>{item.vendor}</td>
                    <td className="px-4 py-3 flex gap-2">
  <button
    onClick={() => handleSale(item._id, 1)}
    className="p-1 rounded hover:bg-opacity-20"
    style={{ color: colors.secondary }}
  >
    Sell 1
  </button>
  <button
    onClick={() => {
      setSelectedItem(item);
      setShowRestockModal(true);
    }}
    className="p-1 rounded hover:bg-opacity-20"
    style={{ color: colors.secondary }}
  >
    Restock
  </button>
  <button
    onClick={() => handleDelete(item._id)}
    className="p-1 rounded hover:bg-opacity-20"
    style={{ color: colors.secondary }}
  >
    Delete
  </button>
</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {showAddModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white p-6 rounded-lg w-full max-w-2xl max-h-[90vh] flex flex-col">
              <h2 className="text-xl font-bold mb-4">Add New Inventory Item</h2>
              <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  {/* Item Name */}
                  <div className="md:col-span-2">
                    <label className="block text-sm mb-1">Item Name</label>
                    <input
                      type="text"
                      required
                      value={newItem.name}
                      onChange={(e) => setNewItem({...newItem, name: e.target.value})}
                      className="w-full p-2 border rounded"
                      style={{ borderColor: colors.muted }}
                    />
                  </div>

                  {/* Category & Vendor */}
                  <div>
                    <label className="block text-sm mb-1">Category</label>
                    <select
                      required
                      value={newItem.category}
                      onChange={(e) => setNewItem({...newItem, category: e.target.value})}
                      className="w-full p-2 border rounded"
                      style={{ borderColor: colors.muted }}
                    >
                      <option value="">Select Category</option>
                      {['Food', 'Beverages', 'Ingredients', 'Packaging'].map(category => (
                        <option key={category} value={category}>{category}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm mb-1">Vendor</label>
                    <div className="flex gap-2">
                      <select
                        required
                        value={newItem.vendor}
                        onChange={(e) => setNewItem({...newItem, vendor: e.target.value})}
                        className="w-full p-2 border rounded"
                        style={{ borderColor: colors.muted }}
                      >
                        <option value="">Select Vendor</option>
                        {vendors.map(vendor => (
                          <option key={vendor._id} value={vendor.name}>{vendor.name}</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => setShowVendorAccordion(!showVendorAccordion)}
                        className="px-3 py-2 rounded shrink-0"
                        style={{ backgroundColor: colors.accent, color: colors.background }}
                      >
                        {showVendorAccordion ? '−' : '+'}
                      </button>
                    </div>
                  </div>

                  {/* Unit Selection */}
                  <div>
                    <label className="block text-sm mb-1">Unit</label>
                    <select
                      required
                      value={newItem.unit}
                      onChange={(e) => setNewItem({...newItem, unit: e.target.value})}
                      className="w-full p-2 border rounded"
                      style={{ borderColor: colors.muted }}
                    >
                      <option value="pieces">Pieces</option>
                      <option value="grams">Grams</option>
                      <option value="liters">Liters</option>
                    </select>
                  </div>

                  {/* Inventory Batches */}
                  <div className="md:col-span-2">
                    <label className="block text-sm mb-1">Inventory Batches</label>
                    <div className="space-y-2">
                      {newItem.inventory.map((batch, index) => (
                        <div key={index} className="flex gap-2">
                          <input
                            type="number"
                            required
                            min="0"
                            value={batch.quantity}
                            onChange={(e) => handleBatchChange(index, 'quantity', e.target.value)}
                            className="p-2 border rounded flex-1"
                            style={{ borderColor: colors.muted }}
                            placeholder="Quantity"
                          />
                          <input
                            type="date"
                            required
                            value={batch.expirationDate}
                            onChange={(e) => handleBatchChange(index, 'expirationDate', e.target.value)}
                            className="p-2 border rounded flex-1"
                            style={{ borderColor: colors.muted }}
                          />
                          <button
                            type="button"
                            onClick={() => removeBatch(index)}
                            className="px-3 py-2 rounded bg-red-100 text-red-700"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={addBatch}
                      className="mt-2 px-4 py-2 rounded bg-green-100 text-green-700"
                    >
                      Add Batch
                    </button>
                  </div>

                  {/* Cost & Price */}
                  <div>
                    <label className="block text-sm mb-1">Cost (₱) *</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      min="0"
                      value={newItem.cost}
                      onChange={(e) => setNewItem({...newItem, cost: parseFloat(e.target.value)})}
                      className="w-full p-2 border rounded"
                      style={{ borderColor: colors.muted }}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm mb-1">Price (₱) *</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      min="0"
                      value={newItem.price}
                      onChange={(e) => setNewItem({...newItem, price: parseFloat(e.target.value)})}
                      className="w-full p-2 border rounded"
                      style={{ borderColor: colors.muted }}
                    />
                  </div>
                </div>


   
                {/* Vendor Creation Accordion */}
                {showVendorAccordion && (
                  <div className="md:col-span-2 mt-4 p-4 border rounded" style={{ borderColor: colors.muted }}>
                    <h3 className="text-sm font-medium mb-3">New Vendor Details</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs mb-1">Vendor Name *</label>
                        <input
                          type="text"
                          required
                          value={newVendor.name}
                          onChange={(e) => setNewVendor({...newVendor, name: e.target.value})}
                          className="w-full p-2 border rounded text-sm"
                          style={{ borderColor: colors.muted }}
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs mb-1">Email (optional)</label>
                          <input
                            type="email"
                            value={newVendor.contact.email}
                            onChange={(e) => setNewVendor({
                              ...newVendor,
                              contact: {...newVendor.contact, email: e.target.value}
                            })}
                            className="w-full p-2 border rounded text-sm"
                            style={{ borderColor: colors.muted }}
                          />
                        </div>
                        <div>
                          <label className="block text-xs mb-1">Phone (optional)</label>
                          <input
                            type="tel"
                            value={newVendor.contact.phone}
                            onChange={(e) => setNewVendor({
                              ...newVendor,
                              contact: {...newVendor.contact, phone: e.target.value}
                            })}
                            className="w-full p-2 border rounded text-sm"
                            style={{ borderColor: colors.muted }}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs mb-1">Payment Terms</label>
                          <select
                            value={newVendor.paymentTerms}
                            onChange={(e) => setNewVendor({...newVendor, paymentTerms: e.target.value})}
                            className="w-full p-2 border rounded text-sm"
                            style={{ borderColor: colors.muted }}
                          >
                            <option value="NET_30">Net 30 Days</option>
                            <option value="NET_60">Net 60 Days</option>
                            <option value="COD">COD</option>
                          </select>
                        </div>
                      </div>

                      <div className="flex justify-end gap-2 mt-4">
                        <button
                          type="button"
                          onClick={() => setShowVendorAccordion(false)}
                          className="px-3 py-1 text-sm rounded border"
                          style={{ borderColor: colors.muted, color: colors.primary }}
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={handleVendorSubmit}
                          className="px-3 py-1 text-sm rounded font-medium"
                          style={{ backgroundColor: colors.accent, color: colors.background }}
                        >
                          Add Vendor
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                <div className="border-t pt-4 mt-4">
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowAddModal(false)}
                      className="px-4 py-2 rounded border"
                      style={{ borderColor: colors.muted, color: colors.primary }}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 rounded font-medium"
                      style={{ backgroundColor: colors.accent, color: colors.background }}
                    >
                      Add Item
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}



{showRestockModal && (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
    <div className="bg-white p-6 rounded-lg w-full max-w-md">
      <h2 className="text-xl font-bold mb-4">
        Restock {selectedItem?.name}
      </h2>
      <form onSubmit={handleRestock}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm mb-1">Quantity</label>
            <input
              type="number"
              required
              min="1"
              value={restockData.quantity}
              onChange={(e) => setRestockData({...restockData, quantity: e.target.value})}
              className="w-full p-2 border rounded"
              style={{ borderColor: colors.muted }}
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Expiration Date</label>
            <input
              type="date"
              required
              value={restockData.expirationDate}
              onChange={(e) => setRestockData({...restockData, expirationDate: e.target.value})}
              className="w-full p-2 border rounded"
              style={{ borderColor: colors.muted }}
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <button
            type="button"
            onClick={() => setShowRestockModal(false)}
            className="px-4 py-2 rounded border"
            style={{ borderColor: colors.muted, color: colors.primary }}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 rounded font-medium"
            style={{ backgroundColor: colors.accent, color: colors.background }}
          >
            Confirm Restock
          </button>
        </div>
      </form>
    </div>
  </div>
)}


{showReports && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
            <div className="bg-white p-6 rounded-lg w-full max-w-2xl">
              <h2 className="text-xl font-bold mb-4">Inventory Analytics</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="font-medium mb-2">Stock by Category</h3>
                  <PieChart width={300} height={300}>
                    <Pie
                      data={categoryData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                    >
                      {categoryData.map((entry, index) => (
                        <Cell key={index} fill={getCategoryColor(entry.name)} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </div>
                <div>
                  <h3 className="font-medium mb-2">Stock Levels</h3>
                  <BarChart width={300} height={300} data={items}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="quantity" fill={colors.accent} />
                  </BarChart>
                </div>
              </div>
              <button
                onClick={() => setShowReports(false)}
                className="mt-4 px-4 py-2 float-right"
                style={{ color: colors.primary }}
              >
                Close
              </button>
            </div>
          </div>
        )}

        {showAuditLog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
            <div className="bg-white p-6 rounded-lg w-full max-w-2xl">
              <h2 className="text-xl font-bold mb-4">Audit Log</h2>
              <div className="max-h-96 overflow-y-auto">
                <table className="w-full">
                  <thead>
                    <tr>
                      <th className="text-left">Timestamp</th>
                      <th className="text-left">Action</th>
                      <th className="text-left">User</th>
                      <th className="text-left">Item ID</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLog.map(log => (
                      <tr key={log.id} className="border-t">
                        <td className="py-2">{new Date(log.timestamp).toLocaleString()}</td>
                        <td>{log.action}</td>
                        <td>{log.user}</td>
                        <td>{log.itemId}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button
                onClick={() => setShowAuditLog(false)}
                className="mt-4 px-4 py-2 float-right"
                style={{ color: colors.primary }}
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Helper functions remain same
const getStatusColor = (status) => {
  switch (status) {
    case 'In Stock': return { bg: '#e9f7ef', text: '#2a6b46' };
    case 'Low Stock': return { bg: '#fff3cd', text: '#856404' };
    case 'Out of Stock': return { bg: '#f8d7da', text: '#721c24' };
    default: return { bg: '#e2e3e5', text: '#41464b' };
  }
};

const getCategoryColor = (category) => {
  const colorsArr = ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#0088fe'];
  return colorsArr[category.charCodeAt(0) % colorsArr.length];
};

const formatPeso = (value) => {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP'
  }).format(value);
};

export default InventorySystem;