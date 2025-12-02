import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Clock,
  Calendar,
  FileText,
  Upload,
  Check,
  X,
  AlertCircle,
  Loader2
} from 'lucide-react';
import api from '../../services/api';

const correctionTypes = [
  { value: 'add_clock_in', label: 'Add Clock In', description: 'Add a missing clock in entry' },
  { value: 'add_clock_out', label: 'Add Clock Out', description: 'Add a missing clock out entry' },
  { value: 'modify_clock_in', label: 'Modify Clock In', description: 'Change an existing clock in time' },
  { value: 'modify_clock_out', label: 'Modify Clock Out', description: 'Change an existing clock out time' },
  { value: 'add_full_day', label: 'Add Full Day', description: 'Add a complete workday entry' },
  { value: 'delete_entry', label: 'Delete Entry', description: 'Remove an incorrect entry' }
];

const TimeLogCorrectionForm = ({ staffId, onSuccess, onCancel }) => {
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    correctionType: 'add_clock_in',
    originalTimeLogId: '',
    correctedTimestamp: '',
    reason: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [existingLogs, setExistingLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  // Fetch existing time logs when date changes
  const fetchExistingLogs = async (date) => {
    if (!staffId) return;
    
    try {
      setLoadingLogs(true);
      const response = await api.get(`/api/time-logs/staff/${staffId}`, {
        params: {
          startDate: date,
          endDate: date
        }
      });
      
      const data = response.data?.data || response.data;
      setExistingLogs(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching time logs:', err);
    } finally {
      setLoadingLogs(false);
    }
  };

  const handleDateChange = (e) => {
    const newDate = e.target.value;
    setFormData({ ...formData, date: newDate, originalTimeLogId: '' });
    fetchExistingLogs(newDate);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!formData.reason.trim()) {
      setError('Please provide a reason for this correction');
      return;
    }

    const needsOriginalLog = ['modify_clock_in', 'modify_clock_out', 'delete_entry'].includes(formData.correctionType);
    if (needsOriginalLog && !formData.originalTimeLogId) {
      setError('Please select the time log entry to modify');
      return;
    }

    const needsCorrectedTime = ['add_clock_in', 'add_clock_out', 'modify_clock_in', 'modify_clock_out'].includes(formData.correctionType);
    if (needsCorrectedTime && !formData.correctedTimestamp) {
      setError('Please enter the corrected time');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const payload = {
        staffId,
        date: formData.date,
        correctionType: formData.correctionType,
        reason: formData.reason
      };

      if (formData.originalTimeLogId) {
        payload.originalTimeLogId = formData.originalTimeLogId;
        const originalLog = existingLogs.find(l => l._id === formData.originalTimeLogId);
        if (originalLog) {
          payload.originalTimestamp = originalLog.timestamp;
        }
      }

      if (formData.correctedTimestamp) {
        // Combine date with time
        const [hours, minutes] = formData.correctedTimestamp.split(':');
        const timestamp = new Date(formData.date);
        timestamp.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        payload.correctedTimestamp = timestamp.toISOString();
      }

      const response = await api.post('/api/time-log-corrections', payload);

      const data = response.data?.data || response.data;
      onSuccess?.(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit correction request');
    } finally {
      setSubmitting(false);
    }
  };

  // Format time for display
  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Check which fields to show based on correction type
  const needsOriginalLog = ['modify_clock_in', 'modify_clock_out', 'delete_entry'].includes(formData.correctionType);
  const needsCorrectedTime = ['add_clock_in', 'add_clock_out', 'modify_clock_in', 'modify_clock_out'].includes(formData.correctionType);
  const isDeleteType = formData.correctionType === 'delete_entry';
  const isFullDay = formData.correctionType === 'add_full_day';

  return (
    <motion.form
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      onSubmit={handleSubmit}
      className="bg-gray-800 rounded-xl p-6 space-y-6"
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-blue-500/20 rounded-lg">
          <Clock className="w-5 h-5 text-blue-400" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white">Request Time Correction</h3>
          <p className="text-sm text-gray-400">Submit a request to adjust time log entries</p>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Date */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          <Calendar className="w-4 h-4 inline mr-2" />
          Date
        </label>
        <input
          type="date"
          value={formData.date}
          onChange={handleDateChange}
          max={new Date().toISOString().split('T')[0]}
          className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
          required
        />
      </div>

      {/* Correction Type */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Correction Type
        </label>
        <div className="grid grid-cols-2 gap-2">
          {correctionTypes.map((type) => (
            <button
              key={type.value}
              type="button"
              onClick={() => setFormData({ ...formData, correctionType: type.value, originalTimeLogId: '' })}
              className={`
                p-3 text-left rounded-lg border transition-all
                ${formData.correctionType === type.value
                  ? 'border-blue-500 bg-blue-500/10 text-white'
                  : 'border-gray-600 bg-gray-700/50 text-gray-300 hover:border-gray-500'}
              `}
            >
              <div className="font-medium text-sm">{type.label}</div>
              <div className="text-xs text-gray-400 mt-0.5">{type.description}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Original Time Log Selection */}
      {needsOriginalLog && (
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Select Entry to {isDeleteType ? 'Delete' : 'Modify'}
          </label>
          {loadingLogs ? (
            <div className="flex items-center gap-2 text-gray-400 py-4">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading time logs...
            </div>
          ) : existingLogs.length === 0 ? (
            <div className="text-gray-500 text-sm py-4 text-center bg-gray-700/30 rounded-lg">
              No time logs found for this date
            </div>
          ) : (
            <div className="space-y-2">
              {existingLogs.map((log) => (
                <button
                  key={log._id}
                  type="button"
                  onClick={() => setFormData({ ...formData, originalTimeLogId: log._id })}
                  className={`
                    w-full p-3 text-left rounded-lg border transition-all flex items-center gap-3
                    ${formData.originalTimeLogId === log._id
                      ? 'border-blue-500 bg-blue-500/10'
                      : 'border-gray-600 bg-gray-700/50 hover:border-gray-500'}
                  `}
                >
                  <div className={`
                    w-8 h-8 rounded-full flex items-center justify-center
                    ${log.type === 'clockIn' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}
                  `}>
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-medium text-white">
                      {log.type === 'clockIn' ? 'Clock In' : 'Clock Out'}
                    </div>
                    <div className="text-sm text-gray-400">
                      {formatTime(log.timestamp)}
                      {log.clockMethod && ` (${log.clockMethod})`}
                    </div>
                  </div>
                  {formData.originalTimeLogId === log._id && (
                    <Check className="w-5 h-5 text-blue-400 ml-auto" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Corrected Time */}
      {needsCorrectedTime && (
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            <Clock className="w-4 h-4 inline mr-2" />
            {formData.correctionType.includes('modify') ? 'New Time' : 'Time'}
          </label>
          <input
            type="time"
            value={formData.correctedTimestamp}
            onChange={(e) => setFormData({ ...formData, correctedTimestamp: e.target.value })}
            className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
            required
          />
        </div>
      )}

      {/* Full day info */}
      {isFullDay && (
        <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg text-sm text-blue-300">
          <p>This will add a full workday entry with:</p>
          <ul className="mt-2 space-y-1 text-gray-400">
            <li>• Clock In: 9:00 AM</li>
            <li>• Clock Out: 6:00 PM</li>
            <li>• Total: 9 hours</li>
          </ul>
        </div>
      )}

      {/* Reason */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          <FileText className="w-4 h-4 inline mr-2" />
          Reason for Correction
        </label>
        <textarea
          value={formData.reason}
          onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
          placeholder="Please explain why this correction is needed..."
          rows={3}
          className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none resize-none"
          required
        />
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={submitting}
          className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
        >
          {submitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Submitting...
            </>
          ) : (
            <>
              <Check className="w-4 h-4" />
              Submit Request
            </>
          )}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Info */}
      <p className="text-xs text-gray-500 text-center">
        Your request will be reviewed by a manager before being applied.
      </p>
    </motion.form>
  );
};

export default TimeLogCorrectionForm;
