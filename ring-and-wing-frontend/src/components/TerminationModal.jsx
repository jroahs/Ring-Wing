import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX, FiAlertTriangle, FiUser, FiCalendar, FiFileText } from 'react-icons/fi';
import { Button } from './ui/Button';

const TerminationModal = ({ isOpen, onClose, staff, colors, onTerminate }) => {
  const [formData, setFormData] = useState({
    terminationReason: '',
    terminationNotes: '',
    finalWorkDate: new Date().toISOString().split('T')[0],
    isEligibleForRehire: true
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const terminationReasons = [
    'Resignation - Personal Reasons',
    'Resignation - Better Opportunity', 
    'Resignation - Relocation',
    'Termination - Performance Issues',
    'Termination - Misconduct',
    'Termination - Attendance Issues',
    'Termination - Policy Violation',
    'Termination - Redundancy',
    'Contract Ended',
    'Mutual Agreement',
    'Other'
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.terminationReason) {
      alert('Please select a termination reason');
      return;
    }

    setIsSubmitting(true);
    try {
      await onTerminate(staff._id, formData);
      onClose();
      // Reset form
      setFormData({
        terminationReason: '',
        terminationNotes: '',
        finalWorkDate: new Date().toISOString().split('T')[0],
        isEligibleForRehire: true
      });
    } catch (error) {
      console.error('Error terminating staff:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="flex justify-between items-center p-6 border-b" style={{ borderColor: colors.muted + '30' }}>
            <div className="flex items-center gap-3">
              <div 
                className="p-2 rounded-full"
                style={{ backgroundColor: colors.accent + '20' }}
              >
                <FiAlertTriangle style={{ color: colors.accent }} size={20} />
              </div>
              <div>
                <h2 className="text-lg font-semibold" style={{ color: colors.primary }}>
                  Process Staff Departure
                </h2>
                <p className="text-sm" style={{ color: colors.muted }}>
                  {staff?.name}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded hover:bg-gray-100"
              disabled={isSubmitting}
            >
              <FiX size={20} />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6">
            <div className="space-y-4">
              {/* Termination Reason */}
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: colors.primary }}>
                  <FiFileText className="inline mr-1" />
                  Reason for Departure *
                </label>
                <select
                  name="terminationReason"
                  value={formData.terminationReason}
                  onChange={handleInputChange}
                  className="w-full p-3 border rounded-lg"
                  style={{ borderColor: colors.muted }}
                  required
                >
                  <option value="">Select a reason...</option>
                  {terminationReasons.map(reason => (
                    <option key={reason} value={reason}>
                      {reason}
                    </option>
                  ))}
                </select>
              </div>

              {/* Final Work Date */}
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: colors.primary }}>
                  <FiCalendar className="inline mr-1" />
                  Final Work Date
                </label>
                <input
                  type="date"
                  name="finalWorkDate"
                  value={formData.finalWorkDate}
                  onChange={handleInputChange}
                  className="w-full p-3 border rounded-lg"
                  style={{ borderColor: colors.muted }}
                  max={new Date().toISOString().split('T')[0]}
                />
              </div>

              {/* Termination Notes */}
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: colors.primary }}>
                  <FiFileText className="inline mr-1" />
                  Additional Notes
                </label>
                <textarea
                  name="terminationNotes"
                  value={formData.terminationNotes}
                  onChange={handleInputChange}
                  placeholder="Optional: Additional details about the departure..."
                  className="w-full p-3 border rounded-lg resize-none"
                  style={{ borderColor: colors.muted }}
                  rows="3"
                  maxLength="500"
                />
                <div className="text-xs text-right mt-1" style={{ color: colors.muted }}>
                  {formData.terminationNotes.length}/500
                </div>
              </div>

              {/* Eligible for Rehire */}
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  name="isEligibleForRehire"
                  id="isEligibleForRehire"
                  checked={formData.isEligibleForRehire}
                  onChange={handleInputChange}
                  className="w-4 h-4"
                  style={{ accentColor: colors.primary }}
                />
                <label htmlFor="isEligibleForRehire" className="text-sm" style={{ color: colors.primary }}>
                  Eligible for future rehire
                </label>
              </div>

              {/* Warning Message */}
              <div 
                className="p-4 rounded-lg border-l-4"
                style={{ 
                  backgroundColor: colors.accent + '10',
                  borderLeftColor: colors.accent 
                }}
              >
                <div className="flex gap-3">
                  <FiAlertTriangle style={{ color: colors.accent }} className="flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium" style={{ color: colors.accent }}>
                      Important Notice
                    </p>
                    <p className="text-xs mt-1" style={{ color: colors.muted }}>
                      This action will deactivate the staff member's account and prevent access to the system. 
                      All employment records and history will be preserved. The staff member can be reactivated later if needed.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 mt-6">
              <Button
                type="button"
                onClick={onClose}
                variant="ghost"
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="accent"
                disabled={isSubmitting || !formData.terminationReason}
              >
                {isSubmitting ? 'Processing...' : 'Process Departure'}
              </Button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default TerminationModal;
