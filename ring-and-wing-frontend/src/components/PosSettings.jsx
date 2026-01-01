import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { theme } from '../theme';
import { FiSave, FiMonitor, FiTablet, FiZap, FiFileText } from 'react-icons/fi';
import { API_URL } from '../App';

const PosSettings = () => {
  const [settings, setSettings] = useState({
    layout: 'auto',
    receiptFooter: 'Thank you for your business!',
    taxRate: 0.12
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
      const response = await fetch(`${API_URL}/api/settings/pos`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch POS settings');
      }
      
      const data = await response.json();
      
      if (data.success) {
        setSettings(data.data);
      }
    } catch (err) {
      setError(err.message);
      toast.error('Failed to load POS settings');
    } finally {
      setLoading(false);
    }
  };

  const handleLayoutChange = (layout) => {
    setSettings(prev => ({
      ...prev,
      layout
    }));
  };

  const handleSaveSettings = async () => {
    try {
      setSaving(true);
      setError(null);

      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_URL}/api/settings/pos`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(settings)
      });

      if (!response.ok) {
        throw new Error('Failed to save POS settings');
      }

      const data = await response.json();
      
      if (data.success) {
        toast.success('POS settings saved successfully!');
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

      {/* POS Layout Selection */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold mb-6 flex items-center gap-2" style={{ color: theme.colors.primary }}>
          <FiMonitor className="text-xl" />
          POS Layout Mode
        </h2>
        
        <div className="space-y-4">
          <p className="text-sm" style={{ color: theme.colors.muted }}>
            Select which layout the POS system should use. Auto mode will detect screen size automatically.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Auto Mode Card */}
            <div 
              onClick={() => handleLayoutChange('auto')}
              className={`p-5 rounded-lg border-2 cursor-pointer transition-all ${
                settings.layout === 'auto' 
                  ? 'border-orange-500 bg-orange-50' 
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-3 mb-3">
                <div 
                  className={`p-3 rounded-full ${
                    settings.layout === 'auto' ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  <FiZap className="text-xl" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold" style={{ color: theme.colors.primary }}>
                    Auto Detect
                  </h3>
                  <p className="text-xs" style={{ color: theme.colors.muted }}>
                    Recommended
                  </p>
                </div>
              </div>
              
              <ul className="space-y-1 text-sm" style={{ color: theme.colors.secondary }}>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span>
                  Detect screen size
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span>
                  768-1279px → Tablet
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span>
                  1280px+ → Desktop
                </li>
              </ul>
              
              {settings.layout === 'auto' && (
                <div className="mt-3 pt-2 border-t border-orange-200">
                  <span className="text-orange-600 font-medium text-sm">✓ Active</span>
                </div>
              )}
            </div>
            
            {/* Desktop Mode Card */}
            <div 
              onClick={() => handleLayoutChange('desktop')}
              className={`p-5 rounded-lg border-2 cursor-pointer transition-all ${
                settings.layout === 'desktop' 
                  ? 'border-orange-500 bg-orange-50' 
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-3 mb-3">
                <div 
                  className={`p-3 rounded-full ${
                    settings.layout === 'desktop' ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  <FiMonitor className="text-xl" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold" style={{ color: theme.colors.primary }}>
                    Desktop
                  </h3>
                  <p className="text-xs" style={{ color: theme.colors.muted }}>
                    Full features
                  </p>
                </div>
              </div>
              
              <ul className="space-y-1 text-sm" style={{ color: theme.colors.secondary }}>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                  Always use desktop layout
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                  Full feature set
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                  Best for large screens
                </li>
              </ul>
              
              {settings.layout === 'desktop' && (
                <div className="mt-3 pt-2 border-t border-orange-200">
                  <span className="text-orange-600 font-medium text-sm">✓ Active</span>
                </div>
              )}
            </div>
            
            {/* Tablet Mode Card */}
            <div 
              onClick={() => handleLayoutChange('tablet')}
              className={`p-5 rounded-lg border-2 cursor-pointer transition-all ${
                settings.layout === 'tablet' 
                  ? 'border-orange-500 bg-orange-50' 
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-3 mb-3">
                <div 
                  className={`p-3 rounded-full ${
                    settings.layout === 'tablet' ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  <FiTablet className="text-xl" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold" style={{ color: theme.colors.primary }}>
                    Tablet
                  </h3>
                  <p className="text-xs" style={{ color: theme.colors.muted }}>
                    Touch optimized
                  </p>
                </div>
              </div>
              
              <ul className="space-y-1 text-sm" style={{ color: theme.colors.secondary }}>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                  Always use tablet layout
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                  Larger touch targets
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                  60/40 split view
                </li>
              </ul>
              
              {settings.layout === 'tablet' && (
                <div className="mt-3 pt-2 border-t border-orange-200">
                  <span className="text-orange-600 font-medium text-sm">✓ Active</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Receipt Settings */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold mb-6 flex items-center gap-2" style={{ color: theme.colors.primary }}>
          <FiFileText className="text-xl" />
          Receipt Settings
        </h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: theme.colors.secondary }}>
              Receipt Footer Message
            </label>
            <input
              type="text"
              value={settings.receiptFooter || ''}
              onChange={(e) => setSettings(prev => ({ ...prev, receiptFooter: e.target.value }))}
              className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              placeholder="Thank you for your business!"
              style={{ borderColor: theme.colors.muted + '40' }}
            />
            <p className="text-xs mt-1" style={{ color: theme.colors.muted }}>
              This message will appear at the bottom of printed receipts
            </p>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSaveSettings}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-3 rounded-lg text-white font-medium transition-all hover:opacity-90 disabled:opacity-50"
          style={{ backgroundColor: theme.colors.accent }}
        >
          <FiSave className="text-lg" />
          {saving ? 'Saving...' : 'Save POS Settings'}
        </button>
      </div>
    </div>
  );
};

export default PosSettings;
