import React, { useState, useEffect, useRef } from 'react';
import { FiClock, FiX, FiCheckCircle, FiAlertCircle, FiActivity, FiCamera, FiRefreshCw } from 'react-icons/fi';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import api from '../services/apiService';

const TimeClockModal = ({ onClose }) => {
  const [staff, setStaff] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastLog, setLastLog] = useState(null);
  const [currentTime, setCurrentTime] = useState('');
  const [pinCode, setPinCode] = useState('');
  const [showPinPad, setShowPinPad] = useState(true);
  const [showCamera, setShowCamera] = useState(false);
  const [cameraStream, setCameraStream] = useState(null);
  const [imageSrc, setImageSrc] = useState('');
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const colors = {
    primary: '#2e0304',
    background: '#fefdfd',
    accent: '#f1670f',
    secondary: '#853619',
    muted: '#ac9c9b'
  };

  // Update current time every minute
  useEffect(() => {
    updateCurrentTime();
    const intervalId = setInterval(updateCurrentTime, 60000);
    return () => clearInterval(intervalId);
  }, []);
  
  const updateCurrentTime = () => {
    const now = new Date();
    const hours = now.getHours() % 12 || 12;
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const ampm = now.getHours() >= 12 ? 'PM' : 'AM';
    setCurrentTime(`${hours}:${minutes} ${ampm}`);
  };

  // Clean up camera on component unmount
  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [cameraStream]);

  const handlePinSubmit = async () => {
    if (!pinCode || pinCode.length < 4) {
      toast.error('Please enter a valid PIN code');
      return;
    }

    setLoading(true);
    try {
      // Authenticate staff with pin code
      const response = await api.post('/api/staff/authenticate-pin', { pin: pinCode });
      if (response.data && response.data.success) {
        setStaff(response.data.staff);
        setShowPinPad(false);
        setShowCamera(true); // Show camera after successful PIN entry
        await fetchLastTimeLog(response.data.staff._id);
        initCamera(); // Initialize camera automatically
      } else {
        throw new Error('Invalid PIN code');
      }
    } catch (err) {
      console.error('Authentication error:', err);
      toast.error(err.response?.data?.message || 'Invalid PIN code');
      setPinCode('');
    } finally {
      setLoading(false);
    }
  };

  const fetchLastTimeLog = async (staffId) => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const params = new URLSearchParams({ 
        startDate: today.toISOString(),
        endDate: new Date().toISOString()
      }).toString();

      const { data } = await api.get(`/api/time-logs/staff/${staffId}?${params}`);
      
      if (data?.data?.length > 0) {
        const formattedTimestamp = formatDateTime(data.data[0].timestamp || data.data[0].createdAt);
        setLastLog({
          ...data.data[0],
          formattedTimestamp
        });
      } else {
        setLastLog(null);
      }
    } catch (error) {
      console.error('Error fetching time logs:', error);
    }
  };

  const initCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCameraStream(stream);
    } catch (err) {
      console.error('Camera initialization error:', err);
      toast.error('Unable to access camera. Please check permissions.');
    }
  };

  const handleCapture = () => {
    if (!videoRef.current || !canvasRef.current) return;

    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      
      // Set canvas dimensions to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      // Draw video frame to canvas
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Get image data
      const imageData = canvas.toDataURL('image/jpeg');
      setImageSrc(imageData);
      
      // Stop camera after capture
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
      
      // Move to time clock interface after capture
      setShowCamera(false);
      
    } catch (err) {
      console.error('Error capturing photo:', err);
      toast.error('Failed to capture photo');
    }
  };

  const retakePhoto = () => {
    setImageSrc('');
    setShowCamera(true);
    initCamera();
  };

  const handleTimeLog = async (type) => {
    if (!staff?._id) {
      toast.error('Staff data not available');
      return;
    }
    
    if (!imageSrc) {
      toast.error('Please capture your photo for verification');
      setShowCamera(true);
      initCamera();
      return;
    }
    
    setLoading(true);
    try {
      const { data } = await api.post(`/api/time-logs/${type === 'in' ? 'clock-in' : 'clock-out'}`, {
        userId: staff.userId,
        photoBase64: imageSrc // Changed from 'photo' to 'photoBase64' to match backend
      });
      
      if (!data.success) {
        throw new Error(`Failed to clock ${type}`);
      }

      const formattedTime = formatDateTime(data.data.timestamp || data.data.createdAt);
      setLastLog({
        ...data.data,
        formattedTimestamp: formattedTime
      });
      
      await fetchLastTimeLog(staff._id);
      toast.success(`Clock ${type} recorded successfully`);
      updateCurrentTime();
      
      // Close modal after successful clock in/out after 1.5 seconds
      setTimeout(() => {
        onClose();
      }, 1500);
      
    } catch (error) {
      console.error('Time logging error:', error);
      toast.error(error.response?.data?.message || error.message);
    } finally {
      setLoading(false);
    }
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return 'Invalid Date';
      }
      
      return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric', 
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    } catch (error) {
      console.error('Date formatting error:', error);
      return 'Invalid Date';
    }
  };

  const isActiveSession = lastLog && lastLog.type === 'clockIn';
  
  // PIN pad display
  const renderPinPad = () => {
    const digits = [1, 2, 3, 4, 5, 6, 7, 8, 9, null, 0, 'del'];
    
    const handleDigitClick = (digit) => {
      if (digit === 'del') {
        setPinCode(prev => prev.slice(0, -1));
      } else if (pinCode.length < 4) {
        setPinCode(prev => prev + digit);
      }
    };
    
    return (
      <div className="p-4">
        <h3 className="text-xl font-bold mb-4 text-center" style={{ color: colors.primary }}>
          Enter Your PIN
        </h3>
        
        {/* PIN display */}
        <div className="mb-6">
          <div 
            className="w-full py-3 px-4 text-center text-2xl tracking-widest font-mono rounded"
            style={{ backgroundColor: colors.primary + '10' }}
          >
            {pinCode.split('').map((_, i) => '•').join(' ')}
          </div>
        </div>
        
        {/* PIN pad */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {digits.map((digit, i) => (
            <button
              key={i}
              onClick={() => digit !== null && handleDigitClick(digit)}
              disabled={digit === null}
              className={`py-4 text-xl font-medium rounded-lg transition-all ${
                digit === null ? 'opacity-0 cursor-default' : 'hover:opacity-80'
              }`}
              style={{
                backgroundColor: digit === 'del' ? colors.secondary : colors.primary + '10',
                color: digit === 'del' ? colors.background : colors.primary
              }}
            >
              {digit === 'del' ? '⌫' : digit}
            </button>
          ))}
        </div>
        
        <button
          onClick={handlePinSubmit}
          disabled={pinCode.length < 4 || loading}
          className={`w-full py-3 rounded-lg font-medium transition-opacity ${
            pinCode.length < 4 || loading ? 'opacity-50' : 'opacity-100 hover:opacity-90'
          }`}
          style={{ backgroundColor: colors.accent, color: colors.background }}
        >
          {loading ? 'Verifying...' : 'Submit'}
        </button>
      </div>
    );
  };

  // Camera interface
  const renderCameraInterface = () => {
    return (
      <div className="p-4">
        <h3 className="text-xl font-bold mb-4 text-center" style={{ color: colors.primary }}>
          Camera Verification
        </h3>
        
        <div className="relative mb-4">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            className="w-full rounded-lg"
            style={{ border: `2px solid ${colors.accent}` }}
          />
          
          <button
            onClick={handleCapture}
            className="absolute inset-0 m-auto w-16 h-16 rounded-full flex items-center justify-center transition-all hover:scale-110"
            style={{ 
              backgroundColor: 'rgba(255, 255, 255, 0.7)',
              border: `2px solid ${colors.accent}`
            }}
          >
            <FiCamera size={28} style={{ color: colors.accent }} />
          </button>
        </div>
        
        <div className="text-center">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm"
            style={{ backgroundColor: colors.secondary, color: colors.background }}
          >
            Cancel
          </button>
        </div>
      </div>
    );
  };

  // Main time clock interface
  const renderTimeClockInterface = () => {
    return (
      <div className="p-4">
        <div className="flex flex-col md:flex-row md:gap-6">
          {/* Left column with staff info and photo */}
          <div className="md:w-2/5 mb-4 md:mb-0">
            <div className="mb-3">
              <p className="text-lg font-medium" style={{ color: colors.primary }}>
                {staff.name}
              </p>
              <p className="text-sm" style={{ color: colors.muted }}>
                {staff.position}
              </p>
            </div>
            
            {/* Display captured photo */}
            <div className="relative">
              {imageSrc ? (
                <div className="relative">
                  <img 
                    src={imageSrc} 
                    alt="Verification Photo" 
                    className="w-full rounded-lg" 
                    style={{ border: `2px solid ${colors.accent}` }}
                  />
                  <button 
                    onClick={retakePhoto}
                    className="absolute top-2 right-2 bg-white p-1 rounded-full"
                    style={{ backgroundColor: colors.secondary, color: colors.background }}
                  >
                    <FiRefreshCw size={14} />
                  </button>
                </div>
              ) : (
                <div 
                  className="w-full h-32 flex items-center justify-center rounded-lg"
                  style={{ backgroundColor: colors.primary + '10' }}
                >
                  <button
                    onClick={() => { setShowCamera(true); initCamera(); }}
                    className="px-3 py-2 rounded-lg text-sm flex items-center gap-1"
                    style={{ backgroundColor: colors.accent, color: colors.background }}
                  >
                    <FiCamera size={14} /> Take Photo
                  </button>
                </div>
              )}
            </div>
          </div>
          
          {/* Right column with time info and actions */}
          <div className="md:w-3/5">
            <div className="space-y-3">
              {/* Current Time Display */}
              <div 
                className="p-3 rounded text-center"
                style={{ backgroundColor: colors.primary + '10' }}
              >
                <p className="text-sm font-medium mb-1" style={{ color: colors.muted }}>
                  Current Time
                </p>
                <p className="text-2xl font-bold" style={{ color: colors.primary }}>
                  {currentTime}
                </p>
              </div>
              
              {/* Status */}
              <div 
                className="p-3 rounded flex flex-col items-center justify-center"
                style={{ 
                  backgroundColor: isActiveSession ? colors.accent + '20' : colors.secondary + '10' 
                }}
              >
                <div className="flex items-center justify-center gap-2">
                  {isActiveSession ? (
                    <>
                      <FiCheckCircle size={18} style={{ color: colors.accent }} />
                      <p className="text-sm font-medium" style={{ color: colors.accent }}>
                        You are currently clocked in
                      </p>
                    </>
                  ) : (
                    <>
                      <FiClock size={18} style={{ color: colors.secondary }} />
                      <p className="text-sm font-medium" style={{ color: colors.secondary }}>
                        {lastLog ? 'You are clocked out' : 'Not clocked in today'}
                      </p>
                    </>
                  )}
                </div>
                
                {/* Display clock-in time if active session */}
                {isActiveSession && lastLog && (
                  <div className="w-full text-center mt-2 pt-2 border-t" style={{ borderColor: colors.accent + '30' }}>
                    <p className="text-xs" style={{ color: colors.muted }}>
                      Clocked in at:
                    </p>
                    <p className="text-sm font-medium" style={{ color: colors.accent }}>
                      {lastLog.formattedTimestamp}
                    </p>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => handleTimeLog('in')}
                  disabled={loading || isActiveSession || !imageSrc}
                  className="py-2 px-4 rounded-lg font-medium transition-opacity hover:opacity-90 disabled:opacity-50"
                  style={{ backgroundColor: colors.accent, color: colors.background }}
                >
                  Clock In
                </button>
                <button
                  onClick={() => handleTimeLog('out')}
                  disabled={loading || !isActiveSession || !imageSrc}
                  className="py-2 px-4 rounded-lg font-medium transition-opacity hover:opacity-90 disabled:opacity-50"
                  style={{ backgroundColor: colors.secondary, color: colors.background }}
                >
                  Clock Out
                </button>
              </div>
              
              {/* Recent Activity */}
              <div className="mt-3 pt-3 border-t" style={{ borderColor: colors.muted + '40' }}>
                <h3 className="text-sm font-medium mb-2 flex items-center gap-1" style={{ color: colors.primary }}>
                  <FiActivity size={14} />
                  Recent Activity
                </h3>
                
                {lastLog ? (
                  <div className="p-2 rounded text-xs" style={{ backgroundColor: colors.muted + '15' }}>
                    <div className="flex justify-between">
                      <span style={{ color: colors.secondary }}>
                        {lastLog.type === 'clockIn' ? 'Clock In' : 'Clock Out'}
                      </span>
                      <span style={{ color: colors.muted }}>
                        {lastLog.formattedTimestamp}
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-center" style={{ color: colors.muted }}>
                    No recent activity
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
      <ToastContainer position="top-right" autoClose={3000} />
      <canvas ref={canvasRef} style={{ display: 'none' }} />
      
      <div 
        className="bg-white rounded-lg shadow-xl w-full max-w-2xl m-4"
        style={{ border: `1px solid ${colors.muted}` }}
      >
        <div className="p-4">
          {/* Header */}
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold" style={{ color: colors.primary }}>
              <FiClock className="inline-block mr-2" />
              Quick Time Clock
            </h2>
            <button 
              onClick={onClose}
              className="p-1 hover:opacity-70"
              style={{ color: colors.muted }}
            >
              <FiX size={24} />
            </button>
          </div>

          {/* Loading message */}
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-70 z-10">
              <div className="animate-pulse text-lg" style={{ color: colors.accent }}>
                Processing...
              </div>
            </div>
          )}

          {/* Error display */}
          {error && (
            <div className="text-center py-4">
              <FiAlertCircle size={40} className="mx-auto mb-2 text-red-500" />
              <p className="text-red-600 mb-4">{error}</p>
              <button
                onClick={onClose}
                className="px-4 py-2 rounded"
                style={{ backgroundColor: colors.primary, color: colors.background }}
              >
                Close
              </button>
            </div>
          )}

          {/* Main content */}
          {showPinPad ? renderPinPad() : 
           showCamera ? renderCameraInterface() : 
           renderTimeClockInterface()}
        </div>
      </div>
    </div>
  );
};

export default TimeClockModal;