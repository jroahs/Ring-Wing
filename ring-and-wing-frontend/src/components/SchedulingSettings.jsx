import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { theme } from '../theme';
import { FiSave, FiClock, FiInfo, FiCalendar, FiAlertCircle } from 'react-icons/fi';
import { API_URL } from '../App';

const SchedulingSettings = () => {
  const [settings, setSettings] = useState({
    enabled: true,
    gracePeriodMinutes: 15,
    roundingRule: 'none',
    maxOvertimeHoursDaily: 4,
    requireScheduleForPayroll: false,
    allowSplitShifts: true,
    defaultRestDays: [0] // Sunday
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const daysOfWeek = [
    { value: 0, label: 'Sunday' },
    { value: 1, label: 'Monday' },
    { value: 2, label: 'Tuesday' },
    { value: 3, label: 'Wednesday' },
    { value: 4, label: 'Thursday' },
    { value: 5, label: 'Friday' },
    { value: 6, label: 'Saturday' }
  ];

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_URL}/api/settings/scheduling`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch scheduling settings');
      }
      
      const data = await response.json();
      
      if (data.success) {
        setSettings(data.data);
      }
    } catch (err) {
      setError(err.message);
      toast.error('Failed to load scheduling settings');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleRestDayToggle = (day) => {
    setSettings(prev => {
      const currentDays = prev.defaultRestDays || [];
      if (currentDays.includes(day)) {
        return {
          ...prev,
          defaultRestDays: currentDays.filter(d => d !== day)
        };
      } else {
        return {
          ...prev,
          defaultRestDays: [...currentDays, day].sort()
        };
      }
    });
  };

  const handleSaveSettings = async () => {
    try {
      setSaving(true);
      setError(null);

      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_URL}/api/settings/scheduling`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(settings)
      });

      if (!response.ok) {
        throw new Error('Failed to save scheduling settings');
      }

      const data = await response.json();
      
      if (data.success) {
        toast.success('Scheduling settings saved successfully!');
        setSettings(data.data);
      }
    } catch (err) {
      console.error('Save settings error:', err);
      toast.error(`Failed to save settings: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg" style={{ color: theme.colors.muted }}>Loading settings...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Error Messages */}
      {error && (
        <div className="p-4 rounded-lg bg-red-50 border border-red-200 flex items-center gap-2">
          <FiAlertCircle className="text-red-500" />
          <span className="text-red-800">{error}</span>
        </div>
      )}

      {/* Grace Period Settings */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold mb-6 flex items-center gap-2" style={{ color: theme.colors.primary }}>
          <FiClock className="text-xl" />
          Time & Attendance Rules
        </h2>

        {/* Grace Period */}
        <div className="mb-6">
          <label className="block font-medium mb-2" style={{ color: theme.colors.primary }}>
            Grace Period (Minutes)
          </label>
          <p className="text-sm mb-3" style={{ color: theme.colors.muted }}>
            Staff can clock in late up to this many minutes without being marked as late.
          </p>
          <div className="flex items-center gap-4">
            <input
              type="range"
              min="0"
              max="60"
              step="5"
              value={settings.gracePeriodMinutes}
              onChange={(e) => handleChange('gracePeriodMinutes', parseInt(e.target.value))}
              className="flex-1 h-2 rounded-lg appearance-none cursor-pointer"
              style={{ 
                background: `linear-gradient(to right, ${theme.colors.accent} 0%, ${theme.colors.accent} ${(settings.gracePeriodMinutes / 60) * 100}%, #e5e7eb ${(settings.gracePeriodMinutes / 60) * 100}%, #e5e7eb 100%)`
              }}
            />
            <div 
              className="w-16 py-2 text-center rounded-lg font-bold"
              style={{ backgroundColor: `${theme.colors.accent}15`, color: theme.colors.accent }}
            >
              {settings.gracePeriodMinutes}m
            </div>
          </div>
          <div className="flex justify-between text-xs mt-1" style={{ color: theme.colors.muted }}>
            <span>0 min (strict)</span>
            <span>60 min (lenient)</span>
          </div>
        </div>

        {/* Time Rounding */}
        <div className="mb-6">
          <label className="block font-medium mb-2" style={{ color: theme.colors.primary }}>
            Time Rounding Rule
          </label>
          <p className="text-sm mb-3" style={{ color: theme.colors.muted }}>
            Round clock in/out times for payroll calculations.
          </p>
          <div className="grid grid-cols-4 gap-2">
            {[
              { value: 'none', label: 'None' },
              { value: '5min', label: '5 min' },
              { value: '15min', label: '15 min' },
              { value: '30min', label: '30 min' }
            ].map(option => (
              <button
                key={option.value}
                type="button"
                onClick={() => handleChange('roundingRule', option.value)}
                className="py-2 px-4 rounded-lg text-sm font-medium transition-colors"
                style={{
                  backgroundColor: settings.roundingRule === option.value ? theme.colors.accent : `${theme.colors.muted}10`,
                  color: settings.roundingRule === option.value ? '#fff' : theme.colors.primary
                }}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Max Overtime */}
        <div className="mb-6">
          <label className="block font-medium mb-2" style={{ color: theme.colors.primary }}>
            Maximum Overtime Hours (Daily)
          </label>
          <p className="text-sm mb-3" style={{ color: theme.colors.muted }}>
            Cap overtime hours per day for calculations.
          </p>
          <div className="flex items-center gap-4">
            <input
              type="range"
              min="0"
              max="8"
              step="1"
              value={settings.maxOvertimeHoursDaily}
              onChange={(e) => handleChange('maxOvertimeHoursDaily', parseInt(e.target.value))}
              className="flex-1 h-2 rounded-lg appearance-none cursor-pointer"
              style={{ 
                background: `linear-gradient(to right, ${theme.colors.accent} 0%, ${theme.colors.accent} ${(settings.maxOvertimeHoursDaily / 8) * 100}%, #e5e7eb ${(settings.maxOvertimeHoursDaily / 8) * 100}%, #e5e7eb 100%)`
              }}
            />
            <div 
              className="w-16 py-2 text-center rounded-lg font-bold"
              style={{ backgroundColor: `${theme.colors.accent}15`, color: theme.colors.accent }}
            >
              {settings.maxOvertimeHoursDaily}h
            </div>
          </div>
        </div>
      </div>

      {/* Schedule Rules */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold mb-6 flex items-center gap-2" style={{ color: theme.colors.primary }}>
          <FiCalendar className="text-xl" />
          Schedule Configuration
        </h2>

        {/* Default Rest Days */}
        <div className="mb-6">
          <label className="block font-medium mb-2" style={{ color: theme.colors.primary }}>
            Default Rest Days
          </label>
          <p className="text-sm mb-3" style={{ color: theme.colors.muted }}>
            These days are marked as rest days by default when creating schedules.
          </p>
          <div className="flex flex-wrap gap-2">
            {daysOfWeek.map(day => (
              <button
                key={day.value}
                type="button"
                onClick={() => handleRestDayToggle(day.value)}
                className="py-2 px-4 rounded-lg text-sm font-medium transition-colors"
                style={{
                  backgroundColor: (settings.defaultRestDays || []).includes(day.value) 
                    ? theme.colors.accent 
                    : `${theme.colors.muted}10`,
                  color: (settings.defaultRestDays || []).includes(day.value) 
                    ? '#fff' 
                    : theme.colors.primary
                }}
              >
                {day.label}
              </button>
            ))}
          </div>
        </div>

        {/* Toggle Options */}
        <div className="space-y-4">
          {/* Allow Split Shifts */}
          <label className="flex items-center justify-between p-4 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
            <div>
              <p className="font-medium" style={{ color: theme.colors.primary }}>Allow Split Shifts</p>
              <p className="text-sm" style={{ color: theme.colors.muted }}>
                Enable split shifts (e.g., 8AM-12PM, 2PM-6PM)
              </p>
            </div>
            <div 
              className="relative w-12 h-6 rounded-full transition-colors cursor-pointer"
              style={{ backgroundColor: settings.allowSplitShifts ? theme.colors.accent : `${theme.colors.muted}30` }}
              onClick={() => handleChange('allowSplitShifts', !settings.allowSplitShifts)}
            >
              <div 
                className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform"
                style={{ transform: settings.allowSplitShifts ? 'translateX(24px)' : 'translateX(0)' }}
              />
            </div>
          </label>

          {/* Require Schedule for Payroll */}
          <label className="flex items-center justify-between p-4 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
            <div>
              <p className="font-medium" style={{ color: theme.colors.primary }}>Require Schedule for Payroll</p>
              <p className="text-sm" style={{ color: theme.colors.muted }}>
                Staff must have a schedule to process payroll
              </p>
            </div>
            <div 
              className="relative w-12 h-6 rounded-full transition-colors cursor-pointer"
              style={{ backgroundColor: settings.requireScheduleForPayroll ? theme.colors.accent : `${theme.colors.muted}30` }}
              onClick={() => handleChange('requireScheduleForPayroll', !settings.requireScheduleForPayroll)}
            >
              <div 
                className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform"
                style={{ transform: settings.requireScheduleForPayroll ? 'translateX(24px)' : 'translateX(0)' }}
              />
            </div>
          </label>
        </div>
      </div>

      {/* Info Box */}
      <div 
        className="flex items-start gap-3 p-4 rounded-lg"
        style={{ backgroundColor: `${theme.colors.accent}10`, border: `1px solid ${theme.colors.accent}30` }}
      >
        <FiInfo className="text-lg mt-0.5" style={{ color: theme.colors.accent }} />
        <div>
          <p className="font-medium text-sm" style={{ color: theme.colors.accent }}>
            These settings apply globally
          </p>
          <p className="text-sm mt-1" style={{ color: theme.colors.muted }}>
            Changes will affect how late arrivals are calculated in the Attendance Comparison view 
            and how payroll deductions are computed.
          </p>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSaveSettings}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-3 rounded-lg text-white font-medium transition-colors disabled:opacity-50"
          style={{ backgroundColor: theme.colors.accent }}
        >
          <FiSave />
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
};

export default SchedulingSettings;
