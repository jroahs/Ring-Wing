import { useState, useEffect } from 'react';
import { FiSave, FiPlus, FiTrash2, FiClock, FiCheckCircle, FiDollarSign, FiInfo, FiAlertCircle } from 'react-icons/fi';
import api from './services/api';

// Custom number input component for better usability
const NumberInput = ({ value, onChange, disabled, min, max, step = 1, prefix = '', suffix = '', className = '', placeholder = '' }) => {
  const [localValue, setLocalValue] = useState(value?.toString() || '');

  useEffect(() => {
    setLocalValue(value?.toString() || '');
  }, [value]);

  const handleChange = (e) => {
    const rawValue = e.target.value.replace(/[^\d.-]/g, '');
    setLocalValue(rawValue);
  };

  const handleBlur = () => {
    let numValue = parseFloat(localValue) || 0;
    if (min !== undefined && numValue < min) numValue = min;
    if (max !== undefined && numValue > max) numValue = max;
    setLocalValue(numValue.toString());
    onChange(numValue);
  };

  return (
    <div className={`relative flex items-center ${className}`}>
      {prefix && <span className="absolute left-3 text-gray-500 pointer-events-none">{prefix}</span>}
      <input
        type="text"
        inputMode="decimal"
        value={localValue}
        onChange={handleChange}
        onBlur={handleBlur}
        disabled={disabled}
        placeholder={placeholder}
        className={`w-full px-3 py-2.5 border-2 rounded-lg transition-all duration-200
          ${prefix ? 'pl-7' : ''} ${suffix ? 'pr-8' : ''}
          ${disabled 
            ? 'bg-gray-100 border-gray-200 text-gray-600 cursor-not-allowed' 
            : 'bg-white border-gray-300 hover:border-orange-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-200'
          }
          text-lg font-medium focus:outline-none`}
      />
      {suffix && <span className="absolute right-3 text-gray-500 pointer-events-none">{suffix}</span>}
    </div>
  );
};

const GovernmentConfigManagement = () => {
  const [loading, setLoading] = useState(true);
  const [activeConfig, setActiveConfig] = useState(null);
  const [history, setHistory] = useState([]);
  const [editMode, setEditMode] = useState(false);
  const [previewSalary, setPreviewSalary] = useState(25000);
  const [previewResult, setPreviewResult] = useState(null);
  const [formData, setFormData] = useState({
    year: new Date().getFullYear(),
    effectiveDate: new Date().toISOString().split('T')[0],
    sss: {
      employeeRate: 0.05,
      employerRate: 0.10,
      ec: {
        threshold: 15000,
        lowRate: 10,
        highRate: 30
      },
      mscBrackets: [],
      description: 'Social Security System - 2024 Rates'
    },
    philHealth: {
      employeeRate: 0.025,
      employerRate: 0.025,
      floor: 10000,
      ceiling: 100000,
      description: 'Philippine Health Insurance - 2024 Rates'
    },
    pagIbig: {
      employeeRate: 0.02,
      employerRate: 0.02,
      maxContribution: 200,
      mfsCap: 10000,
      description: 'Home Development Mutual Fund - 2024 Rates'
    },
    notes: ''
  });
  const [newBracket, setNewBracket] = useState({ min: 0, max: 0, msc: 0 });
  const [message, setMessage] = useState({ text: '', type: '' });

  useEffect(() => {
    fetchActiveConfig();
    fetchHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch preview when salary changes
  useEffect(() => {
    if (previewSalary > 0) {
      fetchPreview();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewSalary]);

  const fetchPreview = async () => {
    try {
      const response = await api.get(`/api/government-config/preview?salary=${previewSalary}`);
      if (response.data.success) {
        setPreviewResult(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching preview:', error);
    }
  };

  const fetchActiveConfig = async () => {
    try {
      const response = await api.get('/api/government-config');
      if (response.data.success) {
        const config = response.data.data;
        setActiveConfig(config);
        setFormData({
          year: config.year,
          effectiveDate: new Date(config.effectiveDate).toISOString().split('T')[0],
          sss: {
            employeeRate: config.sss?.employeeRate || 0.05,
            employerRate: config.sss?.employerRate || 0.10,
            ec: {
              threshold: config.sss?.ec?.threshold || 15000,
              lowRate: config.sss?.ec?.lowRate || 10,
              highRate: config.sss?.ec?.highRate || 30
            },
            mscBrackets: config.sss?.mscBrackets || [],
            description: config.sss?.description || ''
          },
          philHealth: {
            employeeRate: config.philHealth?.employeeRate || 0.025,
            employerRate: config.philHealth?.employerRate || 0.025,
            floor: config.philHealth?.floor || 10000,
            ceiling: config.philHealth?.ceiling || 100000,
            description: config.philHealth?.description || ''
          },
          pagIbig: {
            employeeRate: config.pagIbig?.employeeRate || 0.02,
            employerRate: config.pagIbig?.employerRate || 0.02,
            maxContribution: config.pagIbig?.maxContribution || 200,
            mfsCap: config.pagIbig?.mfsCap || 10000,
            description: config.pagIbig?.description || ''
          },
          notes: config.notes || ''
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
      const response = await api.get('/api/government-config/history');
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

  // Handle nested EC field changes
  const handleECChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      sss: {
        ...prev.sss,
        ec: {
          ...prev.sss.ec,
          [field]: value
        }
      }
    }));
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

      const response = await api.post('/api/government-config', formData);
      
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

      const response = await api.put(`/api/government-config/${activeConfig._id}`, {
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
        <h1 className="text-3xl font-bold text-gray-800">Government Deduction Configuration</h1>
        <button
          onClick={() => setEditMode(!editMode)}
          className="px-5 py-2.5 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-medium shadow-md"
        >
          {editMode ? 'Cancel' : 'Edit Configuration'}
        </button>
      </div>

      {message.text && (
        <div className={`mb-4 p-4 rounded-lg flex items-center gap-2 ${message.type === 'success' ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-red-100 text-red-700 border border-red-200'}`}>
          {message.type === 'success' ? <FiCheckCircle /> : <FiAlertCircle />}
          {message.text}
        </div>
      )}

      {/* Active Configuration */}
      <div className="bg-white rounded-xl shadow-lg p-6 mb-6 border border-gray-100">
        <div className="flex items-center mb-4">
          <FiCheckCircle className="text-orange-500 mr-2 text-xl" />
          <h2 className="text-xl font-semibold text-gray-800">Active Configuration (Year {formData.year})</h2>
        </div>

        {/* Basic Info */}
        <div className="grid grid-cols-2 gap-6 mb-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Year</label>
            <NumberInput
              value={formData.year}
              onChange={(v) => handleInputChange(null, 'year', v)}
              disabled={!editMode}
              min={2020}
              max={2100}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Effective Date</label>
            <input
              type="date"
              value={formData.effectiveDate}
              onChange={(e) => handleInputChange(null, 'effectiveDate', e.target.value)}
              disabled={!editMode}
              className={`w-full px-3 py-2.5 border-2 rounded-lg transition-all duration-200 text-lg
                ${!editMode 
                  ? 'bg-gray-100 border-gray-200 text-gray-600 cursor-not-allowed' 
                  : 'bg-white border-gray-300 hover:border-orange-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-200'
                } focus:outline-none`}
            />
          </div>
        </div>

        {/* SSS Configuration */}
        <div className="border-t-2 border-orange-100 pt-6 mb-6">
          <h3 className="text-lg font-bold text-orange-600 mb-4 flex items-center">
            <span className="bg-orange-100 px-3 py-1 rounded-lg">SSS</span>
            <span className="ml-2 text-gray-600 font-normal text-base">Social Security System</span>
          </h3>
          <div className="grid grid-cols-2 gap-6 mb-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Employee Rate</label>
              <NumberInput
                value={(formData.sss.employeeRate * 100).toFixed(1)}
                onChange={(v) => handleInputChange('sss', 'employeeRate', v / 100)}
                disabled={!editMode}
                min={0}
                max={100}
                step={0.1}
                suffix="%"
              />
              <span className="text-xs text-gray-500 mt-1 block">Deducted from employee</span>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Employer Rate</label>
              <NumberInput
                value={(formData.sss.employerRate * 100).toFixed(1)}
                onChange={(v) => handleInputChange('sss', 'employerRate', v / 100)}
                disabled={!editMode}
                min={0}
                max={100}
                step={0.1}
                suffix="%"
              />
              <span className="text-xs text-gray-500 mt-1 block">Company expense</span>
            </div>
          </div>
          
          {/* EC (Employees' Compensation) Configuration */}
          <div className="bg-orange-50 p-4 rounded-lg mb-4 border border-orange-200">
            <h4 className="text-sm font-bold text-orange-700 mb-3 flex items-center">
              <FiInfo className="mr-2" /> EC (Employees' Compensation)
            </h4>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">MSC Threshold</label>
                <NumberInput
                  value={formData.sss.ec?.threshold || 15000}
                  onChange={(v) => handleECChange('threshold', v)}
                  disabled={!editMode}
                  prefix="₱"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Low Rate (≤ Threshold)</label>
                <NumberInput
                  value={formData.sss.ec?.lowRate || 10}
                  onChange={(v) => handleECChange('lowRate', v)}
                  disabled={!editMode}
                  prefix="₱"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">High Rate (&gt; Threshold)</label>
                <NumberInput
                  value={formData.sss.ec?.highRate || 30}
                  onChange={(v) => handleECChange('highRate', v)}
                  disabled={!editMode}
                  prefix="₱"
                />
              </div>
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Description</label>
            <input
              type="text"
              value={formData.sss.description}
              onChange={(e) => handleInputChange('sss', 'description', e.target.value)}
              disabled={!editMode}
              className={`w-full px-3 py-2.5 border-2 rounded-lg transition-all duration-200
                ${!editMode 
                  ? 'bg-gray-100 border-gray-200 text-gray-600 cursor-not-allowed' 
                  : 'bg-white border-gray-300 hover:border-orange-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-200'
                } focus:outline-none`}
            />
          </div>

          {/* MSC Brackets */}
          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              MSC Brackets <span className="text-orange-500 font-normal">({formData.sss.mscBrackets.length} brackets)</span>
            </label>
            <div className="max-h-64 overflow-y-auto border-2 border-gray-200 rounded-lg">
              <table className="w-full text-sm">
                <thead className="sticky top-0">
                  <tr className="bg-orange-50">
                    <th className="p-3 text-left font-semibold text-orange-700">Min Salary</th>
                    <th className="p-3 text-left font-semibold text-orange-700">Max Salary</th>
                    <th className="p-3 text-left font-semibold text-orange-700">MSC</th>
                    {editMode && <th className="p-3 text-center font-semibold text-orange-700">Action</th>}
                  </tr>
                </thead>
                <tbody>
                  {formData.sss.mscBrackets.map((bracket, idx) => (
                    <tr key={idx} className="border-t border-gray-100 hover:bg-orange-50/50 transition-colors">
                      <td className="p-3 font-medium">₱{bracket.min.toLocaleString()}</td>
                      <td className="p-3 font-medium">{bracket.max >= 9999999 ? '₱34,750+' : `₱${bracket.max.toLocaleString()}`}</td>
                      <td className="p-3 font-bold text-orange-600">₱{bracket.msc.toLocaleString()}</td>
                      {editMode && (
                        <td className="p-3 text-center">
                          <button
                            onClick={() => handleRemoveBracket(idx)}
                            className="text-red-500 hover:text-red-700 hover:bg-red-100 p-2 rounded-lg transition-colors"
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
              <div className="mt-4 flex gap-3 items-end">
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Min Salary</label>
                  <NumberInput
                    value={newBracket.min}
                    onChange={(v) => setNewBracket({ ...newBracket, min: v })}
                    prefix="₱"
                    placeholder="Min"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Max Salary</label>
                  <NumberInput
                    value={newBracket.max}
                    onChange={(v) => setNewBracket({ ...newBracket, max: v })}
                    prefix="₱"
                    placeholder="Max"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-gray-600 mb-1">MSC</label>
                  <NumberInput
                    value={newBracket.msc}
                    onChange={(v) => setNewBracket({ ...newBracket, msc: v })}
                    prefix="₱"
                    placeholder="MSC"
                  />
                </div>
                <button
                  onClick={handleAddBracket}
                  className="px-4 py-2.5 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors flex items-center gap-2 font-medium"
                >
                  <FiPlus /> Add
                </button>
              </div>
            )}
          </div>
        </div>

        {/* PhilHealth Configuration */}
        <div className="border-t-2 border-orange-100 pt-6 mb-6">
          <h3 className="text-lg font-bold text-green-600 mb-4 flex items-center">
            <span className="bg-green-100 px-3 py-1 rounded-lg">PhilHealth</span>
            <span className="ml-2 text-gray-600 font-normal text-base">Philippine Health Insurance</span>
          </h3>
          <div className="grid grid-cols-2 gap-6 mb-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Employee Rate</label>
              <NumberInput
                value={(formData.philHealth.employeeRate * 100).toFixed(1)}
                onChange={(v) => handleInputChange('philHealth', 'employeeRate', v / 100)}
                disabled={!editMode}
                min={0}
                max={100}
                step={0.1}
                suffix="%"
              />
              <span className="text-xs text-gray-500 mt-1 block">Deducted from employee</span>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Employer Rate</label>
              <NumberInput
                value={(formData.philHealth.employerRate * 100).toFixed(1)}
                onChange={(v) => handleInputChange('philHealth', 'employerRate', v / 100)}
                disabled={!editMode}
                min={0}
                max={100}
                step={0.1}
                suffix="%"
              />
              <span className="text-xs text-gray-500 mt-1 block">Company expense</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-6 mb-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">MBS Floor</label>
              <NumberInput
                value={formData.philHealth.floor}
                onChange={(v) => handleInputChange('philHealth', 'floor', v)}
                disabled={!editMode}
                prefix="₱"
              />
              <span className="text-xs text-gray-500 mt-1 block">Minimum salary for calculation</span>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">MBS Ceiling</label>
              <NumberInput
                value={formData.philHealth.ceiling}
                onChange={(v) => handleInputChange('philHealth', 'ceiling', v)}
                disabled={!editMode}
                prefix="₱"
              />
              <span className="text-xs text-gray-500 mt-1 block">Maximum salary for calculation</span>
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Description</label>
            <input
              type="text"
              value={formData.philHealth.description}
              onChange={(e) => handleInputChange('philHealth', 'description', e.target.value)}
              disabled={!editMode}
              className={`w-full px-3 py-2.5 border-2 rounded-lg transition-all duration-200
                ${!editMode 
                  ? 'bg-gray-100 border-gray-200 text-gray-600 cursor-not-allowed' 
                  : 'bg-white border-gray-300 hover:border-orange-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-200'
                } focus:outline-none`}
            />
          </div>
        </div>

        {/* Pag-IBIG Configuration */}
        <div className="border-t-2 border-orange-100 pt-6 mb-6">
          <h3 className="text-lg font-bold text-blue-600 mb-4 flex items-center">
            <span className="bg-blue-100 px-3 py-1 rounded-lg">Pag-IBIG</span>
            <span className="ml-2 text-gray-600 font-normal text-base">Home Development Mutual Fund</span>
          </h3>
          <div className="grid grid-cols-2 gap-6 mb-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Employee Rate</label>
              <NumberInput
                value={(formData.pagIbig.employeeRate * 100).toFixed(1)}
                onChange={(v) => handleInputChange('pagIbig', 'employeeRate', v / 100)}
                disabled={!editMode}
                min={0}
                max={100}
                step={0.1}
                suffix="%"
              />
              <span className="text-xs text-gray-500 mt-1 block">Deducted from employee</span>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Employer Rate</label>
              <NumberInput
                value={(formData.pagIbig.employerRate * 100).toFixed(1)}
                onChange={(v) => handleInputChange('pagIbig', 'employerRate', v / 100)}
                disabled={!editMode}
                min={0}
                max={100}
                step={0.1}
                suffix="%"
              />
              <span className="text-xs text-gray-500 mt-1 block">Company expense</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-6 mb-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">MFS Cap</label>
              <NumberInput
                value={formData.pagIbig.mfsCap || 10000}
                onChange={(v) => handleInputChange('pagIbig', 'mfsCap', v)}
                disabled={!editMode}
                prefix="₱"
              />
              <span className="text-xs text-gray-500 mt-1 block">Maximum Fund Salary</span>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Max Contribution</label>
              <NumberInput
                value={formData.pagIbig.maxContribution}
                onChange={(v) => handleInputChange('pagIbig', 'maxContribution', v)}
                disabled={!editMode}
                prefix="₱"
              />
              <span className="text-xs text-gray-500 mt-1 block">Per employee/employer</span>
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Description</label>
            <input
              type="text"
              value={formData.pagIbig.description}
              onChange={(e) => handleInputChange('pagIbig', 'description', e.target.value)}
              disabled={!editMode}
              className={`w-full px-3 py-2.5 border-2 rounded-lg transition-all duration-200
                ${!editMode 
                  ? 'bg-gray-100 border-gray-200 text-gray-600 cursor-not-allowed' 
                  : 'bg-white border-gray-300 hover:border-orange-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-200'
                } focus:outline-none`}
            />
          </div>
        </div>

        {/* Notes */}
        <div className="border-t-2 border-orange-100 pt-6">
          <label className="block text-sm font-semibold text-gray-700 mb-2">Notes (Audit Trail)</label>
          <textarea
            value={formData.notes}
            onChange={(e) => handleInputChange(null, 'notes', e.target.value)}
            disabled={!editMode}
            rows="3"
            className={`w-full px-3 py-2.5 border-2 rounded-lg transition-all duration-200 resize-none
              ${!editMode 
                ? 'bg-gray-100 border-gray-200 text-gray-600 cursor-not-allowed' 
                : 'bg-white border-gray-300 hover:border-orange-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-200'
              } focus:outline-none`}
            placeholder="Enter notes about this configuration change..."
          />
        </div>

        {editMode && (
          <div className="mt-6 flex gap-4">
            <button
              onClick={activeConfig ? handleUpdateConfig : handleSaveConfig}
              className="flex items-center gap-2 px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-medium shadow-md"
            >
              <FiSave /> {activeConfig ? 'Update Configuration' : 'Save New Configuration'}
            </button>
            <button
              onClick={() => setEditMode(false)}
              className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      {/* Contribution Calculator Preview */}
      <div className="bg-white rounded-xl shadow-lg p-6 mb-6 border border-gray-100">
        <div className="flex items-center mb-4">
          <FiDollarSign className="text-orange-500 mr-2 text-xl" />
          <h2 className="text-xl font-semibold text-gray-800">Contribution Calculator</h2>
        </div>
        
        <div className="mb-6">
          <label className="block text-sm font-semibold text-gray-700 mb-2">Enter Monthly Salary</label>
          <NumberInput
            value={previewSalary}
            onChange={(v) => setPreviewSalary(v)}
            className="max-w-xs"
            prefix="₱"
            placeholder="Enter salary to preview"
          />
        </div>
        
        {previewResult && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Employee Deductions */}
            <div className="bg-red-50 p-5 rounded-xl border border-red-200">
              <h4 className="font-bold text-red-700 mb-3 text-lg">Employee Deductions</h4>
              <table className="w-full">
                <tbody>
                  <tr>
                    <td className="py-2 text-gray-700">SSS (5% of MSC ₱{previewResult.contributionBasis?.sss?.msc?.toLocaleString()})</td>
                    <td className="py-2 text-right font-bold text-red-600">₱{previewResult.sss?.employeeAmount?.toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td className="py-2 text-gray-700">PhilHealth (2.5% of MBS ₱{previewResult.contributionBasis?.philHealth?.mbs?.toLocaleString()})</td>
                    <td className="py-2 text-right font-bold text-red-600">₱{previewResult.philHealth?.employeeAmount?.toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td className="py-2 text-gray-700">Pag-IBIG (2% of MFS ₱{previewResult.contributionBasis?.pagIbig?.mfs?.toLocaleString()})</td>
                    <td className="py-2 text-right font-bold text-red-600">₱{previewResult.pagIbig?.employeeAmount?.toFixed(2)}</td>
                  </tr>
                  <tr className="border-t-2 border-red-200">
                    <td className="py-3 font-bold text-red-800">Total Employee Deductions</td>
                    <td className="py-3 text-right font-bold text-red-800 text-lg">₱{previewResult.totals?.employeeTotal?.toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            
            {/* Employer Contributions */}
            <div className="bg-green-50 p-5 rounded-xl border border-green-200">
              <h4 className="font-bold text-green-700 mb-3 text-lg">Employer Contributions</h4>
              <table className="w-full">
                <tbody>
                  <tr>
                    <td className="py-2 text-gray-700">SSS (10% of MSC)</td>
                    <td className="py-2 text-right font-bold text-green-600">₱{previewResult.employerBreakdown?.sss?.toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td className="py-2 text-gray-700">SSS EC</td>
                    <td className="py-2 text-right font-bold text-green-600">₱{previewResult.employerBreakdown?.sssEc?.toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td className="py-2 text-gray-700">PhilHealth (2.5% of MBS)</td>
                    <td className="py-2 text-right font-bold text-green-600">₱{previewResult.employerBreakdown?.philHealth?.toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td className="py-2 text-gray-700">Pag-IBIG (2% of MFS)</td>
                    <td className="py-2 text-right font-bold text-green-600">₱{previewResult.employerBreakdown?.pagIbig?.toFixed(2)}</td>
                  </tr>
                  <tr className="border-t-2 border-green-200">
                    <td className="py-3 font-bold text-green-800">Total Employer Contributions</td>
                    <td className="py-3 text-right font-bold text-green-800 text-lg">₱{previewResult.totals?.employerTotal?.toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            
            {/* Summary */}
            <div className="md:col-span-2 bg-gradient-to-r from-orange-50 to-orange-100 p-6 rounded-xl border border-orange-200">
              <div className="flex justify-between items-center">
                <div>
                  <span className="text-sm text-gray-600 font-medium">Net Take-Home Pay</span>
                  <p className="text-3xl font-bold text-orange-600">₱{(previewSalary - (previewResult.totals?.employeeTotal || 0)).toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
                </div>
                <div className="text-right">
                  <span className="text-sm text-gray-600 font-medium">Total Government Remittance</span>
                  <p className="text-3xl font-bold text-purple-700">₱{previewResult.totals?.grandTotal?.toFixed(2)}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Configuration History */}
      <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
        <div className="flex items-center mb-4">
          <FiClock className="text-orange-500 mr-2 text-xl" />
          <h2 className="text-xl font-semibold text-gray-800">Configuration History</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-orange-50">
                <th className="p-3 text-left font-semibold text-orange-700">Year</th>
                <th className="p-3 text-left font-semibold text-orange-700">Effective Date</th>
                <th className="p-3 text-left font-semibold text-orange-700">Status</th>
                <th className="p-3 text-left font-semibold text-orange-700">SSS (EE/ER)</th>
                <th className="p-3 text-left font-semibold text-orange-700">PhilHealth (EE/ER)</th>
                <th className="p-3 text-left font-semibold text-orange-700">Pag-IBIG (EE/ER)</th>
                <th className="p-3 text-left font-semibold text-orange-700">Compliant</th>
                <th className="p-3 text-left font-semibold text-orange-700">Created</th>
              </tr>
            </thead>
            <tbody>
              {history.map((config) => (
                <tr key={config._id} className="border-t border-gray-100 hover:bg-orange-50/50 transition-colors">
                  <td className="p-3 font-medium">{config.year}</td>
                  <td className="p-3">{new Date(config.effectiveDate).toLocaleDateString()}</td>
                  <td className="p-3">
                    {config.isActive ? (
                      <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">Active</span>
                    ) : (
                      <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-semibold">Inactive</span>
                    )}
                  </td>
                  <td className="p-3 font-medium">
                    {((config.sss?.employeeRate || 0.05) * 100).toFixed(0)}% / {((config.sss?.employerRate || 0.10) * 100).toFixed(0)}%
                  </td>
                  <td className="p-3 font-medium">
                    {((config.philHealth?.employeeRate || 0.025) * 100).toFixed(1)}% / {((config.philHealth?.employerRate || 0.025) * 100).toFixed(1)}%
                  </td>
                  <td className="p-3 font-medium">
                    {((config.pagIbig?.employeeRate || 0.02) * 100).toFixed(0)}% / {((config.pagIbig?.employerRate || 0.02) * 100).toFixed(0)}%
                  </td>
                  <td className="p-3">
                    {config.summary?.hasEmployerRates && config.summary?.hasEC ? (
                      <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold flex items-center gap-1 w-fit">
                        <FiCheckCircle /> 2024
                      </span>
                    ) : (
                      <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-semibold flex items-center gap-1 w-fit">
                        <FiAlertCircle /> Legacy
                      </span>
                    )}
                  </td>
                  <td className="p-3 text-gray-600">{new Date(config.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {history.length === 0 && (
            <div className="text-center py-8 text-gray-500">No configuration history found</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GovernmentConfigManagement;
