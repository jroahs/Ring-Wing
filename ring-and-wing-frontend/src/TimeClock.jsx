import React, { useState, useEffect, useCallback, useRef } from 'react';
import { FiUser, FiClock, FiSearch, FiCamera, FiCheck, FiX, FiArrowLeft, FiCreditCard, FiWifi, FiUsers, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import api from './services/apiService';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Webcam from 'react-webcam';
import { API_URL } from './App';
import { motion, AnimatePresence } from 'framer-motion';
import StaffAvatar from './components/StaffAvatar';
import { useMultiTabLogout } from './hooks/useMultiTabLogout';
import BrandedLoadingScreen from './components/ui/BrandedLoadingScreen';

const TimeClock = () => {  
  // Enable multi-tab logout synchronization
  useMultiTabLogout();
  
  // Colors for consistent styling
  const colors = {
    primary: '#2e0304',
    background: '#fefdfd',
    accent: '#f1670f',
    secondary: '#853619',
    muted: '#ac9c9b'
  };

  // Layout state
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [showStaffPanel, setShowStaffPanel] = useState(false); // Staff panel hidden by default

  // Attendance mode state
  const [attendanceMode, setAttendanceMode] = useState('PIN'); // 'PIN' or 'NFC'
  const [nfcTestMode, setNfcTestMode] = useState(true);
  const [loadingSettings, setLoadingSettings] = useState(true);

  // Staff data
  const [staff, setStaff] = useState([]);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [lastLog, setLastLog] = useState(null);
  const [currentTime, setCurrentTime] = useState('');

  // PIN and photo capture state
  const [showPinEntry, setShowPinEntry] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [clockAction, setClockAction] = useState(null); // 'in' or 'out'
  const [showCamera, setShowCamera] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const webcamRef = useRef(null);

  // NFC Test Mode state - dropdown selection
  const [selectedNfcCard, setSelectedNfcCard] = useState('');
  const [staffWithNfc, setStaffWithNfc] = useState([]);
  
  // NFC Real Mode state - listening for cards
  const [nfcListening, setNfcListening] = useState(false);
  const [lastNfcAction, setLastNfcAction] = useState(null); // Store last NFC action result

  // Fetch attendance settings on mount
  useEffect(() => {
    const fetchAttendanceSettings = async () => {
      try {
        const response = await api.get('/api/settings/attendance');
        if (response.data?.success) {
          setAttendanceMode(response.data.data.mode || 'PIN');
          setNfcTestMode(response.data.data.nfcSettings?.testMode ?? true);
        }
      } catch (error) {
        console.error('Error fetching attendance settings:', error);
        // Default to PIN mode if settings fetch fails
        setAttendanceMode('PIN');
      } finally {
        setLoadingSettings(false);
      }
    };
    
    fetchAttendanceSettings();
  }, []);

  // Filter staff with NFC cards for test mode dropdown
  useEffect(() => {
    const staffWithCards = staff.filter(s => s.nfcCardId && s.nfcCardId.trim() !== '');
    setStaffWithNfc(staffWithCards);
  }, [staff]);

  // Start NFC listening when in NFC mode (non-test)
  useEffect(() => {
    if (attendanceMode === 'NFC' && !nfcTestMode && !loadingSettings) {
      setNfcListening(true);
    } else {
      setNfcListening(false);
    }
  }, [attendanceMode, nfcTestMode, loadingSettings]);
  // Handle window resize for responsive layout
  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };
    window.addEventListener('resize', handleResize);
    handleResize(); // Initialize on component mount
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const getMainContentMargin = () => {
    if (windowWidth < 768) return '0';
    return windowWidth >= 1920 ? '8rem' : '5rem';
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

  // Fetch all staff
  useEffect(() => {
    const fetchStaff = async () => {
      try {
        const response = await api.get('/api/staff/time-clock');
        const staffData = Array.isArray(response.data) ? response.data : 
                        (response.data.data ? response.data.data : []);
        setStaff(staffData);
      } catch (error) {
        console.error('Error fetching staff:', error);
        toast.error('Failed to fetch staff data');
      } finally {
        setLoading(false);
      }
    };

    fetchStaff();
  }, []);

  // Fetch time logs when staff is selected
  useEffect(() => {
    if (selectedStaff) {
      fetchLastTimeLog(selectedStaff._id);
    } else {
      setLastLog(null);
    }
  }, [selectedStaff]);

  const fetchLastTimeLog = async (staffId) => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const params = new URLSearchParams({ 
        startDate: today.toISOString(),
        endDate: new Date().toISOString()
      }).toString();

      // Add authorization token to the request
      const token = localStorage.getItem('authToken');
      const config = {
        headers: { 
          'Authorization': token ? `Bearer ${token}` : ''
        }
      };

      const { data } = await api.get(`/api/time-logs/staff/${staffId}?${params}`, config);
      
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
      setLastLog(null);
    }
  };

  // Function to capture photo from webcam
  const capturePhoto = useCallback(() => {
    const imageSrc = webcamRef.current?.getScreenshot();
    setCapturedImage(imageSrc);
  }, [webcamRef]);

  // Function to handle clock button clicks
  const handleClockButtonClick = (type) => {
    if (!selectedStaff?._id) {
      toast.error('Please select a staff member first');
      return;
    }
    
    setClockAction(type);
    setShowPinEntry(true);
    setPinInput('');
    setShowCamera(false);
    setCapturedImage(null);
  };

  // Function to handle PIN verification
  const handlePinVerify = () => {
    if (pinInput.length < 4) {
      toast.error('Please enter a valid PIN');
      return;
    }

    if (selectedStaff.pinCode !== pinInput) {
      toast.error('Invalid PIN code');
      setPinInput('');
      return;
    }

    // PIN is valid, proceed to photo capture
    setShowCamera(true);
  };
  
  // Function to go back to PIN entry from camera
  const handleBackToPin = () => {
    setShowCamera(false);
    setCapturedImage(null);
  };

  // Function to reset the clock interface
  const handleCancelClock = () => {
    setShowPinEntry(false);
    setShowCamera(false);
    setCapturedImage(null);
    setPinInput('');
  };

  // Function to handle time log submission with photo
  const handleTimeLog = async () => {
    if (!selectedStaff?._id || !capturedImage) {
      toast.error('Please select a staff member and take a photo');
      return;
    }
    
    setLoading(true);
    try {
      // Convert base64 image to file
      const blob = await fetch(capturedImage).then(res => res.blob());
      const fileName = `${selectedStaff._id}-${Date.now()}.jpg`;
      const photoFile = new File([blob], fileName, { type: 'image/jpeg' });
      
      // Create form data
      const formData = new FormData();
      formData.append('staffId', selectedStaff._id);
      formData.append('pinCode', pinInput);
      formData.append('photo', photoFile);
      
      // Add authorization headers
      const token = localStorage.getItem('authToken');
      const config = {
        headers: { 
          'Content-Type': 'multipart/form-data',
          'Authorization': token ? `Bearer ${token}` : ''
        }
      };
      
      // Send API request with photo
      const { data } = await api.post(
        `/api/time-logs/${clockAction === 'in' ? 'clock-in' : 'clock-out'}`, 
        formData,
        config
      );
      
      if (!data.success) {
        throw new Error(`Failed to clock ${clockAction}`);
      }

      const formattedTime = formatDateTime(data.data.timestamp || data.data.createdAt);
      setLastLog({
        ...data.data,
        formattedTimestamp: formattedTime
      });
      
      // Reset states first before showing success toast
      handleCancelClock();
      
      // Clear any existing toasts with the same ID first
      toast.dismiss(`clock-${clockAction}-${selectedStaff._id}`);
      
      // Show a single toast notification with a consistent ID based on staff ID
      toast.success(`${selectedStaff.name} clocked ${clockAction} successfully`, {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        toastId: `clock-${clockAction}-${selectedStaff._id}`, // Use consistent ID based on staff
      });
      
      updateCurrentTime();
      
      // Refresh the time log data
      fetchLastTimeLog(selectedStaff._id);
    } catch (error) {
      console.error('Time logging error:', error);
      toast.error(error.response?.data?.message || error.message);
    } finally {
      setLoading(false);
    }
  };

  // NFC Functions - Updated for Test Mode Dropdown
  const handleNfcTestAction = async (action) => {
    if (!selectedNfcCard) {
      toast.error('Please select an NFC card from the dropdown');
      return;
    }

    setLoading(true);
    try {
      const endpoint = action === 'in' 
        ? '/api/time-logs/nfc/clock-in' 
        : '/api/time-logs/nfc/clock-out';
      
      const token = localStorage.getItem('authToken');
      const config = {
        headers: { 
          'Authorization': token ? `Bearer ${token}` : ''
        }
      };

      const { data } = await api.post(endpoint, { 
        nfcCardId: selectedNfcCard 
      }, config);
      
      if (!data.success) {
        throw new Error(data.message || `Failed to clock ${action}`);
      }

      // Show success toast with staff name from response
      toast.success(data.message || `Clock ${action} successful`, {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });

      // Store last action result for display
      setLastNfcAction({
        staffName: data.data?.staffName,
        type: action,
        timestamp: new Date().toISOString(),
        totalHours: data.data?.totalHours
      });

      // Reset selection
      setSelectedNfcCard('');
      
      updateCurrentTime();
    } catch (error) {
      console.error('NFC test clock error:', error);
      toast.error(error.response?.data?.message || error.message || 'NFC clock action failed');
    } finally {
      setLoading(false);
    }
  };

  // NFC Real Mode - Handle card tap (simulated via external trigger)
  const handleNfcCardTap = async (nfcCardId) => {
    if (!nfcCardId || nfcCardId.length < 4) {
      return;
    }

    setLoading(true);
    try {
      // First, look up the staff and their current status
      const token = localStorage.getItem('authToken');
      const config = {
        headers: { 
          'Authorization': token ? `Bearer ${token}` : ''
        }
      };

      // Look up staff by NFC card
      const lookupResponse = await api.get(`/api/time-logs/nfc/lookup/${nfcCardId.toUpperCase()}`, config);
      
      if (!lookupResponse.data?.success) {
        toast.error('NFC card not recognized');
        return;
      }

      const { staff: staffMember, isClockedIn } = lookupResponse.data.data;
      
      // Determine action based on current status
      const action = isClockedIn ? 'out' : 'in';
      const endpoint = action === 'in' 
        ? '/api/time-logs/nfc/clock-in' 
        : '/api/time-logs/nfc/clock-out';

      const { data } = await api.post(endpoint, { 
        nfcCardId: nfcCardId.toUpperCase() 
      }, config);
      
      if (!data.success) {
        throw new Error(data.message || `Failed to clock ${action}`);
      }

      // Show success toast
      toast.success(data.message || `${staffMember.name} clocked ${action} successfully`, {
        position: "top-center",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });

      // Store last action result for display
      setLastNfcAction({
        staffName: data.data?.staffName || staffMember.name,
        type: action,
        timestamp: new Date().toISOString(),
        totalHours: data.data?.totalHours,
        profilePicture: staffMember.profilePicture
      });
      
      updateCurrentTime();
    } catch (error) {
      console.error('NFC card tap error:', error);
      toast.error(error.response?.data?.message || error.message || 'NFC action failed');
    } finally {
      setLoading(false);
    }
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        console.error('Invalid date string received:', dateString);
        return new Date().toLocaleString('en-US', {
          month: 'short',
          day: 'numeric', 
          year: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        });
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
      console.error('Date formatting error:', error, 'for date string:', dateString);
      return 'Invalid Date';
    }
  };

  // Filter staff based on search query
  const filteredStaff = searchQuery
    ? staff.filter(person => 
        person.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        person.position.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : staff;

  const isActiveSession = lastLog && lastLog.type === 'clockIn';

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { 
        when: "beforeChildren",
        staggerChildren: 0.1
      }
    },
    exit: { opacity: 0 }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { 
      y: 0, 
      opacity: 1,
      transition: {
        type: 'spring',
        stiffness: 300,
        damping: 20
      }
    }
  };

  const buttonVariants = {
    rest: { scale: 1 },
    hover: { scale: 1.05 },
    tap: { scale: 0.95 }
  };
  return (
    <div className="flex min-h-screen" style={{ backgroundColor: colors.background }}>
      <motion.div 
        className="flex-1 transition-all duration-300"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        style={{
          marginLeft: getMainContentMargin(),
          paddingTop: windowWidth < 768 ? '4rem' : '0'
        }}
      >
        <div className="p-6 md:p-8 pt-24 md:pt-8">
          {/* Header with title and toggle button */}
          <div className="flex items-center justify-between mb-6">
            <motion.h1 
              className="text-3xl font-bold" 
              style={{ color: colors.primary }}
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 15 }}
            >
              <FiClock className="inline mr-2" />
              Time Clock System
            </motion.h1>

            {/* Staff Panel Toggle Button - Only show in PIN mode or NFC Test mode */}
            {(attendanceMode === 'PIN' || (attendanceMode === 'NFC' && nfcTestMode)) && (
              <motion.button
                onClick={() => setShowStaffPanel(!showStaffPanel)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all"
                style={{ 
                  backgroundColor: showStaffPanel ? colors.primary : colors.primary + '10',
                  color: showStaffPanel ? colors.background : colors.primary,
                  border: `1px solid ${colors.primary}`
                }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
              >
                <FiUsers className="text-lg" />
                <span className="hidden sm:inline">Staff Members</span>
                {showStaffPanel ? <FiChevronLeft /> : <FiChevronRight />}
              </motion.button>
            )}
          </div>

          {/* Attendance Mode Indicator */}
          {!loadingSettings && (
            <motion.div 
              className="mb-6 flex flex-wrap items-center gap-4"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <div 
                className="flex items-center gap-2 px-4 py-2 rounded-lg"
                style={{ 
                  backgroundColor: attendanceMode === 'NFC' ? colors.accent + '20' : colors.primary + '10',
                  border: `1px solid ${attendanceMode === 'NFC' ? colors.accent : colors.muted}`
                }}
              >
                {attendanceMode === 'NFC' ? (
                  <FiCreditCard className="text-lg" style={{ color: colors.accent }} />
                ) : (
                  <FiUser className="text-lg" style={{ color: colors.primary }} />
                )}
                <span className="font-medium" style={{ color: colors.primary }}>
                  {attendanceMode === 'NFC' ? 'NFC Card Mode' : 'PIN Mode'}
                </span>
              </div>

              {/* NFC Test Mode - Dropdown Selection */}
              {attendanceMode === 'NFC' && nfcTestMode && (
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-sm px-2 py-1 bg-amber-100 text-amber-800 rounded font-medium">
                    Test Mode
                  </span>
                  
                  {/* NFC Card Dropdown */}
                  <select
                    value={selectedNfcCard}
                    onChange={(e) => setSelectedNfcCard(e.target.value)}
                    className="px-3 py-2 rounded-lg border text-sm min-w-[200px]"
                    style={{ borderColor: colors.muted, color: colors.primary }}
                  >
                    <option value="">Select NFC Card...</option>
                    {staffWithNfc.map((s) => (
                      <option key={s._id} value={s.nfcCardId}>
                        {s.name} - {s.nfcCardId}
                      </option>
                    ))}
                  </select>
                  
                  {/* Time In/Out Buttons */}
                  <motion.button
                    onClick={() => handleNfcTestAction('in')}
                    className="px-4 py-2 rounded-lg font-medium flex items-center gap-2 disabled:opacity-50"
                    style={{ backgroundColor: colors.accent, color: colors.background }}
                    whileHover={{ scale: selectedNfcCard ? 1.02 : 1 }}
                    whileTap={{ scale: selectedNfcCard ? 0.98 : 1 }}
                    disabled={loading || !selectedNfcCard}
                  >
                    <FiCreditCard />
                    Time In
                  </motion.button>
                  <motion.button
                    onClick={() => handleNfcTestAction('out')}
                    className="px-4 py-2 rounded-lg font-medium flex items-center gap-2 disabled:opacity-50"
                    style={{ backgroundColor: colors.secondary, color: colors.background }}
                    whileHover={{ scale: selectedNfcCard ? 1.02 : 1 }}
                    whileTap={{ scale: selectedNfcCard ? 0.98 : 1 }}
                    disabled={loading || !selectedNfcCard}
                  >
                    <FiCreditCard />
                    Time Out
                  </motion.button>
                  
                  {staffWithNfc.length === 0 && (
                    <span className="text-xs text-amber-600">
                      No staff have NFC cards registered
                    </span>
                  )}
                </div>
              )}
            </motion.div>
          )}

          {/* NFC Listening Mode Interface - Full Screen for Real NFC Mode */}
          {attendanceMode === 'NFC' && !nfcTestMode && (
            <motion.div
              className="fixed inset-0 z-40 flex flex-col"
              style={{ backgroundColor: colors.background }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              {/* Header */}
              <div 
                className="p-4 flex items-center justify-between"
                style={{ backgroundColor: colors.primary }}
              >
                <div className="flex items-center gap-3">
                  <FiCreditCard className="text-2xl" style={{ color: colors.accent }} />
                  <h1 className="text-xl font-bold" style={{ color: colors.background }}>
                    NFC Time Clock
                  </h1>
                </div>
                <div className="text-3xl font-bold" style={{ color: colors.background }}>
                  {currentTime}
                </div>
              </div>

              {/* Main Content - Awaiting Card Tap */}
              <div className="flex-1 flex flex-col items-center justify-center p-8">
                {/* Animated NFC Icon */}
                <motion.div
                  className="relative mb-8"
                  animate={{ 
                    scale: [1, 1.1, 1],
                  }}
                  transition={{ 
                    repeat: Infinity, 
                    duration: 2,
                    ease: "easeInOut"
                  }}
                >
                  <div 
                    className="w-48 h-48 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: colors.accent + '20' }}
                  >
                    <motion.div
                      className="w-36 h-36 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: colors.accent + '40' }}
                      animate={{ 
                        boxShadow: [
                          `0 0 0 0px ${colors.accent}40`,
                          `0 0 0 20px ${colors.accent}00`,
                        ]
                      }}
                      transition={{ 
                        repeat: Infinity, 
                        duration: 1.5,
                        ease: "easeOut"
                      }}
                    >
                      <FiWifi 
                        className="text-7xl transform rotate-45" 
                        style={{ color: colors.accent }} 
                      />
                    </motion.div>
                  </div>
                </motion.div>

                <h2 
                  className="text-3xl font-bold mb-4 text-center"
                  style={{ color: colors.primary }}
                >
                  Awaiting Card Tap
                </h2>
                <p 
                  className="text-lg text-center max-w-md mb-8"
                  style={{ color: colors.muted }}
                >
                  Hold your NFC card near the reader to clock in or out automatically
                </p>

                {/* Last Action Display */}
                <AnimatePresence>
                  {lastNfcAction && (
                    <motion.div
                      className="p-6 rounded-lg shadow-lg max-w-md w-full"
                      style={{ 
                        backgroundColor: lastNfcAction.type === 'in' ? colors.accent + '15' : colors.secondary + '15',
                        border: `2px solid ${lastNfcAction.type === 'in' ? colors.accent : colors.secondary}`
                      }}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                    >
                      <div className="flex items-center gap-4">
                        {lastNfcAction.profilePicture && (
                          <StaffAvatar 
                            imagePath={lastNfcAction.profilePicture}
                            alt={lastNfcAction.staffName}
                            size={64}
                            className="border-2 rounded-full"
                          />
                        )}
                        <div className="flex-1">
                          <p 
                            className="text-xl font-bold"
                            style={{ color: colors.primary }}
                          >
                            {lastNfcAction.staffName}
                          </p>
                          <p 
                            className="text-lg font-medium"
                            style={{ color: lastNfcAction.type === 'in' ? colors.accent : colors.secondary }}
                          >
                            Clocked {lastNfcAction.type === 'in' ? 'In' : 'Out'}
                            {lastNfcAction.totalHours && ` (${lastNfcAction.totalHours.toFixed(2)} hours)`}
                          </p>
                          <p 
                            className="text-sm"
                            style={{ color: colors.muted }}
                          >
                            {new Date(lastNfcAction.timestamp).toLocaleTimeString('en-US', {
                              hour: 'numeric',
                              minute: '2-digit',
                              hour12: true
                            })}
                          </p>
                        </div>
                        <div className="flex items-center justify-center">
                          <motion.div
                            className="w-12 h-12 rounded-full flex items-center justify-center"
                            style={{ backgroundColor: lastNfcAction.type === 'in' ? colors.accent : colors.secondary }}
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                          >
                            <FiCheck className="text-2xl text-white" />
                          </motion.div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Footer - System Status */}
              <div 
                className="p-4 border-t"
                style={{ borderColor: colors.muted + '30' }}
              >
                <div className="flex items-center justify-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium" style={{ color: colors.muted }}>
                    NFC Reader Active - Ready for card tap
                  </span>
                </div>
              </div>
            </motion.div>
          )}

          {/* When camera is active, hide grid and show camera in full width */}
          {/* Only show when in PIN mode or NFC Test mode */}
          {(attendanceMode === 'PIN' || (attendanceMode === 'NFC' && nfcTestMode)) && (
          <AnimatePresence mode="wait">
            {selectedStaff && showPinEntry && showCamera ? (
              <motion.div 
                key="camera-view"
                className="max-w-2xl mx-auto"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div className="rounded-lg shadow-sm p-6" style={{ border: `1px solid ${colors.muted}` }}>
                  <div className="space-y-4">
                    <div className="flex items-center">
                      <button
                        onClick={handleBackToPin}
                        className="text-sm flex items-center mr-4"
                        style={{ color: colors.primary }}
                      >
                        <FiArrowLeft className="mr-1" /> Back
                      </button>
                      <h3 className="text-lg font-semibold" style={{ color: colors.primary }}>
                        Take Photo for Clock {clockAction === 'in' ? 'In' : 'Out'}
                      </h3>
                    </div>
                    
                    {!capturedImage ? (
                      <>
                        <div 
                          className="relative overflow-hidden rounded border"
                          style={{ 
                            height: '400px', // Made taller for better aspect ratio
                            borderColor: colors.muted
                          }}
                        >
                          <Webcam
                            audio={false}
                            ref={webcamRef}
                            screenshotFormat="image/jpeg"
                            width="100%"
                            height="100%"
                            videoConstraints={{ 
                              facingMode: "user",
                              aspectRatio: 1 // Enforce 1:1 aspect ratio
                            }}
                            className="absolute inset-0 w-full h-full object-cover"
                          />
                        </div>
                        <button
                          onClick={capturePhoto}
                          className="w-full py-3 rounded-lg font-medium transition-opacity hover:opacity-90"
                          style={{ backgroundColor: colors.accent, color: colors.background }}
                        >
                          <FiCamera className="inline mr-2" />
                          Capture Photo
                        </button>
                      </>
                    ) : (
                      <>
                        <div 
                          className="relative overflow-hidden rounded border"
                          style={{ 
                            height: '400px', // Made taller for better aspect ratio
                            borderColor: colors.muted
                          }}
                        >
                          <img
                            src={capturedImage}
                            alt="Captured"
                            className="absolute inset-0 w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex gap-3">
                          <button
                            onClick={() => setCapturedImage(null)}
                            className="flex-1 py-2 border rounded"
                            style={{ borderColor: colors.muted, color: colors.primary }}
                          >
                            <FiX className="inline mr-2" />
                            Retake
                          </button>
                          <button
                            onClick={handleTimeLog}
                            className="flex-1 py-2 rounded font-medium"
                            style={{ backgroundColor: colors.primary, color: colors.background }}
                          >
                            <FiCheck className="inline mr-2" />
                            Confirm & {clockAction === 'in' ? 'Clock In' : 'Clock Out'}
                          </button>
                        </div>
                      </>
                    )}
                    
                    <button
                      onClick={handleCancelClock}
                      className="w-full py-2 border rounded mt-3"
                      style={{ borderColor: colors.muted, color: colors.primary }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div 
                key="main-view"
                className={`grid gap-6 ${showStaffPanel ? 'grid-cols-1 md:grid-cols-3 lg:grid-cols-5' : 'grid-cols-1 max-w-2xl mx-auto'}`}
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
              >
                {/* Staff List - only show when toggle is active */}
                <AnimatePresence>
                  {showStaffPanel && (
                    <motion.div 
                      className="md:col-span-1 lg:col-span-2"
                      variants={itemVariants}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                    >
                      <div className="rounded-lg p-4 shadow-sm" style={{ backgroundColor: colors.primary }}>
                        <h2 className="text-xl font-semibold mb-4" style={{ color: colors.background }}>
                          <FiUser className="inline mr-2" />
                          Staff Members
                        </h2>

                    {/* Search Box - Updated with white text */}
                    <div className="relative mb-4">
                      <input
                        type="text"
                        placeholder="Search staff..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full p-2 pl-9 rounded border"
                        style={{ 
                          borderColor: colors.background,
                          backgroundColor: 'rgba(255,255,255,0.15)',
                          color: colors.background,
                          caretColor: colors.background
                        }}
                      />
                      <FiSearch className="absolute left-3 top-3" style={{ color: colors.background }} />
                    </div>

                    {/* Staff List with animations */}
                    <div className="space-y-2 max-h-[60vh] md:max-h-[70vh] overflow-y-auto pr-2">
                      <AnimatePresence>
                        {loading ? (
                          <motion.div 
                            key="loading"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="py-6"
                          >
                            <BrandedLoadingScreen message="Loading staff..." />
                          </motion.div>
                        ) : filteredStaff.length === 0 ? (
                          <motion.div 
                            key="no-staff"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="text-center py-6" 
                            style={{ color: colors.background }}
                          >
                            No staff members found
                          </motion.div>
                        ) : (
                          filteredStaff.map((person, index) => (
                            <motion.div
                              key={person._id}
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -20 }}
                              transition={{ 
                                delay: index * 0.05,
                                type: 'spring',
                                stiffness: 300,
                                damping: 25
                              }}
                              onClick={() => {
                                setSelectedStaff(person);
                                // Reset any active clock actions when selecting a new staff member
                                handleCancelClock();
                              }}
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              className={`p-3 rounded cursor-pointer transition-colors ${
                                selectedStaff?._id === person._id
                                  ? 'ring-2 ring-opacity-50'
                                  : 'hover:ring-2 hover:ring-opacity-30'
                              }`}
                              style={{
                                backgroundColor: colors.background,
                                color: colors.primary,
                                ringColor: colors.accent
                              }}
                            >                              <div className="flex items-center gap-3">
                                <StaffAvatar 
                                  imagePath={person.profilePicture}
                                  alt={`${person.name}'s photo`}
                                  size={40}
                                  className="border rounded-full"
                                />
                                <div>
                                  <p className="font-medium">{person.name}</p>
                                  <p className="text-sm" style={{ color: colors.muted }}>
                                    {person.position}
                                  </p>
                                </div>
                              </div>
                            </motion.div>
                          ))
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </motion.div>
                  )}
                </AnimatePresence>

                {/* Time Clock Interface - only show PIN entry here */}
                <motion.div 
                  className={showStaffPanel ? "md:col-span-2 lg:col-span-3" : "w-full"}
                  variants={itemVariants}
                >
                  <div 
                    className="rounded-lg shadow-sm p-6"
                    style={{ border: `1px solid ${colors.muted}` }}
                  >
                    {/* Header */}
                    <div className="mb-6">
                      <h2 className="text-2xl font-bold" style={{ color: colors.primary }}>
                        <FiClock className="inline-block mr-2" />
                        Time Clock
                      </h2>
                    </div>

                    {/* Staff Info & Time Log Interface */}
                    <AnimatePresence mode="wait">
                      {!selectedStaff ? (
                        <motion.div 
                          key="no-selection"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="text-center py-16"
                        >
                          <FiUser size={64} className="mx-auto mb-4 opacity-30" />
                          <p className="text-xl mb-2" style={{ color: colors.muted }}>
                            Select a staff member to view time clock
                          </p>
                          {!showStaffPanel && (
                            <motion.button
                              onClick={() => setShowStaffPanel(true)}
                              className="mt-4 px-6 py-3 rounded-lg font-medium flex items-center gap-2 mx-auto"
                              style={{ backgroundColor: colors.accent, color: colors.background }}
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                            >
                              <FiUsers />
                              Show Staff Members
                            </motion.button>
                          )}
                        </motion.div>
                      ) : showPinEntry && !showCamera ? (
                        <motion.div 
                          key="pin-entry"
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -20 }}
                          className="space-y-4"
                        >
                          <h3 className="text-lg font-semibold text-center" style={{ color: colors.primary }}>
                            Enter PIN to {clockAction === 'in' ? 'Clock In' : 'Clock Out'}
                          </h3>
                          
                          <p className="text-sm text-center" style={{ color: colors.muted }}>
                            Please enter your security PIN for verification
                          </p>
                          
                          <div className="flex justify-center my-4">
                            <motion.input
                              type="password"
                              className="w-full max-w-xs p-3 text-center text-2xl tracking-widest border rounded"
                              value={pinInput}
                              onChange={(e) => {
                                // Only allow digits and limit to 6 characters
                                const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                                setPinInput(value);
                              }}
                              placeholder="• • • •"
                              maxLength={6}
                              autoFocus
                              style={{ borderColor: colors.muted }}
                              animate={{ 
                                boxShadow: pinInput.length >= 4 
                                  ? `0 0 0 2px ${colors.accent}30` 
                                  : "none" 
                              }}
                            />
                          </div>
                          
                          <div className="flex gap-3">
                            <motion.button
                              variants={buttonVariants}
                              whileHover="hover"
                              whileTap="tap"
                              onClick={handleCancelClock}
                              className="flex-1 py-2 border rounded"
                              style={{ borderColor: colors.muted, color: colors.primary }}
                            >
                              Cancel
                            </motion.button>
                            <motion.button
                              variants={buttonVariants}
                              whileHover="hover"
                              whileTap="tap"
                              onClick={handlePinVerify}
                              className="flex-1 py-2 rounded font-medium"
                              disabled={!pinInput || pinInput.length < 4}
                              style={{ 
                                backgroundColor: colors.primary, 
                                color: colors.background,
                                opacity: !pinInput || pinInput.length < 4 ? 0.5 : 1
                              }}
                            >
                              Continue
                            </motion.button>
                          </div>
                        </motion.div>
                      ) : !showPinEntry ? (
                        <motion.div
                          key="staff-interface"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                        >
                          {/* Staff Info */}
                          <motion.div 
                            className="mb-6"
                            initial={{ y: 10, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                          >
                            <p className="text-lg font-medium" style={{ color: colors.primary }}>
                              {selectedStaff.name}
                            </p>
                            <p className="text-sm" style={{ color: colors.muted }}>
                              {selectedStaff.position}
                            </p>
                          </motion.div>

                          <div className="space-y-4">
                            {/* Current Time Display */}
                            <motion.div 
                              className="p-4 rounded text-center"
                              style={{ backgroundColor: colors.primary + '10' }}
                              initial={{ scale: 0.95, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              transition={{ delay: 0.1 }}
                            >
                              <p className="text-sm font-medium mb-1" style={{ color: colors.muted }}>
                                Current Time
                              </p>
                              <p className="text-2xl font-bold" style={{ color: colors.primary }}>
                                {currentTime}
                              </p>
                            </motion.div>
                            
                            {/* Status */}
                            <motion.div 
                              className="p-4 rounded flex flex-col items-center justify-center gap-2"
                              style={{ 
                                backgroundColor: isActiveSession ? 
                                  colors.accent + '20' : colors.secondary + '10' 
                              }}
                              initial={{ scale: 0.95, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              transition={{ delay: 0.2 }}
                            >
                              <div className="flex items-center justify-center gap-2">
                                {isActiveSession ? (
                                  <>
                                    <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                                    <p className="text-sm font-medium" style={{ color: colors.accent }}>
                                      Currently clocked in
                                    </p>
                                  </>
                                ) : (
                                  <>
                                    <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                                    <p className="text-sm font-medium" style={{ color: colors.secondary }}>
                                      {lastLog ? 'Clocked out' : 'Not clocked in today'}
                                    </p>
                                  </>
                                )}
                              </div>
                              
                              {/* Display clock-in time if active session */}
                              {isActiveSession && lastLog && (
                                <div className="w-full text-center mt-2 pt-2 border-t" style={{ borderColor: colors.accent + '50' }}>
                                  <p className="text-xs" style={{ color: colors.muted }}>
                                    Clocked in at:
                                  </p>
                                  <p className="text-sm font-medium" style={{ color: colors.accent }}>
                                    {lastLog.formattedTimestamp || formatDateTime(lastLog.timestamp || lastLog.createdAt)}
                                  </p>
                                </div>
                              )}
                            </motion.div>

                            {/* Action Buttons */}
                            <motion.div 
                              className="grid grid-cols-2 gap-4"
                              initial={{ y: 20, opacity: 0 }}
                              animate={{ y: 0, opacity: 1 }}
                              transition={{ delay: 0.3 }}
                            >
                              <motion.button
                                onClick={() => handleClockButtonClick('in')}
                                disabled={loading || isActiveSession}
                                className="py-3 px-6 rounded-lg font-medium transition-opacity hover:opacity-90 disabled:opacity-50"
                                style={{ backgroundColor: colors.accent, color: colors.background }}
                                whileHover={{ scale: 1.03 }}
                                whileTap={{ scale: 0.97 }}
                                transition={{ type: 'spring', stiffness: 400, damping: 10 }}
                              >
                                Clock In
                              </motion.button>
                              <motion.button
                                onClick={() => handleClockButtonClick('out')}
                                disabled={loading || !isActiveSession}
                                className="py-3 px-6 rounded-lg font-medium transition-opacity hover:opacity-90 disabled:opacity-50"
                                style={{ backgroundColor: colors.secondary, color: colors.background }}
                                whileHover={{ scale: 1.03 }}
                                whileTap={{ scale: 0.97 }}
                                transition={{ type: 'spring', stiffness: 400, damping: 10 }}
                              >
                                Clock Out
                              </motion.button>
                            </motion.div>
                            
                            {/* Recent Activity with animation */}
                            <motion.div 
                              className="mt-4 pt-4 border-t" 
                              style={{ borderColor: colors.muted }}
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              transition={{ delay: 0.4 }}
                            >
                              <h3 className="text-base font-medium mb-3 flex items-center gap-1" style={{ color: colors.primary }}>
                                <FiClock size={16} />
                                Recent Activity
                              </h3>
                              
                              <AnimatePresence>
                                {lastLog ? (
                                  <motion.div 
                                    className="p-3 rounded"
                                    style={{ backgroundColor: colors.muted + '10' }}
                                    initial={{ y: 10, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    layout
                                  >
                                    <div className="flex gap-3">
                                      {/* Left side - Verification photo with animation */}
                                      {lastLog.photo && (
                                        <motion.div 
                                          className="flex-shrink-0"
                                          initial={{ scale: 0.8, opacity: 0 }}
                                          animate={{ scale: 1, opacity: 1 }}
                                          transition={{ delay: 0.2 }}
                                        >
                                          <motion.img 
                                            src={`${API_URL}/public/${lastLog.photo}`}
                                            alt="" 
                                            className="h-16 w-16 object-cover rounded"
                                            onError={(e) => {
                                              e.target.src = 'https://via.placeholder.com/80x80?text=No+Image';
                                            }}
                                            whileHover={{ scale: 1.1 }}
                                          />
                                        </motion.div>
                                      )}
                                      
                                      {/* Right side - All information */}
                                      <div className="flex-grow">
                                        {/* Action type and timestamp */}
                                        <div className="flex justify-between items-center mb-2">
                                          <div className="flex items-center">
                                            <div className={`w-2 h-2 rounded-full mr-2 ${lastLog.type === 'clockIn' ? 'bg-green-500 animate-pulse' : 'bg-orange-500'}`}></div>
                                            <span className="font-medium" style={{ color: lastLog.type === 'clockIn' ? colors.accent : colors.secondary }}>
                                              {lastLog.type === 'clockIn' ? 'Clock In' : 'Clock Out'}
                                            </span>
                                          </div>
                                          <span className="text-xs px-2 py-1 rounded-full" style={{ 
                                            backgroundColor: colors.primary + '10',
                                            color: colors.primary 
                                          }}>
                                            {new Date(lastLog.timestamp || lastLog.createdAt).toLocaleDateString('en-US', {
                                              month: 'short',
                                              day: 'numeric',
                                              hour: 'numeric',
                                              minute: '2-digit',
                                              hour12: true
                                            })}
                                          </span>
                                        </div>
                                        
                                        {/* Duration and status on same line */}
                                        <div className="flex justify-between text-xs">
                                          <span style={{ color: colors.muted }}>
                                            {lastLog.type === 'clockIn' ? 'Currently working' : 'Shift completed'}
                                          </span>
                                          {lastLog.totalHours !== undefined && (
                                            <span className="font-medium" style={{ color: colors.secondary }}>
                                              Duration: {typeof lastLog.totalHours === 'number' ? 
                                                `${Math.floor(lastLog.totalHours)}h ${Math.round((lastLog.totalHours % 1) * 60)}m` : 
                                                lastLog.totalHours}
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </motion.div>
                                ) : (
                                  <motion.div 
                                    className="p-3 text-center rounded" 
                                    style={{ backgroundColor: colors.muted + '10' }}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                  >
                                    <p className="text-xs" style={{ color: colors.muted }}>
                                      No time logs recorded today
                                    </p>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </motion.div>
                          </div>
                        </motion.div>
                      ) : null}
                    </AnimatePresence>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default TimeClock;