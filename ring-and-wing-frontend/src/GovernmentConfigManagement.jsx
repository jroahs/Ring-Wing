import { useState, useEffect } from 'react';
import { FiSave, FiPlus, FiTrash2, FiClock, FiCheckCircle } from 'react-icons/fi';
import api from './services/api';

const GovernmentConfigManagement = () => {
  const [loading, setLoading] = useState(true);
  const [activeConfig, setActiveConfig] = useState(null);
  const [history, setHistory] = useState([]);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({
    year: new Date().getFullYear(),
    effectiveDate: new Date().toISOString().split('T')[0],
    sss: {
      employeeRate: 0.05,
      mscBrackets: [],
      description: 'Social Security System - Employee contribution'
    },
    philHealth: {
      employeeRate: 0.025,
      floor: 10000,
      ceiling: 100000,
      description: 'Philippine Health Insurance'
    },
    pagIbig: {
      employeeRate: 0.02,
      maxContribution: 200,
      description: 'Home Development Mutual Fund'
    },
    notes: ''
  });
  const [newBracket, setNewBracket] = useState({ min: 0, max: 0, msc: 0 });
  const [message, setMessage] = useState({ text: '', type: '' });

  useEffect(() => {
    fetchActiveConfig();
    fetchHistory();
  }, []);

  const fetchActiveConfig = async () => {
    try {
      const response = await api.get('/government-config');
      if (response.data.success) {
        setActiveConfig(response.data.data);
        setFormData({
          year: response.data.data.year,
          effectiveDate: new Date(response.data.data.effectiveDate).toISOString().split('T')[0],
          sss: response.data.data.sss,
          philHealth: response.data.data.philHealth,
          pagIbig: response.data.data.pagIbig,
          notes: response.data.data.notes || ''
        });
      }
    } catch (error) {
      console.error('Error fetching config:', error);
      if (error.response?.status === 404) {
        showMessage('No configuration found. Please create initial configuration.', 'error');
      } else {
        showMessage('Error loading configuration', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async () => {
    try {
      const response = await api.get('/government-config/history');
      if (response.data.success) {
        setHistory(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching history:', error);
      // Silently fail for history - not critical
    }
  };

  const showMessage = (text, type) => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 3000);
  };

  const handleInputChange = (section, field, value) => {
    if (section) {
      setFormData(prev => ({
        ...prev,
        [section]: {
          ...prev[section],
          [field]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  const handleAddBracket = () => {
    if (newBracket.min >= newBracket.max) {
      showMessage('Minimum must be less than maximum', 'error');
      return;
    }
    if (newBracket.msc <= 0) {
      showMessage('MSC must be greater than 0', 'error');
      return;
    }

    const updatedBrackets = [...formData.sss.mscBrackets, newBracket].sort((a, b) => a.min - b.min);
    
    setFormData(prev => ({
      ...prev,
      sss: {
        ...prev.sss,
        mscBrackets: updatedBrackets
      }
    }));

    setNewBracket({ min: 0, max: 0, msc: 0 });
    showMessage('Bracket added', 'success');
  };

  const handleRemoveBracket = (index) => {
    setFormData(prev => ({
      ...prev,
      sss: {
        ...prev.sss,
        mscBrackets: prev.sss.mscBrackets.filter((_, i) => i !== index)
      }
    }));
    showMessage('Bracket removed', 'success');
  };

  const handleSaveConfig = async () => {
    try {
      if (formData.sss.mscBrackets.length === 0) {
        showMessage('At least one SSS MSC bracket is required', 'error');
        return;
      }

      const response = await api.post('/government-config', formData);
      
      if (response.data.success) {
        showMessage('Configuration saved successfully', 'success');
        setEditMode(false);
        fetchActiveConfig();
        fetchHistory();
      }
    } catch (error) {
      console.error('Error saving config:', error);
      showMessage(error.response?.data?.message || 'Error saving configuration', 'error');
    }
  };

  const handleUpdateConfig = async () => {
    try {
      if (!activeConfig || !activeConfig._id) {
        showMessage('No active configuration to update', 'error');
        return;
      }

      const response = await api.put(`/government-config/${activeConfig._id}`, {
        sss: formData.sss,
        philHealth: formData.philHealth,
        pagIbig: formData.pagIbig,
        effectiveDate: formData.effectiveDate,
        notes: formData.notes
      });
      
      if (response.data.success) {
        showMessage('Configuration updated successfully', 'success');
        setEditMode(false);
        fetchActiveConfig();
        fetchHistory();
      }
    } catch (error) {
      console.error('Error updating config:', error);
      showMessage(error.response?.data?.message || 'Error updating configuration', 'error');
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Government Deduction Configuration</h1>
        <button
          onClick={() => setEditMode(!editMode)}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          {editMode ? 'Cancel' : 'Edit Configuration'}
        </button>
      </div>

      {message.text && (
        <div className={`mb-4 p-3 rounded ${message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          {message.text}
        </div>
      )}

      {/* Active Configuration */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-center mb-4">
          <FiCheckCircle className="text-green-600 mr-2" />
          <h2 className="text-xl font-semibold">Active Configuration (Year {formData.year})</h2>
        </div>

        {/* Basic Info */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium mb-1">Year</label>
            <input
              type="number"
              value={formData.year}
              onChange={(e) => handleInputChange(null, 'year', parseInt(e.target.value))}
              disabled={!editMode}
              className="w-full px-3 py-2 border rounded"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Effective Date</label>
            <input
              type="date"
              value={formData.effectiveDate}
              onChange={(e) => handleInputChange(null, 'effectiveDate', e.target.value)}
              disabled={!editMode}
              className="w-full px-3 py-2 border rounded"
            />
          </div>
        </div>

        {/* SSS Configuration */}
        <div className="border-t pt-4 mb-4">
          <h3 className="text-lg font-semibold mb-3">SSS (Social Security System)</h3>
          <div className="mb-3">
            <label className="block text-sm font-medium mb-1">Employee Rate (%)</label>
            <input
              type="number"
              step="0.001"
              value={formData.sss.employeeRate * 100}
              onChange={(e) => handleInputChange('sss', 'employeeRate', parseFloat(e.target.value) / 100)}
              disabled={!editMode}
              className="w-full px-3 py-2 border rounded"
            />
          </div>
          <div className="mb-3">
            <label className="block text-sm font-medium mb-1">Description</label>
            <input
              type="text"
              value={formData.sss.description}
              onChange={(e) => handleInputChange('sss', 'description', e.target.value)}
              disabled={!editMode}
              className="w-full px-3 py-2 border rounded"
            />
          </div>

          {/* MSC Brackets */}
          <div className="mb-3">
            <label className="block text-sm font-medium mb-2">MSC Brackets ({formData.sss.mscBrackets.length} brackets)</label>
            <div className="max-h-64 overflow-y-auto border rounded p-2">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="p-2 text-left">Min Salary</th>
                    <th className="p-2 text-left">Max Salary</th>
                    <th className="p-2 text-left">MSC</th>
                    {editMode && <th className="p-2">Action</th>}
                  </tr>
                </thead>
                <tbody>
                  {formData.sss.mscBrackets.map((bracket, idx) => (
                    <tr key={idx} className="border-t">
                      <td className="p-2">₱{bracket.min.toLocaleString()}</td>
                      <td className="p-2">₱{bracket.max.toLocaleString()}</td>
                      <td className="p-2">₱{bracket.msc.toLocaleString()}</td>
                      {editMode && (
                        <td className="p-2 text-center">
                          <button
                            onClick={() => handleRemoveBracket(idx)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <FiTrash2 />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {editMode && (
              <div className="mt-3 flex gap-2">
                <input
                  type="number"
                  placeholder="Min"
                  value={newBracket.min}
                  onChange={(e) => setNewBracket({ ...newBracket, min: parseFloat(e.target.value) || 0 })}
                  className="flex-1 px-3 py-2 border rounded"
                />
                <input
                  type="number"
                  placeholder="Max"
                  value={newBracket.max}
                  onChange={(e) => setNewBracket({ ...newBracket, max: parseFloat(e.target.value) || 0 })}
                  className="flex-1 px-3 py-2 border rounded"
                />
                <input
                  type="number"
                  placeholder="MSC"
                  value={newBracket.msc}
                  onChange={(e) => setNewBracket({ ...newBracket, msc: parseFloat(e.target.value) || 0 })}
                  className="flex-1 px-3 py-2 border rounded"
                />
                <button
                  onClick={handleAddBracket}
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                >
                  <FiPlus />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* PhilHealth Configuration */}
        <div className="border-t pt-4 mb-4">
          <h3 className="text-lg font-semibold mb-3">PhilHealth (Philippine Health Insurance)</h3>
          <div className="grid grid-cols-3 gap-4 mb-3">
            <div>
              <label className="block text-sm font-medium mb-1">Employee Rate (%)</label>
              <input
                type="number"
                step="0.001"
                value={formData.philHealth.employeeRate * 100}
                onChange={(e) => handleInputChange('philHealth', 'employeeRate', parseFloat(e.target.value) / 100)}
                disabled={!editMode}
                className="w-full px-3 py-2 border rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Floor (₱)</label>
              <input
                type="number"
                value={formData.philHealth.floor}
                onChange={(e) => handleInputChange('philHealth', 'floor', parseFloat(e.target.value))}
                disabled={!editMode}
                className="w-full px-3 py-2 border rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Ceiling (₱)</label>
              <input
                type="number"
                value={formData.philHealth.ceiling}
                onChange={(e) => handleInputChange('philHealth', 'ceiling', parseFloat(e.target.value))}
                disabled={!editMode}
                className="w-full px-3 py-2 border rounded"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <input
              type="text"
              value={formData.philHealth.description}
              onChange={(e) => handleInputChange('philHealth', 'description', e.target.value)}
              disabled={!editMode}
              className="w-full px-3 py-2 border rounded"
            />
          </div>
        </div>

        {/* Pag-IBIG Configuration */}
        <div className="border-t pt-4 mb-4">
          <h3 className="text-lg font-semibold mb-3">Pag-IBIG (Home Development Mutual Fund)</h3>
          <div className="grid grid-cols-2 gap-4 mb-3">
            <div>
              <label className="block text-sm font-medium mb-1">Employee Rate (%)</label>
              <input
                type="number"
                step="0.001"
                value={formData.pagIbig.employeeRate * 100}
                onChange={(e) => handleInputChange('pagIbig', 'employeeRate', parseFloat(e.target.value) / 100)}
                disabled={!editMode}
                className="w-full px-3 py-2 border rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Max Contribution (₱)</label>
              <input
                type="number"
                value={formData.pagIbig.maxContribution}
                onChange={(e) => handleInputChange('pagIbig', 'maxContribution', parseFloat(e.target.value))}
                disabled={!editMode}
                className="w-full px-3 py-2 border rounded"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <input
              type="text"
              value={formData.pagIbig.description}
              onChange={(e) => handleInputChange('pagIbig', 'description', e.target.value)}
              disabled={!editMode}
              className="w-full px-3 py-2 border rounded"
            />
          </div>
        </div>

        {/* Notes */}
        <div className="border-t pt-4">
          <label className="block text-sm font-medium mb-1">Notes (Audit Trail)</label>
          <textarea
            value={formData.notes}
            onChange={(e) => handleInputChange(null, 'notes', e.target.value)}
            disabled={!editMode}
            rows="3"
            className="w-full px-3 py-2 border rounded"
            placeholder="Enter notes about this configuration change..."
          />
        </div>

        {editMode && (
          <div className="mt-4 flex gap-3">
            <button
              onClick={activeConfig ? handleUpdateConfig : handleSaveConfig}
              className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              <FiSave /> {activeConfig ? 'Update Configuration' : 'Save New Configuration'}
            </button>
            <button
              onClick={() => setEditMode(false)}
              className="px-6 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      {/* Configuration History */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center mb-4">
          <FiClock className="text-gray-600 mr-2" />
          <h2 className="text-xl font-semibold">Configuration History</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-100">
                <th className="p-2 text-left">Year</th>
                <th className="p-2 text-left">Effective Date</th>
                <th className="p-2 text-left">Status</th>
                <th className="p-2 text-left">SSS Rate</th>
                <th className="p-2 text-left">PhilHealth Rate</th>
                <th className="p-2 text-left">Pag-IBIG Rate</th>
                <th className="p-2 text-left">Created By</th>
                <th className="p-2 text-left">Created At</th>
              </tr>
            </thead>
            <tbody>
              {history.map((config) => (
                <tr key={config._id} className="border-t hover:bg-gray-50">
                  <td className="p-2">{config.year}</td>
                  <td className="p-2">{new Date(config.effectiveDate).toLocaleDateString()}</td>
                  <td className="p-2">
                    {config.isActive ? (
                      <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">Active</span>
                    ) : (
                      <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">Inactive</span>
                    )}
                  </td>
                  <td className="p-2">{(config.sss.employeeRate * 100).toFixed(1)}%</td>
                  <td className="p-2">{(config.philHealth.employeeRate * 100).toFixed(1)}%</td>
                  <td className="p-2">{(config.pagIbig.employeeRate * 100).toFixed(1)}%</td>
                  <td className="p-2">{config.createdBy?.username || 'System'}</td>
                  <td className="p-2">{new Date(config.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {history.length === 0 && (
            <div className="text-center py-4 text-gray-500">No configuration history found</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GovernmentConfigManagement;
