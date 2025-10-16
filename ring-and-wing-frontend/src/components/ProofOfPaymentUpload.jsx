import React, { useState, useRef } from 'react';
import { FaCloudUploadAlt, FaFileImage, FaTimes, FaCheckCircle } from 'react-icons/fa';
import theme from '../theme';

/**
 * ProofOfPaymentUpload Component
 * 
 * Flexible proof input: image upload OR text reference (or both)
 * - Image: Screenshot of payment confirmation
 * - Text: Transaction reference number + account name
 * 
 * Features: File preview, validation, progress indicator
 */
const ProofOfPaymentUpload = ({ onProofSubmit, paymentMethod }) => {
  const [proofType, setProofType] = useState('image'); // 'image' or 'text' or 'both'
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [transactionRef, setTransactionRef] = useState('');
  const [accountName, setAccountName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
  const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setError('');

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      setError('Please upload a valid image file (JPG, PNG, or WEBP)');
      return;
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      setError('File size must be less than 5MB');
      return;
    }

    setImageFile(file);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async () => {
    setError('');

    // Validation
    if (proofType === 'image' && !imageFile) {
      setError('Please upload a screenshot of your payment');
      return;
    }

    if ((proofType === 'text' || proofType === 'both') && !transactionRef) {
      setError('Please enter the transaction reference number');
      return;
    }

    if ((proofType === 'text' || proofType === 'both') && !accountName) {
      setError('Please enter your account name');
      return;
    }

    try {
      setUploading(true);
      setUploadProgress(0);

      // Prepare form data
      const formData = new FormData();
      
      if (imageFile) {
        formData.append('file', imageFile);
      }
      
      if (transactionRef) {
        formData.append('transactionReference', transactionRef);
      }
      
      if (accountName) {
        formData.append('accountName', accountName);
      }

      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      // Call parent handler with proof data
      await onProofSubmit(formData);

      setUploadProgress(100);
      clearInterval(progressInterval);

    } catch (err) {
      setError(err.message || 'Failed to upload proof of payment');
      setUploadProgress(0);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>Upload Proof of Payment</h2>
        <p style={styles.subtitle}>
          Please provide proof that you've sent the payment via {paymentMethod === 'gcash' ? 'GCash' : 'PayMaya'}
        </p>
      </div>

      {/* Proof Type Selector */}
      <div style={styles.typeSelector}>
        <button
          onClick={() => setProofType('image')}
          style={{
            ...styles.typeButton,
            ...(proofType === 'image' ? styles.typeButtonActive : {})
          }}
        >
          <FaFileImage style={styles.typeIcon} />
          <span>Screenshot Only</span>
        </button>
        <button
          onClick={() => setProofType('text')}
          style={{
            ...styles.typeButton,
            ...(proofType === 'text' ? styles.typeButtonActive : {})
          }}
        >
          <span>Reference Number Only</span>
        </button>
        <button
          onClick={() => setProofType('both')}
          style={{
            ...styles.typeButton,
            ...(proofType === 'both' ? styles.typeButtonActive : {})
          }}
        >
          <span>Both (Recommended)</span>
        </button>
      </div>

      {/* Image Upload Section */}
      {(proofType === 'image' || proofType === 'both') && (
        <div style={styles.uploadSection}>
          <h3 style={styles.sectionTitle}>Payment Screenshot</h3>
          
          {!imagePreview ? (
            <div
              style={styles.dropZone}
              onClick={() => fileInputRef.current?.click()}
            >
              <FaCloudUploadAlt style={styles.uploadIcon} />
              <p style={styles.dropZoneText}>
                Click to upload payment screenshot
              </p>
              <p style={styles.dropZoneHint}>
                JPG, PNG or WEBP (Max 5MB)
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                style={styles.fileInput}
              />
            </div>
          ) : (
            <div style={styles.previewContainer}>
              <img src={imagePreview} alt="Payment proof" style={styles.preview} />
              <button
                onClick={handleRemoveImage}
                style={styles.removeButton}
                type="button"
              >
                <FaTimes /> Remove
              </button>
            </div>
          )}
        </div>
      )}

      {/* Text Reference Section */}
      {(proofType === 'text' || proofType === 'both') && (
        <div style={styles.textSection}>
          <h3 style={styles.sectionTitle}>Transaction Details</h3>
          
          <div style={styles.inputGroup}>
            <label style={styles.label}>
              Transaction Reference Number *
            </label>
            <input
              type="text"
              value={transactionRef}
              onChange={(e) => setTransactionRef(e.target.value)}
              placeholder="e.g., 1234567890"
              style={styles.input}
            />
            <p style={styles.hint}>
              Found in your {paymentMethod === 'gcash' ? 'GCash' : 'PayMaya'} transaction history
            </p>
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>
              Account Name *
            </label>
            <input
              type="text"
              value={accountName}
              onChange={(e) => setAccountName(e.target.value)}
              placeholder="Your full name as registered"
              style={styles.input}
            />
            <p style={styles.hint}>
              Must match your {paymentMethod === 'gcash' ? 'GCash' : 'PayMaya'} account name
            </p>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div style={styles.errorBox}>
          <span style={styles.errorIcon}>!</span>
          <p style={styles.errorText}>{error}</p>
        </div>
      )}

      {/* Upload Progress */}
      {uploading && (
        <div style={styles.progressContainer}>
          <div style={styles.progressBar}>
            <div
              style={{
                ...styles.progressFill,
                width: `${uploadProgress}%`
              }}
            />
          </div>
          <p style={styles.progressText}>{uploadProgress}% Uploading...</p>
        </div>
      )}

      {/* Submit Button */}
      <button
        onClick={handleSubmit}
        disabled={uploading}
        style={{
          ...styles.submitButton,
          ...(uploading ? styles.submitButtonDisabled : {})
        }}
      >
        {uploading ? (
          <>
            <div style={styles.spinner} />
            <span>Uploading...</span>
          </>
        ) : (
          <>
            <FaCheckCircle />
            <span>Submit Proof of Payment</span>
          </>
        )}
      </button>

      {/* Important Notes */}
      <div style={styles.notesBox}>
        <h4 style={styles.notesTitle}>Important Notes:</h4>
        <ul style={styles.notesList}>
          <li>Ensure your screenshot clearly shows the transaction details</li>
          <li>Reference number must match your actual payment transaction</li>
          <li>Verification usually takes 5-30 minutes during business hours</li>
          <li>You'll receive a notification once payment is verified</li>
        </ul>
      </div>
    </div>
  );
};

const styles = {
  container: {
    width: '100%',
    maxWidth: '700px',
    margin: '0 auto',
    padding: '24px'
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
    fontSize: '15px',
    color: '#666',
    marginTop: '0'
  },
  typeSelector: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '12px',
    marginBottom: '32px'
  },
  typeButton: {
    padding: '16px 12px',
    border: '2px solid #e0e0e0',
    borderRadius: '12px',
    background: '#fff',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    fontSize: '14px',
    fontWeight: '500',
    color: '#666',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px'
  },
  typeButtonActive: {
    borderColor: theme.colors.primary,
    backgroundColor: `${theme.colors.primary}10`,
    color: theme.colors.primary
  },
  typeIcon: {
    fontSize: '24px'
  },
  uploadSection: {
    marginBottom: '32px'
  },
  sectionTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#333',
    marginBottom: '16px',
    marginTop: '0'
  },
  dropZone: {
    border: '3px dashed #ccc',
    borderRadius: '16px',
    padding: '48px 24px',
    textAlign: 'center',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    backgroundColor: '#fafafa',
    ':hover': {
      borderColor: theme.colors.primary,
      backgroundColor: '#f0f8ff'
    }
  },
  uploadIcon: {
    fontSize: '64px',
    color: theme.colors.primary,
    marginBottom: '16px'
  },
  dropZoneText: {
    fontSize: '16px',
    fontWeight: '500',
    color: '#333',
    margin: '8px 0'
  },
  dropZoneHint: {
    fontSize: '14px',
    color: '#666',
    margin: '4px 0'
  },
  fileInput: {
    display: 'none'
  },
  previewContainer: {
    position: 'relative',
    borderRadius: '16px',
    overflow: 'hidden',
    border: '2px solid #e0e0e0'
  },
  preview: {
    width: '100%',
    height: 'auto',
    display: 'block'
  },
  removeButton: {
    position: 'absolute',
    top: '12px',
    right: '12px',
    backgroundColor: '#ff4444',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    padding: '8px 16px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    display: 'flex',
    alignItems: 'center',
    gap: '6px'
  },
  textSection: {
    marginBottom: '32px'
  },
  inputGroup: {
    marginBottom: '20px'
  },
  label: {
    display: 'block',
    fontSize: '15px',
    fontWeight: '500',
    color: '#333',
    marginBottom: '8px'
  },
  input: {
    width: '100%',
    padding: '12px 16px',
    fontSize: '15px',
    border: '2px solid #e0e0e0',
    borderRadius: '8px',
    outline: 'none',
    transition: 'border-color 0.3s ease',
    boxSizing: 'border-box'
  },
  hint: {
    fontSize: '13px',
    color: '#666',
    margin: '6px 0 0 0'
  },
  errorBox: {
    backgroundColor: '#FFE5E5',
    border: '1px solid #FF4444',
    borderRadius: '8px',
    padding: '12px 16px',
    marginBottom: '20px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  errorIcon: {
    fontSize: '20px'
  },
  errorText: {
    color: '#D32F2F',
    margin: '0',
    fontSize: '14px'
  },
  progressContainer: {
    marginBottom: '20px'
  },
  progressBar: {
    width: '100%',
    height: '8px',
    backgroundColor: '#e0e0e0',
    borderRadius: '4px',
    overflow: 'hidden'
  },
  progressFill: {
    height: '100%',
    backgroundColor: theme.colors.primary,
    transition: 'width 0.3s ease'
  },
  progressText: {
    textAlign: 'center',
    fontSize: '14px',
    color: '#666',
    marginTop: '8px'
  },
  submitButton: {
    width: '100%',
    padding: '16px',
    backgroundColor: theme.colors.primary,
    color: '#fff',
    border: 'none',
    borderRadius: '12px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    transition: 'all 0.3s ease',
    marginBottom: '24px'
  },
  submitButtonDisabled: {
    backgroundColor: '#ccc',
    cursor: 'not-allowed'
  },
  spinner: {
    width: '20px',
    height: '20px',
    border: '3px solid rgba(255,255,255,0.3)',
    borderTop: '3px solid #fff',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  notesBox: {
    backgroundColor: '#E3F2FD',
    borderRadius: '12px',
    padding: '20px',
    border: '1px solid #BBDEFB'
  },
  notesTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#1976D2',
    marginTop: '0',
    marginBottom: '12px'
  },
  notesList: {
    margin: '0',
    paddingLeft: '20px',
    color: '#0D47A1',
    fontSize: '14px',
    lineHeight: '1.8'
  }
};

export default ProofOfPaymentUpload;
