import React, { useState, useEffect } from 'react';
import theme from '../theme';

/**
 * PaymentMethodSelector Component
 * 
 * Shown ONLY for takeout/delivery orders
 * Displays available e-wallet payment options (GCash/PayMaya/PayMongo)
 * Shows wallet details, QR code, and payment instructions
 */
const PaymentMethodSelector = ({ selectedMethod, onSelect, orderTotal }) => {
  const [walletSettings, setWalletSettings] = useState({
    gcash: { enabled: false, accountNumber: '', accountName: '', qrCodeUrl: '' },
    paymaya: { enabled: false, accountNumber: '', accountName: '', qrCodeUrl: '' }
  });
  const [paymentGateways, setPaymentGateways] = useState({
    paymongo: { enabled: false, gcashEnabled: false, paymayaEnabled: false, mode: 'test' }
  });
  const [loading, setLoading] = useState(true);
  const [showDetails, setShowDetails] = useState(null);

  // Fetch merchant wallet settings and payment gateways from backend
  useEffect(() => {
    fetchPaymentSettings();
  }, []);

  const fetchPaymentSettings = async () => {
    try {
      // Fetch both wallet settings and payment gateways
      const [walletResponse, gatewayResponse] = await Promise.all([
        fetch(`${import.meta.env.VITE_API_URL}/api/settings/merchant-wallets`),
        fetch(`${import.meta.env.VITE_API_URL}/api/settings/payment-gateways`)
      ]);
      
      const walletData = await walletResponse.json();
      const gatewayData = await gatewayResponse.json();
      
      if (walletData.success) {
        setWalletSettings(walletData.data);
      }
      
      if (gatewayData.success) {
        setPaymentGateways(gatewayData.data);
      }
    } catch (error) {
      console.error('Failed to fetch payment settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const paymentMethods = [
    {
      id: 'gcash',
      label: 'GCash',
      logo: 'G', // Replace with actual GCash logo
      color: '#007DFF',
      enabled: walletSettings.gcash.enabled,
      type: 'traditional',
      ...walletSettings.gcash
    },
    {
      id: 'paymaya',
      label: 'PayMaya',
      logo: 'P', // Replace with actual PayMaya logo
      color: '#00D632',
      enabled: walletSettings.paymaya.enabled,
      type: 'traditional',
      ...walletSettings.paymaya
    },
    // PayMongo Gateway Options
    {
      id: 'paymongo-gcash',
      label: 'GCash via PayMongo',
      logo: 'PG',
      color: '#007DFF',
      enabled: paymentGateways.paymongo.enabled && paymentGateways.paymongo.gcashEnabled,
      type: 'gateway',
      description: 'Secure online payment via PayMongo',
      mode: paymentGateways.paymongo.mode
    },
    {
      id: 'paymongo-paymaya',
      label: 'PayMaya via PayMongo',
      logo: 'PP',
      color: '#00D632',
      enabled: paymentGateways.paymongo.enabled && paymentGateways.paymongo.paymayaEnabled,
      type: 'gateway',
      description: 'Secure online payment via PayMongo',
      mode: paymentGateways.paymongo.mode
    }
  ];

  const availableMethods = paymentMethods.filter(m => m.enabled);

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loadingContainer}>
          <div style={styles.spinner}></div>
          <p>Loading payment options...</p>
        </div>
      </div>
    );
  }

  if (availableMethods.length === 0) {
    return (
      <div style={styles.container}>
        <div style={styles.errorBox}>
          <span style={styles.errorIcon}>!</span>
          <p style={styles.errorText}>
            Digital payment is currently unavailable. Please contact the restaurant or choose dine-in option.
          </p>
        </div>
      </div>
    );
  }

  const handleMethodSelect = (methodId) => {
    onSelect(methodId);
    setShowDetails(methodId);
  };

  const selectedMethodData = availableMethods.find(m => m.id === selectedMethod);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>Select Payment Method</h2>
        <p style={styles.subtitle}>
          Total Amount: <strong style={styles.amount}>₱{orderTotal.toFixed(2)}</strong>
        </p>
      </div>

      <div style={styles.methodsGrid}>
        {availableMethods.map((method) => {
          const isSelected = selectedMethod === method.id;

          return (
            <button
              key={method.id}
              onClick={() => handleMethodSelect(method.id)}
              style={{
                ...styles.methodCard,
                ...(isSelected ? styles.methodCardSelected : {}),
                borderColor: isSelected ? method.color : '#e0e0e0',
                backgroundColor: isSelected ? `${method.color}10` : '#fff'
              }}
            >
              <div style={styles.methodLogo}>
                <span style={{ fontSize: '48px' }}>{method.logo}</span>
              </div>
              <h3 style={{
                ...styles.methodLabel,
                color: isSelected ? method.color : '#333'
              }}>
                {method.label}
              </h3>
              {isSelected && (
                <div style={{
                  ...styles.checkmark,
                  backgroundColor: method.color
                }}>
                  OK
                </div>
              )}
            </button>
          );
        })}
      </div>

      {selectedMethodData && (
        <div style={styles.paymentDetails}>
          <div style={styles.detailsHeader}>
            <h3 style={styles.detailsTitle}>Payment Instructions</h3>
          </div>

          <div style={styles.detailsContent}>
            {selectedMethodData.type === 'gateway' ? (
              // PayMongo Gateway Payment Instructions
              <div style={styles.gatewaySection}>
                <div style={styles.gatewayInfo}>
                  <h4 style={styles.sectionTitle}>Secure Online Payment</h4>
                  <p style={styles.gatewayDescription}>
                    You will be redirected to PayMongo's secure payment page to complete your {selectedMethodData.label.includes('GCash') ? 'GCash' : 'PayMaya'} payment.
                  </p>
                  
                  <div style={styles.gatewayFeatures}>
                    <div style={styles.featureItem}>
                      <span style={styles.featureIcon}>🔒</span>
                      <span>Bank-level security</span>
                    </div>
                    <div style={styles.featureItem}>
                      <span style={styles.featureIcon}>⚡</span>
                      <span>Instant payment confirmation</span>
                    </div>
                    <div style={styles.featureItem}>
                      <span style={styles.featureIcon}>📱</span>
                      <span>Pay with your {selectedMethodData.label.includes('GCash') ? 'GCash' : 'PayMaya'} app</span>
                    </div>
                  </div>

                  <div style={styles.paymentAmount}>
                    <span style={styles.amountLabel}>Amount to Pay:</span>
                    <span style={styles.amountValue}>₱{orderTotal.toFixed(2)}</span>
                  </div>

                  {selectedMethodData.mode === 'test' && (
                    <div style={styles.testModeWarning}>
                      <span style={styles.warningIcon}>⚠️</span>
                      <span>Test Mode: No real payment will be processed</span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              // Traditional Manual Payment Instructions
              <>
                {/* QR Code Section */}
                {selectedMethodData.qrCodeUrl && (
                  <div style={styles.qrSection}>
                    <h4 style={styles.sectionTitle}>Scan QR Code</h4>
                    <div style={styles.qrCodeContainer}>
                      <img
                        src={`${import.meta.env.VITE_API_URL}${selectedMethodData.qrCodeUrl}`}
                        alt={`${selectedMethodData.label} QR Code`}
                        style={styles.qrCode}
                      />
                    </div>
                    <p style={styles.qrInstruction}>
                      Open your {selectedMethodData.label} app and scan this code
                    </p>
                  </div>
                )}

                {/* Account Details Section */}
                <div style={styles.accountSection}>
                  <h4 style={styles.sectionTitle}>Or send to this account:</h4>
                  <div style={styles.accountDetails}>
                    <div style={styles.detailRow}>
                      <span style={styles.detailLabel}>Account Name:</span>
                      <span style={styles.detailValue}>{selectedMethodData.accountName}</span>
                    </div>
                    <div style={styles.detailRow}>
                      <span style={styles.detailLabel}>Account Number:</span>
                      <span style={styles.detailValue}>{selectedMethodData.accountNumber}</span>
                    </div>
                    <div style={styles.detailRow}>
                      <span style={styles.detailLabel}>Amount to Send:</span>
                      <span style={{...styles.detailValue, ...styles.amountHighlight}}>
                        ₱{orderTotal.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Important Notes */}
                <div style={styles.notesSection}>
                  <h4 style={styles.sectionTitle}>Important:</h4>
                  <ul style={styles.notesList}>
                    <li>Make sure to send the exact amount: <strong>₱{orderTotal.toFixed(2)}</strong></li>
                    <li>After payment, you'll need to upload proof of payment (screenshot or reference number)</li>
                    <li>Your order will be processed once payment is verified (usually within 2 hours)</li>
                  </ul>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  container: {
    width: '100%',
    maxWidth: '900px',
    margin: '0 auto',
    padding: '24px'
  },
  loadingContainer: {
    textAlign: 'center',
    padding: '40px',
    color: '#666'
  },
  spinner: {
    width: '40px',
    height: '40px',
    margin: '0 auto 16px',
    border: '4px solid #f3f3f3',
    borderTop: '4px solid #007DFF',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  errorBox: {
    backgroundColor: '#FFF3CD',
    border: '1px solid #FFE69C',
    borderRadius: '12px',
    padding: '20px',
    textAlign: 'center'
  },
  errorIcon: {
    fontSize: '32px',
    display: 'block',
    marginBottom: '12px'
  },
  errorText: {
    color: '#856404',
    margin: '0',
    fontSize: '15px'
  },
  header: {
    textAlign: 'center',
    marginBottom: '32px'
  },
  title: {
    fontSize: '28px',
    fontWeight: '600',
    color: '#333',
    marginBottom: '8px'
  },
  subtitle: {
    fontSize: '16px',
    color: '#666',
    marginTop: '8px'
  },
  amount: {
    color: theme.colors.primary,
    fontSize: '20px'
  },
  methodsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '20px',
    marginBottom: '32px'
  },
  methodCard: {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '32px 24px',
    border: '3px solid',
    borderRadius: '16px',
    background: '#fff',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    textAlign: 'center'
  },
  methodCardSelected: {
    transform: 'translateY(-4px)',
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)'
  },
  methodLogo: {
    marginBottom: '16px'
  },
  methodLabel: {
    fontSize: '22px',
    fontWeight: '600',
    margin: '0'
  },
  checkmark: {
    position: 'absolute',
    top: '12px',
    right: '12px',
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '18px',
    fontWeight: 'bold'
  },
  paymentDetails: {
    backgroundColor: '#f8f9fa',
    borderRadius: '16px',
    padding: '24px',
    border: '1px solid #e0e0e0'
  },
  detailsHeader: {
    marginBottom: '24px',
    borderBottom: '2px solid #e0e0e0',
    paddingBottom: '12px'
  },
  detailsTitle: {
    fontSize: '22px',
    fontWeight: '600',
    color: '#333',
    margin: '0'
  },
  detailsContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px'
  },
  qrSection: {
    textAlign: 'center',
    backgroundColor: '#fff',
    borderRadius: '12px',
    padding: '24px'
  },
  sectionTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#333',
    marginBottom: '16px',
    marginTop: '0'
  },
  qrCodeContainer: {
    display: 'inline-block',
    padding: '16px',
    backgroundColor: '#fff',
    borderRadius: '12px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
    marginBottom: '12px'
  },
  qrCode: {
    width: '200px',
    height: '200px',
    display: 'block'
  },
  qrInstruction: {
    color: '#666',
    fontSize: '14px',
    margin: '0'
  },
  accountSection: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    padding: '20px'
  },
  accountDetails: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  detailRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '12px 0',
    borderBottom: '1px solid #f0f0f0'
  },
  detailLabel: {
    fontWeight: '500',
    color: '#666',
    fontSize: '15px'
  },
  detailValue: {
    fontWeight: '600',
    color: '#333',
    fontSize: '15px'
  },
  amountHighlight: {
    color: theme.colors.primary,
    fontSize: '18px'
  },
  notesSection: {
    backgroundColor: '#FFF3CD',
    borderRadius: '12px',
    padding: '20px',
    border: '1px solid #FFE69C'
  },
  notesList: {
    margin: '0',
    paddingLeft: '20px',
    color: '#856404'
  },
  // PayMongo Gateway Styles
  gatewaySection: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    padding: '24px'
  },
  gatewayInfo: {
    textAlign: 'center'
  },
  gatewayDescription: {
    fontSize: '16px',
    color: '#666',
    marginBottom: '24px',
    lineHeight: '1.5'
  },
  gatewayFeatures: {
    display: 'flex',
    justifyContent: 'space-around',
    marginBottom: '24px',
    flexWrap: 'wrap',
    gap: '16px'
  },
  featureItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    color: '#333'
  },
  featureIcon: {
    fontSize: '24px'
  },
  paymentAmount: {
    backgroundColor: '#f8f9fa',
    borderRadius: '8px',
    padding: '16px',
    marginBottom: '16px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  amountLabel: {
    fontSize: '16px',
    fontWeight: '500',
    color: '#666'
  },
  amountValue: {
    fontSize: '24px',
    fontWeight: '700',
    color: theme.colors.primary
  },
  testModeWarning: {
    backgroundColor: '#FFF3CD',
    borderRadius: '8px',
    padding: '12px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    color: '#856404',
    border: '1px solid #FFE69C'
  },
  warningIcon: {
    fontSize: '16px'
  }
};

export default PaymentMethodSelector;
