import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart, PieChart, Bar, Pie, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Cell } from 'recharts';
import { saveAs } from 'file-saver';
import axios from 'axios';
import { API_URL } from './App';  // Import API_URL from App.jsx
import { Button } from './components/ui/Button'; // Import Button component
import { toast } from 'react-toastify';
import { getCurrentUser, hasInventoryAccess, hasPermission } from './utils/permissions';

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
const AlertCard = ({ alert, onRestock, onDispose }) => {
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
      </div>      <div className="mt-2 flex justify-between items-center text-xs text-gray-600">
        <span>{new Date(alert.date).toLocaleDateString()}</span>
        <div className="flex gap-2">
          {isStockAlert && (
            <Button
              onClick={() => onRestock(alert.id)}
              variant="accent"
              size="sm"
            >
              Restock Now
            </Button>
          )}
          {isExpiredAlert && (
            <Button
              onClick={() => onDispose(alert.id.split('-')[0], alert.id.split('-')[1])}
              variant="secondary"
              size="sm"
            >
              Dispose
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

// AlertDashboard component to manage and display alerts
const AlertDashboard = ({ alerts, onRestock, onDispose }) => {
  const [filterType, setFilterType] = useState('all');
  const [isCollapsed, setIsCollapsed] = useState(true);

  // Filter and organize alerts
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

  return (    <div className="relative z-50" style={{ width: '450px' }}>
      <div className="border rounded-lg shadow-sm relative" style={{ borderColor: colors.muted }}>
        <div 
          className="flex items-center justify-between p-3 bg-gray-50 border-b cursor-pointer"
          style={{ borderColor: colors.muted }}
          onClick={() => setIsCollapsed(!isCollapsed)}
        >
          <div className="flex items-center">
            <h3 className="font-medium" style={{ color: colors.primary }}>
              Inventory Alerts ({alerts.length})
            </h3>
            <div className="flex items-center ml-2">
              <span 
                className="flex h-5 w-5 items-center justify-center rounded-full text-xs"
                style={{ backgroundColor: colors.accent, color: 'white' }}
              >
                {alertCounts.stock}
              </span>
              <span className="ml-1 text-sm">Stock</span>
              <span 
                className="flex h-5 w-5 items-center justify-center rounded-full text-xs ml-2"
                style={{ backgroundColor: colors.secondary, color: 'white' }}
              >
                {alertCounts.expiration}
              </span>
              <span className="ml-1 text-sm">Expiration</span>
            </div>
          </div>
          <span className="text-gray-500">{isCollapsed ? '▼' : '▲'}</span>
        </div>

        {!isCollapsed && (
          <div className="absolute top-full left-0 right-0 bg-white border rounded-b-lg shadow-lg" style={{ borderColor: colors.muted }}>
            <div className="p-3 border-b" style={{ borderColor: colors.muted }}>
              <div className="flex gap-2">
                <button
                  onClick={() => setFilterType('all')}
                  className={`px-3 py-1 rounded-full text-sm ${
                    filterType === 'all' ? 'bg-gray-200 font-medium' : 'hover:bg-gray-100'
                  }`}
                >
                  All ({alertCounts.all})
                </button>
                <button
                  onClick={() => setFilterType('stock')}
                  className={`px-3 py-1 rounded-full text-sm ${
                    filterType === 'stock' ? 'bg-gray-200 font-medium' : 'hover:bg-gray-100'
                  }`}
                >
                  Stock ({alertCounts.stock})
                </button>
                <button
                  onClick={() => setFilterType('expiration')}
                  className={`px-3 py-1 rounded-full text-sm ${
                    filterType === 'expiration' ? 'bg-gray-200 font-medium' : 'hover:bg-gray-100'
                  }`}
                >
                  Expiration ({alertCounts.expiration})
                </button>
              </div>
            </div>            <div className="max-h-[400px] overflow-y-auto p-2">
              {organizedAlerts.length > 0 ? (
                <div className="grid grid-cols-1 gap-2">
                  {organizedAlerts.map(alert => (
                    <AlertCard 
                      key={alert.id} 
                      alert={alert} 
                      onRestock={onRestock}
                      onDispose={onDispose}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center text-gray-500 py-4">
                  No alerts for the selected type.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
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
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
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

  // State for bulk end-of-day inventory
  const [showBulkEndDayModal, setShowBulkEndDayModal] = useState(false);
  const [selectedItems, setSelectedItems] = useState([]);
  const [bulkEndDayQuantities, setBulkEndDayQuantities] = useState([]);

  // Add loading state for bulk operations
  const [bulkOperationLoading, setBulkOperationLoading] = useState(false);

  // New inventory features state
  const [inventoryReservations, setInventoryReservations] = useState([]);
  const [inventoryAlerts, setInventoryAlerts] = useState([]);
  const [showReservationsModal, setShowReservationsModal] = useState(false);
  const [showInventoryAlertsModal, setShowInventoryAlertsModal] = useState(false);
  const [realTimeStatus, setRealTimeStatus] = useState({});
  const [costAnalysis, setCostAnalysis] = useState({});

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
        
        // Fetch new inventory features
        await fetchInventoryReservations();
        await fetchInventoryAlerts();
        
        setLoading(false);
      } catch (err) {
        console.error('Fetch error:', err.response?.data || err.message);
        setError('Failed to fetch data: ' + (err.response?.data?.message || err.message));
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // New inventory feature functions
  const fetchInventoryReservations = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/inventory/reservations`);
      if (response.data.success) {
        setInventoryReservations(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching reservations:', error);
    }
  };

  const fetchInventoryAlerts = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/inventory/alerts`);
      if (response.data.success) {
        setInventoryAlerts(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching inventory alerts:', error);
    }
  };

  const createReservation = async (orderData) => {
    try {
      const response = await axios.post(`${API_URL}/api/inventory/reserve`, orderData);
      if (response.data.success) {
        await fetchInventoryReservations();
        toast.success('Inventory reservation created successfully');
        return response.data.data;
      }
    } catch (error) {
      console.error('Error creating reservation:', error);
      toast.error('Failed to create reservation: ' + (error.response?.data?.message || error.message));
    }
  };

  const completeReservation = async (reservationId) => {
    try {
      const response = await axios.patch(`${API_URL}/api/inventory/reservations/${reservationId}/complete`);
      if (response.data.success) {
        await fetchInventoryReservations();
        toast.success('Reservation completed successfully');
      }
    } catch (error) {
      console.error('Error completing reservation:', error);
      toast.error('Failed to complete reservation: ' + (error.response?.data?.message || error.message));
    }
  };

  const cancelReservation = async (reservationId) => {
    try {
      const response = await axios.delete(`${API_URL}/api/inventory/reservations/${reservationId}`);
      if (response.data.success) {
        await fetchInventoryReservations();
        toast.success('Reservation cancelled successfully');
      }
    } catch (error) {
      console.error('Error cancelling reservation:', error);
      toast.error('Failed to cancel reservation: ' + (error.response?.data?.message || error.message));
    }
  };
  const [lastAlertsHash, setLastAlertsHash] = useState('');
  const [isFirstLoad, setIsFirstLoad] = useState(true);
  
  useEffect(() => {
    // Skip if no items loaded yet
    if (!items.length) return;
    
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
    
    // Calculate hash of current alerts to detect actual changes
    const alertsHash = JSON.stringify(allAlerts.map(a => a.id + a.message));
    
    // Only show toasts on first load or when alerts actually change
    if (isFirstLoad || (alertsHash !== lastAlertsHash && !isFirstLoad)) {
      // Group alerts by type for cleaner notification display
      const stockAlerts = allAlerts.filter(a => a.type === 'stock');
      const expirationAlerts = allAlerts.filter(a => a.type === 'expiration');
        // Show stock alerts first with specific details
      if (stockAlerts.length) {
        const outOfStock = stockAlerts.filter(a => a.message.includes('out of stock'));
        const lowStock = stockAlerts.filter(a => a.message.includes('low on stock'));
        
        if (outOfStock.length) {
          const itemNames = outOfStock.map(a => a.message.split(' is ')[0]).join(', ');
          toast.error(            <div>
              <strong>Out of Stock Items:</strong>
              <br />
              {outOfStock.map(a => (
                <div key={a.id} className="mt-1 text-sm">
                  • {a.message}
                </div>
              ))}
            </div>,
            {
              toastId: 'out-of-stock',
              autoClose: 3000,
            }
          );
        }
        
        if (lowStock.length) {
          toast.warning(            <div>
              <strong>Low Stock Items:</strong>
              <br />
              {lowStock.map(a => (
                <div key={a.id} className="mt-1 text-sm">
                  • {a.message}
                </div>
              ))}
            </div>,
            {
              toastId: 'low-stock',
              autoClose: 3000,
            }
          );
        }
      }
      
      // Then show expiration alerts with specific details
      if (expirationAlerts.length) {
        const expired = expirationAlerts.filter(a => a.message.includes('expired'));
        const expiringSoon = expirationAlerts.filter(a => !a.message.includes('expired'));
        
        if (expired.length) {
          toast.error(
            <div>
              <strong>Expired Items:</strong>
              <br />
              {expired.map(a => (
                <div key={a.id} className="mt-1 text-sm">
                  • {a.message}
                </div>
              ))}
            </div>,
            {
              toastId: 'expired',
              autoClose: 7000, // Give more time to read
            }
          );
        }
        
        if (expiringSoon.length) {
          toast.warning(            <div>
              <strong>Items Expiring Soon:</strong>
              <br />
              {expiringSoon.map(a => (
                <div key={a.id} className="mt-1 text-sm">
                  • {a.message}
                </div>
              ))}
            </div>,
            {
              toastId: 'expiring-soon',
              autoClose: 3000
            }
          );
        }
      }
    }
    
    // Update state
    setLastAlertsHash(alertsHash);
    setIsFirstLoad(false);
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

  // Handle bulk end-of-day update
  const handleBulkEndDayUpdate = async (e) => {
    e.preventDefault();
    setBulkOperationLoading(true);
    try {
      const { data } = await axios.post(
        `${API_URL}/api/items/bulk-end-day`,
        { itemQuantities: bulkEndDayQuantities }
      );
      
      if (data.success) {
        // Update the items with the new data
        const updatedItems = [...items];
        data.updated.forEach(update => {
          const index = updatedItems.findIndex(item => item._id === update.itemId);
          if (index !== -1) {
            updatedItems[index] = {
              ...updatedItems[index],
              status: update.status
            };
          }
        });
        
        setItems(updatedItems);
        setShowBulkEndDayModal(false);
        setSelectedItems([]);
        setBulkEndDayQuantities([]);
        
        logAction(`Updated end-of-day quantities for ${data.updated.length} items`, 'bulk');
      } else {
        setError(`Some items failed to update: ${data.message}`);
      }
    } catch (err) {
      console.error('Bulk end day update error:', err);
      setError('Failed to update bulk end-of-day quantities: ' + (err.response?.data?.message || err.message));
    } finally {
      setBulkOperationLoading(false);
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

  // Expiry handling
  const handleDispose = async (itemId, batchId) => {
    try {
      const { data } = await axios.patch(
        `${API_URL}/api/items/${itemId}/dispose-expired`,
        { batchIds: [batchId] }
      );
      
      setItems(items.map(item => 
        item._id === itemId ? { ...data } : item
      ));
      
      toast.success("Successfully disposed of expired batch");
      logAction(`Disposed expired batch`, itemId);
    } catch (err) {
      toast.error('Failed to dispose expired batch: ' + (err.response?.data?.message || err.message));
    }
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
  // Update a batch quantity in bulk end-day mode
  const updateBulkEndDayQuantity = (itemIndex, batchIndex, newQuantity) => {
    const newBulkQuantities = [...bulkEndDayQuantities];
    newBulkQuantities[itemIndex].endQuantities[batchIndex].quantity = newQuantity;
    setBulkEndDayQuantities(newBulkQuantities);
  };

  // Reset form function
  const resetForm = () => {
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
  setEditingItem(null);
    setShowVendorAccordion(false);
  };

  // Handle vendor selection (for edit modal)
  const handleVendorSelection = (e) => {
    const value = e.target.value;
    if (value === 'new') {
      setShowVendorAccordion(true);
      setNewItem({...newItem, vendor: ''});
    } else {
      setNewItem({...newItem, vendor: value});
      setShowVendorAccordion(false);
    }
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
      resetForm();} catch (err) {
      setError('Failed to add new item: ' + (err.response?.data?.message || err.message));
    }
  };

  // Handle editing an item
  const handleEditItem = (item) => {
    setEditingItem(item);
    setNewItem({
      name: item.name,
      category: item.category,
      unit: item.unit,
      cost: item.cost,
      price: item.price,
      vendor: item.vendor,
      inventory: item.inventory,
      isCountBased: item.isCountBased,
      minimumThreshold: item.minimumThreshold
    });
    setShowEditModal(true);
  };

  // Handle edit submission
  const handleEditSubmit = async (e) => {
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
      
      const { data } = await axios.put(`${API_URL}/api/items/${editingItem._id}`, itemToSubmit);
        setItems(items.map(item => 
        item._id === editingItem._id ? data : item
      ));
      setShowEditModal(false);
      resetForm();
      
      logAction(`Updated item: ${data.name}`, editingItem._id);
    } catch (err) {
      setError('Failed to update item: ' + (err.response?.data?.message || err.message));
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

  // Handle preparing for bulk end-day inventory count
  const prepareBulkEndDayCount = () => {
    // Filter out items with no inventory
    const itemsWithInventory = filteredItems.filter(item => item.inventory && item.inventory.length > 0);
    
    setSelectedItems(itemsWithInventory);
    
    // Initialize the bulk end day quantities structure
    const initialBulkQuantities = itemsWithInventory.map(item => ({
      itemId: item._id,
      name: item.name,
      unit: item.unit,
      endQuantities: item.inventory.map(batch => ({
        batchId: batch._id,
        quantity: batch.quantity,
        expirationDate: new Date(batch.expirationDate).toLocaleDateString()
      }))
    }));
    
    setBulkEndDayQuantities(initialBulkQuantities);
    setShowBulkEndDayModal(true);
  };  return (
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

        <div className="px-6 pt-6 pb-2">
          <h1 className="text-2xl font-bold mb-4" style={{ color: colors.primary }}>
            Ring & Wing Café Inventory System
          </h1>
          
          <div className="flex items-center justify-between">
            <AlertDashboard 
              alerts={alerts} 
              onRestock={(alertId) => {
                const alert = alerts.find(a => a.id === alertId);
                if (alert?.type === 'stock') {
                  const itemToRestock = items.find(item => item._id === alert.id);
                  if (itemToRestock) {
                    setSelectedItem(itemToRestock);
                    setShowRestockModal(true);
                  }
                }
              }}
              onDispose={(itemId, batchId) => handleDispose(itemId, batchId)}
            />
            <div className="flex items-center gap-3">
              <div className="w-[280px]">
                <input
                  type="text"
                  placeholder="Search items..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="p-2 border rounded w-full"
                  style={{ borderColor: colors.muted }}
                />
              </div>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="p-2 border rounded w-[200px]"
                style={{ borderColor: colors.muted }}
              >
                <option value="All">All Categories</option>
                {Array.from(new Set(items.map(item => item.category))).map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
              <Button
                onClick={() => setShowAddModal(true)}
                variant="accent"
              >
                Add New Item
              </Button>
            </div>
          </div>
        </div>

        <div className="px-6 mb-4 flex flex-wrap gap-2">
          <Button
            onClick={handleStartDay}
            variant="accent"
          >
            Start Day (Record Beginning Inventory)
          </Button>
          <Button
            onClick={prepareBulkEndDayCount}
            variant="accent"
          >
            Bulk End-of-Day Count
          </Button>
          <Button
            onClick={() => setShowReservationsModal(true)}
            variant="primary"
          >
            Inventory Reservations ({inventoryReservations.length})
          </Button>
          <Button
            onClick={() => setShowInventoryAlertsModal(true)}
            variant="secondary"
          >
            System Alerts ({inventoryAlerts.length})
          </Button>
          <Button
            onClick={() => setShowConversionModal(true)}
            variant="secondary"
          >
            Convert Units
          </Button>
          <Button
            onClick={() => setShowReports(true)}
            variant="secondary"
          >
            View Reports
          </Button>
          <Button
            onClick={() => setShowAuditLog(true)}
            variant="secondary"
          >
            Audit Log
          </Button>
          <Button
            onClick={() => exportData('json')}
            variant="ghost"
          >
            Export JSON
          </Button>
          <Button
            onClick={() => exportData('csv')}
            variant="ghost"
          >
            Export CSV
          </Button>
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
                    <td className="px-4 py-3" style={{ color: colors.secondary }}>{item.vendor}</td>                    <td className="px-4 py-3 flex gap-2">
                      <Button
                        onClick={() => prepareEndDayCount(item)}
                        variant="accent"
                        size="sm"
                      >
                        End-Day Count
                      </Button>
                      <Button
                        onClick={() => {
                          setSelectedItem(item);
                          setShowRestockModal(true);
                        }}
                        variant="secondary"
                        size="sm"
                      >
                        Restock
                      </Button>
                      <Button
                        onClick={() => handleEditItem(item)}
                        variant="primary"
                        size="sm"
                      >
                        Edit
                      </Button>
                      <Button
                        onClick={() => handleDelete(item._id)}
                        variant="ghost"
                        size="sm"
                      >
                        Delete
                      </Button>
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
                        {vendors.map(vendor => (                        <option key={vendor._id} value={vendor.name}>{vendor.name}</option>
                        ))}
                      </select>
                      <Button
                        onClick={() => setShowVendorAccordion(!showVendorAccordion)}
                        variant="accent"
                        size="sm"
                      >
                        {showVendorAccordion ? '−' : '+'}
                      </Button>
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
                          />                          <Button
                            onClick={() => removeBatch(index)}
                            variant="ghost"
                            size="sm"
                          >
                            Remove
                          </Button>
                        </div>
                      ))}
                    </div>
                    <Button
                      onClick={addBatch}
                      variant="accent"
                      size="sm"
                      className="mt-2"
                    >
                      Add Batch
                    </Button>
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
                        <Button
                          onClick={() => setShowVendorAccordion(false)}
                          variant="ghost"
                          size="sm"
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={handleVendorSubmit}
                          variant="accent"
                          size="sm"
                        >
                          Add Vendor
                        </Button>
                      </div>
                    </div>
                  </div>
                )}                <div className="mt-6 flex justify-between">
                  <div className="flex gap-2">
                    <Button
                      onClick={() => {
                        setShowAddModal(false);
                        resetForm();
                      }}
                      variant="secondary"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      variant="primary"
                    >
                      Add Item
                    </Button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}



        {/* Edit Item Modal */}
        {showEditModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white p-6 rounded-lg w-full max-w-2xl max-h-[90vh] flex flex-col">
              <h2 className="text-xl font-bold mb-4">Edit Item</h2>
              <form onSubmit={handleEditSubmit} className="flex-1 overflow-y-auto">
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
                        onChange={handleVendorSelection}
                        className="flex-1 p-2 border rounded"
                        style={{ borderColor: colors.muted }}
                      >                        <option value="">Select Vendor</option>
                        {vendors.map(vendor => (
                          <option key={vendor._id} value={vendor.name}>{vendor.name}</option>
                        ))}
                        <option value="new">+ Add New Vendor</option>
                      </select>
                    </div>
                  </div>

                  {/* Unit */}
                  <div>
                    <label className="block text-sm mb-1">Unit</label>
                    <select
                      required
                      value={newItem.unit}
                      onChange={(e) => setNewItem({...newItem, unit: e.target.value})}
                      className="w-full p-2 border rounded"
                      style={{ borderColor: colors.muted }}
                    >
                      <option value="">Select Unit</option>
                      {['pieces', 'kilograms', 'liters', 'packs'].map(unit => (
                        <option key={unit} value={unit}>{unit}</option>
                      ))}
                    </select>
                  </div>

                  {/* Minimum Stock */}
                  <div>
                    <label className="block text-sm mb-1">Minimum Stock Alert</label>
                    <input
                      type="number"
                      required
                      min="0"
                      step={newItem.unit === 'kilograms' || newItem.unit === 'liters' ? '0.1' : '1'}
                      value={newItem.minimumStock}
                      onChange={(e) => setNewItem({...newItem, minimumStock: parseFloat(e.target.value)})}
                      className="w-full p-2 border rounded"
                      style={{ borderColor: colors.muted }}
                    />
                  </div>                  {/* Initial Batches */}
                  <div className="md:col-span-2">
                    <label className="block text-sm mb-1">Batches</label>
                    <div className="space-y-2 max-h-40 overflow-y-auto p-2 border rounded" style={{ borderColor: colors.muted }}>
                      {newItem.inventory.map((batch, index) => (
                        <div key={index} className="flex gap-2 items-center p-2 bg-gray-50 rounded">
                          <div className="flex-1">
                            <input
                              type="number"
                              placeholder="Quantity"
                              required
                              min="0"                              step={newItem.unit === 'kilograms' || newItem.unit === 'liters' ? '0.1' : '1'}
                              value={batch.quantity}
                              onChange={(e) => handleBatchChange(index, 'quantity', parseFloat(e.target.value))}
                              className="w-full p-1 border rounded text-sm"
                              style={{ borderColor: colors.muted }}
                            />
                          </div>
                          <div className="flex-1">
                            <input
                              type="date"
                              required
                              value={batch.expirationDate}
                              onChange={(e) => handleBatchChange(index, 'expirationDate', e.target.value)}
                              className="w-full p-1 border rounded text-sm"
                              style={{ borderColor: colors.muted }}
                            />
                          </div>
                          <Button
                            onClick={() => removeBatch(index)}
                            variant="ghost"
                            size="sm"
                          >
                            Remove
                          </Button>
                        </div>
                      ))}
                    </div>
                    <Button
                      onClick={addBatch}
                      variant="accent"
                      size="sm"
                      className="mt-2"
                    >
                      Add Batch
                    </Button>
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
                        <Button
                          onClick={() => setShowVendorAccordion(false)}
                          variant="ghost"
                          size="sm"
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={handleVendorSubmit}
                          variant="accent"
                          size="sm"
                        >
                          Add Vendor
                        </Button>
                      </div>
                    </div>
                  </div>
                )}                <div className="mt-6 flex justify-between">
                  <div className="flex gap-2">
                    <Button
                      onClick={() => {
                        setShowEditModal(false);
                        resetForm();
                      }}
                      variant="secondary"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      variant="primary"
                    >
                      Update Item
                    </Button>
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
        </div>        <div className="flex justify-end gap-2 mt-6">
          <Button
            onClick={() => setShowRestockModal(false)}
            variant="secondary"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
          >
            Confirm Restock
          </Button>
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
        </div>        <div className="flex justify-end gap-2 mt-6">
          <Button
            onClick={() => setShowDailyInventoryModal(false)}
            variant="secondary"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
          >
            Save End-of-Day Count
          </Button>
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
          <Button
            onClick={() => setShowConversionModal(false)}
            variant="secondary"
          >
            Close
          </Button>
          <Button
            type="submit"
            variant="primary"
          >
            Convert
          </Button>
        </div>
      </form>
    </div>
  </div>
)}

{/* Bulk End-of-Day Inventory Modal */}
{showBulkEndDayModal && (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
    <div className="bg-white p-6 rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
      <h2 className="text-xl font-bold mb-4">
        Bulk End-of-Day Inventory Count
      </h2>
      <p className="mb-4 text-sm text-gray-600">
        Record the actual remaining quantities for all items in one go based on your physical count.
      </p>
      
      <form onSubmit={handleBulkEndDayUpdate}>
        <div className="space-y-6">
          {bulkEndDayQuantities.map((item, itemIndex) => (
            <div key={item.itemId} className="p-4 border rounded" style={{ borderColor: colors.muted }}>
              <h3 className="font-medium mb-2" style={{ color: colors.primary }}>
                {item.name}
              </h3>
              
              <div className="space-y-3">
                {item.endQuantities.map((batch, batchIndex) => (
                  <div key={batch.batchId} className="p-3 border rounded bg-gray-50" style={{ borderColor: colors.muted }}>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-medium">Batch #{batchIndex + 1}</span>
                      <span className="text-sm text-gray-500">Expires: {batch.expirationDate}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex-grow">
                        <label className="block text-sm mb-1">End-of-Day Quantity</label>
                        <input
                          type="number"
                          required
                          min="0"
                          step={item.unit === 'kilograms' || item.unit === 'liters' ? '0.1' : '1'}
                          value={batch.quantity}
                          onChange={(e) => updateBulkEndDayQuantity(itemIndex, batchIndex, e.target.value)}
                          className="w-full p-2 border rounded"
                          style={{ borderColor: colors.muted }}
                        />
                      </div>
                      <div className="text-sm text-gray-600 pt-6">
                        {item.unit}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>          <div className="flex justify-end gap-2 mt-6">
          <Button
            onClick={() => setShowBulkEndDayModal(false)}
            variant="secondary"
            disabled={bulkOperationLoading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={bulkOperationLoading}
            isLoading={bulkOperationLoading}
          >
            Save All End-of-Day Counts
          </Button>
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
              </div>              <Button
                onClick={() => setShowReports(false)}
                variant="primary"
                className="mt-4"
              >
                Close
              </Button>
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
              </div>              <Button
                onClick={() => setShowAuditLog(false)}
                variant="primary"
                className="mt-4"
              >
                Close
              </Button>
            </div>
          </div>
        )}

        {/* Inventory Reservations Modal */}
        {showReservationsModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white p-6 rounded-lg w-full max-w-4xl max-h-[90vh] flex flex-col">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Inventory Reservations</h2>
                <Button onClick={() => setShowReservationsModal(false)} variant="ghost">✕</Button>
              </div>
              
              <div className="flex-1 overflow-y-auto">
                {inventoryReservations.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left">Reservation ID</th>
                          <th className="px-4 py-2 text-left">Order ID</th>
                          <th className="px-4 py-2 text-left">Items</th>
                          <th className="px-4 py-2 text-left">Status</th>
                          <th className="px-4 py-2 text-left">Created</th>
                          <th className="px-4 py-2 text-left">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {inventoryReservations.map((reservation) => (
                          <tr key={reservation.reservationId} className="border-t">
                            <td className="px-4 py-2 font-mono text-sm">{reservation.reservationId}</td>
                            <td className="px-4 py-2">{reservation.orderId}</td>
                            <td className="px-4 py-2">
                              {reservation.items?.map((item, index) => (
                                <div key={index} className="text-sm">
                                  Qty: {item.quantity} (ID: {item.menuItemId?.substring(0, 8)}...)
                                </div>
                              ))}
                            </td>
                            <td className="px-4 py-2">
                              <span className={`px-2 py-1 rounded text-sm ${
                                reservation.status === 'active' ? 'bg-yellow-100 text-yellow-800' :
                                reservation.status === 'completed' ? 'bg-green-100 text-green-800' :
                                'bg-red-100 text-red-800'
                              }`}>
                                {reservation.status}
                              </span>
                            </td>
                            <td className="px-4 py-2 text-sm">
                              {new Date(reservation.createdAt).toLocaleString()}
                            </td>
                            <td className="px-4 py-2">
                              <div className="flex gap-2">
                                {reservation.status === 'active' && (
                                  <>
                                    <Button 
                                      onClick={() => completeReservation(reservation.reservationId)}
                                      variant="primary"
                                      size="sm"
                                    >
                                      Complete
                                    </Button>
                                    <Button 
                                      onClick={() => cancelReservation(reservation.reservationId)}
                                      variant="ghost"
                                      size="sm"
                                    >
                                      Cancel
                                    </Button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center text-gray-500 py-8">
                    No inventory reservations found
                  </div>
                )}
              </div>
              
              <div className="mt-4 flex justify-between">
                <Button onClick={fetchInventoryReservations} variant="secondary">
                  Refresh
                </Button>
                <Button onClick={() => setShowReservationsModal(false)} variant="primary">
                  Close
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* System Alerts Modal */}
        {showInventoryAlertsModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white p-6 rounded-lg w-full max-w-3xl max-h-[90vh] flex flex-col">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">System Inventory Alerts</h2>
                <Button onClick={() => setShowInventoryAlertsModal(false)} variant="ghost">✕</Button>
              </div>
              
              <div className="flex-1 overflow-y-auto">
                {inventoryAlerts.length > 0 ? (
                  <div className="space-y-3">
                    {inventoryAlerts.map((alert, index) => (
                      <div key={index} className={`p-4 rounded-lg border-l-4 ${
                        alert.type === 'low_stock' ? 'bg-yellow-50 border-yellow-400' :
                        alert.type === 'out_of_stock' ? 'bg-red-50 border-red-400' :
                        alert.type === 'expiring_soon' ? 'bg-orange-50 border-orange-400' :
                        'bg-blue-50 border-blue-400'
                      }`}>
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-medium text-gray-900">
                              {alert.type?.replace('_', ' ').toUpperCase() || 'SYSTEM ALERT'}
                            </h3>
                            <p className="text-gray-700 mt-1">{alert.message}</p>
                            {alert.itemId && (
                              <p className="text-sm text-gray-500 mt-1">
                                Item ID: {alert.itemId}
                              </p>
                            )}
                          </div>
                          <div className="text-right text-sm text-gray-500">
                            {alert.timestamp ? new Date(alert.timestamp).toLocaleString() : 'Recent'}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-gray-500 py-8">
                    No system alerts found
                  </div>
                )}
              </div>
              
              <div className="mt-4 flex justify-between">
                <Button onClick={fetchInventoryAlerts} variant="secondary">
                  Refresh Alerts
                </Button>
                <Button onClick={() => setShowInventoryAlertsModal(false)} variant="primary">
                  Close
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default InventorySystem;