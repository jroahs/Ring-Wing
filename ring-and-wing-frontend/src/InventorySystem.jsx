import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart, PieChart, Bar, Pie, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Cell } from 'recharts';
import Sidebar from './Sidebar';
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
    status: 'In Stock',
    quantity: 0,
    location: '',
    cost: 0,
    price: 0,
    vendor: ''
  });

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
        setError('Failed to fetch data');
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Window resize handler
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Stock alerts calculation
  useEffect(() => {
    const newAlerts = items.filter(item => 
      item.quantity <= (item.status === 'Low Stock' ? 5 : 0)
    ).map(item => ({
      id: item._id,
      message: `${item.name} is ${item.quantity === 0 ? 'out of stock' : 'low on stock'} (${item.quantity} remaining)`,
      date: new Date().toISOString()
    }));
    setAlerts(newAlerts);
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

  // Handle sales transaction
  const handleSale = async (itemId, quantitySold) => {
    try {
      const { data } = await axios.patch(`${API_URL}/items/${itemId}/sell`, { quantity: quantitySold });
      setItems(items.map(item => item._id === itemId ? data : item));
      logAction(`Sold ${quantitySold} units`, itemId);
    } catch (err) {
      setError('Failed to process sale');
    }
  };

  // Handle deletion
  const handleDelete = async (itemId) => {
    try {
      await axios.delete(`${API_URL}/items/${itemId}`);
      setItems(items.filter(item => item._id !== itemId));
    } catch (err) {
      setError('Failed to delete item');
    }
  };

  // Handle exports
  const exportData = (format) => {
    const data = JSON.stringify(items, null, 2);
    const blob = new Blob([data], { type: `text/${format};charset=utf-8` });
    saveAs(blob, `inventory-${new Date().toISOString()}.${format}`);
  };

  // Handle item form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const { data } = await axios.post(`${API_URL}/items`, newItem);
      setItems([...items, data]);
      setShowAddModal(false);
      setNewItem({
        name: '',
        category: '',
        status: 'In Stock',
        quantity: 0,
        location: '',
        cost: 0,
        price: 0,
        vendor: ''
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
      [item.category]: (acc[item.category] || 0) + item.quantity
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
      <Sidebar colors={colors} />
      
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
                  {['Item Name', 'Category', 'Status', 'Quantity', 'Location', 'Cost', 'Price', 'Vendor', 'Actions'].map((header) => (
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
                    <td className="px-4 py-3" style={{ color: colors.primary }}>{item.quantity}</td>
                    <td className="px-4 py-3" style={{ color: colors.secondary }}>{item.location}</td>
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
          {/* Item Name - Full Width */}
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

          {/* Vendor Form Accordion */}
          {showVendorAccordion && (
            <div className="md:col-span-2 mt-2 p-4 border rounded" style={{ borderColor: colors.muted }}>
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

          {/* Quantity & Location */}
          <div>
            <label className="block text-sm mb-1">Quantity</label>
            <input
              type="number"
              required
              min="0"
              value={newItem.quantity}
              onChange={(e) => setNewItem({...newItem, quantity: parseInt(e.target.value)})}
              className="w-full p-2 border rounded"
              style={{ borderColor: colors.muted }}
            />
          </div>
          
          <div>
            <label className="block text-sm mb-1">Location</label>
            <input
              type="text"
              required
              value={newItem.location}
              onChange={(e) => setNewItem({...newItem, location: e.target.value})}
              className="w-full p-2 border rounded"
              style={{ borderColor: colors.muted }}
            />
          </div>

          {/* Cost & Price */}
          <div>
            <label className="block text-sm mb-1">Cost (₱)</label>
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
            <label className="block text-sm mb-1">Price (₱)</label>
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