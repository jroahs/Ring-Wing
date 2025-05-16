import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart, PieChart, Bar, Pie, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Cell } from 'recharts';
import { saveAs } from 'file-saver';
import axios from 'axios';
import { API_URL } from './App';  // Import API_URL from App.jsx

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

// AlertCard component to display individual alerts in a better format
const AlertCard = ({ alert, onRestock }) => {
  const isStockAlert = alert.type === 'stock';
  const isExpiredAlert = alert.type === 'expiration' && alert.message.includes('expired');
  
  // Determine severity color
  const getSeverityStyle = () => {
    if (isStockAlert && alert.message.includes('out of stock')) {
      return { bg: '#fee2e2', border: '#ef4444' };
    } else if (isStockAlert) {
      return { bg: '#fef3c7', border: '#f59e0b' };
    } else if (isExpiredAlert) {
      return { bg: '#fee2e2', border: '#ef4444' };
    } else {
      return { bg: '#dbeafe', border: '#3b82f6' };
    }
  };
  
  const style = getSeverityStyle();
  
  return (
    <div className="border rounded p-3 flex flex-col" 
         style={{ backgroundColor: style.bg, borderColor: style.border }}>
      <div className="font-medium truncate" title={alert.message}>
        {alert.message}
      </div>
      <div className="mt-2 flex justify-between items-center text-xs text-gray-600">
        <span>{new Date(alert.date).toLocaleDateString()}</span>
        {isStockAlert && (
          <button
            onClick={() => onRestock(alert.id)}
            className="px-2 py-1 bg-white rounded-md shadow-sm hover:bg-gray-50"
            style={{ color: colors.accent }}
          >
            Restock Now
          </button>
        )}
      </div>
    </div>
  );
};

// AlertDashboard component to manage and display alerts
const AlertDashboard = ({ alerts, onRestock }) => {
  const [filterType, setFilterType] = useState('all');
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  const filteredAlerts = filterType === 'all' 
    ? alerts 
    : alerts.filter(alert => alert.type === filterType);
  
  const alertCounts = {
    all: alerts.length,
    stock: alerts.filter(a => a.type === 'stock').length,
    expiration: alerts.filter(a => a.type === 'expiration').length
  };

  // Sort alerts by priority: out of stock > expired > low stock > expiring soon
  const organizedAlerts = [...filteredAlerts].sort((a, b) => {
    const getPriority = (alert) => {
      if (alert.type === 'stock' && alert.message.includes('out of stock')) return 1;
      if (alert.type === 'expiration' && alert.message.includes('expired')) return 2;
      if (alert.type === 'stock') return 3;
      return 4; // expiring soon
    };
    
    return getPriority(a) - getPriority(b);
  });
  
  if (alerts.length === 0) return null;
  
  return (
    <div className="mb-4 border rounded-lg shadow-sm" 
         style={{ borderColor: colors.muted }}>
      <div className="flex items-center justify-between p-3 bg-gray-50 border-b"
           style={{ borderColor: colors.muted }}>
        <div className="flex items-center">
          <h3 className="font-medium" style={{ color: colors.primary }}>
            Inventory Alerts ({alerts.length})
          </h3>
          <div className="ml-4 flex space-x-2">
            <button 
              onClick={() => setFilterType('all')}
              className={`px-2 py-1 rounded text-xs ${filterType === 'all' ? 'bg-blue-100 text-blue-700' : 'text-gray-600'}`}>
              All ({alertCounts.all})
            </button>
            <button 
              onClick={() => setFilterType('stock')}
              className={`px-2 py-1 rounded text-xs ${filterType === 'stock' ? 'bg-orange-100 text-orange-700' : 'text-gray-600'}`}>
              Stock ({alertCounts.stock})
            </button>
            <button 
              onClick={() => setFilterType('expiration')}
              className={`px-2 py-1 rounded text-xs ${filterType === 'expiration' ? 'bg-red-100 text-red-700' : 'text-gray-600'}`}>
              Expiration ({alertCounts.expiration})
            </button>
          </div>
        </div>
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1 rounded hover:bg-gray-100"
        >
          {isCollapsed ? '▼' : '▲'}
        </button>
      </div>
      
      {!isCollapsed && (
        <div className="max-h-64 overflow-y-auto p-2">
          {organizedAlerts.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {organizedAlerts.map(alert => (
                <AlertCard key={alert.id} alert={alert} onRestock={onRestock} />
              ))}
            </div>
          ) : (
            <div className="p-4 text-center text-gray-500">
              No alerts in this category
            </div>
          )}
        </div>
      )}
    </div>
  );
};

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
    inventory: [],
    isCountBased: true,
    minimumThreshold: 5
  });

  // Daily inventory tracking state
  const [showDailyInventoryModal, setShowDailyInventoryModal] = useState(false);
  const [selectedItemForEndDay, setSelectedItemForEndDay] = useState(null);
  const [endDayQuantities, setEndDayQuantities] = useState([]);

  // Unit conversion state
  const [showConversionModal, setShowConversionModal] = useState(false);
  const [conversionData, setConversionData] = useState({
    value: '',
    fromUnit: 'grams',
    toUnit: 'kilograms'
  });
  const [conversionResult, setConversionResult] = useState(null);

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
          axios.get(`${API_URL}/api/items`),
          axios.get(`${API_URL}/api/vendors`)
        ]);
        setItems(itemsRes.data);
        setVendors(vendorsRes.data);
        setLoading(false);
      } catch (err) {
        console.error('Fetch error:', err.response?.data || err.message);
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
      
      // Stock alerts with dynamic thresholds
      const threshold = item.minimumThreshold || 
                       (item.unit === 'pieces' ? 5 :
                        item.unit === 'grams' ? 500 :
                        item.unit === 'kilograms' ? 0.5 :
                        item.unit === 'milliliters' ? 500 :
                        item.unit === 'liters' ? 0.5 : 5);
                        
      if (item.totalQuantity <= threshold) {
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

  // Updated consumption function for daily inventory tracking
  const recordConsumption = async (itemId, quantity) => {
    try {
      const { data } = await axios.patch(`${API_URL}/api/items/${itemId}/sell`, { quantity });
      
      setItems(items.map(item => 
        item._id === itemId ? { 
          ...data,
          status: calculateStatus(data.totalQuantity) 
        } : item
      ));
      
      logAction(`Consumed ${quantity} units`, itemId);
    } catch (err) {
      setError('Failed to process consumption: ' + (err.response?.data?.message || err.message));
    }
  };

  // Add this helper function
  const calculateStatus = (totalQuantity) => {
    if (totalQuantity === 0) return 'Out of Stock';
    if (totalQuantity <= 5) return 'Low Stock';
    return 'In Stock';
  };

  // Format for unit display
  const formatQuantity = (quantity, unit) => {
    if (unit === 'kilograms' && quantity < 1) {
      return `${(quantity * 1000).toFixed(0)} g`;
    }
    if (unit === 'liters' && quantity < 1) {
      return `${(quantity * 1000).toFixed(0)} ml`;
    }
    return `${quantity} ${unit}`;
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
        `${API_URL}/api/items/${selectedItem._id}/restock`,
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

  // Unit conversion handler
  const handleConversion = async (e) => {
    e.preventDefault();
    try {
      const { data } = await axios.post(`${API_URL}/api/items/convert`, conversionData);
      setConversionResult(data);
    } catch (err) {
      setError('Failed to convert units: ' + (err.response?.data?.message || err.message));
    }
  };

  // Handle batch end-of-day update
  const handleEndDayUpdate = async (e) => {
    e.preventDefault();
    try {
      // Make sure endQuantities is properly included in the request body
      const { data } = await axios.patch(
        `${API_URL}/api/items/${selectedItemForEndDay._id}/end-day`,
        { endQuantities: endDayQuantities }  // Ensure it's named exactly like the backend expects
      );
      
      setItems(items.map(item => 
        item._id === selectedItemForEndDay._id ? data : item
      ));
      
      setShowDailyInventoryModal(false);
      setSelectedItemForEndDay(null);
      setEndDayQuantities([]);
      
      logAction(`Updated end-of-day quantities`, selectedItemForEndDay._id);
    } catch (err) {
      // Display error message without crashing the component
      console.error('End day update error:', err);
      setError('Failed to update end-of-day quantities: ' + (err.response?.data?.message || err.message));
      
      // Keep the modal open so the user can try again
      // instead of closing it when an error occurs
    }
  };

  // Start day for all inventory items
  const handleStartDay = async () => {
    try {
      await axios.post(`${API_URL}/api/items/start-day`);
      
      // Refresh items data
      const { data } = await axios.get(`${API_URL}/api/items`);
      setItems(data);
      
      logAction('Started day - recorded beginning inventory', 'all');
    } catch (err) {
      setError('Failed to record starting inventory: ' + (err.response?.data?.message || err.message));
    }
  };

  // Handle deletion
  const handleDelete = async (itemId) => {
    try {
      await axios.delete(`${API_URL}/api/items/${itemId}`);
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
      
      // Set isCountBased based on unit
      const isCountBased = newItem.unit === 'pieces';
      const itemToSubmit = {
        ...newItem,
        isCountBased,
        minimumThreshold: isCountBased ? 5 : 
                         (newItem.unit === 'grams' ? 500 :
                          newItem.unit === 'kilograms' ? 0.5 :
                          newItem.unit === 'milliliters' ? 500 :
                          newItem.unit === 'liters' ? 0.5 : 5)
      };
      
      const { data } = await axios.post(`${API_URL}/api/items`, itemToSubmit);
      setItems([...items, data]);
      setShowAddModal(false);
      setNewItem({
        name: '',
        category: '',
        unit: 'pieces',
        cost: 0,
        price: 0,
        vendor: '',
        inventory: [],
        isCountBased: true,
        minimumThreshold: 5
      });
    } catch (err) {
      setError('Failed to add new item: ' + (err.response?.data?.message || err.message));
    }
  };

  // Handle vendor submission
  const handleVendorSubmit = async (e) => {
    e.preventDefault();
    try {
      const { data } = await axios.post(`${API_URL}/api/vendors`, newVendor);
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
  

  const getMainContentMargin = () => {
    if (windowWidth < 768) return '0';
    return windowWidth >= 1920 ? '8rem' : '5rem';
  };

  // Format peso values
  const formatPeso = (value) => {
    return `₱${parseFloat(value).toFixed(2)}`;
  };

  // Status colors
  const getStatusColor = (status) => {
    switch (status) {
      case 'In Stock':
        return { bg: '#d1fae5', text: '#047857' };
      case 'Low Stock':
        return { bg: '#fef3c7', text: '#b45309' };
      case 'Out of Stock':
        return { bg: '#fee2e2', text: '#b91c1c' };
      default:
        return { bg: '#e5e7eb', text: '#374151' };
    }
  };

  // Handle preparing for end-day inventory count
  const prepareEndDayCount = (item) => {
    setSelectedItemForEndDay(item);
    setEndDayQuantities(
      item.inventory.map(batch => ({
        batchId: batch._id,
        quantity: batch.quantity,
        expirationDate: new Date(batch.expirationDate).toLocaleDateString()
      }))
    );
    setShowDailyInventoryModal(true);
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
        
        {/* Replace old alerts display with new AlertDashboard */}
        <div className="px-6 pt-4">
          <AlertDashboard 
            alerts={alerts} 
            onRestock={(alertId) => {
              // Find the item associated with this alert
              const alert = alerts.find(a => a.id === alertId);
              if (alert?.type === 'stock') {
                // For stock alerts, the ID is the item's ID
                const itemToRestock = items.find(item => item._id === alert.id);
                if (itemToRestock) {
                  setSelectedItem(itemToRestock);
                  setShowRestockModal(true);
                }
              }
            }}
          />
        </div>

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
                color: colors.primary
              }}
            />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-4 py-2 rounded-lg border focus:outline-none focus:ring-1"
              style={{
                borderColor: colors.muted,
                color: colors.primary
              }}
            >
              <option value="All">All Categories</option>
              {['Food', 'Beverages', 'Ingredients', 'Packaging'].map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 rounded-lg font-semibold"
              style={{
                backgroundColor: colors.accent,
                color: colors.background
              }}
            >
              Add New Item
            </button>
          </div>
        </div>

        {/* Inventory Management Actions */}
        <div className="px-6 mb-4 flex flex-wrap gap-2">
          <button
            onClick={handleStartDay}
            className="px-4 py-2 rounded border"
            style={{ borderColor: colors.accent, color: colors.accent, backgroundColor: colors.activeBg }}
          >
            Start Day (Record Beginning Inventory)
          </button>
          <button
            onClick={() => setShowConversionModal(true)}
            className="px-4 py-2 rounded border"
            style={{ borderColor: colors.muted, color: colors.primary }}
          >
            Convert Units
          </button>
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
                        onClick={() => prepareEndDayCount(item)}
                        className="p-1 rounded hover:bg-opacity-20 text-sm"
                        style={{ color: colors.accent, backgroundColor: colors.activeBg }}
                      >
                        End-Day Count
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
                      onChange={(e) => setNewItem({
                        ...newItem, 
                        unit: e.target.value,
                        isCountBased: e.target.value === 'pieces',
                        minimumThreshold: e.target.value === 'pieces' ? 5 : 
                                         e.target.value === 'grams' ? 500 :
                                         e.target.value === 'kilograms' ? 0.5 :
                                         e.target.value === 'milliliters' ? 500 :
                                         e.target.value === 'liters' ? 0.5 : 5
                      })}
                      className="w-full p-2 border rounded"
                      style={{ borderColor: colors.muted }}
                    >
                      <option value="pieces">Pieces</option>
                      <option value="grams">Grams</option>
                      <option value="kilograms">Kilograms</option>
                      <option value="milliliters">Milliliters</option>
                      <option value="liters">Liters</option>
                    </select>
                  </div>

                  {/* Minimum Threshold */}
                  <div>
                    <label className="block text-sm mb-1">Minimum Threshold</label>
                    <input
                      type="number"
                      required
                      min="0"
                      step={newItem.unit === 'kilograms' || newItem.unit === 'liters' ? '0.1' : '1'}
                      value={newItem.minimumThreshold}
                      onChange={(e) => setNewItem({...newItem, minimumThreshold: parseFloat(e.target.value)})}
                      className="w-full p-2 border rounded"
                      style={{ borderColor: colors.muted }}
                    />
                    <small className="text-xs text-gray-500">
                      Low stock warning will appear when quantity falls below this value
                    </small>
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
                            step={newItem.unit === 'kilograms' || newItem.unit === 'liters' ? '0.1' : '1'}
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

                      <div className="flex justify-end gap-2 mt-4">
                        <button
                          type="button"
                          onClick={() => setShowVendorAccordion(false)}
                          className="px-3 py-1 rounded text-sm"
                          style={{ borderColor: colors.muted, color: colors.primary }}
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={handleVendorSubmit}
                          className="px-3 py-1 rounded text-sm"
                          style={{ backgroundColor: colors.accent, color: colors.background }}
                        >
                          Add Vendor
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                <div className="mt-6 flex justify-between">
                  <div>
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
              step={selectedItem?.unit === 'kilograms' || selectedItem?.unit === 'liters' ? '0.1' : '1'}
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

{/* Daily Inventory Modal */}
{showDailyInventoryModal && selectedItemForEndDay && (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
    <div className="bg-white p-6 rounded-lg w-full max-w-xl max-h-[90vh] overflow-y-auto">
      <h2 className="text-xl font-bold mb-4">
        End-of-Day Count: {selectedItemForEndDay.name}
      </h2>
      <p className="mb-4 text-sm text-gray-600">
        Record the actual remaining quantities for each batch based on your physical count.
      </p>
      <form onSubmit={handleEndDayUpdate}>
        <div className="space-y-4">
          {endDayQuantities.map((batch, index) => (
            <div key={index} className="p-3 border rounded" style={{ borderColor: colors.muted }}>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium">Batch #{index + 1}</span>
                <span className="text-sm text-gray-500">Expires: {batch.expirationDate}</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-grow">
                  <label className="block text-sm mb-1">End-of-Day Quantity</label>
                  <input
                    type="number"
                    required
                    min="0"
                    step={selectedItemForEndDay.unit === 'kilograms' || selectedItemForEndDay.unit === 'liters' ? '0.1' : '1'}
                    value={batch.quantity}
                    onChange={(e) => {
                      const newQuantities = [...endDayQuantities];
                      newQuantities[index].quantity = e.target.value;
                      setEndDayQuantities(newQuantities);
                    }}
                    className="w-full p-2 border rounded"
                    style={{ borderColor: colors.muted }}
                  />
                </div>
                <div className="text-sm text-gray-600 pt-6">
                  {selectedItemForEndDay.unit}
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <button
            type="button"
            onClick={() => setShowDailyInventoryModal(false)}
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
            Save End-of-Day Count
          </button>
        </div>
      </form>
    </div>
  </div>
)}

{/* Unit Conversion Modal */}
{showConversionModal && (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
    <div className="bg-white p-6 rounded-lg w-full max-w-md">
      <h2 className="text-xl font-bold mb-4">Unit Conversion</h2>
      <form onSubmit={handleConversion}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm mb-1">Value</label>
            <input
              type="number"
              required
              min="0"
              step="0.01"
              value={conversionData.value}
              onChange={(e) => setConversionData({...conversionData, value: e.target.value})}
              className="w-full p-2 border rounded"
              style={{ borderColor: colors.muted }}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm mb-1">From Unit</label>
              <select
                required
                value={conversionData.fromUnit}
                onChange={(e) => setConversionData({...conversionData, fromUnit: e.target.value})}
                className="w-full p-2 border rounded"
                style={{ borderColor: colors.muted }}
              >
                <option value="grams">Grams</option>
                <option value="kilograms">Kilograms</option>
                <option value="milliliters">Milliliters</option>
                <option value="liters">Liters</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm mb-1">To Unit</label>
              <select
                required
                value={conversionData.toUnit}
                onChange={(e) => setConversionData({...conversionData, toUnit: e.target.value})}
                className="w-full p-2 border rounded"
                style={{ borderColor: colors.muted }}
              >
                <option value="grams">Grams</option>
                <option value="kilograms">Kilograms</option>
                <option value="milliliters">Milliliters</option>
                <option value="liters">Liters</option>
              </select>
            </div>
          </div>
          
          {conversionResult && (
            <div className="mt-4 p-3 rounded" style={{ backgroundColor: colors.activeBg }}>
              <p className="font-medium" style={{ color: colors.primary }}>
                {conversionResult.originalValue} {conversionResult.originalUnit} = 
                <span className="text-lg ml-2" style={{ color: colors.accent }}>
                  {conversionResult.convertedValue} {conversionResult.convertedUnit}
                </span>
              </p>
            </div>
          )}
        </div>
        
        <div className="flex justify-end gap-2 mt-6">
          <button
            type="button"
            onClick={() => setShowConversionModal(false)}
            className="px-4 py-2 rounded border"
            style={{ borderColor: colors.muted, color: colors.primary }}
          >
            Close
          </button>
          <button
            type="submit"
            className="px-4 py-2 rounded font-medium"
            style={{ backgroundColor: colors.accent, color: colors.background }}
          >
            Convert
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
                      outerRadius={100}
                      fill="#8884d8"
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    >
                      {categoryData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={[colors.accent, colors.secondary, '#36A2EB', '#FFCE56'][
                            index % 4
                          ]}
                        />
                      ))}
                    </Pie>
                    <Legend />
                    <Tooltip />
                  </PieChart>
                </div>

                <div>
                  <h3 className="font-medium mb-2">Current Stock Levels</h3>
                  <BarChart width={300} height={300} data={items.slice(0, 5)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="totalQuantity" fill={colors.accent}>
                      {items.slice(0, 5).map((item, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={
                            item.status === 'Out of Stock'
                              ? '#FF6863'
                              : item.status === 'Low Stock'
                              ? '#FFCE56'
                              : colors.accent
                          }
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </div>
              </div>

              <button
                onClick={() => setShowReports(false)}
                className="mt-4 px-4 py-2 rounded"
                style={{ backgroundColor: colors.accent, color: colors.background }}
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
                className="mt-4 px-4 py-2 rounded"
                style={{ backgroundColor: colors.accent, color: colors.background }}
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

export default InventorySystem;