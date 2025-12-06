import { useState, useEffect } from 'react';
import { FiSave, FiPlus, FiTrash2, FiClock, FiCheckCircle, FiDollarSign, FiInfo, FiAlertCircle } from 'react-icons/fi';
import api from './services/api';

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
          <div className="grid grid-cols-2 gap-4 mb-3">
            <div>
              <label className="block text-sm font-medium mb-1">Employee Rate (%)</label>
              <input
                type="number"
                step="0.1"
                value={(formData.sss.employeeRate * 100).toFixed(1)}
                onChange={(e) => handleInputChange('sss', 'employeeRate', parseFloat(e.target.value) / 100)}
                disabled={!editMode}
                className="w-full px-3 py-2 border rounded"
              />
              <span className="text-xs text-gray-500">Deducted from employee</span>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Employer Rate (%)</label>
              <input
                type="number"
                step="0.1"
                value={(formData.sss.employerRate * 100).toFixed(1)}
                onChange={(e) => handleInputChange('sss', 'employerRate', parseFloat(e.target.value) / 100)}
                disabled={!editMode}
                className="w-full px-3 py-2 border rounded"
              />
              <span className="text-xs text-gray-500">Company expense</span>
            </div>
          </div>
          
          {/* EC (Employees' Compensation) Configuration */}
          <div className="bg-blue-50 p-3 rounded mb-3">
            <h4 className="text-sm font-semibold mb-2 flex items-center">
              <FiInfo className="mr-1" /> EC (Employees' Compensation)
            </h4>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium mb-1">MSC Threshold (₱)</label>
                <input
                  type="number"
                  value={formData.sss.ec?.threshold || 15000}
                  onChange={(e) => handleECChange('threshold', parseFloat(e.target.value))}
                  disabled={!editMode}
                  className="w-full px-2 py-1 border rounded text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Low Rate (₱) ≤ Threshold</label>
                <input
                  type="number"
                  value={formData.sss.ec?.lowRate || 10}
                  onChange={(e) => handleECChange('lowRate', parseFloat(e.target.value))}
                  disabled={!editMode}
                  className="w-full px-2 py-1 border rounded text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">High Rate (₱) &gt; Threshold</label>
                <input
                  type="number"
                  value={formData.sss.ec?.highRate || 30}
                  onChange={(e) => handleECChange('highRate', parseFloat(e.target.value))}
                  disabled={!editMode}
                  className="w-full px-2 py-1 border rounded text-sm"
                />
              </div>
            </div>
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
          <div className="grid grid-cols-2 gap-4 mb-3">
            <div>
              <label className="block text-sm font-medium mb-1">Employee Rate (%)</label>
              <input
                type="number"
                step="0.1"
                value={(formData.philHealth.employeeRate * 100).toFixed(1)}
                onChange={(e) => handleInputChange('philHealth', 'employeeRate', parseFloat(e.target.value) / 100)}
                disabled={!editMode}
                className="w-full px-3 py-2 border rounded"
              />
              <span className="text-xs text-gray-500">Deducted from employee</span>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Employer Rate (%)</label>
              <input
                type="number"
                step="0.1"
                value={(formData.philHealth.employerRate * 100).toFixed(1)}
                onChange={(e) => handleInputChange('philHealth', 'employerRate', parseFloat(e.target.value) / 100)}
                disabled={!editMode}
                className="w-full px-3 py-2 border rounded"
              />
              <span className="text-xs text-gray-500">Company expense</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 mb-3">
            <div>
              <label className="block text-sm font-medium mb-1">MBS Floor (₱)</label>
              <input
                type="number"
                value={formData.philHealth.floor}
                onChange={(e) => handleInputChange('philHealth', 'floor', parseFloat(e.target.value))}
                disabled={!editMode}
                className="w-full px-3 py-2 border rounded"
              />
              <span className="text-xs text-gray-500">Minimum salary for calculation</span>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">MBS Ceiling (₱)</label>
              <input
                type="number"
                value={formData.philHealth.ceiling}
                onChange={(e) => handleInputChange('philHealth', 'ceiling', parseFloat(e.target.value))}
                disabled={!editMode}
                className="w-full px-3 py-2 border rounded"
              />
              <span className="text-xs text-gray-500">Maximum salary for calculation</span>
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
                step="0.1"
                value={(formData.pagIbig.employeeRate * 100).toFixed(1)}
                onChange={(e) => handleInputChange('pagIbig', 'employeeRate', parseFloat(e.target.value) / 100)}
                disabled={!editMode}
                className="w-full px-3 py-2 border rounded"
              />
              <span className="text-xs text-gray-500">Deducted from employee</span>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Employer Rate (%)</label>
              <input
                type="number"
                step="0.1"
                value={(formData.pagIbig.employerRate * 100).toFixed(1)}
                onChange={(e) => handleInputChange('pagIbig', 'employerRate', parseFloat(e.target.value) / 100)}
                disabled={!editMode}
                className="w-full px-3 py-2 border rounded"
              />
              <span className="text-xs text-gray-500">Company expense</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 mb-3">
            <div>
              <label className="block text-sm font-medium mb-1">MFS Cap (₱)</label>
              <input
                type="number"
                value={formData.pagIbig.mfsCap || 10000}
                onChange={(e) => handleInputChange('pagIbig', 'mfsCap', parseFloat(e.target.value))}
                disabled={!editMode}
                className="w-full px-3 py-2 border rounded"
              />
              <span className="text-xs text-gray-500">Maximum Fund Salary</span>
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
              <span className="text-xs text-gray-500">Per employee/employer</span>
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

      {/* Contribution Calculator Preview */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-center mb-4">
          <FiDollarSign className="text-blue-600 mr-2" />
          <h2 className="text-xl font-semibold">Contribution Calculator</h2>
        </div>
        
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Enter Monthly Salary (₱)</label>
          <input
            type="number"
            value={previewSalary}
            onChange={(e) => setPreviewSalary(Number(e.target.value))}
            className="w-full max-w-xs px-3 py-2 border rounded"
            placeholder="Enter salary to preview"
          />
        </div>
        
        {previewResult && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Employee Deductions */}
            <div className="bg-red-50 p-4 rounded">
              <h4 className="font-semibold text-red-800 mb-2">Employee Deductions</h4>
              <table className="w-full text-sm">
                <tbody>
                  <tr>
                    <td className="py-1">SSS (5% of MSC ₱{previewResult.contributionBasis?.sss?.msc?.toLocaleString()})</td>
                    <td className="py-1 text-right font-medium">₱{previewResult.sss?.employeeAmount?.toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td className="py-1">PhilHealth (2.5% of MBS ₱{previewResult.contributionBasis?.philHealth?.mbs?.toLocaleString()})</td>
                    <td className="py-1 text-right font-medium">₱{previewResult.philHealth?.employeeAmount?.toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td className="py-1">Pag-IBIG (2% of MFS ₱{previewResult.contributionBasis?.pagIbig?.mfs?.toLocaleString()})</td>
                    <td className="py-1 text-right font-medium">₱{previewResult.pagIbig?.employeeAmount?.toFixed(2)}</td>
                  </tr>
                  <tr className="border-t font-bold">
                    <td className="py-2">Total Employee Deductions</td>
                    <td className="py-2 text-right text-red-700">₱{previewResult.totals?.employeeTotal?.toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            
            {/* Employer Contributions */}
            <div className="bg-green-50 p-4 rounded">
              <h4 className="font-semibold text-green-800 mb-2">Employer Contributions</h4>
              <table className="w-full text-sm">
                <tbody>
                  <tr>
                    <td className="py-1">SSS (10% of MSC)</td>
                    <td className="py-1 text-right font-medium">₱{previewResult.employerBreakdown?.sss?.toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td className="py-1">SSS EC</td>
                    <td className="py-1 text-right font-medium">₱{previewResult.employerBreakdown?.sssEc?.toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td className="py-1">PhilHealth (2.5% of MBS)</td>
                    <td className="py-1 text-right font-medium">₱{previewResult.employerBreakdown?.philHealth?.toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td className="py-1">Pag-IBIG (2% of MFS)</td>
                    <td className="py-1 text-right font-medium">₱{previewResult.employerBreakdown?.pagIbig?.toFixed(2)}</td>
                  </tr>
                  <tr className="border-t font-bold">
                    <td className="py-2">Total Employer Contributions</td>
                    <td className="py-2 text-right text-green-700">₱{previewResult.totals?.employerTotal?.toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            
            {/* Summary */}
            <div className="md:col-span-2 bg-blue-50 p-4 rounded">
              <div className="flex justify-between items-center">
                <div>
                  <span className="text-sm text-gray-600">Net Take-Home Pay</span>
                  <p className="text-2xl font-bold text-blue-800">₱{(previewSalary - (previewResult.totals?.employeeTotal || 0)).toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
                </div>
                <div className="text-right">
                  <span className="text-sm text-gray-600">Total Government Remittance</span>
                  <p className="text-2xl font-bold text-purple-800">₱{previewResult.totals?.grandTotal?.toFixed(2)}</p>
                </div>
              </div>
            </div>
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
                <th className="p-2 text-left">SSS (EE/ER)</th>
                <th className="p-2 text-left">PhilHealth (EE/ER)</th>
                <th className="p-2 text-left">Pag-IBIG (EE/ER)</th>
                <th className="p-2 text-left">Compliant</th>
                <th className="p-2 text-left">Created</th>
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
                  <td className="p-2">
                    {((config.sss?.employeeRate || 0.05) * 100).toFixed(0)}% / {((config.sss?.employerRate || 0.10) * 100).toFixed(0)}%
                  </td>
                  <td className="p-2">
                    {((config.philHealth?.employeeRate || 0.025) * 100).toFixed(1)}% / {((config.philHealth?.employerRate || 0.025) * 100).toFixed(1)}%
                  </td>
                  <td className="p-2">
                    {((config.pagIbig?.employeeRate || 0.02) * 100).toFixed(0)}% / {((config.pagIbig?.employerRate || 0.02) * 100).toFixed(0)}%
                  </td>
                  <td className="p-2">
                    {config.summary?.hasEmployerRates && config.summary?.hasEC ? (
                      <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs flex items-center gap-1">
                        <FiCheckCircle /> 2024
                      </span>
                    ) : (
                      <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs flex items-center gap-1">
                        <FiAlertCircle /> Legacy
                      </span>
                    )}
                  </td>
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
