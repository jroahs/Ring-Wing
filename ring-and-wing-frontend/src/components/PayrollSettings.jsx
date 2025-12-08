import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { theme } from '../theme';
import { 
  FiSave, 
  FiDollarSign, 
  FiShield, 
  FiInfo, 
  FiAlertTriangle,
  FiCheck,
  FiClock
} from 'react-icons/fi';
import { API_URL } from '../App';

/*
 * PAYROLL SETTINGS USAGE AUDIT:
 * 
 * ✅ USED SETTINGS:
 * - regularHoursPerDay: Used in payroll calculations (backend: payrollRoutes.js line 750)
 * - multipliers.*: All multipliers used in payroll calculations (backend: getPayrollMultipliers)
 * - deductions.lateDeductionPerMinute: NOW USED in late deduction calculations (backend: payrollRoutes.js, frontend: PayrollSystem.jsx)
 * - deductions.absentDeductionType: NOW USED in absence deduction calculations
 * - deductions.sssEnabled/philhealthEnabled/pagibigEnabled/taxEnabled: Used in government deductions
 * 
 * ⚠️ PARTIALLY USED:
 * - workDaysPerWeek: Only used in PayrollSchedule creation, not in actual payroll calculations
 * - defaultPayoutType/defaultPayoutDays/defaultCutoffDays: Only used as defaults for new schedules
 * 
 * 📝 NOTES:
 * - All settings are persisted in Settings model and accessible globally
 * - Multipliers are validated against DOLE minimums before saving
 * - Late deduction: 0 = uses hourly rate method, >0 = uses fixed penalty rate
 */

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

const PayrollSettings = () => {
  const [settings, setSettings] = useState({
    regularHoursPerDay: 8,
    workDaysPerWeek: 6,
    multipliers: {
      overtime: 1.25,
      regularHoliday: 2.0,
      specialHoliday: 1.30,
      overtimeOnHoliday: 2.60,
      overtimeOnSpecialHoliday: 1.69,
      restDay: 1.30,
      restDayOvertime: 1.69,
      nightDifferential: 1.10
    },
    deductions: {
      sssEnabled: true,
      philhealthEnabled: true,
      pagibigEnabled: true,
      taxEnabled: true,
      lateDeductionPerMinute: 0,
      absentDeductionType: 'daily_rate'
    },
    defaultPayoutType: 'semi-monthly',
    defaultPayoutDays: [15, 30],
    defaultCutoffDays: [14, 29]
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_URL}/api/settings/payroll`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch payroll settings');
      }
      
      const data = await response.json();
      
      if (data.success) {
        setSettings(prev => ({
          ...prev,
          ...data.data,
          multipliers: { ...prev.multipliers, ...data.data?.multipliers },
          deductions: { ...prev.deductions, ...data.data?.deductions }
        }));
      }
    } catch (err) {
      setError(err.message);
      toast.error('Failed to load payroll settings');
    } finally {
      setLoading(false);
    }
  };

  const handleMultiplierChange = (key, value) => {
    setSettings(prev => ({
      ...prev,
      multipliers: {
        ...prev.multipliers,
        [key]: parseFloat(value) || 0
      }
    }));
  };

  const handleDeductionChange = (key, value) => {
    setSettings(prev => ({
      ...prev,
      deductions: {
        ...prev.deductions,
        [key]: value
      }
    }));
  };

  const handlePayoutTypeChange = (type) => {
    let payoutDays = [];
    let cutoffDays = [];

    switch (type) {
      case 'monthly':
        payoutDays = [30];
        cutoffDays = [29];
        break;
      case 'semi-monthly':
        payoutDays = [15, 30];
        cutoffDays = [14, 29];
        break;
      case 'weekly':
        // For weekly, use day of week (0=Sunday, 6=Saturday)
        payoutDays = [5]; // Friday
        cutoffDays = [4]; // Thursday
        break;
      case 'bi-weekly':
        payoutDays = [15, 30];
        cutoffDays = [14, 29];
        break;
      default:
        payoutDays = [15, 30];
        cutoffDays = [14, 29];
    }

    setSettings(prev => ({
      ...prev,
      defaultPayoutType: type,
      defaultPayoutDays: payoutDays,
      defaultCutoffDays: cutoffDays
    }));
  };

  const handlePayoutDaysChange = (value) => {
    // Remove all non-digit and non-comma characters
    const cleanValue = value.replace(/[^\d,]/g, '');
    
    // Split by comma and parse numbers
    const days = cleanValue.split(',')
      .map(d => parseInt(d.trim()))
      .filter(d => !isNaN(d) && d >= 1 && d <= 31);
    
    // Enforce limits based on payout type
    let maxDays = 2;
    if (settings.defaultPayoutType === 'monthly' || settings.defaultPayoutType === 'weekly') {
      maxDays = 1;
    } else if (settings.defaultPayoutType === 'semi-monthly' || settings.defaultPayoutType === 'bi-weekly') {
      maxDays = 2;
    }
    
    // Limit to max allowed days
    const limitedDays = days.slice(0, maxDays);
    setSettings(prev => ({ ...prev, defaultPayoutDays: limitedDays }));
  };

  const handleCutoffDaysChange = (value) => {
    // Remove all non-digit and non-comma characters
    const cleanValue = value.replace(/[^\d,]/g, '');
    
    // Split by comma and parse numbers
    const days = cleanValue.split(',')
      .map(d => parseInt(d.trim()))
      .filter(d => !isNaN(d) && d >= 1 && d <= 31);
    
    // Enforce limits based on payout type
    let maxDays = 2;
    if (settings.defaultPayoutType === 'monthly' || settings.defaultPayoutType === 'weekly') {
      maxDays = 1;
    } else if (settings.defaultPayoutType === 'semi-monthly' || settings.defaultPayoutType === 'bi-weekly') {
      maxDays = 2;
    }
    
    // Limit to max allowed days
    const limitedDays = days.slice(0, maxDays);
    setSettings(prev => ({ ...prev, defaultCutoffDays: limitedDays }));
  };

  const validateMultipliers = () => {
    const errors = [];
    for (const [key, min] of Object.entries(DOLE_MINIMUMS)) {
      if (settings.multipliers[key] < min) {
        errors.push({ key, value: settings.multipliers[key], min });
      }
    }
    return errors;
  };

  const handleSaveSettings = async () => {
    // Validate before saving
    const validationErrors = validateMultipliers();
    if (validationErrors.length > 0) {
      toast.error(
        <div>
          <p className="font-medium">DOLE Compliance Error:</p>
          <ul className="text-sm mt-1">
            {validationErrors.map(({ key, min }) => (
              <li key={key}>• {key.replace(/([A-Z])/g, ' $1').trim()} must be ≥{min}×</li>
            ))}
          </ul>
        </div>
      );
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_URL}/api/settings/payroll`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(settings)
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.errors) {
          toast.error(
            <div>
              <p className="font-medium">Validation Error:</p>
              <ul className="text-sm mt-1">
                {data.errors.map((err, i) => <li key={i}>• {err.message}</li>)}
              </ul>
            </div>
          );
        } else {
          throw new Error(data.message || 'Failed to save settings');
        }
        return;
      }

      toast.success('Payroll settings saved successfully');
    } catch (err) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  // Multiplier input component
  const MultiplierInput = ({ label, fieldKey, description }) => {
    const value = settings.multipliers[fieldKey] || 0;
    const min = DOLE_MINIMUMS[fieldKey];
    const isBelow = value < min;
    
    return (
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1">
          <label className="text-sm font-medium flex items-center gap-2" style={{ color: theme.colors.primary }}>
            {label}
            <span 
              className="text-xs px-1.5 py-0.5 rounded"
              style={{ 
                backgroundColor: isBelow ? '#FEE2E2' : theme.colors.accent + '20',
                color: isBelow ? '#DC2626' : theme.colors.accent
              }}
            >
              Min: {min}×
            </span>
          </label>
        </div>
        <div className="relative">
          <input
            type="number"
            value={value ?? ''}
            onChange={(e) => {
              const val = e.target.value === '' ? '' : e.target.value;
              handleMultiplierChange(fieldKey, val);
            }}
            onFocus={(e) => {
              if (parseFloat(e.target.value) === 0) e.target.select();
            }}
            className="w-full p-2.5 pr-10 border rounded-lg transition-colors"
            style={{
              borderColor: isBelow ? '#DC2626' : theme.colors.muted,
              backgroundColor: isBelow ? '#FEF2F2' : 'white'
            }}
            min={min}
            step="0.01"
            placeholder={min.toString()}
          />
          <span 
            className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium"
            style={{ color: theme.colors.muted }}
          >
            ×
          </span>
        </div>
        {description && (
          <p className="text-xs mt-1" style={{ color: theme.colors.muted }}>{description}</p>
        )}
        {isBelow && (
          <p className="text-xs mt-1 text-red-600 flex items-center gap-1">
            <FiAlertTriangle size={12} />
            Below DOLE minimum ({min}×)
          </p>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: theme.colors.accent }}></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-lg" style={{ backgroundColor: theme.colors.accent + '20' }}>
            <FiDollarSign size={24} style={{ color: theme.colors.accent }} />
          </div>
          <div>
            <h2 className="text-xl font-bold" style={{ color: theme.colors.primary }}>
              Payroll Settings
            </h2>
            <p className="text-sm" style={{ color: theme.colors.muted }}>
              Configure DOLE-compliant pay multipliers and deductions
            </p>
          </div>
        </div>
      </div>

      {/* DOLE Compliance Banner */}
      <div 
        className="mb-6 p-4 rounded-lg flex items-start gap-3"
        style={{ backgroundColor: theme.colors.secondary + '10', border: `1px solid ${theme.colors.secondary}30` }}
      >
        <FiShield size={24} style={{ color: theme.colors.secondary, flexShrink: 0 }} />
        <div>
          <p className="font-medium" style={{ color: theme.colors.primary }}>
            DOLE Compliance Enforced
          </p>
          <p className="text-sm mt-1" style={{ color: theme.colors.muted }}>
            All pay multipliers are validated against Philippine Labor Code (DOLE) minimums. 
            Values below legal thresholds will be automatically rejected. These settings apply globally to all payroll calculations.
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      <div className="space-y-8">
        {/* Work Hours Section */}
        <div className="p-5 rounded-lg border" style={{ borderColor: theme.colors.muted + '40' }}>
          <h3 className="font-semibold mb-4 flex items-center gap-2" style={{ color: theme.colors.primary }}>
            <FiClock size={18} />
            Standard Work Hours
          </h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: theme.colors.primary }}>
                Regular Hours/Day
              </label>
              <input
                type="number"
                value={settings.regularHoursPerDay ?? ''}
                onChange={(e) => {
                  const val = e.target.value === '' ? '' : parseInt(e.target.value);
                  setSettings(prev => ({ ...prev, regularHoursPerDay: val === '' ? 8 : val }));
                }}
                onFocus={(e) => {
                  if (e.target.value === '0' || e.target.value === '8') e.target.select();
                }}
                className="w-full p-2.5 border rounded-lg"
                style={{ borderColor: theme.colors.muted }}
                min="1"
                max="12"
                placeholder="8"
              />
              <p className="text-xs mt-1" style={{ color: theme.colors.muted }}>
                Standard 8 hours per DOLE
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: theme.colors.primary }}>
                Work Days/Week
              </label>
              <input
                type="number"
                value={settings.workDaysPerWeek ?? ''}
                onChange={(e) => {
                  const val = e.target.value === '' ? '' : parseInt(e.target.value);
                  setSettings(prev => ({ ...prev, workDaysPerWeek: val === '' ? 6 : val }));
                }}
                onFocus={(e) => {
                  if (e.target.value === '0' || e.target.value === '6') e.target.select();
                }}
                className="w-full p-2.5 border rounded-lg"
                style={{ borderColor: theme.colors.muted }}
                min="1"
                max="7"
                placeholder="6"
              />
            </div>
          </div>
        </div>

        {/* Pay Multipliers Section */}
        <div className="p-5 rounded-lg border" style={{ borderColor: theme.colors.muted + '40' }}>
          <h3 className="font-semibold mb-2 flex items-center gap-2" style={{ color: theme.colors.primary }}>
            <FiShield size={18} style={{ color: theme.colors.accent }} />
            DOLE-Compliant Pay Multipliers
          </h3>
          
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

          <div className="grid grid-cols-2 gap-x-6">
            <MultiplierInput
              label="Overtime (Regular Day)"
              fieldKey="overtime"
              description="Work beyond 8 hours on regular days"
            />
            <MultiplierInput
              label="Regular Holiday"
              fieldKey="regularHoliday"
              description="Work on regular holidays (e.g., Christmas)"
            />
            <MultiplierInput
              label="Special Holiday"
              fieldKey="specialHoliday"
              description="Work on special non-working days"
            />
            <MultiplierInput
              label="OT on Regular Holiday"
              fieldKey="overtimeOnHoliday"
              description="Overtime during regular holidays"
            />
            <MultiplierInput
              label="OT on Special Holiday"
              fieldKey="overtimeOnSpecialHoliday"
              description="Overtime during special holidays"
            />
            <MultiplierInput
              label="Rest Day"
              fieldKey="restDay"
              description="Work on scheduled rest day"
            />
            <MultiplierInput
              label="Rest Day Overtime"
              fieldKey="restDayOvertime"
              description="Overtime on rest day"
            />
            <MultiplierInput
              label="Night Differential"
              fieldKey="nightDifferential"
              description="10PM - 6AM shift (+10%)"
            />
          </div>
        </div>

        {/* Deduction Settings Section */}
        <div className="p-5 rounded-lg border" style={{ borderColor: theme.colors.muted + '40' }}>
          <h3 className="font-semibold mb-4 flex items-center gap-2" style={{ color: theme.colors.primary }}>
            <FiDollarSign size={18} />
            Deduction Settings
          </h3>
          
          <p className="text-sm mb-4" style={{ color: theme.colors.muted }}>
            Configure which mandatory and optional deductions apply globally.
          </p>

          <div className="grid grid-cols-2 gap-4 mb-4">
            {[
              { key: 'sssEnabled', label: 'SSS Contribution' },
              { key: 'philhealthEnabled', label: 'PhilHealth' },
              { key: 'pagibigEnabled', label: 'Pag-IBIG Fund' },
              { key: 'taxEnabled', label: 'Withholding Tax' }
            ].map(({ key, label }) => (
              <label 
                key={key} 
                className="flex items-center gap-3 p-3 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors border" 
                style={{ borderColor: theme.colors.muted + '40' }}
              >
                <input
                  type="checkbox"
                  checked={settings.deductions?.[key] ?? true}
                  onChange={(e) => handleDeductionChange(key, e.target.checked)}
                  className="w-4 h-4 rounded"
                  style={{ accentColor: theme.colors.accent }}
                />
                <span className="text-sm font-medium" style={{ color: theme.colors.primary }}>{label}</span>
              </label>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: theme.colors.primary }}>
                Late Deduction (₱/min)
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={settings.deductions?.lateDeductionPerMinute === 0 ? '' : settings.deductions?.lateDeductionPerMinute ?? ''}
                onChange={(e) => {
                  const value = e.target.value.trim();
                  if (value === '' || value === '.') {
                    handleDeductionChange('lateDeductionPerMinute', 0);
                  } else {
                    const parsed = parseFloat(value);
                    if (!isNaN(parsed) && parsed >= 0) {
                      handleDeductionChange('lateDeductionPerMinute', parsed);
                    }
                  }
                }}
                className="w-full p-2.5 border rounded-lg"
                style={{ 
                  borderColor: (settings.deductions?.lateDeductionPerMinute > 10) 
                    ? theme.colors.accent 
                    : theme.colors.muted 
                }}
                placeholder="0"
              />
              <p className="text-xs mt-1" style={{ 
                color: (settings.deductions?.lateDeductionPerMinute > 10) 
                  ? theme.colors.accent 
                  : theme.colors.muted 
              }}>
                {settings.deductions?.lateDeductionPerMinute > 10 ? (
                  <>⚠️ High rate: ₱{settings.deductions.lateDeductionPerMinute}/min = ₱{(settings.deductions.lateDeductionPerMinute * 60).toFixed(0)}/hour</>
                ) : (
                  <>0 = uses hourly rate method (actual pay lost)</>
                )}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: theme.colors.primary }}>
                Absence Deduction Type
              </label>
              <select
                value={settings.deductions?.absentDeductionType || 'daily_rate'}
                onChange={(e) => handleDeductionChange('absentDeductionType', e.target.value)}
                className="w-full p-2.5 border rounded-lg"
                style={{ borderColor: theme.colors.muted }}
              >
                <option value="daily_rate">Full Daily Rate</option>
                <option value="hourly">Hourly (pro-rated)</option>
                <option value="none">No Deduction</option>
              </select>
            </div>
          </div>
        </div>

        {/* Default Payout Schedule Section */}
        <div className="p-5 rounded-lg border" style={{ borderColor: theme.colors.muted + '40' }}>
          <h3 className="font-semibold mb-4 flex items-center gap-2" style={{ color: theme.colors.primary }}>
            <FiClock size={18} />
            Default Payout Schedule
          </h3>
          
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: theme.colors.primary }}>
                Payout Type
              </label>
              <select
                value={settings.defaultPayoutType}
                onChange={(e) => handlePayoutTypeChange(e.target.value)}
                className="w-full p-2.5 border rounded-lg"
                style={{ borderColor: theme.colors.muted }}
              >
                <option value="monthly">Monthly</option>
                <option value="semi-monthly">Semi-Monthly</option>
                <option value="weekly">Weekly</option>
                <option value="bi-weekly">Bi-Weekly</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: theme.colors.primary }}>
                Payout Days
              </label>
              <input
                type="text"
                value={settings.defaultPayoutDays?.join(', ') || ''}
                onChange={(e) => handlePayoutDaysChange(e.target.value)}
                className="w-full p-2.5 border rounded-lg"
                style={{ borderColor: theme.colors.muted }}
                placeholder={
                  settings.defaultPayoutType === 'monthly' ? 'e.g., 30' :
                  settings.defaultPayoutType === 'semi-monthly' ? 'e.g., 15, 30' :
                  settings.defaultPayoutType === 'weekly' ? 'e.g., 5 (Friday)' :
                  'e.g., 15, 30'
                }
              />
              <p className="text-xs mt-1" style={{ color: theme.colors.muted }}>
                {settings.defaultPayoutType === 'monthly' && 'One day per month (1-31)'}
                {settings.defaultPayoutType === 'semi-monthly' && 'Two days per month (1-31)'}
                {settings.defaultPayoutType === 'weekly' && 'Day of week (0=Sun, 6=Sat)'}
                {settings.defaultPayoutType === 'bi-weekly' && 'Two days per month (1-31)'}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: theme.colors.primary }}>
                Cutoff Days
              </label>
              <input
                type="text"
                value={settings.defaultCutoffDays?.join(', ') || ''}
                onChange={(e) => handleCutoffDaysChange(e.target.value)}
                className="w-full p-2.5 border rounded-lg"
                style={{ borderColor: theme.colors.muted }}
                placeholder={
                  settings.defaultPayoutType === 'monthly' ? 'e.g., 29' :
                  settings.defaultPayoutType === 'semi-monthly' ? 'e.g., 14, 29' :
                  settings.defaultPayoutType === 'weekly' ? 'e.g., 4 (Thursday)' :
                  'e.g., 14, 29'
                }
              />
              <p className="text-xs mt-1" style={{ color: theme.colors.muted }}>
                {settings.defaultPayoutType === 'monthly' && 'One day per month (1-31)'}
                {settings.defaultPayoutType === 'semi-monthly' && 'Two days per month (1-31)'}
                {settings.defaultPayoutType === 'weekly' && 'Day of week (0=Sun, 6=Sat)'}
                {settings.defaultPayoutType === 'bi-weekly' && 'Two days per month (1-31)'}
              </p>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end pt-4">
          <button
            onClick={handleSaveSettings}
            disabled={saving}
            className="px-6 py-3 rounded-lg font-medium text-white transition-all hover:shadow-lg flex items-center gap-2"
            style={{ 
              backgroundColor: saving ? theme.colors.muted : theme.colors.accent,
              cursor: saving ? 'not-allowed' : 'pointer'
            }}
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                Saving...
              </>
            ) : (
              <>
                <FiSave size={18} />
                Save Payroll Settings
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PayrollSettings;
