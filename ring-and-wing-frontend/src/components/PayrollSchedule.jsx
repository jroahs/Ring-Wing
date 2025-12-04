import React, { useState, useEffect } from 'react';
import api from '../services/apiService';
import { toast } from 'react-toastify';
import { 
  FiCalendar, 
  FiPlus, 
  FiEdit2, 
  FiTrash2, 
  FiCheck,
  FiAlertTriangle,
  FiInfo,
  FiShield,
  FiDollarSign,
  FiClock,
  FiSettings,
  FiChevronDown,
  FiChevronUp
} from 'react-icons/fi';

// DOLE Minimum Multipliers (Philippine Labor Code)
const DOLE_MINIMUMS = {
  overtime: 1.25,
  regularHoliday: 2.0,
  specialHoliday: 1.30,
  overtimeOnHoliday: 2.60,
  overtimeOnSpecialHoliday: 1.69,
  restDay: 1.30,
  restDayOvertime: 1.69,
  nightDifferential: 1.10
};

const PayrollSchedule = ({ colors, onScheduleSelect }) => {
  const [schedules, setSchedules] = useState([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState(null);
  const [expandedSections, setExpandedSections] = useState({
    multipliers: true,
    deductions: false
  });
  const [formData, setFormData] = useState({
    name: '',
    type: 'semi-monthly',
    payoutDays: [],
    cutoffDays: [],
    description: '',
    // Work hours settings
    regularHoursPerDay: 8,
    workDaysPerWeek: 6,
    // DOLE Compliant Multipliers
    overtimeMultiplier: 1.25,
    regularHolidayMultiplier: 2.0,
    specialHolidayMultiplier: 1.30,
    overtimeOnHolidayMultiplier: 2.60,
    overtimeOnSpecialHolidayMultiplier: 1.69,
    restDayMultiplier: 1.30,
    restDayOvertimeMultiplier: 1.69,
    nightDifferentialMultiplier: 1.10,
    // Deduction settings
    deductionSettings: {
      sssEnabled: true,
      philhealthEnabled: true,
      pagibigEnabled: true,
      taxEnabled: true,
      lateDeductionPerMinute: 0,
      absentDeductionType: 'daily_rate'
    }
  });

  useEffect(() => {
    fetchSchedules();
  }, []);

  const fetchSchedules = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await api.get('/api/payroll-schedules', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.data?.success) {
        setSchedules(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching schedules:', error);
      toast.error('Failed to fetch payroll schedules');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate multipliers before submission
    const validationErrors = [];
    Object.entries(DOLE_MINIMUMS).forEach(([key, min]) => {
      const fieldMap = {
        overtime: 'overtimeMultiplier',
        regularHoliday: 'regularHolidayMultiplier',
        specialHoliday: 'specialHolidayMultiplier',
        overtimeOnHoliday: 'overtimeOnHolidayMultiplier',
        overtimeOnSpecialHoliday: 'overtimeOnSpecialHolidayMultiplier',
        restDay: 'restDayMultiplier',
        restDayOvertime: 'restDayOvertimeMultiplier',
        nightDifferential: 'nightDifferentialMultiplier'
      };
      const field = fieldMap[key];
      if (formData[field] < min) {
        validationErrors.push(`${key.replace(/([A-Z])/g, ' $1').trim()} must be at least ${min}×`);
      }
    });

    if (validationErrors.length > 0) {
      toast.error(
        <div>
          <p className="font-medium">DOLE Compliance Error:</p>
          <ul className="text-sm mt-1">
            {validationErrors.map((err, i) => <li key={i}>• {err}</li>)}
          </ul>
        </div>
      );
      return;
    }

    try {
      const token = localStorage.getItem('authToken');
      const config = { headers: { 'Authorization': `Bearer ${token}` } };

      let response;
      if (editingSchedule) {
        response = await api.put(`/api/payroll-schedules/${editingSchedule._id}`, formData, config);
      } else {
        response = await api.post('/api/payroll-schedules', formData, config);
      }

      if (response.data?.success) {
        toast.success(editingSchedule ? 'Schedule updated successfully' : 'New schedule created successfully');
        fetchSchedules();
        resetForm();
      }
    } catch (error) {
      console.error('Error saving schedule:', error);
      const errorData = error.response?.data;
      if (errorData?.errors) {
        toast.error(
          <div>
            <p className="font-medium">Validation Errors:</p>
            <ul className="text-sm mt-1">
              {errorData.errors.map((err, i) => (
                <li key={i}>• {err.message}</li>
              ))}
            </ul>
          </div>
        );
      } else {
        toast.error(errorData?.message || 'Failed to save schedule');
      }
    }
  };

  const handleDelete = async (scheduleId) => {
    if (!window.confirm('Are you sure you want to delete this schedule?')) return;

    try {
      const token = localStorage.getItem('authToken');
      const response = await api.delete(`/api/payroll-schedules/${scheduleId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.data?.success) {
        toast.success('Schedule deleted successfully');
        fetchSchedules();
      }
    } catch (error) {
      console.error('Error deleting schedule:', error);
      toast.error(error.response?.data?.message || 'Failed to delete schedule');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      type: 'semi-monthly',
      payoutDays: [],
      cutoffDays: [],
      description: '',
      regularHoursPerDay: 8,
      workDaysPerWeek: 6,
      overtimeMultiplier: 1.25,
      regularHolidayMultiplier: 2.0,
      specialHolidayMultiplier: 1.30,
      overtimeOnHolidayMultiplier: 2.60,
      overtimeOnSpecialHolidayMultiplier: 1.69,
      restDayMultiplier: 1.30,
      restDayOvertimeMultiplier: 1.69,
      nightDifferentialMultiplier: 1.10,
      deductionSettings: {
        sssEnabled: true,
        philhealthEnabled: true,
        pagibigEnabled: true,
        taxEnabled: true,
        lateDeductionPerMinute: 0,
        absentDeductionType: 'daily_rate'
      }
    });
    setEditingSchedule(null);
    setIsAddModalOpen(false);
    setExpandedSections({ multipliers: true, deductions: false });
  };

  const handleEdit = (schedule) => {
    setEditingSchedule(schedule);
    setFormData({
      name: schedule.name || '',
      type: schedule.type || 'semi-monthly',
      payoutDays: schedule.payoutDays || [],
      cutoffDays: schedule.cutoffDays || [],
      description: schedule.description || '',
      regularHoursPerDay: schedule.regularHoursPerDay || 8,
      workDaysPerWeek: schedule.workDaysPerWeek || 6,
      overtimeMultiplier: schedule.overtimeMultiplier || 1.25,
      regularHolidayMultiplier: schedule.regularHolidayMultiplier || 2.0,
      specialHolidayMultiplier: schedule.specialHolidayMultiplier || 1.30,
      overtimeOnHolidayMultiplier: schedule.overtimeOnHolidayMultiplier || 2.60,
      overtimeOnSpecialHolidayMultiplier: schedule.overtimeOnSpecialHolidayMultiplier || 1.69,
      restDayMultiplier: schedule.restDayMultiplier || 1.30,
      restDayOvertimeMultiplier: schedule.restDayOvertimeMultiplier || 1.69,
      nightDifferentialMultiplier: schedule.nightDifferentialMultiplier || 1.10,
      deductionSettings: schedule.deductionSettings || {
        sssEnabled: true,
        philhealthEnabled: true,
        pagibigEnabled: true,
        taxEnabled: true,
        lateDeductionPerMinute: 0,
        absentDeductionType: 'daily_rate'
      }
    });
    setIsAddModalOpen(true);
  };

  const handlePayoutDaysChange = (value) => {
    const days = value.split(',').map(day => parseInt(day.trim())).filter(day => !isNaN(day));
    setFormData({ ...formData, payoutDays: days });
  };

  const handleCutoffDaysChange = (value) => {
    const days = value.split(',').map(day => parseInt(day.trim())).filter(day => !isNaN(day));
    setFormData({ ...formData, cutoffDays: days });
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const getComplianceIcon = (schedule) => {
    const status = schedule.complianceStatus;
    if (!status) return null;
    if (status.isFullyCompliant) {
      return <FiCheck className="text-green-500" size={16} />;
    } else if (status.violations?.length > 0) {
      return <FiAlertTriangle className="text-red-500" size={16} />;
    }
    return <FiInfo className="text-yellow-500" size={16} />;
  };

  // Multiplier input component with validation
  const MultiplierInput = ({ label, field, min, description }) => {
    const value = formData[field];
    const isBelow = value < min;
    
    return (
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <label className="text-sm font-medium flex items-center gap-1">
            {label}
            <span className="text-xs px-1.5 py-0.5 rounded" style={{ 
              backgroundColor: isBelow ? '#FEE2E2' : colors.accent + '20',
              color: isBelow ? '#DC2626' : colors.accent
            }}>
              Min: {min}×
            </span>
          </label>
        </div>
        <div className="relative">
          <input
            type="number"
            value={value}
            onChange={(e) => setFormData({ ...formData, [field]: parseFloat(e.target.value) || 0 })}
            className="w-full p-2 pr-8 border rounded transition-colors"
            style={{
              borderColor: isBelow ? '#DC2626' : colors.muted,
              backgroundColor: isBelow ? '#FEF2F2' : 'white'
            }}
            min={min}
            step="0.01"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium" style={{ color: colors.muted }}>
            ×
          </span>
        </div>
        {description && (
          <p className="text-xs mt-0.5" style={{ color: colors.muted }}>{description}</p>
        )}
        {isBelow && (
          <p className="text-xs mt-0.5 text-red-600 flex items-center gap-1">
            <FiAlertTriangle size={12} />
            Below DOLE minimum ({min}×)
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="rounded-xl p-5 shadow-lg" style={{ backgroundColor: colors.background }}>
      {/* Header */}
      <div className="flex justify-between items-center mb-5">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg" style={{ backgroundColor: colors.accent + '20' }}>
            <FiCalendar size={24} style={{ color: colors.accent }} />
          </div>
          <div>
            <h2 className="text-xl font-bold" style={{ color: colors.primary }}>
              Payroll Schedules
            </h2>
            <p className="text-sm" style={{ color: colors.muted }}>
              Manage payout schedules & DOLE-compliant multipliers
            </p>
          </div>
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="px-4 py-2 rounded-lg font-medium flex items-center gap-2 shadow-sm hover:shadow-md transition-shadow"
          style={{ backgroundColor: colors.accent, color: 'white' }}
        >
          <FiPlus size={18} />
          New Schedule
        </button>
      </div>

      {/* DOLE Compliance Info Banner */}
      <div 
        className="mb-4 p-3 rounded-lg flex items-start gap-3"
        style={{ backgroundColor: colors.secondary + '10', border: `1px solid ${colors.secondary}30` }}
      >
        <FiShield size={20} style={{ color: colors.secondary, flexShrink: 0, marginTop: 2 }} />
        <div>
          <p className="font-medium text-sm" style={{ color: colors.primary }}>
            DOLE Compliance Enforced
          </p>
          <p className="text-xs" style={{ color: colors.muted }}>
            All multipliers are validated against Philippine Labor Code minimums. Values below legal thresholds will be rejected.
          </p>
        </div>
      </div>

      {/* Schedules List */}
      <div className="space-y-3">
        {schedules.length === 0 ? (
          <div className="text-center py-8 rounded-lg" style={{ backgroundColor: colors.muted + '10' }}>
            <FiCalendar size={40} style={{ color: colors.muted, margin: '0 auto' }} />
            <p className="mt-2 font-medium" style={{ color: colors.muted }}>No schedules created yet</p>
            <p className="text-sm" style={{ color: colors.muted }}>Click "New Schedule" to create one</p>
          </div>
        ) : (
          schedules.map(schedule => (
            <div
              key={schedule._id}
              className="p-4 rounded-lg border transition-shadow hover:shadow-md cursor-pointer"
              style={{
                backgroundColor: 'white',
                borderColor: colors.muted + '40'
              }}
              onClick={() => onScheduleSelect(schedule)}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold" style={{ color: colors.primary }}>{schedule.name}</h3>
                    {getComplianceIcon(schedule)}
                    {schedule.isActive && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">Active</span>
                    )}
                  </div>
                  <p className="text-sm mt-1" style={{ color: colors.muted }}>
                    {schedule.type.charAt(0).toUpperCase() + schedule.type.slice(1).replace('-', ' ')} • 
                    Payout: Day {schedule.payoutDays.join(' & ')}
                  </p>
                  
                  {/* Quick multiplier preview */}
                  <div className="flex flex-wrap gap-2 mt-2">
                    <span className="text-xs px-2 py-1 rounded" style={{ backgroundColor: colors.accent + '15', color: colors.accent }}>
                      OT: {schedule.overtimeMultiplier || 1.25}×
                    </span>
                    <span className="text-xs px-2 py-1 rounded" style={{ backgroundColor: '#DC262615', color: '#DC2626' }}>
                      Holiday: {schedule.regularHolidayMultiplier || 2.0}×
                    </span>
                    <span className="text-xs px-2 py-1 rounded" style={{ backgroundColor: colors.secondary + '15', color: colors.secondary }}>
                      Rest Day: {schedule.restDayMultiplier || 1.30}×
                    </span>
                  </div>
                </div>
                
                <div className="flex gap-2 ml-4">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEdit(schedule);
                    }}
                    className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                    style={{ color: colors.secondary }}
                    title="Edit schedule"
                  >
                    <FiEdit2 size={18} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(schedule._id);
                    }}
                    className="p-2 rounded-lg hover:bg-red-50 transition-colors"
                    style={{ color: '#DC2626' }}
                    title="Delete schedule"
                  >
                    <FiTrash2 size={18} />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add/Edit Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
          <div 
            className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
          >
            {/* Modal Header */}
            <div className="px-6 py-4 border-b flex items-center justify-between" style={{ backgroundColor: colors.primary + '08' }}>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg" style={{ backgroundColor: colors.accent + '20' }}>
                  <FiSettings size={20} style={{ color: colors.accent }} />
                </div>
                <div>
                  <h3 className="text-lg font-bold" style={{ color: colors.primary }}>
                    {editingSchedule ? 'Edit Payroll Schedule' : 'Create New Schedule'}
                  </h3>
                  <p className="text-xs" style={{ color: colors.muted }}>
                    Configure payout timing, multipliers, and deductions
                  </p>
                </div>
              </div>
            </div>

            {/* Modal Body - Scrollable */}
            <div className="flex-1 overflow-y-auto p-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Basic Info Section */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 md:col-span-1">
                    <label className="block text-sm font-medium mb-1" style={{ color: colors.primary }}>
                      Schedule Name
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-opacity-50 transition-shadow"
                      style={{ borderColor: colors.muted }}
                      placeholder="e.g., Standard Semi-Monthly"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: colors.primary }}>
                      Payout Type
                    </label>
                    <select
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                      className="w-full p-2.5 border rounded-lg"
                      style={{ borderColor: colors.muted }}
                    >
                      <option value="monthly">Monthly</option>
                      <option value="semi-monthly">Semi-Monthly</option>
                      <option value="weekly">Weekly</option>
                      <option value="bi-weekly">Bi-Weekly</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: colors.primary }}>
                      <FiDollarSign className="inline mr-1" size={14} />
                      Payout Days
                    </label>
                    <input
                      type="text"
                      value={formData.payoutDays.join(', ')}
                      onChange={(e) => handlePayoutDaysChange(e.target.value)}
                      className="w-full p-2.5 border rounded-lg"
                      style={{ borderColor: colors.muted }}
                      placeholder="e.g., 15, 30"
                      required
                    />
                    <p className="text-xs mt-1" style={{ color: colors.muted }}>
                      Day(s) of month when payroll is released
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: colors.primary }}>
                      <FiClock className="inline mr-1" size={14} />
                      Cutoff Days
                    </label>
                    <input
                      type="text"
                      value={formData.cutoffDays.join(', ')}
                      onChange={(e) => handleCutoffDaysChange(e.target.value)}
                      className="w-full p-2.5 border rounded-lg"
                      style={{ borderColor: colors.muted }}
                      placeholder="e.g., 14, 29"
                      required
                    />
                    <p className="text-xs mt-1" style={{ color: colors.muted }}>
                      Last day(s) of each pay period
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: colors.primary }}>
                      Regular Hours/Day
                    </label>
                    <input
                      type="number"
                      value={formData.regularHoursPerDay}
                      onChange={(e) => setFormData({ ...formData, regularHoursPerDay: parseInt(e.target.value) || 8 })}
                      className="w-full p-2.5 border rounded-lg"
                      style={{ borderColor: colors.muted }}
                      min="1"
                      max="24"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: colors.primary }}>
                      Work Days/Week
                    </label>
                    <input
                      type="number"
                      value={formData.workDaysPerWeek}
                      onChange={(e) => setFormData({ ...formData, workDaysPerWeek: parseInt(e.target.value) || 6 })}
                      className="w-full p-2.5 border rounded-lg"
                      style={{ borderColor: colors.muted }}
                      min="1"
                      max="7"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: colors.primary }}>
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full p-2.5 border rounded-lg"
                    style={{ borderColor: colors.muted }}
                    rows="2"
                    placeholder="Optional description for this schedule..."
                  />
                </div>

                {/* DOLE Multipliers Section - Collapsible */}
                <div className="border rounded-lg overflow-hidden" style={{ borderColor: colors.muted }}>
                  <button
                    type="button"
                    onClick={() => toggleSection('multipliers')}
                    className="w-full px-4 py-3 flex items-center justify-between"
                    style={{ backgroundColor: colors.accent + '08' }}
                  >
                    <div className="flex items-center gap-2">
                      <FiShield size={18} style={{ color: colors.accent }} />
                      <span className="font-semibold" style={{ color: colors.primary }}>
                        DOLE-Compliant Pay Multipliers
                      </span>
                    </div>
                    {expandedSections.multipliers ? <FiChevronUp /> : <FiChevronDown />}
                  </button>
                  
                  {expandedSections.multipliers && (
                    <div className="p-4 bg-white">
                      <div 
                        className="mb-4 p-3 rounded-lg text-sm"
                        style={{ backgroundColor: '#FEF3C7', border: '1px solid #F59E0B40' }}
                      >
                        <div className="flex items-start gap-2">
                          <FiAlertTriangle className="text-yellow-600 mt-0.5" size={16} />
                          <div>
                            <p className="font-medium text-yellow-800">Philippine Labor Code Compliance</p>
                            <p className="text-yellow-700 text-xs mt-0.5">
                              Multipliers below DOLE minimums will be rejected. Configure rates equal to or higher than legal requirements.
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                        <MultiplierInput
                          label="Overtime (Regular Day)"
                          field="overtimeMultiplier"
                          min={DOLE_MINIMUMS.overtime}
                          description="Work beyond 8 hours"
                        />
                        <MultiplierInput
                          label="Regular Holiday"
                          field="regularHolidayMultiplier"
                          min={DOLE_MINIMUMS.regularHoliday}
                          description="Work on regular holidays"
                        />
                        <MultiplierInput
                          label="Special Holiday"
                          field="specialHolidayMultiplier"
                          min={DOLE_MINIMUMS.specialHoliday}
                          description="Work on special non-working days"
                        />
                        <MultiplierInput
                          label="OT on Regular Holiday"
                          field="overtimeOnHolidayMultiplier"
                          min={DOLE_MINIMUMS.overtimeOnHoliday}
                          description="Overtime during regular holidays"
                        />
                        <MultiplierInput
                          label="OT on Special Holiday"
                          field="overtimeOnSpecialHolidayMultiplier"
                          min={DOLE_MINIMUMS.overtimeOnSpecialHoliday}
                          description="Overtime during special holidays"
                        />
                        <MultiplierInput
                          label="Rest Day"
                          field="restDayMultiplier"
                          min={DOLE_MINIMUMS.restDay}
                          description="Work on scheduled rest day"
                        />
                        <MultiplierInput
                          label="Rest Day Overtime"
                          field="restDayOvertimeMultiplier"
                          min={DOLE_MINIMUMS.restDayOvertime}
                          description="OT on rest day"
                        />
                        <MultiplierInput
                          label="Night Differential"
                          field="nightDifferentialMultiplier"
                          min={DOLE_MINIMUMS.nightDifferential}
                          description="10PM - 6AM shift"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Deduction Settings Section - Collapsible */}
                <div className="border rounded-lg overflow-hidden" style={{ borderColor: colors.muted }}>
                  <button
                    type="button"
                    onClick={() => toggleSection('deductions')}
                    className="w-full px-4 py-3 flex items-center justify-between"
                    style={{ backgroundColor: colors.secondary + '08' }}
                  >
                    <div className="flex items-center gap-2">
                      <FiDollarSign size={18} style={{ color: colors.secondary }} />
                      <span className="font-semibold" style={{ color: colors.primary }}>
                        Deduction Settings
                      </span>
                    </div>
                    {expandedSections.deductions ? <FiChevronUp /> : <FiChevronDown />}
                  </button>
                  
                  {expandedSections.deductions && (
                    <div className="p-4 bg-white">
                      <p className="text-sm mb-4" style={{ color: colors.muted }}>
                        Configure which mandatory and optional deductions apply to this schedule.
                      </p>

                      <div className="grid grid-cols-2 gap-4 mb-4">
                        {/* Government Contributions Toggles */}
                        {[
                          { key: 'sssEnabled', label: 'SSS Contribution' },
                          { key: 'philhealthEnabled', label: 'PhilHealth' },
                          { key: 'pagibigEnabled', label: 'Pag-IBIG Fund' },
                          { key: 'taxEnabled', label: 'Withholding Tax' }
                        ].map(({ key, label }) => (
                          <label key={key} className="flex items-center gap-3 p-3 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors border" style={{ borderColor: colors.muted + '40' }}>
                            <input
                              type="checkbox"
                              checked={formData.deductionSettings?.[key] ?? true}
                              onChange={(e) => setFormData({
                                ...formData,
                                deductionSettings: {
                                  ...formData.deductionSettings,
                                  [key]: e.target.checked
                                }
                              })}
                              className="w-4 h-4 rounded"
                              style={{ accentColor: colors.accent }}
                            />
                            <span className="text-sm font-medium" style={{ color: colors.primary }}>{label}</span>
                          </label>
                        ))}
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-1" style={{ color: colors.primary }}>
                            Late Deduction (₱/min)
                          </label>
                          <input
                            type="number"
                            value={formData.deductionSettings?.lateDeductionPerMinute || 0}
                            onChange={(e) => setFormData({
                              ...formData,
                              deductionSettings: {
                                ...formData.deductionSettings,
                                lateDeductionPerMinute: parseFloat(e.target.value) || 0
                              }
                            })}
                            className="w-full p-2.5 border rounded-lg"
                            style={{ borderColor: colors.muted }}
                            min="0"
                            step="0.01"
                          />
                          <p className="text-xs mt-1" style={{ color: colors.muted }}>0 = no late deduction</p>
                        </div>

                        <div>
                          <label className="block text-sm font-medium mb-1" style={{ color: colors.primary }}>
                            Absence Deduction Type
                          </label>
                          <select
                            value={formData.deductionSettings?.absentDeductionType || 'daily_rate'}
                            onChange={(e) => setFormData({
                              ...formData,
                              deductionSettings: {
                                ...formData.deductionSettings,
                                absentDeductionType: e.target.value
                              }
                            })}
                            className="w-full p-2.5 border rounded-lg"
                            style={{ borderColor: colors.muted }}
                          >
                            <option value="daily_rate">Full Daily Rate</option>
                            <option value="hourly">Hourly (pro-rated)</option>
                            <option value="none">No Deduction</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </form>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t flex justify-end gap-3" style={{ backgroundColor: '#F9FAFB' }}>
              <button
                type="button"
                onClick={resetForm}
                className="px-5 py-2.5 rounded-lg font-medium transition-colors"
                style={{ 
                  backgroundColor: colors.muted + '20', 
                  color: colors.muted
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                className="px-5 py-2.5 rounded-lg font-medium text-white transition-shadow hover:shadow-md flex items-center gap-2"
                style={{ backgroundColor: colors.accent }}
              >
                <FiCheck size={18} />
                {editingSchedule ? 'Update Schedule' : 'Create Schedule'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PayrollSchedule;
