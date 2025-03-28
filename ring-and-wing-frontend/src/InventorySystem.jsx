import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart, PieChart, Bar, Pie, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Cell } from 'recharts';
import Sidebar from './Sidebar';
import { saveAs } from 'file-saver';

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

const InventorySystem = () => {
  const navigate = useNavigate();
  
  // Mock data
  const initialItems = [
    { id: 1, name: "Arabica Coffee Beans", category: "Beverage", status: "In Stock", 
      quantity: 25, location: "Storage A", cost: 12.5, price: 25.99, vendor: "Bean Suppliers Co." },
    { id: 2, name: "12oz Paper Cups", category: "Supplies", status: "Low Stock", 
      quantity: 8, location: "Storage B", cost: 0.15, price: 0.3, vendor: "Packaging World" },
    { id: 3, name: "Sugar Packets (100ct)", category: "Condiments", status: "Out of Stock", 
      quantity: 0, location: "Storage C", cost: 2.0, price: 4.5, vendor: "Sweet Supplies Ltd." },
  ];

  const initialVendors = [
    { id: 1, name: "Bean Suppliers Co.", contact: "sales@beansuppliers.com" },
    { id: 2, name: "Packaging World", contact: "orders@packworld.com" },
    { id: 3, name: "Sweet Supplies Ltd.", contact: "info@sweetsupplies.com" },
  ];

  // State management
  const [items, setItems] = useState(initialItems);
  const [vendors] = useState(initialVendors);
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

  // Stock alerts calculation
  useEffect(() => {
    const newAlerts = items.filter(item => 
      item.quantity <= (item.status === 'Low Stock' ? 5 : 0)
    ).map(item => ({
      id: item.id,
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
      user: 'admin', // Replace with actual user from auth system
      timestamp: new Date().toISOString()
    }]);
  };

  // Handle sales transaction
  const handleSale = (itemId, quantitySold) => {
    setItems(items.map(item => {
      if (item.id === itemId) {
        const newQuantity = Math.max(item.quantity - quantitySold, 0);
        const status = newQuantity === 0 ? 'Out of Stock' : 
          newQuantity <= 5 ? 'Low Stock' : 'In Stock';
        logAction(`Sold ${quantitySold} units`, itemId);
        return { ...item, quantity: newQuantity, status };
      }
      return item;
    }));
  };

  // Handle deletion
  const handleDelete = (itemId) => {
    setItems(items.filter(item => item.id !== itemId));
  };

  // Handle exports
  const exportData = (format) => {
    const data = JSON.stringify(items, null, 2);
    const blob = new Blob([data], { type: `text/${format};charset=utf-8` });
    saveAs(blob, `inventory-${new Date().toISOString()}.${format}`);
  };

  // Reports data formatting
  const categoryData = Object.entries(
    items.reduce((acc, item) => ({
      ...acc,
      [item.category]: (acc[item.category] || 0) + item.quantity
    }), {})
  ).map(([name, value]) => ({ name, value }));

  return (
    <div className="flex min-h-screen" style={{ backgroundColor: colors.background }}>
      <Sidebar colors={colors} />

      <div className="flex-1 flex flex-col sm:ml-64">
        {/* Alerts Banner */}
        {alerts.length > 0 && (
          <div className="p-4 bg-yellow-100 border-b border-yellow-200">
            {alerts.map(alert => (
              <div key={alert.id} className="text-yellow-800 text-sm mb-1">
                ⚠️ {alert.message}
              </div>
            ))}
          </div>
        )}

        {/* Controls Section */}
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
              {[...new Set(items.map(item => item.category))].map(category => (
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

        {/* Action Buttons */}
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

        {/* Inventory Table */}
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
                  <tr key={item.id} className="border-t" style={{ borderColor: colors.muted }}>
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
                        onClick={() => handleSale(item.id, 1)}
                        className="p-1 rounded hover:bg-opacity-20"
                        style={{ color: colors.secondary }}
                      >
                        Sell 1
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
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

        {/* Modals (Add Item, Reports, Audit Log) */}
        {showAddModal && (
          // Placeholder for Add Item Modal - update with your modal implementation
          <div>Add Item Modal goes here.</div>
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

// Helper functions
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
