import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { theme } from '../theme';
import { FiSave, FiClock, FiCreditCard, FiKey, FiToggleLeft, FiToggleRight, FiInfo } from 'react-icons/fi';
import { API_URL } from '../App';

const AttendanceSettings = () => {
  const [settings, setSettings] = useState({
    mode: 'PIN',
    nfcSettings: {
      requirePhoto: false,
      testMode: true
    },
    pinSettings: {
      requirePhoto: true
    }
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Fetch current settings
  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_URL}/api/settings/attendance`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch attendance settings');
      }
      
      const data = await response.json();
      
      if (data.success) {
        setSettings(data.data);
      }
    } catch (err) {
      setError(err.message);
      toast.error('Failed to load attendance settings');
    } finally {
      setLoading(false);
    }
  };

  const handleModeChange = (mode) => {
    setSettings(prev => ({
      ...prev,
      mode
    }));
  };

  const handleNfcSettingChange = (field, value) => {
    setSettings(prev => ({
      ...prev,
      nfcSettings: {
        ...prev.nfcSettings,
        [field]: value
      }
    }));
  };

  const handlePinSettingChange = (field, value) => {
    setSettings(prev => ({
      ...prev,
      pinSettings: {
        ...prev.pinSettings,
        [field]: value
      }
    }));
  };

  const handleSaveSettings = async () => {
    try {
      setSaving(true);
      setError(null);

      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_URL}/api/settings/attendance`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(settings)
      });

      if (!response.ok) {
        throw new Error('Failed to save attendance settings');
      }

      const data = await response.json();
      
      if (data.success) {
        toast.success('Attendance settings saved successfully!');
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
          <span className="text-red-800">{error}</span>
        </div>
      )}

      {/* Attendance Mode Selection */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold mb-6 flex items-center gap-2" style={{ color: theme.colors.primary }}>
          <FiClock className="text-xl" />
          Attendance Logging Mode
        </h2>
        
        <div className="space-y-4">
          <p className="text-sm" style={{ color: theme.colors.muted }}>
            Select the method staff will use to clock in and out of their shifts.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* PIN Mode Card */}
            <div 
              onClick={() => handleModeChange('PIN')}
              className={`p-6 rounded-lg border-2 cursor-pointer transition-all ${
                settings.mode === 'PIN' 
                  ? 'border-orange-500 bg-orange-50' 
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-3 mb-3">
                <div 
                  className={`p-3 rounded-full ${
                    settings.mode === 'PIN' ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  <FiKey className="text-xl" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold" style={{ color: theme.colors.primary }}>
                    PIN Mode
                  </h3>
                  <p className="text-sm" style={{ color: theme.colors.muted }}>
                    Traditional PIN-based authentication
                  </p>
                </div>
              </div>
              
              <ul className="space-y-2 text-sm" style={{ color: theme.colors.secondary }}>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span>
                  Enter 4-6 digit PIN code
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span>
                  Photo capture for verification
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span>
                  Confirm time in/out
                </li>
              </ul>
              
              {settings.mode === 'PIN' && (
                <div className="mt-4 pt-3 border-t border-orange-200">
                  <span className="text-orange-600 font-medium text-sm">✓ Currently Active</span>
                </div>
              )}
            </div>
            
            {/* NFC Mode Card */}
            <div 
              onClick={() => handleModeChange('NFC')}
              className={`p-6 rounded-lg border-2 cursor-pointer transition-all ${
                settings.mode === 'NFC' 
                  ? 'border-orange-500 bg-orange-50' 
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-3 mb-3">
                <div 
                  className={`p-3 rounded-full ${
                    settings.mode === 'NFC' ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  <FiCreditCard className="text-xl" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold" style={{ color: theme.colors.primary }}>
                    NFC Mode
                  </h3>
                  <p className="text-sm" style={{ color: theme.colors.muted }}>
                    Contactless card tap authentication
                  </p>
                </div>
              </div>
              
              <ul className="space-y-2 text-sm" style={{ color: theme.colors.secondary }}>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span>
                  Tap registered NFC card
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span>
                  Instant time in/out
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span>
                  No PIN or photo required
                </li>
              </ul>
              
              {settings.mode === 'NFC' && (
                <div className="mt-4 pt-3 border-t border-orange-200">
                  <span className="text-orange-600 font-medium text-sm">✓ Currently Active</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* NFC Mode Settings */}
      {settings.mode === 'NFC' && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-6" style={{ color: theme.colors.primary }}>
            NFC Mode Settings
          </h2>
          
          <div className="space-y-4">
            {/* Test Mode Toggle */}
            <div className="flex items-center justify-between p-4 bg-amber-50 rounded-lg border border-amber-200">
              <div className="flex items-start gap-3">
                <FiInfo className="text-amber-600 mt-0.5" />
                <div>
                  <h3 className="font-semibold" style={{ color: theme.colors.primary }}>
                    Test Mode (Simulation)
                  </h3>
                  <p className="text-sm text-amber-700 mt-1">
                    Enable test buttons to simulate NFC card taps while hardware is not available.
                    These buttons will appear on the Time Clock page for testing purposes.
                  </p>
                </div>
              </div>
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.nfcSettings.testMode}
                  onChange={(e) => handleNfcSettingChange('testMode', e.target.checked)}
                  className="sr-only"
                />
                <div className={`w-14 h-8 rounded-full transition-colors ${
                  settings.nfcSettings.testMode ? 'bg-green-500' : 'bg-gray-300'
                }`}>
                  <div className={`w-6 h-6 bg-white rounded-full shadow-md transform transition-transform ${
                    settings.nfcSettings.testMode ? 'translate-x-7 translate-y-1' : 'translate-x-1 translate-y-1'
                  }`}></div>
                </div>
                <span className="ml-3 text-sm font-medium" style={{ color: theme.colors.primary }}>
                  {settings.nfcSettings.testMode ? 'Enabled' : 'Disabled'}
                </span>
              </label>
            </div>
            
            {/* Require Photo Toggle */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <h3 className="font-semibold" style={{ color: theme.colors.primary }}>
                  Require Photo Verification
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  Require staff to take a photo after tapping their NFC card
                </p>
              </div>
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.nfcSettings.requirePhoto}
                  onChange={(e) => handleNfcSettingChange('requirePhoto', e.target.checked)}
                  className="sr-only"
                />
                <div className={`w-14 h-8 rounded-full transition-colors ${
                  settings.nfcSettings.requirePhoto ? 'bg-green-500' : 'bg-gray-300'
                }`}>
                  <div className={`w-6 h-6 bg-white rounded-full shadow-md transform transition-transform ${
                    settings.nfcSettings.requirePhoto ? 'translate-x-7 translate-y-1' : 'translate-x-1 translate-y-1'
                  }`}></div>
                </div>
                <span className="ml-3 text-sm font-medium" style={{ color: theme.colors.primary }}>
                  {settings.nfcSettings.requirePhoto ? 'Yes' : 'No'}
                </span>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* PIN Mode Settings */}
      {settings.mode === 'PIN' && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-6" style={{ color: theme.colors.primary }}>
            PIN Mode Settings
          </h2>
          
          <div className="space-y-4">
            {/* Require Photo Toggle */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <h3 className="font-semibold" style={{ color: theme.colors.primary }}>
                  Require Photo Verification
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  Require staff to take a photo after entering their PIN
                </p>
              </div>
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.pinSettings.requirePhoto}
                  onChange={(e) => handlePinSettingChange('requirePhoto', e.target.checked)}
                  className="sr-only"
                />
                <div className={`w-14 h-8 rounded-full transition-colors ${
                  settings.pinSettings.requirePhoto ? 'bg-green-500' : 'bg-gray-300'
                }`}>
                  <div className={`w-6 h-6 bg-white rounded-full shadow-md transform transition-transform ${
                    settings.pinSettings.requirePhoto ? 'translate-x-7 translate-y-1' : 'translate-x-1 translate-y-1'
                  }`}></div>
                </div>
                <span className="ml-3 text-sm font-medium" style={{ color: theme.colors.primary }}>
                  {settings.pinSettings.requirePhoto ? 'Yes' : 'No'}
                </span>
              </label>
            </div>
            
            <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
              <div className="flex items-start gap-3">
                <FiInfo className="text-orange-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-orange-800">Current Workflow</h4>
                  <p className="text-sm text-orange-700 mt-1">
                    Staff select their name → Enter PIN → 
                    {settings.pinSettings.requirePhoto 
                      ? ' Take verification photo → Confirm clock in/out'
                      : ' Confirm clock in/out'
                    }
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Information Box */}
      <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
        <div className="flex items-start gap-3">
          <FiInfo className="text-orange-600 mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="font-medium text-orange-800">Staff NFC Card Registration</h4>
            <p className="text-sm text-orange-700 mt-1">
              When using NFC mode, each staff member must have an NFC card ID registered to their profile.
              You can register NFC card IDs in the <strong>Staff Management</strong> section under each staff member's profile.
            </p>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSaveSettings}
          disabled={saving}
          className="px-6 py-3 rounded-lg font-medium text-white flex items-center gap-2 transition-colors"
          style={{ 
            backgroundColor: saving ? theme.colors.muted : theme.colors.accent,
            opacity: saving ? 0.7 : 1
          }}
        >
          <FiSave />
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
};

export default AttendanceSettings;
