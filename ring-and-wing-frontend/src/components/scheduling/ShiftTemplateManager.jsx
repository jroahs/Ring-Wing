import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Edit2,
  Trash2,
  Clock,
  Coffee,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Check,
  X,
  AlertCircle
} from 'lucide-react';
import api from '../../utils/api';

const ShiftTemplateManager = ({ onTemplateSelect, selectedTemplateId }) => {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState(true);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    startTime: '09:00',
    endTime: '18:00',
    breakMinutes: 60,
    color: '#3B82F6',
    allowSplitShift: false,
    splitShiftConfig: {
      firstShiftEnd: '12:00',
      secondShiftStart: '14:00'
    }
  });

  const colorOptions = [
    '#3B82F6', // Blue
    '#10B981', // Green
    '#F59E0B', // Amber
    '#EF4444', // Red
    '#8B5CF6', // Purple
    '#EC4899', // Pink
    '#06B6D4', // Cyan
    '#84CC16', // Lime
    '#F97316', // Orange
    '#6366F1', // Indigo
  ];

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const response = await api.get('/shift-templates');
      if (response.data.success) {
        setTemplates(response.data.data);
      }
    } catch (err) {
      setError('Failed to load shift templates');
      console.error('Error fetching templates:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingTemplate) {
        const response = await api.put(`/shift-templates/${editingTemplate._id}`, formData);
        if (response.data.success) {
          setTemplates(templates.map(t => 
            t._id === editingTemplate._id ? response.data.data : t
          ));
        }
      } else {
        const response = await api.post('/shift-templates', formData);
        if (response.data.success) {
          setTemplates([...templates, response.data.data]);
        }
      }
      resetForm();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save template');
    }
  };

  const handleDelete = async (templateId) => {
    if (!confirm('Are you sure you want to delete this shift template?')) return;
    
    try {
      await api.delete(`/shift-templates/${templateId}`);
      setTemplates(templates.filter(t => t._id !== templateId));
      if (selectedTemplateId === templateId && onTemplateSelect) {
        onTemplateSelect(null);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete template');
    }
  };

  const handleReactivate = async (templateId) => {
    try {
      const response = await api.put(`/shift-templates/${templateId}/reactivate`);
      if (response.data.success) {
        setTemplates(templates.map(t => 
          t._id === templateId ? { ...t, isActive: true } : t
        ));
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reactivate template');
    }
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingTemplate(null);
    setFormData({
      name: '',
      startTime: '09:00',
      endTime: '18:00',
      breakMinutes: 60,
      color: '#3B82F6',
      allowSplitShift: false,
      splitShiftConfig: {
        firstShiftEnd: '12:00',
        secondShiftStart: '14:00'
      }
    });
  };

  const startEdit = (template) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      startTime: template.startTime,
      endTime: template.endTime,
      breakMinutes: template.breakMinutes,
      color: template.color,
      allowSplitShift: template.allowSplitShift || false,
      splitShiftConfig: template.splitShiftConfig || {
        firstShiftEnd: '12:00',
        secondShiftStart: '14:00'
      }
    });
    setShowForm(true);
  };

  const formatTime = (time) => {
    if (!time) return '';
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const calculateWorkHours = () => {
    const [startH, startM] = formData.startTime.split(':').map(Number);
    const [endH, endM] = formData.endTime.split(':').map(Number);
    let totalMinutes = (endH * 60 + endM) - (startH * 60 + startM);
    if (totalMinutes < 0) totalMinutes += 24 * 60; // Handle overnight shifts
    totalMinutes -= formData.breakMinutes;
    return (totalMinutes / 60).toFixed(1);
  };

  if (loading) {
    return (
      <div className="bg-gray-800/50 rounded-xl p-4 animate-pulse">
        <div className="h-6 bg-gray-700 rounded w-32 mb-4" />
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-12 bg-gray-700 rounded" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800/50 rounded-xl overflow-hidden border border-gray-700">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3 flex items-center justify-between bg-gray-800/80 hover:bg-gray-700/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-blue-400" />
          <span className="font-medium text-white">Shift Templates</span>
          <span className="text-xs text-gray-400 bg-gray-700 px-2 py-0.5 rounded-full">
            {templates.filter(t => t.isActive).length}
          </span>
        </div>
        {expanded ? (
          <ChevronUp className="w-5 h-5 text-gray-400" />
        ) : (
          <ChevronDown className="w-5 h-5 text-gray-400" />
        )}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="p-4 space-y-3">
              {/* Error message */}
              {error && (
                <div className="flex items-center gap-2 text-red-400 text-sm bg-red-400/10 p-2 rounded-lg">
                  <AlertCircle className="w-4 h-4" />
                  {error}
                  <button onClick={() => setError(null)} className="ml-auto">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Template list */}
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {templates.filter(t => t.isActive).map((template) => (
                  <motion.div
                    key={template._id}
                    layout
                    className={`
                      flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all
                      ${selectedTemplateId === template._id 
                        ? 'bg-blue-500/20 border border-blue-500/50' 
                        : 'bg-gray-700/50 hover:bg-gray-700 border border-transparent'}
                    `}
                    onClick={() => onTemplateSelect?.(template)}
                  >
                    <div
                      className="w-3 h-10 rounded-full"
                      style={{ backgroundColor: template.color }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-white truncate">
                        {template.name}
                      </div>
                      <div className="text-xs text-gray-400 flex items-center gap-2">
                        <span>{formatTime(template.startTime)} - {formatTime(template.endTime)}</span>
                        <span className="text-gray-500">•</span>
                        <span>{template.workHours}h</span>
                        {template.allowSplitShift && (
                          <>
                            <span className="text-gray-500">•</span>
                            <span className="text-amber-400">Split</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          startEdit(template);
                        }}
                        className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-600 rounded transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(template._id);
                        }}
                        className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-400/10 rounded transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Inactive templates */}
              {templates.filter(t => !t.isActive).length > 0 && (
                <div className="pt-2 border-t border-gray-700">
                  <p className="text-xs text-gray-500 mb-2">Inactive Templates</p>
                  {templates.filter(t => !t.isActive).map((template) => (
                    <div
                      key={template._id}
                      className="flex items-center gap-2 p-2 text-gray-500 text-sm"
                    >
                      <div
                        className="w-2 h-6 rounded-full opacity-50"
                        style={{ backgroundColor: template.color }}
                      />
                      <span className="flex-1">{template.name}</span>
                      <button
                        onClick={() => handleReactivate(template._id)}
                        className="p-1 text-gray-400 hover:text-green-400 hover:bg-green-400/10 rounded"
                        title="Reactivate"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add button */}
              {!showForm && (
                <button
                  onClick={() => setShowForm(true)}
                  className="w-full py-2 border-2 border-dashed border-gray-600 rounded-lg text-gray-400 hover:border-blue-500 hover:text-blue-400 transition-colors flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add Shift Template
                </button>
              )}

              {/* Form */}
              <AnimatePresence>
                {showForm && (
                  <motion.form
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    onSubmit={handleSubmit}
                    className="space-y-4 p-4 bg-gray-700/30 rounded-lg border border-gray-600"
                  >
                    <h3 className="font-medium text-white">
                      {editingTemplate ? 'Edit Shift Template' : 'New Shift Template'}
                    </h3>

                    {/* Name */}
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Template Name</label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                        placeholder="e.g., Morning Shift"
                        required
                      />
                    </div>

                    {/* Time inputs */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm text-gray-400 mb-1">Start Time</label>
                        <input
                          type="time"
                          value={formData.startTime}
                          onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                          className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-400 mb-1">End Time</label>
                        <input
                          type="time"
                          value={formData.endTime}
                          onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                          className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                          required
                        />
                      </div>
                    </div>

                    {/* Break minutes */}
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">
                        <Coffee className="w-4 h-4 inline mr-1" />
                        Break Duration (minutes)
                      </label>
                      <input
                        type="number"
                        value={formData.breakMinutes}
                        onChange={(e) => setFormData({ ...formData, breakMinutes: parseInt(e.target.value) || 0 })}
                        className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                        min="0"
                        max="180"
                      />
                    </div>

                    {/* Split shift toggle */}
                    <div>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.allowSplitShift}
                          onChange={(e) => setFormData({ ...formData, allowSplitShift: e.target.checked })}
                          className="w-4 h-4 rounded border-gray-600 text-blue-500 focus:ring-blue-500 focus:ring-offset-gray-800"
                        />
                        <span className="text-sm text-gray-300">Allow Split Shift</span>
                      </label>
                    </div>

                    {/* Split shift config */}
                    <AnimatePresence>
                      {formData.allowSplitShift && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-600"
                        >
                          <div>
                            <label className="block text-sm text-gray-400 mb-1">First Shift Ends</label>
                            <input
                              type="time"
                              value={formData.splitShiftConfig.firstShiftEnd}
                              onChange={(e) => setFormData({
                                ...formData,
                                splitShiftConfig: { ...formData.splitShiftConfig, firstShiftEnd: e.target.value }
                              })}
                              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-sm text-gray-400 mb-1">Second Shift Starts</label>
                            <input
                              type="time"
                              value={formData.splitShiftConfig.secondShiftStart}
                              onChange={(e) => setFormData({
                                ...formData,
                                splitShiftConfig: { ...formData.splitShiftConfig, secondShiftStart: e.target.value }
                              })}
                              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                            />
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Color picker */}
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">Color</label>
                      <div className="flex flex-wrap gap-2">
                        {colorOptions.map((color) => (
                          <button
                            key={color}
                            type="button"
                            onClick={() => setFormData({ ...formData, color })}
                            className={`w-8 h-8 rounded-full transition-transform ${
                              formData.color === color ? 'scale-110 ring-2 ring-white ring-offset-2 ring-offset-gray-800' : ''
                            }`}
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Work hours preview */}
                    <div className="text-sm text-gray-400 bg-gray-800/50 p-2 rounded">
                      Total work hours: <span className="text-white font-medium">{calculateWorkHours()} hours</span>
                    </div>

                    {/* Form actions */}
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                      >
                        <Check className="w-4 h-4" />
                        {editingTemplate ? 'Update' : 'Create'}
                      </button>
                      <button
                        type="button"
                        onClick={resetForm}
                        className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </motion.form>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ShiftTemplateManager;
