import { useState, useEffect } from 'react';
import { theme } from '../theme';
import { FiUpload, FiTrash2, FiSave, FiCheck, FiX } from 'react-icons/fi';
import { API_URL } from '../App';

const PaymentSettings = () => {
  const [settings, setSettings] = useState({
    merchantWallets: {
      gcash: {
        enabled: false,
        accountNumber: '',
        accountName: '',
        qrCodeUrl: ''
      },
      paymaya: {
        enabled: false,
        accountNumber: '',
        accountName: '',
        qrCodeUrl: ''
      }
    },
    paymentVerification: {
      timeoutMinutes: 120,
      autoCancel: true,
      warningThresholds: {
        green: 60,
        yellow: 30,
        orange: 15,
        red: 0
      }
    }
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState('');
  const [uploadingQR, setUploadingQR] = useState({ gcash: false, paymaya: false });

  // Fetch current settings
  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('authToken');
      
      // Fetch merchant wallets
      const walletsResponse = await fetch(`${API_URL}/api/settings/merchant-wallets`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!walletsResponse.ok) {
        throw new Error('Failed to fetch merchant wallet settings');
      }
      
      const walletsData = await walletsResponse.json();
      
      // Fetch payment verification settings
      const verificationResponse = await fetch(`${API_URL}/api/settings/payment-verification`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!verificationResponse.ok) {
        throw new Error('Failed to fetch payment verification settings');
      }
      
      const verificationData = await verificationResponse.json();
      
      // Merge both responses into state
      if (walletsData.success && verificationData.success) {
        setSettings({
          merchantWallets: walletsData.data || settings.merchantWallets,
          paymentVerification: verificationData.data || settings.paymentVerification
        });
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (provider, field, value) => {
    setSettings(prev => ({
      ...prev,
      merchantWallets: {
        ...prev.merchantWallets,
        [provider]: {
          ...prev.merchantWallets[provider],
          [field]: value
        }
      }
    }));
  };

  const handleToggleEnabled = (provider) => {
    setSettings(prev => ({
      ...prev,
      merchantWallets: {
        ...prev.merchantWallets,
        [provider]: {
          ...prev.merchantWallets[provider],
          enabled: !prev.merchantWallets[provider].enabled
        }
      }
    }));
  };

  const handleVerificationSettingChange = (field, value) => {
    setSettings(prev => ({
      ...prev,
      paymentVerification: {
        ...prev.paymentVerification,
        [field]: value
      }
    }));
  };

  const handleQRUpload = async (provider, file) => {
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file');
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image size must be less than 5MB');
      return;
    }

    try {
      setUploadingQR(prev => ({ ...prev, [provider]: true }));
      setError(null);

      const formData = new FormData();
      formData.append('file', file); // Changed from 'qrCode' to 'file'
      formData.append('provider', provider);

      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_URL}/api/settings/merchant-wallets/qr`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error('Failed to upload QR code');
      }

      const data = await response.json();
      
      if (data.success) {
        setSettings(prev => ({
          ...prev,
          merchantWallets: {
            ...prev.merchantWallets,
            [provider]: {
              ...prev.merchantWallets[provider],
              qrCodeUrl: data.data.qrCodeUrl
            }
          }
        }));
        setSuccess(`${provider.toUpperCase()} QR code uploaded successfully!`);
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setUploadingQR(prev => ({ ...prev, [provider]: false }));
    }
  };

  const handleDeleteQR = async (provider) => {
    if (!window.confirm(`Delete ${provider.toUpperCase()} QR code?`)) {
      return;
    }

    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_URL}/api/settings/merchant-wallets/qr/${provider}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete QR code');
      }

      const data = await response.json();
      
      if (data.success) {
        setSettings(prev => ({
          ...prev,
          merchantWallets: {
            ...prev.merchantWallets,
            [provider]: {
              ...prev.merchantWallets[provider],
              qrCodeUrl: ''
            }
          }
        }));
        setSuccess(`${provider.toUpperCase()} QR code deleted successfully!`);
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const handleSaveSettings = async () => {
    try {
      setSaving(true);
      setError(null);

      const token = localStorage.getItem('authToken');
      
      // Save GCash settings
      const gcashResponse = await fetch(`${API_URL}/api/settings/merchant-wallets`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          provider: 'gcash',
          enabled: settings.merchantWallets.gcash.enabled,
          accountNumber: settings.merchantWallets.gcash.accountNumber,
          accountName: settings.merchantWallets.gcash.accountName
        })
      });

      if (!gcashResponse.ok) {
        throw new Error('Failed to save GCash settings');
      }

      // Save PayMaya settings
      const paymayaResponse = await fetch(`${API_URL}/api/settings/merchant-wallets`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          provider: 'paymaya',
          enabled: settings.merchantWallets.paymaya.enabled,
          accountNumber: settings.merchantWallets.paymaya.accountNumber,
          accountName: settings.merchantWallets.paymaya.accountName
        })
      });

      if (!paymayaResponse.ok) {
        throw new Error('Failed to save PayMaya settings');
      }

      // Save Payment Verification settings
      const verificationResponse = await fetch(`${API_URL}/api/settings/payment-verification`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(settings.paymentVerification)
      });

      if (!verificationResponse.ok) {
        throw new Error('Failed to save payment verification settings');
      }

      const verificationData = await verificationResponse.json();
      
      if (verificationData.success) {
        setSuccess('All settings saved successfully!');
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (err) {
      setError(err.message);
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
      {/* Success/Error Messages */}
      {success && (
        <div className="p-4 rounded-lg bg-green-100 border border-green-300 flex items-center gap-2">
          <FiCheck className="text-green-600" />
          <span className="text-green-800">{success}</span>
        </div>
      )}
      
      {error && (
        <div className="p-4 rounded-lg bg-red-100 border border-red-300 flex items-center gap-2">
          <FiX className="text-red-600" />
          <span className="text-red-800">{error}</span>
        </div>
      )}

      {/* Merchant Wallets Section */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold mb-6" style={{ color: theme.colors.primary }}>
          Merchant Wallet Configuration
        </h2>
        
        <div className="space-y-8">
          {/* GCash Settings */}
          <div className="border-b pb-6" style={{ borderColor: theme.colors.muted + '30' }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold" style={{ color: theme.colors.secondary }}>
                GCash
              </h3>
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.merchantWallets.gcash.enabled}
                  onChange={() => handleToggleEnabled('gcash')}
                  className="sr-only"
                />
                <div className={`w-14 h-8 rounded-full transition-colors ${
                  settings.merchantWallets.gcash.enabled 
                    ? 'bg-green-500' 
                    : 'bg-gray-300'
                }`}>
                  <div className={`w-6 h-6 bg-white rounded-full shadow-md transform transition-transform ${
                    settings.merchantWallets.gcash.enabled 
                      ? 'translate-x-7 translate-y-1' 
                      : 'translate-x-1 translate-y-1'
                  }`}></div>
                </div>
                <span className="ml-3 text-sm" style={{ color: theme.colors.primary }}>
                  {settings.merchantWallets.gcash.enabled ? 'Enabled' : 'Disabled'}
                </span>
              </label>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: theme.colors.primary }}>
                  Account Name
                </label>
                <input
                  type="text"
                  value={settings.merchantWallets.gcash.accountName}
                  onChange={(e) => handleInputChange('gcash', 'accountName', e.target.value)}
                  placeholder="Juan Dela Cruz"
                  className="w-full px-4 py-2 rounded-lg border"
                  style={{ borderColor: theme.colors.muted }}
                  disabled={!settings.merchantWallets.gcash.enabled}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: theme.colors.primary }}>
                  Account Number
                </label>
                <input
                  type="text"
                  value={settings.merchantWallets.gcash.accountNumber}
                  onChange={(e) => handleInputChange('gcash', 'accountNumber', e.target.value)}
                  placeholder="09XX XXX XXXX"
                  className="w-full px-4 py-2 rounded-lg border"
                  style={{ borderColor: theme.colors.muted }}
                  disabled={!settings.merchantWallets.gcash.enabled}
                />
              </div>
            </div>
            
            <div className="mt-4">
              <label className="block text-sm font-medium mb-2" style={{ color: theme.colors.primary }}>
                QR Code
              </label>
              {settings.merchantWallets.gcash.qrCodeUrl && settings.merchantWallets.gcash.qrCodeUrl.trim() !== '' ? (
                <div className="flex items-start gap-4">
                  <img 
                    src={`${API_URL}${settings.merchantWallets.gcash.qrCodeUrl}`}
                    alt="GCash QR Code"
                    className="w-48 h-48 object-contain border rounded-lg"
                  />
                  <button
                    onClick={() => handleDeleteQR('gcash')}
                    className="p-2 rounded-full hover:bg-red-100 transition-colors"
                    title="Delete QR Code"
                  >
                    <FiTrash2 className="text-red-600" />
                  </button>
                </div>
              ) : (
                <div className="border-2 border-dashed rounded-lg p-8 text-center" style={{ borderColor: theme.colors.muted }}>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleQRUpload('gcash', e.target.files[0])}
                    className="hidden"
                    id="gcash-qr-upload"
                    disabled={!settings.merchantWallets.gcash.enabled || uploadingQR.gcash}
                  />
                  <label
                    htmlFor="gcash-qr-upload"
                    className={`cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                      !settings.merchantWallets.gcash.enabled || uploadingQR.gcash
                        ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                        : 'bg-orange-500 text-white hover:bg-orange-600'
                    }`}
                  >
                    <FiUpload />
                    {uploadingQR.gcash ? 'Uploading...' : 'Upload QR Code'}
                  </label>
                  <p className="text-sm mt-2" style={{ color: theme.colors.muted }}>
                    PNG, JPG or WEBP (max 5MB)
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* PayMaya Settings */}
          <div className="pb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold" style={{ color: theme.colors.secondary }}>
                PayMaya
              </h3>
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.merchantWallets.paymaya.enabled}
                  onChange={() => handleToggleEnabled('paymaya')}
                  className="sr-only"
                />
                <div className={`w-14 h-8 rounded-full transition-colors ${
                  settings.merchantWallets.paymaya.enabled 
                    ? 'bg-green-500' 
                    : 'bg-gray-300'
                }`}>
                  <div className={`w-6 h-6 bg-white rounded-full shadow-md transform transition-transform ${
                    settings.merchantWallets.paymaya.enabled 
                      ? 'translate-x-7 translate-y-1' 
                      : 'translate-x-1 translate-y-1'
                  }`}></div>
                </div>
                <span className="ml-3 text-sm" style={{ color: theme.colors.primary }}>
                  {settings.merchantWallets.paymaya.enabled ? 'Enabled' : 'Disabled'}
                </span>
              </label>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: theme.colors.primary }}>
                  Account Name
                </label>
                <input
                  type="text"
                  value={settings.merchantWallets.paymaya.accountName}
                  onChange={(e) => handleInputChange('paymaya', 'accountName', e.target.value)}
                  placeholder="Juan Dela Cruz"
                  className="w-full px-4 py-2 rounded-lg border"
                  style={{ borderColor: theme.colors.muted }}
                  disabled={!settings.merchantWallets.paymaya.enabled}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: theme.colors.primary }}>
                  Account Number
                </label>
                <input
                  type="text"
                  value={settings.merchantWallets.paymaya.accountNumber}
                  onChange={(e) => handleInputChange('paymaya', 'accountNumber', e.target.value)}
                  placeholder="09XX XXX XXXX"
                  className="w-full px-4 py-2 rounded-lg border"
                  style={{ borderColor: theme.colors.muted }}
                  disabled={!settings.merchantWallets.paymaya.enabled}
                />
              </div>
            </div>
            
            <div className="mt-4">
              <label className="block text-sm font-medium mb-2" style={{ color: theme.colors.primary }}>
                QR Code
              </label>
              {settings.merchantWallets.paymaya.qrCodeUrl && settings.merchantWallets.paymaya.qrCodeUrl.trim() !== '' ? (
                <div className="flex items-start gap-4">
                  <img 
                    src={`${API_URL}${settings.merchantWallets.paymaya.qrCodeUrl}`}
                    alt="PayMaya QR Code"
                    className="w-48 h-48 object-contain border rounded-lg"
                  />
                  <button
                    onClick={() => handleDeleteQR('paymaya')}
                    className="p-2 rounded-full hover:bg-red-100 transition-colors"
                    title="Delete QR Code"
                  >
                    <FiTrash2 className="text-red-600" />
                  </button>
                </div>
              ) : (
                <div className="border-2 border-dashed rounded-lg p-8 text-center" style={{ borderColor: theme.colors.muted }}>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleQRUpload('paymaya', e.target.files[0])}
                    className="hidden"
                    id="paymaya-qr-upload"
                    disabled={!settings.merchantWallets.paymaya.enabled || uploadingQR.paymaya}
                  />
                  <label
                    htmlFor="paymaya-qr-upload"
                    className={`cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                      !settings.merchantWallets.paymaya.enabled || uploadingQR.paymaya
                        ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                        : 'bg-orange-500 text-white hover:bg-orange-600'
                    }`}
                  >
                    <FiUpload />
                    {uploadingQR.paymaya ? 'Uploading...' : 'Upload QR Code'}
                  </label>
                  <p className="text-sm mt-2" style={{ color: theme.colors.muted }}>
                    PNG, JPG or WEBP (max 5MB)
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Verification Settings */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold mb-6" style={{ color: theme.colors.primary }}>
          Payment Verification Settings
        </h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: theme.colors.primary }}>
              Timeout Period (minutes)
            </label>
            <input
              type="number"
              value={settings.paymentVerification.timeoutMinutes}
              onChange={(e) => handleVerificationSettingChange('timeoutMinutes', parseInt(e.target.value))}
              min="30"
              max="240"
              className="w-full md:w-64 px-4 py-2 rounded-lg border"
              style={{ borderColor: theme.colors.muted }}
            />
            <p className="text-sm mt-1" style={{ color: theme.colors.muted }}>
              Orders will auto-cancel after this duration (default: 120 minutes)
            </p>
          </div>
          
          <div>
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.paymentVerification.autoCancel}
                onChange={(e) => handleVerificationSettingChange('autoCancel', e.target.checked)}
                className="w-5 h-5 rounded"
                style={{ accentColor: theme.colors.accent }}
              />
              <span className="ml-3" style={{ color: theme.colors.primary }}>
                Automatically cancel orders after timeout
              </span>
            </label>
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

export default PaymentSettings;
