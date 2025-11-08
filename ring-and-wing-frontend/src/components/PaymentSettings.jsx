import { useState, useEffect } from 'react';
import { theme } from '../theme';
import { FiUpload, FiTrash2, FiSave, FiCheck, FiX, FiChevronDown, FiChevronRight } from 'react-icons/fi';
import { API_URL } from '../App';
import Toast from './Toast';

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
    },
    paymentGateways: {
      paymongo: {
        enabled: false,
        gcashEnabled: false,
        paymayaEnabled: false
      }
    }
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [uploadingQR, setUploadingQR] = useState({ gcash: false, paymaya: false });
  const [expandedSections, setExpandedSections] = useState({ gcash: false, paymaya: false });
  
  // Toast notification state
  const [toast, setToast] = useState({
    isVisible: false,
    message: '',
    type: 'success'
  });

  // Toast helper functions
  const showToast = (message, type = 'success') => {
    setToast({
      isVisible: true,
      message,
      type
    });
  };

  const hideToast = () => {
    setToast(prev => ({ ...prev, isVisible: false }));
  };

  // Fetch current settings
  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      await loadSettings();
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
    setSettings(prev => {
      const newSettings = {
        ...prev,
        merchantWallets: {
          ...prev.merchantWallets,
          [provider]: {
            ...prev.merchantWallets[provider],
            enabled: !prev.merchantWallets[provider].enabled
          }
        }
      };

      // If enabling manual payments, disable PayMongo
      if (!prev.merchantWallets[provider].enabled) {
        newSettings.paymentGateways = {
          ...prev.paymentGateways,
          paymongo: {
            ...prev.paymentGateways.paymongo,
            enabled: false
          }
        };
      }

      return newSettings;
    });
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

  // PayMongo Gateway Settings Handlers
  const handlePayMongoSettingChange = (field, value) => {
    setSettings(prev => ({
      ...prev,
      paymentGateways: {
        ...prev.paymentGateways,
        paymongo: {
          ...prev.paymentGateways.paymongo,
          [field]: value
        }
      }
    }));
  };

  const handlePayMongoToggle = () => {
    setSettings(prev => {
      const newSettings = {
        ...prev,
        paymentGateways: {
          ...prev.paymentGateways,
          paymongo: {
            ...prev.paymentGateways.paymongo,
            enabled: !prev.paymentGateways.paymongo.enabled
          }
        }
      };

      // If enabling PayMongo, disable manual payments
      if (!prev.paymentGateways.paymongo.enabled) {
        newSettings.merchantWallets = {
          ...prev.merchantWallets,
          gcash: {
            ...prev.merchantWallets.gcash,
            enabled: false
          },
          paymaya: {
            ...prev.merchantWallets.paymaya,
            enabled: false
          }
        };
      }

      return newSettings;
    });
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

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
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

      // Save PayMongo Gateway settings
      console.log('Saving PayMongo settings:', settings.paymentGateways.paymongo);
      console.log('Full PayMongo object being sent:', JSON.stringify(settings.paymentGateways.paymongo, null, 2));
      
      const paymongoResponse = await fetch(`${API_URL}/api/settings/payment-gateways`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          paymongo: settings.paymentGateways.paymongo
        })
      });

      if (!paymongoResponse.ok) {
        const errorText = await paymongoResponse.text();
        console.error('PayMongo save error:', errorText);
        throw new Error('Failed to save PayMongo settings');
      }

      const paymongoResult = await paymongoResponse.json();
      console.log('PayMongo save result:', paymongoResult);

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
        showToast('✅ All payment settings saved successfully!', 'success');
        
        // Reload settings to ensure UI reflects saved data
        await loadSettings();
      }
    } catch (err) {
      console.error('Save settings error:', err);
      showToast(`Failed to save settings: ${err.message}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  // Extract settings loading to a separate function
  const loadSettings = async () => {
    try {
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

      // Fetch payment gateway settings (PayMongo)
      const gatewaysResponse = await fetch(`${API_URL}/api/settings/payment-gateways`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!gatewaysResponse.ok) {
        throw new Error('Failed to fetch payment gateway settings');
      }
      
      const gatewaysData = await gatewaysResponse.json();
      
      console.log('Loaded gateway settings from backend:', gatewaysData);
      console.log('Full gatewaysData structure:', JSON.stringify(gatewaysData, null, 2));
      
      // Merge all responses into state
      if (walletsData.success && verificationData.success && gatewaysData.success) {
        setSettings(prevSettings => ({
          merchantWallets: walletsData.data || prevSettings.merchantWallets,
          paymentVerification: verificationData.data || prevSettings.paymentVerification,
          paymentGateways: gatewaysData.data || prevSettings.paymentGateways
        }));
      }
    } catch (err) {
      console.error('Load settings error:', err);
      showToast(`Failed to load settings: ${err.message}`, 'error');
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
    <>
      {/* Toast Notification */}
      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={hideToast}
        duration={5000}
      />
      
      <div className="p-6 space-y-6">
        {/* Error Messages (keep only for critical errors) */}
        {error && (
          <div className="p-4 rounded-lg bg-red-50 border border-red-200 flex items-center gap-2">
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
            <div 
              className="flex items-center justify-between mb-4 cursor-pointer"
              onClick={() => toggleSection('gcash')}
            >
              <h3 className="text-lg font-semibold" style={{ color: theme.colors.secondary }}>
                GCash
              </h3>
              <div className="flex items-center gap-3">
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
                {expandedSections.gcash ? (
                  <FiChevronDown className="text-xl" style={{ color: theme.colors.primary }} />
                ) : (
                  <FiChevronRight className="text-xl" style={{ color: theme.colors.primary }} />
                )}
              </div>
            </div>
            
            {expandedSections.gcash && (
              <>
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
              </>
            )}
          </div>

          {/* PayMaya Settings */}
          <div className="pb-6">
            <div 
              className="flex items-center justify-between mb-4 cursor-pointer"
              onClick={() => toggleSection('paymaya')}
            >
              <h3 className="text-lg font-semibold" style={{ color: theme.colors.secondary }}>
                PayMaya
              </h3>
              <div className="flex items-center gap-3">
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
                {expandedSections.paymaya ? (
                  <FiChevronDown className="text-xl" style={{ color: theme.colors.primary }} />
                ) : (
                  <FiChevronRight className="text-xl" style={{ color: theme.colors.primary }} />
                )}
              </div>
            </div>
            
            {expandedSections.paymaya && (
              <>
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
              </>
            )}
          </div>
        </div>
      </div>

      {/* PayMongo Gateway Settings */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold mb-6" style={{ color: theme.colors.primary }}>
          PayMongo Payment Gateway
        </h2>
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <div className="text-blue-600 mt-0.5">ℹ️</div>
            <div>
              <h4 className="text-blue-800 font-semibold mb-1">About PayMongo Gateway</h4>
              <p className="text-blue-700 text-sm leading-relaxed">
                PayMongo provides secure online payment processing for GCash and PayMaya. 
                When enabled, customers can pay directly through PayMongo's secure checkout page instead of manual transfers.
                This eliminates the need for manual payment verification and provides instant payment confirmation.
              </p>
            </div>
          </div>
        </div>

        {/* Mutual Exclusion Warning */}
        {(settings.merchantWallets.gcash.enabled || settings.merchantWallets.paymaya.enabled) && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <div className="text-amber-600 mt-0.5">⚠️</div>
              <div>
                <h4 className="text-amber-800 font-semibold mb-1">Payment Method Conflict</h4>
                <p className="text-amber-700 text-sm leading-relaxed">
                  Manual payment methods (GCash/PayMaya wallets) are currently enabled. 
                  Enabling PayMongo will automatically disable manual payment methods to avoid conflicts.
                </p>
              </div>
            </div>
          </div>
        )}

        {settings.paymentGateways.paymongo.enabled && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <div className="text-green-600 mt-0.5">✅</div>
              <div>
                <h4 className="text-green-800 font-semibold mb-1">PayMongo Active</h4>
                <p className="text-green-700 text-sm leading-relaxed">
                  PayMongo gateway is enabled. Customers can now pay securely online through PayMongo's checkout.
                  Manual payment methods are automatically disabled.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-6">
          {/* Main PayMongo Toggle */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <h3 className="text-lg font-semibold" style={{ color: theme.colors.secondary }}>
                Enable PayMongo Gateway
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                Allow customers to pay through PayMongo's secure payment system
              </p>
            </div>
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.paymentGateways.paymongo.enabled}
                onChange={handlePayMongoToggle}
                className="sr-only"
              />
              <div className={`w-14 h-8 rounded-full transition-colors ${
                settings.paymentGateways.paymongo.enabled 
                  ? 'bg-green-500' 
                  : 'bg-gray-300'
              }`}>
                <div className={`w-6 h-6 bg-white rounded-full shadow-md transform transition-transform ${
                  settings.paymentGateways.paymongo.enabled 
                    ? 'translate-x-7 translate-y-1' 
                    : 'translate-x-1 translate-y-1'
                }`}></div>
              </div>
              <span className="ml-3 text-sm font-medium" style={{ color: theme.colors.primary }}>
                {settings.paymentGateways.paymongo.enabled ? 'Enabled' : 'Disabled'}
              </span>
            </label>
          </div>

          {/* PayMongo Configuration Options */}
          {settings.paymentGateways.paymongo.enabled && (
            <div className="space-y-4 pl-4 border-l-4 border-blue-200">
              {/* Payment Method Options */}
              <div>
                <h4 className="text-sm font-medium mb-3" style={{ color: theme.colors.primary }}>
                  Supported Payment Methods
                </h4>
                
                <div className="space-y-3">
                  {/* GCash Option */}
                  <label className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.paymentGateways.paymongo.gcashEnabled}
                      onChange={(e) => handlePayMongoSettingChange('gcashEnabled', e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <div className="flex items-center gap-2">
                      <span className="text-blue-600 font-bold text-lg">G</span>
                      <span className="font-medium">GCash via PayMongo</span>
                    </div>
                  </label>

                  {/* PayMaya Option */}
                  <label className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.paymentGateways.paymongo.paymayaEnabled}
                      onChange={(e) => handlePayMongoSettingChange('paymayaEnabled', e.target.checked)}
                      className="w-4 h-4 text-green-600 rounded focus:ring-green-500"
                    />
                    <div className="flex items-center gap-2">
                      <span className="text-green-600 font-bold text-lg">P</span>
                      <span className="font-medium">PayMaya via PayMongo</span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Integration Notes */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h5 className="text-yellow-800 font-semibold mb-2">⚠️ Important Notes</h5>
                <ul className="text-yellow-700 text-sm space-y-1 list-disc list-inside">
                  <li>PayMongo gateway works independently from manual wallet transfers</li>
                  <li>Customers can choose between manual transfer or PayMongo gateway</li>
                  <li>PayMongo payments are automatically verified (no manual verification needed)</li>
                  <li>All payments are processed in live mode with real transactions</li>
                </ul>
              </div>
            </div>
          )}
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
    </>
  );
};

export default PaymentSettings;
