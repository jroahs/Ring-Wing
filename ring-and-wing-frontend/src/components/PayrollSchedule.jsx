import React, { useState, useEffect } from 'react';
import api from '../services/apiService';
import { toast } from 'react-toastify';
import { FiCalendar, FiPlus, FiEdit2, FiTrash2 } from 'react-icons/fi';

const PayrollSchedule = ({ colors, onScheduleSelect }) => {
  const [schedules, setSchedules] = useState([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    type: 'semi-monthly',
    payoutDays: [],
    cutoffDays: [],
    description: '',
    overtimeMultiplier: 1.25,
    regularHoursPerDay: 8,
    workDaysPerWeek: 6
  });

  // Fetch schedules on component mount
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
    try {
      const token = localStorage.getItem('authToken');
      const config = {
        headers: { 'Authorization': `Bearer ${token}` }
      };

      let response;
      if (editingSchedule) {
        response = await api.put(
          `/api/payroll-schedules/${editingSchedule._id}`,
          formData,
          config
        );
      } else {
        response = await api.post('/api/payroll-schedules', formData, config);
      }

      if (response.data?.success) {
        toast.success(
          editingSchedule 
            ? 'Schedule updated successfully' 
            : 'New schedule created successfully'
        );
        fetchSchedules();
        resetForm();
      }
    } catch (error) {
      console.error('Error saving schedule:', error);
      toast.error(error.response?.data?.message || 'Failed to save schedule');
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
      overtimeMultiplier: 1.25,
      regularHoursPerDay: 8,
      workDaysPerWeek: 6
    });
    setEditingSchedule(null);
    setIsAddModalOpen(false);
  };

  const handleEdit = (schedule) => {
    setEditingSchedule(schedule);
    setFormData({
      name: schedule.name,
      type: schedule.type,
      payoutDays: schedule.payoutDays,
      cutoffDays: schedule.cutoffDays,
      description: schedule.description,
      overtimeMultiplier: schedule.overtimeMultiplier,
      regularHoursPerDay: schedule.regularHoursPerDay,
      workDaysPerWeek: schedule.workDaysPerWeek
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

  return (
    <div className="rounded-lg p-4 shadow-sm" style={{ backgroundColor: colors.background }}>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold" style={{ color: colors.primary }}>
          <FiCalendar className="inline mr-2" />
          Payroll Schedules
        </h2>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="px-3 py-1 rounded text-sm font-medium flex items-center"
          style={{ backgroundColor: colors.accent, color: 'white' }}
        >
          <FiPlus className="mr-1" />
          Add Schedule
        </button>
      </div>

      {/* Schedules List */}
      <div className="space-y-2 mb-4">
        {schedules.map(schedule => (
          <div
            key={schedule._id}
            className="p-3 rounded flex justify-between items-center"
            style={{
              backgroundColor: colors.background,
              border: `1px solid ${colors.muted}`,
              cursor: 'pointer'
            }}
            onClick={() => onScheduleSelect(schedule)}
          >
            <div>
              <p className="font-medium">{schedule.name}</p>
              <p className="text-sm" style={{ color: colors.muted }}>
                {schedule.type} - Payout: {schedule.payoutDays.join(', ')}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleEdit(schedule);
                }}
                className="p-1 rounded"
                style={{ color: colors.secondary }}
              >
                <FiEdit2 size={16} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(schedule._id);
                }}
                className="p-1 rounded"
                style={{ color: colors.accent }}
              >
                <FiTrash2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add/Edit Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4" style={{ color: colors.primary }}>
              {editingSchedule ? 'Edit Schedule' : 'Add New Schedule'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full p-2 border rounded"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Type</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full p-2 border rounded"
                >
                  <option value="monthly">Monthly</option>
                  <option value="semi-monthly">Semi-monthly</option>
                  <option value="weekly">Weekly</option>
                  <option value="bi-weekly">Bi-weekly</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Payout Days (comma-separated)</label>
                <input
                  type="text"
                  value={formData.payoutDays.join(', ')}
                  onChange={(e) => handlePayoutDaysChange(e.target.value)}
                  className="w-full p-2 border rounded"
                  placeholder="e.g., 15, 30"
                  required
                />
                <p className="text-xs mt-1" style={{ color: colors.muted }}>
                  For monthly: day of month (1-31)
                  <br />
                  For semi-monthly: two days (e.g., 15, 30)
                  <br />
                  For weekly/bi-weekly: day of week (0-6, Sunday-Saturday)
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Cutoff Days (comma-separated)</label>
                <input
                  type="text"
                  value={formData.cutoffDays.join(', ')}
                  onChange={(e) => handleCutoffDaysChange(e.target.value)}
                  className="w-full p-2 border rounded"
                  placeholder="e.g., 14, 29"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full p-2 border rounded"
                  rows="2"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">OT Multiplier</label>
                  <input
                    type="number"
                    value={formData.overtimeMultiplier}
                    onChange={(e) => setFormData({ ...formData, overtimeMultiplier: parseFloat(e.target.value) })}
                    className="w-full p-2 border rounded"
                    min="1"
                    step="0.01"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Hours/Day</label>
                  <input
                    type="number"
                    value={formData.regularHoursPerDay}
                    onChange={(e) => setFormData({ ...formData, regularHoursPerDay: parseInt(e.target.value) })}
                    className="w-full p-2 border rounded"
                    min="1"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Days/Week</label>
                  <input
                    type="number"
                    value={formData.workDaysPerWeek}
                    onChange={(e) => setFormData({ ...formData, workDaysPerWeek: parseInt(e.target.value) })}
                    className="w-full p-2 border rounded"
                    min="1"
                    max="7"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 rounded"
                  style={{ backgroundColor: colors.muted + '20', color: colors.muted }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded text-white"
                  style={{ backgroundColor: colors.accent }}
                >
                  {editingSchedule ? 'Update' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PayrollSchedule;
