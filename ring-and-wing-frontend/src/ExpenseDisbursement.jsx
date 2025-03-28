import { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip } from 'recharts';

const ExpenseTracker = ({ colors }) => {
  // Expense and form states
  const [expenses, setExpenses] = useState([]);
  const [formData, setFormData] = useState({
    date: '',
    amount: '',
    category: '',
    description: '',
    paymentMethod: 'Cash'
  });

  // Modal visibility
  const [showModal, setShowModal] = useState(false);

  // Predefined categories and payment methods
  const categories = [
    'Food Supplies',
    'Utilities',
    'Salaries',
    'Equipment',
    'Maintenance',
    'Marketing',
    'Other'
  ];
  const paymentMethods = ['Cash', 'Bank Transfer', 'Digital Wallet'];

  // Advanced features states for filtering and custom categories
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [customCategories, setCustomCategories] = useState([]);
  const [newCategory, setNewCategory] = useState('');

  // Sidebar and responsive layout states
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  // Update window width and mobile flag on resize
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      setWindowWidth(width);
      setIsMobile(width < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Handle expense form submission
  const handleSubmit = (e) => {
    e.preventDefault();
    const newExpense = {
      ...formData,
      id: Date.now(),
      amount: parseFloat(formData.amount),
      disbursed: false // optional flag
    };
    setExpenses((prev) => [...prev, newExpense]);

    // Reset the form
    setFormData({
      date: '',
      amount: '',
      category: '',
      description: '',
      paymentMethod: 'Cash'
    });
    setShowModal(false); // Close modal after adding expense
  };

  // Filter expenses based on search, date range, and category
  const filteredExpenses = expenses.filter((expense) => {
    const matchesSearch = expense.description
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesDate =
      (!dateRange.start || expense.date >= dateRange.start) &&
      (!dateRange.end || expense.date <= dateRange.end);
    const matchesCategory =
      selectedCategory === 'All' || expense.category === selectedCategory;
    return matchesSearch && matchesDate && matchesCategory;
  });

  // Summary by category (summing amounts)
  const categorySummary = expenses.reduce((acc, expense) => {
    acc[expense.category] = (acc[expense.category] || 0) + expense.amount;
    return acc;
  }, {});

  // Add a custom category if it doesn't exist already
  const addCustomCategory = () => {
    if (
      newCategory.trim() &&
      ![...categories, ...customCategories].includes(newCategory)
    ) {
      setCustomCategories([...customCategories, newCategory]);
      setNewCategory('');
    }
  };

  // Mark an expense as disbursed
  const markAsDisbursed = (id) => {
    setExpenses((prev) =>
      prev.map((exp) => (exp.id === id ? { ...exp, disbursed: true } : exp))
    );
  };

  // CSV Export Function
  const exportToCSV = () => {
    const csvContent = [
      ['Date', 'Description', 'Category', 'Amount', 'Status'],
      ...expenses.map((exp) => [
        exp.date,
        exp.description,
        exp.category,
        exp.amount,
        exp.disbursed ? 'Paid' : 'Pending'
      ])
    ]
      .map((row) => row.join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'expenses.csv';
    a.click();
  };

  return (
    <div className="flex min-h-screen" style={{ backgroundColor: colors.background, overflowX: 'hidden' }}>
      <Sidebar 
        colors={colors}
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
      />

      {/* Main Content */}
      <div
        className={`flex-1 transition-all duration-300 ${isSidebarOpen && windowWidth >= 768 ? 'ml-64' : ''}`}
      >
        <div className="p-6 md:p-8 pt-24 md:pt-8">
          {/* Header Section */}
          <div className="mb-8 flex items-center justify-between">
            <h1 className="text-3xl font-bold" style={{ color: colors.primary }}>
              Expense Management
            </h1>
            <div
              className="hidden md:block h-1 flex-1 max-w-[200px] ml-4"
              style={{ backgroundColor: colors.muted + '40' }}
            />
          </div>

          {/* Search & Filter Bar */}
          <div className="mb-6 flex flex-col md:flex-row gap-4">
            <input
              type="text"
              placeholder="Search descriptions..."
              className="p-2 rounded-lg border"
              style={{ borderColor: colors.muted }}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <div className="flex gap-2">
              <input
                type="date"
                className="p-2 rounded-lg border"
                style={{ borderColor: colors.muted }}
                value={dateRange.start}
                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              />
              <input
                type="date"
                className="p-2 rounded-lg border"
                style={{ borderColor: colors.muted }}
                value={dateRange.end}
                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              />
            </div>
            <select
              className="p-2 rounded-lg border"
              style={{ borderColor: colors.muted }}
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option value="All">All Categories</option>
              {[...categories, ...customCategories].map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>

          {/* 2-column layout: left = table; right = charts */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* LEFT COLUMN: Table + Buttons */}
            <div className="md:col-span-2 space-y-6">
              {/* Table Container with fixed height for symmetry */}
              <div
                className="rounded-xl overflow-auto shadow-lg"
                style={{
                  border: `1px solid ${colors.muted}20`,
                  maxHeight: '520px'
                }}
              >
                <table className="w-full">
                  <thead style={{ backgroundColor: colors.primary }}>
                    <tr>
                      {['Date', 'Description', 'Category', 'Method', 'Amount', 'Status'].map(
                        (header) => (
                          <th
                            key={header}
                            className="p-4 text-left text-sm font-semibold text-white"
                          >
                            {header}
                          </th>
                        )
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredExpenses.map((expense) => (
                      <tr
                        key={expense.id}
                        className="group hover:bg-opacity-10 transition-colors"
                        style={{
                          backgroundColor:
                            expense.id % 2 === 0 ? colors.muted + '10' : 'transparent'
                        }}
                      >
                        <td
                          className="p-4 text-sm font-medium"
                          style={{ color: colors.primary }}
                        >
                          {new Date(expense.date).toLocaleDateString('en-PH', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </td>
                        <td className="p-4 text-sm" style={{ color: colors.secondary }}>
                          {expense.description}
                        </td>
                        <td className="p-4">
                          <span
                            className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium"
                            style={{ backgroundColor: colors.activeBg, color: colors.accent }}
                          >
                            {expense.category}
                          </span>
                        </td>
                        <td className="p-4 text-sm" style={{ color: colors.secondary }}>
                          {expense.paymentMethod}
                        </td>
                        <td
                          className="p-4 text-right text-sm font-medium"
                          style={{ color: colors.secondary }}
                        >
                          ₱
                          {expense.amount.toLocaleString('en-PH', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2
                          })}
                        </td>
                        <td className="p-4">
                          {expense.disbursed ? (
                            <span className="text-green-500">Completed</span>
                          ) : (
                            <button
                              onClick={() => markAsDisbursed(expense.id)}
                              className="px-3 py-1 rounded-lg"
                              style={{
                                backgroundColor: colors.accent,
                                color: colors.background
                              }}
                            >
                              Mark Paid
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap justify-end gap-2">
                <button
                  className="px-4 py-2 rounded-lg"
                  style={{ backgroundColor: colors.secondary, color: colors.background }}
                  onClick={exportToCSV}
                >
                  Export to CSV
                </button>
                <button
                  className="px-4 py-2 rounded-lg"
                  style={{ backgroundColor: colors.accent, color: colors.background }}
                  onClick={() => setShowModal(true)}
                >
                  Add Expense
                </button>
              </div>
            </div>

            {/* RIGHT COLUMN: 2 Charts (stacked) */}
            <div className="md:col-span-1 space-y-6">
              {/* Spending by Category */}
              <div className="p-4 rounded-lg shadow" style={{ backgroundColor: colors.background }}>
                <h3 className="text-lg font-semibold mb-4">Spending by Category</h3>
                <ul className="space-y-2">
                  {Object.entries(categorySummary).map(([category, total]) => (
                    <li key={category} className="flex justify-between">
                      <span>{category}</span>
                      <span>₱{total.toFixed(2)}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Spending Trend */}
              <div className="p-4 rounded-lg shadow" style={{ backgroundColor: colors.background }}>
                <h3 className="text-lg font-semibold mb-4">Spending Trend</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={expenses}>
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="amount" stroke={colors.accent} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL FOR ADDING EXPENSE */}
      {showModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => setShowModal(false)}
        >
          {/* Stop clicks from closing when clicking inside the modal content */}
          <div
            className="bg-white p-6 rounded-lg max-w-xl w-full relative"
            style={{
              backgroundColor: colors.background,
              border: `1px solid ${colors.muted}60`
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-2 right-2 bg-red-500 text-white rounded-full px-2 py-0 text-sm"
            >
              ×
            </button>

            <h2
              className="text-xl font-semibold mb-6"
              style={{ color: colors.secondary }}
            >
              Add New Expense
            </h2>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              {[
                { label: 'Date', type: 'date', name: 'date', required: true },
                {
                  label: 'Amount (₱)',
                  type: 'number',
                  name: 'amount',
                  required: true
                },
                {
                  label: 'Category',
                  type: 'select',
                  name: 'category',
                  options: categories
                },
                {
                  label: 'Payment Method',
                  type: 'select',
                  name: 'paymentMethod',
                  options: paymentMethods
                }
              ].map((field) => (
                <div key={field.name} className="space-y-2">
                  <label
                    className="block text-sm font-medium"
                    style={{ color: colors.primary }}
                  >
                    {field.label}
                  </label>
                  {field.type === 'select' ? (
                    <select
                      className="w-full p-3 rounded-lg border focus:ring-2 focus:outline-none transition-all"
                      style={{
                        borderColor: colors.muted + '60',
                        backgroundColor: colors.background,
                        focusBorderColor: colors.accent,
                        focusRingColor: colors.accent + '20'
                      }}
                      value={formData[field.name]}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          [field.name]: e.target.value
                        })
                      }
                      required={field.required}
                    >
                      <option value="">Select {field.label}</option>
                      {field.options.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type={field.type}
                      className="w-full p-3 rounded-lg border focus:ring-2 focus:outline-none transition-all"
                      style={{
                        borderColor: colors.muted + '60',
                        backgroundColor: colors.background,
                        focusBorderColor: colors.accent,
                        focusRingColor: colors.accent + '20'
                      }}
                      value={formData[field.name]}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          [field.name]: e.target.value
                        })
                      }
                      required={field.required}
                      placeholder={`Enter ${field.label.toLowerCase()}`}
                    />
                  )}
                </div>
              ))}
              {/* Description Field */}
              <div className="md:col-span-2 space-y-2">
                <label
                  className="block text-sm font-medium"
                  style={{ color: colors.primary }}
                >
                  Description
                </label>
                <textarea
                  className="w-full p-3 rounded-lg border focus:ring-2 focus:outline-none transition-all"
                  style={{
                    borderColor: colors.muted + '60',
                    backgroundColor: colors.background,
                    focusBorderColor: colors.accent,
                    focusRingColor: colors.accent + '20'
                  }}
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  rows="3"
                  placeholder="Add expense details..."
                />
              </div>

              {/* Custom Category Addition */}
              <div className="md:col-span-2 flex gap-2">
                <input
                  type="text"
                  placeholder="Add new category"
                  className="flex-1 p-2 rounded-lg border"
                  style={{ borderColor: colors.muted }}
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                />
                <button
                  type="button"
                  onClick={addCustomCategory}
                  className="px-4 py-2 rounded-lg"
                  style={{ backgroundColor: colors.secondary, color: colors.background }}
                >
                  Add Category
                </button>
              </div>

              {/* Submit Button */}
              <div className="md:col-span-2 mt-4">
                <button
                  type="submit"
                  className="w-full py-3 px-6 rounded-lg font-semibold transition-all hover:scale-[1.02]"
                  style={{
                    backgroundColor: colors.accent,
                    color: colors.background,
                    boxShadow: `0 4px 14px ${colors.accent}30`
                  }}
                >
                  Add Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* END MODAL */}
    </div>
  );
};

export default ExpenseTracker;
