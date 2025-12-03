import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDraggable } from '@dnd-kit/core';
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
  AlertCircle,
  GripVertical
} from 'lucide-react';
import api from '../../services/api';

// Draggable Template Card Component
const DraggableTemplateCard = ({ template, isSelected, onSelect, onEdit, onDelete, colors }) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `template_${template._id}`,
    data: { type: 'template', template }
  });

  const c = colors;
  
  const formatTime = (time) => {
    if (!time) return '';
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    zIndex: isDragging ? 1000 : 1,
    opacity: isDragging ? 0.8 : 1,
  } : undefined;

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`p-3 rounded-xl cursor-grab active:cursor-grabbing transition-all ${
        isSelected ? 'ring-2' : ''
      } ${isDragging ? 'shadow-lg' : ''}`}
      onClick={() => onSelect(template)}
      {...attributes}
      {...listeners}
    >
      <div 
        className="rounded-xl p-3"
        style={{ 
          backgroundColor: isSelected ? `${c.primary}15` : '#fff',
          border: `2px solid ${isSelected ? c.primary : c.border}`,
        }}
      >
        <div className="flex items-center gap-2 mb-2">
          <GripVertical className="w-4 h-4 flex-shrink-0" style={{ color: c.muted }} />
          <div
            className="w-3 h-3 rounded-full flex-shrink-0"
            style={{ backgroundColor: template.color }}
          />
          <span className="font-medium text-sm flex-1 truncate" style={{ color: c.text }}>
            {template.name}
          </span>
        </div>
        
        <div className="flex items-center gap-2 text-xs mb-2" style={{ color: c.muted }}>
          <Clock className="w-3 h-3" />
          <span>{formatTime(template.startTime)} - {formatTime(template.endTime)}</span>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 text-xs" style={{ color: c.muted }}>
            <Coffee className="w-3 h-3" />
            <span>{template.breakMinutes}min break</span>
          </div>
          
          <div className="flex gap-1" onClick={e => e.stopPropagation()}>
            <button
              onClick={(e) => { e.stopPropagation(); onEdit(template); }}
              className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
              title="Edit"
            >
              <Edit2 className="w-3.5 h-3.5" style={{ color: c.muted }} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(template._id); }}
              className="p-1.5 rounded-lg hover:bg-red-50 transition-colors"
              title="Delete"
            >
              <Trash2 className="w-3.5 h-3.5" style={{ color: c.danger }} />
            </button>
          </div>
        </div>
      </div>
      
      {isDragging && (
        <div className="text-xs text-center mt-1" style={{ color: c.primary }}>
          Drop on calendar cell
        </div>
      )}
    </motion.div>
  );
};

// Time Picker Modal Component
const TimePickerModal = ({ isOpen, onClose, value, onChange, label, colors }) => {
  const [hours, setHours] = useState('09');
  const [minutes, setMinutes] = useState('00');
  const [period, setPeriod] = useState('AM');

  const c = colors;

  useEffect(() => {
    if (value) {
      const [h, m] = value.split(':');
      const hour = parseInt(h);
      setHours(String(hour > 12 ? hour - 12 : hour === 0 ? 12 : hour).padStart(2, '0'));
      setMinutes(m);
      setPeriod(hour >= 12 ? 'PM' : 'AM');
    }
  }, [value, isOpen]);

  const handleConfirm = () => {
    let hour = parseInt(hours);
    if (period === 'PM' && hour !== 12) hour += 12;
    if (period === 'AM' && hour === 12) hour = 0;
    const timeString = `${String(hour).padStart(2, '0')}:${minutes}`;
    onChange(timeString);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />
      
      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative bg-white rounded-2xl shadow-xl p-6 w-80"
      >
        <h3 className="text-lg font-semibold mb-4 text-center" style={{ color: c.text }}>
          {label}
        </h3>

        {/* Time Picker */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {/* Hours */}
          <div className="flex flex-col items-center">
            <button
              type="button"
              onClick={() => {
                const h = (parseInt(hours) % 12) + 1;
                setHours(String(h).padStart(2, '0'));
              }}
              className="p-2 rounded-lg hover:bg-gray-100"
            >
              <ChevronUp className="w-5 h-5" style={{ color: c.muted }} />
            </button>
            <input
              type="text"
              inputMode="numeric"
              value={hours}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, '');
                if (val === '' || (parseInt(val) <= 12 && parseInt(val) >= 1)) {
                  setHours(val);
                }
              }}
              onBlur={(e) => {
                const val = parseInt(e.target.value) || 12;
                setHours(String(Math.min(12, Math.max(1, val))).padStart(2, '0'));
              }}
              onFocus={(e) => e.target.select()}
              className="w-16 h-14 text-center text-2xl font-bold rounded-lg focus:outline-none focus:ring-2"
              style={{ 
                backgroundColor: `${c.primary}10`,
                color: c.text,
                border: `2px solid ${c.primary}`,
                caretColor: c.primary
              }}
            />
            <button
              type="button"
              onClick={() => {
                const h = parseInt(hours) - 1;
                setHours(String(h < 1 ? 12 : h).padStart(2, '0'));
              }}
              className="p-2 rounded-lg hover:bg-gray-100"
            >
              <ChevronDown className="w-5 h-5" style={{ color: c.muted }} />
            </button>
          </div>

          <span className="text-3xl font-bold" style={{ color: c.text }}>:</span>

          {/* Minutes */}
          <div className="flex flex-col items-center">
            <button
              type="button"
              onClick={() => {
                const m = (parseInt(minutes) + 5) % 60;
                setMinutes(String(m).padStart(2, '0'));
              }}
              className="p-2 rounded-lg hover:bg-gray-100"
            >
              <ChevronUp className="w-5 h-5" style={{ color: c.muted }} />
            </button>
            <input
              type="text"
              inputMode="numeric"
              value={minutes}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, '');
                if (val === '' || parseInt(val) < 60) {
                  setMinutes(val);
                }
              }}
              onBlur={(e) => {
                const val = parseInt(e.target.value) || 0;
                setMinutes(String(Math.min(59, Math.max(0, val))).padStart(2, '0'));
              }}
              onFocus={(e) => e.target.select()}
              className="w-16 h-14 text-center text-2xl font-bold rounded-lg focus:outline-none focus:ring-2"
              style={{ 
                backgroundColor: `${c.primary}10`,
                color: c.text,
                border: `2px solid ${c.primary}`,
                caretColor: c.primary
              }}
            />
            <button
              type="button"
              onClick={() => {
                const m = parseInt(minutes) - 5;
                setMinutes(String(m < 0 ? 55 : m).padStart(2, '0'));
              }}
              className="p-2 rounded-lg hover:bg-gray-100"
            >
              <ChevronDown className="w-5 h-5" style={{ color: c.muted }} />
            </button>
          </div>

          {/* AM/PM */}
          <div className="flex flex-col gap-1 ml-2">
            <button
              type="button"
              onClick={() => setPeriod('AM')}
              className="px-3 py-2 rounded-lg text-sm font-bold transition-colors"
              style={{
                backgroundColor: period === 'AM' ? c.primary : `${c.muted}10`,
                color: period === 'AM' ? '#fff' : c.muted
              }}
            >
              AM
            </button>
            <button
              type="button"
              onClick={() => setPeriod('PM')}
              className="px-3 py-2 rounded-lg text-sm font-bold transition-colors"
              style={{
                backgroundColor: period === 'PM' ? c.primary : `${c.muted}10`,
                color: period === 'PM' ? '#fff' : c.muted
              }}
            >
              PM
            </button>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-lg font-medium"
            style={{ backgroundColor: `${c.muted}15`, color: c.text }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="flex-1 py-2.5 rounded-lg font-medium text-white"
            style={{ backgroundColor: c.primary }}
          >
            Confirm
          </button>
        </div>
      </motion.div>
    </div>
  );
};

// Template Form Modal
const TemplateFormModal = ({ isOpen, onClose, template, onSave, colors }) => {
  const c = colors;
  
  const [formData, setFormData] = useState({
    name: '',
    startTime: '09:00',
    endTime: '18:00',
    breakMinutes: 60,
    breakStartTime: null, // Optional: specific break start time
    color: '#3B82F6',
    allowSplitShift: false,
    splitShiftConfig: {
      firstShiftEnd: '12:00',
      secondShiftStart: '14:00'
    }
  });

  const [timePickerOpen, setTimePickerOpen] = useState(null); // 'start', 'end', 'splitEnd', 'splitStart', 'breakStart'
  const [saving, setSaving] = useState(false);

  const colorOptions = [
    '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
    '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1'
  ];

  useEffect(() => {
    if (template) {
      setFormData({
        name: template.name || '',
        startTime: template.startTime || '09:00',
        endTime: template.endTime || '18:00',
        breakMinutes: template.breakMinutes || 60,
        breakStartTime: template.breakStartTime || null,
        color: template.color || '#3B82F6',
        allowSplitShift: template.allowSplitShift || false,
        splitShiftConfig: template.splitShiftConfig || {
          firstShiftEnd: '12:00',
          secondShiftStart: '14:00'
        }
      });
    } else {
      setFormData({
        name: '',
        startTime: '09:00',
        endTime: '18:00',
        breakMinutes: 60,
        breakStartTime: null,
        color: '#3B82F6',
        allowSplitShift: false,
        splitShiftConfig: {
          firstShiftEnd: '12:00',
          secondShiftStart: '14:00'
        }
      });
    }
  }, [template, isOpen]);

  const formatTime = (time) => {
    if (!time) return '';
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const calculateBreakEnd = () => {
    if (!formData.breakStartTime || !formData.breakMinutes) return '';
    const [hours, minutes] = formData.breakStartTime.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes + formData.breakMinutes;
    const endHours = Math.floor(totalMinutes / 60) % 24;
    const endMins = totalMinutes % 60;
    return formatTime(`${String(endHours).padStart(2, '0')}:${String(endMins).padStart(2, '0')}`);
  };

  const calculateWorkHours = () => {
    const [startH, startM] = formData.startTime.split(':').map(Number);
    const [endH, endM] = formData.endTime.split(':').map(Number);
    let totalMinutes = (endH * 60 + endM) - (startH * 60 + startM);
    if (totalMinutes < 0) totalMinutes += 24 * 60;
    totalMinutes -= formData.breakMinutes;
    return (totalMinutes / 60).toFixed(1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('[TemplateFormModal] Submitting form with data:', formData);
    setSaving(true);
    try {
      await onSave(formData, template?._id);
      console.log('[TemplateFormModal] Save successful');
      onClose();
    } catch (err) {
      console.error('[TemplateFormModal] Save error:', err);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />
      
      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div 
          className="sticky top-0 px-6 py-4 border-b flex items-center justify-between bg-white"
          style={{ borderColor: c.border }}
        >
          <h2 className="text-lg font-semibold" style={{ color: c.text }}>
            {template ? 'Edit Shift Template' : 'New Shift Template'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100"
          >
            <X className="w-5 h-5" style={{ color: c.muted }} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: c.text }}>
              Template Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-3 rounded-xl focus:outline-none focus:ring-2"
              style={{ 
                backgroundColor: `${c.muted}08`,
                border: `1px solid ${c.border}`,
                color: c.text
              }}
              placeholder="e.g., Morning Shift"
              required
            />
          </div>

          {/* Time Preview & Selector */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: c.text }}>
              Shift Hours
            </label>
            <div 
              className="p-4 rounded-xl"
              style={{ backgroundColor: `${c.primary}08`, border: `1px solid ${c.primary}20` }}
            >
              <div className="flex items-center justify-between">
                {/* Start Time */}
                <button
                  type="button"
                  onClick={() => setTimePickerOpen('start')}
                  className="flex-1 text-center p-3 rounded-lg hover:bg-white/50 transition-colors"
                >
                  <div className="text-xs uppercase tracking-wide mb-1" style={{ color: c.muted }}>
                    Start
                  </div>
                  <div className="text-2xl font-bold" style={{ color: c.primary }}>
                    {formatTime(formData.startTime)}
                  </div>
                </button>

                <div className="px-4">
                  <div 
                    className="w-8 h-0.5 rounded"
                    style={{ backgroundColor: c.muted }}
                  />
                </div>

                {/* End Time */}
                <button
                  type="button"
                  onClick={() => setTimePickerOpen('end')}
                  className="flex-1 text-center p-3 rounded-lg hover:bg-white/50 transition-colors"
                >
                  <div className="text-xs uppercase tracking-wide mb-1" style={{ color: c.muted }}>
                    End
                  </div>
                  <div className="text-2xl font-bold" style={{ color: c.primary }}>
                    {formatTime(formData.endTime)}
                  </div>
                </button>
              </div>

              {/* Work Hours Display */}
              <div 
                className="mt-3 pt-3 text-center text-sm"
                style={{ borderTop: `1px dashed ${c.border}`, color: c.muted }}
              >
                <Clock className="w-4 h-4 inline mr-1" />
                {calculateWorkHours()} hours (excluding breaks)
              </div>
            </div>
          </div>

          {/* Break Duration */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: c.text }}>
              <Coffee className="w-4 h-4 inline mr-1" />
              Break Duration
            </label>
            <div className="flex gap-2">
              {[0, 30, 60, 90, 120].map(mins => (
                <button
                  key={mins}
                  type="button"
                  onClick={() => setFormData({ ...formData, breakMinutes: mins })}
                  className="flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors"
                  style={{
                    backgroundColor: formData.breakMinutes === mins ? c.primary : `${c.muted}10`,
                    color: formData.breakMinutes === mins ? '#fff' : c.text
                  }}
                >
                  {mins === 0 ? 'None' : `${mins}m`}
                </button>
              ))}
            </div>
          </div>

          {/* Break Time (Optional - only shown if break duration > 0) */}
          {formData.breakMinutes > 0 && (
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: c.text }}>
                <Clock className="w-4 h-4 inline mr-1" />
                Break Time (Optional)
              </label>
              <p className="text-xs mb-2" style={{ color: c.muted }}>
                Specify when the break starts, or leave empty for flexible break time.
              </p>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setTimePickerOpen('breakStart')}
                  className="flex-1 py-2 px-3 rounded-lg text-center"
                  style={{ backgroundColor: `${c.muted}08`, border: `1px solid ${c.border}` }}
                >
                  <div className="text-xs" style={{ color: c.muted }}>Break starts</div>
                  <div className="font-medium" style={{ color: c.text }}>
                    {formData.breakStartTime ? formatTime(formData.breakStartTime) : 'Flexible'}
                  </div>
                </button>
                <span style={{ color: c.muted }}>→</span>
                <div 
                  className="flex-1 py-2 px-3 rounded-lg text-center"
                  style={{ backgroundColor: `${c.muted}05`, border: `1px dashed ${c.border}` }}
                >
                  <div className="text-xs" style={{ color: c.muted }}>Break ends</div>
                  <div className="font-medium" style={{ color: c.muted }}>
                    {formData.breakStartTime ? calculateBreakEnd() : 'Flexible'}
                  </div>
                </div>
              </div>
              {formData.breakStartTime && (
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, breakStartTime: null })}
                  className="mt-2 text-xs underline"
                  style={{ color: c.muted }}
                >
                  Clear specific time (use flexible)
                </button>
              )}
            </div>
          )}

          {/* Color Picker */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: c.text }}>
              Color
            </label>
            <div className="flex flex-wrap gap-2">
              {colorOptions.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setFormData({ ...formData, color })}
                  className="w-8 h-8 rounded-full transition-transform"
                  style={{ 
                    backgroundColor: color,
                    transform: formData.color === color ? 'scale(1.2)' : 'scale(1)',
                    boxShadow: formData.color === color ? `0 0 0 3px ${color}40` : 'none'
                  }}
                />
              ))}
            </div>
          </div>

          {/* Split Shift Toggle */}
          <div>
            <label className="flex items-center gap-3 cursor-pointer">
              <div 
                className="relative w-11 h-6 rounded-full transition-colors"
                style={{ backgroundColor: formData.allowSplitShift ? c.primary : `${c.muted}30` }}
                onClick={() => setFormData({ ...formData, allowSplitShift: !formData.allowSplitShift })}
              >
                <div 
                  className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform"
                  style={{ transform: formData.allowSplitShift ? 'translateX(20px)' : 'translateX(0)' }}
                />
              </div>
              <span className="text-sm font-medium" style={{ color: c.text }}>
                Allow Split Shift
              </span>
            </label>
          </div>

          {/* Split Shift Config */}
          <AnimatePresence>
            {formData.allowSplitShift && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div 
                  className="p-4 rounded-xl space-y-3"
                  style={{ backgroundColor: `${c.muted}08`, border: `1px solid ${c.border}` }}
                >
                  <div className="text-sm font-medium" style={{ color: c.text }}>
                    Split Break Period
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setTimePickerOpen('splitEnd')}
                      className="flex-1 py-2 px-3 rounded-lg text-center"
                      style={{ backgroundColor: '#fff', border: `1px solid ${c.border}` }}
                    >
                      <div className="text-xs" style={{ color: c.muted }}>First shift ends</div>
                      <div className="font-medium" style={{ color: c.text }}>
                        {formatTime(formData.splitShiftConfig.firstShiftEnd)}
                      </div>
                    </button>
                    <span style={{ color: c.muted }}>to</span>
                    <button
                      type="button"
                      onClick={() => setTimePickerOpen('splitStart')}
                      className="flex-1 py-2 px-3 rounded-lg text-center"
                      style={{ backgroundColor: '#fff', border: `1px solid ${c.border}` }}
                    >
                      <div className="text-xs" style={{ color: c.muted }}>Second shift starts</div>
                      <div className="font-medium" style={{ color: c.text }}>
                        {formatTime(formData.splitShiftConfig.secondShiftStart)}
                      </div>
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={saving}
            className="w-full py-3 rounded-xl font-semibold text-white transition-colors flex items-center justify-center gap-2"
            style={{ backgroundColor: saving ? c.muted : c.primary }}
          >
            {saving ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Check className="w-5 h-5" />
                {template ? 'Update Template' : 'Create Template'}
              </>
            )}
          </button>
        </form>
      </motion.div>

      {/* Time Picker Modals */}
      <TimePickerModal
        isOpen={timePickerOpen === 'start'}
        onClose={() => setTimePickerOpen(null)}
        value={formData.startTime}
        onChange={(time) => setFormData({ ...formData, startTime: time })}
        label="Select Start Time"
        colors={c}
      />
      <TimePickerModal
        isOpen={timePickerOpen === 'end'}
        onClose={() => setTimePickerOpen(null)}
        value={formData.endTime}
        onChange={(time) => setFormData({ ...formData, endTime: time })}
        label="Select End Time"
        colors={c}
      />
      <TimePickerModal
        isOpen={timePickerOpen === 'splitEnd'}
        onClose={() => setTimePickerOpen(null)}
        value={formData.splitShiftConfig.firstShiftEnd}
        onChange={(time) => setFormData({ 
          ...formData, 
          splitShiftConfig: { ...formData.splitShiftConfig, firstShiftEnd: time }
        })}
        label="First Shift Ends"
        colors={c}
      />
      <TimePickerModal
        isOpen={timePickerOpen === 'splitStart'}
        onClose={() => setTimePickerOpen(null)}
        value={formData.splitShiftConfig.secondShiftStart}
        onChange={(time) => setFormData({ 
          ...formData, 
          splitShiftConfig: { ...formData.splitShiftConfig, secondShiftStart: time }
        })}
        label="Second Shift Starts"
        colors={c}
      />
      <TimePickerModal
        isOpen={timePickerOpen === 'breakStart'}
        onClose={() => setTimePickerOpen(null)}
        value={formData.breakStartTime || '12:00'}
        onChange={(time) => setFormData({ ...formData, breakStartTime: time })}
        label="Break Starts At"
        colors={c}
      />
    </div>
  );
};

// Main Component
const ShiftTemplateManager = ({ onTemplateSelect, selectedTemplateId, colors = {}, onTemplatesLoaded }) => {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState(true);

  const defaultColors = {
    text: '#1a1a1a',
    muted: '#6b7280',
    border: '#e5e0df',
    background: '#f9fafb',
    primary: '#f1670f',
    accent: '#f1670f',
    danger: '#ef4444'
  };
  const c = { ...defaultColors, ...colors };

  useEffect(() => {
    fetchTemplates();
  }, []);
  
  // Notify parent when templates change
  useEffect(() => {
    if (onTemplatesLoaded) {
      onTemplatesLoaded(templates);
    }
  }, [templates, onTemplatesLoaded]);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      console.log('[ShiftTemplateManager] Fetching templates...');
      const response = await api.get('/api/shift-templates');
      console.log('[ShiftTemplateManager] Full response:', response);
      console.log('[ShiftTemplateManager] response.data:', response.data);
      console.log('[ShiftTemplateManager] response.data.success:', response.data?.success);
      console.log('[ShiftTemplateManager] response.data.data:', response.data?.data);
      
      // Handle both wrapped and unwrapped responses
      const templates = response.data?.data || (Array.isArray(response.data) ? response.data : []);
      setTemplates(templates);
      console.log('[ShiftTemplateManager] Templates loaded:', templates.length);
    } catch (err) {
      setError('Failed to load shift templates');
      console.error('[ShiftTemplateManager] Error fetching templates:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (formData, templateId) => {
    try {
      console.log('[ShiftTemplateManager] Saving template:', { formData, templateId });
      if (templateId) {
        const response = await api.put(`/api/shift-templates/${templateId}`, formData);
        console.log('[ShiftTemplateManager] Update response:', response.data);
        const updatedTemplate = response.data?.data || response.data;
        setTemplates(prev => prev.map(t => 
          t._id === templateId ? updatedTemplate : t
        ));
      } else {
        const response = await api.post('/api/shift-templates', formData);
        console.log('[ShiftTemplateManager] Create response:', response.data);
        const newTemplate = response.data?.data || response.data;
        setTemplates(prev => [...prev, newTemplate]);
      }
    } catch (err) {
      console.error('[ShiftTemplateManager] Save error:', err);
      setError(err.response?.data?.message || 'Failed to save template');
      throw err;
    }
  };

  const handleDelete = async (templateId) => {
    if (!confirm('Are you sure you want to delete this shift template?')) return;
    
    try {
      await api.delete(`/api/shift-templates/${templateId}`);
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
      await api.put(`/api/shift-templates/${templateId}/reactivate`);
      setTemplates(prev => prev.map(t => 
        t._id === templateId ? { ...t, isActive: true } : t
      ));
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reactivate template');
    }
  };

  const formatTime = (time) => {
    if (!time) return '';
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  if (loading) {
    return (
      <div 
        className="rounded-xl p-4 animate-pulse"
        style={{ backgroundColor: '#fff', border: `1px solid ${c.border}` }}
      >
        <div className="h-6 rounded w-32 mb-4" style={{ backgroundColor: `${c.muted}20` }} />
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-14 rounded-lg" style={{ backgroundColor: `${c.muted}10` }} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      <div 
        className="rounded-xl overflow-hidden"
        style={{ backgroundColor: '#fff', border: `1px solid ${c.border}` }}
      >
        {/* Header */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full px-4 py-3 flex items-center justify-between transition-colors"
          style={{ backgroundColor: `${c.muted}05` }}
        >
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5" style={{ color: c.primary }} />
            <span className="font-medium" style={{ color: c.text }}>Shift Templates</span>
            <span 
              className="text-xs px-2 py-0.5 rounded-full"
              style={{ backgroundColor: `${c.primary}15`, color: c.primary }}
            >
              {templates.filter(t => t.isActive).length}
            </span>
          </div>
          {expanded ? (
            <ChevronUp className="w-5 h-5" style={{ color: c.muted }} />
          ) : (
            <ChevronDown className="w-5 h-5" style={{ color: c.muted }} />
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
                  <div 
                    className="flex items-center gap-2 text-sm p-2 rounded-lg"
                    style={{ backgroundColor: `${c.danger}10`, color: c.danger }}
                  >
                    <AlertCircle className="w-4 h-4" />
                    {error}
                    <button onClick={() => setError(null)} className="ml-auto">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {/* Drag hint */}
                <div 
                  className="text-xs text-center py-2 px-3 rounded-lg mb-2"
                  style={{ backgroundColor: `${c.primary}10`, color: c.primary }}
                >
                  💡 Drag templates to calendar cells to assign shifts
                </div>

                {/* Template list - Now draggable */}
                <div className="space-y-2 max-h-72 overflow-y-auto">
                  {templates.filter(t => t.isActive).map((template) => (
                    <DraggableTemplateCard
                      key={template._id}
                      template={template}
                      isSelected={selectedTemplateId === template._id}
                      onSelect={(t) => onTemplateSelect?.(t)}
                      onEdit={(t) => {
                        setEditingTemplate(t);
                        setShowFormModal(true);
                      }}
                      onDelete={handleDelete}
                      colors={c}
                    />
                  ))}
                </div>

                {/* Inactive templates */}
                {templates.filter(t => !t.isActive).length > 0 && (
                  <div className="pt-2" style={{ borderTop: `1px solid ${c.border}` }}>
                    <p className="text-xs mb-2" style={{ color: c.muted }}>Inactive Templates</p>
                    {templates.filter(t => !t.isActive).map((template) => (
                      <div
                        key={template._id}
                        className="flex items-center gap-2 p-2 text-sm opacity-60"
                      >
                        <div
                          className="w-2 h-6 rounded-full"
                          style={{ backgroundColor: template.color }}
                        />
                        <span className="flex-1" style={{ color: c.muted }}>{template.name}</span>
                        <button
                          onClick={() => handleReactivate(template._id)}
                          className="p-1.5 rounded hover:bg-green-50"
                          style={{ color: '#10b981' }}
                          title="Reactivate"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add button */}
                <button
                  onClick={() => {
                    setEditingTemplate(null);
                    setShowFormModal(true);
                  }}
                  className="w-full py-3 border-2 border-dashed rounded-xl transition-colors flex items-center justify-center gap-2 font-medium"
                  style={{ borderColor: c.border, color: c.muted }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = c.primary;
                    e.currentTarget.style.color = c.primary;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = c.border;
                    e.currentTarget.style.color = c.muted;
                  }}
                >
                  <Plus className="w-5 h-5" />
                  Add Shift Template
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Form Modal */}
      <AnimatePresence>
        {showFormModal && (
          <TemplateFormModal
            isOpen={showFormModal}
            onClose={() => {
              setShowFormModal(false);
              setEditingTemplate(null);
            }}
            template={editingTemplate}
            onSave={handleSave}
            colors={c}
          />
        )}
      </AnimatePresence>
    </>
  );
};

export default ShiftTemplateManager;
